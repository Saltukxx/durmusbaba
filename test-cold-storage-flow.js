const coldStorageService = require('./coldStorageService');
const sessionManager = require('./sessionManager');

// Test the cold storage calculation flow
async function testColdStorageFlow() {
  console.log('🧪 Testing Cold Storage Calculation Flow\n');
  
  // Create a test session
  const testUserId = 'test_user_123';
  const session = sessionManager.getSession(testUserId);
  
  console.log('📋 Test Scenarios:');
  console.log('1. Initial request');
  console.log('2. Step-by-step question flow');
  console.log('3. Error handling');
  console.log('4. Cancellation');
  console.log('5. Final calculation\n');
  
  // Test 1: Initial request
  console.log('🔍 Test 1: Initial Cold Storage Request');
  const initialMessage = 'I need help with cold storage calculation';
  console.log(`User: ${initialMessage}`);
  
  const response1 = coldStorageService.handleColdStorageRequest(session, initialMessage);
  console.log(`Bot: ${response1}`);
  console.log(`Session active: ${session.coldStorage?.active}`);
  console.log(`Current step: ${session.coldStorage?.currentStep}\n`);
  
  // Test 2: Answering questions step by step
  console.log('🔍 Test 2: Step-by-step Question Flow');
  
  const testAnswers = [
    '-20',        // Temperature
    'frozen foods', // Products
    '10',         // Length
    '8',          // Width
    '3',          // Height
    '10',         // Insulation
    'yes',        // Floor insulation
    'medium',     // Door frequency
    '500',        // Loading amount
    '20'          // Product temperature
  ];
  
  for (let i = 0; i < testAnswers.length; i++) {
    const answer = testAnswers[i];
    console.log(`User: ${answer}`);
    
    const response = coldStorageService.handleColdStorageRequest(session, answer);
    console.log(`Bot: ${response.substring(0, 200)}...`);
    
    if (session.coldStorage?.active) {
      console.log(`Current step: ${session.coldStorage.currentStep}`);
    } else {
      console.log('Session completed!');
      break;
    }
    console.log('');
  }
  
  // Test 3: Error handling
  console.log('🔍 Test 3: Error Handling');
  const newSession = sessionManager.getSession('test_user_error');
  coldStorageService.handleColdStorageRequest(newSession, 'cold storage calculation');
  
  // Invalid temperature
  console.log('User: 100'); // Invalid temperature
  const errorResponse = coldStorageService.handleColdStorageRequest(newSession, '100');
  console.log(`Bot: ${errorResponse}`);
  console.log(`Session step: ${newSession.coldStorage.currentStep}\n`);
  
  // Test 4: Cancellation
  console.log('🔍 Test 4: Cancellation');
  const cancelSession = sessionManager.getSession('test_user_cancel');
  coldStorageService.handleColdStorageRequest(cancelSession, 'cold storage calculation');
  
  console.log('User: cancel');
  const cancelResponse = coldStorageService.cancelColdStorageSession(cancelSession);
  console.log(`Bot: ${cancelResponse}`);
  console.log(`Session active: ${cancelSession.coldStorage?.active}\n`);
  
  // Test 5: Language detection
  console.log('🔍 Test 5: Language Detection');
  const messages = [
    'cold storage calculation',
    'soğuk depo hesaplaması',
    'kühlraum berechnung'
  ];
  
  messages.forEach(msg => {
    const language = coldStorageService.detectLanguage(msg);
    console.log(`"${msg}" -> Language: ${language}`);
  });
  
  console.log('\n✅ All tests completed!');
}

// Test individual functions
function testIndividualFunctions() {
  console.log('🧪 Testing Individual Functions\n');
  
  // Test request detection
  console.log('🔍 Testing request detection:');
  const testMessages = [
    'cold storage calculation',
    'I need help with cooling capacity',
    'refrigeration system design',
    'hello world', // Should be false
    'soğuk depo hesaplaması',
    'kühlraum berechnung'
  ];
  
  testMessages.forEach(msg => {
    const isRequest = coldStorageService.isColdStorageRequest(msg);
    console.log(`"${msg}" -> ${isRequest ? '✅' : '❌'}`);
  });
  
  // Test cancel detection
  console.log('\n🔍 Testing cancel detection:');
  const cancelMessages = [
    'cancel',
    'stop',
    'quit',
    'iptal',
    'dur',
    'abbrechen',
    'hello' // Should be false
  ];
  
  cancelMessages.forEach(msg => {
    const isCancel = coldStorageService.isCancelRequest(msg);
    console.log(`"${msg}" -> ${isCancel ? '✅' : '❌'}`);
  });
  
  console.log('\n✅ Individual function tests completed!');
}

// Run tests
if (require.main === module) {
  console.log('🚀 Starting Cold Storage Service Tests\n');
  
  try {
    testIndividualFunctions();
    console.log('\n' + '='.repeat(50) + '\n');
    testColdStorageFlow();
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

module.exports = {
  testColdStorageFlow,
  testIndividualFunctions
};