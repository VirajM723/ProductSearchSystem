const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  requestTimeout: 10000,
  maxRetries: 2
});

// `products` is an alias that points at a versioned index (products_v1712..)
// so a full reindex can build a fresh index and swap it in atomically.
const INDEX_ALIAS = process.env.ES_INDEX || 'products';

const indexSettings = {
  analysis: {
    filter: {
      autocomplete_filter: {
        type: 'edge_ngram',
        min_gram: 2,
        max_gram: 20
      }
    },
    normalizer: {
      lowercase: {
        type: 'custom',
        filter: ['lowercase', 'asciifolding']
      }
    },
    analyzer: {
      autocomplete: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding', 'autocomplete_filter']
      },
      autocomplete_search: {
        type: 'custom',
        tokenizer: 'standard',
        filter: ['lowercase', 'asciifolding']
      }
    }
  }
};

// keyword (exact, used for facets) + `lower` for case-insensitive filters
// + `text` so the field still takes part in full-text search.
const facetField = {
  type: 'keyword',
  fields: {
    lower: { type: 'keyword', normalizer: 'lowercase' },
    text: { type: 'text', analyzer: 'english' }
  }
};

const indexMappings = {
  dynamic: 'strict',
  properties: {
    name: {
      type: 'text',
      analyzer: 'english',
      fields: {
        plain: { type: 'text', analyzer: 'standard' },
        autocomplete: {
          type: 'text',
          analyzer: 'autocomplete',
          search_analyzer: 'autocomplete_search'
        },
        sort: { type: 'keyword', normalizer: 'lowercase' }
      }
    },
    description: { type: 'text', analyzer: 'english' },
    category: facetField,
    brand: facetField,
    tags: {
      type: 'keyword',
      normalizer: 'lowercase',
      fields: { text: { type: 'text', analyzer: 'english' } }
    },
    price: { type: 'scaled_float', scaling_factor: 100 },
    rating: { type: 'half_float' },
    inStock: { type: 'boolean' },
    image: { type: 'keyword', index: false },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date' }
  }
};

async function ping() {
  try {
    await client.ping();
    return true;
  } catch {
    return false;
  }
}

module.exports = { client, INDEX_ALIAS, indexSettings, indexMappings, ping };
