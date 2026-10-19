const express = require('express');
const rateLimit = require('express-rate-limit');
const { authConfig, isConfigured, safeEqual, verifyPassword } = require('../config/auth');
const { issueSession, clearSession, readSession } = require('../middleware/auth');

const router = express.Router();

// Slows down password guessing: 5 failed tries per IP every 15 minutes.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_RATE_LIMIT) || 5,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Try again in 15 minutes.' }
});

router.post('/login', loginLimiter, (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({ error: 'Admin login is not set up on this server' });
  }
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string' || !username || !password) {
    return res.status(400).json({ error: 'Enter your username and password' });
  }

  const config = authConfig();
  // Always check the password, even for a wrong username, so the response
  // time doesn't reveal which usernames exist.
  const passwordOk = verifyPassword(password.slice(0, 200), config.passwordHash);
  const userOk = safeEqual(username.trim(), config.username);
  if (!userOk || !passwordOk) {
    return res.status(401).json({ error: 'Wrong username or password' });
  }

  issueSession(res, config.username);
  res.json({ username: config.username });
});

// Answers 200 either way so visitors don't get an error in the console;
// username is null when there's no valid session.
router.get('/me', (req, res) => {
  const session = readSession(req);
  res.json({ username: session?.username ?? null });
});

router.post('/logout', (req, res) => {
  clearSession(res);
  res.json({ message: 'Signed out' });
});

module.exports = router;
