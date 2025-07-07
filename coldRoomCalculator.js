const logger = require('./logger');

/**
 * Cold Room Capacity Calculator Service
 * Implements the same algorithm as the HTML calculator
 */

// Capacity table (W/m³) for different volumes and temperatures
// Format: volume: [12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C]
const capacityTable = {
    5: [71, 94, 112, 130, 114, 121, 128, 144],
    10: [60, 80, 96, 111, 91, 97, 104, 116],
    15: [54, 72, 86, 100, 73, 79, 84, 95],
    20: [51, 68, 82, 96, 68, 73, 78, 88],
    25: [49, 66, 79, 92, 64, 69, 74, 84],
    30: [47, 62, 75, 88, 56, 60, 65, 73],
    35: [45, 60, 73, 85, 53, 58, 62, 71],
    40: [44, 59, 71, 83, 51, 55, 59, 68],
    45: [43, 58, 70, 82, 50, 54, 58, 66],
    50: [43, 57, 69, 81, 49, 53, 57, 65],
    60: [40, 54, 65, 77, 43, 46, 50, 57],
    70: [40, 53, 64, 76, 41, 45, 49, 56],
    80: [39, 52, 64, 75, 40, 44, 48, 55],
    90: [39, 52, 63, 74, 40, 43, 47, 54],
    100: [40, 53, 65, 76, 36, 40, 43, 50],
    125: [36, 48, 58, 69, 34, 37, 41, 47],
    150: [36, 47, 58, 68, 33, 36, 40, 46]
};

// Temperature index mapping
const temperatureIndex = {
    12: 0, 5: 1, 0: 2, '-5': 3, '-15': 4, '-18': 5, '-20': 6, '-25': 7
};

/**
 * Interpolate capacity for given volume and temperature
 * @param {number} volume - Room volume in m³
 * @param {number} temperature - Room temperature in °C
 * @returns {number|null} - Capacity in W/m³ or null if invalid
 */
function interpolateCapacity(volume, temperature) {
    const tempIndex = temperatureIndex[temperature.toString()];
    if (tempIndex === undefined) return null;

    const volumes = Object.keys(capacityTable).map(Number).sort((a, b) => a - b);
    
    // Direct match
    if (capacityTable[volume]) {
        return capacityTable[volume][tempIndex];
    }

    // Interpolation
    let lowerVol = null;
    let upperVol = null;

    for (let i = 0; i < volumes.length - 1; i++) {
        if (volume >= volumes[i] && volume <= volumes[i + 1]) {
            lowerVol = volumes[i];
            upperVol = volumes[i + 1];
            break;
        }
    }

    if (lowerVol === null) {
        // Extrapolation
        if (volume < volumes[0]) {
            return capacityTable[volumes[0]][tempIndex] * (volume / volumes[0]);
        } else {
            const lastVol = volumes[volumes.length - 1];
            return capacityTable[lastVol][tempIndex] * (volume / lastVol) * 0.8; // Reduction factor for large volumes
        }
    }

    const lowerCap = capacityTable[lowerVol][tempIndex];
    const upperCap = capacityTable[upperVol][tempIndex];
    
    const ratio = (volume - lowerVol) / (upperVol - lowerVol);
    return lowerCap + (upperCap - lowerCap) * ratio;
}

/**
 * Calculate cold room capacity
 * @param {Object} params - Calculation parameters
 * @param {number} params.volume - Room volume in m³
 * @param {number} params.temperature - Room temperature in °C
 * @param {number} params.ambientTemp - Ambient temperature in °C
 * @param {string} params.climateZone - Climate zone ('cool' or 'hot')
 * @param {number} params.safetyFactor - Safety factor (1.0, 1.1, 1.2, 1.3)
 * @returns {Object} - Calculation results
 */
