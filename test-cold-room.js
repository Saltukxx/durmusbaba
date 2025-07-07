const coldRoomCalculator = require('./coldRoomCalculator');

console.log('🧪 Testing Cold Room Capacity Calculator\n');

// Test 1: Basic calculation
console.log('Test 1: Basic calculation (330m³, -20°C, 35°C ambient)');
try {
  const result1 = coldRoomCalculator.calculateCapacity({
    volume: 330,
    temperature: -20,
    ambientTemp: 35,
    climateZone: 'cool',
    safetyFactor: 1.2
  });
  console.log('✅ Result:', result1.finalCapacity, 'W');
  console.log('   Capacity per m³:', result1.capacityPerM3, 'W/m³');
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: Parameter extraction
console.log('Test 2: Parameter extraction from message');
const testMessages = [
  'Calculate cold room capacity for 500m³ at -18°C with 40°C ambient temperature',
  'Soğuk oda kapasitesi hesapla 200m³ oda -5°C sıcaklık 30°C dış ortam',
  'Kühlraum Kapazität berechnen für 150m³ bei 0°C mit 45°C Umgebungstemperatur'
];

testMessages.forEach((message, index) => {
  console.log(`Message ${index + 1}: "${message}"`);
  const params = coldRoomCalculator.extractParameters(message);
  console.log('Extracted params:', params);
  console.log('');
});

console.log('='.repeat(50) + '\n');

// Test 3: Comparison table
console.log('Test 3: Comparison table generation');
try {
  const comparison = coldRoomCalculator.generateComparison({
    temperature: -20,
    ambientTemp: 35,
    climateZone: 'cool',
    safetyFactor: 1.2
  });
  console.log('✅ Comparison table generated with', comparison.length, 'entries');
  console.log('Sample entries:');
  comparison.slice(0, 3).forEach(item => {
    console.log(`   ${item.volume}m³: ${item.capacity}W (${item.capacityPerM3} W/m³)`);
  });
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 4: Formatting
console.log('Test 4: Response formatting');
try {
  const result = coldRoomCalculator.calculateCapacity({
    volume: 250,
    temperature: -15,
    ambientTemp: 38,
    climateZone: 'hot',
    safetyFactor: 1.3
  });
  
  console.log('English format:');
  console.log(coldRoomCalculator.formatResult(result, 'en'));
  console.log('\nTurkish format:');
  console.log(coldRoomCalculator.formatResult(result, 'tr'));
  console.log('\nGerman format:');
  console.log(coldRoomCalculator.formatResult(result, 'de'));
} catch (error) {
  console.log('❌ Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 5: Error handling
console.log('Test 5: Error handling');
const invalidTests = [
  { volume: -10, temperature: -20, ambientTemp: 35 },
  { volume: 100, temperature: 25, ambientTemp: 35 }, // Invalid temperature
  { volume: 100, temperature: -20, ambientTemp: 60 }, // Too high ambient
  { volume: 100, temperature: -20, ambientTemp: 20 }  // Too low ambient
];

invalidTests.forEach((test, index) => {
  console.log(`Invalid test ${index + 1}:`, test);
  try {
    coldRoomCalculator.calculateCapacity(test);
    console.log('❌ Should have thrown an error');
  } catch (error) {
    console.log('✅ Correctly caught error:', error.message);
  }
  console.log('');
});

console.log('🧪 Testing completed!'); 