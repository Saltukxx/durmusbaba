const coldRoomCalculator = require('./coldRoomCalculator');
const logger = require('./logger');

/**
 * Cold Room Flow Manager
 * Handles the conversation flow for cold room capacity calculations
 */
class ColdRoomFlow {
  constructor() {
    this.activeFlows = new Map(); // userId -> flow data
    this.questions = [
      'dimensions',
      'temperature',
      'ambientTemperature',
      'productType',
      'dailyLoad',
      'entryTemperature',
      'insulationThickness',
      'doorOpenings',
      'coolingTime',
      'safetyFactor',
      'climateZone'
    ];
  }

  /**
   * Initialize cold room calculation flow
   * @param {string} userId - User ID
   * @param {string} language - Language code
   * @returns {string} - Welcome message and first question
   */
  initializeColdRoomFlow(userId, language = 'en') {
    const flowData = {
      userId,
      language,
      currentStep: 0,
      answers: {},
      parameters: {},
      startTime: Date.now()
    };

    this.activeFlows.set(userId, flowData);
    logger.info(`Started cold room flow for user ${userId} in ${language}`);

    return this.getWelcomeMessage(language) + '\n\n' + this.getCurrentQuestion(flowData);
  }

  /**
   * Process user input in the cold room flow
   * @param {Object} session - User session
   * @param {string} input - User input
   * @returns {string} - Response message
   */
  processInput(session, input) {
    const userId = session.userId;
    const flowData = this.activeFlows.get(userId);

    if (!flowData) {
      return this.initializeColdRoomFlow(userId, session.preferences?.language || 'en');
    }

    const lowerInput = input.toLowerCase().trim();

    // Handle navigation commands
    if (this.isNavigationCommand(lowerInput)) {
      return this.handleNavigationCommand(flowData, lowerInput);
    }

    // Handle current question
    const currentQuestion = this.questions[flowData.currentStep];
    const processed = this.processAnswer(flowData, currentQuestion, input);

    if (!processed) {
      return this.getInvalidAnswerMessage(flowData) + '\n\n' + this.getCurrentQuestion(flowData);
    }

    // Move to next question or complete calculation
    flowData.currentStep++;

    if (flowData.currentStep >= this.questions.length) {
      // Complete calculation
      return this.completeCalculation(flowData);
    } else {
      // Show next question
      return this.getCurrentQuestion(flowData);
    }
  }

  /**
   * Process answer for a specific question
   * @param {Object} flowData - Flow data
   * @param {string} question - Question type
   * @param {string} answer - User answer
   * @returns {boolean} - True if answer was processed successfully
   */
  processAnswer(flowData, question, answer) {
    try {
      switch (question) {
        case 'dimensions':
          return this.processDimensions(flowData, answer);
        case 'temperature':
          return this.processTemperature(flowData, answer);
        case 'ambientTemperature':
          return this.processAmbientTemperature(flowData, answer);
        case 'productType':
          return this.processProductType(flowData, answer);
        case 'dailyLoad':
          return this.processDailyLoad(flowData, answer);
        case 'entryTemperature':
          return this.processEntryTemperature(flowData, answer);
        case 'insulationThickness':
          return this.processInsulationThickness(flowData, answer);
        case 'doorOpenings':
          return this.processDoorOpenings(flowData, answer);
        case 'coolingTime':
          return this.processCoolingTime(flowData, answer);
        case 'safetyFactor':
          return this.processSafetyFactor(flowData, answer);
        case 'climateZone':
          return this.processClimateZone(flowData, answer);
        default:
          return false;
      }
    } catch (error) {
      logger.error(`Error processing answer for ${question}:`, error);
      return false;
    }
  }

