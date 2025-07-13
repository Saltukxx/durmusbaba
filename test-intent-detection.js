const intentRouter = require('./intentRouter');

async function testIntentDetection() {
  console.log('🧪 Testing Enhanced Intent Detection for Cold Room Requests...\n');

  const testMessages = [
    // The exact message the user received
    "Gerne! 😊 Wir können Ihnen bei der Berechnung für Kühlräume behilflich sein.",
    
    // Other German variations
    "Ich brauche eine Kühlraum Berechnung",
    "Kühlraum Kapazität berechnen",
    "Kühlraum Dimensionierung",
    "Kühlraum Auslegung",
    "Kühlraum Projektierung",
    "Kühlraum Planung",
    
    // English variations
    "I need cold room calculation",
    "Calculate cold room capacity",
    "Cold room sizing",
    "Refrigeration capacity calculation",
    
    // Turkish variations
    "Soğuk oda hesaplama",
    "Soğuk oda kapasitesi hesapla",
    "Soğutma kapasitesi",
    
    // Mixed language
    "Kühlraum 10x6x3 bei -20°C",
    "Cold room 10m x 6m x 3m at -20°C",
    "Soğuk oda 10x6x3 -20°C",
    
    // Conversational
    "Hallo, ich möchte einen Kühlraum berechnen lassen",
    "Can you help me with cold room calculation?",
    "Soğuk oda hesaplaması yapabilir misiniz?",
    
    // Non-cold room messages (should not trigger)
    "Hello, how are you?",
    "I need help with my order",
    "What products do you have?",
    "Hallo, wie geht es Ihnen?",
    "Merhaba, nasılsınız?"
  ];

  for (const message of testMessages) {
    try {
      const intent = await intentRouter.detectIntent(message);
      const isColdRoom = intent.type === 'cold_room_calculation';
      const status = isColdRoom ? '✅ COLD ROOM' : '❌ OTHER';
      
      console.log(`${status} | Confidence: ${intent.confidence} | "${message}"`);
      
      if (isColdRoom) {
        console.log(`   → Detected as: ${intent.type}`);
      }
    } catch (error) {
      console.log(`❌ ERROR | "${message}" - ${error.message}`);
    }
  }

  console.log('\n🎉 Intent Detection Test Completed!');
}

testIntentDetection().catch(console.error); 