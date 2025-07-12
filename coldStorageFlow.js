const logger = require('./logger');
const whatsappService = require('./whatsappService');
const sessionManager = require('./sessionManager');
const { calculateCapacity } = require('./coldRoomCalculator');

/**
 * Cold Storage Flow Handler
 * Manages the step-by-step questionnaire for cold storage calculations
 */

// Question templates
const questions = {
    en: {
        temperature: "🌡️ What is the required cold room temperature? (°C)\n\n❄️ Supported temperatures: 12, 5, 0, -5, -15, -18, -20, -25°C",
        products: "📦 What product(s) will be stored inside the room?\n\n🍎 Example: Fruits, vegetables, meat, dairy, etc.",
        length: "📏 What is the inner length of the room? (in meters)\n\n📐 Example: 5.5",
        width: "📏 What is the inner width of the room? (in meters)\n\n📐 Example: 3.2",
        height: "📏 What is the inner height of the room? (in meters)\n\n📐 Example: 2.8",
        insulation: "🛡️ What is the thickness of insulation panels?\n\n📏 Example: 8 cm, 10 cm, 12 cm",
        floorInsulation: "🏠 Is there floor insulation?\n\n✅ Reply: Yes or No",
        doorFrequency: "🚪 How often will the door be opened daily?\n\n🔢 Example: 10 times, rarely, frequently",
        loadingAmount: "⚖️ What is the daily loading/unloading amount? (in kg)\n\n📦 Example: 500 kg",
        entryTemperature: "🌡️ What is the temperature of products when they enter the room? (°C)\n\n📊 Example: 20°C",
        coolingDuration: "⏱️ What is the required cooling duration? (in hours)\n\n🕐 Example: 24 hours, 48 hours",
        coolingType: "❄️ What type of cooling system do you prefer?\n\n🔧 Options: Air cooling, Direct expansion, Evaporative",
        unitPreference: "🏭 What type of unit do you prefer?\n\n⚙️ Options: Monoblock, Split system, Modular system",
        electricityType: "⚡ What type of electricity supply?\n\n🔌 Options: Single phase (220V), Three phase (380V/400V)",
        installationCity: "🏙️ In which city will the installation be?\n\n📍 Example: Istanbul, Berlin, London",
        ambientHeatSource: "🌡️ Are there any ambient heat sources nearby?\n\n🔥 Example: Ovens, boilers, direct sunlight",
        usageArea: "📐 What is the usable area or number of pallets?\n\n📦 Example: 50 m² or 20 pallets",
        drawingPhoto: "📋 Do you have technical drawings or photos of the space?\n\n📸 Reply: Yes or No (you can send them later)"
    },
    tr: {
        temperature: "🌡️ Gerekli soğuk oda sıcaklığı nedir? (°C)\n\n❄️ Desteklenen sıcaklıklar: 12, 5, 0, -5, -15, -18, -20, -25°C",
        products: "📦 Oda içerisinde hangi ürün(ler) saklanacak?\n\n🍎 Örnek: Meyve, sebze, et, süt ürünleri, vb.",
        length: "📏 Odanın iç uzunluğu nedir? (metre cinsinden)\n\n📐 Örnek: 5.5",
        width: "📏 Odanın iç genişliği nedir? (metre cinsinden)\n\n📐 Örnek: 3.2",
        height: "📏 Odanın iç yüksekliği nedir? (metre cinsinden)\n\n📐 Örnek: 2.8",
        insulation: "🛡️ Yalıtım panellerinin kalınlığı nedir?\n\n📏 Örnek: 8 cm, 10 cm, 12 cm",
        floorInsulation: "🏠 Zemin yalıtımı var mı?\n\n✅ Cevap: Evet veya Hayır",
        doorFrequency: "🚪 Kapı günde kaç kez açılacak?\n\n🔢 Örnek: 10 kez, nadir, sık sık",
        loadingAmount: "⚖️ Günlük yükleme/boşaltma miktarı nedir? (kg cinsinden)\n\n📦 Örnek: 500 kg",
        entryTemperature: "🌡️ Ürünler odaya girdiğinde sıcaklığı nedir? (°C)\n\n📊 Örnek: 20°C",
        coolingDuration: "⏱️ Gerekli soğuma süresi nedir? (saat cinsinden)\n\n🕐 Örnek: 24 saat, 48 saat",
        coolingType: "❄️ Hangi tip soğutma sistemi tercih ediyorsunuz?\n\n🔧 Seçenekler: Hava soğutmalı, Direkt ekspansiyonlu, Evaporatif",
        unitPreference: "🏭 Hangi tip ünite tercih ediyorsunuz?\n\n⚙️ Seçenekler: Monoblock, Split sistem, Modüler sistem",
        electricityType: "⚡ Elektrik tipi nedir?\n\n🔌 Seçenekler: Tek faz (220V), Üç faz (380V/400V)",
        installationCity: "🏙️ Kurulum hangi şehirde yapılacak?\n\n📍 Örnek: İstanbul, Ankara, İzmir",
        ambientHeatSource: "🌡️ Çevrede ısı kaynağı var mı?\n\n🔥 Örnek: Fırınlar, kazanlar, doğrudan güneş ışığı",
        usageArea: "📐 Kullanım alanı veya palet sayısı nedir?\n\n📦 Örnek: 50 m² veya 20 palet",
        drawingPhoto: "📋 Mekanın teknik çizimi veya fotoğrafı var mı?\n\n📸 Cevap: Evet veya Hayır (daha sonra gönderebilirsiniz)"
    },
    de: {
        temperature: "🌡️ Welche Kühlraumtemperatur ist erforderlich? (°C)\n\n❄️ Unterstützte Temperaturen: 12, 5, 0, -5, -15, -18, -20, -25°C",
        products: "📦 Welche Produkte werden im Raum gelagert?\n\n🍎 Beispiel: Obst, Gemüse, Fleisch, Milchprodukte, usw.",
        length: "📏 Wie lang ist der Raum innen? (in Metern)\n\n📐 Beispiel: 5.5",
        width: "📏 Wie breit ist der Raum innen? (in Metern)\n\n📐 Beispiel: 3.2",
        height: "📏 Wie hoch ist der Raum innen? (in Metern)\n\n📐 Beispiel: 2.8",
        insulation: "🛡️ Wie dick sind die Isolierpaneele?\n\n📏 Beispiel: 8 cm, 10 cm, 12 cm",
        floorInsulation: "🏠 Gibt es eine Bodenisolierung?\n\n✅ Antwort: Ja oder Nein",
        doorFrequency: "🚪 Wie oft wird die Tür täglich geöffnet?\n\n🔢 Beispiel: 10 mal, selten, häufig",
        loadingAmount: "⚖️ Wie viel wird täglich be-/entladen? (in kg)\n\n📦 Beispiel: 500 kg",
        entryTemperature: "🌡️ Welche Temperatur haben die Produkte beim Einlagern? (°C)\n\n📊 Beispiel: 20°C",
        coolingDuration: "⏱️ Wie lange soll die Kühlung dauern? (in Stunden)\n\n🕐 Beispiel: 24 Stunden, 48 Stunden",
        coolingType: "❄️ Welchen Kühlungstyp bevorzugen Sie?\n\n🔧 Optionen: Luftkühlung, Direktexpansion, Verdunstungskühlung",
        unitPreference: "🏭 Welchen Gerätetyp bevorzugen Sie?\n\n⚙️ Optionen: Monoblock, Split-System, Modulares System",
        electricityType: "⚡ Welcher Stromtyp?\n\n🔌 Optionen: Einphasig (220V), Dreiphasig (380V/400V)",
        installationCity: "🏙️ In welcher Stadt erfolgt die Installation?\n\n📍 Beispiel: Berlin, München, Hamburg",
        ambientHeatSource: "🌡️ Gibt es Wärmequellen in der Umgebung?\n\n🔥 Beispiel: Öfen, Kessel, direktes Sonnenlicht",
        usageArea: "📐 Wie groß ist die Nutzfläche oder wie viele Paletten?\n\n📦 Beispiel: 50 m² oder 20 Paletten",
        drawingPhoto: "📋 Haben Sie technische Zeichnungen oder Fotos des Raums?\n\n📸 Antwort: Ja oder Nein (können später gesendet werden)"
    }
};

