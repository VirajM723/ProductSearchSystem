const { Client } = require('@elastic/elasticsearch');

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200'
});

const createIndex = async () => {
  try {
    const indexExists = await client.indices.exists({ index: 'products' });
    
    if (!indexExists) {
      await client.indices.create({
        index: 'products',
        body: {
          mappings: {
            properties: {
              name: { type: 'text', analyzer: 'standard' },
              description: { type: 'text', analyzer: 'standard' },
              category: { type: 'keyword' },
              price: { type: 'float' },
              brand: { type: 'keyword' },
              tags: { type: 'keyword' },
              inStock: { type: 'boolean' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log('Elasticsearch index created');
    }
    console.log('Elasticsearch 9.2.0 connected successfully');
  } catch (err) {
    console.error('Elasticsearch error:', err.message);
  }
};

module.exports = { client, createIndex };