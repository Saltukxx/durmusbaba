const woocommerceService = require('./woocommerceService');
const logger = require('./logger');

/**
 * Equipment Recommendation Conversation Flow
 * Guides users through requirement gathering to provide specific product recommendations
 */

class EquipmentRecommendationFlow {
  constructor() {
    this.activeSessions = new Map();
  }

  /**
   * Initialize equipment recommendation flow
   * @param {string} userId - User ID
   * @param {string} language - Language code
   * @param {Object} initialData - Any initial data from cold storage calculation
   * @returns {string} - Initial question
   */
  initializeFlow(userId, language = 'en', initialData = null) {
    const session = {
      userId,
      language,
      step: 1,
      maxSteps: 5,
      requirements: {
        equipmentType: null,
        capacity: initialData?.finalCapacity || null,
        temperature: initialData?.parameters?.temperature || null,
        roomSize: initialData?.parameters?.volume || null,
        budget: null,
        urgency: 'normal',
        application: null // meat, dairy, vegetables, etc.
      },
      startTime: new Date()
    };

    this.activeSessions.set(userId, session);
    logger.info(`Started equipment recommendation flow for user ${userId} in ${language}`);

    return this.getQuestion(session);
  }

  /**
   * Process user answer and move to next step
   * @param {Object} userSession - User session from session manager
   * @param {string} answer - User's answer
   * @returns {string} - Next question or final recommendations
   */
  async processAnswer(userSession, answer) {
    const session = this.activeSessions.get(userSession.userId);
    if (!session) {
      return this.initializeFlow(userSession.userId);
    }

    // Process the answer based on current step
    const processed = this.processCurrentStep(session, answer);
    
    if (!processed) {
      return this.askForClarification(session);
    }

    // Move to next step or provide recommendations
    session.step++;
    
    if (session.step > session.maxSteps || this.hasEnoughInfo(session)) {
      return await this.generateRecommendations(session);
    }

    return this.getQuestion(session);
  }

  /**
   * Process answer for current step
   * @param {Object} session - Flow session
   * @param {string} answer - User's answer
   * @returns {boolean} - Whether answer was processed successfully
   */
  processCurrentStep(session, answer) {
    const lowerAnswer = answer.toLowerCase();

    switch (session.step) {
      case 1: // Equipment type
        return this.processEquipmentType(session, lowerAnswer);
      
      case 2: // Application/Temperature
        return this.processApplication(session, lowerAnswer);
      
      case 3: // Capacity/Room size
        return this.processCapacity(session, lowerAnswer);
      
      case 4: // Budget
        return this.processBudget(session, lowerAnswer);
      
      case 5: // Urgency
        return this.processUrgency(session, lowerAnswer);
      
      default:
        return false;
    }
  }

  /**
   * Process equipment type selection
   */
  processEquipmentType(session, answer) {
    const equipmentMap = {
      en: {
        'cooling': 'cooling_units',
        'compressor': 'cooling_units', 
        'condensing': 'cooling_units',
        'evaporator': 'evaporators',
        'air cooler': 'evaporators',
        'condenser': 'condensers',
        'insulation': 'insulation',
        'panel': 'insulation',
        'door': 'doors',
        'complete': 'complete_system',
        'full': 'complete_system',
        'everything': 'complete_system'
      },
      tr: {
        'soğutma': 'cooling_units',
        'kompresör': 'cooling_units',
        'evaporatör': 'evaporators',
        'hava soğutucu': 'evaporators',
        'kondensör': 'condensers',
        'yalıtım': 'insulation',
        'panel': 'insulation',
        'kapı': 'doors',
        'komple': 'complete_system',
        'tam': 'complete_system'
      },
      de: {
        'kühlung': 'cooling_units',
        'kompressor': 'cooling_units',
        'verdampfer': 'evaporators',
        'luftkühler': 'evaporators',
        'kondensator': 'condensers',
        'isolierung': 'insulation',
        'panel': 'insulation',
        'tür': 'doors',
        'komplett': 'complete_system',
        'vollständig': 'complete_system'
      }
    };

    const langMap = equipmentMap[session.language] || equipmentMap.en;
    
    for (const [keyword, type] of Object.entries(langMap)) {
      if (answer.includes(keyword)) {
        session.requirements.equipmentType = type;
        return true;
      }
    }

    // Check for numbers (option selection)
    if (answer.match(/[1-6]/)) {
      const optionMap = {
        '1': 'cooling_units',
        '2': 'evaporators', 
        '3': 'condensers',
        '4': 'insulation',
        '5': 'doors',
        '6': 'complete_system'
      };
      const option = answer.match(/[1-6]/)[0];
      session.requirements.equipmentType = optionMap[option];
      return true;
    }

    return false;
  }

