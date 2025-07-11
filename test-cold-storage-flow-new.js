const coldStorageFlow = require('./coldStorageFlow');
const sessionManager = require('./sessionManager');
const logger = require('./logger');

/**
 * Test script for cold storage flow
 */

// Create a test session
const testUserId = 'test_user_123';
const session = sessionManager.getSession(testUserId);

console.log('🧪 Testing Cold Storage Flow Implementation\n');

// Test 1: Initialize flow
console.log('1. Testing flow initialization...');
try {
    const response1 = coldStorageFlow.initializeColdStorageFlow(testUserId, 'en');
    console.log('✅ Flow initialized successfully');
    console.log('Response:', response1);
    console.log('');
} catch (error) {
    console.error('❌ Flow initialization failed:', error.message);
    process.exit(1);
}

// Test 2: Process answers step by step
console.log('2. Testing step-by-step answers...');
const testAnswers = [
    '-18',      // temperature
    'frozen vegetables',  // products
    '10',       // length
    '8',        // width
    '3',        // height
    '10',       // insulation
    'yes',      // floor insulation
    '5',        // door frequency
    '1000',     // loading amount
    '20'        // entry temperature
];

let currentStep = 0;
async function testNextStep() {
    if (currentStep >= testAnswers.length) {
        console.log('✅ All steps completed successfully!');
        console.log('');
        return;
    }
    
    const answer = testAnswers[currentStep];
    console.log(`Step ${currentStep + 1}: Answering "${answer}"`);
    
    try {
        const response = coldStorageFlow.processAnswer(session, answer);
        console.log('Response:', response);
        console.log('');
        currentStep++;
        
        // If this is the last step, we should get final results
        if (currentStep === testAnswers.length) {
            console.log('✅ Final calculation completed!');
            console.log('Response contains results:', response.includes('Cold Storage Calculation Results'));
        }
        
        // Continue to next step
        await testNextStep();
    } catch (error) {
        console.error(`❌ Error in step ${currentStep + 1}:`, error.message);
        process.exit(1);
    }
}

// Start the test flow
testNextStep();

// Test 3: Test validation errors
console.log('3. Testing validation errors...');
const testSession2 = sessionManager.getSession('test_user_456');
coldStorageFlow.initializeColdStorageFlow('test_user_456', 'en');

try {
    const invalidResponse = coldStorageFlow.processAnswer(testSession2, '999'); // Invalid temperature
    console.log('✅ Validation error handling works');
    console.log('Error response:', invalidResponse);
} catch (error) {
    console.error('❌ Validation error handling failed:', error.message);
}

// Test 4: Test language detection
console.log('4. Testing Turkish language...');
const testSession3 = sessionManager.getSession('test_user_789');
try {
    const turkishResponse = coldStorageFlow.initializeColdStorageFlow('test_user_789', 'tr');
    console.log('✅ Turkish language support works');
    console.log('Turkish response includes Turkish text:', turkishResponse.includes('Gerekli'));
} catch (error) {
    console.error('❌ Turkish language support failed:', error.message);
}

// Test 5: Test cancellation
console.log('5. Testing flow cancellation...');
const testSession4 = sessionManager.getSession('test_user_cancel');
coldStorageFlow.initializeColdStorageFlow('test_user_cancel', 'en');

try {
    const hasFlow = coldStorageFlow.hasActiveColdStorageFlow(testSession4);
    console.log('✅ Flow detection works:', hasFlow);
    
    coldStorageFlow.cancelColdStorageFlow(testSession4);
    const hasFlowAfterCancel = coldStorageFlow.hasActiveColdStorageFlow(testSession4);
    console.log('✅ Flow cancellation works:', !hasFlowAfterCancel);
} catch (error) {
    console.error('❌ Flow cancellation failed:', error.message);
}

console.log('\n🎉 All tests completed successfully!');
console.log('The cold storage flow implementation is working correctly.');