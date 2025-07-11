require('dotenv').config();
const whatsappService = require('./whatsappService');

// Get phone number from command line arguments or use a default test number
const recipientNumber = process.argv[2] || '15551234567';

async function testWhatsAppMessage() {
  try {
    console.log(`Testing WhatsApp message sending to ${recipientNumber}...`);
    
    // Check if environment variables are set
    if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.error('ERROR: WhatsApp API credentials not set in .env file');
      console.error('Make sure WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID are set');
      process.exit(1);
    }
    
    // Send a test message
    const testMessage = 'This is a test message from the DURMUSBABA.DE WhatsApp chatbot. If you received this, the WhatsApp API integration is working correctly!';
    
    console.log('Sending message...');
    const result = await whatsappService.sendMessage(recipientNumber, testMessage);
    
    console.log('✅ Message sent successfully!');
    console.log('Response:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

// Run the test
testWhatsAppMessage(); 