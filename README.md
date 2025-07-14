# WhatsApp Chatbot for DURMUSBABA.DE

A WhatsApp chatbot powered by Google's Gemini AI for DURMUSBABA.DE, providing customer support, product information, and **cold room capacity calculations**.

## Features

- Integration with WhatsApp Business API
- AI-powered responses using Google's Gemini AI
- Conversation context and history management
- WooCommerce integration for e-commerce functionality
- Multilingual support (English, German, Turkish)
- Media message handling

- Product search and recommendation
- Order status queries
- Automatic order notifications via WhatsApp
- **Snap-to-Shop**: Image recognition for product search (send a photo to find matching products)



## Prerequisites

- Node.js v18 or higher
- WhatsApp Business API account
- Google Gemini AI API key
- WooCommerce store with API access (optional)
- HTTPS-enabled server or tunnel for webhook (e.g., Ngrok, Cloudflare Tunnel)

## Installation

1. Clone this repository:
   ```
   git clone https://github.com/Saltukxx/durmusbaba.git
   cd durmusbaba
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
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_access_token
   WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

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
4. Set your verify token (must match WEBHOOK_VERIFY_TOKEN in .env)
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
   - Verify Token: Your WEBHOOK_VERIFY_TOKEN value

## Testing

1. Test the webhook verification:
   ```
   npm run test:webhook
   ```

2. Test sending a message:
   ```
   npm run test:whatsapp
   ```



4. Test other components:
   ```
   npm run test:gemini
   npm run test:woocommerce
   npm run test:language
   npm run test:intent
   npm run test:cold-room
   ```

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
   heroku config:set WHATSAPP_PHONE_NUMBER_ID=your_id
   heroku config:set WHATSAPP_ACCESS_TOKEN=your_token
   heroku config:set WEBHOOK_VERIFY_TOKEN=your_verify_token
   heroku config:set GEMINI_API_KEY=your_gemini_key
   heroku config:set NODE_ENV=production
   ```

5. Deploy to Heroku:
   ```
   git push heroku main
   ```

### Render

1. Create a Render account
2. Connect your GitHub repository
3. Set environment variables in the Render dashboard
4. Deploy automatically

## Project Structure

- `server.js` - Main server application
- `intentRouter.js` - Intent detection and routing
- `languageProcessor.js` - Natural language processing
- `geminiService.js` - Integration with Google's Gemini AI
- `whatsappService.js` - WhatsApp Business API integration
- `woocommerceService.js` - WooCommerce integration
- `equipmentRecommendationFlow.js` - Equipment recommendation flow
- `equipmentRecommendationService.js` - Equipment recommendation logic
- `sessionManager.js` - User session management
- `errorHandler.js` - Error handling and logging

## Advanced Features

### Conversation Context Management

The bot maintains intelligent conversation context:
- Entity tracking (products, categories, price ranges, orders)
- Contextual references ("this product", "in this category")
- Topic tracking (product info, order status, sales queries, support)
- Multi-language reference detection
- Automatic entity extraction

### Sales Assistant Features

- Product recommendations based on customer needs
- Category navigation and filtering
- Smart matching by price range, brand, features
- Multi-language support (German, English, Turkish)
- Professional sales communication

### Cold Room Capacity Calculator

Professional refrigeration system sizing with step-by-step guidance:

- **Interactive Flow**: Guided questions to collect all required parameters
- **Multi-language Support**: English, Turkish, German
- **Comprehensive Calculations**: 
  - Transmission load (heat through walls)
  - Product load (heat from products)
  - Infiltration load (heat from door openings)
  - Internal load (lights, people, equipment)
- **Professional Results**: Detailed breakdown with system recommendations
- **Navigation Commands**: Show answers, go back, edit previous answers, restart

**Usage Examples:**
- "Calculate cold room capacity for 10m × 6m × 3m at -20°C"
- "Soğuk oda kapasitesi hesapla 8m × 5m × 2.5m -5°C sıcaklık"
- "Kühlraum Kapazität berechnen für 12m × 7m × 3.5m bei 0°C"

### Snap-to-Shop Feature

Send product images via WhatsApp to find matching products:
- Product identification from images
- Feature extraction and matching
- Intelligent product search
- Formatted responses with product details

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please contact [your-email@example.com]
