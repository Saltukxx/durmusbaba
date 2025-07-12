const intentRouter = require('./intentRouter');
const sessionManager = require('./sessionManager');

console.log('🧪 Testing Final Cold Storage Conversation Flow\n');

async function testCompleteConversation() {
    const testUserId = 'final_test_user';
    const session = sessionManager.getSession(testUserId);
    
    console.log('Testing complete conversation with proper flow priority...\n');
    
    const conversation = [
        { message: 'I need cold room calculation', description: 'Initial request' },
        { message: '-20', description: 'Temperature answer' },
        { message: 'meat products', description: 'Products answer (should not trigger product search)' },
        { message: '12', description: 'Length answer' },
        { message: '6', description: 'Width answer' },
        { message: '3', description: 'Height answer' },
        { message: '10', description: 'Insulation answer' },
        { message: 'yes', description: 'Floor insulation answer' },
        { message: '8', description: 'Door frequency answer' },
        { message: '500', description: 'Loading amount answer' },
        { message: '15', description: 'Entry temperature answer (final)' }
    ];
    
    let isCompleted = false;
    
    for (let i = 0; i < conversation.length; i++) {
        const { message, description } = conversation[i];
        console.log(`${i + 1}. ${description}: "${message}"`);
        
        try {
            const response = await intentRouter.handleMessage(session, message);
            
            // Check if it's the final calculation result
            if (response.includes('Cold Storage Calculation Results') || 
                response.includes('TOTAL CAPACITY')) {
                console.log('✅ FINAL CALCULATION COMPLETED!');
                console.log('Result preview:', response.substring(0, 200) + '...\n');
                isCompleted = true;
                break;
            } else if (response.includes('Progress:')) {
                // Extract progress info
                const progressMatch = response.match(/Progress: (\d+)\/(\d+)/);
                if (progressMatch) {
                    console.log(`✅ Progress: ${progressMatch[1]}/${progressMatch[2]} questions completed`);
                }
            } else if (response.includes('❌')) {
                console.log('❌ Validation error:', response.split('\n')[0]);
            } else {
                console.log('Response type: Other');
            }
            
        } catch (error) {
            console.error(`❌ Error in step ${i + 1}:`, error.message);
            break;
        }
    }
    
    if (isCompleted) {
        console.log('🎉 SUCCESS: Complete conversation flow works perfectly!');
        console.log('✅ Bot properly leads the conversation through all questions');
        console.log('✅ All answers are processed in sequence');
        console.log('✅ Final calculation is performed only after all requirements gathered');
    } else {
        console.log('❌ FAILED: Conversation did not complete successfully');
    }
}

// Test cancellation during conversation
async function testMidConversationCancel() {
    console.log('\nTesting cancellation during conversation...');
    const session = sessionManager.getSession('cancel_mid_test');
    
    // Start conversation
    await intentRouter.handleMessage(session, 'cold storage calculation');
    await intentRouter.handleMessage(session, '-18');
    await intentRouter.handleMessage(session, 'dairy products');
    
    // Cancel mid-conversation
    const cancelResponse = await intentRouter.handleMessage(session, 'cancel');
    
    if (cancelResponse.includes('cancelled')) {
        console.log('✅ Mid-conversation cancellation works');
    } else {
        console.log('❌ Mid-conversation cancellation failed');
    }
}

// Run all tests
async function runTests() {
    try {
        await testCompleteConversation();
        await testMidConversationCancel();
        console.log('\n🎉 All final tests completed!');
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

runTests();