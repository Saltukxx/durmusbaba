const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to conversation logs directory
const logsDir = path.join(__dirname, 'conversation_logs');

// Check if logs directory exists
if (!fs.existsSync(logsDir)) {
  console.error('Conversation logs directory not found. No conversations have been logged yet.');
  process.exit(1);
}

// Get all log files
const logFiles = fs.readdirSync(logsDir).filter(file => file.endsWith('.log'));

if (logFiles.length === 0) {
  console.log('No conversation logs found.');
  process.exit(0);
}

// Sort log files by modification time (most recent first)
const sortedLogFiles = logFiles
  .map(file => ({
    name: file,
    time: fs.statSync(path.join(logsDir, file)).mtime.getTime()
  }))
  .sort((a, b) => b.time - a.time)
  .map(file => file.name);

// Function to display a specific conversation
async function displayConversation(fileName) {
  const filePath = path.join(logsDir, fileName);
  const userId = path.basename(fileName, '.log');
  
  console.log('\n===========================================');
  console.log(`Conversation with user: ${userId}`);
  console.log('===========================================\n');
  
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    // Highlight user messages in cyan and bot messages in green
    if (line.includes('USER:')) {
      console.log('\x1b[36m%s\x1b[0m', line); // Cyan
    } else if (line.includes('BOT:')) {
      console.log('\x1b[32m%s\x1b[0m', line); // Green
    } else {
      console.log(line);
    }
  }
  
  console.log('\n===========================================\n');
}

// Function to list all conversations
function listConversations() {
  console.log('\nAvailable conversation logs:\n');
  
  sortedLogFiles.forEach((file, index) => {
    const stats = fs.statSync(path.join(logsDir, file));
    const userId = path.basename(file, '.log');
    const lastModified = stats.mtime.toLocaleString();
    const fileSize = (stats.size / 1024).toFixed(2);
    
    console.log(`${index + 1}. User ID: ${userId}`);
    console.log(`   Last activity: ${lastModified}`);
    console.log(`   Log size: ${fileSize} KB\n`);
  });
}

// Main function
async function main() {
  // Check if a specific conversation was requested
  const requestedIndex = process.argv[2];
  
  if (requestedIndex) {
    const index = parseInt(requestedIndex) - 1;
    if (isNaN(index) || index < 0 || index >= sortedLogFiles.length) {
      console.error('Invalid conversation index. Please provide a valid number.');
      listConversations();
      process.exit(1);
    }
    
    await displayConversation(sortedLogFiles[index]);
    
  } else {
    // If no specific conversation was requested, list all conversations
    console.log('\n=== WhatsApp Chatbot Conversation Logs ===\n');
    console.log(`Total conversations: ${sortedLogFiles.length}`);
    
    listConversations();
    
    console.log('To view a specific conversation, run:');
    console.log('node view-conversations.js <conversation-number>');
    console.log('\nExample: node view-conversations.js 1\n');
  }
}

// Run the main function
main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
}); 