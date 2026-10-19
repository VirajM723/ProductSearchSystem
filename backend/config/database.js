const mongoose = require('mongoose');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Retries for a while instead of exiting straight away, which helps when
// MongoDB is started at the same time as the API (docker compose etc).
async function connectDB(uri = process.env.MONGODB_URI, attempts = 10) {
  if (!uri) throw new Error('MONGODB_URI is not set. Copy backend/.env.example to backend/.env');

  for (let attempt = 1; ; attempt++) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      console.log(`MongoDB connected (${mongoose.connection.name})`);
      return mongoose.connection;
    } catch (err) {
      if (attempt >= attempts) throw err;
      console.warn(`MongoDB not reachable (${err.message}), retrying in 3s...`);
      await wait(3000);
    }
  }
}

module.exports = connectDB;
