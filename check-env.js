require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Define required environment variables
const requiredVars = [
  { name: 'WHATSAPP_API_TOKEN', description: 'WhatsApp Business API Token' },
  { name: 'WHATSAPP_PHONE_NUMBER_ID', description: 'WhatsApp Phone Number ID' },
  { name: 'WHATSAPP_VERIFY_TOKEN', description: 'Webhook Verification Token' },
  { name: 'GEMINI_API_KEY', description: 'Google Gemini AI API Key' }
];

// Define optional environment variables
const optionalVars = [
  { name: 'WOOCOMMERCE_URL', description: 'WooCommerce Store URL' },
  { name: 'WOOCOMMERCE_CONSUMER_KEY', description: 'WooCommerce Consumer Key' },
  { name: 'WOOCOMMERCE_CONSUMER_SECRET', description: 'WooCommerce Consumer Secret' },
  { name: 'PORT', description: 'Server Port', defaultValue: '3000' },
  { name: 'NODE_ENV', description: 'Node Environment', defaultValue: 'development' }
];

// Check if .env file exists
const envPath = path.join(__dirname, '.env');
const envExists = fs.existsSync(envPath);

console.log('\n=== Environment Variables Check ===\n');

if (!envExists) {
  console.log('❌ .env file not found!');
  console.log('Please create a .env file based on .env.example');
} else {
  console.log('✅ .env file found');
}

console.log('\n=== Required Variables ===\n');

// Check required variables
let missingRequired = false;
requiredVars.forEach(variable => {
  const value = process.env[variable.name];
  if (!value) {
    console.log(`❌ ${variable.name}: NOT SET - ${variable.description}`);
    missingRequired = true;
  } else {
    console.log(`✅ ${variable.name}: SET - ${variable.description}`);
  }
});

console.log('\n=== Optional Variables ===\n');

// Check optional variables
optionalVars.forEach(variable => {
  const value = process.env[variable.name];
  if (!value) {
    console.log(`⚠️ ${variable.name}: NOT SET - ${variable.description}${variable.defaultValue ? ` (default: ${variable.defaultValue})` : ''}`);
  } else {
    console.log(`✅ ${variable.name}: SET - ${variable.description}`);
  }
});

console.log('\n=== Summary ===\n');

if (missingRequired) {
  console.log('❌ Some required environment variables are missing!');
  console.log('Please set all required variables in your .env file');
} else {
  console.log('✅ All required environment variables are set');
}

// Check WooCommerce configuration
const wooCommerceConfigured = process.env.WOOCOMMERCE_URL && 
                              process.env.WOOCOMMERCE_CONSUMER_KEY && 
                              process.env.WOOCOMMERCE_CONSUMER_SECRET;

if (wooCommerceConfigured) {
  console.log('✅ WooCommerce integration is configured');
} else {
  console.log('⚠️ WooCommerce integration is not fully configured (optional)');
}

console.log('\n'); 