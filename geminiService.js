require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('./logger');

// Get API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize Gemini AI with the model
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const MODEL_NAME = 'gemini-1.5-flash'; // Using the latest model

/**
 * Generate a response using Gemini AI
 * @param {Object} session - User session with chat history
 * @param {string} userMessage - Latest message from user
 * @returns {Promise<string>} - AI generated response
 */
async function generateResponse(session, userMessage) {
  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Create a prompt with context from chat history
    let contextPrompt = `You are a helpful AI assistant for DURMUSBABA.DE, a German e-commerce business. 
Be friendly, helpful, and concise in your responses. Keep your answers relatively short but informative.
If asked about products, provide helpful information but encourage the customer to visit the website for the most up-to-date details.
Always maintain a professional and friendly tone. If you don't know something, be honest about it.

`;
    
    // Add recent conversation history for context
    if (session.chatHistory.length > 0) {
      contextPrompt += "Recent conversation:\n";
      const recentHistory = session.chatHistory.slice(-6); // Last 3 exchanges
      for (const msg of recentHistory) {
        contextPrompt += `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}\n`;
      }
      contextPrompt += "\nNow respond to the customer's latest message:\n";
    }
    
    contextPrompt += userMessage;
    
    logger.debug('Sending prompt to Gemini AI');
    
    // Get AI response
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    let aiReply = response.text();
    
    // Clean up the response if needed
    if (aiReply.startsWith("Assistant:")) {
      aiReply = aiReply.substring("Assistant:".length).trim();
    }
    
    logger.debug('Received AI response');
    
    return aiReply;
    
  } catch (error) {
    logger.error('Error generating AI response:', error);
    throw error;
  }
}

/**
 * Generate a multilingual response
 * @param {Object} session - User session with chat history
 * @param {string} userMessage - Latest message from user
 * @param {string} language - Target language code
 * @returns {Promise<string>} - AI generated response in specified language
 */
async function generateMultilingualResponse(session, userMessage, language = 'en') {
  try {
    // Initialize the model
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    
    // Create a prompt with language instruction
    let contextPrompt = `You are a helpful AI assistant for DURMUSBABA.DE, a German e-commerce business.
Please respond in ${language} language.
Be friendly, helpful, and concise in your responses.

`;
    
    // Add recent conversation history for context
    if (session.chatHistory.length > 0) {
      contextPrompt += "Recent conversation:\n";
      const recentHistory = session.chatHistory.slice(-6); // Last 3 exchanges
      for (const msg of recentHistory) {
        contextPrompt += `${msg.role === 'user' ? 'Customer' : 'Assistant'}: ${msg.content}\n`;
      }
      contextPrompt += "\nNow respond to the customer's latest message:\n";
    }
    
    contextPrompt += userMessage;
    
    logger.debug(`Sending prompt to Gemini AI for ${language} response`);
    
    // Get AI response
    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    let aiReply = response.text();
    
    // Clean up the response if needed
    if (aiReply.startsWith("Assistant:")) {
      aiReply = aiReply.substring("Assistant:".length).trim();
    }
    
    logger.debug('Received multilingual AI response');
    
    return aiReply;
    
  } catch (error) {
    logger.error('Error generating multilingual AI response:', error);
    throw error;
  }
}

module.exports = {
  generateResponse,
  generateMultilingualResponse
}; 