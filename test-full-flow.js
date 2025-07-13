const intentRouter = require('./intentRouter');
const sessionManager = require('./sessionManager');

async function testFullFlow() {
  console.log('Testing full flow for "cold room storage"...\n');
  
  // Create a test session
  const testUserId = 'test-user-123';
  const session = sessionManager.getSession(testUserId);
  
  try {
    // Test the full message handling
    console.log('1. Testing intent detection...');
    const intent = await intentRouter.detectIntent('cold room storage');
    console.log('Detected intent:', intent);
    
    console.log('\n2. Testing message handling...');
    const response = await intentRouter.handleMessage(session, 'cold room storage');
    console.log('Response:', response);
    
    console.log('\n3. Testing session state...');
    console.log('Session coldStorage active:', session.coldStorage?.active);
    console.log('Session current step:', session.coldStorage?.currentStep);
    
  } catch (error) {
    console.error('Error in test:', error);
  }
}

testFullFlow();