const { client, INDEX_ALIAS, indexSettings, indexMappings } = require('../config/elasticsearch');
const Product = require('../models/Product');

const SORTS = {
  relevance: null,
  newest: [{ createdAt: 'desc' }],
  price_asc: [{ price: 'asc' }, { createdAt: 'desc' }],
  price_desc: [{ price: 'desc' }, { createdAt: 'desc' }],
  rating: [{ rating: { order: 'desc', missing: '_last' } }, { createdAt: 'desc' }],
  name: [{ 'name.sort': 'asc' }]
};

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 60;
// Elasticsearch refuses from + size above index.max_result_window (10k).
const MAX_WINDOW = 10000;
const BULK_BATCH = 500;

const TEXT_FIELDS = ['name^4', 'brand.text^2', 'category.text^2', 'tags.text^2', 'description'];

function toDocument(product) {
  return {
    name: product.name,
    description: product.description,
    category: product.category,
    brand: product.brand,
    tags: product.tags || [],
    price: product.price,
    rating: product.rating ?? null,
    inStock: product.inStock !== false,
    image: product.image || '',
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function toList(value) {
  if (value == null) return [];
  const raw = Array.isArray(value) ? value : [value];
  return raw
    .filter((v) => typeof v === 'string')
    .flatMap((v) => v.split(','))
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function toPrice(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function toBool(value) {
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

function toInt(value, fallback, min, max) {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(n, min), max);
}

/**
 * Turns raw query-string values into something safe to build a query from.
 * Bad values are dropped rather than rejected so a mangled URL still
 * returns results.
 */
function normaliseSearchParams(raw = {}) {
  const q = typeof raw.q === 'string' ? raw.q.trim().slice(0, 200) : '';
  let minPrice = toPrice(raw.minPrice);
  let maxPrice = toPrice(raw.maxPrice);
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    [minPrice, maxPrice] = [maxPrice, minPrice];
  }

  const limit = toInt(raw.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const maxPage = Math.floor(MAX_WINDOW / limit);
  const page = toInt(raw.page, 1, 1, maxPage);
  const sort = Object.prototype.hasOwnProperty.call(SORTS, raw.sort) ? raw.sort : 'relevance';

  return {
    q,
    categories: toList(raw.category),
    brands: toList(raw.brand),
    minPrice,
    maxPrice,
    inStock: toBool(raw.inStock),
    sort,
    page,
    limit
  };
}

function buildTextQuery(q) {
  if (!q) return { match_all: {} };

  return {
    bool: {
      must: [
        {
          bool: {
            should: [
              // Every word has to show up somewhere, but not all in the same field.
              { multi_match: { query: q, type: 'cross_fields', fields: TEXT_FIELDS, operator: 'and', boost: 2 } },
              // Typos: "hedphones" should still find headphones.
              {
                multi_match: {
                  query: q,
                  type: 'best_fields',
                  fields: TEXT_FIELDS,
                  fuzziness: 'AUTO',
                  prefix_length: 1,
                  minimum_should_match: '2<75%'
                }
              },
              // Half-typed words while the user is still typing.
              { match: { 'name.autocomplete': { query: q, operator: 'and', boost: 1.5 } } },
              { match_phrase: { name: { query: q, boost: 6 } } }
            ],
            minimum_should_match: 1
          }
        }
      ],
      // Nudge available items up without hiding sold-out ones.
      should: [{ term: { inStock: { value: true, boost: 0.5 } } }]
    }
  };
}

function buildFilters(params) {
  const filters = {};
  if (params.categories.length) {
    filters.category = { terms: { 'category.lower': params.categories.map((c) => c.toLowerCase()) } };
  }
  if (params.brands.length) {
    filters.brand = { terms: { 'brand.lower': params.brands.map((b) => b.toLowerCase()) } };
  }
  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    const range = {};
    if (params.minPrice !== undefined) range.gte = params.minPrice;
    if (params.maxPrice !== undefined) range.lte = params.maxPrice;
    filters.price = { range: { price: range } };
  }
  if (params.inStock !== undefined) {
    filters.stock = { term: { inStock: params.inStock } };
  }
  return filters;
}

// Each facet is counted with every filter applied except its own, so
// picking one brand doesn't make the other brands disappear from the list.
function allBut(filters, skip) {
  const clauses = Object.entries(filters)
    .filter(([key]) => key !== skip)
    .map(([, clause]) => clause);
  return clauses.length ? { bool: { filter: clauses } } : { match_all: {} };
}

function buildSearchBody(params) {
  const filters = buildFilters(params);
  const allFilters = Object.values(filters);

  const body = {
    query: buildTextQuery(params.q),
    post_filter: allFilters.length ? { bool: { filter: allFilters } } : undefined,
    from: (params.page - 1) * params.limit,
    size: params.limit,
    track_total_hits: true,
    aggs: {
      categories: {
        filter: allBut(filters, 'category'),
        aggs: { values: { terms: { field: 'category', size: 50, order: { _key: 'asc' } } } }
      },
      brands: {
        filter: allBut(filters, 'brand'),
        aggs: { values: { terms: { field: 'brand', size: 100, order: { _key: 'asc' } } } }
      },
      price: {
        filter: allBut(filters, 'price'),
        aggs: { stats: { stats: { field: 'price' } } }
      },
      inStock: {
        filter: allBut(filters, 'stock'),
        aggs: { available: { filter: { term: { inStock: true } } } }
      }
    }
  };

  const sort = SORTS[params.sort] || (params.q ? null : SORTS.newest);
  if (sort) body.sort = sort;

  if (params.q) {
    body.suggest = {
      text: params.q,
      spelling: {
        term: { field: 'name.plain', suggest_mode: 'popular', min_word_length: 3, sort: 'frequency' }
      }
    };
  }

  if (!body.post_filter) delete body.post_filter;
  return body;
}

function didYouMean(q, suggest) {
  const entries = suggest?.spelling;
  if (!q || !entries || !entries.length) return null;

  let changed = false;
  const words = entries.map((entry) => {
    const best = entry.options?.[0];
    if (best && best.text !== entry.text.toLowerCase()) {
      changed = true;
      return best.text;
    }
    return entry.text;
  });
  return changed ? words.join(' ') : null;
}

function readBuckets(agg) {
  return (agg?.values?.buckets || []).map((b) => ({ value: b.key, count: b.doc_count }));
}

class ElasticsearchService {
  constructor() {
    this.index = INDEX_ALIAS;
    this.ready = null;
    // Set when a write could not reach Elasticsearch; the server retries a
    // full reindex in the background until it works.
    this.stale = false;
  }

  // Creates the alias + backing index on first use. Returns true when a new
  // empty index was made, which means the caller should load data into it.
  ensureIndex() {
    if (!this.ready) {
      this.ready = this._ensureIndex().catch((err) => {
        this.ready = null;
        throw err;
      });
    }
    return this.ready;
  }

  async _ensureIndex() {
    if (await client.indices.existsAlias({ name: this.index })) return false;

    // Older versions of this project created a plain index called
    // "products". It would block the alias, and its mapping is wrong anyway.
    if (await client.indices.exists({ index: this.index })) {
      console.log(`Replacing old "${this.index}" index with an aliased one`);
      await client.indices.delete({ index: this.index });
    }

    const name = await this.createVersionedIndex();
    await client.indices.putAlias({ index: name, name: this.index });
    return true;
  }

  async createVersionedIndex() {
    const name = `${this.index}_v${Date.now()}`;
    await client.indices.create({ index: name, settings: indexSettings, mappings: indexMappings });
    return name;
  }

  async indexProduct(product) {
    await this.ensureIndex();
    await client.index({
      index: this.index,
      id: product._id.toString(),
      document: toDocument(product),
      refresh: 'wait_for'
    });
  }

  async removeProduct(id) {
    await this.ensureIndex();
    await client.delete(
      { index: this.index, id: id.toString(), refresh: 'wait_for' },
      { ignore: [404] }
    );
  }

  /**
   * Builds a brand new index from MongoDB, then points the alias at it in a
   * single step so searches never see a half-filled index.
   */
  async reindexAll() {
    const newIndex = await this.createVersionedIndex();
    let count = 0;

    try {
      let batch = [];
      const flush = async () => {
        if (!batch.length) return;
        const res = await client.bulk({ operations: batch });
        if (res.errors) {
          const failed = res.items.find((item) => item.index?.error);
          throw new Error(`Bulk indexing failed: ${failed?.index?.error?.reason || 'unknown error'}`);
        }
        batch = [];
      };

      for await (const product of Product.find().lean().cursor()) {
        batch.push({ index: { _index: newIndex, _id: product._id.toString() } }, toDocument(product));
        count++;
        if (batch.length >= BULK_BATCH * 2) await flush();
      }
      await flush();
      await client.indices.refresh({ index: newIndex });
    } catch (err) {
      await client.indices.delete({ index: newIndex }, { ignore: [404] });
      throw err;
    }

    const actions = [{ add: { index: newIndex, alias: this.index } }];
    let oldIndices = [];
    if (await client.indices.existsAlias({ name: this.index })) {
      const current = await client.indices.getAlias({ name: this.index });
      oldIndices = Object.keys(current);
      oldIndices.forEach((index) => actions.unshift({ remove: { index, alias: this.index } }));
    } else if (await client.indices.exists({ index: this.index })) {
      await client.indices.delete({ index: this.index });
    }

    await client.indices.updateAliases({ actions });
    if (oldIndices.length) {
      await client.indices.delete({ index: oldIndices }, { ignore: [404] });
    }

    this.ready = Promise.resolve(false);
    this.stale = false;
    return count;
  }

  // Called on boot. Rebuilds the index if it is new or clearly out of step
  // with the database (e.g. products were added while Elasticsearch was down).
  async syncWithDatabase() {
    const created = await this.ensureIndex();
    const [{ count: indexed }, stored] = await Promise.all([
      client.count({ index: this.index }),
      Product.estimatedDocumentCount()
    ]);

    if (created || indexed !== stored) {
      const count = await this.reindexAll();
      return { reindexed: true, count };
    }
    return { reindexed: false, count: indexed };
  }

  async search(rawParams) {
    const params = normaliseSearchParams(rawParams);
    await this.ensureIndex();

    const res = await client.search({ index: this.index, ...buildSearchBody(params) });
    const total = res.hits.total.value;
    const stats = res.aggregations.price.stats;

    return {
      items: res.hits.hits.map((hit) => ({ _id: hit._id, ...hit._source, score: hit._score })),
      total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(total / params.limit),
      sort: params.sort,
      query: params.q,
      didYouMean: total === 0 ? didYouMean(params.q, res.suggest) : null,
      facets: {
        categories: readBuckets(res.aggregations.categories),
        brands: readBuckets(res.aggregations.brands),
        price: { min: stats.count ? stats.min : 0, max: stats.count ? stats.max : 0 },
        inStock: res.aggregations.inStock.available.doc_count
      },
      took: res.took,
      source: 'elasticsearch'
    };
  }

  async suggest(rawQuery, limit = 6) {
    const q = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 100) : '';
    if (!q) return { products: [], categories: [] };
    await this.ensureIndex();

    const res = await client.search({
      index: this.index,
      size: limit,
      _source: ['name', 'brand', 'category', 'price', 'image', 'inStock'],
      query: {
        bool: {
          should: [
            { match: { 'name.autocomplete': { query: q, operator: 'and', boost: 2 } } },
            { match: { name: { query: q, fuzziness: 'AUTO', prefix_length: 1, operator: 'and' } } },
            { prefix: { 'brand.lower': { value: q.toLowerCase() } } }
          ],
          minimum_should_match: 1
        }
      },
      aggs: {
        all: {
          global: {},
          aggs: {
            matching: {
              filter: { prefix: { 'category.lower': q.toLowerCase() } },
              aggs: { values: { terms: { field: 'category', size: 3 } } }
            }
          }
        }
      }
    });

    return {
      products: res.hits.hits.map((hit) => ({ _id: hit._id, ...hit._source })),
      categories: readBuckets(res.aggregations.all.matching)
    };
  }
}

const service = new ElasticsearchService();
service.normaliseSearchParams = normaliseSearchParams;
service.SORTS = SORTS;

module.exports = service;
