const intentRouter = require('./intentRouter');

async function testIntent() {
  console.log('Testing intent detection for "cold room storage"...\n');
  
  try {
    const result = await intentRouter.detectIntent('cold room storage');
    console.log('Detected intent:', result);
    
    // Manual keyword test
    const message = 'cold room storage';
    const lowerMessage = message.toLowerCase();
    
    const coldRoomKeywords = {
      en: ['cold room', 'cold storage', 'refrigeration', 'cooling capacity', 'cold calculation', 
           'freezer room', 'chiller', 'cooling room', 'refrigerated storage', 'cold chamber',
           'calculate cold', 'cold requirements', 'cooling load', 'refrigeration capacity']
    };
    
    const hasKeyword = Object.values(coldRoomKeywords).flat().some(keyword => 
      lowerMessage.includes(keyword)
    );
    
    console.log('Manual keyword check:', hasKeyword);
    console.log('Matched keywords:', Object.values(coldRoomKeywords).flat().filter(keyword => lowerMessage.includes(keyword)));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testIntent();