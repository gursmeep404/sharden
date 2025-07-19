const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import controller
const { getBankData } = require('../controllers/userFirst');
const { verifyvendor } = require('../controllers/verifyvendor');
const { getBalance } = require('../controllers/getBalance');
const { requestverification } = require('../controllers/requestVerification');
// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// Direct route using controller
app.get('/bank-data', getBankData);
// app.post('/verifyvendor', verifyvendor);
// app.get('/getBalance', getBalance);
app.post('/reqverification', requestverification);

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Bank Data API Server is running!',
    status: 'healthy',
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
  console.log(`Bank data endpoint: http://localhost:${PORT}/bank-data`);
});

module.exports = app;
