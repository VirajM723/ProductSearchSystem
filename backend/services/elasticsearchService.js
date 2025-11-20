const { client } = require('../config/elasticsearch');
const Product = require('../models/Product');

class ElasticsearchService {
  constructor() {
    this.indexName = 'products';
  }

  // Ensure index exists with correct mapping (creates if missing)
  async ensureIndex() {
    const exists = await client.indices.exists({ index: this.indexName });
    if (!exists) {
      console.log(` Creating Elasticsearch index: ${this.indexName}`);
      await client.indices.create({
        index: this.indexName,
        body: {
          mappings: {
            properties: {
              name: { type: 'text' },
              description: { type: 'text' },
              category: { 
                type: 'text', 
                fields: { keyword: { type: 'keyword', ignore_above: 256 } } 
              },
              brand: { 
                type: 'text', 
                fields: { keyword: { type: 'keyword', ignore_above: 256 } } 
              },
              price: { type: 'float' },
              tags: { type: 'keyword' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(' Index created successfully.');
    }
  }

  // Index (add) a product
  async indexProduct(product) {
    try {
      await this.ensureIndex();
      await client.index({
        index: this.indexName,
        id: product._id.toString(),
        document: {
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          brand: product.brand,
          tags: product.tags || [],
          createdAt: product.createdAt
        }
      });
      await client.indices.refresh({ index: this.indexName });
    } catch (err) {
      console.error('❌ Error indexing product:', err);
      throw err;
    }
  }

  // Search products (no index changes needed - option 2)
async searchProducts(query, filters = {}) {
  try {
    // Defensive normalization
    if (filters && typeof filters === 'object') {
      if (typeof filters.category === 'string') {
        filters.category = filters.category.trim();
        if (filters.category === '') delete filters.category;
      }
      if (typeof filters.brand === 'string') {
        filters.brand = filters.brand.trim();
        if (filters.brand === '') delete filters.brand;
      }
      if (filters.minPrice !== undefined) {
        filters.minPrice = Number(filters.minPrice);
        if (Number.isNaN(filters.minPrice)) delete filters.minPrice;
      }
      if (filters.maxPrice !== undefined) {
        filters.maxPrice = Number(filters.maxPrice);
        if (Number.isNaN(filters.maxPrice)) delete filters.maxPrice;
      }
      // ignore inStock if you still want to ignore
      if ('inStock' in filters) delete filters.inStock;
    }

    const must = [];
    const filter = [];

    // main free-text query
    if (query && String(query).trim() !== '') {
      must.push({
        multi_match: {
          query: String(query).trim(),
          fields: ['name^3', 'description^2', 'brand', 'category', 'tags'],
          fuzziness: 'AUTO'
        }
      });
    }

    if (filters.category) {
      filter.push({
        // 'match' on a text field uses the analyzer
        match: {
          category: {
            query: filters.category,
            operator: 'and',
            fuzziness: 'AUTO'
          }
        }
      });
    }

    if (filters.brand) {
      filter.push({
        match: {
          brand: {
            query: filters.brand,
            operator: 'and',
            fuzziness: 'AUTO'
          }
        }
      });
    }


    const queryBody = {
      query: {
        bool: {
          must: must.length > 0 ? must : [{ match_all: {} }],
          filter: filter
        }
      },
      sort: [
        { _score: { order: 'desc' } },
        { createdAt: { order: 'desc' } }
      ],
      size: 50
    };

    // debug log can be enabled temporarily:
    // console.log('ES query:', JSON.stringify(queryBody, null, 2));

    const result = await client.search({
      index: this.indexName,
      body: queryBody
    });

    return result.hits.hits.map(hit => ({
      id: hit._id,
      score: hit._score,
      ...hit._source
    }));
  } catch (err) {
    console.error('Error searching products:', err);
    throw err;
  }
}

  // Reindex all products from MongoDB
  async reindexAll() {
    try {
      const exists = await client.indices.exists({ index: this.indexName });
      if (exists) {
        console.log(` Deleting existing index "${this.indexName}" to refresh mapping...`);
        await client.indices.delete({ index: this.indexName });
      }

      await this.ensureIndex();

      const products = await Product.find();
      let count = 0;
      for (const product of products) {
        await this.indexProduct(product);
        count++;
      }
      console.log(` Reindexed ${count} products.`);
      return count;
    } catch (err) {
      console.error(' Reindexing error:', err);
      throw err;
    }
  }
}

module.exports = new ElasticsearchService();
