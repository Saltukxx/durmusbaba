const geminiService = require('./geminiService');
const woocommerceService = require('./woocommerceService');
const languageProcessor = require('./languageProcessor');
const coldRoomCalculator = require('./coldRoomCalculator');
const coldStorageService = require('./coldStorageService');
const logger = require('./logger');

/**
 * Detect the intent of a user message
 * @param {string} message - User message
 * @returns {Promise<Object>} - Detected intent
 */
async function detectIntent(message) {
  try {
    // Simple keyword-based intent detection
    const lowerMessage = message.toLowerCase();
    
    // Cold storage calculation intent - CHECK THIS FIRST
    if (coldStorageService.isColdStorageRequest(lowerMessage)) {
      return { type: 'cold_storage_calculation', confidence: 0.9 };
    }
    
    // Check for cancel request
    if (coldStorageService.isCancelRequest(lowerMessage)) {
      return { type: 'cancel_session', confidence: 0.95 };
    }
    
    // Product search intent
    if (
      lowerMessage.includes('product') || 
      lowerMessage.includes('buy') || 
      lowerMessage.includes('purchase') || 
      lowerMessage.includes('order') ||
      lowerMessage.includes('shop') ||
      lowerMessage.includes('price')
    ) {
      return { type: 'product_search', confidence: 0.8 };
    }
    
    // Support intent
    if (
      lowerMessage.includes('help') || 
      lowerMessage.includes('support') || 
      lowerMessage.includes('issue') || 
      lowerMessage.includes('problem') ||
      lowerMessage.includes('question')
    ) {
      return { type: 'customer_support', confidence: 0.7 };
    }
    
    // Order status intent
    if (
      lowerMessage.includes('order status') || 
      lowerMessage.includes('my order') || 
      lowerMessage.includes('track') || 
      lowerMessage.includes('shipping') ||
      lowerMessage.includes('delivery')
    ) {
      return { type: 'order_status', confidence: 0.9 };
    }
    
    // Greeting intent
    if (
      lowerMessage.includes('hello') || 
      lowerMessage.includes('hi') || 
      lowerMessage.includes('hey') || 
      lowerMessage.includes('greetings') ||
      lowerMessage === 'hi' ||
      lowerMessage === 'hello'
    ) {
      return { type: 'greeting', confidence: 0.9 };
    }
    
    // Language change intent
    const languageCode = languageProcessor.checkLanguageChangeRequest(message);
    if (languageCode) {
      return { type: 'language_change', confidence: 0.95, languageCode };
    }
    
    // Default to general query
    return { type: 'general_query', confidence: 0.5 };
    
  } catch (error) {
    logger.error('Error detecting intent:', error);
    return { type: 'general_query', confidence: 0.3 };
  }
}

/**
 * Extract product search keywords from a message
 * @param {string} message - User message
 * @returns {string} - Extracted keywords
 */
function extractProductKeywords(message) {
  // Remove common words that might precede product names
  const cleanMessage = message
    .toLowerCase()
    .replace(/i want to buy|show me|looking for|do you have|i need|search for|find me|product|price of/g, '')
    .trim();
  
  return cleanMessage;
}

/**
 * Handle a user message based on detected intent
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response to user
 */
async function handleMessage(session, message) {
  try {
    // Detect the user's intent
    const intent = await detectIntent(message);
    logger.debug(`Detected intent: ${intent.type} (confidence: ${intent.confidence})`);
    
    // Handle based on intent type
    switch (intent.type) {
      case 'product_search':
        return await handleProductSearch(session, message);
        
      case 'order_status':
        return await handleOrderStatus(session, message);
        
      case 'greeting':
        return handleGreeting(session);
        
      case 'language_change':
        return handleLanguageChange(session, intent.languageCode);
        
      case 'cold_storage_calculation':
        return await handleColdStorageCalculation(session, message);
        
      case 'cancel_session':
        return handleCancelSession(session, message);
        
      case 'cold_room_calculation':
        return await handleColdRoomCalculation(session, message);
        
      case 'customer_support':
      case 'general_query':
      default:
        // Check if there's an active cold storage session
        if (session.coldStorage && session.coldStorage.active) {
          return await handleColdStorageCalculation(session, message);
        }
        // For general queries, use multilingual response
        return await languageProcessor.generateMultilingualResponse(session, message);
    }
    
  } catch (error) {
    logger.error('Error handling message:', error);
    return "I'm sorry, I'm having trouble processing your request right now. Could you try again later?";
  }
}

