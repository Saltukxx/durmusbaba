const geminiService = require('./geminiService');
const logger = require('./logger');

// Supported languages with their codes
const SUPPORTED_LANGUAGES = {
  'english': 'en',
  'german': 'de',
  'turkish': 'tr',
  'french': 'fr',
  'spanish': 'es',
  'italian': 'it',
  'arabic': 'ar',
  'russian': 'ru'
};

/**
 * Detect the language of a message
 * @param {string} message - User message
 * @returns {Promise<string>} - Detected language code
 */
async function detectLanguage(message) {
  try {
    // Create a simple prompt for Gemini to detect language
    const prompt = `Detect the language of the following text and respond with only the language code (e.g., 'en', 'de', 'tr', etc.):
    
Text: "${message}"
    
Language code:`;
    
    // Create a minimal session for the API call
    const tempSession = { chatHistory: [] };
    
    // Get language detection from Gemini
    const response = await geminiService.generateResponse(tempSession, prompt);
    
    // Extract the language code from the response
    const languageCode = response.trim().toLowerCase();
    
    logger.debug(`Detected language: ${languageCode}`);
    
    // Validate the language code
    if (Object.values(SUPPORTED_LANGUAGES).includes(languageCode)) {
      return languageCode;
    }
    
    // Default to English if detection failed
    return 'en';
    
  } catch (error) {
    logger.error('Error detecting language:', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Generate a response in the user's language
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response in the detected language
 */
async function generateMultilingualResponse(session, message) {
  try {
    // Detect the language of the message
    const languageCode = await detectLanguage(message);
    
    // If the language is English, use the standard response generation
    if (languageCode === 'en') {
      return await geminiService.generateResponse(session, message);
    }
    
    // Generate response in the detected language
    return await geminiService.generateMultilingualResponse(session, message, languageCode);
    
  } catch (error) {
    logger.error('Error generating multilingual response:', error);
    return await geminiService.generateResponse(session, message); // Fallback to English
  }
}

/**
 * Check if a message is requesting a language change
 * @param {string} message - User message
 * @returns {string|null} - Language code if requested, null otherwise
 */
function checkLanguageChangeRequest(message) {
  const lowerMessage = message.toLowerCase();
  
  // Check for explicit language change requests
  if (lowerMessage.includes('speak in') || lowerMessage.includes('switch to') || lowerMessage.includes('change language to')) {
    for (const [language, code] of Object.entries(SUPPORTED_LANGUAGES)) {
      if (lowerMessage.includes(language.toLowerCase())) {
        return code;
      }
    }
  }
  
  return null;
}

/**
 * Set the preferred language for a user session
 * @param {Object} session - User session
 * @param {string} languageCode - Language code
 */
function setPreferredLanguage(session, languageCode) {
  if (!session.preferences) {
    session.preferences = {};
  }
  
  session.preferences.language = languageCode;
  logger.debug(`Set preferred language for user ${session.userId} to ${languageCode}`);
}

/**
 * Get the preferred language for a user session
 * @param {Object} session - User session
 * @returns {string} - Preferred language code (defaults to 'en')
 */
function getPreferredLanguage(session) {
  if (session.preferences && session.preferences.language) {
    return session.preferences.language;
  }
  
  return 'en'; // Default to English
}

module.exports = {
  detectLanguage,
  generateMultilingualResponse,
  checkLanguageChangeRequest,
  setPreferredLanguage,
  getPreferredLanguage,
  SUPPORTED_LANGUAGES
}; 