// Progress messages
const progressMessages = {
    en: {
        progress: "Progress: {current}/{total} questions completed",
        calculation: "🔄 Calculating your cold storage requirements...",
        complete: "✅ Calculation complete! Here are your results:",
        restart: "To start a new calculation, send 'cold room' or 'soğuk oda'."
    },
    tr: {
        progress: "İlerleme: {current}/{total} soru tamamlandı",
        calculation: "🔄 Soğuk hava deposu gereksinimleriniz hesaplanıyor...",
        complete: "✅ Hesaplama tamamlandı! İşte sonuçlarınız:",
        restart: "Yeni bir hesaplama başlatmak için 'cold room' veya 'soğuk oda' gönderin."
    },
    de: {
        progress: "Fortschritt: {current}/{total} Fragen beantwortet",
        calculation: "🔄 Ihre Kühlraum-Anforderungen werden berechnet...",
        complete: "✅ Berechnung abgeschlossen! Hier sind Ihre Ergebnisse:",
        restart: "Für eine neue Berechnung senden Sie 'cold room' oder 'kühlraum'."
    }
};

// Question flow order
const questionOrder = [
    'temperature',
    'products',
    'length',
    'width',
    'height',
    'insulation',
    'floorInsulation',
    'doorFrequency',
    'loadingAmount',
    'entryTemperature',
    'coolingDuration',
    'coolingType',
    'unitPreference',
    'electricityType',
    'installationCity',
    'ambientHeatSource',
    'usageArea',
    'drawingPhoto'
];

