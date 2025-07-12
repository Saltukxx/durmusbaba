const geminiService = require('./geminiService');
const woocommerceService = require('./woocommerceService');
const languageProcessor = require('./languageProcessor');
const coldRoomCalculator = require('./coldRoomCalculator');
const coldStorageService = require('./coldStorageService');
// const coldStorageFlow = require('./coldStorageFlow'); // Disabled - using coldStorageService as primary
const equipmentRecommendationService = require('./equipmentRecommendationService');
const equipmentRecommendationFlow = require('./equipmentRecommendationFlow');
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
    
    // Cold storage calculation intent - CHECK THIS FIRST - Always use step-by-step flow
    // Enhanced multi-language detection for cold room calculation requests
    // PRIORITY: Simple trigger phrases for easy initialization
    const coldRoomKeywords = {
      en: ['cold room', 'cold storage', 'refrigeration', 'cooling capacity', 'cold calculation', 
           'freezer room', 'chiller', 'cooling room', 'refrigerated storage', 'cold chamber',
           'calculate cold', 'cold requirements', 'cooling load', 'refrigeration capacity'],
      tr: ['soguk oda', 'soğuk oda', 'soğuk hava', 'soğutma kapasitesi', 'soğuk hesap', 'dondurucu oda',
           'soğutucu', 'soğuk depo', 'soğuk alan', 'soğutma yükü', 'soğutma hesabı',
           'soğuk oda hesapla', 'soğuk gereksinimleri', 'soğutma ihtiyacı'],
      de: ['kühlraum', 'kältekammer', 'kühlhaus', 'kühllager', 'kühlung', 'kühlkapazität',
           'kälteanlage', 'tiefkühlraum', 'kühlzelle', 'kühlraum berechnen',
           'kühllast', 'kühlleistung', 'kältebedarf', 'kühlraum auslegung']
    };
    
    const hasKeyword = Object.values(coldRoomKeywords).flat().some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (hasKeyword) {
      return { type: 'cold_storage_calculation', confidence: 0.95 };
    }
    
    // Check for cancel/stop request - Enhanced multi-language support
    const stopKeywords = {
      en: ['cancel', 'stop', 'quit', 'exit', 'abort', 'end'],
      tr: ['iptal', 'dur', 'durdur', 'bitir', 'çık', 'son'],
      de: ['stopp', 'stop', 'abbrechen', 'beenden', 'quit', 'aufhören']
    };
    
    const hasStopKeyword = Object.values(stopKeywords).flat().some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (hasStopKeyword) {
      return { type: 'cancel_session', confidence: 0.95 };
    }
    
    // Equipment recommendation intent - CHECK BEFORE general product search
    const equipmentKeywords = {
      en: ['recommend equipment', 'suggest equipment', 'equipment recommendation', 'what equipment', 
           'which equipment', 'equipment needed', 'equipment for', 'cooling equipment', 'refrigeration equipment',
           'complete system', 'equipment selection', 'best equipment', 'suitable equipment'],
      tr: ['ekipman öner', 'ekipman tavsiye', 'hangi ekipman', 'ekipman seç', 'soğutma ekipmanı',
           'ekipman önerisi', 'uygun ekipman', 'en iyi ekipman', 'komple sistem', 'ekipman ihtiyacı'],
      de: ['geräte empfehlen', 'ausrüstung empfehlen', 'welche geräte', 'geräte auswahl', 
           'kühlgeräte', 'passende geräte', 'beste geräte', 'komplettes system', 'geräte bedarf']
    };
    
    const hasEquipmentKeyword = Object.values(equipmentKeywords).flat().some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    if (hasEquipmentKeyword) {
      return { type: 'equipment_recommendation', confidence: 0.9 };
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
    // PRIORITY 1: Check if there's an active cold storage session FIRST
    if (session.coldStorage && session.coldStorage.active) {
      // Use the service that has edit commands functionality
      return coldStorageService.handleColdStorageRequest(session, message);
    }

    // PRIORITY 2: Check if there's an active equipment recommendation flow
    if (equipmentRecommendationFlow.hasActiveFlow(session.userId)) {
      // Check for cancel/stop request first - Enhanced multi-language support  
      const lowerMessage = message.toLowerCase();
      const stopKeywords = ['cancel', 'stop', 'quit', 'exit', 'abort', 'end', 'iptal', 'dur', 'durdur', 'bitir', 'çık', 'son', 'stopp', 'abbrechen', 'beenden', 'aufhören'];
      
      const hasStopKeyword = stopKeywords.some(keyword => lowerMessage.includes(keyword));
      
      if (hasStopKeyword) {
        return handleCancelSession(session, message);
      }
      // Otherwise, process as answer to current question
      return equipmentRecommendationFlow.processAnswer(session, message);
    }
    
    // PRIORITY 3: Detect intent only if no active flow
    const intent = await detectIntent(message);
    logger.debug(`Detected intent: ${intent.type} (confidence: ${intent.confidence})`);
    
    // Handle based on intent type
    switch (intent.type) {
      case 'equipment_recommendation':
        return await handleEquipmentRecommendation(session, message);
        
      case 'product_search':
        return await handleProductSearch(session, message);
        
      case 'order_status':
        return await handleOrderStatus(session, message);
        
      case 'greeting':
        return handleGreeting(session);
        
      case 'language_change':
        return handleLanguageChange(session, intent.languageCode);
        
      case 'cold_storage_calculation':
      case 'cold_room_calculation':
        // Use the primary cold storage service for both cases
        return coldStorageService.handleColdStorageRequest(session, message);
        
      case 'cancel_session':
        return handleCancelSession(session, message);
        
      case 'customer_support':
      case 'general_query':
      default:
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

/*
// DISABLED: This function used the old coldStorageFlow system
// Now using only coldStorageService for consistency
//
// * Handle cold storage calculation intent (new step-by-step version)
// * @param {Object} session - User session
// * @param {string} message - User message
// * @returns {Promise<string>} - Response with calculation results
//
async function handleColdStorageCalculation(session, message) {
  // Function disabled - all cold storage routing now goes through coldStorageService
}
*/

/**
 * Handle cancel session intent
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {string} - Response confirming cancellation
 */
function handleCancelSession(session, message) {
  const language = detectLanguage(message);
  
  // Check if there's an active cold storage session to cancel
  if (session.coldStorage && session.coldStorage.active) {
    return coldStorageService.cancelColdStorageSession(session);
  }
  
  // Check if there's an active equipment recommendation flow to cancel
  if (equipmentRecommendationFlow.hasActiveFlow(session.userId)) {
    equipmentRecommendationFlow.cancelFlow(session.userId);
    const messages = {
      en: "✅ Equipment recommendation cancelled. How can I help you?",
      tr: "✅ Ekipman önerisi iptal edildi. Size nasıl yardımcı olabilirim?",
      de: "✅ Geräteempfehlung abgebrochen. Wie kann ich Ihnen helfen?"
    };
    return messages[language] || messages.en;
  }
  
  // If no active session to cancel
  const messages = {
    en: "There's no active session to cancel. How can I help you?",
    tr: "İptal edilecek aktif oturum yok. Size nasıl yardımcı olabilirim?",
    de: "Es gibt keine aktive Sitzung zum Abbrechen. Wie kann ich Ihnen helfen?"
  };
  
  return messages[language] || messages.en;
}

/**
 * Detect language from message
 * @param {string} message - User message
 * @returns {string} - Language code
 */
function detectLanguage(message) {
  const lowerMessage = message.toLowerCase();
  
  // Enhanced Turkish detection
  const turkishKeywords = ['soğuk', 'oda', 'sıcaklık', 'hesapla', 'evet', 'hayır', 'iptal', 'dur',
                          'soğutma', 'kapasitesi', 'hava', 'dondurucu', 'soğutucu', 'depo',
                          'yalıtım', 'zemin', 'uzunluk', 'genişlik', 'yükseklik', 'günde',
                          'nadir', 'sık', 'yükleme', 'boşaltma', 'ürün', 'meyve', 'sebze',
                          'et', 'süt', 'giriş', 'paneelleri', 'kalınlığı', 'metre'];
  
  // Enhanced German detection  
  const germanKeywords = ['kühlraum', 'temperatur', 'berechnen', 'berechnung', 'kühlung',
                         'isolierung', 'häufig', 'selten', 'ja', 'nein', 'abbrechen',
                         'meter', 'produkte', 'fleisch', 'obst', 'gemüse', 'kältekammer',
                         'kühlhaus', 'kühllager', 'kälteanlage', 'tiefkühlraum', 'kühlzelle',
                         'kühllast', 'kühlleistung', 'kältebedarf', 'bodenisolierung',
                         'türöffnung', 'beladung', 'entladung', 'einlagern', 'milchprodukte'];
  
  // Enhanced English detection
  const englishKeywords = ['cold', 'room', 'temperature', 'calculate', 'yes', 'no', 'cancel',
                          'stop', 'storage', 'capacity', 'refrigeration', 'freezer', 'chiller',
                          'insulation', 'floor', 'length', 'width', 'height', 'daily',
                          'rarely', 'frequently', 'loading', 'unloading', 'product', 'fruits',
                          'vegetables', 'meat', 'dairy', 'entry', 'panels', 'thickness', 'meters'];
  
  // Count keyword matches for each language
  const turkishMatches = turkishKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  const germanMatches = germanKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  const englishMatches = englishKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  
  // Return language with most matches
  if (turkishMatches > germanMatches && turkishMatches > englishMatches) {
    return 'tr';
  } else if (germanMatches > englishMatches && germanMatches > turkishMatches) {
    return 'de';
  }
  
  // Default to English
  return 'en';
}

/**
 * Handle equipment recommendation intent - NEW GUIDED FLOW
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response with guided questions or equipment recommendations
 */
async function handleEquipmentRecommendation(session, message) {
  try {
    // Detect language
    const language = detectLanguage(message);
    
    // Check if we have a previous cold storage calculation to use as initial data
    let initialData = null;
    if (session.lastColdStorageResult) {
      initialData = session.lastColdStorageResult;
    }
    
    // Start the guided equipment recommendation flow
    const response = equipmentRecommendationFlow.initializeFlow(session.userId, language, initialData);
    
    logger.info(`Started guided equipment recommendation for user ${session.userId} in ${language}`);
    return response;
    
  } catch (error) {
    logger.error('Error starting equipment recommendation flow:', error);
    
    const errorMessages = {
      en: "❌ I encountered an error while starting the equipment recommendation. Please try again or contact our support team.",
      tr: "❌ Ekipman önerisi başlatılırken bir hata oluştu. Lütfen tekrar deneyin veya destek ekibimizle iletişime geçin.", 
      de: "❌ Beim Starten der Geräteempfehlung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie unser Support-Team."
    };
    
    const language = detectLanguage(message);
    return errorMessages[language] || errorMessages.en;
  }
}


module.exports = {
  handleMessage,
  detectIntent
}; 