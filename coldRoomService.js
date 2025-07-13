const coldRoomCalculator = require('./coldRoomCalculator');
const logger = require('./logger');

/**
 * Cold Room Service - Handles user interactions for cold room calculations
 * Provides both quick calculations and detailed consultative flows
 */

/**
 * Check if message is requesting cold room calculation
 * @param {string} message - User message
 * @returns {boolean} True if requesting cold room calculation
 */
function isColdRoomRequest(message) {
    const lowerMessage = message.toLowerCase();
    
    const keywords = [
        // English keywords
        'cold room', 'cold storage', 'refrigeration', 'cooling capacity',
        'freezer room', 'chiller', 'cooling room', 'refrigerated storage',
        'calculate cold', 'cold requirements', 'cooling load',
        
        // Turkish keywords
        'soğuk oda', 'soğuk depo', 'soğutma kapasitesi', 'dondurucu oda',
        'soğutucu', 'soğuk alan', 'soğutma yükü', 'soğuk hesap',
        
        // German keywords
        'kühlraum', 'kältekammer', 'kühlhaus', 'kühllager',
        'kühlkapazität', 'kälteanlage', 'tiefkühlraum', 'kühlzelle',
        
        // Calculation keywords
        'calculate', 'hesapla', 'berechnen', 'capacity', 'kapasite', 'kapazität'
    ];
    
    return keywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Extract parameters from user message using natural language processing
 * @param {string} message - User message
 * @returns {Object} Extracted parameters
 */
function extractParameters(message) {
    const lowerMessage = message.toLowerCase();
    const params = {};
    
    // Extract dimensions
    const volumeMatch = lowerMessage.match(/(\d+(?:\.\d+)?)\s*(?:m³|m3|cubic\s*meters?)/);
    if (volumeMatch) {
        // If volume is given, estimate dimensions (assume cubic room for simplicity)
        const volume = parseFloat(volumeMatch[1]);
        const side = Math.cbrt(volume);
        params.length = side;
        params.width = side;
        params.height = Math.min(side, 4); // Cap height at 4m
        params.volume = volume;
    } else {
        // Look for individual dimensions or dimension patterns like "10m × 6m × 3m"
        const dimensionPattern = lowerMessage.match(/(\d+(?:\.\d+)?)\s*m?\s*[×x]\s*(\d+(?:\.\d+)?)\s*m?\s*[×x]\s*(\d+(?:\.\d+)?)\s*m?/);
        if (dimensionPattern) {
            params.length = parseFloat(dimensionPattern[1]);
            params.width = parseFloat(dimensionPattern[2]);
            params.height = parseFloat(dimensionPattern[3]);
        } else {
            // Look for individual dimensions with keywords
            const lengthMatch = lowerMessage.match(/(?:length|long|uzunluk|länge|lang).*?(\d+(?:\.\d+)?)\s*(?:m|meter)/);
            const widthMatch = lowerMessage.match(/(?:width|wide|genişlik|breite|breit).*?(\d+(?:\.\d+)?)\s*(?:m|meter)/);
            const heightMatch = lowerMessage.match(/(?:height|high|yükseklik|höhe|hoch).*?(\d+(?:\.\d+)?)\s*(?:m|meter)/);
            
            if (lengthMatch) params.length = parseFloat(lengthMatch[1]);
            if (widthMatch) params.width = parseFloat(widthMatch[1]);
            if (heightMatch) params.height = parseFloat(heightMatch[1]);
        }
    }
    
    // Extract temperature
    const tempMatch = lowerMessage.match(/(-?\d+)\s*°?c/);
    if (tempMatch) {
        const temp = parseInt(tempMatch[1]);
        // Check if it's a supported temperature
        if (coldRoomCalculator.TEMPERATURE_COEFFICIENTS[temp]) {
            params.temperature = temp;
        }
    }
    
    // Extract ambient temperature
    const ambientMatch = lowerMessage.match(/(?:ambient|outside|external|dış|umgebung).*?(\d+)\s*°?c/);
    if (ambientMatch) {
        params.ambient_temperature = parseInt(ambientMatch[1]);
    }
    
    // Extract product type
    const productTypes = {
        'meat': ['meat', 'beef', 'pork', 'et', 'fleisch'],
        'fish': ['fish', 'seafood', 'balık', 'fisch'],
        'dairy': ['dairy', 'milk', 'cheese', 'süt', 'milch'],
        'fruits': ['fruit', 'apple', 'orange', 'meyve', 'obst'],
        'vegetables': ['vegetable', 'carrot', 'potato', 'sebze', 'gemüse'],
        'frozen': ['frozen', 'donmuş', 'gefroren'],
        'beverages': ['beverage', 'drink', 'beer', 'içecek', 'getränk']
    };
    
    for (const [type, keywords] of Object.entries(productTypes)) {
        if (keywords.some(keyword => lowerMessage.includes(keyword))) {
            params.product_type = type;
            break;
        }
    }
    
    // Extract insulation thickness
    const insulationMatch = lowerMessage.match(/(?:insulation|insulated|yalıtım|isolierung).*?(\d+)\s*(?:mm|cm)/);
    if (insulationMatch) {
        let thickness = parseInt(insulationMatch[1]);
        // Convert cm to mm if needed
        if (lowerMessage.includes('cm')) thickness *= 10;
        params.wall_insulation = thickness;
    }
    
    // Extract door openings
    const doorMatch = lowerMessage.match(/(?:door|kapı|tür).*?(\d+).*?(?:times?|kez|mal)/);
    if (doorMatch) {
        params.door_openings_per_day = parseInt(doorMatch[1]);
    }
    
    return params;
}

/**
 * Detect language from user message
 * @param {string} message - User message
 * @returns {string} Language code (en, tr, de)
 */
function detectLanguage(message) {
    const lowerMessage = message.toLowerCase();
    
    const turkishWords = ['soğuk', 'oda', 'sıcaklık', 'hesapla', 'kapasite', 'evet', 'hayır'];
    const germanWords = ['kühlraum', 'temperatur', 'berechnen', 'kapazität', 'ja', 'nein'];
    
    const turkishCount = turkishWords.filter(word => lowerMessage.includes(word)).length;
    const germanCount = germanWords.filter(word => lowerMessage.includes(word)).length;
    
    if (turkishCount > germanCount && turkishCount > 0) return 'tr';
    if (germanCount > turkishCount && germanCount > 0) return 'de';
    return 'en';
}

/**
 * Format calculation results for user display
 * @param {Object} result - Calculation results
 * @param {string} language - Language code
 * @returns {string} Formatted response
 */
function formatResults(result, language = 'en') {
    const texts = {
        en: {
            title: "❄️ Cold Room Capacity Calculation Results",
            capacity: "Required Cooling Capacity",
            breakdown: "Load Breakdown",
            system: "System Recommendations",
            room: "Room Specifications",
            factors: "Applied Factors",
            transmission: "Transmission (walls/ceiling/floor)",
            infiltration: "Infiltration (door openings)",
            product: "Product cooling load", 
            equipment: "Equipment load (fans/lights)",
            defrost: "Defrost load",
            type: "Recommended System Type",
            compressor: "Compressor Type",
            refrigerant: "Refrigerant",
            power: "Estimated Power Consumption",
            notes: "Additional Notes"
        },
        tr: {
            title: "❄️ Soğuk Oda Kapasite Hesaplama Sonuçları",
            capacity: "Gerekli Soğutma Kapasitesi",
            breakdown: "Yük Dağılımı",
            system: "Sistem Önerileri",
            room: "Oda Özellikleri",
            factors: "Uygulanan Faktörler",
            transmission: "İletim (duvar/tavan/taban)",
            infiltration: "Sızıntı (kapı açılışları)",
            product: "Ürün soğutma yükü",
            equipment: "Ekipman yükü (fan/aydınlatma)",
            defrost: "Buz çözme yükü",
            type: "Önerilen Sistem Tipi",
            compressor: "Kompresör Tipi",
            refrigerant: "Soğutucu Akışkan",
            power: "Tahmini Güç Tüketimi",
            notes: "Ek Notlar"
        },
        de: {
            title: "❄️ Kühlraum-Kapazitätsberechnung Ergebnisse",
            capacity: "Erforderliche Kühlkapazität",
            breakdown: "Lastverteilung",
            system: "Systemempfehlungen",
            room: "Raumspezifikationen",
            factors: "Angewandte Faktoren",
            transmission: "Transmission (Wände/Decke/Boden)",
            infiltration: "Infiltration (Türöffnungen)",
            product: "Produktkühlungslast",
            equipment: "Gerätelast (Ventilatoren/Beleuchtung)",
            defrost: "Abtaulast",
            type: "Empfohlener Systemtyp",
            compressor: "Kompressortyp",
            refrigerant: "Kältemittel",
            power: "Geschätzter Stromverbrauch",
            notes: "Zusätzliche Hinweise"
        }
    };
    
    const t = texts[language] || texts.en;
    
    let response = `${t.title}\n\n`;
    
    // Main capacity result
    response += `🔹 **${t.capacity}**: ${result.total_capacity_kw} kW (${result.total_capacity_watts.toLocaleString()} W)\n`;
    response += `🔹 **Specific Load**: ${result.load_per_m3} W/m³\n\n`;
    
    // Room specifications
    response += `🏠 **${t.room}**:\n`;
    response += `• Dimensions: ${result.room.dimensions}\n`;
    response += `• Volume: ${result.room.volume} m³\n`;
    response += `• Storage Temperature: ${result.room.temperature}°C\n`;
    response += `• Ambient Temperature: ${result.room.ambient_temperature}°C\n\n`;
    
    // Load breakdown
    response += `📊 **${t.breakdown}**:\n`;
    response += `• ${t.transmission}: ${result.loads.transmission.toLocaleString()} W\n`;
    response += `• ${t.infiltration}: ${result.loads.infiltration.toLocaleString()} W\n`;
    response += `• ${t.product}: ${result.loads.product.toLocaleString()} W\n`;
    response += `• ${t.equipment}: ${result.loads.equipment.toLocaleString()} W\n`;
    if (result.loads.defrost > 0) {
        response += `• ${t.defrost}: ${result.loads.defrost.toLocaleString()} W\n`;
    }
    response += `• **Total**: ${result.total_capacity_watts.toLocaleString()} W\n\n`;
    
    // System recommendations
    response += `🔧 **${t.system}**:\n`;
    response += `• ${t.type}: ${result.recommendations.system_type}\n`;
    response += `• ${t.compressor}: ${result.recommendations.compressor_type}\n`;
    response += `• ${t.refrigerant}: ${result.recommendations.refrigerant_suggestion}\n`;
    response += `• ${t.power}: ${result.recommendations.estimated_power_consumption}\n`;
    
    if (result.recommendations.additional_notes.length > 0) {
        response += `\n💡 **${t.notes}**:\n`;
        result.recommendations.additional_notes.forEach(note => {
            response += `• ${note}\n`;
        });
    }
    
    return response;
}

/**
 * Handle cold room calculation request
 * @param {string} message - User message
 * @param {Object} session - User session (optional)
 * @returns {string} Response message
 */
function handleColdRoomRequest(message, session = null) {
    try {
        const language = detectLanguage(message);
        const extractedParams = extractParameters(message);
        
        // Check if we have minimum required parameters
        const hasBasicParams = (extractedParams.volume || 
                               (extractedParams.length && extractedParams.width && extractedParams.height)) &&
                              extractedParams.temperature;
        
        if (!hasBasicParams) {
            return getParameterPrompt(language, extractedParams);
        }
        
        // Fill in default values for missing parameters
        const params = {
            // Room dimensions
            length: extractedParams.length || 10,
            width: extractedParams.width || 6,
            height: extractedParams.height || 3,
            temperature: extractedParams.temperature || -18,
            
            // Environmental conditions
            ambient_temperature: extractedParams.ambient_temperature || 35,
            climate_zone: 'temperate',
            
            // Operational parameters
            door_openings_per_day: extractedParams.door_openings_per_day || 10,
            daily_product_load: 500,
            product_entry_temperature: 20,
            product_type: extractedParams.product_type || 'general',
            
            // Insulation
            wall_insulation: extractedParams.wall_insulation || 100,
            ceiling_insulation: extractedParams.wall_insulation ? extractedParams.wall_insulation + 20 : 120,
            floor_insulation: extractedParams.wall_insulation ? extractedParams.wall_insulation - 20 : 80,
            
            // Safety factors
            safety_factor: 1.2,
            defrost_factor: 1.0,
            future_expansion: 1.0,
            
            ...extractedParams // Override with any extracted values
        };
        
        // Perform calculation
        const result = coldRoomCalculator.calculateColdRoomCapacity(params);
        
        // Store result in session for potential equipment recommendations
        if (session) {
            session.lastColdRoomResult = result;
        }
        
        logger.info(`Cold room calculation completed: ${result.total_capacity_kw} kW for ${result.room.volume} m³ at ${params.temperature}°C`);
        
        // Format and return results
        return formatResults(result, language);
        
    } catch (error) {
        logger.error('Error in cold room calculation:', error);
        
        const errorMessages = {
            en: `❌ **Calculation Error**: ${error.message}\n\nPlease check your parameters and try again.`,
            tr: `❌ **Hesaplama Hatası**: ${error.message}\n\nLütfen parametrelerinizi kontrol edin ve tekrar deneyin.`,
            de: `❌ **Berechnungsfehler**: ${error.message}\n\nBitte überprüfen Sie Ihre Parameter und versuchen Sie es erneut.`
        };
        
        const language = detectLanguage(message);
        return errorMessages[language] || errorMessages.en;
    }
}

/**
 * Generate parameter prompt when insufficient information is provided
 * @param {string} language - Language code
 * @param {Object} extractedParams - Already extracted parameters
 * @returns {string} Parameter prompt message
 */
function getParameterPrompt(language, extractedParams = {}) {
    const prompts = {
        en: {
            title: "❄️ **Cold Room Capacity Calculator**",
            subtitle: "I need some basic information to calculate the cooling capacity:",
            required: "**Required Information:**",
            optional: "**Optional Information:**",
            example: "**Example:** \"Calculate for 10m × 6m × 3m room at -18°C with 35°C ambient temperature\"",
            current: "**Information I found:**"
        },
        tr: {
            title: "❄️ **Soğuk Oda Kapasite Hesaplayıcısı**",
            subtitle: "Soğutma kapasitesini hesaplamak için bazı temel bilgilere ihtiyacım var:",
            required: "**Gerekli Bilgiler:**",
            optional: "**İsteğe Bağlı Bilgiler:**",
            example: "**Örnek:** \"10m × 6m × 3m oda için -18°C'de 35°C dış ortam sıcaklığında hesapla\"",
            current: "**Bulduğum bilgiler:**"
        },
        de: {
            title: "❄️ **Kühlraum-Kapazitätsrechner**",
            subtitle: "Ich benötige einige grundlegende Informationen zur Berechnung der Kühlkapazität:",
            required: "**Erforderliche Informationen:**",
            optional: "**Optionale Informationen:**",
            example: "**Beispiel:** \"Berechnen für 10m × 6m × 3m Raum bei -18°C mit 35°C Umgebungstemperatur\"",
            current: "**Gefundene Informationen:**"
        }
    };
    
    const p = prompts[language] || prompts.en;
    
    let response = `${p.title}\n\n${p.subtitle}\n\n`;
    
    // Show what we found
    if (Object.keys(extractedParams).length > 0) {
        response += `${p.current}\n`;
        Object.entries(extractedParams).forEach(([key, value]) => {
            response += `• ${key}: ${value}\n`;
        });
        response += '\n';
    }
    
    // Required information
    response += `${p.required}\n`;
    response += `• Room dimensions (length × width × height) OR volume in m³\n`;
    response += `• Storage temperature (-25°C to +12°C)\n\n`;
    
    response += `${p.optional}\n`;
    response += `• Ambient temperature (default: 35°C)\n`;
    response += `• Product type (meat, fish, dairy, fruits, vegetables, frozen)\n`;
    response += `• Insulation thickness (default: 100mm)\n`;
    response += `• Daily door openings (default: 10)\n\n`;
    
    response += `${p.example}\n\n`;
    
    // Supported temperatures
    const supportedTemps = Object.keys(coldRoomCalculator.TEMPERATURE_COEFFICIENTS).join(', ');
    response += `**Supported Temperatures:** ${supportedTemps}°C`;
    
    return response;
}

/**
 * Quick calculation for basic estimates
 * @param {number} volume - Room volume in m³
 * @param {number} temperature - Storage temperature
 * @param {number} ambient_temp - Ambient temperature
 * @param {string} language - Language code
 * @returns {string} Quick calculation result
 */
function quickCalculation(volume, temperature, ambient_temp = 35, language = 'en') {
    try {
        const result = coldRoomCalculator.quickCalculation(volume, temperature, ambient_temp);
        
        const texts = {
            en: "❄️ **Quick Calculation Result**",
            tr: "❄️ **Hızlı Hesaplama Sonucu**", 
            de: "❄️ **Schnelles Berechnungsergebnis**"
        };
        
        const title = texts[language] || texts.en;
        
        return `${title}\n\n` +
               `🔹 **Capacity**: ${result.total_capacity_kw} kW (${result.total_capacity_watts.toLocaleString()} W)\n` +
               `🔹 **Specific Load**: ${result.load_per_m3} W/m³\n\n` +
               `*This is a simplified calculation. For detailed analysis, provide more parameters.*`;
               
    } catch (error) {
        return `❌ Error: ${error.message}`;
    }
}

module.exports = {
    isColdRoomRequest,
    handleColdRoomRequest,
    quickCalculation,
    extractParameters,
    detectLanguage,
    formatResults
};