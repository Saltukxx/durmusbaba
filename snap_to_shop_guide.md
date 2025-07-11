# Snap-to-Shop Guide

This guide explains how to use the Snap-to-Shop feature in your WhatsApp bot.

## What is Snap-to-Shop?

Snap-to-Shop allows your customers to send a photo of a product to your WhatsApp bot. The bot will:

1. Analyze the image using Gemini Vision AI
2. Identify the product type, brand, and model
3. Search your inventory for matching products
4. Return product matches with pricing and availability

## How It Works

When a customer sends an image:

1. The WhatsApp webhook receives the image
2. The bot downloads the image and processes it with Gemini Vision
3. The AI identifies key product information (brand, model, specifications)
4. The bot searches your inventory for matching products
5. Matching products are returned to the customer with details and links

## Benefits

- **Easier Product Discovery**: Customers can find products without knowing exact names or model numbers
- **Visual Search**: Customers can search by sending images instead of typing text
- **Competitive Analysis**: Customers can send images of competitor products to find similar items in your store
- **Screenshot Search**: Customers can send screenshots from other websites or search results
- **Reduced Friction**: Simplifies the shopping experience by removing the need to type detailed search queries

## Implementation Details

The Snap-to-Shop feature uses the following components:

1. **Gemini Vision AI**: Analyzes product images and extracts key information
   - Uses the `gemini-1.5-flash` model for fast and accurate image analysis
   - Identifies product type, brand name, model number, and key features

2. **Product Search**: Matches image analysis with your product inventory
   - Uses advanced pattern matching to extract search terms
   - Prioritizes brand names and model numbers for accurate matching
   - Falls back to product type and features when specific identifiers aren't available

3. **Response Formatting**: Presents product matches in a user-friendly format
   - Shows product name, price, availability, and description
   - Includes direct links to product pages
   - Offers follow-up suggestions for further exploration

## Handling Unbranded Products

The system is designed to handle products with and without visible brand information:

1. **Branded Products**: When a brand is identified in the image:
   - The system searches for products from that specific brand
   - Results are presented as "matching [Brand] products"
   - Follow-up suggestions focus on that brand's offerings

2. **Unbranded Products**: When no brand is visible in the image:
   - The system identifies the product type (e.g., thermostat, compressor)
   - It searches for products in that category across all brands
   - Results are presented as "products that might match your needs"
   - Follow-up suggestions include top brands in that category

This dual approach ensures that customers always receive relevant product recommendations, whether or not the brand is visible in their image.

## Testing the Feature

To test the Snap-to-Shop feature:

1. Send a photo of a product to your WhatsApp bot
2. The bot will analyze the image and respond with:
   - Product identification (type, brand, model)
   - Key features identified in the image
   - Matching products from your inventory
3. You can then ask for more information about specific products by number or name

## Example Conversation

Customer: [Sends image of a DRC temperature controller]

Bot: 
```
I analyzed your image and identified it as a DRC Refrigeration Controller.

Key features: Digital temperature display, multiple indicator lights, control buttons.

Here are some matching products from our inventory:

1. *DRC Digital Temperature Controller DCB-112*
   Price: 89.99 €
   ✅ In Stock
   [View Product](https://example.com/product/drc-dcb-112)

2. *DRC Cold Room Controller with Alarm*
   Price: 124.50 €
   ✅ In Stock
   [View Product](https://example.com/product/drc-cold-room-controller)

Would you like more information about any of these products?
```

Customer: Tell me more about the first one

Bot: [Provides detailed information about the first product]

## Example with Unbranded Product

Customer: [Sends image of a thermostat without visible brand]

Bot:
```
I analyzed your image and identified it as a Digital Thermostat.

Key features: Temperature display, control buttons, panel mounting design.

Here are some Digital Thermostat products from our inventory that might match your needs:

1. *Danfoss ERC 214 Digital Temperature Controller*
   Price: 89.99 €
   ✅ In Stock
   [View Product](https://example.com/product/danfoss-erc-214)

2. *DRC Digital Thermostat DCB-112*
   Price: 65.50 €
   ✅ In Stock
   [View Product](https://example.com/product/drc-dcb-112)

These are some Digital Thermostat options from our inventory. Would you like more information about any specific product or would you like to see more options?
```

## Best Practices

- **Product Database**: Ensure your product database has detailed information including brand names and model numbers
- **Image Quality**: Advise customers to send clear, well-lit images for better recognition
- **Product Images**: Include multiple angles and detailed shots in your product listings
- **Technical Specifications**: Add comprehensive technical specifications to improve matching accuracy

## Configuration

To configure the Snap-to-Shop feature:

1. **API Keys**: Set your Gemini API key in the environment variables
   ```
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

2. **Product Database**: Ensure your WooCommerce integration is properly configured
   ```
   WOOCOMMERCE_URL=your_store_url
   WOOCOMMERCE_KEY=your_consumer_key
   WOOCOMMERCE_SECRET=your_consumer_secret
   ```

## Troubleshooting

If you encounter issues:

- Ensure your Gemini API key is properly configured
- Make sure your WhatsApp Business API is correctly set up
- Check that product information in your database is detailed and accurate
- Review the server logs for any error messages
- Test the feature using the `test_snap_to_shop.py` script with a sample image

## Need Help?

If you need assistance setting up or troubleshooting the Snap-to-Shop feature, please contact our support team. 