/**
 * Initialize cold storage flow for a user
 * @param {string} userId - User ID
 * @param {string} language - Language code (en/tr/de)
 */
function initializeColdStorageFlow(userId, language = 'en') {
    const session = sessionManager.getSession(userId);
    
    session.coldStorageFlow = {
        active: true,
        language: language,
        currentStep: 0,
        answers: {},
        startTime: Date.now()
    };
    
    // Welcome messages for different languages
    const welcomeMessages = {
        en: "❄️ Welcome to the Cold Room Calculator! 🧊\n\nI'll help you calculate the exact cooling capacity needed for your cold storage room. We'll go through 18 comprehensive questions to get accurate results.\n\n🎯 Let's get started!",
        tr: "❄️ Soğuk Oda Hesaplayıcısına Hoş Geldiniz! 🧊\n\nSoğuk hava deponuz için gereken tam soğutma kapasitesini hesaplamanıza yardımcı olacağım. Doğru sonuçlar için 18 kapsamlı soru soracağım.\n\n🎯 Hadi başlayalım!",
        de: "❄️ Willkommen beim Kühlraum-Rechner! 🧊\n\nIch helfe Ihnen bei der Berechnung der exakten Kühlkapazität für Ihren Kühlraum. Wir gehen 18 umfassende Fragen durch, um genaue Ergebnisse zu erhalten.\n\n🎯 Los geht's!"
    };
    
    logger.info(`Initialized cold storage flow for user ${userId} in ${language}`);
    
    const welcomeMessage = welcomeMessages[language] || welcomeMessages.en;
    const firstQuestion = askCurrentQuestion(session);
    
    return `${welcomeMessage}\n\n${firstQuestion}`;
}

/**
 * Process user answer and move to next question
 * @param {Object} session - User session
 * @param {string} answer - User's answer
 * @returns {string} - Next question or calculation result
 */
