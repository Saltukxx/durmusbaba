require('dotenv').config();
const axios = require('axios');
const logger = require('./logger');

// Get configuration from environment variables
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN;

// Default to localhost for testing
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${PORT}`;

async function testWebhookVerification() {
  try {
    console.log('Testing webhook verification endpoint...');
    console.log(`Server URL: ${SERVER_URL}`);
    console.log(`Verify Token: ${VERIFY_TOKEN ? '********' : 'NOT SET'}`);
    
    if (!VERIFY_TOKEN) {
      console.error('ERROR: WHATSAPP_VERIFY_TOKEN is not set in .env file');
      process.exit(1);
    }
    
    // Construct test verification URL
    const testUrl = `${SERVER_URL}/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=CHALLENGE_ACCEPTED`;
    
    console.log(`Sending GET request to: ${SERVER_URL}/webhook`);
    
    const response = await axios.get(testUrl);
    
    if (response.status === 200 && response.data === 'CHALLENGE_ACCEPTED') {
      console.log('✅ Webhook verification successful!');
      console.log('Response:', response.data);
    } else {
      console.error('❌ Webhook verification failed');
      console.error('Status:', response.status);
      console.error('Response:', response.data);
    }
    
  } catch (error) {
    console.error('❌ Error testing webhook verification:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', error.response.data);
    }
  }
}

// Run the test
testWebhookVerification(); 