function calculateCapacity(params) {
    const {
        volume = 330,
        temperature = -20,
        ambientTemp = 35,
        climateZone = 'cool',
        safetyFactor = 1.2
    } = params;

    // Validate inputs
    if (!volume || volume <= 0) {
        throw new Error('Volume must be a positive number');
    }

    if (!temperatureIndex.hasOwnProperty(temperature.toString())) {
        throw new Error('Invalid temperature. Supported temperatures: 12, 5, 0, -5, -15, -18, -20, -25°C');
    }

    if (ambientTemp < 25 || ambientTemp > 50) {
        throw new Error('Ambient temperature must be between 25°C and 50°C');
    }

    if (!['cool', 'hot'].includes(climateZone)) {
        throw new Error('Climate zone must be "cool" or "hot"');
    }

    if (![1.0, 1.1, 1.2, 1.3].includes(safetyFactor)) {
        throw new Error('Safety factor must be 1.0, 1.1, 1.2, or 1.3');
    }

    // Base capacity calculation (35°C reference) - this gives W/m³
    let baseCapacityPerM3 = interpolateCapacity(volume, temperature);
    
    if (!baseCapacityPerM3) {
        throw new Error('Unable to calculate capacity for the given parameters');
    }

    // Calculate total base capacity for the volume
    const baseCapacity = baseCapacityPerM3 * volume;

    // Temperature correction
    const tempCorrection = 1 + (ambientTemp - 35) * 0.02; // 2% increase per 1°C
    
    // Climate zone correction
    const climateCorrection = climateZone === 'hot' ? 1.1 : 1.0;
    
    // Final capacity calculation
    const finalCapacity = Math.round(baseCapacity * tempCorrection * climateCorrection * safetyFactor);

    return {
        finalCapacity,
        baseCapacity: Math.round(baseCapacity),
        tempCorrection: parseFloat(tempCorrection.toFixed(2)),
        climateCorrection: parseFloat(climateCorrection.toFixed(2)),
        safetyFactor: parseFloat(safetyFactor.toFixed(1)),
        capacityPerM3: Math.round(finalCapacity / volume),
        parameters: {
            volume,
            temperature,
            ambientTemp,
            climateZone,
            safetyFactor
        }
    };
}

/**
 * Generate comparison table for different volumes
 * @param {Object} params - Base parameters
 * @returns {Array} - Array of comparison results
 */
function generateComparison(params) {
    const volumes = [50, 100, 150, 200, 300, 400, 500];
    const results = [];

    volumes.forEach(vol => {
        try {
            const result = calculateCapacity({ ...params, volume: vol });
            results.push({
                volume: vol,
                capacity: result.finalCapacity,
                capacityPerM3: result.capacityPerM3
            });
        } catch (error) {
            logger.warn(`Failed to calculate for volume ${vol}: ${error.message}`);
        }
    });

    return results;
}

/**
 * Extract calculation parameters from user message
 * @param {string} message - User message
 * @returns {Object} - Extracted parameters
 */
function extractParameters(message) {
    const lowerMessage = message.toLowerCase();
    const params = {};

    // Extract volume
    const volumeMatch = lowerMessage.match(/(\d+)\s*(?:m3|m³|cubic meters?|hacim|volume)/i);
    if (volumeMatch) {
        params.volume = parseInt(volumeMatch[1]);
    }

    // Extract room temperature - look for negative temperatures first
    const negTempMatch = lowerMessage.match(/(?:room|iç|temperature|sıcaklık)\s*(?:is\s*)?(-?\d+)\s*°?c/i);
    if (negTempMatch) {
        params.temperature = parseInt(negTempMatch[1]);
    } else {
        // Look for temperature patterns like "-20°C", "-5C", etc.
        const tempPattern = lowerMessage.match(/(-?\d+)\s*°?c/i);
        if (tempPattern) {
            const temp = parseInt(tempPattern[1]);
            if (temperatureIndex.hasOwnProperty(temp.toString())) {
                params.temperature = temp;
            }
        }
    }

    // Extract ambient temperature
    const ambientMatch = lowerMessage.match(/(?:ambient|dış|outside|external)\s*(?:temperature|sıcaklık)\s*(?:is\s*)?(\d+)\s*°?c/i);
    if (ambientMatch) {
        params.ambientTemp = parseInt(ambientMatch[1]);
    } else {
        // Look for ambient temperature patterns like "35°C ambient", "40C outside", etc.
        const ambientPattern = lowerMessage.match(/(\d+)\s*°?c\s*(?:ambient|dış|outside|external)/i);
        if (ambientPattern) {
            params.ambientTemp = parseInt(ambientPattern[1]);
        }
    }

    // Extract climate zone
    if (lowerMessage.includes('hot') || lowerMessage.includes('sıcak') || lowerMessage.includes('warm')) {
        params.climateZone = 'hot';
    } else if (lowerMessage.includes('cool') || lowerMessage.includes('serin') || lowerMessage.includes('cold')) {
        params.climateZone = 'cool';
    }

    // Extract safety factor
    if (lowerMessage.includes('30%') || lowerMessage.includes('1.3')) {
        params.safetyFactor = 1.3;
    } else if (lowerMessage.includes('20%') || lowerMessage.includes('1.2')) {
        params.safetyFactor = 1.2;
    } else if (lowerMessage.includes('10%') || lowerMessage.includes('1.1')) {
        params.safetyFactor = 1.1;
    } else if (lowerMessage.includes('0%') || lowerMessage.includes('1.0')) {
        params.safetyFactor = 1.0;
    }

    return params;
}

/**
 * Format calculation results for chat response
 * @param {Object} result - Calculation result
 * @param {string} language - Language code
 * @returns {string} - Formatted response
 */