function processAnswer(session, answer) {
    const flow = session.coldStorageFlow;
    const currentQuestionKey = questionOrder[flow.currentStep];
    
    // Validate and store answer
    const validatedAnswer = validateAnswer(currentQuestionKey, answer);
    if (validatedAnswer.error) {
        return validatedAnswer.error + "\n\n" + questions[flow.language][currentQuestionKey];
    }
    
    flow.answers[currentQuestionKey] = validatedAnswer.value;
    flow.currentStep++;
    
    logger.debug(`User ${session.userId} answered step ${flow.currentStep - 1}: ${currentQuestionKey} = ${validatedAnswer.value}`);
    
    // Check if all questions are answered
    if (flow.currentStep >= questionOrder.length) {
        return calculateAndFinish(session);
    }
    
    return askCurrentQuestion(session);
}

/**
 * Ask the current question
 * @param {Object} session - User session
 * @returns {string} - Current question
 */
function askCurrentQuestion(session) {
    const flow = session.coldStorageFlow;
    const currentQuestionKey = questionOrder[flow.currentStep];
    const question = questions[flow.language][currentQuestionKey];
    
    const progress = progressMessages[flow.language].progress
        .replace('{current}', flow.currentStep + 1)
        .replace('{total}', questionOrder.length);
    
    return `${progress}\n\n${question}`;
}

/**
 * Validate user answer based on question type
 * @param {string} questionKey - Question identifier
 * @param {string} answer - User's answer
 * @returns {Object} - Validation result
 */
