const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const elasticsearchService = require('../services/elasticsearchService');

// Get all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔍 Search products using Elasticsearch
router.get('/search', async (req, res) => {
  try {
    const { q, category, brand, minPrice, maxPrice, inStock } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (brand) filters.brand = brand;
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (inStock !== undefined) filters.inStock = inStock === 'true';

    console.log(' Searching products with filters:', { q, filters });

    const results = await elasticsearchService.searchProducts(q, filters);
    res.json(results);
  } catch (err) {
    console.error(' Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reindex all products into Elasticsearch
router.post('/reindex', async (req, res) => {
  try {
    const products = await Product.find();
    let count = 0;

    for (const product of products) {
      await elasticsearchService.indexProduct(product);
      count++;
    }

    res.json({ message: `${count} products reindexed successfully` });
  } catch (err) {
    console.error(' Reindex error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;