  /**
   * Process application/temperature
   */
  processApplication(session, answer) {
    const applicationMap = {
      'meat': { temp: -18, app: 'meat' },
      'fish': { temp: -18, app: 'fish' },
      'dairy': { temp: 5, app: 'dairy' },
      'vegetable': { temp: 0, app: 'vegetables' },
      'fruit': { temp: 0, app: 'fruits' },
      'flower': { temp: 5, app: 'flowers' },
      'pharmacy': { temp: 5, app: 'pharmaceutical' },
      'et': { temp: -18, app: 'meat' },
      'balık': { temp: -18, app: 'fish' },
      'süt': { temp: 5, app: 'dairy' },
      'sebze': { temp: 0, app: 'vegetables' },
      'meyve': { temp: 0, app: 'fruits' },
      'fleisch': { temp: -18, app: 'meat' },
      'fisch': { temp: -18, app: 'fish' },
      'milch': { temp: 5, app: 'dairy' },
      'gemüse': { temp: 0, app: 'vegetables' },
      'obst': { temp: 0, app: 'fruits' }
    };

    // Check for application keywords
    for (const [keyword, data] of Object.entries(applicationMap)) {
      if (answer.includes(keyword)) {
        session.requirements.application = data.app;
        if (!session.requirements.temperature) {
          session.requirements.temperature = data.temp;
        }
        return true;
      }
    }

    // Check for temperature
    const tempMatch = answer.match(/(-?\d+)\s*°?c/i);
    if (tempMatch) {
      session.requirements.temperature = parseInt(tempMatch[1]);
      return true;
    }

    return false;
  }

  /**
   * Process capacity/room size
   */
  processCapacity(session, answer) {
    // Extract capacity in kW or W
    const capacityMatch = answer.match(/(\d+(?:\.\d+)?)\s*(kw|kilowatt|w|watt)/i);
    if (capacityMatch) {
      let capacity = parseFloat(capacityMatch[1]);
      if (capacityMatch[2].toLowerCase().includes('kw')) {
        capacity *= 1000;
      }
      session.requirements.capacity = capacity;
      return true;
    }

    // Extract room size
    const sizeMatch = answer.match(/(\d+)\s*(?:m3|m³|cubic|meter)/i);
    if (sizeMatch) {
      session.requirements.roomSize = parseInt(sizeMatch[1]);
      // Estimate capacity if not provided
      if (!session.requirements.capacity && session.requirements.temperature) {
        session.requirements.capacity = this.estimateCapacity(
          session.requirements.roomSize, 
          session.requirements.temperature
        );
      }
      return true;
    }

    return false;
  }

  /**
   * Process budget
   */
  processBudget(session, answer) {
    const budgetMatch = answer.match(/(\d+)\s*(?:euro|€|eur)/i);
    if (budgetMatch) {
      session.requirements.budget = parseInt(budgetMatch[1]);
      return true;
    }

    // Handle "no budget" responses
    if (answer.includes('no') || answer.includes('yok') || answer.includes('kein') ||
        answer.includes('skip') || answer.includes('geç')) {
      session.requirements.budget = null;
      return true;
    }

    return false;
  }

  /**
   * Process urgency
   */
  processUrgency(session, answer) {
    if (answer.includes('urgent') || answer.includes('acil') || answer.includes('dringend')) {
      session.requirements.urgency = 'urgent';
    } else if (answer.includes('soon') || answer.includes('yakında') || answer.includes('bald')) {
      session.requirements.urgency = 'soon';
    } else {
      session.requirements.urgency = 'normal';
    }
    return true;
  }

