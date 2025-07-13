const coldRoomCalculator = require('./coldRoomCalculator');
const coldRoomFlow = require('./coldRoomFlow');
const sessionManager = require('./sessionManager');

// Mock session for testing
const mockSession = {
  userId: 'test-user-123',
  preferences: { language: 'en' }
};

// Test the cold room calculator
console.log('🧪 Testing Cold Room Calculator...\n');

// Test 1: Basic calculation
console.log('📊 Test 1: Basic Cold Room Calculation');
const testParams = {
  length: 10,
  width: 6,
  height: 3,
  temperature: -20,
  ambientTemperature: 35,
  productType: 'meat',
  dailyLoad: 1000,
  entryTemperature: 20,
  insulationThickness: 100,
  doorOpenings: 20,
  coolingTime: 24,
  safetyFactor: 10,
  climateZone: 'temperate'
};

try {
  const results = coldRoomCalculator.calculateCapacity(testParams);
  console.log('✅ Calculation successful!');
  console.log(`📏 Room Volume: ${results.volume} m³`);
  console.log(`🔧 Required Capacity: ${(results.finalCapacity / 1000).toFixed(1)} kW`);
  console.log(`📊 Load Breakdown:`);
  console.log(`   • Transmission: ${results.breakdown.transmission}%`);
  console.log(`   • Product: ${results.breakdown.product}%`);
  console.log(`   • Infiltration: ${results.breakdown.infiltration}%`);
  console.log(`   • Internal: ${results.breakdown.internal}%`);
  console.log('');
} catch (error) {
  console.log('❌ Calculation failed:', error.message);
}

// Test 2: Flow initialization
console.log('🔄 Test 2: Cold Room Flow Initialization');
try {
  const welcomeMessage = coldRoomFlow.initializeColdRoomFlow('test-user-123', 'en');
  console.log('✅ Flow initialized successfully!');
  console.log('📝 Welcome message length:', welcomeMessage.length, 'characters');
  console.log('');
} catch (error) {
  console.log('❌ Flow initialization failed:', error.message);
}

// Test 3: Parameter validation
console.log('✅ Test 3: Parameter Validation');
const invalidParams = {
  length: -5, // Invalid negative length
  width: 6,
  height: 3,
  temperature: 50 // Invalid temperature
};

try {
  const errors = coldRoomCalculator.validateParameters(invalidParams);
  console.log('✅ Validation working!');
  console.log('❌ Validation errors found:', errors.length);
  errors.forEach(error => console.log(`   • ${error}`));
  console.log('');
} catch (error) {
  console.log('❌ Validation test failed:', error.message);
}

// Test 4: Multi-language support
console.log('🌍 Test 4: Multi-language Support');
const languages = ['en', 'tr', 'de'];

languages.forEach(lang => {
  try {
    const testResults = {
      volume: 180,
      finalCapacity: 15000,
      breakdown: {
        transmission: 40,
        product: 30,
        infiltration: 20,
        internal: 10
      },
      parameters: {
        insulationThickness: 100
      }
    };
    
    const formatted = coldRoomCalculator.formatResults(testResults, lang);
    console.log(`✅ ${lang.toUpperCase()} formatting: ${formatted.length} characters`);
  } catch (error) {
    console.log(`❌ ${lang.toUpperCase()} formatting failed:`, error.message);
  }
});

console.log('\n🎉 Cold Room Calculator Tests Completed!'); 