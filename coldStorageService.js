const logger = require('./logger');

// Cold storage calculation questions and flow
const COLD_STORAGE_QUESTIONS = [
    {
        id: 'temperature',
        question: {
            en: "❄️ What is the required cold room temperature (°C)?\n\nSupported temperatures: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C\n\nPlease reply with just the temperature number (e.g., -20)",
            tr: "❄️ Gerekli soğuk oda sıcaklığı nedir (°C)?\n\nDesteklenen sıcaklıklar: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C\n\nLütfen sadece sıcaklık numarasını yazın (örn: -20)",
            de: "❄️ Welche Kühlraumtemperatur ist erforderlich (°C)?\n\nUnterstützte Temperaturen: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C\n\nBitte antworten Sie nur mit der Temperaturnummer (z.B. -20)"
        },
        validate: (value) => {
            const temp = parseInt(value);
            const supportedTemps = [12, 5, 0, -5, -15, -18, -20, -25];
            return supportedTemps.includes(temp);
        },
        errorMessage: {
            en: "❌ Please enter a valid temperature from the supported list: 12, 5, 0, -5, -15, -18, -20, -25",
            tr: "❌ Lütfen desteklenen listeden geçerli bir sıcaklık girin: 12, 5, 0, -5, -15, -18, -20, -25",
            de: "❌ Bitte geben Sie eine gültige Temperatur aus der unterstützten Liste ein: 12, 5, 0, -5, -15, -18, -20, -25"
        }
    },
    {
        id: 'products',
        question: {
            en: "📦 What product(s) will be stored inside the room?\n\nCommon products:\n• Meat & Poultry\n• Fish & Seafood\n• Dairy Products\n• Fruits & Vegetables\n• Frozen Foods\n• Beverages\n• Pharmaceuticals\n• Other\n\nPlease specify the main product type:",
            tr: "📦 Odada hangi ürün(ler) depolanacak?\n\nYaygın ürünler:\n• Et ve Tavuk\n• Balık ve Deniz Ürünleri\n• Süt Ürünleri\n• Meyve ve Sebze\n• Dondurulmuş Gıdalar\n• İçecekler\n• İlaçlar\n• Diğer\n\nLütfen ana ürün tipini belirtin:",
            de: "📦 Welche Produkte werden im Raum gelagert?\n\nHäufige Produkte:\n• Fleisch & Geflügel\n• Fisch & Meeresfrüchte\n• Milchprodukte\n• Obst & Gemüse\n• Tiefkühlkost\n• Getränke\n• Pharmazeutika\n• Andere\n\nBitte geben Sie den Hauptprodukttyp an:"
        },
        validate: (value) => value && value.trim().length > 0,
        errorMessage: {
            en: "❌ Please specify the product type to be stored",
            tr: "❌ Lütfen depolanacak ürün tipini belirtin",
            de: "❌ Bitte geben Sie den zu lagernden Produkttyp an"
        }
    },
    {
        id: 'length',
        question: {
            en: "📏 What is the inner length of the room (in meters)?\n\nPlease enter the length in meters (e.g., 10.5):",
            tr: "📏 Odanın iç uzunluğu nedir (metre cinsinden)?\n\nLütfen uzunluğu metre cinsinden girin (örn: 10.5):",
            de: "📏 Wie lang ist der Innenraum (in Metern)?\n\nBitte geben Sie die Länge in Metern ein (z.B. 10.5):"
        },
        validate: (value) => {
            const length = parseFloat(value);
            return !isNaN(length) && length > 0 && length <= 100;
        },
        errorMessage: {
            en: "❌ Please enter a valid length between 0.1 and 100 meters",
            tr: "❌ Lütfen 0.1 ile 100 metre arasında geçerli bir uzunluk girin",
            de: "❌ Bitte geben Sie eine gültige Länge zwischen 0.1 und 100 Metern ein"
        }
    },
    {
        id: 'width',
        question: {
            en: "📐 What is the inner width of the room (in meters)?\n\nPlease enter the width in meters (e.g., 8.0):",
            tr: "📐 Odanın iç genişliği nedir (metre cinsinden)?\n\nLütfen genişliği metre cinsinden girin (örn: 8.0):",
            de: "📐 Wie breit ist der Innenraum (in Metern)?\n\nBitte geben Sie die Breite in Metern ein (z.B. 8.0):"
        },
        validate: (value) => {
            const width = parseFloat(value);
            return !isNaN(width) && width > 0 && width <= 100;
        },
        errorMessage: {
            en: "❌ Please enter a valid width between 0.1 and 100 meters",
            tr: "❌ Lütfen 0.1 ile 100 metre arasında geçerli bir genişlik girin",
            de: "❌ Bitte geben Sie eine gültige Breite zwischen 0.1 und 100 Metern ein"
        }
    },
    {
        id: 'height',
        question: {
            en: "📏 What is the inner height of the room (in meters)?\n\nPlease enter the height in meters (e.g., 3.5):",
            tr: "📏 Odanın iç yüksekliği nedir (metre cinsinden)?\n\nLütfen yüksekliği metre cinsinden girin (örn: 3.5):",
            de: "📏 Wie hoch ist der Innenraum (in Metern)?\n\nBitte geben Sie die Höhe in Metern ein (z.B. 3.5):"
        },
        validate: (value) => {
            const height = parseFloat(value);
            return !isNaN(height) && height > 0 && height <= 20;
        },
        errorMessage: {
            en: "❌ Please enter a valid height between 0.1 and 20 meters",
            tr: "❌ Lütfen 0.1 ile 20 metre arasında geçerli bir yükseklik girin",
            de: "❌ Bitte geben Sie eine gültige Höhe zwischen 0.1 und 20 Metern ein"
        }
    },
    {
        id: 'insulation',
        question: {
            en: "🧱 What is the thickness of insulation panels?\n\nCommon options:\n• 8 cm\n• 10 cm\n• 12 cm\n• 15 cm\n• 20 cm\n\nPlease enter the thickness in cm (e.g., 10):",
            tr: "🧱 Yalıtım panellerinin kalınlığı nedir?\n\nYaygın seçenekler:\n• 8 cm\n• 10 cm\n• 12 cm\n• 15 cm\n• 20 cm\n\nLütfen kalınlığı cm cinsinden girin (örn: 10):",
            de: "🧱 Welche Dicke haben die Isolierpaneele?\n\nHäufige Optionen:\n• 8 cm\n• 10 cm\n• 12 cm\n• 15 cm\n• 20 cm\n\nBitte geben Sie die Dicke in cm ein (z.B. 10):"
        },
        validate: (value) => {
            const thickness = parseInt(value);
            return !isNaN(thickness) && thickness >= 5 && thickness <= 30;
        },
        errorMessage: {
            en: "❌ Please enter a valid insulation thickness between 5 and 30 cm",
            tr: "❌ Lütfen 5 ile 30 cm arasında geçerli bir yalıtım kalınlığı girin",
            de: "❌ Bitte geben Sie eine gültige Isolierdicke zwischen 5 und 30 cm ein"
        }
    },
    {
        id: 'floorInsulation',
        question: {
            en: "🏠 Is there floor insulation?\n\nPlease answer:\n• Yes\n• No\n\nFloor insulation is recommended for better energy efficiency:",
            tr: "🏠 Zemin yalıtımı var mı?\n\nLütfen cevap verin:\n• Evet\n• Hayır\n\nDaha iyi enerji verimliliği için zemin yalıtımı önerilir:",
            de: "🏠 Gibt es eine Fußbodenisolierung?\n\nBitte antworten Sie:\n• Ja\n• Nein\n\nFußbodenisolierung wird für bessere Energieeffizienz empfohlen:"
        },
        validate: (value) => {
            const answer = value.toLowerCase().trim();
            return ['yes', 'no', 'evet', 'hayır', 'hayir', 'ja', 'nein'].includes(answer);
        },
        errorMessage: {
            en: "❌ Please answer with 'Yes' or 'No'",
            tr: "❌ Lütfen 'Evet' veya 'Hayır' ile cevap verin",
            de: "❌ Bitte antworten Sie mit 'Ja' oder 'Nein'"
        }
    },
    {
        id: 'doorFrequency',
        question: {
            en: "🚪 How often will the door be opened daily?\n\nOptions:\n• Low (1-5 times)\n• Medium (6-20 times)\n• High (21-50 times)\n• Very High (50+ times)\n\nOr enter specific number of times per day:",
            tr: "🚪 Kapı günde kaç kez açılacak?\n\nSeçenekler:\n• Düşük (1-5 kez)\n• Orta (6-20 kez)\n• Yüksek (21-50 kez)\n• Çok Yüksek (50+ kez)\n\nVeya günlük belirli sayıyı girin:",
            de: "🚪 Wie oft wird die Tür täglich geöffnet?\n\nOptionen:\n• Niedrig (1-5 mal)\n• Mittel (6-20 mal)\n• Hoch (21-50 mal)\n• Sehr Hoch (50+ mal)\n\nOder geben Sie die spezifische Anzahl pro Tag ein:"
        },
        validate: (value) => {
            const answer = value.toLowerCase().trim();
            const frequency = parseInt(value);
            return ['low', 'medium', 'high', 'very high', 'düşük', 'orta', 'yüksek', 'çok yüksek', 'niedrig', 'mittel', 'hoch', 'sehr hoch'].includes(answer) || 
                   (!isNaN(frequency) && frequency >= 0 && frequency <= 200);
        },
        errorMessage: {
            en: "❌ Please enter a frequency category or number between 0-200",
            tr: "❌ Lütfen frekans kategorisi veya 0-200 arası sayı girin",
            de: "❌ Bitte geben Sie eine Frequenzkategorie oder Zahl zwischen 0-200 ein"
        }
    },
    {
        id: 'loadingAmount',
        question: {
            en: "⚖️ What is the daily loading/unloading amount (in kg)?\n\nThis includes:\n• Products entering the room\n• Products leaving the room\n• Total daily throughput\n\nPlease enter the amount in kg (e.g., 500):",
            tr: "⚖️ Günlük yükleme/boşaltma miktarı nedir (kg cinsinden)?\n\nBu şunları içerir:\n• Odaya giren ürünler\n• Odadan çıkan ürünler\n• Toplam günlük işlem miktarı\n\nLütfen miktarı kg cinsinden girin (örn: 500):",
            de: "⚖️ Wie viel wird täglich be-/entladen (in kg)?\n\nDies umfasst:\n• Produkte, die in den Raum gelangen\n• Produkte, die den Raum verlassen\n• Gesamter täglicher Durchsatz\n\nBitte geben Sie die Menge in kg ein (z.B. 500):"
        },
        validate: (value) => {
            const amount = parseFloat(value);
            return !isNaN(amount) && amount >= 0 && amount <= 100000;
        },
        errorMessage: {
            en: "❌ Please enter a valid amount between 0 and 100,000 kg",
            tr: "❌ Lütfen 0 ile 100.000 kg arasında geçerli bir miktar girin",
            de: "❌ Bitte geben Sie eine gültige Menge zwischen 0 und 100.000 kg ein"
        }
    },
    {
        id: 'productTemperature',
        question: {
            en: "🌡️ What is the temperature of products when they enter the room (°C)?\n\nCommon temperatures:\n• Room temperature (20-25°C)\n• Pre-cooled (5-10°C)\n• Frozen (-18°C)\n• Other specific temperature\n\nPlease enter the temperature in °C (e.g., 20):",
            tr: "🌡️ Ürünler odaya girdiğinde sıcaklıkları nedir (°C)?\n\nYaygın sıcaklıklar:\n• Oda sıcaklığı (20-25°C)\n• Ön soğutulmuş (5-10°C)\n• Donmuş (-18°C)\n• Diğer özel sıcaklık\n\nLütfen sıcaklığı °C cinsinden girin (örn: 20):",
            de: "🌡️ Welche Temperatur haben die Produkte beim Eingang in den Raum (°C)?\n\nHäufige Temperaturen:\n• Raumtemperatur (20-25°C)\n• Vorgekühlt (5-10°C)\n• Gefroren (-18°C)\n• Andere spezifische Temperatur\n\nBitte geben Sie die Temperatur in °C ein (z.B. 20):"
        },
        validate: (value) => {
            const temp = parseFloat(value);
            return !isNaN(temp) && temp >= -30 && temp <= 60;
        },
        errorMessage: {
            en: "❌ Please enter a valid temperature between -30°C and 60°C",
            tr: "❌ Lütfen -30°C ile 60°C arasında geçerli bir sıcaklık girin",
            de: "❌ Bitte geben Sie eine gültige Temperatur zwischen -30°C und 60°C ein"
        }
    }
];