  /**
   * Get question for current step
   */
  getQuestion(session) {
    const questions = {
      en: {
        1: `🔧 **Equipment Recommendation** (Step ${session.step}/${session.maxSteps})

What type of equipment do you need?

1️⃣ **Cooling Units** - Main refrigeration systems
2️⃣ **Evaporators** - Air coolers for inside cold rooms
3️⃣ **Condensers** - Heat rejection units
4️⃣ **Insulation Panels** - Wall and ceiling panels
5️⃣ **Cold Room Doors** - Entry doors
6️⃣ **Complete System** - Everything needed

Please select a number or describe what you need.`,

        2: `🌡️ **Application & Temperature** (Step ${session.step}/${session.maxSteps})

What will you store in the cold room?

• **Meat/Fish** (-18°C freezing)
• **Dairy products** (+5°C chilling) 
• **Vegetables/Fruits** (0°C fresh)
• **Flowers** (+5°C fresh)
• **Other** - specify temperature

Example: "Meat storage" or "-20°C"`,

        3: `📏 **Capacity & Size** (Step ${session.step}/${session.maxSteps})

${session.requirements.capacity ? 
  `Great! I see you need ${(session.requirements.capacity/1000).toFixed(1)}kW capacity.` : 
  'What is your cooling requirement?'}

Please provide:
• **Room size**: "300m³" or "10x8x3 meters"
• **Cooling capacity**: "15kW" or "15000W"

Example: "200 cubic meters" or "12kW cooling"`,

        4: `💰 **Budget** (Step ${session.step}/${session.maxSteps})

What is your budget range?

• **Under €2,000** - Basic solutions
• **€2,000 - €5,000** - Professional grade
• **€5,000 - €10,000** - Premium systems
• **Above €10,000** - Industrial solutions
• **No specific budget** - Show all options

Example: "5000 euro budget" or "no budget limit"`,

        5: `⏰ **Timeline** (Step ${session.step}/${session.maxSteps})

When do you need the equipment?

• **Urgent** - Within 1 week
• **Soon** - Within 1 month  
• **Normal** - Standard delivery

This helps me prioritize in-stock items.`
      },
      
      tr: {
        1: `🔧 **Ekipman Önerisi** (Adım ${session.step}/${session.maxSteps})

Hangi tür ekipmana ihtiyacınız var?

1️⃣ **Soğutma Üniteleri** - Ana soğutma sistemleri
2️⃣ **Evaporatörler** - Soğuk oda içi hava soğutucuları
3️⃣ **Kondensörler** - Isı atım üniteleri
4️⃣ **Yalıtım Panelleri** - Duvar ve tavan panelleri
5️⃣ **Soğuk Oda Kapıları** - Giriş kapıları
6️⃣ **Komple Sistem** - Gereken her şey

Lütfen bir numara seçin veya neye ihtiyacınız olduğunu açıklayın.`,

        2: `🌡️ **Uygulama & Sıcaklık** (Adım ${session.step}/${session.maxSteps})

Soğuk odada ne depolayacaksınız?

• **Et/Balık** (-18°C dondurucu)
• **Süt ürünleri** (+5°C soğutucu)
• **Sebze/Meyve** (0°C taze)
• **Çiçek** (+5°C taze)
• **Diğer** - sıcaklık belirtin

Örnek: "Et depolama" veya "-20°C"`,

        3: `📏 **Kapasite & Boyut** (Adım ${session.step}/${session.maxSteps})

${session.requirements.capacity ? 
  `Harika! ${(session.requirements.capacity/1000).toFixed(1)}kW kapasiteye ihtiyacınız olduğunu görüyorum.` : 
  'Soğutma gereksiniminiz nedir?'}

Lütfen şunları belirtin:
• **Oda boyutu**: "300m³" veya "10x8x3 metre"
• **Soğutma kapasitesi**: "15kW" veya "15000W"

Örnek: "200 metreküp" veya "12kW soğutma"`,

        4: `💰 **Bütçe** (Adım ${session.step}/${session.maxSteps})

Bütçe aralığınız nedir?

• **2.000€ altı** - Temel çözümler
• **2.000€ - 5.000€** - Profesyonel kalite
• **5.000€ - 10.000€** - Premium sistemler
• **10.000€ üzeri** - Endüstriyel çözümler
• **Belirli bütçe yok** - Tüm seçenekleri göster

Örnek: "5000 euro bütçe" veya "bütçe sınırı yok"`,

        5: `⏰ **Zaman Çizelgesi** (Adım ${session.step}/${session.maxSteps})

Ekipmana ne zaman ihtiyacınız var?

• **Acil** - 1 hafta içinde
• **Yakında** - 1 ay içinde
• **Normal** - Standart teslimat

Bu, stokta bulunan ürünleri önceliklendirmeme yardımcı olur.`
      },

      de: {
        1: `🔧 **Geräte-Empfehlung** (Schritt ${session.step}/${session.maxSteps})

Welche Art von Ausrüstung benötigen Sie?

1️⃣ **Kühlaggregate** - Hauptkühlsysteme
2️⃣ **Verdampfer** - Luftkühler für Kühlräume
3️⃣ **Kondensatoren** - Wärmeabführungseinheiten
4️⃣ **Isolationspaneele** - Wand- und Deckenpaneele
5️⃣ **Kühlraumtüren** - Eingangstüren
6️⃣ **Komplettes System** - Alles was benötigt wird

Bitte wählen Sie eine Nummer oder beschreiben Sie was Sie brauchen.`,

        2: `🌡️ **Anwendung & Temperatur** (Schritt ${session.step}/${session.maxSteps})

Was werden Sie im Kühlraum lagern?

• **Fleisch/Fisch** (-18°C Gefrieren)
• **Molkereiprodukte** (+5°C Kühlung)
• **Gemüse/Obst** (0°C frisch)
• **Blumen** (+5°C frisch)
• **Andere** - Temperatur angeben

Beispiel: "Fleischlagerung" oder "-20°C"`,

        3: `📏 **Kapazität & Größe** (Schritt ${session.step}/${session.maxSteps})

${session.requirements.capacity ? 
  `Großartig! Ich sehe Sie benötigen ${(session.requirements.capacity/1000).toFixed(1)}kW Kapazität.` : 
  'Was ist Ihr Kühlbedarf?'}

Bitte geben Sie an:
• **Raumgröße**: "300m³" oder "10x8x3 Meter"
• **Kühlkapazität**: "15kW" oder "15000W"

Beispiel: "200 Kubikmeter" oder "12kW Kühlung"`,

        4: `💰 **Budget** (Schritt ${session.step}/${session.maxSteps})

Wie hoch ist Ihr Budgetrahmen?

• **Unter €2.000** - Grundlösungen
• **€2.000 - €5.000** - Professionelle Qualität
• **€5.000 - €10.000** - Premium-Systeme
• **Über €10.000** - Industrielle Lösungen
• **Kein spezifisches Budget** - Alle Optionen zeigen

Beispiel: "5000 Euro Budget" oder "keine Budgetgrenze"`,

        5: `⏰ **Zeitplan** (Schritt ${session.step}/${session.maxSteps})

Wann benötigen Sie die Ausrüstung?

• **Dringend** - Innerhalb 1 Woche
• **Bald** - Innerhalb 1 Monat
• **Normal** - Standardlieferung

Das hilft mir, vorrätige Artikel zu priorisieren.`
      }
    };

    const langQuestions = questions[session.language] || questions.en;
    return langQuestions[session.step] || langQuestions[1];
  }

