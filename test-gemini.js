require('dotenv').config();
const geminiService = require('./geminiService');

// Get test prompt from command line arguments or use a default prompt
const testPrompt = process.argv.slice(2).join(' ') || 'Tell me about DURMUSBABA.DE in one paragraph.';

async function testGeminiAI() {
  try {
    console.log('Testing Gemini AI integration...');
    console.log(`Test prompt: "${testPrompt}"`);
    
    // Check if API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('ERROR: GEMINI_API_KEY is not set in .env file');
      process.exit(1);
    }
    
    // Create a mock session
    const mockSession = {
      userId: 'test-user',
      chatHistory: [],
      lastActivity: Date.now()
    };
    
    console.log('Sending prompt to Gemini AI...');
    const response = await geminiService.generateResponse(mockSession, testPrompt);
    
    console.log('\n✅ Gemini AI Response:\n');
    console.log(response);
    
  } catch (error) {
    console.error('❌ Error testing Gemini AI:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Run the test
testGeminiAI(); 