function formatResult(result, language = 'en') {
    const responses = {
        en: {
            title: "❄️ Cold Room Capacity Calculation Results",
            capacity: "Required Cooling Capacity",
            perM3: "Capacity per m³",
            details: "Calculation Details",
            base: "Base Capacity (35°C reference)",
            tempCorr: "Temperature Correction",
            climateCorr: "Climate Zone Correction",
            safety: "Safety Factor",
            total: "TOTAL CAPACITY",
            parameters: "Parameters Used",
            volume: "Room Volume",
            temperature: "Room Temperature",
            ambient: "Ambient Temperature",
            climate: "Climate Zone",
            safetyFactor: "Safety Factor"
        },
        tr: {
            title: "❄️ Soğuk Oda Kapasite Hesaplama Sonuçları",
            capacity: "Gerekli Soğutma Kapasitesi",
            perM3: "m³ başına kapasite",
            details: "Hesaplama Detayları",
            base: "Temel Kapasite (35°C referans)",
            tempCorr: "Sıcaklık Düzeltmesi",
            climateCorr: "İklim Bölgesi Düzeltmesi",
            safety: "Güvenlik Faktörü",
            total: "TOPLAM KAPASİTE",
            parameters: "Kullanılan Parametreler",
            volume: "Oda Hacmi",
            temperature: "Oda Sıcaklığı",
            ambient: "Dış Ortam Sıcaklığı",
            climate: "İklim Bölgesi",
            safetyFactor: "Güvenlik Faktörü"
        },
        de: {
            title: "❄️ Kühlraum-Kapazitätsberechnung Ergebnisse",
            capacity: "Erforderliche Kühlkapazität",
            perM3: "Kapazität pro m³",
            details: "Berechnungsdetails",
            base: "Grundkapazität (35°C Referenz)",
            tempCorr: "Temperaturkorrektur",
            climateCorr: "Klimazone Korrektur",
            safety: "Sicherheitsfaktor",
            total: "GESAMTKAPAZITÄT",
            parameters: "Verwendete Parameter",
            volume: "Raumvolumen",
            temperature: "Raumtemperatur",
            ambient: "Umgebungstemperatur",
            climate: "Klimazone",
            safetyFactor: "Sicherheitsfaktor"
        }
    };

    const r = responses[language] || responses.en;

    let response = `${r.title}\n\n`;
    response += `🔹 ${r.capacity}: *${result.finalCapacity.toLocaleString()} W*\n`;
    response += `🔹 ${r.perM3}: *${result.capacityPerM3} W/m³*\n\n`;
    
    response += `📊 ${r.details}:\n`;
    response += `• ${r.base}: ${result.baseCapacity} W\n`;
    response += `• ${r.tempCorr}: x${result.tempCorrection}\n`;
    response += `• ${r.climateCorr}: x${result.climateCorrection}\n`;
    response += `• ${r.safety}: x${result.safetyFactor}\n`;
    response += `• ${r.total}: *${result.finalCapacity.toLocaleString()} W*\n\n`;
    
    response += `⚙️ ${r.parameters}:\n`;
    response += `• ${r.volume}: ${result.parameters.volume} m³\n`;
    response += `• ${r.temperature}: ${result.parameters.temperature}°C\n`;
    response += `• ${r.ambient}: ${result.parameters.ambientTemp}°C\n`;
    response += `• ${r.climate}: ${result.parameters.climateZone === 'hot' ? 'Hot' : 'Cool'}\n`;
    response += `• ${r.safetyFactor}: ${Math.round((result.parameters.safetyFactor - 1) * 100)}%`;

    return response;
}

/**
 * Generate comparison table for chat response
 * @param {Array} comparison - Comparison results
 * @param {string} language - Language code
 * @returns {string} - Formatted comparison table
 */
function formatComparison(comparison, language = 'en') {
    const headers = {
        en: { volume: "Volume (m³)", capacity: "Capacity (W)", perM3: "W/m³" },
        tr: { volume: "Hacim (m³)", capacity: "Kapasite (W)", perM3: "W/m³" },
        de: { volume: "Volumen (m³)", capacity: "Kapazität (W)", perM3: "W/m³" }
    };

    const h = headers[language] || headers.en;

    let response = `📈 ${language === 'tr' ? 'Farklı Hacimler İçin Karşılaştırma' : 
                   language === 'de' ? 'Vergleich für verschiedene Volumina' : 
                   'Comparison for Different Volumes'}:\n\n`;
    
    response += `| ${h.volume} | ${h.capacity} | ${h.perM3} |\n`;
    response += `|---------|------------|--------|\n`;
    
    comparison.forEach(item => {
        response += `| ${item.volume} | ${item.capacity.toLocaleString()} | ${item.capacityPerM3} |\n`;
    });

    return response;
}

module.exports = {
    calculateCapacity,
    generateComparison,
    extractParameters,
    formatResult,
    formatComparison,
    interpolateCapacity
}; 