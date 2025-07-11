require('dotenv').config();
const axios = require('axios');
const os = require('os');

// Get server URL from environment or use localhost
const SERVER_URL = process.env.SERVER_URL || `http://localhost:${process.env.PORT || 3000}`;

/**
 * Format bytes to human-readable format
 * @param {number} bytes - Bytes to format
 * @returns {string} - Formatted string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime to human-readable format
 * @param {number} seconds - Uptime in seconds
 * @returns {string} - Formatted string
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

/**
 * Check the system status
 */
async function checkSystemStatus() {
  console.log('\n=== WhatsApp Chatbot System Status ===\n');
  
  // Check local system status
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  const memUsage = Math.round((usedMem / totalMem) * 100);
  
  console.log('Local System:');
  console.log(`- Platform: ${os.platform()} (${os.arch()})`);
  console.log(`- Node.js: ${process.version}`);
  console.log(`- CPU: ${os.cpus()[0].model} (${os.cpus().length} cores)`);
  console.log(`- Memory: ${formatBytes(usedMem)} / ${formatBytes(totalMem)} (${memUsage}%)`);
  console.log(`- Uptime: ${formatUptime(os.uptime())}`);
  
  // Check server status
  try {
    console.log('\nChecking server status...');
    
    const response = await axios.get(`${SERVER_URL}/health`);
    const serverStatus = response.data;
    
    console.log('\nServer Status:');
    console.log(`- Status: ${serverStatus.status}`);
    console.log(`- Environment: ${serverStatus.environment}`);
    console.log(`- Uptime: ${serverStatus.uptime}`);
    console.log(`- Active Connections: ${serverStatus.activeConnections}`);
    console.log(`- Memory Usage: ${formatBytes(serverStatus.memoryUsage.rss)}`);
    console.log(`- Timestamp: ${serverStatus.timestamp}`);
    
    // Check WhatsApp API status
    console.log('\nChecking WhatsApp API connectivity...');
    
    if (!process.env.WHATSAPP_API_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.log('❌ WhatsApp API: Not configured (missing credentials)');
    } else {
      try {
        // Make a simple API call to check connectivity
        const whatsappUrl = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}`;
        const whatsappResponse = await axios.get(whatsappUrl, {
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_API_TOKEN}`
          }
        });
        
        console.log('✅ WhatsApp API: Connected');
        console.log(`- Phone Number: ${whatsappResponse.data.display_phone_number || 'N/A'}`);
      } catch (whatsappError) {
        console.log('❌ WhatsApp API: Connection failed');
        console.log(`- Error: ${whatsappError.response?.data?.error?.message || whatsappError.message}`);
      }
    }
    
    // Check Gemini AI API status
    console.log('\nChecking Gemini AI API status...');
    
    if (!process.env.GEMINI_API_KEY) {
      console.log('❌ Gemini AI API: Not configured (missing API key)');
    } else {
      console.log('✅ Gemini AI API: API key configured');
    }
    
    // Check WooCommerce API status
    console.log('\nChecking WooCommerce API status...');
    
    if (!process.env.WOOCOMMERCE_URL || !process.env.WOOCOMMERCE_CONSUMER_KEY || !process.env.WOOCOMMERCE_CONSUMER_SECRET) {
      console.log('⚠️ WooCommerce API: Not fully configured (optional)');
    } else {
      console.log('✅ WooCommerce API: Configured');
      console.log(`- Store URL: ${process.env.WOOCOMMERCE_URL}`);
    }
    
  } catch (error) {
    console.error('\n❌ Error checking server status:');
    console.error(`- ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      console.error(`- The server at ${SERVER_URL} is not running or not accessible`);
      console.error('- Try starting the server with: npm start');
    } else if (error.response) {
      console.error(`- Status: ${error.response.status}`);
      console.error(`- Response: ${JSON.stringify(error.response.data)}`);
    }
  }
  
  console.log('\n');
}

// Run the status check
checkSystemStatus(); 