/**
 * AI-Powered Smart Healthcare Assistant - Backend Server
 * Node.js + Express API Gateway & Application Server
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Frontend Static Assets
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Mount API routes
app.use('/api', apiRoutes);

// Root route fallback to index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err.stack);
  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(65));
  console.log('  🏥 AI-Powered Smart Healthcare Assistant - Server Online');
  console.log('='.repeat(65));
  console.log(`  🌐 Frontend Portal:      http://localhost:${PORT}`);
  console.log(`  ⚡ Backend API Gateway:   http://localhost:${PORT}/api`);
  console.log(`  🧠 AI Microservice URL:  http://localhost:5001 (Python)`);
  console.log('='.repeat(65) + '\n');
});
