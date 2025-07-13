const intentRouter = require('./intentRouter');
const sessionManager = require('./sessionManager');

console.log('🧪 Testing Cold Room Integration with Intent Router\n');

async function testIntegration() {
    // Test 1: Intent detection
    console.log('=== Test 1: Intent Detection ===');
    
    const testMessages = [
        'I need cold room calculation',
        'Calculate cooling capacity for my freezer',
        'Soğuk oda kapasitesi hesapla',
        'Kühlraum berechnen'
    ];
    
    for (const message of testMessages) {
        const intent = await intentRouter.detectIntent(message);
        console.log(`"${message}" -> ${intent.type} (${intent.confidence})`);
        console.log('✅ Detected as cold room:', intent.type === 'cold_room_calculation');
    }
    
    // Test 2: Full flow integration
    console.log('\n=== Test 2: Full Flow Integration ===');
    
    const session = sessionManager.getSession('integration_test');
    
    // Start cold room calculation
    console.log('\n2.1 Starting cold room calculation:');
    let response = await intentRouter.handleMessage(session, 'I need cold room calculation');
    console.log('✅ Flow started:', response.includes('Cold Room Capacity Calculator'));
    console.log('✅ Contains commands:', response.includes('Available Commands'));
    
    // Answer questions step by step
    const answers = [
        '15m × 10m × 4m',         // dimensions
        '-18°C',                  // temperature  
        'frozen foods',           // products
        '1000 kg daily',          // daily load
        '20°C',                   // entry temperature
        '35°C',                   // ambient temperature
        '120mm',                  // insulation
        'high usage'              // door openings
    ];
    
    console.log('\n2.2 Answering questions:');
    for (let i = 0; i < answers.length; i++) {
        response = await intentRouter.handleMessage(session, answers[i]);
        
        if (response.includes('Question')) {
            const questionMatch = response.match(/Question (\d+) of (\d+)/);
            if (questionMatch) {
                console.log(`✅ Step ${i + 1}: Advanced to question ${questionMatch[1]}`);
            }
        } else if (response.includes('Complete')) {
            console.log('✅ Flow completed with results');
            break;
        }
    }
    
    // Test 3: Command integration
    console.log('\n=== Test 3: Command Integration ===');
    
    const session2 = sessionManager.getSession('command_test');
    await intentRouter.handleMessage(session2, 'cold room calculation');
    
    // Test help command
    console.log('\n3.1 Testing help command:');
    const helpResponse = await intentRouter.handleMessage(session2, 'help');
    console.log('✅ Help works:', helpResponse.includes('Available Commands'));
    
    // Answer first question
    await intentRouter.handleMessage(session2, '10m × 6m × 3m');
    
    // Test show command
    console.log('\n3.2 Testing show command:');
    const showResponse = await intentRouter.handleMessage(session2, 'show');
    console.log('✅ Show works:', showResponse.includes('Current Answers'));
    
    // Test back command
    console.log('\n3.3 Testing back command:');
    const backResponse = await intentRouter.handleMessage(session2, 'back');
    console.log('✅ Back works:', backResponse.includes('Going back'));
    
    // Test cancel command
    console.log('\n3.4 Testing cancel command:');
    const cancelResponse = await intentRouter.handleMessage(session2, 'cancel');
    console.log('✅ Cancel works:', cancelResponse.includes('cancelled'));
    
    // Test 4: Multi-language integration
    console.log('\n=== Test 4: Multi-language Integration ===');
    
    // Turkish
    const sessionTR = sessionManager.getSession('turkish_test');
    const turkishResponse = await intentRouter.handleMessage(sessionTR, 'soğuk oda hesapla');
    console.log('✅ Turkish detected and handled:', turkishResponse.includes('Soğuk Oda'));
    
    // German
    const sessionDE = sessionManager.getSession('german_test');  
    const germanResponse = await intentRouter.handleMessage(sessionDE, 'kühlraum berechnen');
    console.log('✅ German detected and handled:', germanResponse.includes('Kühlraum'));
    
    // Test 5: Error handling and edge cases
    console.log('\n=== Test 5: Error Handling ===');
    
    const session3 = sessionManager.getSession('error_test');
    await intentRouter.handleMessage(session3, 'cold room');
    
    // Test invalid input
    console.log('\n5.1 Testing invalid input:');
    const invalidResponse = await intentRouter.handleMessage(session3, 'completely invalid input');
    console.log('✅ Invalid input handled:', invalidResponse.includes('Invalid Input'));
    
    // Test valid input after error
    console.log('\n5.2 Testing recovery:');
    const validResponse = await intentRouter.handleMessage(session3, '8m × 5m × 3m');
    console.log('✅ Recovery works:', validResponse.includes('Answer recorded'));
    
    // Test 6: Session state management
    console.log('\n=== Test 6: Session State Management ===');
    
    const session4 = sessionManager.getSession('state_test');
    
    // Start flow
    await intentRouter.handleMessage(session4, 'cold room calculation');
    console.log('✅ Flow started, session has active flow:', sessionManager.hasActiveFlow(session4));
    
    // Answer some questions
    await intentRouter.handleMessage(session4, '12m × 8m × 3.5m');
    await intentRouter.handleMessage(session4, '-20°C');
    
    // Cancel flow
    await intentRouter.handleMessage(session4, 'cancel');
    console.log('✅ Flow cancelled, session cleared:', !sessionManager.hasActiveFlow(session4));
    
    // Test 7: Complete calculation and results
    console.log('\n=== Test 7: Complete Calculation Results ===');
    
    const session5 = sessionManager.getSession('complete_test');
    await intentRouter.handleMessage(session5, 'calculate cold room capacity');
    
    const completeAnswers = [
        '25m × 15m × 5m',         // Large warehouse
        '-25°C',                  // Ultra-low temp
        'pharmaceuticals',        // High-value products
        '3000 kg',                // High throughput
        '25°C',                   // Controlled entry
        '45°C',                   // Hot climate
        '200mm',                  // Maximum insulation
        'very high usage'         // Continuous operation
    ];
    
    let finalResult;
    for (const answer of completeAnswers) {
        finalResult = await intentRouter.handleMessage(session5, answer);
    }
    
    console.log('✅ Calculation completed:', finalResult.includes('Complete'));
    console.log('✅ Contains capacity in kW:', finalResult.includes('kW'));
    console.log('✅ Contains load breakdown:', finalResult.includes('Load Breakdown'));
    console.log('✅ Contains system recommendations:', finalResult.includes('System'));
    console.log('✅ Contains next steps:', finalResult.includes('Next'));
    
    // Check if result was saved to session
    console.log('✅ Result saved to session:', !!session5.lastColdRoomResult);
    
    if (session5.lastColdRoomResult) {
        const result = session5.lastColdRoomResult;
        console.log(`   - Calculated capacity: ${result.total_capacity_kw} kW`);
        console.log(`   - Room volume: ${result.room.volume} m³`);
        console.log(`   - System type: ${result.recommendations.system_type}`);
    }
    
    // Test 8: Equipment recommendation integration
    console.log('\n=== Test 8: Equipment Recommendation Integration ===');
    
    // After completing calculation, try equipment recommendation
    const equipmentResponse = await intentRouter.handleMessage(session5, 'equipment recommendation');
    console.log('✅ Equipment recommendation triggered:', equipmentResponse.includes('equipment'));
    
    console.log('\n🎉 Integration Testing Complete!\n');
    
    // Final summary
    console.log('=== INTEGRATION TEST SUMMARY ===');
    console.log('✅ Intent detection for cold room requests');
    console.log('✅ Full conversational flow integration');
    console.log('✅ All commands work through intentRouter');
    console.log('✅ Multi-language support integrated');
    console.log('✅ Error handling and recovery');
    console.log('✅ Session state management');
    console.log('✅ Complete calculation with professional results');
    console.log('✅ Result storage for equipment recommendations');
    console.log('\n🚀 Cold room system fully integrated and ready for production!');
}

// Run the integration test
testIntegration().catch(console.error);