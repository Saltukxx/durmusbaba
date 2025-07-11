require('dotenv').config();
const intentRouter = require('./intentRouter');

// Get test message from command line arguments or use default
const testMessage = process.argv.slice(2).join(' ') || 'Hello, I want to buy a product';

async function testIntentRouter() {
  try {
    console.log('\n=== Testing Intent Router ===\n');
    
    // Check if Gemini API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in .env file');
      process.exit(1);
    }
    
    console.log(`Test message: "${testMessage}"`);
    
    // Test intent detection
    console.log('\nDetecting intent...');
    const intent = await intentRouter.detectIntent(testMessage);
    
    console.log('Detected intent:');
    console.log(`- Type: ${intent.type}`);
    console.log(`- Confidence: ${intent.confidence}`);
    
    if (intent.languageCode) {
      console.log(`- Language Code: ${intent.languageCode}`);
    }
    
    // Create a mock session
    const mockSession = {
      userId: 'test-user',
      chatHistory: [],
      lastActivity: Date.now()
    };
    
    // Test message handling
    console.log('\nGenerating response...');
    const response = await intentRouter.handleMessage(mockSession, testMessage);
    
    console.log('\nResponse:');
    console.log('---------------------');
    console.log(response);
    console.log('---------------------');
    
    // Test different intent types
    console.log('\nTesting different intent types:');
    
    const testCases = [
      { message: 'Hello there', expectedIntent: 'greeting' },
      { message: 'I want to buy a new phone', expectedIntent: 'product_search' },
      { message: 'Where is my order?', expectedIntent: 'order_status' },
      { message: 'I need help with my account', expectedIntent: 'customer_support' },
      { message: 'Please speak in German', expectedIntent: 'language_change' },
      { message: 'What is the weather like today?', expectedIntent: 'general_query' }
    ];
    
    for (const testCase of testCases) {
      const detectedIntent = await intentRouter.detectIntent(testCase.message);
      const match = detectedIntent.type === testCase.expectedIntent ? '✅' : '❌';
      console.log(`${match} "${testCase.message}" => ${detectedIntent.type} (expected: ${testCase.expectedIntent})`);
    }
    
    console.log('\n✅ Intent router test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing intent router:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Run the test
testIntentRouter(); 