require('dotenv').config();
const axios = require('axios');
const readline = require('readline');
const crypto = require('crypto');
const logger = require('./logger');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// WhatsApp Business API configuration
const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
const ACCESS_TOKEN = process.env.WHATSAPP_API_TOKEN;

/**
 * Generate a secure random token
 * @returns {string} - Random token
 */
function generateVerifyToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Ask user for input
 * @param {string} question - Question to ask
 * @returns {Promise<string>} - User input
 */
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

/**
 * Configure webhook for WhatsApp Business API
 */
async function configureWebhook() {
  try {
    console.log('\n=== WhatsApp Webhook Configuration ===\n');
    
    // Check required environment variables
    if (!ACCESS_TOKEN) {
      console.error('ERROR: WHATSAPP_API_TOKEN is not set in .env file');
      process.exit(1);
    }
    
    if (!BUSINESS_ACCOUNT_ID) {
      console.error('ERROR: WHATSAPP_BUSINESS_ACCOUNT_ID is not set in .env file');
      process.exit(1);
    }
    
    // Get webhook URL from user
    const webhookUrl = await askQuestion('Enter your webhook URL (e.g., https://your-domain.com/webhook): ');
    
    if (!webhookUrl || !webhookUrl.startsWith('https://')) {
      console.error('ERROR: Webhook URL must start with https://');
      process.exit(1);
    }
    
    // Generate or use existing verify token
    let verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    
    if (!verifyToken) {
      console.log('\nNo WHATSAPP_VERIFY_TOKEN found in .env file.');
      const generateNew = await askQuestion('Generate a new verify token? (y/n): ');
      
      if (generateNew.toLowerCase() === 'y') {
        verifyToken = generateVerifyToken();
        console.log(`\nGenerated verify token: ${verifyToken}`);
        console.log('Make sure to add this to your .env file as WHATSAPP_VERIFY_TOKEN');
      } else {
        verifyToken = await askQuestion('Enter your verify token: ');
      }
    } else {
      console.log(`\nUsing verify token from .env: ${verifyToken.substring(0, 8)}...`);
    }
    
    // Confirm with user
    console.log(`\nWebhook URL: ${webhookUrl}`);
    console.log(`Verify Token: ${verifyToken.substring(0, 8)}...`);
    
    const confirm = await askQuestion('\nProceed with this configuration? (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Configuration cancelled.');
      process.exit(0);
    }
    
    // Configure webhook
    console.log('\nConfiguring webhook...');
    
    const url = `${WHATSAPP_API_URL}/${BUSINESS_ACCOUNT_ID}/subscribed_apps`;
    
    const data = {
      access_token: ACCESS_TOKEN,
      callback_url: webhookUrl,
      verify_token: verifyToken,
      fields: ['messages']
    };
    
    const response = await axios.post(url, data);
    
    if (response.status === 200) {
      console.log('\n✅ Webhook configured successfully!');
      console.log('Your WhatsApp webhook is now set up and ready to receive messages.');
      console.log('\nNext steps:');
      console.log('1. Make sure your server is running and accessible at the webhook URL');
      console.log('2. Test the webhook by sending a message to your WhatsApp Business number');
      console.log('3. Check the server logs to verify that messages are being received');
    } else {
      console.error('\n❌ Failed to configure webhook');
      console.error('Response:', response.data);
    }
    
  } catch (error) {
    console.error('\n❌ Error configuring webhook:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  } finally {
    rl.close();
  }
}

// Run the configuration
configureWebhook(); 