  /**
   * Process room dimensions
   */
  processDimensions(flowData, answer) {
    // Support formats: "10x6x3", "10m x 6m x 3m", "10 6 3"
    const dimensionPattern = /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i;
    const spacePattern = /(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)/;
    
    let match = answer.match(dimensionPattern) || answer.match(spacePattern);
    
    if (match) {
      const length = parseFloat(match[1]);
      const width = parseFloat(match[2]);
      const height = parseFloat(match[3]);
      
      if (length > 0 && width > 0 && height > 0) {
        flowData.parameters.length = length;
        flowData.parameters.width = width;
        flowData.parameters.height = height;
        flowData.answers.dimensions = `${length}m × ${width}m × ${height}m`;
        return true;
      }
    }
    
    return false;
  }

  /**
   * Process storage temperature
   */
  processTemperature(flowData, answer) {
    const tempMatch = answer.match(/(-?\d+)\s*°?c/i);
    if (tempMatch) {
      const temp = parseInt(tempMatch[1]);
      if (coldRoomCalculator.supportedTemperatures.includes(temp)) {
        flowData.parameters.temperature = temp;
        flowData.answers.temperature = `${temp}°C`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process ambient temperature
   */
  processAmbientTemperature(flowData, answer) {
    const tempMatch = answer.match(/(\d+)\s*°?c/i);
    if (tempMatch) {
      const temp = parseInt(tempMatch[1]);
      if (temp >= 20 && temp <= 50) {
        flowData.parameters.ambientTemperature = temp;
        flowData.answers.ambientTemperature = `${temp}°C`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process product type
   */
  processProductType(flowData, answer) {
    const productTypes = {
      'meat': 'meat',
      'et': 'meat',
      'fleisch': 'meat',
      'fish': 'fish',
      'balık': 'fish',
      'fisch': 'fish',
      'dairy': 'dairy',
      'süt': 'dairy',
      'milch': 'dairy',
      'vegetables': 'vegetables',
      'sebze': 'vegetables',
      'gemüse': 'vegetables',
      'fruits': 'fruits',
      'meyve': 'fruits',
      'obst': 'fruits',
      'frozen': 'frozen',
      'donmuş': 'frozen',
      'gefroren': 'frozen',
      'general': 'general',
      'genel': 'general',
      'allgemein': 'general'
    };

    for (const [keyword, type] of Object.entries(productTypes)) {
      if (answer.toLowerCase().includes(keyword)) {
        flowData.parameters.productType = type;
        flowData.answers.productType = type;
        return true;
      }
    }
    
    return false;
  }

  /**
   * Process daily load
   */
  processDailyLoad(flowData, answer) {
    const loadMatch = answer.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo)/i);
    if (loadMatch) {
      const load = parseFloat(loadMatch[1]);
      if (load >= 0) {
        flowData.parameters.dailyLoad = load;
        flowData.answers.dailyLoad = `${load} kg/day`;
        return true;
      }
    }
    
    // Handle "none" or "0"
    if (answer.toLowerCase().includes('none') || answer.toLowerCase().includes('0') || 
        answer.toLowerCase().includes('yok') || answer.toLowerCase().includes('keine')) {
      flowData.parameters.dailyLoad = 0;
      flowData.answers.dailyLoad = 'No daily load';
      return true;
    }
    
    return false;
  }

  /**
   * Process entry temperature
   */
  processEntryTemperature(flowData, answer) {
    const tempMatch = answer.match(/(\d+)\s*°?c/i);
    if (tempMatch) {
      const temp = parseInt(tempMatch[1]);
      if (temp >= 0 && temp <= 40) {
        flowData.parameters.entryTemperature = temp;
        flowData.answers.entryTemperature = `${temp}°C`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process insulation thickness
   */
  processInsulationThickness(flowData, answer) {
    const thicknessMatch = answer.match(/(\d+)\s*(?:mm|millimeter)/i);
    if (thicknessMatch) {
      const thickness = parseInt(thicknessMatch[1]);
      if (thickness >= 50 && thickness <= 200) {
        flowData.parameters.insulationThickness = thickness;
        flowData.answers.insulationThickness = `${thickness}mm`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process door openings
   */
  processDoorOpenings(flowData, answer) {
    const openingsMatch = answer.match(/(\d+)\s*(?:times|kez|mal)/i);
    if (openingsMatch) {
      const openings = parseInt(openingsMatch[1]);
      if (openings >= 0 && openings <= 100) {
        flowData.parameters.doorOpenings = openings;
        flowData.answers.doorOpenings = `${openings} times/day`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process cooling time
   */
  processCoolingTime(flowData, answer) {
    const timeMatch = answer.match(/(\d+)\s*(?:hours|saat|stunden)/i);
    if (timeMatch) {
      const time = parseInt(timeMatch[1]);
      if (time >= 1 && time <= 48) {
        flowData.parameters.coolingTime = time;
        flowData.answers.coolingTime = `${time} hours`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process safety factor
   */
  processSafetyFactor(flowData, answer) {
    const factorMatch = answer.match(/(\d+)\s*%/i);
    if (factorMatch) {
      const factor = parseInt(factorMatch[1]);
      if (factor >= 0 && factor <= 30) {
        flowData.parameters.safetyFactor = factor;
        flowData.answers.safetyFactor = `${factor}%`;
        return true;
      }
    }
    return false;
  }

  /**
   * Process climate zone
   */
  processClimateZone(flowData, answer) {
    const climateZones = {
      'hot': 'hot',
      'sıcak': 'hot',
      'heiß': 'hot',
      'warm': 'warm',
      'ılık': 'warm',
      'warm': 'warm',
      'temperate': 'temperate',
      'ılıman': 'temperate',
      'gemäßigt': 'temperate',
      'cool': 'cool',
      'serin': 'cool',
      'kühl': 'cool'
    };

    for (const [keyword, zone] of Object.entries(climateZones)) {
      if (answer.toLowerCase().includes(keyword)) {
        flowData.parameters.climateZone = zone;
        flowData.answers.climateZone = zone;
        return true;
      }
    }
    
    return false;
  }

  /**
   * Complete calculation and return results
   */
  completeCalculation(flowData) {
    try {
      // Set default values for missing parameters
      const defaults = {
        ambientTemperature: 35,
        productType: 'general',
        dailyLoad: 0,
        entryTemperature: 20,
        insulationThickness: 100,
        doorOpenings: 10,
        coolingTime: 24,
        safetyFactor: 10,
        climateZone: 'temperate'
      };

      const parameters = { ...defaults, ...flowData.parameters };

      // Validate parameters
      const errors = coldRoomCalculator.validateParameters(parameters);
      if (errors.length > 0) {
        return `❌ **Calculation Error:**\n${errors.join('\n')}\n\nPlease restart the calculation.`;
      }

      // Calculate capacity
      const results = coldRoomCalculator.calculateCapacity(parameters);
      
      // Store results in flow data
      flowData.results = results;
      
      // End the flow
      this.activeFlows.delete(flowData.userId);
      
      // Format and return results
      return coldRoomCalculator.formatResults(results, flowData.language);
      
    } catch (error) {
      logger.error('Error completing calculation:', error);
      return '❌ An error occurred during calculation. Please try again.';
    }
  }

  /**
   * Check if user has active cold room flow
   */
  hasActiveColdRoomFlow(session) {
    return this.activeFlows.has(session.userId);
  }

  /**
   * Cancel active flow
   */
  cancelFlow(session) {
    const userId = session.userId;
    if (this.activeFlows.has(userId)) {
      this.activeFlows.delete(userId);
      logger.info(`Cancelled cold room flow for user ${userId}`);
    }

    const messages = {
      en: "✅ Cold room calculation cancelled. How can I help you?",
      tr: "✅ Soğuk oda hesaplaması iptal edildi. Size nasıl yardımcı olabilirim?",
      de: "✅ Kühlraum-Berechnung abgebrochen. Wie kann ich Ihnen helfen?"
    };

    const language = session.preferences?.language || 'en';
    return messages[language] || messages.en;
  }

  /**
   * Handle navigation commands
   */
  handleNavigationCommand(flowData, input) {
    if (input.includes('show') || input.includes('göster') || input.includes('zeigen')) {
      return this.showCurrentAnswers(flowData);
    } else if (input.includes('back') || input.includes('geri') || input.includes('zurück')) {
      return this.goBack(flowData);
    } else if (input.includes('edit') || input.includes('düzenle') || input.includes('bearbeiten')) {
      return this.handleEditCommand(flowData, input);
    } else if (input.includes('restart') || input.includes('yeniden') || input.includes('neustart')) {
      return this.restartFlow(flowData);
    }
    
    return this.getCurrentQuestion(flowData);
  }

  /**
   * Show current answers
   */
  showCurrentAnswers(flowData) {
    const texts = {
      en: {
        title: '📋 **Your Current Answers:**',
        none: 'No answers recorded yet.',
        back: 'Type "back" to go to previous question',
        edit: 'Type "edit [question number]" to edit an answer'
      },
      tr: {
        title: '📋 **Mevcut Cevaplarınız:**',
        none: 'Henüz cevap kaydedilmedi.',
        back: 'Önceki soruya dönmek için "geri" yazın',
        edit: 'Bir cevabı düzenlemek için "düzenle [soru numarası]" yazın'
      },
      de: {
        title: '📋 **Ihre aktuellen Antworten:**',
        none: 'Noch keine Antworten aufgezeichnet.',
        back: 'Geben Sie "zurück" ein, um zur vorherigen Frage zu gehen',
        edit: 'Geben Sie "bearbeiten [Fragennummer]" ein, um eine Antwort zu bearbeiten'
      }
    };

    const t = texts[flowData.language] || texts.en;
    let response = `${t.title}\n\n`;

    if (Object.keys(flowData.answers).length === 0) {
      response += t.none;
    } else {
      const questionNames = {
        dimensions: 'Room Dimensions',
        temperature: 'Storage Temperature',
        ambientTemperature: 'Ambient Temperature',
        productType: 'Product Type',
        dailyLoad: 'Daily Load',
        entryTemperature: 'Entry Temperature',
        insulationThickness: 'Insulation Thickness',
        doorOpenings: 'Door Openings',
        coolingTime: 'Cooling Time',
        safetyFactor: 'Safety Factor',
        climateZone: 'Climate Zone'
      };

      Object.entries(flowData.answers).forEach(([key, value], index) => {
        const questionName = questionNames[key] || key;
        response += `${index + 1}. **${questionName}:** ${value}\n`;
      });
    }

    response += `\n\n${t.back}\n${t.edit}`;
    return response;
  }

  /**
   * Go back to previous question
   */
  goBack(flowData) {
    if (flowData.currentStep > 0) {
      flowData.currentStep--;
      const lastQuestion = this.questions[flowData.currentStep];
      delete flowData.answers[lastQuestion];
      delete flowData.parameters[lastQuestion];
      
      const messages = {
        en: "Going back to previous question...",
        tr: "Önceki soruya dönülüyor...",
        de: "Zurück zur vorherigen Frage..."
      };
      
      const message = messages[flowData.language] || messages.en;
      return message + '\n\n' + this.getCurrentQuestion(flowData);
    }
    
    return this.getCurrentQuestion(flowData);
  }

  /**
   * Handle edit command
   */
  handleEditCommand(flowData, input) {
    const editMatch = input.match(/edit\s+(\d+)/i) || 
                     input.match(/düzenle\s+(\d+)/i) || 
                     input.match(/bearbeiten\s+(\d+)/i);
    
    if (editMatch) {
      const questionIndex = parseInt(editMatch[1]) - 1;
      if (questionIndex >= 0 && questionIndex < this.questions.length) {
        flowData.currentStep = questionIndex;
        const question = this.questions[questionIndex];
        delete flowData.answers[question];
        delete flowData.parameters[question];
        
        const messages = {
          en: `Editing question ${questionIndex + 1}...`,
          tr: `${questionIndex + 1}. soru düzenleniyor...`,
          de: `Frage ${questionIndex + 1} wird bearbeitet...`
        };
        
        const message = messages[flowData.language] || messages.en;
        return message + '\n\n' + this.getCurrentQuestion(flowData);
      }
    }
    
    return this.getCurrentQuestion(flowData);
  }

  /**
   * Restart flow
   */
  restartFlow(flowData) {
    const userId = flowData.userId;
    const language = flowData.language;
    
    this.activeFlows.delete(userId);
    return this.initializeColdRoomFlow(userId, language);
  }

  /**
   * Check if input is a navigation command
   */
  isNavigationCommand(input) {
    const commands = [
      'show', 'göster', 'zeigen',
      'back', 'geri', 'zurück',
      'edit', 'düzenle', 'bearbeiten',
      'restart', 'yeniden', 'neustart',
      'cancel', 'iptal', 'abbrechen'
    ];
    
    return commands.some(cmd => input.includes(cmd));
  }

  /**
   * Get welcome message
   */
  getWelcomeMessage(language) {
    const messages = {
      en: `❄️ **Cold Room Capacity Calculator**

I'll help you calculate the required cooling capacity for your cold room. I need to ask you a few questions to get accurate results.

**Commands you can use:**
• Type "show" to see your current answers
• Type "back" to go to previous question
• Type "edit [number]" to edit a specific answer
• Type "restart" to start over
• Type "cancel" to exit

Let's begin!`,
      tr: `❄️ **Soğuk Oda Kapasite Hesaplayıcısı**

Soğuk odanız için gerekli soğutma kapasitesini hesaplamanıza yardımcı olacağım. Doğru sonuçlar almak için size birkaç soru sormam gerekiyor.

**Kullanabileceğiniz komutlar:**
• Mevcut cevaplarınızı görmek için "göster" yazın
• Önceki soruya dönmek için "geri" yazın
• Belirli bir cevabı düzenlemek için "düzenle [numara]" yazın
• Yeniden başlamak için "yeniden" yazın
• Çıkmak için "iptal" yazın

Başlayalım!`,
      de: `❄️ **Kühlraum-Kapazitätsrechner**

Ich helfe Ihnen dabei, die erforderliche Kühlkapazität für Ihren Kühlraum zu berechnen. Ich muss Ihnen einige Fragen stellen, um genaue Ergebnisse zu erhalten.

**Befehle, die Sie verwenden können:**
• Geben Sie "zeigen" ein, um Ihre aktuellen Antworten zu sehen
• Geben Sie "zurück" ein, um zur vorherigen Frage zu gehen
• Geben Sie "bearbeiten [Nummer]" ein, um eine bestimmte Antwort zu bearbeiten
• Geben Sie "neustart" ein, um von vorne zu beginnen
• Geben Sie "abbrechen" ein, um zu beenden

Lassen Sie uns beginnen!`
    };

    return messages[language] || messages.en;
  }

  /**
   * Get current question
   */
  getCurrentQuestion(flowData) {
    const questionIndex = flowData.currentStep;
    const question = this.questions[questionIndex];
    
    return this.getQuestionText(question, flowData.language, questionIndex + 1, this.questions.length);
  }

  /**
   * Get question text
   */
  getQuestionText(question, language, current, total) {
    const questions = {
      dimensions: {
        en: `📏 **Question ${current}/${total}: Room Dimensions**

What are the dimensions of your cold room?

Please provide in format: **Length × Width × Height**
Examples: "10m × 6m × 3m" or "10x6x3" or "10 6 3"

**Supported ranges:**
• Length: 1-50 meters
• Width: 1-50 meters  
• Height: 1-10 meters`,
        tr: `📏 **Soru ${current}/${total}: Oda Boyutları**

Soğuk odanızın boyutları nedir?

Lütfen şu formatta verin: **Uzunluk × Genişlik × Yükseklik**
Örnekler: "10m × 6m × 3m" veya "10x6x3" veya "10 6 3"

**Desteklenen aralıklar:**
• Uzunluk: 1-50 metre
• Genişlik: 1-50 metre
• Yükseklik: 1-10 metre`,
        de: `📏 **Frage ${current}/${total}: Raumabmessungen**

Was sind die Abmessungen Ihres Kühlraums?

Bitte geben Sie im Format an: **Länge × Breite × Höhe**
Beispiele: "10m × 6m × 3m" oder "10x6x3" oder "10 6 3"

**Unterstützte Bereiche:**
• Länge: 1-50 Meter
• Breite: 1-50 Meter
• Höhe: 1-10 Meter`
      },
      temperature: {
        en: `🌡️ **Question ${current}/${total}: Storage Temperature**

What temperature do you need to maintain in the cold room?

Please specify the temperature in °C.

**Supported temperatures:**
• -25°C (Deep freeze)
• -20°C (Freezing)
• -18°C (Freezing)
• -15°C (Freezing)
• -5°C (Chilling)
• 0°C (Chilling)
• 5°C (Chilling)
• 12°C (Cooling)`,
        tr: `🌡️ **Soru ${current}/${total}: Depolama Sıcaklığı**

Soğuk odada hangi sıcaklığı korumak istiyorsunuz?

Lütfen sıcaklığı °C cinsinden belirtin.

**Desteklenen sıcaklıklar:**
• -25°C (Derin dondurma)
• -20°C (Dondurma)
• -18°C (Dondurma)
• -15°C (Dondurma)
• -5°C (Soğutma)
• 0°C (Soğutma)
• 5°C (Soğutma)
• 12°C (Soğutma)`,
        de: `🌡️ **Frage ${current}/${total}: Lagertemperatur**

Welche Temperatur soll im Kühlraum aufrechterhalten werden?

Bitte geben Sie die Temperatur in °C an.

**Unterstützte Temperaturen:**
• -25°C (Tiefkühlung)
• -20°C (Gefrieren)
• -18°C (Gefrieren)
• -15°C (Gefrieren)
• -5°C (Kühlen)
• 0°C (Kühlen)
• 5°C (Kühlen)
• 12°C (Kühlen)`
      },
      ambientTemperature: {
        en: `🌡️ **Question ${current}/${total}: Ambient Temperature**

What is the average ambient temperature outside the cold room?

Please specify in °C (typically 20-50°C).

**Examples:**
• 35°C (Hot climate)
• 30°C (Warm climate)
• 25°C (Moderate climate)
• 20°C (Cool climate)`,
        tr: `🌡️ **Soru ${current}/${total}: Ortam Sıcaklığı**

Soğuk odanın dışındaki ortalama ortam sıcaklığı nedir?

Lütfen °C cinsinden belirtin (genellikle 20-50°C).

**Örnekler:**
• 35°C (Sıcak iklim)
• 30°C (Ilık iklim)
• 25°C (Ilıman iklim)
• 20°C (Serin iklim)`,
        de: `🌡️ **Frage ${current}/${total}: Umgebungstemperatur**

Was ist die durchschnittliche Umgebungstemperatur außerhalb des Kühlraums?

Bitte geben Sie in °C an (typischerweise 20-50°C).

**Beispiele:**
• 35°C (Heißes Klima)
• 30°C (Warmes Klima)
• 25°C (Gemäßigtes Klima)
• 20°C (Kühles Klima)`
      },
      productType: {
        en: `📦 **Question ${current}/${total}: Product Type**

What type of products will you store in the cold room?

**Options:**
• Meat products
• Fish products
• Dairy products
• Vegetables
• Fruits
• Frozen products
• General storage`,
        tr: `📦 **Soru ${current}/${total}: Ürün Tipi**

Soğuk odada hangi tip ürünleri saklayacaksınız?

**Seçenekler:**
• Et ürünleri
• Balık ürünleri
• Süt ürünleri
• Sebzeler
• Meyveler
• Donmuş ürünler
• Genel depolama`,
        de: `📦 **Frage ${current}/${total}: Produkttyp**

Welche Art von Produkten werden Sie im Kühlraum lagern?

**Optionen:**
• Fleischprodukte
• Fischprodukte
• Milchprodukte
• Gemüse
• Obst
• Gefrorene Produkte
• Allgemeine Lagerung`
      },
      dailyLoad: {
        en: `⚖️ **Question ${current}/${total}: Daily Product Load**

How much product (in kg) will you load into the cold room daily?

**Examples:**
• 1000 kg/day
• 500 kg/day
• None (no daily loading)`,
        tr: `⚖️ **Soru ${current}/${total}: Günlük Ürün Yükü**

Soğuk odaya günde ne kadar ürün (kg cinsinden) yükleyeceksiniz?

**Örnekler:**
• 1000 kg/gün
• 500 kg/gün
• Yok (günlük yükleme yok)`,
        de: `⚖️ **Frage ${current}/${total}: Tägliche Produktlast**

Wie viel Produkt (in kg) werden Sie täglich in den Kühlraum laden?

**Beispiele:**
• 1000 kg/Tag
• 500 kg/Tag
• Keine (keine tägliche Beladung)`
      },
      entryTemperature: {
        en: `🌡️ **Question ${current}/${total}: Product Entry Temperature**

At what temperature do products enter the cold room?

Please specify in °C (typically 0-40°C).

**Examples:**
• 20°C (Room temperature)
• 15°C (Cooled products)
• 5°C (Pre-chilled products)`,
        tr: `🌡️ **Soru ${current}/${total}: Ürün Giriş Sıcaklığı**

Ürünler hangi sıcaklıkta soğuk odaya giriyor?

Lütfen °C cinsinden belirtin (genellikle 0-40°C).

**Örnekler:**
• 20°C (Oda sıcaklığı)
• 15°C (Soğutulmuş ürünler)
• 5°C (Önceden soğutulmuş ürünler)`,
        de: `🌡️ **Frage ${current}/${total}: Produkteintrittstemperatur**

Bei welcher Temperatur treten Produkte in den Kühlraum ein?

Bitte geben Sie in °C an (typischerweise 0-40°C).

**Beispiele:**
• 20°C (Raumtemperatur)
• 15°C (Gekühlte Produkte)
• 5°C (Vorgekühlte Produkte)`
      },
      insulationThickness: {
        en: `🏗️ **Question ${current}/${total}: Insulation Thickness**

What is the thickness of your wall insulation?

Please specify in mm (typically 50-200mm).

**Examples:**
• 100mm (Standard)
• 120mm (Good insulation)
• 150mm (High insulation)
• 200mm (Premium insulation)`,
        tr: `🏗️ **Soru ${current}/${total}: Yalıtım Kalınlığı**

Duvar yalıtımınızın kalınlığı nedir?

Lütfen mm cinsinden belirtin (genellikle 50-200mm).

**Örnekler:**
• 100mm (Standart)
• 120mm (İyi yalıtım)
• 150mm (Yüksek yalıtım)
• 200mm (Premium yalıtım)`,
        de: `🏗️ **Frage ${current}/${total}: Isolationsdicke**

Wie dick ist Ihre Wandisolierung?

Bitte geben Sie in mm an (typischerweise 50-200mm).

**Beispiele:**
• 100mm (Standard)
• 120mm (Gute Isolierung)
• 150mm (Hohe Isolierung)
• 200mm (Premium-Isolierung)`
      },
      doorOpenings: {
        en: `🚪 **Question ${current}/${total}: Door Openings**

How many times per day will the door be opened?

Please specify the number of openings (typically 0-100).

**Examples:**
• 10 times/day (Low usage)
• 20 times/day (Medium usage)
• 50 times/day (High usage)`,
        tr: `🚪 **Soru ${current}/${total}: Kapı Açılışları**

Kapı günde kaç kez açılacak?

Lütfen açılış sayısını belirtin (genellikle 0-100).

**Örnekler:**
• 10 kez/gün (Düşük kullanım)
• 20 kez/gün (Orta kullanım)
• 50 kez/gün (Yüksek kullanım)`,
        de: `🚪 **Frage ${current}/${total}: Türöffnungen**

Wie oft pro Tag wird die Tür geöffnet?

Bitte geben Sie die Anzahl der Öffnungen an (typischerweise 0-100).

**Beispiele:**
• 10 mal/Tag (Geringe Nutzung)
• 20 mal/Tag (Mittlere Nutzung)
• 50 mal/Tag (Hohe Nutzung)`
      },
      coolingTime: {
        en: `⏰ **Question ${current}/${total}: Cooling Time**

How many hours do you need to cool the room from ambient to storage temperature?

Please specify in hours (typically 1-48).

**Examples:**
• 24 hours (Standard)
• 12 hours (Fast cooling)
• 48 hours (Slow cooling)`,
        tr: `⏰ **Soru ${current}/${total}: Soğutma Süresi**

Odayı ortam sıcaklığından depolama sıcaklığına soğutmak için kaç saat gerekiyor?

Lütfen saat cinsinden belirtin (genellikle 1-48).

**Örnekler:**
• 24 saat (Standart)
• 12 saat (Hızlı soğutma)
• 48 saat (Yavaş soğutma)`,
        de: `⏰ **Frage ${current}/${total}: Kühlzeit**

Wie viele Stunden benötigen Sie, um den Raum von der Umgebungstemperatur auf die Lagertemperatur zu kühlen?

Bitte geben Sie in Stunden an (typischerweise 1-48).

**Beispiele:**
• 24 Stunden (Standard)
• 12 Stunden (Schnelle Kühlung)
• 48 Stunden (Langsame Kühlung)`
      },
      safetyFactor: {
        en: `🛡️ **Question ${current}/${total}: Safety Factor**

What safety factor do you want to apply to the calculation?

Please specify as percentage (0-30%).

**Examples:**
• 10% (Standard)
• 20% (Conservative)
• 0% (Minimum)`,
        tr: `🛡️ **Soru ${current}/${total}: Güvenlik Faktörü**

Hesaplamaya hangi güvenlik faktörünü uygulamak istiyorsunuz?

Lütfen yüzde olarak belirtin (0-30%).

**Örnekler:**
• 10% (Standart)
• 20% (Muhafazakar)
• 0% (Minimum)`,
        de: `🛡️ **Frage ${current}/${total}: Sicherheitsfaktor**

Welchen Sicherheitsfaktor möchten Sie auf die Berechnung anwenden?

Bitte geben Sie als Prozentsatz an (0-30%).

**Beispiele:**
• 10% (Standard)
• 20% (Konservativ)
• 0% (Minimum)`
      },
      climateZone: {
        en: `🌍 **Question ${current}/${total}: Climate Zone**

What is your climate zone?

**Options:**
• Hot climate (tropical)
• Warm climate (subtropical)
• Temperate climate (moderate)
• Cool climate (cold)`,
        tr: `🌍 **Soru ${current}/${total}: İklim Bölgesi**

İklim bölgeniz nedir?

**Seçenekler:**
• Sıcak iklim (tropikal)
• Ilık iklim (subtropikal)
• Ilıman iklim (orta)
• Serin iklim (soğuk)`,
        de: `🌍 **Frage ${current}/${total}: Klimazone**

Was ist Ihre Klimazone?

**Optionen:**
• Heißes Klima (tropisch)
• Warmes Klima (subtropisch)
• Gemäßigtes Klima (moderat)
• Kühles Klima (kalt)`
      }
    };

    return questions[question]?.[language] || questions[question]?.en || 'Question not found';
  }

  /**
   * Get invalid answer message
   */
  getInvalidAnswerMessage(flowData) {
    const messages = {
      en: "❌ I didn't understand that answer. Please try again with the suggested format.",
      tr: "❌ Bu cevabı anlayamadım. Lütfen önerilen formatta tekrar deneyin.",
      de: "❌ Ich habe diese Antwort nicht verstanden. Bitte versuchen Sie es erneut mit dem vorgeschlagenen Format."
    };

    return messages[flowData.language] || messages.en;
  }
}

module.exports = new ColdRoomFlow(); 