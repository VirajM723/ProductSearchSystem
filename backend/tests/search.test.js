const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { api, setup, teardown, catalogue } = require('./helpers');

const search = async (query) => (await api().get('/api/products/search').query(query).expect(200)).body;
const names = (body) => body.items.map((p) => p.name);

describe('search', () => {
  before(setup);
  after(teardown);

  it('returns everything, newest first, when there is no query', async () => {
    const body = await search({ limit: 60 });
    assert.equal(body.total, catalogue.length);
    assert.equal(body.items[0].name, catalogue[0].name);
    assert.equal(body.source, 'elasticsearch');
  });

  it('finds products by name', async () => {
    const body = await search({ q: 'headphones' });
    assert.equal(names(body)[0], 'Halden Over-Ear Headphones');
  });

  it('tolerates typos', async () => {
    assert.equal(names(await search({ q: 'hedphones' }))[0], 'Halden Over-Ear Headphones');
    assert.equal(names(await search({ q: 'cofee grindr' }))[0], 'Burr Coffee Grinder');
  });

  it('matches partly typed words', async () => {
    const body = await search({ q: 'grind' });
    assert.ok(names(body).includes('Burr Coffee Grinder'));
  });

  it('matches words spread across fields (name + tags)', async () => {
    const body = await search({ q: 'wireless keyboard' });
    assert.equal(names(body)[0], 'Mechanical Keyboard 75%');
  });

  it('searches brand, category, description and tags', async () => {
    assert.ok(names(await search({ q: 'Northline' })).includes('Pebble True Wireless Earbuds'));
    assert.ok((await search({ q: 'stationery' })).total >= 3);
    assert.ok(names(await search({ q: 'goodyear' })).includes('Leather Chelsea Boots'));
    assert.ok(names(await search({ q: 'pour over' })).includes('Pour-Over Coffee Kettle'));
  });

  it('handles stemming (plural vs singular)', async () => {
    assert.ok(names(await search({ q: 'lamps' })).includes('Arc Floor Lamp'));
  });

  it('filters by category, case-insensitively, and by several at once', async () => {
    const kitchen = await search({ category: 'kitchen' });
    assert.ok(kitchen.total > 0);
    assert.ok(kitchen.items.every((p) => p.category === 'Kitchen'));

    const both = await search({ category: 'Kitchen,Books' });
    assert.ok(both.items.every((p) => ['Kitchen', 'Books'].includes(p.category)));
    assert.ok(both.total > kitchen.total);
  });

  it('category filter is exact, not fuzzy', async () => {
    assert.equal((await search({ category: 'Kitche' })).total, 0);
  });

  it('filters by brand and stock', async () => {
    const body = await search({ brand: 'Pace', inStock: 'true' });
    assert.ok(body.total > 0);
    assert.ok(body.items.every((p) => p.brand === 'Pace' && p.inStock));

    const sold = await search({ inStock: 'false' });
    assert.ok(sold.items.every((p) => !p.inStock));
  });

  it('filters by price range and swaps min/max if reversed', async () => {
    const body = await search({ minPrice: 1000, maxPrice: 3000, limit: 60 });
    assert.ok(body.total > 0);
    assert.ok(body.items.every((p) => p.price >= 1000 && p.price <= 3000));

    const reversed = await search({ minPrice: 3000, maxPrice: 1000, limit: 60 });
    assert.equal(reversed.total, body.total);
  });

  it('sorts by price both ways, by rating and by name', async () => {
    const asc = (await search({ sort: 'price_asc', limit: 60 })).items.map((p) => p.price);
    assert.deepEqual(asc, [...asc].sort((a, b) => a - b));

    const desc = (await search({ sort: 'price_desc', limit: 60 })).items.map((p) => p.price);
    assert.deepEqual(desc, [...desc].sort((a, b) => b - a));

    const ratings = (await search({ sort: 'rating', limit: 60 })).items.map((p) => p.rating);
    assert.deepEqual(ratings, [...ratings].sort((a, b) => b - a));

    const byName = names(await search({ sort: 'name', limit: 60 }));
    assert.deepEqual(byName, [...byName].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase())));
  });

  it('pages through results without repeats', async () => {
    const first = await search({ limit: 10, page: 1 });
    const second = await search({ limit: 10, page: 2 });
    assert.equal(first.pages, Math.ceil(catalogue.length / 10));
    const overlap = first.items.filter((a) => second.items.some((b) => b._id === a._id));
    assert.equal(overlap.length, 0);

    const beyond = await search({ limit: 10, page: 99 });
    assert.equal(beyond.items.length, 0);
  });

  it('copes with junk parameters', async () => {
    const body = await search({ page: '-4', limit: 'lots', minPrice: 'abc', sort: 'drop table', inStock: 'maybe' });
    assert.equal(body.page, 1);
    assert.equal(body.limit, 24);
    assert.equal(body.sort, 'relevance');
    assert.equal(body.total, catalogue.length);

    const capped = await search({ limit: 5000 });
    assert.equal(capped.limit, 60);
  });

  it('copes with odd query strings', async () => {
    for (const q of ['"', 'AND OR NOT', '(((', '*', 'a'.repeat(500), '<script>', '{"$gt":""}', '\\', '   ']) {
      await api().get('/api/products/search').query({ q }).expect(200);
    }
    await api().get('/api/products/search?category[a]=b&brand[]=Pace').expect(200);
  });

  it('returns facets that ignore their own filter', async () => {
    const body = await search({ category: 'Kitchen' });
    assert.ok(body.facets.categories.length > 1, 'other categories should still be listed');
    assert.ok(body.facets.brands.every((b) => ['Mill Street', 'Hearth'].includes(b.value)));
    assert.ok(body.facets.price.max >= body.facets.price.min);
    assert.ok(typeof body.facets.inStock === 'number');
  });

  it('suggests a spelling when nothing matches', async () => {
    const body = await search({ q: 'blnkt' });
    assert.equal(body.total, 0);
    assert.equal(body.didYouMean, 'blanket');
    const none = await search({ q: 'zzqqxxy' });
    assert.equal(none.total, 0);
  });

  it('autocompletes product names and categories', async () => {
    const res = await api().get('/api/products/suggest?q=wire').expect(200);
    assert.ok(res.body.products.length > 0);
    assert.ok(res.body.products.every((p) => /wire/i.test(p.name)));

    const cats = await api().get('/api/products/suggest?q=kit').expect(200);
    assert.equal(cats.body.categories[0].value, 'Kitchen');

    const empty = await api().get('/api/products/suggest').expect(200);
    assert.deepEqual(empty.body, { products: [], categories: [] });
  });

  it('reindexes everything and keeps working afterwards', async () => {
    const res = await api().post('/api/products/reindex').expect(200);
    assert.equal(res.body.count, catalogue.length);
    assert.equal((await search({})).total, catalogue.length);
  });
});
