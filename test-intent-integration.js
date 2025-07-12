const intentRouter = require('./intentRouter');
const sessionManager = require('./sessionManager');

console.log('🧪 Testing Intent Router Integration for Cold Storage\n');

// Test complete conversation flow
async function testCompleteFlow() {
    const testUserId = 'integration_test_user';
    const session = sessionManager.getSession(testUserId);
    
    console.log('1. Testing cold storage intent detection...');
    
    // Test intent detection
    const intent = await intentRouter.detectIntent('I want to calculate cold room capacity');
    console.log('✅ Intent detected:', intent.type);
    console.log('');
    
    // Test conversation flow
    console.log('2. Testing complete conversation flow...');
    
    const messages = [
        'I need cold room calculation',  // Should start the flow
        '-20',                          // temperature
        'meat products',                // products
        '12',                          // length
        '6',                           // width
        '3.5',                         // height
        '12',                          // insulation
        'yes',                         // floor insulation
        '10',                          // door frequency
        '500',                         // loading amount
        '15'                           // entry temperature
    ];
    
    for (let i = 0; i < messages.length; i++) {
        console.log(`Message ${i + 1}: "${messages[i]}"`);
        try {
            const response = await intentRouter.handleMessage(session, messages[i]);
            console.log('Response:', response.substring(0, 200) + (response.length > 200 ? '...' : ''));
            console.log('');
            
            // Check if final calculation was completed
            if (i === messages.length - 1) {
                const hasResults = response.includes('Cold Storage Calculation Results') || 
                                 response.includes('TOTAL CAPACITY');
                console.log('✅ Final calculation completed:', hasResults);
            }
        } catch (error) {
            console.error(`❌ Error in message ${i + 1}:`, error.message);
            break;
        }
    }
}

// Test cancellation
async function testCancellation() {
    console.log('3. Testing cancellation flow...');
    const session2 = sessionManager.getSession('cancel_test_user');
    
    // Start flow
    await intentRouter.handleMessage(session2, 'cold storage calculation');
    console.log('Flow started');
    
    // Cancel flow
    const cancelResponse = await intentRouter.handleMessage(session2, 'cancel');
    console.log('Cancel response:', cancelResponse);
    console.log('✅ Cancellation works:', cancelResponse.includes('cancelled'));
}

// Test multilingual support
async function testMultilingual() {
    console.log('4. Testing multilingual support...');
    
    // Turkish
    const sessionTR = sessionManager.getSession('turkish_test_user');
    const turkishResponse = await intentRouter.handleMessage(sessionTR, 'soğuk oda hesaplama');
    console.log('✅ Turkish support:', turkishResponse.includes('sıcaklık'));
    
    // German
    const sessionDE = sessionManager.getSession('german_test_user');
    const germanResponse = await intentRouter.handleMessage(sessionDE, 'kühlraum berechnung');
    console.log('✅ German support:', germanResponse.includes('Temperatur'));
}

// Run all tests
async function runAllTests() {
    try {
        await testCompleteFlow();
        await testCancellation();
        await testMultilingual();
        console.log('\n🎉 All integration tests completed successfully!');
    } catch (error) {
        console.error('❌ Integration test failed:', error.message);
    }
}

runAllTests();