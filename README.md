# WhatsApp Chatbot for DURMUSBABA.DE

A WhatsApp chatbot powered by Google's Gemini AI for DURMUSBABA.DE, providing customer support and product information.

## Features

- Integration with WhatsApp Business API
- AI-powered responses using Google's Gemini AI
- Conversation context and history management
- WooCommerce integration for e-commerce functionality
- Multilingual support
- Media message handling

## Prerequisites

- Node.js v18 or higher
- WhatsApp Business API account
- Google Gemini AI API key
- WooCommerce store with API access (optional)
- HTTPS-enabled server or tunnel for webhook (e.g., Ngrok, Cloudflare Tunnel)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/whatsapp-chatbot.git
   cd whatsapp-chatbot
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file based on the `.env.example` template:
   ```
   cp .env.example .env
   ```

4. Fill in your environment variables in the `.env` file:
   ```
   # WhatsApp Business API credentials
   WHATSAPP_API_TOKEN=your_whatsapp_api_token
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id
   WHATSAPP_VERIFY_TOKEN=your_custom_verify_token

   # Google Gemini AI API
   GEMINI_API_KEY=your_gemini_api_key

   # WooCommerce API (optional)
   WOOCOMMERCE_URL=https://durmusbaba.de
   WOOCOMMERCE_CONSUMER_KEY=your_consumer_key
   WOOCOMMERCE_CONSUMER_SECRET=your_consumer_secret

   # Server configuration
   PORT=3000
   NODE_ENV=development
   ```

## Setting Up WhatsApp Business API

1. Create a Meta for Developers account at https://developers.facebook.com/
2. Set up a WhatsApp Business app
3. Configure your webhook URL (your-server-url/webhook)
4. Set your verify token (must match WHATSAPP_VERIFY_TOKEN in .env)
5. Subscribe to the messages webhook

## Webhook Setup

1. Start your server:
   ```
   npm start
   ```

2. Expose your local server using a tunneling service like Ngrok:
   ```
   ngrok http 3000
   ```

3. Configure the webhook URL in the Meta for Developers dashboard:
   - Webhook URL: https://your-ngrok-url/webhook
   - Verify Token: Your WHATSAPP_VERIFY_TOKEN value

## Testing

1. Test the webhook verification:
   ```
   node test-webhook-verification.js
   ```

2. Test sending a message:
   ```
   node test-whatsapp.js
   ```

3. Test receiving a message by sending a message to your WhatsApp Business number.

## Deployment

### Heroku

1. Create a Heroku account and install the Heroku CLI
2. Login to Heroku:
   ```
   heroku login
   ```

3. Create a new Heroku app:
   ```
   heroku create
   ```

4. Set environment variables:
   ```
   heroku config:set WHATSAPP_API_TOKEN=your_token
   heroku config:set WHATSAPP_PHONE_NUMBER_ID=your_id
   heroku config:set WHATSAPP_BUSINESS_ACCOUNT_ID=your_account_id
   heroku config:set WHATSAPP_VERIFY_TOKEN=your_verify_token
   heroku config:set GEMINI_API_KEY=your_gemini_key
   heroku config:set NODE_ENV=production
   ```

5. Deploy to Heroku:
   ```
   git push heroku main
   ```

### AWS EC2

1. Launch an EC2 instance
2. SSH into your instance
3. Clone the repository
4. Install Node.js and dependencies
5. Set up environment variables
6. Use PM2 to keep the server running:
   ```
   npm install -g pm2
   pm2 start server.js
   ```

## Project Structure

- `server.js` - Main entry point
- `webhookHandler.js` - WhatsApp webhook handling
- `whatsappService.js` - WhatsApp API integration
- `geminiService.js` - Gemini AI integration
- `sessionManager.js` - Conversation management
- `woocommerceService.js` - WooCommerce integration
- `routes.js` - API routes
- `logger.js` - Logging service

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [your-email@example.com] 