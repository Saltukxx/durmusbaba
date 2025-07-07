# Changelog

## [1.1.0] - 2023-06-15

### Added
- Enhanced conversation context management system
  - New `conversation_context.py` module for tracking conversation context
  - Entity extraction for products, categories, price ranges, and orders
  - Reference resolution for phrases like "this product", "that category", etc.
  - Multi-language support for contextual references (German, English, Turkish)
  - Topic tracking to maintain conversation flow
  - Context expiration after 24 hours of inactivity

### Changed
- Updated `main.py` to use the new conversation context manager
- Improved product query handling with context awareness
- Enhanced category and price range requests with context
- Updated order query handling to remember previous orders
- Modified "show more products" functionality to use context history

### Fixed
- Fixed issues with the bot not understanding references to previous products
- Improved handling of follow-up questions about products, categories, and orders
- Enhanced language detection for multi-language support

## [1.0.0] - 2023-05-01

### Initial Release
- WhatsApp API integration with Google Gemini AI
- WooCommerce integration for product and order queries
- Sales assistant features
- Multi-language support (German, English, Turkish)
- Product search and recommendation
- Order tracking 