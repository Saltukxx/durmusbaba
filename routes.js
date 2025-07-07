const sessionManager = require('./sessionManager');
const logger = require('./logger');

/**
 * Setup additional routes for the application
 * @param {Express} app - Express application
 */
function setupRoutes(app) {
  // Health check endpoint
  app.get('/health', (req, res) => {
    const uptime = process.uptime();
    const uptimeFormatted = `${Math.floor(uptime / 86400)}d ${Math.floor((uptime % 86400) / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptimeFormatted,
      memoryUsage: process.memoryUsage(),
      activeConnections: sessionManager.getActiveSessionsCount(),
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.status(200).json(health);
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({ 
      message: 'DURMUSBABA.DE Chatbot Service',
      status: 'running',
      endpoints: {
        root: 'GET /',
        webhook: {
          verification: 'GET /webhook',
          messages: 'POST /webhook'
        },
        health: 'GET /health'
      }
    });
  });

  // View active sessions (protected endpoint)
  app.get('/sessions', (req, res) => {
    // In a real application, this should be protected with authentication
    const apiKey = req.headers['x-api-key'];
    if (!apiKey || apiKey !== process.env.ADMIN_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessions = sessionManager.getActiveSessions();
    res.status(200).json({
      count: Object.keys(sessions).length,
      sessions: sessions
    });
  });
}

module.exports = { setupRoutes }; 