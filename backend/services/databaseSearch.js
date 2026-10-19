// Plain MongoDB search, used when Elasticsearch can't be reached. It is
// slower and has no typo tolerance, but it keeps the shop usable.
const Product = require('../models/Product');
const { normaliseSearchParams } = require('./elasticsearchService');

const SORTS = {
  relevance: { createdAt: -1 },
  newest: { createdAt: -1 },
  price_asc: { price: 1, createdAt: -1 },
  price_desc: { price: -1, createdAt: -1 },
  rating: { rating: -1, createdAt: -1 },
  name: { name: 1 }
};

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const exact = (values) => values.map((v) => new RegExp(`^${escape(v)}$`, 'i'));

function buildMatch(params, skip) {
  const and = [];

  if (params.q) {
    for (const word of params.q.split(/\s+/).slice(0, 10)) {
      const re = new RegExp(escape(word), 'i');
      and.push({ $or: [{ name: re }, { description: re }, { brand: re }, { category: re }, { tags: re }] });
    }
  }
  if (skip !== 'category' && params.categories.length) and.push({ category: { $in: exact(params.categories) } });
  if (skip !== 'brand' && params.brands.length) and.push({ brand: { $in: exact(params.brands) } });
  if (skip !== 'price' && (params.minPrice !== undefined || params.maxPrice !== undefined)) {
    const price = {};
    if (params.minPrice !== undefined) price.$gte = params.minPrice;
    if (params.maxPrice !== undefined) price.$lte = params.maxPrice;
    and.push({ price });
  }
  if (skip !== 'stock' && params.inStock !== undefined) and.push({ inStock: params.inStock });

  return and.length ? { $and: and } : {};
}

const countBy = (field) => [
  { $group: { _id: `$${field}`, count: { $sum: 1 } } },
  { $sort: { _id: 1 } },
  { $project: { _id: 0, value: '$_id', count: 1 } }
];

async function search(rawParams) {
  const params = normaliseSearchParams(rawParams);
  const match = buildMatch(params);
  const started = Date.now();

  const [items, total, categories, brands, priceStats, inStock] = await Promise.all([
    Product.find(match)
      .sort(SORTS[params.sort])
      .skip((params.page - 1) * params.limit)
      .limit(params.limit)
      .lean(),
    Product.countDocuments(match),
    Product.aggregate([{ $match: buildMatch(params, 'category') }, ...countBy('category')]),
    Product.aggregate([{ $match: buildMatch(params, 'brand') }, ...countBy('brand')]),
    Product.aggregate([
      { $match: buildMatch(params, 'price') },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }
    ]),
    Product.countDocuments({ ...buildMatch(params, 'stock'), inStock: true })
  ]);

  return {
    items,
    total,
    page: params.page,
    limit: params.limit,
    pages: Math.ceil(total / params.limit),
    sort: params.sort,
    query: params.q,
    didYouMean: null,
    facets: {
      categories,
      brands,
      price: { min: priceStats[0]?.min ?? 0, max: priceStats[0]?.max ?? 0 },
      inStock
    },
    took: Date.now() - started,
    source: 'database'
  };
}

async function suggest(rawQuery, limit = 6) {
  const q = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 100) : '';
  if (!q) return { products: [], categories: [] };

  const re = new RegExp(escape(q), 'i');
  const [products, categories] = await Promise.all([
    Product.find({ $or: [{ name: re }, { brand: re }] })
      .select('name brand category price image inStock')
      .limit(limit)
      .lean(),
    Product.aggregate([
      { $match: { category: new RegExp(`^${escape(q)}`, 'i') } },
      ...countBy('category'),
      { $limit: 3 }
    ])
  ]);
  return { products, categories };
}

module.exports = { search, suggest };