/**
 * Handle product search intent
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response with product information
 */
async function handleProductSearch(session, message) {
  try {
    // Extract keywords from the message
    const keywords = extractProductKeywords(message);
    
    // Check if WooCommerce is configured
    if (!process.env.WOOCOMMERCE_URL || !process.env.WOOCOMMERCE_CONSUMER_KEY) {
      // If WooCommerce is not configured, use Gemini AI
      return await languageProcessor.generateMultilingualResponse(session, message);
    }
    
    // Search for products
    const products = await woocommerceService.searchProducts(keywords);
    
    if (products.length === 0) {
      return `I couldn't find any products matching "${keywords}". Would you like to try a different search term or browse our categories?`;
    }
    
    // Format response with product information
    let response = `I found ${products.length} products matching "${keywords}":\n\n`;
    
    // Add the first 3 products (or fewer if less than 3 are found)
    const displayProducts = products.slice(0, 3);
    
    for (const product of displayProducts) {
      const formattedProduct = woocommerceService.formatProductInfo(product);
      response += formattedProduct + "\n\n";
    }
    
    // Add a note if there are more products
    if (products.length > 3) {
      response += `There are ${products.length - 3} more products available. Visit our website to see all results.`;
    }
    
    return response;
    
  } catch (error) {
    logger.error('Error handling product search:', error);
    return "I'm sorry, I couldn't search for products at the moment. Would you like me to help you with something else?";
  }
}

/**
 * Handle order status intent
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response about order status
 */
async function handleOrderStatus(session, message) {
  // In a real implementation, this would extract order numbers and check WooCommerce
  // For now, we'll use multilingual response
  return await languageProcessor.generateMultilingualResponse(session, message);
}

/**
 * Handle greeting intent
 * @param {Object} session - User session
 * @returns {string} - Greeting response
 */
function handleGreeting(session) {
  const greetings = [
    "Hello! How can I help you with DURMUSBABA.DE today?",
    "Hi there! I'm the DURMUSBABA.DE assistant. What can I help you with?",
    "Welcome to DURMUSBABA.DE! How may I assist you today?",
    "Greetings! How can I make your DURMUSBABA.DE experience better today?"
  ];
  
  // Select a random greeting
  const randomIndex = Math.floor(Math.random() * greetings.length);
  return greetings[randomIndex];
}

/**
 * Handle language change intent
 * @param {Object} session - User session
 * @param {string} languageCode - Language code to change to
 * @returns {string} - Response confirming language change
 */
function handleLanguageChange(session, languageCode) {
  // Set the preferred language in the session
  languageProcessor.setPreferredLanguage(session, languageCode);
  
  // Prepare response based on language
  const responses = {
    'en': "I've switched to English. How can I help you?",
    'de': "Ich habe auf Deutsch umgestellt. Wie kann ich Ihnen helfen?",
    'tr': "Türkçe'ye geçtim. Size nasıl yardımcı olabilirim?",
    'fr': "Je suis passé au français. Comment puis-je vous aider?",
    'es': "He cambiado al español. ¿Cómo puedo ayudarte?",
    'it': "Sono passato all'italiano. Come posso aiutarti?",
    'ar': "لقد انتقلت إلى اللغة العربية. كيف يمكنني مساعدتك؟",
    'ru': "Я перешел на русский язык. Как я могу вам помочь?"
  };
  
  return responses[languageCode] || responses['en'];
}

/**
 * Handle cold storage calculation intent (new step-by-step version)
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response with calculation results
 */
async function handleColdStorageCalculation(session, message) {
  try {
    return coldStorageService.handleColdStorageRequest(session, message);
  } catch (error) {
    logger.error('Error in cold storage calculation:', error);
    return "I'm sorry, I encountered an error with the cold storage calculation. Please try again.";
  }
}

/**
 * Handle cancel session intent
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {string} - Response confirming cancellation
 */
function handleCancelSession(session, message) {
  const result = coldStorageService.cancelColdStorageSession(session);
  if (result) {
    return result;
  }
  
  // If no active session to cancel
  const language = coldStorageService.detectLanguage(message);
  const messages = {
    en: "There's no active session to cancel. How can I help you?",
    tr: "İptal edilecek aktif oturum yok. Size nasıl yardımcı olabilirim?",
    de: "Es gibt keine aktive Sitzung zum Abbrechen. Wie kann ich Ihnen helfen?"
  };
  
  return messages[language] || messages.en;
}

/**
 * Handle cold room capacity calculation intent (legacy version)
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response with calculation results
 */