  /**
   * Check if we have enough information to make recommendations
   */
  hasEnoughInfo(session) {
    const req = session.requirements;
    return req.equipmentType && (req.capacity || req.roomSize || req.temperature);
  }

  /**
   * Generate specific product recommendations
   */
  async generateRecommendations(session) {
    try {
      logger.info(`Generating recommendations for user ${session.userId}`);
      
      // Get specific products from database
      const recommendations = await this.getSpecificProducts(session.requirements);
      
      // Format response with actual products
      const response = this.formatProductRecommendations(recommendations, session);
      
      // Clean up session
      this.activeSessions.delete(session.userId);
      
      return response;
      
    } catch (error) {
      logger.error('Error generating recommendations:', error);
      return this.getErrorMessage(session.language);
    }
  }

  /**
   * Get specific products based on requirements
   */
  async getSpecificProducts(requirements) {
    const products = {
      cooling_units: [],
      evaporators: [],
      condensers: [],
      insulation: [],
      doors: [],
      accessories: []
    };

    try {
      if (requirements.equipmentType === 'complete_system') {
        // Get products for all categories
        products.cooling_units = await this.searchProducts('cooling unit compressor', requirements);
        products.evaporators = await this.searchProducts('evaporator air cooler', requirements);
        products.insulation = await this.searchProducts('insulation panel sandwich', requirements);
        products.doors = await this.searchProducts('cold room door', requirements);
      } else {
        // Get products for specific category
        const searchTerms = {
          cooling_units: 'cooling unit compressor refrigeration',
          evaporators: 'evaporator air cooler',
          condensers: 'condenser heat rejection',
          insulation: 'insulation panel sandwich',
          doors: 'cold room door',
          accessories: 'shelving thermometer lighting'
        };
        
        const term = searchTerms[requirements.equipmentType];
        if (term) {
          products[requirements.equipmentType] = await this.searchProducts(term, requirements);
        }
      }

    } catch (error) {
      logger.error('Error searching products:', error);
    }

    return products;
  }

