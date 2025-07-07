require('dotenv').config();
const axios = require('axios');
const logger = require('./logger');

// WhatsApp Business API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Process incoming WhatsApp message from webhook
 * @param {Object} payload - Webhook payload
 * @returns {Object|null} - Extracted message data or null if invalid
 */
function processIncomingMessage(payload) {
  try {
    // Check if this is a WhatsApp message notification
    if (!payload.object || !payload.entry || !payload.entry.length) {
      return null;
    }

    const entry = payload.entry[0];
    
    // Check for WhatsApp Business Account messages
    if (!entry.changes || !entry.changes.length) {
      return null;
    }
    
    const change = entry.changes[0];
    
    // Verify this is a WhatsApp message
    if (change.field !== 'messages' || !change.value || !change.value.messages || !change.value.messages.length) {
      return null;
    }
    
    const message = change.value.messages[0];
    
    // Currently we only support text messages
    if (message.type !== 'text' || !message.text || !message.text.body) {
      logger.info(`Received non-text message of type: ${message.type}`);
      return null;
    }
    
    // Extract the sender's WhatsApp ID and message text
    return {
      from: message.from,
      text: message.text.body,
      timestamp: message.timestamp,
      messageId: message.id
    };
    
  } catch (error) {
    logger.error('Error processing incoming message:', error);
    return null;
  }
}

/**
 * Send a message to a WhatsApp user
 * @param {string} to - Recipient's WhatsApp ID
 * @param {string} text - Message text
 * @returns {Promise} - API response
 */
async function sendMessage(to, text) {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { 
        preview_url: false,
        body: text
      }
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    };
    
    const response = await axios.post(url, data, config);
    logger.debug('Message sent successfully');
    return response.data;
    
  } catch (error) {
    logger.error('Error sending WhatsApp message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a typing indicator to a WhatsApp user
 * @param {string} to - Recipient's WhatsApp ID
 * @returns {Promise} - API response
 */
async function sendTypingIndicator(to) {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'reaction',
      reaction: {
        message_id: 'placeholder',
        emoji: '⏱️'
      }
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    };
    
    // We don't need to wait for this to complete
    axios.post(url, data, config)
      .catch(error => logger.error('Error sending typing indicator:', error.message));
    
    return true;
    
  } catch (error) {
    logger.error('Error sending typing indicator:', error.message);
    return false;
  }
}

/**
 * Send a template message to a WhatsApp user
 * @param {string} to - Recipient's WhatsApp ID
 * @param {string} templateName - Name of the template
 * @param {string} language - Language code (default: en_US)
 * @param {Array} components - Template components
 * @returns {Promise} - API response
 */
async function sendTemplateMessage(to, templateName, language = 'en_US', components = []) {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: language
        },
        components: components
      }
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    };
    
    const response = await axios.post(url, data, config);
    logger.debug('Template message sent successfully');
    return response.data;
    
  } catch (error) {
    logger.error('Error sending template message:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Send a media message (image, document, etc.) to a WhatsApp user
 * @param {string} to - Recipient's WhatsApp ID
 * @param {string} mediaType - Type of media (image, document, audio, video)
 * @param {string} mediaUrl - URL of the media
 * @param {string} caption - Optional caption
 * @returns {Promise} - API response
 */
async function sendMediaMessage(to, mediaType, mediaUrl, caption = '') {
  try {
    const url = `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`;
    
    const data = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: mediaType,
      [mediaType]: {
        link: mediaUrl,
        caption: caption
      }
    };
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ACCESS_TOKEN}`
      }
    };
    
    const response = await axios.post(url, data, config);
    logger.debug('Media message sent successfully');
    return response.data;
    
  } catch (error) {
    logger.error('Error sending media message:', error.response?.data || error.message);
    throw error;
  }
}

module.exports = {
  processIncomingMessage,
  sendMessage,
  sendTypingIndicator,
  sendTemplateMessage,
  sendMediaMessage
}; 