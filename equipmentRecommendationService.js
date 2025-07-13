require('dotenv').config();
const woocommerceService = require('./woocommerceService');
// Note: coldRoomCalculator removed - will be replaced with new implementation
const logger = require('./logger');

/**
 * Equipment Recommendation Service
 * AI-powered equipment selection based on requirements
 */

// Equipment categories and their WooCommerce category mappings
const EQUIPMENT_CATEGORIES = {
  cooling_units: {
    keywords: ['cooling unit', 'refrigeration unit', 'condensing unit', 'compressor', 'kühlaggregat', 'soğutma ünitesi'],
    woocommerce_categories: ['cooling-units', 'refrigeration', 'compressors'],
    capacity_range: { min: 1000, max: 50000 } // W
  },
  evaporators: {
    keywords: ['evaporator', 'air cooler', 'verdampfer', 'buharlaştırıcı'],
    woocommerce_categories: ['evaporators', 'air-coolers'],
    capacity_range: { min: 500, max: 30000 } // W
  },
  condensers: {
    keywords: ['condenser', 'kondensator', 'yoğuşturucu'],
    woocommerce_categories: ['condensers'],
    capacity_range: { min: 1000, max: 60000 } // W
  },
  insulation: {
    keywords: ['insulation', 'panel', 'sandwich panel', 'isolierung', 'yalıtım', 'panel'],
    woocommerce_categories: ['insulation', 'panels', 'sandwich-panels'],
    thickness_range: { min: 50, max: 200 } // mm
  },
  doors: {
    keywords: ['door', 'sliding door', 'hinged door', 'tür', 'kapı'],
    woocommerce_categories: ['doors', 'cold-room-doors'],
    size_range: { min: 1, max: 5 } // meters
  },
  accessories: {
    keywords: ['accessories', 'shelving', 'lighting', 'thermometer', 'aksesuar', 'raf'],
    woocommerce_categories: ['accessories', 'shelving', 'lighting', 'thermometers'],
    capacity_range: { min: 0, max: 1000 } // various
  }
};

/**
 * Extract equipment requirements from user message
 * @param {string} message - User message
 * @param {Object} calculationResult - Previous cold room calculation result
 * @returns {Object} - Equipment requirements
 */
function extractEquipmentRequirements(message, calculationResult = null) {
  const lowerMessage = message.toLowerCase();
  const requirements = {
    equipmentTypes: [],
    capacity: null,
    temperature: null,
    roomSize: null,
    budget: null,
    brand: null,
    urgency: 'normal'
  };

  // Extract equipment types from message
  for (const [category, config] of Object.entries(EQUIPMENT_CATEGORIES)) {
    if (config.keywords.some(keyword => lowerMessage.includes(keyword))) {
      requirements.equipmentTypes.push(category);
    }
  }

  // Additional keyword detection for better extraction
  if (lowerMessage.includes('cooling') || lowerMessage.includes('soğutma') || lowerMessage.includes('kühl')) {
    if (!requirements.equipmentTypes.includes('cooling_units')) {
      requirements.equipmentTypes.push('cooling_units');
    }
  }

  if (lowerMessage.includes('equipment') || lowerMessage.includes('ekipman') || lowerMessage.includes('geräte')) {
    if (requirements.equipmentTypes.length === 0) {
      requirements.equipmentTypes.push('cooling_units', 'evaporators');
    }
  }

  // If no specific equipment mentioned, suggest based on context
  if (requirements.equipmentTypes.length === 0) {
    if (lowerMessage.includes('complete') || lowerMessage.includes('komple') || lowerMessage.includes('vollständig')) {
      requirements.equipmentTypes = ['cooling_units', 'evaporators', 'insulation', 'doors'];
    } else if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('öner')) {
      requirements.equipmentTypes = ['cooling_units', 'evaporators'];
    }
  }

  // Extract capacity from calculation result or message
  if (calculationResult) {
    requirements.capacity = calculationResult.finalCapacity;
    requirements.temperature = calculationResult.parameters.temperature;
    requirements.roomSize = calculationResult.parameters.volume;
  } else {
    // Try to extract from message
    const capacityMatch = lowerMessage.match(/(\d+)\s*(?:w|watt|kw|kilowatt)/i);
    if (capacityMatch) {
      requirements.capacity = parseInt(capacityMatch[1]);
      if (lowerMessage.includes('kw') || lowerMessage.includes('kilowatt')) {
        requirements.capacity *= 1000;
      }
    }

    const tempMatch = lowerMessage.match(/(-?\d+)\s*°?c/i);
    if (tempMatch) {
      requirements.temperature = parseInt(tempMatch[1]);
    }

    const sizeMatch = lowerMessage.match(/(\d+)\s*(?:m3|m³|cubic)/i);
    if (sizeMatch) {
      requirements.roomSize = parseInt(sizeMatch[1]);
    }
  }

  // Extract budget
  const budgetMatch = lowerMessage.match(/(\d+)\s*(?:euro|€|eur)/i);
  if (budgetMatch) {
    requirements.budget = parseInt(budgetMatch[1]);
  }

  // Extract brand preference
  const brandKeywords = ['bitzer', 'danfoss', 'copeland', 'carrier', 'trane', 'johnson controls'];
  for (const brand of brandKeywords) {
    if (lowerMessage.includes(brand)) {
      requirements.brand = brand;
      break;
    }
  }

  // Extract urgency
  if (lowerMessage.includes('urgent') || lowerMessage.includes('acil') || lowerMessage.includes('dringend')) {
    requirements.urgency = 'urgent';
  } else if (lowerMessage.includes('soon') || lowerMessage.includes('yakında') || lowerMessage.includes('bald')) {
    requirements.urgency = 'soon';
  }

  return requirements;
}