// Product heat load factors (W/kg)
const PRODUCT_HEAT_LOADS = {
    'meat': 0.8,
    'poultry': 0.9,
    'fish': 1.0,
    'dairy': 0.7,
    'fruits': 0.6,
    'vegetables': 0.5,
    'frozen': 0.3,
    'beverages': 0.4,
    'pharmaceuticals': 0.6,
    'other': 0.7
};

// System type recommendations based on cooling capacity
const SYSTEM_RECOMMENDATIONS = {
    small: { maxKW: 5, type: 'Monoblock Unit', description: 'Compact, easy installation' },
    medium: { maxKW: 15, type: 'Split System', description: 'Flexible installation, quieter operation' },
    large: { maxKW: 50, type: 'Industrial System', description: 'High capacity, modular design' },
    industrial: { maxKW: Infinity, type: 'Custom Industrial System', description: 'Tailored solution for large facilities' }
};

/**
 * Detect language from user message
 * @param {string} message - User message
 * @returns {string} - Language code (en, tr, de)
 */
function detectLanguage(message) {
    const turkishWords = ['soğuk', 'oda', 'sıcaklık', 'hesapla', 'kapasite', 'evet', 'hayır', 'metre'];
    const germanWords = ['kühl', 'raum', 'temperatur', 'berechnen', 'kapazität', 'ja', 'nein', 'meter'];
    
    const lowerMessage = message.toLowerCase();
    
    let turkishScore = 0;
    let germanScore = 0;
    
    turkishWords.forEach(word => {
        if (lowerMessage.includes(word)) turkishScore++;
    });
    
    germanWords.forEach(word => {
        if (lowerMessage.includes(word)) germanScore++;
    });
    
    if (turkishScore > germanScore && turkishScore > 0) return 'tr';
    if (germanScore > turkishScore && germanScore > 0) return 'de';
    
    return 'en';
}

