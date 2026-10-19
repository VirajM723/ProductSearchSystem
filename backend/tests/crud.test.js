const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, setup, teardown, validProduct, catalogue } = require('./helpers');

describe('products CRUD', () => {
  before(setup);
  after(teardown);

  it('lists products newest first with paging info', async () => {
    const res = await api().get('/api/products?limit=5').expect(200);
    assert.equal(res.body.total, catalogue.length);
    assert.equal(res.body.items.length, 5);
    assert.equal(res.body.pages, Math.ceil(catalogue.length / 5));
    assert.equal(res.body.items[0].name, catalogue[0].name);
  });

  it('creates a product and makes it searchable straight away', async () => {
    const res = await api().post('/api/products').send(validProduct()).expect(201);
    assert.ok(res.body._id);
    assert.equal(res.body.inStock, true);
    assert.equal(res.body.warning, undefined);

    const search = await api().get('/api/products/search?q=walnut bookshelf').expect(200);
    assert.equal(search.body.items[0]._id, res.body._id);
  });

  it('cleans up input: trims text, rounds price, normalises tags', async () => {
    const res = await api()
      .post('/api/products')
      .send(validProduct({ name: '   Spaced   ', price: '10.456', tags: 'Oak, oak ,  SHELF,,' }))
      .expect(201);
    assert.equal(res.body.name, 'Spaced');
    assert.equal(res.body.price, 10.46);
    assert.deepEqual(res.body.tags, ['oak', 'shelf']);
  });

  it('ignores fields that are not editable', async () => {
    const res = await api()
      .post('/api/products')
      .send(validProduct({ _id: '507f1f77bcf86cd799439011', createdAt: '1990-01-01', hacked: true }))
      .expect(201);
    assert.notEqual(res.body._id, '507f1f77bcf86cd799439011');
    assert.notEqual(new Date(res.body.createdAt).getFullYear(), 1990);
    assert.equal(res.body.hacked, undefined);
  });

  it('rejects missing and invalid fields with a message per field', async () => {
    const res = await api()
      .post('/api/products')
      .send({ name: '', price: -5, rating: 7, image: 'javascript:alert(1)' })
      .expect(400);
    for (const field of ['name', 'description', 'category', 'brand', 'price', 'rating', 'image']) {
      assert.ok(res.body.fields[field], `expected an error for ${field}`);
    }
  });

  it('rejects a price that is not a number', async () => {
    const res = await api().post('/api/products').send(validProduct({ price: 'cheap' })).expect(400);
    assert.match(res.body.fields.price, /number/);
  });

  it('rejects too many tags and overly long names', async () => {
    const tags = Array.from({ length: 25 }, (_, i) => `tag${i}`);
    const res = await api().post('/api/products').send(validProduct({ tags, name: 'x'.repeat(200) })).expect(400);
    assert.ok(res.body.fields.tags);
    assert.ok(res.body.fields.name);
  });

  it('rejects malformed JSON and non-object bodies', async () => {
    await api().post('/api/products').set('content-type', 'application/json').send('{oops').expect(400);
    await api().post('/api/products').send([1, 2, 3]).expect(400);
  });

  it('gets a single product', async () => {
    const created = await api().post('/api/products').send(validProduct({ name: 'Single' })).expect(201);
    const res = await api().get(`/api/products/${created.body._id}`).expect(200);
    assert.equal(res.body.name, 'Single');
  });

  it('returns 400 for a malformed id and 404 for an unknown one', async () => {
    await api().get('/api/products/not-an-id').expect(400);
    await api().get('/api/products/507f1f77bcf86cd799439011').expect(404);
    await api().patch('/api/products/507f1f77bcf86cd799439011').send({ price: 1 }).expect(404);
    await api().delete('/api/products/507f1f77bcf86cd799439011').expect(404);
  });

  it('patches only the given fields and updates the index', async () => {
    const created = await api().post('/api/products').send(validProduct({ name: 'Patch Me Lamp' })).expect(201);
    const res = await api()
      .patch(`/api/products/${created.body._id}`)
      .send({ price: 42, inStock: false })
      .expect(200);
    assert.equal(res.body.price, 42);
    assert.equal(res.body.inStock, false);
    assert.equal(res.body.name, 'Patch Me Lamp');

    const search = await api().get('/api/products/search?q=patch me lamp&inStock=false').expect(200);
    assert.equal(search.body.items[0].price, 42);
  });

  it('validates on update too', async () => {
    const created = await api().post('/api/products').send(validProduct()).expect(201);
    await api().patch(`/api/products/${created.body._id}`).send({ price: -1 }).expect(400);
    await api().patch(`/api/products/${created.body._id}`).send({ name: '   ' }).expect(400);
  });

  it('PUT replaces the whole product', async () => {
    const created = await api()
      .post('/api/products')
      .send(validProduct({ rating: 4, image: 'https://example.com/a.jpg' }))
      .expect(201);
    await api().put(`/api/products/${created.body._id}`).send({ name: 'Only a name' }).expect(400);

    const res = await api()
      .put(`/api/products/${created.body._id}`)
      .send(validProduct({ name: 'Replaced' }))
      .expect(200);
    assert.equal(res.body.name, 'Replaced');
    assert.equal(res.body.image, '');
  });

  it('deletes a product and removes it from search', async () => {
    const created = await api().post('/api/products').send(validProduct({ name: 'Zanzibar Deletable' })).expect(201);
    await api().delete(`/api/products/${created.body._id}`).expect(200);
    await api().get(`/api/products/${created.body._id}`).expect(404);

    const search = await api().get('/api/products/search?q=zanzibar').expect(200);
    assert.equal(search.body.total, 0);
  });

  it('returns distinct categories and brands', async () => {
    const res = await api().get('/api/products/meta').expect(200);
    assert.ok(res.body.categories.includes('Kitchen'));
    assert.ok(res.body.brands.includes('Northline'));
    assert.deepEqual(res.body.categories, [...res.body.categories].sort((a, b) => a.localeCompare(b)));
  });

  it('reports health and 404s unknown routes', async () => {
    const health = await api().get('/api/health').expect(200);
    assert.equal(health.body.status, 'ok');
    await api().get('/api/does-not-exist').expect(404);
  });
});
