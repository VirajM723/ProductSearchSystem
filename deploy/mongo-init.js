// Runs once, the first time the MongoDB volume is created. Makes a user
// that can only read and write the store's own database.
const dbName = process.env.MONGO_INITDB_DATABASE || 'productsearch';
db = db.getSiblingDB(dbName);
db.createUser({
  user: 'app',
  pwd: process.env.MONGO_APP_PASSWORD,
  roles: [{ role: 'readWrite', db: dbName }]
});
