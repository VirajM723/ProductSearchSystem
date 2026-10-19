const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { normaliseSearchParams } = require('../services/elasticsearchService');

describe('normaliseSearchParams', () => {
  it('uses sensible defaults', () => {
    assert.deepEqual(normaliseSearchParams({}), {
      q: '', categories: [], brands: [], minPrice: undefined, maxPrice: undefined,
      inStock: undefined, sort: 'relevance', page: 1, limit: 24
    });
  });

  it('splits comma separated and repeated filters', () => {
    const p = normaliseSearchParams({ category: ['Home, Kitchen', 'Books'], brand: ' Pace ' });
    assert.deepEqual(p.categories, ['Home', 'Kitchen', 'Books']);
    assert.deepEqual(p.brands, ['Pace']);
  });

  it('ignores objects smuggled in through the query string', () => {
    const p = normaliseSearchParams({ q: { $ne: 1 }, category: { a: 'b' } });
    assert.equal(p.q, '');
    assert.deepEqual(p.categories, []);
  });

  it('parses booleans and prices strictly', () => {
    assert.equal(normaliseSearchParams({ inStock: 'true' }).inStock, true);
    assert.equal(normaliseSearchParams({ inStock: '0' }).inStock, false);
    assert.equal(normaliseSearchParams({ inStock: 'yes' }).inStock, undefined);
    assert.equal(normaliseSearchParams({ minPrice: '-5' }).minPrice, undefined);
    assert.equal(normaliseSearchParams({ minPrice: '' }).minPrice, undefined);
    assert.equal(normaliseSearchParams({ maxPrice: 'Infinity' }).maxPrice, undefined);
    assert.equal(normaliseSearchParams({ minPrice: '0' }).minPrice, 0);
  });

  it('keeps paging inside the Elasticsearch result window', () => {
    const p = normaliseSearchParams({ page: '100000', limit: '60' });
    assert.ok((p.page - 1) * p.limit + p.limit <= 10000);
  });

  it('trims and limits the query', () => {
    assert.equal(normaliseSearchParams({ q: '  lamp  ' }).q, 'lamp');
    assert.equal(normaliseSearchParams({ q: 'x'.repeat(1000) }).q.length, 200);
  });
});
