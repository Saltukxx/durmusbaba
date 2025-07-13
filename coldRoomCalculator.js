const logger = require('./logger');

/**
 * Cold Room Capacity Calculator
 * Professional refrigeration system sizing calculations
 */
class ColdRoomCalculator {
  constructor() {
    // Supported temperature ranges (°C)
    this.supportedTemperatures = [-25, -20, -18, -15, -5, 0, 5, 12];
    
    // Base cooling load factors (W/m³) for different temperature ranges
    this.baseLoadFactors = {
      '-25': 80,   // Deep freeze
      '-20': 70,   // Freezing
      '-18': 65,   // Freezing
      '-15': 60,   // Freezing
      '-5': 45,    // Chilling
      '0': 40,     // Chilling
      '5': 35,     // Chilling
      '12': 30     // Cooling
    };
    
    // Product load factors (W/kg) for different product types
    this.productLoadFactors = {
      'meat': 0.8,
      'fish': 0.9,
      'dairy': 0.6,
      'vegetables': 0.4,
      'fruits': 0.4,
      'frozen': 1.2,
      'general': 0.7
    };
    
    // Insulation U-values (W/m²K) for different thicknesses
    this.insulationUValues = {
      '50': 0.6,
      '75': 0.4,
      '100': 0.3,
      '120': 0.25,
      '150': 0.2,
      '200': 0.15
    };
  }

  /**
   * Calculate total cooling capacity
   * @param {Object} parameters - Calculation parameters
   * @returns {Object} - Calculation results
   */
  calculateCapacity(parameters) {
    try {
      const {
        length, width, height,
        temperature, ambientTemperature = 35,
        productType = 'general', dailyLoad = 0,
        entryTemperature = 20, insulationThickness = 100,
        doorOpenings = 10, coolingTime = 24,
        safetyFactor = 10, climateZone = 'temperate'
      } = parameters;

      // Calculate room volume
      const volume = length * width * height;
      const surfaceArea = 2 * (length * width + length * height + width * height);

      // 1. Transmission Load (heat through walls)
      const transmissionLoad = this.calculateTransmissionLoad(
        surfaceArea, temperature, ambientTemperature, insulationThickness
      );

      // 2. Product Load (heat from products)
      const productLoad = this.calculateProductLoad(
        dailyLoad, temperature, entryTemperature, productType
      );

      // 3. Infiltration Load (heat from door openings)
      const infiltrationLoad = this.calculateInfiltrationLoad(
        volume, temperature, ambientTemperature, doorOpenings
      );

      // 4. Internal Load (lights, people, equipment)
      const internalLoad = this.calculateInternalLoad(volume);

      // 5. Cooling Time Factor
      const coolingTimeFactor = this.calculateCoolingTimeFactor(coolingTime);

      // 6. Climate Zone Factor
      const climateFactor = this.getClimateFactor(climateZone);

      // Calculate total load
      const totalLoad = (transmissionLoad + productLoad + infiltrationLoad + internalLoad) 
                       * coolingTimeFactor * climateFactor;

      // Apply safety factor
      const finalCapacity = totalLoad * (1 + safetyFactor / 100);

      // Calculate load breakdown percentages
      const breakdown = {
        transmission: totalLoad > 0 ? Math.round((transmissionLoad / totalLoad) * 100) : 0,
        product: totalLoad > 0 ? Math.round((productLoad / totalLoad) * 100) : 0,
        infiltration: totalLoad > 0 ? Math.round((infiltrationLoad / totalLoad) * 100) : 0,
        internal: totalLoad > 0 ? Math.round((internalLoad / totalLoad) * 100) : 0
      };

      return {
        volume: Math.round(volume),
        surfaceArea: Math.round(surfaceArea),
        totalLoad: Math.round(totalLoad),
        finalCapacity: Math.round(finalCapacity),
        breakdown,
        parameters: {
          ...parameters,
          volume: Math.round(volume),
          surfaceArea: Math.round(surfaceArea)
        }
      };

    } catch (error) {
      logger.error('Error calculating cold room capacity:', error);
      throw new Error('Calculation failed');
    }
  }

  /**
   * Calculate transmission load through walls
   */
  calculateTransmissionLoad(surfaceArea, temperature, ambientTemperature, insulationThickness) {
    const uValue = this.insulationUValues[insulationThickness] || 0.3;
    const tempDifference = ambientTemperature - temperature;
    return surfaceArea * uValue * tempDifference;
  }

  /**
   * Calculate product load
   */
  calculateProductLoad(dailyLoad, temperature, entryTemperature, productType) {
    if (dailyLoad <= 0) return 0;
    
    const productFactor = this.productLoadFactors[productType] || 0.7;
    const tempDifference = entryTemperature - temperature;
    const specificHeat = 3.6; // kJ/kgK for most products
    
    return (dailyLoad * specificHeat * tempDifference * productFactor) / 24; // Convert to hourly
  }

  /**
   * Calculate infiltration load from door openings
   */
  calculateInfiltrationLoad(volume, temperature, ambientTemperature, doorOpenings) {
    const airDensity = 1.2; // kg/m³
    const specificHeat = 1.005; // kJ/kgK
    const infiltrationRate = 0.1; // m³ per opening
    
    const tempDifference = ambientTemperature - temperature;
    const hourlyInfiltration = (doorOpenings * infiltrationRate) / 24;
    
    return hourlyInfiltration * airDensity * specificHeat * tempDifference;
  }

  /**
   * Calculate internal load (lights, people, equipment)
   */
  calculateInternalLoad(volume) {
    // Base internal load: 5 W/m³
    return volume * 5;
  }

  /**
   * Calculate cooling time factor
   */
  calculateCoolingTimeFactor(coolingTime) {
    // Standard is 24 hours, factor increases for shorter times
    return 24 / coolingTime;
  }

