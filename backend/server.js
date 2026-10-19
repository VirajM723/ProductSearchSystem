require('dotenv').config();
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/database');
const searchIndex = require('./services/elasticsearchService');

const PORT = process.env.PORT || 3000;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Elasticsearch takes a while to boot, so keep trying in the background.
// Search falls back to MongoDB until this succeeds.
async function syncSearchIndex(attempt = 1) {
  try {
    const { reindexed, count } = await searchIndex.syncWithDatabase();
    console.log(reindexed ? `Search index rebuilt with ${count} products` : `Search index ready (${count} products)`);
  } catch (err) {
    const delay = Math.min(30000, 2000 * attempt);
    console.warn(`Elasticsearch not ready (${err.message}), retrying in ${delay / 1000}s`);
    await wait(delay);
    return syncSearchIndex(attempt + 1);
  }
}

// Picks up writes that happened while Elasticsearch was unreachable.
function watchForStaleIndex() {
  const timer = setInterval(async () => {
    if (!searchIndex.stale) return;
    try {
      const count = await searchIndex.reindexAll();
      console.log(`Search index caught up (${count} products)`);
    } catch {
      // Still down, try again on the next tick.
    }
  }, 30000);
  timer.unref();
}

async function start() {
  await connectDB();
  syncSearchIndex();
  watchForStaleIndex();

  const server = app.listen(PORT, () => {
    console.log(`API listening on http://localhost:${PORT}`);
  });

  const shutdown = async (signal) => {
    console.log(`${signal} received, shutting down`);
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start().catch((err) => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
