const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const productRoutes = require('./routes/products');
const authRoutes = require('./routes/auth');
const { ping } = require('./config/elasticsearch');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

// Number of reverse proxies in front of the API (Caddy in production), so
// rate limits see the visitor's IP instead of the proxy's.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? (isProduction ? 1 : 0)));
app.disable('x-powered-by');
app.use(helmet());

// In production the frontend and API share a domain, so cross-origin calls
// are refused unless CORS_ORIGIN lists them. In development anything goes.
if (allowedOrigins.length) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
} else if (!isProduction) {
  app.use(cors());
}

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: Number(process.env.API_RATE_LIMIT) || 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Too many requests, slow down a little' }
  })
);

if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    const started = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - started}ms`);
    });
    next();
  });
}

app.get('/', (req, res) => {
  res.json({ name: 'product-search-api', docs: '/api/health' });
});

app.get('/api/health', async (req, res) => {
  const mongo = mongoose.connection.readyState === 1;
  const elasticsearch = await ping();
  res.status(mongo ? 200 : 503).json({
    status: mongo && elasticsearch ? 'ok' : mongo ? 'degraded' : 'down',
    mongo: mongo ? 'up' : 'down',
    elasticsearch: elasticsearch ? 'up' : 'down'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = {};
    for (const [key, value] of Object.entries(err.errors)) {
      fields[key] = value.kind === 'Number' || value.name === 'CastError'
        ? `${key[0].toUpperCase()}${key.slice(1)} must be a number`
        : value.message;
    }
    return res.status(400).json({ error: 'Please fix the highlighted fields', fields });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: `Invalid value for ${err.path}` });
  }
  if (err.status) {
    return res.status(err.status).json({ error: err.message, ...(err.details && { details: err.details }) });
  }

  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side' });
});

module.exports = app;
