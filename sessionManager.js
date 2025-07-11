const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// Simple in-memory session store
const sessions = {};

// Session timeout (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

// Ensure the conversation logs directory exists
const logsDir = path.join(__dirname, 'conversation_logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

/**
 * Log conversation to file
 * @param {string} userId - User ID
 * @param {string} message - Message content
 * @param {boolean} isUser - Whether message is from user or bot
 */
function logConversation(userId, message, isUser = true) {
  try {
    const logFile = path.join(logsDir, `${userId}.log`);
    const timestamp = new Date().toISOString();
    const entry = `[${timestamp}] ${isUser ? 'USER' : 'BOT'}: ${message}\n`;
    
    fs.appendFileSync(logFile, entry);
  } catch (error) {
    logger.error(`Error logging conversation: ${error.message}`);
  }
}

/**
 * Get or create a session for a user
 * @param {string} userId - User ID
 * @returns {Object} - User session
 */
function getSession(userId) {
  if (!sessions[userId]) {
    sessions[userId] = {
      userId,
      chatHistory: [],
      lastActivity: Date.now()
    };
    logger.debug(`Created new session for user ${userId}`);
  } else {
    sessions[userId].lastActivity = Date.now();
  }
  
  return sessions[userId];
}

/**
 * Update session with new messages
 * @param {Object} session - User session
 * @param {string} userMessage - Message from user
 * @param {string} botResponse - Response from bot
 */
function updateSession(session, userMessage, botResponse) {
  // Add messages to chat history
  session.chatHistory.push({ role: 'user', content: userMessage });
  session.chatHistory.push({ role: 'bot', content: botResponse });
  
  // Keep only the last 10 exchanges (20 messages) for context
  if (session.chatHistory.length > 20) {
    session.chatHistory = session.chatHistory.slice(-20);
  }
  
  // Update last activity timestamp
  session.lastActivity = Date.now();
  
  // Log conversation
  logConversation(session.userId, userMessage, true);
  logConversation(session.userId, botResponse, false);
}

/**
 * Get count of active sessions
 * @returns {number} - Number of active sessions
 */
function getActiveSessionsCount() {
  return Object.keys(sessions).length;
}

/**
 * Get all active sessions (for admin purposes)
 * @returns {Object} - All active sessions
 */
function getActiveSessions() {
  // Return a sanitized copy of sessions
  const sanitizedSessions = {};
  
  Object.keys(sessions).forEach(userId => {
    sanitizedSessions[userId] = {
      userId: sessions[userId].userId,
      messageCount: sessions[userId].chatHistory.length,
      lastActivity: new Date(sessions[userId].lastActivity).toISOString()
    };
  });
  
  return sanitizedSessions;
}

/**
 * Clean up expired sessions
 */
function cleanupSessions() {
  const now = Date.now();
  let expiredCount = 0;
  
  Object.keys(sessions).forEach(userId => {
    if (now - sessions[userId].lastActivity > SESSION_TIMEOUT) {
      delete sessions[userId];
      expiredCount++;
    }
  });
  
  if (expiredCount > 0) {
    logger.info(`Cleaned up ${expiredCount} expired sessions`);
  }
}

// Run session cleanup every 15 minutes
setInterval(cleanupSessions, 15 * 60 * 1000);

module.exports = {
  getSession,
  updateSession,
  getActiveSessionsCount,
  getActiveSessions
}; 