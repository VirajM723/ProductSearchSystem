// Shared setup for the API tests. Uses its own database and index so a
// test run never touches the data you are working with.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://localhost:27017/productsearch_test';
process.env.ES_INDEX = process.env.TEST_ES_INDEX || 'products_test';

const { hashPassword } = require('../config/auth');
const ADMIN = { username: 'admin', password: 'test-password-123' };
process.env.ADMIN_USERNAME = ADMIN.username;
process.env.ADMIN_PASSWORD_HASH = hashPassword(ADMIN.password);
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const mongoose = require('mongoose');
const request = require('supertest');
const app = require('../app');
const Product = require('../models/Product');
const searchIndex = require('../services/elasticsearchService');
const { client } = require('../config/elasticsearch');
const catalogue = require('../data/products.json');

// `api()` is signed in as the admin (cookies are kept between calls),
// `anon()` is a visitor with no session.
let adminAgent = null;
const api = () => adminAgent;
const anon = () => request(app);

async function signIn() {
  const agent = request.agent(app);
  await agent.post('/api/auth/login').send(ADMIN).expect(200);
  return agent;
}

async function setup() {
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
  await resetData();
  adminAgent = await signIn();
}

async function resetData() {
  await Product.deleteMany({});
  const now = Date.now();
  await Product.insertMany(
    catalogue.map((p, i) => ({ ...p, createdAt: new Date(now - i * 60000) }))
  );
  await searchIndex.reindexAll();
}

async function teardown() {
  try {
    // Wildcard deletes are disabled by default in Elasticsearch 8, so look
    // the test indices up first and delete them by name.
    const indices = await client.indices.get({ index: `${process.env.ES_INDEX}_v*` });
    const names = Object.keys(indices);
    if (names.length) await client.indices.delete({ index: names });
    await mongoose.connection.dropDatabase();
  } finally {
    await mongoose.disconnect();
    await client.close();
  }
}

const validProduct = (overrides = {}) => ({
  name: 'Walnut Bookshelf',
  description: 'Solid walnut shelf with five adjustable levels.',
  category: 'Home',
  brand: 'Testwood',
  price: 15999,
  tags: ['furniture', 'walnut'],
  ...overrides
});

module.exports = { api, anon, signIn, ADMIN, app, setup, teardown, resetData, validProduct, catalogue, Product, searchIndex, client };