  /**
   * Search products with specific filters
   */
  async searchProducts(searchTerm, requirements, limit = 3) {
    try {
      const filters = {
        search: searchTerm,
        per_page: limit * 2, // Get more to filter
        orderby: 'popularity',
        order: 'desc'
      };

      // Add budget filter
      if (requirements.budget) {
        filters.max_price = requirements.budget;
      }

      const products = await woocommerceService.searchProductsAdvanced(filters);
      
      // Apply additional filtering and scoring
      return products
        .filter(product => this.matchesRequirements(product, requirements))
        .slice(0, limit);
        
    } catch (error) {
      logger.error(`Error searching for ${searchTerm}:`, error);
      return [];
    }
  }

  /**
   * Check if product matches requirements
   */
  matchesRequirements(product, requirements) {
    // Always include products that are in stock
    if (product.stock_status !== 'instock') {
      return false;
    }

    // Budget check
    if (requirements.budget) {
      const price = parseFloat(product.price) || 0;
      if (price > requirements.budget) {
        return false;
      }
    }

    return true;
  }

  /**
   * Format product recommendations with specific details
   */
  formatProductRecommendations(products, session) {
    const { language, requirements } = session;
    
    const texts = {
      en: {
        title: "🎯 **Your Equipment Recommendations**",
        based_on: "Based on your requirements:",
        no_products: "No suitable products found in our current inventory.",
        contact: "Please contact our sales team for custom solutions:",
        phone: "📞 Phone: +49 XXX XXXX",
        email: "📧 Email: sales@durmusbaba.de",
        price: "Price",
        stock: "✅ In Stock",
        view: "View Details"
      },
      tr: {
        title: "🎯 **Ekipman Önerileriniz**",
        based_on: "Gereksinimlerinize göre:",
        no_products: "Mevcut envanterimizde uygun ürün bulunamadı.",
        contact: "Özel çözümler için satış ekibimizle iletişime geçin:",
        phone: "📞 Telefon: +49 XXX XXXX",
        email: "📧 E-posta: sales@durmusbaba.de",
        price: "Fiyat",
        stock: "✅ Stokta",
        view: "Detayları Gör"
      },
      de: {
        title: "🎯 **Ihre Geräte-Empfehlungen**",
        based_on: "Basierend auf Ihren Anforderungen:",
        no_products: "Keine passenden Produkte in unserem aktuellen Lager gefunden.",
        contact: "Bitte kontaktieren Sie unser Verkaufsteam für maßgeschneiderte Lösungen:",
        phone: "📞 Telefon: +49 XXX XXXX",
        email: "📧 E-Mail: sales@durmusbaba.de",
        price: "Preis",
        stock: "✅ Verfügbar",
        view: "Details ansehen"
      }
    };

    const t = texts[language] || texts.en;
    let response = `${t.title}\n\n`;

    // Add requirements summary
    response += `📋 ${t.based_on}\n`;
    if (requirements.capacity) {
      response += `• Capacity: ${(requirements.capacity/1000).toFixed(1)}kW\n`;
    }
    if (requirements.temperature) {
      response += `• Temperature: ${requirements.temperature}°C\n`;
    }
    if (requirements.application) {
      response += `• Application: ${requirements.application}\n`;
    }
    if (requirements.budget) {
      response += `• Budget: €${requirements.budget.toLocaleString()}\n`;
    }
    response += '\n';

    // Add specific product recommendations
    let hasProducts = false;
    const categoryNames = {
      en: {
        cooling_units: "🔧 Cooling Units",
        evaporators: "❄️ Evaporators",
        condensers: "🌡️ Condensers",
        insulation: "🏗️ Insulation Panels",
        doors: "🚪 Cold Room Doors",
        accessories: "⚙️ Accessories"
      }
    };

    for (const [category, productList] of Object.entries(products)) {
      if (productList.length > 0) {
        hasProducts = true;
        const categoryName = categoryNames[language]?.[category] || categoryNames.en[category];
        response += `${categoryName}\n`;
        
        productList.forEach((product, index) => {
          const price = product.price ? `€${parseFloat(product.price).toLocaleString()}` : t.contact;
          response += `\n${index + 1}. **${product.name}**\n`;
          response += `   ${t.price}: ${price}\n`;
          response += `   ${t.stock}\n`;
          if (product.short_description) {
            const desc = product.short_description.replace(/<[^>]*>/g, '').substring(0, 80);
            response += `   ${desc}...\n`;
          }
          response += `   ${t.view}: ${product.permalink}\n`;
        });
        response += '\n';
      }
    }

    if (!hasProducts) {
      response += `❌ ${t.no_products}\n\n`;
      response += `${t.contact}\n`;
      response += `${t.phone}\n`;
      response += `${t.email}`;
    }

    return response;
  }