function validateAnswer(questionKey, answer) {
    const cleanAnswer = answer.trim();
    
    switch (questionKey) {
        case 'temperature':
            const temp = parseFloat(cleanAnswer.replace(/[°C]/g, ''));
            const supportedTemps = [12, 5, 0, -5, -15, -18, -20, -25];
            if (isNaN(temp) || !supportedTemps.includes(temp)) {
                return { error: "❌ Please enter a valid temperature from the supported list." };
            }
            return { value: temp };
            
        case 'products':
            if (cleanAnswer.length < 2) {
                return { error: "❌ Please describe the products to be stored." };
            }
            return { value: cleanAnswer };
            
        case 'length':
        case 'width':
        case 'height':
            const dimension = parseFloat(cleanAnswer.replace(/[m]/g, ''));
            if (isNaN(dimension) || dimension <= 0 || dimension > 50) {
                return { error: "❌ Please enter a valid dimension in meters (0.1 - 50)." };
            }
            return { value: dimension };
            
        case 'insulation':
            const thickness = parseFloat(cleanAnswer.replace(/[cm]/g, ''));
            if (isNaN(thickness) || thickness < 5 || thickness > 30) {
                return { error: "❌ Please enter insulation thickness in cm (5-30 cm)." };
            }
            return { value: thickness };
            
        case 'floorInsulation':
            const hasFloorInsulation = cleanAnswer.toLowerCase();
            if (hasFloorInsulation.includes('yes') || hasFloorInsulation.includes('evet') || hasFloorInsulation.includes('ja')) {
                return { value: true };
            } else if (hasFloorInsulation.includes('no') || hasFloorInsulation.includes('hayır') || hasFloorInsulation.includes('nein')) {
                return { value: false };
            } else {
                return { error: "❌ Please answer 'Yes'/'Evet'/'Ja' or 'No'/'Hayır'/'Nein' for floor insulation." };
            }
            
        case 'doorFrequency':
            const frequency = cleanAnswer.toLowerCase();
            let timesPerDay;
            
            if (frequency.includes('rare') || frequency.includes('nadir') || frequency.includes('selten')) {
                timesPerDay = 2;
            } else if (frequency.includes('frequent') || frequency.includes('sık') || frequency.includes('häufig')) {
                timesPerDay = 20;
            } else {
                const extractedNumber = parseInt(cleanAnswer.replace(/[^0-9]/g, ''));
                if (!isNaN(extractedNumber) && extractedNumber >= 0 && extractedNumber <= 100) {
                    timesPerDay = extractedNumber;
                } else {
                    return { error: "❌ Please enter door opening frequency (number of times per day or 'rarely'/'frequently')." };
                }
            }
            return { value: timesPerDay };
            
        case 'loadingAmount':
            const amount = parseFloat(cleanAnswer.replace(/[kg]/g, ''));
            if (isNaN(amount) || amount < 0 || amount > 50000) {
                return { error: "❌ Please enter daily loading amount in kg (0-50000)." };
            }
            return { value: amount };
            
        case 'entryTemperature':
            const entryTemp = parseFloat(cleanAnswer.replace(/[°C]/g, ''));
            if (isNaN(entryTemp) || entryTemp < -30 || entryTemp > 60) {
                return { error: "❌ Please enter product entry temperature in °C (-30 to 60)." };
            }
            return { value: entryTemp };
            
        case 'coolingDuration':
            const duration = parseFloat(cleanAnswer.replace(/[hours|hour|saat|stunden]/gi, ''));
            if (isNaN(duration) || duration < 1 || duration > 168) {
                return { error: "❌ Please enter cooling duration in hours (1-168 hours)." };
            }
            return { value: duration };
            
        case 'coolingType':
            const coolingType = cleanAnswer.toLowerCase();
            if (coolingType.includes('air') || coolingType.includes('hava') || coolingType.includes('luft')) {
                return { value: 'air' };
            } else if (coolingType.includes('direct') || coolingType.includes('direkt')) {
                return { value: 'direct' };
            } else if (coolingType.includes('evap') || coolingType.includes('verdun')) {
                return { value: 'evaporative' };
            } else {
                return { error: "❌ Please select: Air cooling, Direct expansion, or Evaporative." };
            }
            
        case 'unitPreference':
            const unitType = cleanAnswer.toLowerCase();
            if (unitType.includes('mono')) {
                return { value: 'monoblock' };
            } else if (unitType.includes('split')) {
                return { value: 'split' };
            } else if (unitType.includes('modul')) {
                return { value: 'modular' };
            } else {
                return { error: "❌ Please select: Monoblock, Split system, or Modular system." };
            }
            
        case 'electricityType':
            const elecType = cleanAnswer.toLowerCase();
            if (elecType.includes('single') || elecType.includes('tek') || elecType.includes('220')) {
                return { value: 'single' };
            } else if (elecType.includes('three') || elecType.includes('üç') || elecType.includes('drei') || elecType.includes('380') || elecType.includes('400')) {
                return { value: 'three' };
            } else {
                return { error: "❌ Please select: Single phase (220V) or Three phase (380V/400V)." };
            }
            
        case 'installationCity':
            if (cleanAnswer.length < 2) {
                return { error: "❌ Please enter the installation city name." };
            }
            return { value: cleanAnswer };
            
        case 'ambientHeatSource':
            const heatSource = cleanAnswer.toLowerCase();
            if (heatSource.includes('yes') || heatSource.includes('evet') || heatSource.includes('ja') || 
                heatSource.includes('oven') || heatSource.includes('fırın') || heatSource.includes('sun') || 
                heatSource.includes('güneş') || heatSource.includes('sonne')) {
                return { value: true };
            } else if (heatSource.includes('no') || heatSource.includes('hayır') || heatSource.includes('nein')) {
                return { value: false };
            } else {
                return { value: cleanAnswer };
            }
            
        case 'usageArea':
            const usageInput = cleanAnswer.toLowerCase();
            if (usageInput.includes('m²') || usageInput.includes('m2') || usageInput.includes('square')) {
                const area = parseFloat(cleanAnswer.replace(/[^0-9.]/g, ''));
                if (!isNaN(area) && area > 0) {
                    return { value: `${area} m²` };
                }
            } else if (usageInput.includes('palet') || usageInput.includes('pallet')) {
                const pallets = parseInt(cleanAnswer.replace(/[^0-9]/g, ''));
                if (!isNaN(pallets) && pallets > 0) {
                    return { value: `${pallets} pallets` };
                }
            } else {
                const number = parseFloat(cleanAnswer);
                if (!isNaN(number) && number > 0) {
                    return { value: cleanAnswer };
                }
            }
            return { error: "❌ Please specify usable area (m²) or number of pallets." };
            
        case 'drawingPhoto':
            const hasDrawing = cleanAnswer.toLowerCase();
            if (hasDrawing.includes('yes') || hasDrawing.includes('evet') || hasDrawing.includes('ja')) {
                return { value: true };
            } else if (hasDrawing.includes('no') || hasDrawing.includes('hayır') || hasDrawing.includes('nein')) {
                return { value: false };
            } else {
                return { error: "❌ Please answer 'Yes'/'Evet'/'Ja' or 'No'/'Hayır'/'Nein'." };
            }
            
        default:
            return { error: "❌ Invalid question type." };
    }
}