/**
 * Initialize cold storage calculation session
 * @param {Object} session - User session
 * @param {string} language - Language code
 */
function initializeColdStorageSession(session, language = 'en') {
    session.coldStorage = {
        active: true,
        currentStep: 0,
        language: language,
        answers: {},
        startTime: new Date().toISOString()
    };
    
    logger.info(`Cold storage session initialized for user ${session.userId} in ${language}`);
}

/**
 * Get current question for cold storage calculation
 * @param {Object} session - User session
 * @returns {string} - Current question text
 */
function getCurrentQuestion(session) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return null;
    }
    
    const currentStep = session.coldStorage.currentStep;
    const language = session.coldStorage.language;
    
    if (currentStep >= COLD_STORAGE_QUESTIONS.length) {
        return null;
    }
    
    const question = COLD_STORAGE_QUESTIONS[currentStep];
    return question.question[language] || question.question.en;
}

/**
 * Process user answer for cold storage calculation
 * @param {Object} session - User session
 * @param {string} answer - User's answer
 * @returns {Object} - Processing result
 */
function processAnswer(session, answer) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return { success: false, message: 'No active cold storage session' };
    }
    
    const currentStep = session.coldStorage.currentStep;
    const language = session.coldStorage.language;
    
    if (currentStep >= COLD_STORAGE_QUESTIONS.length) {
        return { success: false, message: 'All questions completed' };
    }
    
    const question = COLD_STORAGE_QUESTIONS[currentStep];
    
    // Validate answer
    if (!question.validate(answer)) {
        return {
            success: false,
            message: question.errorMessage[language] || question.errorMessage.en
        };
    }
    
    // Store answer
    session.coldStorage.answers[question.id] = answer;
    session.coldStorage.currentStep++;
    
    logger.info(`Cold storage answer recorded: ${question.id} = ${answer}`);
    
    // Check if all questions are completed
    if (session.coldStorage.currentStep >= COLD_STORAGE_QUESTIONS.length) {
        return {
            success: true,
            completed: true,
            result: calculateColdStorageCapacity(session)
        };
    }
    
    // Return next question
    return {
        success: true,
        completed: false,
        nextQuestion: getCurrentQuestion(session)
    };
}

