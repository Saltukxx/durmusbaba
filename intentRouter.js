const geminiService = require('./geminiService');
const woocommerceService = require('./woocommerceService');
const languageProcessor = require('./languageProcessor');
const coldRoomCalculator = require('./coldRoomCalculator');
const coldStorageService = require('./coldStorageService');
const coldStorageFlow = require('./coldStorageFlow');
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
        return coldStorageService.handleColdStorageRequest(session, message);
        
      case 'cancel_session':
        return handleCancelSession(session, message);
        
      case 'cold_room_calculation':
        // Redirect to step-by-step flow instead of legacy system
        return await handleColdStorageCalculation(session, message);
        
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

/**
 * Handle cold storage calculation intent (new step-by-step version)
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {Promise<string>} - Response with calculation results
 */
async function handleColdStorageCalculation(session, message) {
  try {
    // Check if there's already an active flow
    if (coldStorageFlow.hasActiveColdStorageFlow(session)) {
      return coldStorageFlow.processAnswer(session, message);
    }
    
    // Detect language from message
    const language = detectLanguage(message);
    
    // Check if user is choosing a specific calculation method
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('step') || lowerMessage.includes('guide') || lowerMessage.includes('detailed') ||
        lowerMessage.includes('adım') || lowerMessage.includes('rehber') || lowerMessage.includes('detaylı') ||
        lowerMessage.includes('schritt') || lowerMessage.includes('anleitung') || lowerMessage.includes('detailliert')) {
      // Start step-by-step flow
      return coldStorageFlow.initializeColdStorageFlow(session.userId, language);
    }
    
    // Check if user wants quick calculation and has provided parameters
    if (lowerMessage.includes('quick') || lowerMessage.includes('hızlı') || lowerMessage.includes('schnell') ||
        lowerMessage.includes('calculate') || lowerMessage.includes('hesapla') || lowerMessage.includes('berechnen') ||
        (lowerMessage.includes('m³') || lowerMessage.includes('°c'))) {
      // Use legacy quick calculation handler
      return await handleColdRoomCalculation(session, message);
    }
    
    // Show options menu instead of immediately starting questions
    const optionsMenu = {
      en: `❄️ **Cold Room Calculation Options**

I can help you calculate cold room capacity in two ways:

🔹 **Quick Calculation** - Provide all parameters at once
   Example: "Calculate for 330m³ room at -20°C with 35°C ambient"

🔹 **Step-by-Step Guide** - I'll ask detailed questions one by one
   Reply: "step by step" or "guide me"

📊 **Available Commands:**
• *Quick calc* - Fast calculation with your parameters
• *Step by step* - Guided questionnaire  
• *Help* - More information about calculations

Which method would you prefer?`,
      tr: `❄️ **Soğuk Oda Hesaplama Seçenekleri**

Soğuk oda kapasitesini iki şekilde hesaplayabilirim:

🔹 **Hızlı Hesaplama** - Tüm parametreleri bir kerede verin
   Örnek: "330m³ oda için -20°C sıcaklıkta 35°C dış ortam sıcaklığında hesapla"

🔹 **Adım Adım Rehber** - Detaylı soruları teker teker soracağım
   Cevap: "adım adım" veya "rehber et"

📊 **Kullanılabilir Komutlar:**
• *Hızlı hesap* - Parametrelerinizle hızlı hesaplama
• *Adım adım* - Rehberli anket
• *Yardım* - Hesaplamalar hakkında daha fazla bilgi

Hangi yöntemi tercih edersiniz?`,
      de: `❄️ **Kühlraum-Berechnungsoptionen**

Ich kann Ihnen bei der Kühlraumkapazität auf zwei Arten helfen:

🔹 **Schnelle Berechnung** - Alle Parameter auf einmal angeben
   Beispiel: "Berechnen für 330m³ Raum bei -20°C mit 35°C Umgebung"

🔹 **Schritt-für-Schritt Anleitung** - Ich stelle detaillierte Fragen einzeln
   Antwort: "schritt für schritt" oder "anleitung"

📊 **Verfügbare Befehle:**
• *Schnelle Berechnung* - Schnelle Berechnung mit Ihren Parametern
• *Schritt für Schritt* - Geführter Fragebogen
• *Hilfe* - Mehr Informationen über Berechnungen

Welche Methode bevorzugen Sie?`
    };
    
    return optionsMenu[language] || optionsMenu.en;
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