  /**
   * Ask for clarification when answer isn't understood
   */
  askForClarification(session) {
    const messages = {
      en: "I didn't quite understand that. Could you please be more specific?",
      tr: "Bunu tam olarak anlayamadım. Lütfen daha açık olabilir misiniz?",
      de: "Das habe ich nicht ganz verstanden. Könnten Sie bitte spezifischer sein?"
    };
    
    return (messages[session.language] || messages.en) + '\n\n' + this.getQuestion(session);
  }

  /**
   * Get error message
   */
  getErrorMessage(language) {
    const messages = {
      en: "❌ I encountered an error while searching for products. Please try again or contact our support team.",
      tr: "❌ Ürün ararken bir hata oluştu. Lütfen tekrar deneyin veya destek ekibimizle iletişime geçin.",
      de: "❌ Bei der Produktsuche ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie unser Support-Team."
    };
    
    return messages[language] || messages.en;
  }

  /**
   * Estimate capacity based on room size and temperature
   */
  estimateCapacity(roomSize, temperature) {
    // Simple estimation - should use coldRoomCalculator for accuracy
    const baseCapacity = roomSize * 50; // W/m³ base
    const tempFactor = temperature < -10 ? 1.5 : temperature < 0 ? 1.2 : 1.0;
    return Math.round(baseCapacity * tempFactor);
  }

  /**
   * Check if user has active flow
   */
  hasActiveFlow(userId) {
    return this.activeSessions.has(userId);
  }

  /**
   * Cancel active flow
   */
  cancelFlow(userId) {
    this.activeSessions.delete(userId);
    logger.info(`Cancelled equipment recommendation flow for user ${userId}`);
  }
}

module.exports = new EquipmentRecommendationFlow();