// Loads the sample catalogue into MongoDB and rebuilds the search index.
//   npm run seed           -> only seeds if the collection is empty
//   npm run seed -- --fresh -> wipes existing products first
require('dotenv').config();
const path = require('path');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Product = require('../models/Product');
const searchIndex = require('../services/elasticsearchService');

const products = require(path.join(__dirname, '..', 'data', 'products.json'));

async function seed() {
  await connectDB(process.env.MONGODB_URI, 3);
  const fresh = process.argv.includes('--fresh');
  const existing = await Product.estimatedDocumentCount();

  if (existing && !fresh) {
    console.log(`There are already ${existing} products. Run with --fresh to replace them.`);
  } else {
    if (fresh) await Product.deleteMany({});
    // Spread the dates out a bit so "newest first" has something to sort by.
    const now = Date.now();
    const docs = products.map((p, i) => ({
      ...p,
      createdAt: new Date(now - i * 36e5),
      updatedAt: new Date(now - i * 36e5)
    }));
    await Product.insertMany(docs);
    console.log(`Inserted ${docs.length} products`);
  }

  try {
    const count = await searchIndex.reindexAll();
    console.log(`Indexed ${count} products in Elasticsearch`);
  } catch (err) {
    console.warn(`Could not reach Elasticsearch (${err.message}). The API will index on startup.`);
  }
}

seed()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
