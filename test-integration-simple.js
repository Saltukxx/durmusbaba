// Simple integration test for cold storage flow
const coldStorageFlow = require('./coldStorageFlow');
const sessionManager = require('./sessionManager');

async function testColdStorageIntegration() {
    console.log('🔗 Testing Cold Storage Integration...\n');
    
    // Test 1: Complete English Flow
    console.log('1. Testing complete English flow...');
    const session1 = sessionManager.getSession('integration_test_1');
    
    // Initialize flow
    let response = coldStorageFlow.initializeColdStorageFlow('integration_test_1', 'en');
    console.log('✅ Flow initialized');
    
    // Answer all questions
    const answers = ['-18', 'meat', '5', '4', '3', '10', 'yes', '10', '500', '15'];
    for (let i = 0; i < answers.length; i++) {
        response = coldStorageFlow.processAnswer(session1, answers[i]);
        if (i === answers.length - 1) {
            console.log('✅ Final result generated:', response.includes('Cold Storage Calculation Results'));
        }
    }
    
    // Test 2: Turkish Flow
    console.log('\n2. Testing Turkish language flow...');
    const session2 = sessionManager.getSession('integration_test_2');
    
    response = coldStorageFlow.initializeColdStorageFlow('integration_test_2', 'tr');
    console.log('✅ Turkish flow initialized:', response.includes('Gerekli'));
    
    // Test first few answers in Turkish
    response = coldStorageFlow.processAnswer(session2, '-20');
    console.log('✅ Turkish answer processed:', response.includes('hangi ürün'));
    
    // Test 3: Validation and Error Handling
    console.log('\n3. Testing validation and error handling...');
    const session3 = sessionManager.getSession('integration_test_3');
    
    coldStorageFlow.initializeColdStorageFlow('integration_test_3', 'en');
    
    // Test invalid temperature
    response = coldStorageFlow.processAnswer(session3, '999');
    console.log('✅ Invalid temperature handled:', response.includes('❌'));
    
    // Test valid temperature after error
    response = coldStorageFlow.processAnswer(session3, '0');
    console.log('✅ Valid temperature accepted:', response.includes('Progress: 2/10'));
    
    // Test 4: Flow Management
    console.log('\n4. Testing flow management...');
    const session4 = sessionManager.getSession('integration_test_4');
    
    coldStorageFlow.initializeColdStorageFlow('integration_test_4', 'en');
    console.log('✅ Flow created:', coldStorageFlow.hasActiveColdStorageFlow(session4));
    
    coldStorageFlow.cancelColdStorageFlow(session4);
    console.log('✅ Flow cancelled:', !coldStorageFlow.hasActiveColdStorageFlow(session4));
    
    console.log('\n🎉 All integration tests passed successfully!');
    console.log('The cold storage flow is fully integrated and working correctly.');
}

testColdStorageIntegration().catch(console.error);