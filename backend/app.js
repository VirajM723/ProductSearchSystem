const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const productRoutes = require('./routes/products');
const { ping } = require('./config/elasticsearch');

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(cors(allowedOrigins.length ? { origin: allowedOrigins } : {}));
app.use(express.json({ limit: '100kb' }));

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
