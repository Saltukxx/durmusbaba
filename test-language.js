require('dotenv').config();
const languageProcessor = require('./languageProcessor');

// Get test message from command line arguments or use defaults
const testMessage = process.argv[2] || 'Hello, how are you today?';
const alternateMessages = {
  'de': 'Hallo, wie geht es dir heute?',
  'tr': 'Merhaba, bugün nasılsın?',
  'fr': 'Bonjour, comment allez-vous aujourd\'hui?',
  'es': 'Hola, ¿cómo estás hoy?',
  'it': 'Ciao, come stai oggi?',
  'ar': 'مرحبا، كيف حالك اليوم؟',
  'ru': 'Привет, как ты сегодня?'
};

async function testLanguageProcessor() {
  try {
    console.log('\n=== Testing Language Processor ===\n');
    
    // Check if Gemini API key is set
    if (!process.env.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in .env file');
      process.exit(1);
    }
    
    console.log('Supported languages:');
    Object.entries(languageProcessor.SUPPORTED_LANGUAGES).forEach(([language, code]) => {
      console.log(`- ${language} (${code})`);
    });
    
    // Test language detection with user input
    console.log(`\nTesting language detection with: "${testMessage}"`);
    const detectedLanguage = await languageProcessor.detectLanguage(testMessage);
    console.log(`Detected language: ${detectedLanguage}`);
    
    // Create a mock session
    const mockSession = {
      userId: 'test-user',
      chatHistory: [],
      lastActivity: Date.now()
    };
    
    // Test multilingual response
    console.log('\nGenerating response...');
    const response = await languageProcessor.generateMultilingualResponse(mockSession, testMessage);
    console.log('\nResponse:');
    console.log('---------------------');
    console.log(response);
    console.log('---------------------');
    
    // Test language change detection
    console.log('\nTesting language change detection:');
    const testPhrases = [
      'Please speak in German',
      'Switch to Turkish',
      'Change language to Spanish',
      'I want you to speak French',
      'Random message with no language change'
    ];
    
    for (const phrase of testPhrases) {
      const langCode = languageProcessor.checkLanguageChangeRequest(phrase);
      console.log(`"${phrase}" => ${langCode || 'No language change detected'}`);
    }
    
    // Test with different languages if specified
    const langToTest = process.argv[3];
    if (langToTest && alternateMessages[langToTest]) {
      console.log(`\nTesting with ${langToTest} message: "${alternateMessages[langToTest]}"`);
      const altDetectedLang = await languageProcessor.detectLanguage(alternateMessages[langToTest]);
      console.log(`Detected language: ${altDetectedLang}`);
      
      const altResponse = await languageProcessor.generateMultilingualResponse(mockSession, alternateMessages[langToTest]);
      console.log('\nResponse:');
      console.log('---------------------');
      console.log(altResponse);
      console.log('---------------------');
    }
    
    console.log('\n✅ Language processor test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Error testing language processor:');
    console.error(error.message);
    
    if (error.response) {
      console.error('Response:', error.response);
    }
  }
}

// Run the test
testLanguageProcessor(); 