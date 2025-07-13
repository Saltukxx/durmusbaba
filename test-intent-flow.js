const intentRouter = require('./intentRouter');
const sessionManager = require('./sessionManager');

// Test that cold room messages trigger the built-in flow instead of Gemini
async function testColdRoomFlow() {
  console.log('Testing cold room flow activation:');
  
  // Create a test session
  const testUserId = 'test-user-123';
  const session = sessionManager.getSession(testUserId);
  
  // Test message that was causing Gemini response
  const testMessage = 'Calculate for 10m × 6m × 3m room at -18°C';
  
  try {
    const response = await intentRouter.handleMessage(session, testMessage);
    
    console.log('Message:', testMessage);
    console.log('Response length:', response.length, 'characters');
    console.log('Contains "Cold Room Capacity Calculator":', response.includes('Cold Room Capacity Calculator'));
    console.log('Contains "Using Gemini model":', response.includes('Using Gemini model'));
    console.log('Contains "Question 1 of":', response.includes('Question 1 of'));
    console.log('Session has active flow:', sessionManager.hasActiveFlow(session));
    console.log('Active flow type:', session.activeFlow);
    
    if (response.includes('Cold Room Capacity Calculator') && !response.includes('Using Gemini model')) {
      console.log('✅ SUCCESS: Cold room flow is working correctly!');
    } else {
      console.log('❌ FAILED: Still using Gemini or not starting cold room flow');
    }
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

testColdRoomFlow();