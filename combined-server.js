require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { setupWebhook } = require('./webhookHandler');
const { setupRoutes } = require('./routes');
const logger = require('./logger');

// Ensure required directories exist
const dirs = ['logs', 'conversation_logs'];
dirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath);
    logger.info(`Created directory: ${dir}`);
  }
});

// Check for required environment variables
const requiredEnvVars = [
  'WHATSAPP_API_TOKEN',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_VERIFY_TOKEN',
  'GEMINI_API_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  logger.error('Please set these variables in your .env file');
  process.exit(1);
}

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Log all incoming requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Setup webhook endpoints
setupWebhook(app);

// Setup other routes
setupRoutes(app);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  logger.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`Webhook URL: ${process.env.SERVER_URL || `http://localhost:${PORT}`}/webhook`);
  
  // Display startup message
  console.log('\n=== DURMUSBABA.DE WhatsApp Chatbot ===');
  console.log(`Server running on port ${PORT}`);
  console.log(`Webhook URL: ${process.env.SERVER_URL || `http://localhost:${PORT}`}/webhook`);
  console.log('Use npm run check-status to view system status');
  console.log('Use npm run logs to view conversation logs');
  console.log('=========================================\n');
}); 