/**
 * Get products for specific equipment category with filtering
 * @param {string} category - Equipment category
 * @param {Object} requirements - Equipment requirements
 * @returns {Promise<Array>} - Filtered products
 */
async function getEquipmentForCategory(category, requirements) {
  try {
    const categoryConfig = EQUIPMENT_CATEGORIES[category];
    if (!categoryConfig) {
      return [];
    }

    let products = [];
    
    // Search by category keywords
    for (const keyword of categoryConfig.keywords.slice(0, 2)) { // Limit to 2 keywords for efficiency
      try {
        const categoryProducts = await woocommerceService.searchProducts(keyword, 20);
        products = products.concat(categoryProducts);
      } catch (error) {
        logger.warn(`Failed to search for ${keyword}:`, error.message);
      }
    }

    // Remove duplicates
    const uniqueProducts = products.filter((product, index, self) => 
      index === self.findIndex(p => p.id === product.id)
    );

    // Apply filters based on requirements
    let filteredProducts = uniqueProducts;

    // Filter by capacity if available
    if (requirements.capacity && categoryConfig.capacity_range) {
      filteredProducts = filteredProducts.filter(product => {
        const capacity = extractCapacityFromProduct(product, requirements.capacity);
        return capacity >= categoryConfig.capacity_range.min && 
               capacity <= categoryConfig.capacity_range.max;
      });
    }

    // Filter by brand if specified
    if (requirements.brand) {
      filteredProducts = filteredProducts.filter(product => 
        product.name.toLowerCase().includes(requirements.brand.toLowerCase())
      );
    }

    // Filter by price if budget specified
    if (requirements.budget) {
      filteredProducts = filteredProducts.filter(product => {
        const price = parseFloat(product.price) || 0;
        return price <= requirements.budget;
      });
    }

    // Sort by relevance score
    filteredProducts = filteredProducts.map(product => ({
      ...product,
      relevanceScore: calculateRelevanceScore(product, requirements, category)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);

    return filteredProducts.slice(0, 5); // Return top 5 matches

  } catch (error) {
    logger.error(`Error getting equipment for category ${category}:`, error);
    return [];
  }
}

/**
 * Extract capacity information from product
 * @param {Object} product - WooCommerce product
 * @param {number} targetCapacity - Target capacity for comparison
 * @returns {number} - Estimated capacity
 */
function extractCapacityFromProduct(product, targetCapacity) {
  const productText = `${product.name} ${product.description || ''} ${product.short_description || ''}`.toLowerCase();
  
  // Look for capacity mentions in product
  const capacityMatch = productText.match(/(\d+(?:\.\d+)?)\s*(?:kw|kilowatt|w|watt)/i);
  if (capacityMatch) {
    let capacity = parseFloat(capacityMatch[1]);
    if (productText.includes('kw') || productText.includes('kilowatt')) {
      capacity *= 1000;
    }
    return capacity;
  }

  // If no capacity found, estimate based on target capacity and product type
  return targetCapacity * 0.8; // Conservative estimate for compatibility
}

/**
 * Calculate relevance score for a product
 * @param {Object} product - WooCommerce product
 * @param {Object} requirements - Equipment requirements
 * @param {string} category - Equipment category
 * @returns {number} - Relevance score (0-100)
 */
function calculateRelevanceScore(product, requirements, category) {
  let score = 50; // Base score

  const productText = `${product.name} ${product.description || ''} ${product.short_description || ''}`.toLowerCase();
  const categoryConfig = EQUIPMENT_CATEGORIES[category];

  // Keyword matching
  const keywordMatches = categoryConfig.keywords.filter(keyword => 
    productText.includes(keyword.toLowerCase())
  ).length;
  score += keywordMatches * 10;

  // Brand preference
  if (requirements.brand && productText.includes(requirements.brand.toLowerCase())) {
    score += 20;
  }

  // Price consideration
  if (requirements.budget) {
    const price = parseFloat(product.price) || 0;
    if (price <= requirements.budget) {
      score += 15;
      if (price <= requirements.budget * 0.8) { // Good value
        score += 10;
      }
    } else {
      score -= 20; // Over budget penalty
    }
  }

  // Stock status
  if (product.stock_status === 'instock') {
    score += 10;
  } else {
    score -= 15;
  }

  // Product rating
  if (product.average_rating) {
    score += parseFloat(product.average_rating) * 2;
  }

  // Capacity match (if determinable)
  if (requirements.capacity) {
    const productCapacity = extractCapacityFromProduct(product, requirements.capacity);
    const capacityDiff = Math.abs(productCapacity - requirements.capacity) / requirements.capacity;
    if (capacityDiff < 0.2) { // Within 20%
      score += 15;
    } else if (capacityDiff < 0.5) { // Within 50%
      score += 5;
    }
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Generate equipment recommendations
 * @param {Object} requirements - Equipment requirements
 * @param {string} language - Language code
 * @returns {Promise<Object>} - Recommendation results
 */
async function generateRecommendations(requirements, language = 'en') {
  try {
    const recommendations = {};
    const totalProducts = [];

    // Get recommendations for each equipment type
    for (const equipmentType of requirements.equipmentTypes) {
      const products = await getEquipmentForCategory(equipmentType, requirements);
      if (products.length > 0) {
        recommendations[equipmentType] = products;
        totalProducts.push(...products);
      }
    }

    // Calculate total estimated cost
    let totalCost = 0;
    for (const products of Object.values(recommendations)) {
      if (products.length > 0) {
        const price = parseFloat(products[0].price) || 0;
        totalCost += price;
      }
    }

    return {
      recommendations,
      totalProducts: totalProducts.length,
      estimatedCost: totalCost,
      currency: 'EUR',
      requirements
    };

  } catch (error) {
    logger.error('Error generating recommendations:', error);
    throw error;
  }
}

/**
 * Format recommendations for chat response
 * @param {Object} recommendationResult - Recommendation results
 * @param {string} language - Language code
 * @returns {string} - Formatted response
 */
function formatRecommendations(recommendationResult, language = 'en') {
  const { recommendations, totalProducts, estimatedCost, requirements } = recommendationResult;

  const texts = {
    en: {
      title: "🔧 Equipment Recommendations",
      based_on: "Based on your requirements",
      capacity: "Capacity",
      temperature: "Temperature",
      room_size: "Room Size",
      budget: "Budget",
      recommended: "Recommended Equipment",
      price: "Price",
      view_product: "View Product",
      total_cost: "Estimated Total Cost",
      note: "💡 Note: Prices may vary. Contact us for detailed quotes.",
      no_results: "No suitable equipment found for your requirements.",
      contact: "Please contact us for custom solutions."
    },
    tr: {
      title: "🔧 Ekipman Önerileri",
      based_on: "Gereksinimlerinize göre",
      capacity: "Kapasite",
      temperature: "Sıcaklık",
      room_size: "Oda Boyutu",
      budget: "Bütçe",
      recommended: "Önerilen Ekipman",
      price: "Fiyat",
      view_product: "Ürünü Görüntüle",
      total_cost: "Tahmini Toplam Maliyet",
      note: "💡 Not: Fiyatlar değişebilir. Detaylı teklifler için bizimle iletişime geçin.",
      no_results: "Gereksinimlerinize uygun ekipman bulunamadı.",
      contact: "Özel çözümler için lütfen bizimle iletişime geçin."
    },
    de: {
      title: "🔧 Geräte-Empfehlungen",
      based_on: "Basierend auf Ihren Anforderungen",
      capacity: "Kapazität",
      temperature: "Temperatur",
      room_size: "Raumgröße",
      budget: "Budget",
      recommended: "Empfohlene Ausrüstung",
      price: "Preis",
      view_product: "Produkt ansehen",
      total_cost: "Geschätzte Gesamtkosten",
      note: "💡 Hinweis: Preise können variieren. Kontaktieren Sie uns für detaillierte Angebote.",
      no_results: "Keine passende Ausrüstung für Ihre Anforderungen gefunden.",
      contact: "Bitte kontaktieren Sie uns für maßgeschneiderte Lösungen."
    }
  };

  const t = texts[language] || texts.en;

  if (totalProducts === 0) {
    return `${t.title}\n\n❌ ${t.no_results}\n\n${t.contact}`;
  }

  let response = `${t.title}\n\n`;

  // Add requirements summary
  if (requirements.capacity || requirements.temperature || requirements.roomSize) {
    response += `📋 ${t.based_on}:\n`;
    if (requirements.capacity) response += `• ${t.capacity}: ${requirements.capacity.toLocaleString()} W\n`;
    if (requirements.temperature) response += `• ${t.temperature}: ${requirements.temperature}°C\n`;
    if (requirements.roomSize) response += `• ${t.room_size}: ${requirements.roomSize} m³\n`;
    if (requirements.budget) response += `• ${t.budget}: €${requirements.budget.toLocaleString()}\n`;
    response += '\n';
  }

  // Add recommendations by category
  for (const [category, products] of Object.entries(recommendations)) {
    if (products.length === 0) continue;

    const categoryNames = {
      en: {
        cooling_units: "Cooling Units",
        evaporators: "Evaporators", 
        condensers: "Condensers",
        insulation: "Insulation Panels",
        doors: "Cold Room Doors",
        accessories: "Accessories"
      },
      tr: {
        cooling_units: "Soğutma Üniteleri",
        evaporators: "Evaporatörler",
        condensers: "Kondensörler", 
        insulation: "Yalıtım Panelleri",
        doors: "Soğuk Oda Kapıları",
        accessories: "Aksesuarlar"
      },
      de: {
        cooling_units: "Kühlaggregate",
        evaporators: "Verdampfer",
        condensers: "Kondensatoren",
        insulation: "Isolationspaneele", 
        doors: "Kühlraumtüren",
        accessories: "Zubehör"
      }
    };

    const categoryName = categoryNames[language]?.[category] || categoryNames.en[category];
    response += `🔹 **${categoryName}**\n`;

    // Show top 2 products per category
    const topProducts = products.slice(0, 2);
    for (const product of topProducts) {
      const price = product.price ? `€${parseFloat(product.price).toLocaleString()}` : t.contact;
      response += `\n*${product.name}*\n`;
      response += `${t.price}: ${price}\n`;
      if (product.short_description) {
        const desc = product.short_description.replace(/<[^>]*>/g, '').substring(0, 100);
        response += `${desc}...\n`;
      }
      response += `${t.view_product}: ${product.permalink}\n`;
    }
    response += '\n';
  }

  // Add total cost if available
  if (estimatedCost > 0) {
    response += `💰 ${t.total_cost}: €${estimatedCost.toLocaleString()}\n\n`;
  }

  response += t.note;

  return response;
}

module.exports = {
  extractEquipmentRequirements,
  generateRecommendations,
  formatRecommendations,
  getEquipmentForCategory
};