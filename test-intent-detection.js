const intentRouter = require('./intentRouter');

console.log('🧪 Testing Intent Detection for Cold Room Calculator\n');

// Test messages that should trigger cold room calculation
const coldRoomTests = [
    'Calculate cold room capacity for 330m³ at -20°C',
    'Soğuk oda kapasitesi hesapla 200m³ oda -5°C sıcaklık',
    'Kühlraum Kapazität berechnen für 150m³ bei 0°C',
    'Calculate capacity for 500m³ refrigeration room',
    'Kapasite hesapla 300m³ dondurucu oda',
    'Kapazität berechnen 400m³ Kühlraum',
    'Cooling capacity calculation 250m³ at -18°C',
    'Soğutma kapasitesi hesaplama 180m³ -15°C',
    'Kühlkapazität Berechnung 220m³ -25°C'
];

// Test messages that should trigger product search
const productSearchTests = [
    'I want to buy a compressor',
    'Show me products under 500 euros',
    'Looking for Embraco compressors',
    'Product search for Danfoss',
    'Price of Bitzer compressor'
];

console.log('Testing Cold Room Calculation Intent Detection:');
console.log('=' .repeat(60));

coldRoomTests.forEach((message, index) => {
    console.log(`\nTest ${index + 1}: "${message}"`);
    try {
        const intent = intentRouter.detectIntent(message);
        console.log(`✅ Detected intent: ${intent.type} (confidence: ${intent.confidence})`);
        
        if (intent.type === 'cold_room_calculation') {
            console.log('✅ CORRECT - Cold room calculation detected');
        } else {
            console.log('❌ WRONG - Should have detected cold room calculation');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
});

console.log('\n' + '=' .repeat(60));
console.log('Testing Product Search Intent Detection:');
console.log('=' .repeat(60));

productSearchTests.forEach((message, index) => {
    console.log(`\nTest ${index + 1}: "${message}"`);
    try {
        const intent = intentRouter.detectIntent(message);
        console.log(`✅ Detected intent: ${intent.type} (confidence: ${intent.confidence})`);
        
        if (intent.type === 'product_search') {
            console.log('✅ CORRECT - Product search detected');
        } else {
            console.log('❌ WRONG - Should have detected product search');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
});

console.log('\n' + '=' .repeat(60));
console.log('Testing Parameter Extraction:');
console.log('=' .repeat(60));

const coldRoomCalculator = require('./coldRoomCalculator');

const parameterTests = [
    'Calculate cold room capacity for 500m³ at -18°C with 40°C ambient temperature',
    'Soğuk oda kapasitesi hesapla 200m³ oda -5°C sıcaklık 30°C dış ortam',
    'Kühlraum Kapazität berechnen für 150m³ bei 0°C mit 45°C Umgebungstemperatur'
];

parameterTests.forEach((message, index) => {
    console.log(`\nTest ${index + 1}: "${message}"`);
    try {
        const params = coldRoomCalculator.extractParameters(message);
        console.log('Extracted parameters:', params);
        
        if (Object.keys(params).length > 0) {
            console.log('✅ Parameters extracted successfully');
        } else {
            console.log('❌ No parameters extracted');
        }
    } catch (error) {
        console.log('❌ Error:', error.message);
    }
});

console.log('\n🧪 Intent detection testing completed!'); 