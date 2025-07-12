require('dotenv').config();
const whatsappService = require('./whatsappService');
const geminiService = require('./geminiService');
const sessionManager = require('./sessionManager');
const intentRouter = require('./intentRouter');
const logger = require('./logger');

// Get the verify token from environment variables
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

/**
 * Setup webhook routes for WhatsApp
 * @param {Express} app - Express application
 */
function setupWebhook(app) {
  // Webhook verification endpoint
  app.get('/webhook', (req, res) => {
    logger.info('Webhook verification request received');
    
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    logger.debug('Webhook verification details', { mode, token, expectedToken: VERIFY_TOKEN });

    // Check if mode and token are correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      logger.info('Webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      logger.warn('Webhook verification failed', { mode, tokenMatches: token === VERIFY_TOKEN });
      res.sendStatus(403);
    }
  });

  // Webhook for receiving messages
  app.post('/webhook', async (req, res) => {
    try {
      logger.debug('Received webhook payload');
      
      // Always respond with 200 OK immediately to acknowledge receipt
      res.status(200).send('EVENT_RECEIVED');
      
      // Process the incoming message
      const messageData = whatsappService.processIncomingMessage(req.body);
      if (!messageData) {
        logger.debug('No valid message found in payload');
        return;
      }

      logger.info(`Message received from ${messageData.from}: ${messageData.text}`);
      
      // Send typing indicator
      await whatsappService.sendTypingIndicator(messageData.from);
      
      // Get or create a session for this user
      const session = sessionManager.getSession(messageData.from);
      
      // Check if this is the first message
      const isFirstTime = session.chatHistory.length === 0;
      
      if (isFirstTime) {
        // Send welcome message for first interaction
        const welcomeMessage = `🤖 Welcome to DURMUSBABA.DE! I'm your AI assistant.

📋 **AVAILABLE COMMANDS:**
• Type 'cold room' or 'soğuk oda' for cold storage capacity calculations
• Type 'equipment' for HVAC equipment recommendations  
• Type 'help' for assistance
• Type 'restart' to start over
• Type 'stop' or 'dur' to exit

❓ **I CAN HELP YOU WITH:**
• Cold room/storage capacity calculations
• HVAC equipment sizing and recommendations
• Technical specifications and requirements
• Energy efficiency consultations

💡 **Quick Start:** Just describe what you need help with, and I'll guide you through the process!

How can I assist you today?`;
        await whatsappService.sendMessage(messageData.from, welcomeMessage);
        
        // Update session with the welcome message
        sessionManager.updateSession(session, messageData.text, welcomeMessage);
        logger.info(`Sent welcome message to ${messageData.from}`);
        return;
      }
      
      try {
        // Process message using intent router
        logger.debug('Processing message with intent router');
        const response = await intentRouter.handleMessage(session, messageData.text);
        
        // Send the response back via WhatsApp
        await whatsappService.sendMessage(messageData.from, response);
        
        // Update session with the new messages
        sessionManager.updateSession(session, messageData.text, response);
        logger.info(`Sent response to ${messageData.from}`);
        
      } catch (aiError) {
        logger.error('Error generating AI response:', aiError);
        
        // Send a fallback message if AI fails
        const fallbackMessage = "I'm sorry, I couldn't process that request. Could you try asking something else?";
        await whatsappService.sendMessage(messageData.from, fallbackMessage);
        
        // Update session with the fallback message
        sessionManager.updateSession(session, messageData.text, fallbackMessage);
      }
      
    } catch (error) {
      logger.error('Error processing webhook:', error);
    }
  });
}

module.exports = { setupWebhook }; 