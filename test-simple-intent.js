// Simple intent detection test without requiring environment variables
console.log('🧪 Testing Simple Intent Detection for Cold Room Calculator\n');

// Mock the intent detection logic
function detectIntent(message) {
  try {
    const lowerMessage = message.toLowerCase();
    
    // Cold room capacity calculation intent - CHECK THIS FIRST
    if (
      lowerMessage.includes('cold room') || 
      lowerMessage.includes('soğuk oda') || 
      lowerMessage.includes('kühlraum') ||
      lowerMessage.includes('refrigeration') || 
      lowerMessage.includes('dondurucu') || 
      lowerMessage.includes('kältetechnik') ||
      lowerMessage.includes('cooling capacity') || 
      lowerMessage.includes('soğutma kapasitesi') || 
      lowerMessage.includes('kühlkapazität') ||
      lowerMessage.includes('calculate capacity') || 
      lowerMessage.includes('kapasite hesapla') || 
      lowerMessage.includes('kapazität berechnen') ||
      (lowerMessage.includes('capacity') && (lowerMessage.includes('calculate') || lowerMessage.includes('hesapla') || lowerMessage.includes('berechnen'))) ||
      (lowerMessage.includes('kapasite') && (lowerMessage.includes('hesapla') || lowerMessage.includes('calculate'))) ||
      (lowerMessage.includes('kapazität') && (lowerMessage.includes('berechnen') || lowerMessage.includes('calculate')))
    ) {
      return { type: 'cold_room_calculation', confidence: 0.9 };
    }
    
    // Product search intent
    if (
      lowerMessage.includes('product') || 
      lowerMessage.includes('buy') || 
      lowerMessage.includes('purchase') || 
      lowerMessage.includes('order') ||
      lowerMessage.includes('shop') ||
      lowerMessage.includes('price')
    ) {
      return { type: 'product_search', confidence: 0.8 };
    }
    
    // Support intent
    if (
      lowerMessage.includes('help') || 
      lowerMessage.includes('support') || 
      lowerMessage.includes('issue') || 
      lowerMessage.includes('problem') ||
      lowerMessage.includes('question')
    ) {
      return { type: 'customer_support', confidence: 0.7 };
    }
    
    // Order status intent
    if (
      lowerMessage.includes('order status') || 
      lowerMessage.includes('my order') || 
      lowerMessage.includes('track') || 
      lowerMessage.includes('shipping') ||
      lowerMessage.includes('delivery')
    ) {
      return { type: 'order_status', confidence: 0.9 };
    }
    
    // Greeting intent
    if (
      lowerMessage.includes('hello') || 
      lowerMessage.includes('hi') || 
      lowerMessage.includes('hey') || 
      lowerMessage.includes('greetings') ||
      lowerMessage === 'hi' ||
      lowerMessage === 'hello'
    ) {
      return { type: 'greeting', confidence: 0.9 };
    }
    
    // Default to general query
    return { type: 'general_query', confidence: 0.5 };
    
  } catch (error) {
    return { type: 'general_query', confidence: 0.3 };
  }
}

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
        const intent = detectIntent(message);
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
        const intent = detectIntent(message);
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

console.log('\n🧪 Simple intent detection testing completed!'); 