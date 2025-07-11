require('dotenv').config();
const WooCommerceAPI = require('woocommerce-api');
const logger = require('./logger');

// WooCommerce API configuration
const WooCommerce = new WooCommerceAPI({
  url: process.env.WOOCOMMERCE_URL,
  consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
  consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET,
  wpAPI: true,
  version: 'wc/v3'
});

/**
 * Get products from WooCommerce
 * @param {Object} options - Query parameters
 * @returns {Promise<Array>} - List of products
 */
async function getProducts(options = {}) {
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

module.exports = {
  getProducts,
  searchProducts,
  getCategories,
  getProductById,
  formatProductInfo,
  isProductInStock
}; 