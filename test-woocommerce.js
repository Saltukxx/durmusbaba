require('dotenv').config();
const woocommerceService = require('./woocommerceService');

// Get search keyword from command line arguments or use a default
const searchKeyword = process.argv[2] || 'product';

async function testWooCommerceIntegration() {
  try {
    console.log('\n=== Testing WooCommerce Integration ===\n');
    
    // Check if WooCommerce credentials are set
    if (!process.env.WOOCOMMERCE_URL || 
        !process.env.WOOCOMMERCE_CONSUMER_KEY || 
        !process.env.WOOCOMMERCE_CONSUMER_SECRET) {
      console.error('❌ WooCommerce API credentials not set in .env file');
      console.error('Please set WOOCOMMERCE_URL, WOOCOMMERCE_CONSUMER_KEY, and WOOCOMMERCE_CONSUMER_SECRET');
      process.exit(1);
    }
    
    console.log(`WooCommerce Store URL: ${process.env.WOOCOMMERCE_URL}`);
    console.log(`Testing with search keyword: "${searchKeyword}"\n`);
    
    // Test product search
    console.log('Searching for products...');
    const products = await woocommerceService.searchProducts(searchKeyword);
    
    if (products.length === 0) {
      console.log(`\nNo products found matching "${searchKeyword}"`);
    } else {
      console.log(`\nFound ${products.length} products matching "${searchKeyword}":`);
      
      // Display the first 3 products (or fewer if less than 3 are found)
      const displayProducts = products.slice(0, 3);
      
      for (let i = 0; i < displayProducts.length; i++) {
        const product = displayProducts[i];
        console.log(`\n--- Product ${i + 1} ---`);
        console.log(`ID: ${product.id}`);
        console.log(`Name: ${product.name}`);
        console.log(`Price: ${product.price}`);
        console.log(`Status: ${product.status}`);
        console.log(`In Stock: ${product.stock_status === 'instock' ? 'Yes' : 'No'}`);
        
        // Test formatting
        console.log('\nFormatted product info:');
        console.log('---------------------');
        console.log(woocommerceService.formatProductInfo(product));
        console.log('---------------------');
      }
      
      if (products.length > 3) {
        console.log(`\n... and ${products.length - 3} more products`);
      }
    }
    
    // Test categories
    console.log('\nFetching product categories...');
    const categories = await woocommerceService.getCategories();
    
    console.log(`\nFound ${categories.length} categories:`);
    categories.slice(0, 5).forEach((category, index) => {
      console.log(`${index + 1}. ${category.name} (${category.count} products)`);
    });
    
    if (categories.length > 5) {
      console.log(`... and ${categories.length - 5} more categories`);
    }
    
    console.log('\n✅ WooCommerce integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing WooCommerce integration:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testWooCommerceIntegration(); 