  /**
   * Get climate zone factor
   */
  getClimateFactor(climateZone) {
    const factors = {
      'hot': 1.3,
      'warm': 1.15,
      'temperate': 1.0,
      'cool': 0.9
    };
    return factors[climateZone] || 1.0;
  }

  /**
   * Validate calculation parameters
   */
  validateParameters(parameters) {
    const errors = [];

    // Check required parameters
    if (!parameters.length || parameters.length <= 0) {
      errors.push('Room length is required');
    }
    if (!parameters.width || parameters.width <= 0) {
      errors.push('Room width is required');
    }
    if (!parameters.height || parameters.height <= 0) {
      errors.push('Room height is required');
    }
    if (!parameters.temperature) {
      errors.push('Storage temperature is required');
    }

    // Validate temperature
    if (parameters.temperature && !this.supportedTemperatures.includes(parameters.temperature)) {
      errors.push(`Temperature must be one of: ${this.supportedTemperatures.join(', ')}°C`);
    }

    // Validate dimensions
    if (parameters.length && (parameters.length < 1 || parameters.length > 50)) {
      errors.push('Length must be between 1 and 50 meters');
    }
    if (parameters.width && (parameters.width < 1 || parameters.width > 50)) {
      errors.push('Width must be between 1 and 50 meters');
    }
    if (parameters.height && (parameters.height < 1 || parameters.height > 10)) {
      errors.push('Height must be between 1 and 10 meters');
    }

    // Validate other parameters
    if (parameters.ambientTemperature && (parameters.ambientTemperature < 20 || parameters.ambientTemperature > 50)) {
      errors.push('Ambient temperature must be between 20 and 50°C');
    }
    if (parameters.dailyLoad && parameters.dailyLoad < 0) {
      errors.push('Daily load cannot be negative');
    }
    if (parameters.doorOpenings && (parameters.doorOpenings < 0 || parameters.doorOpenings > 100)) {
      errors.push('Door openings must be between 0 and 100 per day');
    }

    return errors;
  }

  /**
   * Format calculation results for display
   */
  formatResults(results, language = 'en') {
    const texts = {
      en: {
        title: '❄️ **Cold Room Capacity Calculation Results**',
        volume: 'Room Volume',
        capacity: 'Required Cooling Capacity',
        breakdown: 'Load Breakdown',
        transmission: 'Transmission Load',
        product: 'Product Load',
        infiltration: 'Infiltration Load',
        internal: 'Internal Load',
        recommendations: 'System Recommendations',
        nextSteps: "What's Next?",
        contact: 'Contact our technical team for detailed system design',
        disclaimer: 'This calculation provides an estimate. Professional engineering review is recommended.'
      },
      tr: {
        title: '❄️ **Soğuk Oda Kapasite Hesaplama Sonuçları**',
        volume: 'Oda Hacmi',
        capacity: 'Gerekli Soğutma Kapasitesi',
        breakdown: 'Yük Dağılımı',
        transmission: 'İletim Yükü',
        product: 'Ürün Yükü',
        infiltration: 'Sızıntı Yükü',
        internal: 'İç Yük',
        recommendations: 'Sistem Önerileri',
        nextSteps: 'Sonraki Adımlar',
        contact: 'Detaylı sistem tasarımı için teknik ekibimizle iletişime geçin',
        disclaimer: 'Bu hesaplama bir tahmin sağlar. Profesyonel mühendislik incelemesi önerilir.'
      },
      de: {
        title: '❄️ **Kühlraum-Kapazitätsberechnung Ergebnisse**',
        volume: 'Raumvolumen',
        capacity: 'Erforderliche Kühlkapazität',
        breakdown: 'Lastaufteilung',
        transmission: 'Transmissionslast',
        product: 'Produktlast',
        infiltration: 'Infiltrationslast',
        internal: 'Innere Last',
        recommendations: 'Systemempfehlungen',
        nextSteps: 'Nächste Schritte',
        contact: 'Kontaktieren Sie unser technisches Team für detaillierte Systemplanung',
        disclaimer: 'Diese Berechnung liefert eine Schätzung. Professionelle technische Überprüfung wird empfohlen.'
      }
    };

    const t = texts[language] || texts.en;

    let response = `${t.title}\n\n`;
    response += `📏 **${t.volume}:** ${results.volume} m³\n`;
    response += `🔧 **${t.capacity}:** ${(results.finalCapacity / 1000).toFixed(1)} kW (${results.finalCapacity.toLocaleString()} W)\n\n`;

    response += `📊 **${t.breakdown}:**\n`;
    response += `• ${t.transmission}: ${results.breakdown.transmission}%\n`;
    response += `• ${t.product}: ${results.breakdown.product}%\n`;
    response += `• ${t.infiltration}: ${results.breakdown.infiltration}%\n`;
    response += `• ${t.internal}: ${results.breakdown.internal}%\n\n`;

    response += `💡 **${t.recommendations}:**\n`;
    response += `• Cooling Unit: ${(results.finalCapacity / 1000).toFixed(1)} kW capacity\n`;
    response += `• Evaporator: ${(results.finalCapacity * 0.8 / 1000).toFixed(1)} kW capacity\n`;
    response += `• Insulation: ${results.parameters.insulationThickness}mm thickness\n`;
    response += `• Door: Standard cold room door\n\n`;

    response += `🚀 **${t.nextSteps}:**\n`;
    response += `• ${t.contact}\n`;
    response += `• Request detailed quotation\n`;
    response += `• Schedule site visit\n\n`;

    response += `⚠️ ${t.disclaimer}`;

    return response;
  }
}

module.exports = new ColdRoomCalculator(); 