/**
 * Calculate results and finish the flow
 * @param {Object} session - User session
 * @returns {string} - Final calculation result
 */
function calculateAndFinish(session) {
    const flow = session.coldStorageFlow;
    const answers = flow.answers;
    
    try {
        // Calculate room volume
        const volume = answers.length * answers.width * answers.height;
        
        // Estimate ambient temperature based on geographical assumptions
        const ambientTemp = 35; // Default assumption for calculations
        
        // Calculate additional loads
        const additionalLoads = calculateAdditionalLoads(answers);
        
        // Base calculation parameters
        const calcParams = {
            volume: volume,
            temperature: answers.temperature,
            ambientTemp: ambientTemp,
            climateZone: 'cool', // Default
            safetyFactor: 1.2 // Default safety factor
        };
        
        // Get base calculation
        const baseResult = calculateCapacity(calcParams);
        
        // Add additional loads
        const finalCapacity = baseResult.finalCapacity + additionalLoads.total;
        
        // Format comprehensive result
        const result = formatColdStorageResult(answers, volume, finalCapacity, additionalLoads, flow.language);
        
        // Clean up flow
        delete session.coldStorageFlow;
        
        logger.info(`Cold storage calculation completed for user ${session.userId}. Final capacity: ${finalCapacity}W`);
        
        return progressMessages[flow.language].complete + "\n\n" + result + "\n\n" + progressMessages[flow.language].restart;
        
    } catch (error) {
        logger.error(`Error calculating cold storage for user ${session.userId}: ${error.message}`);
        delete session.coldStorageFlow;
        return "❌ Sorry, there was an error calculating your requirements. Please try again.";
    }
}

/**
 * Calculate additional loads based on specific parameters
 * @param {Object} answers - User answers
 * @returns {Object} - Additional loads breakdown
 */
function calculateAdditionalLoads(answers) {
    const loads = {
        infiltration: 0,
        product: 0,
        floor: 0,
        total: 0
    };
    
    const volume = answers.length * answers.width * answers.height;
    
    // Infiltration load (door openings)
    const infiltrationFactor = Math.min(answers.doorFrequency * 0.1, 2.0); // Max 200% increase
    loads.infiltration = volume * infiltrationFactor * 15; // 15W per m³ per door opening factor
    
    // Product load (cooling from entry temperature to storage temperature)
    const tempDiff = answers.entryTemperature - answers.temperature;
    const productLoad = answers.loadingAmount * tempDiff * 0.5; // Simplified: 0.5W per kg per °C difference
    loads.product = Math.max(productLoad, 0);
    
    // Floor load (if no insulation)
    if (!answers.floorInsulation) {
        loads.floor = answers.length * answers.width * 20; // 20W per m² for uninsulated floor
    }
    
    loads.total = loads.infiltration + loads.product + loads.floor;
    
    return loads;
}

