const crypto = require('crypto');

// Password hashes look like scrypt:N:r:p:salt:hash (salt and hash base64url).
// No "$" in the format on purpose, so the value is safe in .env files and
// docker compose without quoting.
const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, SCRYPT.keylen, { N: SCRYPT.N, r: SCRYPT.r, p: SCRYPT.p });
  return ['scrypt', SCRYPT.N, SCRYPT.r, SCRYPT.p, salt.toString('base64url'), hash.toString('base64url')].join(':');
}

function verifyPassword(password, stored) {
  const parts = String(stored || '').split(':');
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
  const [, N, r, p, salt, expected] = parts;
  try {
    const want = Buffer.from(expected, 'base64url');
    const got = crypto.scryptSync(String(password), Buffer.from(salt, 'base64url'), want.length, {
      N: Number(N),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024
    });
    return crypto.timingSafeEqual(got, want);
  } catch {
    return false;
  }
}

// Compares two strings without leaking how much of them matched.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function authConfig() {
  return {
    username: process.env.ADMIN_USERNAME || '',
    passwordHash: process.env.ADMIN_PASSWORD_HASH || '',
    secret: process.env.JWT_SECRET || '',
    sessionHours: Number(process.env.SESSION_HOURS) || 8
  };
}

function isConfigured() {
  const c = authConfig();
  return Boolean(c.username && c.passwordHash.startsWith('scrypt:') && c.secret.length >= 32);
}

// Called on startup. In production a missing admin setup is fatal, because
// otherwise the inventory would be impossible to manage (or worse, open).
function checkAuthConfig() {
  if (isConfigured()) return;
  const message =
    'Admin login is not configured. Set ADMIN_USERNAME, ADMIN_PASSWORD_HASH and JWT_SECRET (at least 32 characters). ' +
    'Run "npm run hash-password" to generate them.';
  if (process.env.NODE_ENV === 'production') throw new Error(message);
  console.warn(`${message} Inventory changes are disabled until then.`);
}

// A short fingerprint of the password hash goes into each session token, so
// changing the admin password signs out every existing session.
function passwordVersion() {
  return crypto.createHash('sha256').update(authConfig().passwordHash).digest('base64url').slice(0, 16);
}

module.exports = { hashPassword, verifyPassword, safeEqual, authConfig, isConfigured, checkAuthConfig, passwordVersion };