/**
 * Calculate cold storage capacity based on collected answers
 * @param {Object} session - User session
 * @returns {Object} - Calculation results
 */
function calculateColdStorageCapacity(session) {
    const answers = session.coldStorage.answers;
    const language = session.coldStorage.language;
    
    try {
        // Parse answers
        const temperature = parseInt(answers.temperature);
        const length = parseFloat(answers.length);
        const width = parseFloat(answers.width);
        const height = parseFloat(answers.height);
        const insulation = parseInt(answers.insulation);
        const hasFloorInsulation = ['yes', 'evet', 'ja'].includes(answers.floorInsulation.toLowerCase());
        const loadingAmount = parseFloat(answers.loadingAmount);
        const productTemperature = parseFloat(answers.productTemperature);
        
        // Calculate room volume
        const volume = length * width * height;
        
        // Parse door frequency
        let doorOpenings = 0;
        const doorFreq = answers.doorFrequency.toLowerCase();
        if (doorFreq.includes('low') || doorFreq.includes('düşük') || doorFreq.includes('niedrig')) {
            doorOpenings = 3;
        } else if (doorFreq.includes('medium') || doorFreq.includes('orta') || doorFreq.includes('mittel')) {
            doorOpenings = 13;
        } else if (doorFreq.includes('high') || doorFreq.includes('yüksek') || doorFreq.includes('hoch')) {
            doorOpenings = 35;
        } else if (doorFreq.includes('very') || doorFreq.includes('çok') || doorFreq.includes('sehr')) {
            doorOpenings = 75;
        } else {
            doorOpenings = parseInt(answers.doorFrequency) || 10;
        }
        
        // Base capacity calculation (simplified version)
        let baseCapacity = 0;
        
        // Room cooling load based on volume and temperature
        const tempDiff = 35 - temperature; // Assuming 35°C ambient
        baseCapacity += volume * tempDiff * 0.5; // Base thermal load
        
        // Product load
        const productType = answers.products.toLowerCase();
        let productHeatLoad = PRODUCT_HEAT_LOADS.other;
        
        Object.keys(PRODUCT_HEAT_LOADS).forEach(key => {
            if (productType.includes(key)) {
                productHeatLoad = PRODUCT_HEAT_LOADS[key];
            }
        });
        
        // Product cooling load
        const productTempDiff = Math.max(0, productTemperature - temperature);
        const productLoad = loadingAmount * productTempDiff * productHeatLoad * 0.001; // Convert to kW
        baseCapacity += productLoad;
        
        // Infiltration load (door openings)
        const infiltrationLoad = doorOpenings * volume * 0.02; // Simplified infiltration
        baseCapacity += infiltrationLoad;
        
        // Insulation factor
        const insulationFactor = Math.max(0.8, 1 - (insulation - 8) * 0.02);
        baseCapacity *= insulationFactor;
        
        // Floor insulation penalty
        if (!hasFloorInsulation) {
            baseCapacity *= 1.15; // 15% penalty for no floor insulation
        }
        
        // Safety factor
        const safetyFactor = 1.2;
        const finalCapacity = Math.round(baseCapacity * safetyFactor);
        
        // System recommendation
        let systemType = 'Custom System';
        let systemDescription = 'Contact us for detailed specifications';
        
        Object.keys(SYSTEM_RECOMMENDATIONS).forEach(key => {
            const rec = SYSTEM_RECOMMENDATIONS[key];
            if (finalCapacity <= rec.maxKW) {
                systemType = rec.type;
                systemDescription = rec.description;
                return;
            }
        });
        
        // End cold storage session
        session.coldStorage.active = false;
        session.coldStorage.completedAt = new Date().toISOString();
        
        return {
            success: true,
            capacity: finalCapacity,
            volume: Math.round(volume * 100) / 100,
            systemType: systemType,
            systemDescription: systemDescription,
            calculations: {
                baseCapacity: Math.round(baseCapacity),
                productLoad: Math.round(productLoad),
                infiltrationLoad: Math.round(infiltrationLoad),
                safetyFactor: safetyFactor,
                finalCapacity: finalCapacity
            },
            parameters: {
                temperature: temperature,
                dimensions: `${length}m × ${width}m × ${height}m`,
                volume: volume,
                insulation: insulation,
                floorInsulation: hasFloorInsulation,
                doorOpenings: doorOpenings,
                loadingAmount: loadingAmount,
                productTemperature: productTemperature,
                products: answers.products
            }
        };
        
    } catch (error) {
        logger.error('Error calculating cold storage capacity:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Format calculation results for display
 * @param {Object} result - Calculation results
 * @param {string} language - Language code
 * @returns {string} - Formatted results
 */
function formatResults(result, language = 'en') {
    const messages = {
        en: {
            title: "❄️ Cold Storage Capacity Calculation Results",
            roomSpecs: "🏠 Room Specifications",
            dimensions: "Dimensions",
            volume: "Volume",
            temperature: "Target Temperature",
            insulation: "Insulation Thickness",
            floorInsulation: "Floor Insulation",
            capacity: "💡 Cooling Requirements",
            totalCapacity: "Total Cooling Capacity",
            capacityPerM3: "Capacity per m³",
            systemRec: "🔧 System Recommendation",
            systemType: "Recommended System",
            description: "Description",
            details: "📊 Calculation Details",
            baseCapacity: "Base Cooling Load",
            productLoad: "Product Cooling Load",
            infiltrationLoad: "Infiltration Load",
            safetyFactor: "Safety Factor",
            finalCapacity: "Final Capacity",
            parameters: "⚙️ Input Parameters",
            products: "Products",
            doorOpenings: "Daily Door Openings",
            loadingAmount: "Daily Loading Amount",
            productTemp: "Product Entry Temperature",
            yes: "Yes",
            no: "No"
        },
        tr: {
            title: "❄️ Soğuk Depo Kapasite Hesaplama Sonuçları",
            roomSpecs: "🏠 Oda Özellikleri",
            dimensions: "Boyutlar",
            volume: "Hacim",
            temperature: "Hedef Sıcaklık",
            insulation: "Yalıtım Kalınlığı",
            floorInsulation: "Zemin Yalıtımı",
            capacity: "💡 Soğutma Gereksinimleri",
            totalCapacity: "Toplam Soğutma Kapasitesi",
            capacityPerM3: "m³ başına kapasite",
            systemRec: "🔧 Sistem Önerisi",
            systemType: "Önerilen Sistem",
            description: "Açıklama",
            details: "📊 Hesaplama Detayları",
            baseCapacity: "Temel Soğutma Yükü",
            productLoad: "Ürün Soğutma Yükü",
            infiltrationLoad: "Sızıntı Yükü",
            safetyFactor: "Güvenlik Faktörü",
            finalCapacity: "Final Kapasite",
            parameters: "⚙️ Girdi Parametreleri",
            products: "Ürünler",
            doorOpenings: "Günlük Kapı Açılışı",
            loadingAmount: "Günlük Yükleme Miktarı",
            productTemp: "Ürün Giriş Sıcaklığı",
            yes: "Evet",
            no: "Hayır"
        },
        de: {
            title: "❄️ Kältelagerkapazität Berechnungsergebnisse",
            roomSpecs: "🏠 Raumspezifikationen",
            dimensions: "Abmessungen",
            volume: "Volumen",
            temperature: "Zieltemperatur",
            insulation: "Isolierdicke",
            floorInsulation: "Bodenisolierung",
            capacity: "💡 Kühlanforderungen",
            totalCapacity: "Gesamtkühlkapazität",
            capacityPerM3: "Kapazität pro m³",
            systemRec: "🔧 Systemempfehlung",
            systemType: "Empfohlenes System",
            description: "Beschreibung",
            details: "📊 Berechnungsdetails",
            baseCapacity: "Grundkühllast",
            productLoad: "Produktkühllast",
            infiltrationLoad: "Infiltrationslast",
            safetyFactor: "Sicherheitsfaktor",
            finalCapacity: "Endkapazität",
            parameters: "⚙️ Eingabeparameter",
            products: "Produkte",
            doorOpenings: "Tägliche Türöffnungen",
            loadingAmount: "Tägliche Lademenge",
            productTemp: "Produkteingangstemperatur",
            yes: "Ja",
            no: "Nein"
        }
    };
    
    const msg = messages[language] || messages.en;
    
    let response = `${msg.title}\n\n`;
    
    // Room specifications
    response += `${msg.roomSpecs}:\n`;
    response += `• ${msg.dimensions}: ${result.parameters.dimensions}\n`;
    response += `• ${msg.volume}: ${result.volume} m³\n`;
    response += `• ${msg.temperature}: ${result.parameters.temperature}°C\n`;
    response += `• ${msg.insulation}: ${result.parameters.insulation} cm\n`;
    response += `• ${msg.floorInsulation}: ${result.parameters.floorInsulation ? msg.yes : msg.no}\n\n`;
    
    // Cooling requirements
    response += `${msg.capacity}:\n`;
    response += `• ${msg.totalCapacity}: *${result.capacity.toLocaleString()} W*\n`;
    response += `• ${msg.capacityPerM3}: *${Math.round(result.capacity / result.volume)} W/m³*\n\n`;
    
    // System recommendation
    response += `${msg.systemRec}:\n`;
    response += `• ${msg.systemType}: *${result.systemType}*\n`;
    response += `• ${msg.description}: ${result.systemDescription}\n\n`;
    
    // Calculation details
    response += `${msg.details}:\n`;
    response += `• ${msg.baseCapacity}: ${result.calculations.baseCapacity.toLocaleString()} W\n`;
    response += `• ${msg.productLoad}: ${result.calculations.productLoad.toLocaleString()} W\n`;
    response += `• ${msg.infiltrationLoad}: ${result.calculations.infiltrationLoad.toLocaleString()} W\n`;
    response += `• ${msg.safetyFactor}: ${result.calculations.safetyFactor}×\n`;
    response += `• ${msg.finalCapacity}: *${result.calculations.finalCapacity.toLocaleString()} W*\n\n`;
    
    // Input parameters
    response += `${msg.parameters}:\n`;
    response += `• ${msg.products}: ${result.parameters.products}\n`;
    response += `• ${msg.doorOpenings}: ${result.parameters.doorOpenings}\n`;
    response += `• ${msg.loadingAmount}: ${result.parameters.loadingAmount} kg\n`;
    response += `• ${msg.productTemp}: ${result.parameters.productTemperature}°C`;
    
    return response;
}

/**
 * Check if message is a cold storage calculation request
 * @param {string} message - User message
 * @returns {boolean} - True if it's a cold storage request
 */
function isColdStorageRequest(message) {
    const coldStorageKeywords = [
        'cold storage', 'cold room', 'refrigeration', 'cooling capacity',
        'soğuk depo', 'soğuk oda', 'soğutma kapasitesi', 'dondurucu',
        'kühlhaus', 'kühlraum', 'kühlkapazität', 'kältetechnik',
        'calculate capacity', 'kapasite hesapla', 'kapazität berechnen',
        'cold storage calculation', 'soğuk depo hesaplama', 'kühlraum berechnung'
    ];
    
    const lowerMessage = message.toLowerCase();
    return coldStorageKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Handle cold storage calculation request
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {string} - Response message
 */
function handleColdStorageRequest(session, message) {
    try {
        const language = detectLanguage(message);
        
        // Check if there's an active cold storage session
        if (session.coldStorage && session.coldStorage.active) {
            // Process the answer
            const result = processAnswer(session, message);
            
            if (!result.success) {
                return result.message;
            }
            
            if (result.completed) {
                // Calculation completed
                if (result.result.success) {
                    return formatResults(result.result, language);
                } else {
                    const errorMessages = {
                        en: `❌ Calculation error: ${result.result.error}`,
                        tr: `❌ Hesaplama hatası: ${result.result.error}`,
                        de: `❌ Berechnungsfehler: ${result.result.error}`
                    };
                    return errorMessages[language] || errorMessages.en;
                }
            } else {
                // Return next question
                return result.nextQuestion;
            }
        } else {
            // Start new cold storage calculation
            initializeColdStorageSession(session, language);
            const welcomeMessages = {
                en: `🏗️ Welcome to Cold Storage Capacity Calculator!\n\nI'll guide you through 10 questions to calculate the optimal cooling capacity for your cold storage room.\n\n${getCurrentQuestion(session)}`,
                tr: `🏗️ Soğuk Depo Kapasite Hesaplayıcıya Hoş Geldiniz!\n\nSoğuk depo odanız için optimal soğutma kapasitesini hesaplamak için 10 soruda size rehberlik edeceğim.\n\n${getCurrentQuestion(session)}`,
                de: `🏗️ Willkommen zum Kältelager-Kapazitätsrechner!\n\nIch führe Sie durch 10 Fragen, um die optimale Kühlkapazität für Ihren Kühlraum zu berechnen.\n\n${getCurrentQuestion(session)}`
            };
            
            return welcomeMessages[language] || welcomeMessages.en;
        }
        
    } catch (error) {
        logger.error('Error handling cold storage request:', error);
        
        const errorMessages = {
            en: "❌ An error occurred while processing your request. Please try again.",
            tr: "❌ İsteğiniz işlenirken bir hata oluştu. Lütfen tekrar deneyin.",
            de: "❌ Beim Verarbeiten Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
        };
        
        const language = detectLanguage(message);
        return errorMessages[language] || errorMessages.en;
    }
}

/**
 * Cancel active cold storage session
 * @param {Object} session - User session
 * @returns {string} - Cancellation message
 */
function cancelColdStorageSession(session) {
    if (session.coldStorage && session.coldStorage.active) {
        session.coldStorage.active = false;
        session.coldStorage.cancelledAt = new Date().toISOString();
        
        const language = session.coldStorage.language || 'en';
        const messages = {
            en: "❌ Cold storage calculation cancelled. Type 'cold storage' to start again.",
            tr: "❌ Soğuk depo hesaplaması iptal edildi. Tekrar başlamak için 'soğuk depo' yazın.",
            de: "❌ Kältelagerberechnung abgebrochen. Geben Sie 'Kühlraum' ein, um erneut zu beginnen."
        };
        
        return messages[language] || messages.en;
    }
    
    return null;
}

/**
 * Check if user wants to cancel current session
 * @param {string} message - User message
 * @returns {boolean} - True if user wants to cancel
 */
function isCancelRequest(message) {
    const cancelKeywords = [
        'cancel', 'stop', 'quit', 'exit', 'iptal', 'dur', 'çık', 'abbrechen', 'stopp', 'beenden'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return cancelKeywords.includes(lowerMessage);
}

module.exports = {
    isColdStorageRequest,
    handleColdStorageRequest,
    cancelColdStorageSession,
    isCancelRequest,
    detectLanguage,
    getCurrentQuestion,
    processAnswer,
    formatResults
};