async function handleColdRoomCalculation(session, message) {
  try {
    // Extract parameters from the message
    const extractedParams = coldRoomCalculator.extractParameters(message);
    
    // Get user's preferred language
    const language = session.preferredLanguage || 'en';
    
    // If no parameters extracted, ask for them
    if (Object.keys(extractedParams).length === 0) {
      const prompts = {
        en: `❄️ I can help you calculate cold room capacity! Please provide the following information:

• Room volume (in m³)
• Room temperature (in °C)
• Ambient temperature (in °C)
• Climate zone (hot/cool)
• Safety factor (0%, 10%, 20%, 30%)

Example: "Calculate for 330m³ room at -20°C with 35°C ambient temperature"`,
        tr: `❄️ Soğuk oda kapasitesi hesaplamanıza yardımcı olabilirim! Lütfen aşağıdaki bilgileri verin:

• Oda hacmi (m³ cinsinden)
• Oda sıcaklığı (°C cinsinden)
• Dış ortam sıcaklığı (°C cinsinden)
• İklim bölgesi (sıcak/serin)
• Güvenlik faktörü (%0, %10, %20, %30)

Örnek: "330m³ oda için -20°C sıcaklıkta 35°C dış ortam sıcaklığında hesapla"`,
        de: `❄️ Ich kann Ihnen bei der Berechnung der Kühlraumkapazität helfen! Bitte geben Sie folgende Informationen an:

• Raumvolumen (in m³)
• Raumtemperatur (in °C)
• Umgebungstemperatur (in °C)
• Klimazone (heiß/kühl)
• Sicherheitsfaktor (0%, 10%, 20%, 30%)

Beispiel: "Berechnen für 330m³ Raum bei -20°C mit 35°C Umgebungstemperatur"`
      };
      
      return prompts[language] || prompts.en;
    }
    
    // Set default values for missing parameters
    const params = {
      volume: extractedParams.volume || 330,
      temperature: extractedParams.temperature || -20,
      ambientTemp: extractedParams.ambientTemp || 35,
      climateZone: extractedParams.climateZone || 'cool',
      safetyFactor: extractedParams.safetyFactor || 1.2
    };
    
    // Calculate capacity
    const result = coldRoomCalculator.calculateCapacity(params);
    
    // Generate comparison table
    const comparison = coldRoomCalculator.generateComparison(params);
    
    // Format response
    let response = coldRoomCalculator.formatResult(result, language);
    
    // Add comparison table if requested or if it's a simple calculation
    if (message.toLowerCase().includes('comparison') || 
        message.toLowerCase().includes('karşılaştırma') || 
        message.toLowerCase().includes('vergleich') ||
        Object.keys(extractedParams).length >= 3) {
      response += '\n\n' + coldRoomCalculator.formatComparison(comparison, language);
    }
    
    // Add helpful tips
    const tips = {
      en: `\n\n💡 *Tips:*
• Supported temperatures: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C
• Ambient temperature range: 25°C to 50°C
• For critical applications, use 30% safety factor
• Hot climate zones require 10% additional capacity`,
      tr: `\n\n💡 *İpuçları:*
• Desteklenen sıcaklıklar: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C
• Dış ortam sıcaklığı aralığı: 25°C ile 50°C arası
• Kritik uygulamalar için %30 güvenlik faktörü kullanın
• Sıcak iklim bölgeleri %10 ek kapasite gerektirir`,
      de: `\n\n💡 *Tipps:*
• Unterstützte Temperaturen: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C
• Umgebungstemperaturbereich: 25°C bis 50°C
• Für kritische Anwendungen 30% Sicherheitsfaktor verwenden
• Heiße Klimazonen benötigen 10% zusätzliche Kapazität`
    };
    
    response += tips[language] || tips.en;
    
    return response;
    
  } catch (error) {
    logger.error('Error in cold room calculation:', error);
    
    const errorMessages = {
      en: `❌ Calculation error: ${error.message}\n\nPlease check your parameters and try again.`,
      tr: `❌ Hesaplama hatası: ${error.message}\n\nLütfen parametrelerinizi kontrol edin ve tekrar deneyin.`,
      de: `❌ Berechnungsfehler: ${error.message}\n\nBitte überprüfen Sie Ihre Parameter und versuchen Sie es erneut.`
    };
    
    const language = session.preferredLanguage || 'en';
    return errorMessages[language] || errorMessages.en;
  }
}

module.exports = {
  handleMessage,
  detectIntent
}; 