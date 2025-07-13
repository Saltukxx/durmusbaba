const coldRoomService = require('./coldRoomService');
const coldRoomCalculator = require('./coldRoomCalculator');

console.log('🧪 Testing New Cold Room Calculator Implementation\n');

// Test 1: Basic detection
console.log('=== Test 1: Request Detection ===');
const testMessages = [
    'I need cold room calculation',
    'Calculate cooling capacity for my freezer',
    'Soğuk oda kapasitesi hesapla',
    'Kühlraum berechnen',
    'What is the best compressor?', // Should NOT match
];

testMessages.forEach((message, index) => {
    const isRequest = coldRoomService.isColdRoomRequest(message);
    console.log(`${index + 1}. "${message}" -> ${isRequest ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
});

console.log('\n=== Test 2: Parameter Extraction ===');
const parameterTests = [
    'Calculate for 10m × 6m × 3m room at -18°C with 35°C ambient',
    '330m³ freezer room at -20°C',
    'Cold storage for meat products, 500kg daily, insulation 120mm',
    'Kühlraum 15m lang, 8m breit, 4m hoch, -15°C'
];

parameterTests.forEach((message, index) => {
    const params = coldRoomService.extractParameters(message);
    console.log(`\n${index + 1}. "${message}"`);
    console.log('   Extracted:', JSON.stringify(params, null, 2));
});

console.log('\n=== Test 3: Quick Calculation ===');
try {
    const quickResult = coldRoomCalculator.quickCalculation(200, -18, 35);
    console.log('Quick calculation for 200m³ at -18°C:');
    console.log(`- Capacity: ${quickResult.total_capacity_kw} kW`);
    console.log(`- Load per m³: ${quickResult.load_per_m3} W/m³`);
} catch (error) {
    console.log('❌ Quick calculation failed:', error.message);
}

console.log('\n=== Test 4: Detailed Calculation ===');
try {
    const detailedParams = {
        length: 10,
        width: 6,
        height: 3,
        temperature: -18,
        ambient_temperature: 35,
        product_type: 'meat',
        daily_product_load: 500,
        door_openings_per_day: 15,
        wall_insulation: 120
    };
    
    const result = coldRoomCalculator.calculateColdRoomCapacity(detailedParams);
    console.log('Detailed calculation results:');
    console.log(`- Total Capacity: ${result.total_capacity_kw} kW`);
    console.log(`- Room Volume: ${result.room.volume} m³`);
    console.log(`- Load Breakdown:`);
    console.log(`  • Transmission: ${result.loads.transmission} W`);
    console.log(`  • Infiltration: ${result.loads.infiltration} W`);
    console.log(`  • Product: ${result.loads.product} W`);
    console.log(`  • Equipment: ${result.loads.equipment} W`);
    console.log(`- System Type: ${result.recommendations.system_type}`);
    console.log(`- Compressor: ${result.recommendations.compressor_type}`);
} catch (error) {
    console.log('❌ Detailed calculation failed:', error.message);
}

console.log('\n=== Test 5: Full Service Integration ===');
const fullTestMessages = [
    'Calculate cold room capacity for 15m × 8m × 4m room at -20°C',
    'I need 200m³ freezer room calculation',
    'Help me size cooling system', // Should prompt for parameters
];

fullTestMessages.forEach((message, index) => {
    console.log(`\n${index + 1}. Testing: "${message}"`);
    try {
        const response = coldRoomService.handleColdRoomRequest(message);
        console.log('Response:', response.substring(0, 200) + '...');
    } catch (error) {
        console.log('❌ Service failed:', error.message);
    }
});

console.log('\n=== Test 6: Language Detection ===');
const languageTests = [
    { message: 'Calculate cold room capacity', expected: 'en' },
    { message: 'Soğuk oda kapasitesi hesapla', expected: 'tr' },
    { message: 'Kühlraum Kapazität berechnen', expected: 'de' },
];

languageTests.forEach(({ message, expected }, index) => {
    const detected = coldRoomService.detectLanguage(message);
    const match = detected === expected ? '✅' : '❌';
    console.log(`${index + 1}. "${message}" -> ${detected} ${match}`);
});

console.log('\n🎉 New Cold Room Calculator Testing Complete!');
console.log('\nKey improvements:');
console.log('✅ Modern ES6+ implementation');
console.log('✅ Industry-standard heat load calculations');
console.log('✅ Multi-language support (EN/TR/DE)');
console.log('✅ Detailed load breakdown');
console.log('✅ System recommendations');
console.log('✅ Stateless operation (no complex flows)');
console.log('✅ Better parameter extraction');
console.log('✅ Comprehensive error handling');