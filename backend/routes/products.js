const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const searchIndex = require('../services/elasticsearchService');
const databaseSearch = require('../services/databaseSearch');

const router = express.Router();

const EDITABLE = ['name', 'description', 'category', 'brand', 'price', 'tags', 'inStock', 'rating', 'image'];

class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Wraps async handlers so a rejected promise ends up in the error handler.
const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function pickEditable(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'Request body must be a JSON object');
  }
  const out = {};
  for (const key of EDITABLE) {
    if (body[key] !== undefined) out[key] = body[key];
  }
  // Form inputs often send numbers as strings; an empty string means "no value".
  if (typeof out.price === 'string' && out.price.trim() !== '') out.price = Number(out.price);
  if (out.rating === '') out.rating = null;
  if (typeof out.rating === 'string') out.rating = Number(out.rating);
  return out;
}

async function findOr404(id) {
  if (!mongoose.isValidObjectId(id)) throw new HttpError(400, 'That is not a valid product id');
  const product = await Product.findById(id);
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}

// The database is the source of truth. If the index update fails we still
// keep the change and let the next sync pick it up.
async function syncIndex(action, req) {
  try {
    await action();
  } catch (err) {
    searchIndex.stale = true;
    req.indexWarning = 'Saved, but search could not be updated yet. It will catch up automatically.';
    console.warn('Search index update failed:', err.message);
  }
}

function withWarning(req, payload) {
  return req.indexWarning ? { ...payload, warning: req.indexWarning } : payload;
}

async function runSearch(fn, fallback, req) {
  try {
    return await fn();
  } catch (err) {
    console.warn('Elasticsearch unavailable, falling back to MongoDB:', err.message);
    req.searchFallback = true;
    return fallback();
  }
}

// GET /api/products?page=1&limit=24&sort=newest
router.get('/', handle(async (req, res) => {
  const params = searchIndex.normaliseSearchParams({ ...req.query, q: '' });
  const result = await databaseSearch.search(params);
  res.json({
    items: result.items,
    total: result.total,
    page: result.page,
    limit: result.limit,
    pages: result.pages
  });
}));

// GET /api/products/search?q=lamp&category=Home&brand=Aalto&minPrice=10&maxPrice=90&inStock=true&sort=price_asc&page=2
router.get('/search', handle(async (req, res) => {
  const result = await runSearch(
    () => searchIndex.search(req.query),
    () => databaseSearch.search(req.query),
    req
  );
  res.json(result);
}));

// GET /api/products/suggest?q=wire
router.get('/suggest', handle(async (req, res) => {
  const result = await runSearch(
    () => searchIndex.suggest(req.query.q),
    () => databaseSearch.suggest(req.query.q),
    req
  );
  res.json(result);
}));

// Distinct categories and brands, used to fill dropdowns in the admin form.
router.get('/meta', handle(async (req, res) => {
  const [categories, brands] = await Promise.all([
    Product.distinct('category'),
    Product.distinct('brand')
  ]);
  const sorted = (list) => list.sort((a, b) => a.localeCompare(b));
  res.json({ categories: sorted(categories), brands: sorted(brands) });
}));

router.post('/reindex', handle(async (req, res) => {
  try {
    const count = await searchIndex.reindexAll();
    res.json({ message: `Reindexed ${count} products`, count });
  } catch (err) {
    throw new HttpError(503, `Could not reindex: ${err.message}`);
  }
}));

router.get('/:id', handle(async (req, res) => {
  const product = await findOr404(req.params.id);
  res.json(product);
}));

router.post('/', handle(async (req, res) => {
  const product = await Product.create(pickEditable(req.body));
  await syncIndex(() => searchIndex.indexProduct(product), req);
  res.status(201).json(withWarning(req, product.toJSON()));
}));

async function update(req, res, replace) {
  const product = await findOr404(req.params.id);
  const changes = pickEditable(req.body);

  if (replace) {
    // PUT replaces the product, so anything left out goes back to its default.
    for (const key of EDITABLE) {
      if (!(key in changes)) product.set(key, undefined);
    }
  }
  product.set(changes);
  await product.save();

  await syncIndex(() => searchIndex.indexProduct(product), req);
  res.json(withWarning(req, product.toJSON()));
}

router.put('/:id', handle((req, res) => update(req, res, true)));
router.patch('/:id', handle((req, res) => update(req, res, false)));

router.delete('/:id', handle(async (req, res) => {
  const product = await findOr404(req.params.id);
  await product.deleteOne();
  await syncIndex(() => searchIndex.removeProduct(product._id), req);
  res.json(withWarning(req, { message: 'Product deleted', _id: product._id }));
}));

module.exports = router;
module.exports.HttpError = HttpError;