/**
 * Format the final calculation result
 * @param {Object} answers - User answers
 * @param {number} volume - Room volume
 * @param {number} finalCapacity - Final cooling capacity
 * @param {Object} additionalLoads - Additional loads breakdown
 * @param {string} language - Language code
 * @returns {string} - Formatted result
 */
function formatColdStorageResult(answers, volume, finalCapacity, additionalLoads, language) {
    // Language-specific text mappings
    const texts = {
        en: {
            title: 'Cold Storage Calculation Results',
            roomSpecs: 'Room Specifications',
            dimensions: 'Dimensions',
            volume: 'Volume',
            temperature: 'Temperature',
            products: 'Products',
            insulation: 'Insulation',
            floorInsulation: 'Floor Insulation',
            yes: 'Yes',
            no: 'No',
            operationalParams: 'Operational Parameters',
            doorFrequency: 'Door Opening Frequency',
            timesPerDay: 'times/day',
            dailyLoading: 'Daily Loading',
            entryTemp: 'Product Entry Temperature',
            coolingCapacity: 'Cooling Capacity',
            baseCapacity: 'Base Capacity',
            infiltrationLoad: 'Infiltration Load',
            productLoad: 'Product Cooling Load',
            floorLoad: 'Floor Load',
            totalCapacity: 'TOTAL CAPACITY',
            inKW: 'In kW'
        },
        tr: {
            title: 'Soğuk Hava Deposu Hesaplama Sonuçları',
            roomSpecs: 'Oda Özellikleri',
            dimensions: 'Boyutlar',
            volume: 'Hacim',
            temperature: 'Sıcaklık',
            products: 'Ürün',
            insulation: 'Yalıtım',
            floorInsulation: 'Zemin Yalıtımı',
            yes: 'Var',
            no: 'Yok',
            operationalParams: 'Çalışma Parametreleri',
            doorFrequency: 'Kapı Açma Sıklığı',
            timesPerDay: 'kez/gün',
            dailyLoading: 'Günlük Yükleme',
            entryTemp: 'Ürün Giriş Sıcaklığı',
            coolingCapacity: 'Soğutma Kapasitesi',
            baseCapacity: 'Temel Kapasite',
            infiltrationLoad: 'Infiltrasyon Yükü',
            productLoad: 'Ürün Soğutma Yükü',
            floorLoad: 'Zemin Yükü',
            totalCapacity: 'TOPLAM KAPASİTE',
            inKW: 'kW Cinsinden'
        },
        de: {
            title: 'Kühlraum-Berechnungsergebnisse',
            roomSpecs: 'Raum-Spezifikationen',
            dimensions: 'Abmessungen',
            volume: 'Volumen',
            temperature: 'Temperatur',
            products: 'Produkte',
            insulation: 'Isolierung',
            floorInsulation: 'Bodenisolierung',
            yes: 'Ja',
            no: 'Nein',
            operationalParams: 'Betriebsparameter',
            doorFrequency: 'Türöffnungsfrequenz',
            timesPerDay: 'mal/Tag',
            dailyLoading: 'Tägliche Beladung',
            entryTemp: 'Produkteingangstemperatur',
            coolingCapacity: 'Kühlkapazität',
            baseCapacity: 'Grundkapazität',
            infiltrationLoad: 'Infiltrationslast',
            productLoad: 'Produktkühlungslast',
            floorLoad: 'Bodenlast',
            totalCapacity: 'GESAMTKAPAZITÄT',
            inKW: 'In kW'
        }
    };
    
    const t = texts[language] || texts.en;
    
    let result = `❄️ ${t.title}\n\n`;
    
    // Room specifications
    result += `📏 ${t.roomSpecs}:\n`;
    result += `• ${t.dimensions}: ${answers.length}m × ${answers.width}m × ${answers.height}m\n`;
    result += `• ${t.volume}: ${volume.toFixed(1)} m³\n`;
    result += `• ${t.temperature}: ${answers.temperature}°C\n`;
    result += `• ${t.products}: ${answers.products}\n`;
    result += `• ${t.insulation}: ${answers.insulation} cm\n`;
    result += `• ${t.floorInsulation}: ${answers.floorInsulation ? t.yes : t.no}\n\n`;
    
    // Operational parameters
    result += `⚙️ ${t.operationalParams}:\n`;
    result += `• ${t.doorFrequency}: ${answers.doorFrequency} ${t.timesPerDay}\n`;
    result += `• ${t.dailyLoading}: ${answers.loadingAmount} kg\n`;
    result += `• ${t.entryTemp}: ${answers.entryTemperature}°C\n\n`;
    
    // Capacity calculation
    result += `🔧 ${t.coolingCapacity}:\n`;
    result += `• ${t.baseCapacity}: ${Math.round(finalCapacity - additionalLoads.total).toLocaleString()} W\n`;
    if (additionalLoads.infiltration > 0) {
        result += `• ${t.infiltrationLoad}: ${Math.round(additionalLoads.infiltration).toLocaleString()} W\n`;
    }
    if (additionalLoads.product > 0) {
        result += `• ${t.productLoad}: ${Math.round(additionalLoads.product).toLocaleString()} W\n`;
    }
    if (additionalLoads.floor > 0) {
        result += `• ${t.floorLoad}: ${Math.round(additionalLoads.floor).toLocaleString()} W\n`;
    }
    result += `• *${t.totalCapacity}: ${Math.round(finalCapacity).toLocaleString()} W*\n`;
    result += `• *${t.inKW}: ${(finalCapacity / 1000).toFixed(1)} kW*\n\n`;
    
    // System recommendation
    const systemTexts = {
        en: {
            recommendation: 'System Recommendation',
            recommendedSystem: 'Recommended System',
            capacityRange: 'Capacity Range',
            monoblock: 'Monoblock system',
            split: 'Split system',
            industrial: 'Industrial split system',
            central: 'Central cooling system'
        },
        tr: {
            recommendation: 'Sistem Önerisi',
            recommendedSystem: 'Önerilen Sistem',
            capacityRange: 'Kapasite Aralığı',
            monoblock: 'Monoblock sistem',
            split: 'Split sistem',
            industrial: 'Endüstriyel split sistem',
            central: 'Merkezi soğutma sistemi'
        },
        de: {
            recommendation: 'Systemempfehlung',
            recommendedSystem: 'Empfohlenes System',
            capacityRange: 'Kapazitätsbereich',
            monoblock: 'Monoblock-System',
            split: 'Split-System',
            industrial: 'Industrielles Split-System',
            central: 'Zentrale Kühlanlage'
        }
    };
    
    const st = systemTexts[language] || systemTexts.en;
    result += `💡 ${st.recommendation}:\n`;
    const capacityKW = finalCapacity / 1000;
    let systemType = '';
    
    if (capacityKW < 5) {
        systemType = st.monoblock;
    } else if (capacityKW < 15) {
        systemType = st.split;
    } else if (capacityKW < 50) {
        systemType = st.industrial;
    } else {
        systemType = st.central;
    }
    
    result += `• ${st.recommendedSystem}: ${systemType}\n`;
    result += `• ${st.capacityRange}: ${(capacityKW * 0.9).toFixed(1)} - ${(capacityKW * 1.1).toFixed(1)} kW\n`;
    
    return result;
}

/**
 * Check if user has an active cold storage flow
 * @param {Object} session - User session
 * @returns {boolean} - True if flow is active
 */
function hasActiveColdStorageFlow(session) {
    return session.coldStorageFlow && session.coldStorageFlow.active;
}

/**
 * Cancel current cold storage flow
 * @param {Object} session - User session
 */
function cancelColdStorageFlow(session) {
    if (session.coldStorageFlow) {
        delete session.coldStorageFlow;
        logger.info(`Cold storage flow cancelled for user ${session.userId}`);
    }
}

module.exports = {
    initializeColdStorageFlow,
    processAnswer,
    hasActiveColdStorageFlow,
    cancelColdStorageFlow
};