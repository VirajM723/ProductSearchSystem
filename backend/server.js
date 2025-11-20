require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const connectDB = require('./config/database');
const { createIndex } = require('./config/elasticsearch');
const productRoutes = require('./routes/products');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Connect to databases
connectDB();
createIndex();

// Routes
app.use('/api/products', productRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'MEAN Stack + Elasticsearch API Running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Node.js version: ${process.version}`);
});