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
        temperature: "What is the required cold room temperature? (°C)\n\nSupported temperatures: 12, 5, 0, -5, -15, -18, -20, -25°C",
        products: "What product(s) will be stored inside the room?\n\nExample: Fruits, vegetables, meat, dairy, etc.",
        length: "What is the inner length of the room? (in meters)\n\nExample: 5.5",
        width: "What is the inner width of the room? (in meters)\n\nExample: 3.2",
        height: "What is the inner height of the room? (in meters)\n\nExample: 2.8",
        insulation: "What is the thickness of insulation panels?\n\nExample: 8 cm, 10 cm, 12 cm",
        floorInsulation: "Is there floor insulation?\n\nReply: Yes or No",
        doorFrequency: "How often will the door be opened daily?\n\nExample: 10 times, rarely, frequently",
        loadingAmount: "What is the daily loading/unloading amount? (in kg)\n\nExample: 500 kg",
        entryTemperature: "What is the temperature of products when they enter the room? (°C)\n\nExample: 20°C"
    },
    tr: {
        temperature: "Gerekli soğuk oda sıcaklığı nedir? (°C)\n\nDesteklenen sıcaklıklar: 12, 5, 0, -5, -15, -18, -20, -25°C",
        products: "Oda içerisinde hangi ürün(ler) saklanacak?\n\nÖrnek: Meyve, sebze, et, süt ürünleri, vb.",
        length: "Odanın iç uzunluğu nedir? (metre cinsinden)\n\nÖrnek: 5.5",
        width: "Odanın iç genişliği nedir? (metre cinsinden)\n\nÖrnek: 3.2",
        height: "Odanın iç yüksekliği nedir? (metre cinsinden)\n\nÖrnek: 2.8",
        insulation: "Yalıtım panellerinin kalınlığı nedir?\n\nÖrnek: 8 cm, 10 cm, 12 cm",
        floorInsulation: "Zemin yalıtımı var mı?\n\nCevap: Evet veya Hayır",
        doorFrequency: "Kapı günde kaç kez açılacak?\n\nÖrnek: 10 kez, nadir, sık sık",
        loadingAmount: "Günlük yükleme/boşaltma miktarı nedir? (kg cinsinden)\n\nÖrnek: 500 kg",
        entryTemperature: "Ürünler odaya girdiğinde sıcaklığı nedir? (°C)\n\nÖrnek: 20°C"
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
    'entryTemperature'
];

/**
 * Initialize cold storage flow for a user
 * @param {string} userId - User ID
 * @param {string} language - Language code (en/tr)
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
    
    logger.info(`Initialized cold storage flow for user ${userId} in ${language}`);
    return askCurrentQuestion(session);
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
            if (hasFloorInsulation.includes('yes') || hasFloorInsulation.includes('evet')) {
                return { value: true };
            } else if (hasFloorInsulation.includes('no') || hasFloorInsulation.includes('hayır')) {
                return { value: false };
            } else {
                return { error: "❌ Please answer 'Yes' or 'No' for floor insulation." };
            }
            
        case 'doorFrequency':
            const frequency = cleanAnswer.toLowerCase();
            let timesPerDay;
            
            if (frequency.includes('rare') || frequency.includes('nadir')) {
                timesPerDay = 2;
            } else if (frequency.includes('frequent') || frequency.includes('sık')) {
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
    const isturkish = language === 'tr';
    
    let result = `❄️ ${isturkish ? 'Soğuk Hava Deposu Hesaplama Sonuçları' : 'Cold Storage Calculation Results'}\n\n`;
    
    // Room specifications
    result += `📏 ${isturkish ? 'Oda Özellikleri' : 'Room Specifications'}:\n`;
    result += `• ${isturkish ? 'Boyutlar' : 'Dimensions'}: ${answers.length}m × ${answers.width}m × ${answers.height}m\n`;
    result += `• ${isturkish ? 'Hacim' : 'Volume'}: ${volume.toFixed(1)} m³\n`;
    result += `• ${isturkish ? 'Sıcaklık' : 'Temperature'}: ${answers.temperature}°C\n`;
    result += `• ${isturkish ? 'Ürün' : 'Products'}: ${answers.products}\n`;
    result += `• ${isturkish ? 'Yalıtım' : 'Insulation'}: ${answers.insulation} cm\n`;
    result += `• ${isturkish ? 'Zemin Yalıtımı' : 'Floor Insulation'}: ${answers.floorInsulation ? (isturkish ? 'Var' : 'Yes') : (isturkish ? 'Yok' : 'No')}\n\n`;
    
    // Operational parameters
    result += `⚙️ ${isturkish ? 'Çalışma Parametreleri' : 'Operational Parameters'}:\n`;
    result += `• ${isturkish ? 'Kapı Açma Sıklığı' : 'Door Opening Frequency'}: ${answers.doorFrequency} ${isturkish ? 'kez/gün' : 'times/day'}\n`;
    result += `• ${isturkish ? 'Günlük Yükleme' : 'Daily Loading'}: ${answers.loadingAmount} kg\n`;
    result += `• ${isturkish ? 'Ürün Giriş Sıcaklığı' : 'Product Entry Temperature'}: ${answers.entryTemperature}°C\n\n`;
    
    // Capacity calculation
    result += `🔧 ${isturkish ? 'Soğutma Kapasitesi' : 'Cooling Capacity'}:\n`;
    result += `• ${isturkish ? 'Temel Kapasite' : 'Base Capacity'}: ${Math.round(finalCapacity - additionalLoads.total).toLocaleString()} W\n`;
    if (additionalLoads.infiltration > 0) {
        result += `• ${isturkish ? 'Infiltrasyon Yükü' : 'Infiltration Load'}: ${Math.round(additionalLoads.infiltration).toLocaleString()} W\n`;
    }
    if (additionalLoads.product > 0) {
        result += `• ${isturkish ? 'Ürün Soğutma Yükü' : 'Product Cooling Load'}: ${Math.round(additionalLoads.product).toLocaleString()} W\n`;
    }
    if (additionalLoads.floor > 0) {
        result += `• ${isturkish ? 'Zemin Yükü' : 'Floor Load'}: ${Math.round(additionalLoads.floor).toLocaleString()} W\n`;
    }
    result += `• *${isturkish ? 'TOPLAM KAPASİTE' : 'TOTAL CAPACITY'}: ${Math.round(finalCapacity).toLocaleString()} W*\n`;
    result += `• *${isturkish ? 'kW Cinsinden' : 'In kW'}: ${(finalCapacity / 1000).toFixed(1)} kW*\n\n`;
    
    // System recommendation
    result += `💡 ${isturkish ? 'Sistem Önerisi' : 'System Recommendation'}:\n`;
    const capacityKW = finalCapacity / 1000;
    let systemType = '';
    
    if (capacityKW < 5) {
        systemType = isturkish ? 'Monoblock sistem' : 'Monoblock system';
    } else if (capacityKW < 15) {
        systemType = isturkish ? 'Split sistem' : 'Split system';
    } else if (capacityKW < 50) {
        systemType = isturkish ? 'Endüstriyel split sistem' : 'Industrial split system';
    } else {
        systemType = isturkish ? 'Merkezi soğutma sistemi' : 'Central cooling system';
    }
    
    result += `• ${isturkish ? 'Önerilen Sistem' : 'Recommended System'}: ${systemType}\n`;
    result += `• ${isturkish ? 'Kapasite Aralığı' : 'Capacity Range'}: ${(capacityKW * 0.9).toFixed(1)} - ${(capacityKW * 1.1).toFixed(1)} kW\n`;
    
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