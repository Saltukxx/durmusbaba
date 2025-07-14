const geminiService = require('./geminiService');
const woocommerceService = require('./woocommerceService');
const languageProcessor = require('./languageProcessor');
const equipmentRecommendationService = require('./equipmentRecommendationService');
const equipmentRecommendationFlow = require('./equipmentRecommendationFlow');
const coldRoomFlow = require('./coldRoomFlow');
const sessionManager = require('./sessionManager');
const errorHandler = require('./errorHandler');
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
    
    // Cold room/storage calculation intent detection - ENHANCED
    const coldRoomKeywords = [
      // English
      'cold room', 'cold storage', 'refrigeration', 'cooling capacity', 'freezer room',
      'chiller', 'cooling room', 'refrigerated storage', 'calculate cold', 'cooling load',
      'cold', 'freezer', 'refrigerator', 'cooling', 'temperature', 'capacity',
      // Dimension-related that often indicate cold room calculation
      'calculate for', 'room at', 'dimensions', 'volume', 'm³', 'm3', 'cubic',
      // Turkish
      'soğuk oda', 'soğuk depo', 'soğutma kapasitesi', 'dondurucu oda', 'soğutucu',
      'soğuk alan', 'soğutma yükü', 'soğuk hesap', 'soğuk', 'soğutma', 'kapasite',
      'hesapla', 'boyut', 'hacim',
      // German - ENHANCED with more conversational phrases
      'kühlraum', 'kältekammer', 'kühlhaus', 'kühllager', 'kühlkapazität',
      'kälteanlage', 'tiefkühlraum', 'kühlzelle', 'kälte', 'kühlung', 'kapazität',
      'berechnen', 'abmessungen', 'volumen', 'berechnung', 'kühlräume', 'kühlräumen',
      'kühlraum berechnung', 'kühlraum-berechnung', 'kühlraum berechnen',
      'kühlraum kapazität', 'kühlraum kapazität berechnen', 'kühlraum dimensionierung',
      'kühlraum planung', 'kühlraum auslegung', 'kühlraum projektierung'
    ];
    
    // Also check for dimension patterns that typically indicate cold room calculation
    const dimensionPattern = /\d+m?\s*[×x]\s*\d+m?\s*[×x]\s*\d+m?/i;
    const temperaturePattern = /-?\d+°?c/i;
    
    // Enhanced detection: Check for any cold room related keywords
    const hasColdRoomKeyword = coldRoomKeywords.some(keyword => lowerMessage.includes(keyword));
    
    // Enhanced detection: Check for German conversational phrases about cold room calculation
    const germanColdRoomPhrases = [
      'bei der berechnung für kühlräume', 'kühlraum berechnung', 'kühlraum kapazität',
      'kühlraum dimensionierung', 'kühlraum auslegung', 'kühlraum projektierung',
      'kühlraum planung', 'kühlraum berechnen', 'kühlraum kapazität berechnen',
      'kühlraum dimensionierung', 'kühlraum auslegung', 'kühlraum projektierung'
    ];
    
    const hasGermanColdRoomPhrase = germanColdRoomPhrases.some(phrase => 
      lowerMessage.includes(phrase)
    );
    
    // Enhanced detection: Check for dimension patterns or temperature patterns with room context
    const hasDimensionPattern = dimensionPattern.test(lowerMessage);
    const hasTemperatureWithRoom = temperaturePattern.test(lowerMessage) && 
      (lowerMessage.includes('room') || lowerMessage.includes('raum') || lowerMessage.includes('oda'));
    
    if (hasColdRoomKeyword || hasGermanColdRoomPhrase || hasDimensionPattern || hasTemperatureWithRoom) {
      return { type: 'cold_room_calculation', confidence: 0.95 };
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
    

    
    // SAFETY CHECK: If message contains cold room related keywords but reached general query,
    // redirect to cold room flow instead of using Gemini
    const lowerMsg = message.toLowerCase();
    if (lowerMsg.includes('kühlraum') || lowerMsg.includes('berechnung') || 
        lowerMsg.includes('cold room') || lowerMsg.includes('soğuk oda') ||
        lowerMsg.includes('kälte') || lowerMsg.includes('kühlung') ||
        lowerMsg.includes('kapazität') || lowerMsg.includes('kapasite')) {
      return { type: 'cold_room_calculation', confidence: 0.8 };
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
 * Handle a user message with consistent priority and flow management
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response to user
 */
async function handleMessage(session, message) {
  try {
    // CONSISTENCY FIX: Ensure session has proper structure
    if (!session.preferences) {
      session.preferences = { language: null };
    }

    // Auto-detect and persist language if not set
    if (!session.preferences.language) {
      const detectedLanguage = detectLanguage(message, session);
      sessionManager.setUserLanguage(session, detectedLanguage);
    }

    // PRIORITY 1: Handle active flows FIRST - prevents conflicts
    if (sessionManager.hasActiveFlow(session)) {
      return await handleActiveFlow(session, message);
    }

    // PRIORITY 2: Check for cancel/stop requests (global)
    if (isCancelRequest(message)) {
      return handleCancelSession(session, message);
    }

    // PRIORITY 3: Detect intent for new requests only
    const intent = await detectIntent(message);
    logger.debug(`Detected intent: ${intent.type} (confidence: ${intent.confidence})`);
    
    // PRIORITY 4: Route to appropriate handler
    return await routeIntent(session, intent, message);
    
  } catch (error) {
    return errorHandler.handleError(error, session, 'handleMessage');
  }
}

/**
 * Handle active flows with proper state management
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response from active flow
 */
async function handleActiveFlow(session, message) {
  const flowType = session.activeFlow;
  
  // Check for flow-specific cancel requests first
  if (isCancelRequest(message)) {
    return handleCancelSession(session, message);
  }

  switch (flowType) {
    case 'cold_room':
      // Handle active cold room flow
      if (coldRoomFlow.hasActiveColdRoomFlow(session)) {
        return coldRoomFlow.processInput(session, message);
      } else {
        // Flow ended externally, clean up session
        sessionManager.endFlow(session);
        return handleGreeting(session);
      }
      
    case 'equipment_recommendation':
      // Check if equipment flow is still active
      if (equipmentRecommendationFlow.hasActiveFlow(session.userId)) {
        return equipmentRecommendationFlow.processAnswer(session, message);
      } else {
        // Flow ended externally, clean up session
        sessionManager.endFlow(session);
        return handleGreeting(session);
      }
      
    default:
      logger.warn(`Unknown active flow type: ${flowType} for user ${session.userId}`);
      sessionManager.endFlow(session);
      return handleGreeting(session);
  }
}

/**
 * Route intent to appropriate handler
 * @param {Object} session - User session
 * @param {Object} intent - Detected intent
 * @param {string} message - User message
 * @returns {Promise<string>} - Response
 */
async function routeIntent(session, intent, message) {
  switch (intent.type) {
    case 'cold_room_calculation':
      return await handleColdRoomCalculation(session, message);
      
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
      
    case 'cancel_session':
      return handleCancelSession(session, message);
      
    case 'customer_support':
    case 'general_query':
    default:
      // For general queries, use multilingual response
      return await languageProcessor.generateMultilingualResponse(session, message);
  }
}

/**
 * Check if message is a cancel/stop request
 * @param {string} message - User message
 * @returns {boolean} - True if cancel request
 */
function isCancelRequest(message) {
  const cancelKeywords = [
    'cancel', 'stop', 'quit', 'exit', 'abort', 'end',
    'iptal', 'dur', 'durdur', 'bitir', 'çık', 'son',
    'stopp', 'abbrechen', 'beenden', 'aufhören'
  ];
  
  const lowerMessage = message.toLowerCase().trim();
  return cancelKeywords.some(keyword => lowerMessage.includes(keyword));
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
  // Get user's language preference or detect from session
  const language = session.preferences?.language || 'en';
  
  // Multilingual greetings
  const greetings = {
    en: [
      "Hello! How can I help you with DURMUSBABA.DE today?",
      "Hi there! I'm the DURMUSBABA.DE assistant. What can I help you with?",
      "Welcome to DURMUSBABA.DE! How may I assist you today?",
      "Greetings! How can I make your DURMUSBABA.DE experience better today?"
    ],
    de: [
      "Hallo! Wie kann ich Ihnen heute bei DURMUSBABA.DE helfen?",
      "Guten Tag! Ich bin der DURMUSBABA.DE Assistent. Womit kann ich Ihnen helfen?",
      "Willkommen bei DURMUSBABA.DE! Wie kann ich Ihnen heute behilflich sein?",
      "Grüß Gott! Wie kann ich Ihr DURMUSBABA.DE Erlebnis heute verbessern?"
    ],
    tr: [
      "Merhaba! DURMUSBABA.DE ile ilgili size nasıl yardımcı olabilirim?",
      "Selam! Ben DURMUSBABA.DE asistanı. Size nasıl yardımcı olabilirim?",
      "DURMUSBABA.DE'ye hoş geldiniz! Size bugün nasıl yardımcı olabilirim?",
      "Merhaba! DURMUSBABA.DE deneyiminizi bugün nasıl daha iyi hale getirebilirim?"
    ]
  };
  
  // Get greetings for the user's language or fall back to English
  const languageGreetings = greetings[language] || greetings.en;
  
  // Pick a random greeting
  return languageGreetings[Math.floor(Math.random() * languageGreetings.length)];
  
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
 * Handle cold room calculation intent
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response with calculation flow
 */
async function handleColdRoomCalculation(session, message) {
  try {
    // Check if user already has an active cold room flow
    if (coldRoomFlow.hasActiveColdRoomFlow(session)) {
      // Process the input as part of the existing flow
      return coldRoomFlow.processInput(session, message);
    } else {
      // Start new cold room flow
      sessionManager.startFlow(session, 'cold_room');
      const language = detectLanguage(message, session);
      return coldRoomFlow.initializeColdRoomFlow(session.userId, language);
    }
    
  } catch (error) {
    logger.error('Error handling cold room calculation:', error);
    
    const errorMessages = {
      en: "❌ I encountered an error while starting the cold room calculation. Please try again or contact our support team.",
      tr: "❌ Soğuk oda hesaplaması başlatılırken bir hata oluştu. Lütfen tekrar deneyin veya destek ekibimizle iletişime geçin.",
      de: "❌ Beim Starten der Kühlraum-Berechnung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie unser Support-Team."
    };
    
    const language = detectLanguage(message, session);
    return errorMessages[language] || errorMessages.en;
  }
}

/**
 * Handle cancel session intent with unified flow management
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {string} - Response confirming cancellation
 */
function handleCancelSession(session, message) {
  const language = sessionManager.getUserLanguage(session);
  
  // CONSISTENCY FIX: Unified cancellation handling
  if (sessionManager.hasActiveFlow(session)) {
    const flowType = session.activeFlow;
    
    switch (flowType) {
      case 'cold_room':
        // Cancel cold room flow
        return coldRoomFlow.cancelFlow(session);
        
      case 'equipment_recommendation':
        // Cancel equipment recommendation flow
        if (equipmentRecommendationFlow.hasActiveFlow(session.userId)) {
          equipmentRecommendationFlow.cancelFlow(session.userId);
        }
        sessionManager.endFlow(session);
        
        const equipmentMessages = {
          en: "✅ Equipment recommendation cancelled. How can I help you?",
          tr: "✅ Ekipman önerisi iptal edildi. Size nasıl yardımcı olabilirim?",
          de: "✅ Geräteempfehlung abgebrochen. Wie kann ich Ihnen helfen?"
        };
        return equipmentMessages[language] || equipmentMessages.en;
    }
    
    // Generic flow cancellation
    sessionManager.endFlow(session);
    const genericMessages = {
      en: "✅ Current process cancelled. How can I help you?",
      tr: "✅ Mevcut işlem iptal edildi. Size nasıl yardımcı olabilirim?",
      de: "✅ Aktueller Prozess abgebrochen. Wie kann ich Ihnen helfen?"
    };
    return genericMessages[language] || genericMessages.en;
  }
  
  // No active session to cancel
  const noActiveMessages = {
    en: "There's no active session to cancel. How can I help you?",
    tr: "İptal edilecek aktif oturum yok. Size nasıl yardımcı olabilirim?",
    de: "Es gibt keine aktive Sitzung zum Abbrechen. Wie kann ich Ihnen helfen?"
  };
  
  return noActiveMessages[language] || noActiveMessages.en;
}

/**
 * Detect language from message using centralized language processor
 * @param {string} message - User message
 * @param {Object} session - User session (for language preference)
 * @returns {string} - Language code
 */
function detectLanguage(message, session = null) {
  // CONSISTENCY FIX: Use centralized language detection from languageProcessor
  // Check session language preference first
  if (session?.preferences?.language) {
    return session.preferences.language;
  }
  
  // Fall back to simple keyword-based detection for reliability
  const lowerMessage = message.toLowerCase();
  
  // Turkish keywords (most specific first)
  const turkishKeywords = ['soğuk', 'oda', 'sıcaklık', 'hesapla', 'evet', 'hayır', 'iptal', 'dur',
                          'soğutma', 'kapasitesi', 'dondurucu', 'yalıtım', 'günde', 'ürün'];
  
  // German keywords
  const germanKeywords = ['kühlraum', 'temperatur', 'berechnen', 'kühlung', 'isolierung', 
                         'häufig', 'selten', 'ja', 'nein', 'abbrechen', 'kältekammer'];
  
  // Count matches
  const turkishMatches = turkishKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  const germanMatches = germanKeywords.filter(keyword => lowerMessage.includes(keyword)).length;
  
  // Return most likely language
  if (turkishMatches > 0 && turkishMatches >= germanMatches) {
    return 'tr';
  } else if (germanMatches > 0) {
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
    

    
    // Start the guided equipment recommendation flow
    const response = equipmentRecommendationFlow.initializeFlow(session.userId, language);
    
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