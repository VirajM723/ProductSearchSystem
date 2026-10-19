const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, anon, signIn, ADMIN, setup, teardown, validProduct, Product } = require('./helpers');

describe('admin login', () => {
  before(setup);
  after(teardown);

  it('lets visitors read and search without signing in', async () => {
    await anon().get('/api/products').expect(200);
    await anon().get('/api/products/search?q=lamp').expect(200);
    await anon().get('/api/products/suggest?q=lam').expect(200);
    await anon().get('/api/products/meta').expect(200);
  });

  it('blocks every write for visitors', async () => {
    const [product] = await Product.find().limit(1);
    const id = product._id.toString();
    await anon().post('/api/products').send(validProduct()).expect(401);
    await anon().put(`/api/products/${id}`).send(validProduct()).expect(401);
    await anon().patch(`/api/products/${id}`).send({ price: 1 }).expect(401);
    await anon().delete(`/api/products/${id}`).expect(401);
    await anon().post('/api/products/reindex').expect(401);

    const unchanged = await Product.findById(id);
    assert.equal(unchanged.price, product.price);
  });

  it('signs in and sets an http-only, same-site session cookie', async () => {
    const res = await anon().post('/api/auth/login').send(ADMIN).expect(200);
    assert.deepEqual(res.body, { username: ADMIN.username });
    const cookie = res.headers['set-cookie'][0];
    assert.match(cookie, /^cg_session=/);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /Path=\/api/);
  });

  it('reports who is signed in', async () => {
    const me = await api().get('/api/auth/me').expect(200);
    assert.equal(me.body.username, ADMIN.username);
    const visitor = await anon().get('/api/auth/me').expect(200);
    assert.equal(visitor.body.username, null);
  });

  it('allows writes once signed in', async () => {
    await api().post('/api/products').send(validProduct()).expect(201);
  });

  it('rejects a forged or tampered session cookie', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ sub: 'admin' }, 'not-the-real-secret-not-the-real-secret', { issuer: 'product-search-api' });
    await anon().post('/api/products').set('Cookie', `cg_session=${forged}`).send(validProduct()).expect(401);
    await anon().post('/api/products').set('Cookie', 'cg_session=garbage').send(validProduct()).expect(401);

    const none = jwt.sign({ sub: 'admin' }, '', { algorithm: 'none', issuer: 'product-search-api' });
    await anon().post('/api/products').set('Cookie', `cg_session=${none}`).send(validProduct()).expect(401);
  });

  it('signs out', async () => {
    const agent = await signIn();
    assert.equal((await agent.get('/api/auth/me').expect(200)).body.username, 'admin');
    await agent.post('/api/auth/logout').expect(200);
    assert.equal((await agent.get('/api/auth/me').expect(200)).body.username, null);
    await agent.post('/api/products').send(validProduct()).expect(401);
  });

  it('changing the password ends existing sessions', async () => {
    const { hashPassword } = require('../config/auth');
    const agent = await signIn();
    const original = process.env.ADMIN_PASSWORD_HASH;
    process.env.ADMIN_PASSWORD_HASH = hashPassword('a-brand-new-password');
    try {
      assert.equal((await agent.get('/api/auth/me').expect(200)).body.username, null);
    } finally {
      process.env.ADMIN_PASSWORD_HASH = original;
    }
  });

  it('rejects bad input without saying which part was wrong', async () => {
    await anon().post('/api/auth/login').send({}).expect(400);
    await anon().post('/api/auth/login').send({ username: ['admin'], password: { $ne: '' } }).expect(400);
    const wrongUser = await anon().post('/api/auth/login').send({ username: 'root', password: ADMIN.password }).expect(401);
    const wrongPass = await anon().post('/api/auth/login').send({ username: ADMIN.username, password: 'nope' }).expect(401);
    assert.equal(wrongUser.body.error, wrongPass.body.error);
  });

  it('locks out after too many failed attempts', async () => {
    let last;
    for (let i = 0; i < 6; i++) {
      last = await anon().post('/api/auth/login').send({ username: 'admin', password: `guess-${i}` });
    }
    assert.equal(last.status, 429);
    // Even the right password is refused until the window passes.
    await anon().post('/api/auth/login').send(ADMIN).expect(429);
  });

  it('sends security headers', async () => {
    const res = await anon().get('/api/health').expect(200);
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
    assert.ok(res.headers['strict-transport-security']);
    assert.equal(res.headers['x-powered-by'], undefined);
  });
});
