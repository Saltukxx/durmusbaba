require('dotenv').config();
const WooCommerceAPI = require('woocommerce-api');
const logger = require('./logger');

// WooCommerce API configuration
let WooCommerce = null;

// Initialize WooCommerce only if configuration is available
if (process.env.WOOCOMMERCE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY) {
  WooCommerce = new WooCommerceAPI({
    url: process.env.WOOCOMMERCE_URL,
    consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
    consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET,
    wpAPI: true,
    version: 'wc/v3'
  });
}

/**
 * Get products from WooCommerce
 * @param {Object} options - Query parameters
 * @returns {Promise<Array>} - List of products
 */
async function getProducts(options = {}) {
  if (!WooCommerce) {
    logger.warn('WooCommerce not configured');
    return [];
  }
  
  try {
    const defaultOptions = {
      per_page: 10,
      page: 1,
      status: 'publish'
    };
    
    const queryParams = { ...defaultOptions, ...options };
    
    logger.debug('Fetching products from WooCommerce');
    
    const response = await WooCommerce.getAsync('products', queryParams);
    const products = JSON.parse(response.body);
    
    logger.debug(`Retrieved ${products.length} products`);
    
    return products;
    
  } catch (error) {
    logger.error('Error fetching products:', error.message);
    throw error;
  }
}

/**
 * Search products by keyword
 * @param {string} keyword - Search keyword
 * @param {number} limit - Maximum number of results
 * @returns {Promise<Array>} - List of matching products
 */
async function searchProducts(keyword, limit = 5) {
  if (!WooCommerce) {
    logger.warn('WooCommerce not configured');
    return [];
  }
  
  try {
    logger.debug(`Searching products with keyword: ${keyword}`);
    
    const response = await WooCommerce.getAsync('products', {
      search: keyword,
      per_page: limit,
      status: 'publish'
    });
    
    const products = JSON.parse(response.body);
    
    logger.debug(`Found ${products.length} products matching "${keyword}"`);
    
    return products;
    
  } catch (error) {
    logger.error('Error searching products:', error.message);
    throw error;
  }
}

/**
 * Get product categories
 * @param {number} limit - Maximum number of categories
 * @returns {Promise<Array>} - List of categories
 */
async function getCategories(limit = 20) {
  try {
    logger.debug('Fetching product categories');
    
    const response = await WooCommerce.getAsync('products/categories', {
      per_page: limit
    });
    
    const categories = JSON.parse(response.body);
    
    logger.debug(`Retrieved ${categories.length} categories`);
    
    return categories;
    
  } catch (error) {
    logger.error('Error fetching categories:', error.message);
    throw error;
  }
}

/**
 * Get a specific product by ID
 * @param {number} productId - Product ID
 * @returns {Promise<Object>} - Product details
 */
async function getProductById(productId) {
  try {
    logger.debug(`Fetching product with ID: ${productId}`);
    
    const response = await WooCommerce.getAsync(`products/${productId}`);
    const product = JSON.parse(response.body);
    
    logger.debug(`Retrieved product: ${product.name}`);
    
    return product;
    
  } catch (error) {
    logger.error(`Error fetching product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Format product information for WhatsApp message
 * @param {Object} product - Product object
 * @returns {string} - Formatted product information
 */
function formatProductInfo(product) {
  const name = product.name;
  const price = product.price_html.replace(/<\/?[^>]+(>|$)/g, '');
  const description = product.short_description
    ? product.short_description.replace(/<\/?[^>]+(>|$)/g, '')
    : 'No description available';
  const url = product.permalink;
  
  return `*${name}*\n${price}\n\n${description}\n\nView product: ${url}`;
}

/**
 * Check if a product is in stock
 * @param {number} productId - Product ID
 * @returns {Promise<boolean>} - Whether the product is in stock
 */
async function isProductInStock(productId) {
  try {
    const product = await getProductById(productId);
    return product.in_stock;
  } catch (error) {
    logger.error(`Error checking stock for product ${productId}:`, error.message);
    throw error;
  }
}

/**
 * Get products by category
 * @param {number|string} categoryId - Category ID or slug
 * @param {Object} options - Additional query options
 * @returns {Promise<Array>} - List of products in category
 */
async function getProductsByCategory(categoryId, options = {}) {
  if (!WooCommerce) {
    logger.warn('WooCommerce not configured');
    return [];
  }

  try {
    const defaultOptions = {
      per_page: 20,
      page: 1,
      status: 'publish',
      category: categoryId
    };

    const queryParams = { ...defaultOptions, ...options };
    
    logger.debug(`Fetching products from category: ${categoryId}`);
    
    const response = await WooCommerce.getAsync('products', queryParams);
    const products = JSON.parse(response.body);
    
    logger.debug(`Retrieved ${products.length} products from category ${categoryId}`);
    
    return products;
    
  } catch (error) {
    logger.error(`Error fetching products from category ${categoryId}:`, error.message);
    throw error;
  }
}

/**
 * Search products with advanced filtering
 * @param {Object} filters - Search filters
 * @returns {Promise<Array>} - List of matching products
 */
async function searchProductsAdvanced(filters = {}) {
  if (!WooCommerce) {
    logger.warn('WooCommerce not configured');
    return [];
  }

  try {
    const {
      search = '',
      category = '',
      min_price = '',
      max_price = '',
      on_sale = '',
      featured = '',
      tag = '',
      per_page = 20,
      orderby = 'relevance',
      order = 'desc'
    } = filters;

    const queryParams = {
      per_page,
      status: 'publish',
      orderby,
      order
    };

    // Add filters only if they have values
    if (search) queryParams.search = search;
    if (category) queryParams.category = category;
    if (min_price) queryParams.min_price = min_price;
    if (max_price) queryParams.max_price = max_price;
    if (on_sale) queryParams.on_sale = on_sale;
    if (featured) queryParams.featured = featured;
    if (tag) queryParams.tag = tag;

    logger.debug('Advanced product search with filters:', queryParams);
    
    const response = await WooCommerce.getAsync('products', queryParams);
    const products = JSON.parse(response.body);
    
    logger.debug(`Advanced search returned ${products.length} products`);
    
    return products;
    
  } catch (error) {
    logger.error('Error in advanced product search:', error.message);
    throw error;
  }
}

/**
 * Get product attributes for filtering
 * @param {number} productId - Product ID
 * @returns {Promise<Array>} - Product attributes
 */
async function getProductAttributes(productId) {
  try {
    const product = await getProductById(productId);
    return product.attributes || [];
  } catch (error) {
    logger.error(`Error getting attributes for product ${productId}:`, error.message);
    return [];
  }
}

/**
 * Format product for equipment recommendation
 * @param {Object} product - Product object
 * @param {number} relevanceScore - Relevance score
 * @returns {Object} - Formatted product for recommendations
 */
function formatProductForRecommendation(product, relevanceScore = 0) {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    regular_price: product.regular_price,
    sale_price: product.sale_price,
    price_html: product.price_html,
    description: product.description,
    short_description: product.short_description,
    permalink: product.permalink,
    images: product.images,
    categories: product.categories,
    tags: product.tags,
    attributes: product.attributes,
    stock_status: product.stock_status,
    stock_quantity: product.stock_quantity,
    average_rating: product.average_rating,
    rating_count: product.rating_count,
    relevanceScore: relevanceScore,
    formatted_info: formatProductInfo(product)
  };
}

module.exports = {
  getProducts,
  searchProducts,
  searchProductsAdvanced,
  getProductsByCategory,
  getCategories,
  getProductById,
  getProductAttributes,
  formatProductInfo,
  formatProductForRecommendation,
  isProductInStock
}; 