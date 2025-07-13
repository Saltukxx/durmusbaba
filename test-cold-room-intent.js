const intentRouter = require('./intentRouter');

// Test various cold room related messages
const testMessages = [
  'cold room',
  'Calculate for 10m × 6m × 3m room at -18°C', 
  'I need cooling capacity calculation',
  'soğuk oda hesaplama',
  'kühlraum berechnung',
  'temperature calculation',
  'cooling capacity',
  'freezer room dimensions'
];

async function testIntentDetection() {
  console.log('Testing cold room intent detection:');
  
  for (let i = 0; i < testMessages.length; i++) {
    const msg = testMessages[i];
    try {
      const intent = await intentRouter.detectIntent(msg);
      console.log(`${i+1}. "${msg}" -> ${intent.type} (confidence: ${intent.confidence})`);
    } catch (error) {
      console.log(`${i+1}. "${msg}" -> ERROR: ${error.message}`);
    }
  }
}

testIntentDetection();