const { describe, it, before, after, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const { api, setup, teardown, validProduct, client, searchIndex } = require('./helpers');

const down = () => Promise.reject(new Error('connect ECONNREFUSED 127.0.0.1:9200'));

describe('when Elasticsearch is down', () => {
  before(setup);
  after(teardown);
  afterEach(() => mock.restoreAll());

  it('search falls back to MongoDB with the same response shape', async () => {
    mock.method(client, 'search', down);
    const res = await api().get('/api/products/search?q=lamp&category=home&sort=price_asc').expect(200);
    assert.equal(res.body.source, 'database');
    assert.ok(res.body.total >= 2);
    assert.ok(res.body.items.every((p) => p.category === 'Home'));
    const prices = res.body.items.map((p) => p.price);
    assert.deepEqual(prices, [...prices].sort((a, b) => a - b));
    assert.deepEqual(res.body.facets.categories.map((c) => c.value), ['Home']);
  });

  it('fallback search escapes regex characters', async () => {
    mock.method(client, 'search', down);
    await api().get('/api/products/search').query({ q: '(.*' }).expect(200);
    await api().get('/api/products/search').query({ category: '[a-z]+' }).expect(200);
  });

  it('autocomplete falls back too', async () => {
    mock.method(client, 'search', down);
    const res = await api().get('/api/products/suggest?q=lamp').expect(200);
    assert.ok(res.body.products.length > 0);
  });

  it('writes still succeed, with a warning, and the index is marked stale', async () => {
    mock.method(client, 'index', down);
    const res = await api().post('/api/products').send(validProduct({ name: 'Offline Shelf' })).expect(201);
    assert.ok(res.body.warning);
    assert.equal(searchIndex.stale, true);

    mock.restoreAll();
    await searchIndex.reindexAll();
    assert.equal(searchIndex.stale, false);
    const found = await api().get('/api/products/search?q=offline shelf').expect(200);
    assert.equal(found.body.items[0].name, 'Offline Shelf');
  });

  it('reindex reports 503 instead of crashing', async () => {
    mock.method(client, 'bulk', down);
    await api().post('/api/products/reindex').expect(503);
  });
});
