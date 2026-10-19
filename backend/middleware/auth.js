const jwt = require('jsonwebtoken');
const { authConfig, isConfigured, passwordVersion } = require('../config/auth');

const COOKIE = 'cg_session';

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'strict',
    // Behind HTTPS in production. COOKIE_SECURE=false allows testing the
    // production build over plain http on localhost.
    secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false',
    path: '/api',
    maxAge: authConfig().sessionHours * 3600 * 1000
  };
}

function issueSession(res, username) {
  const { secret, sessionHours } = authConfig();
  const token = jwt.sign({ sub: username, pwv: passwordVersion() }, secret, {
    algorithm: 'HS256',
    expiresIn: `${sessionHours}h`,
    issuer: 'product-search-api'
  });
  res.cookie(COOKIE, token, cookieOptions());
}

function clearSession(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE, options);
}

function readSession(req) {
  const token = req.cookies?.[COOKIE];
  if (!token || !isConfigured()) return null;
  try {
    const { secret, username } = authConfig();
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'product-search-api' });
    if (payload.sub !== username || payload.pwv !== passwordVersion()) return null;
    return { username: payload.sub };
  } catch {
    return null;
  }
}

function requireAdmin(req, res, next) {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Admin login is not set up on this server' });
  }
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: 'Please sign in to do that' });
  req.admin = session;
  next();
}

module.exports = { requireAdmin, issueSession, clearSession, readSession, COOKIE };
