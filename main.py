from flask import Flask, request
import requests
import json
import google.auth
from google.auth.transport.requests import Request
import os
import base64
import traceback
from dotenv import load_dotenv
import google.generativeai as genai
import re
from woocommerce_client import woocommerce
from sales_assistant import is_sales_inquiry, handle_sales_inquiry

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configuration from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash-lite")
LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "de")

# Debug environment variables
print(f"GEMINI_API_KEY: {'*****' + GEMINI_API_KEY[-4:] if GEMINI_API_KEY else 'Not set'}")
print(f"GEMINI_MODEL: {GEMINI_MODEL}")
print(f"LANGUAGE_CODE: {LANGUAGE_CODE}")

# Configure Gemini AI
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    print("WARNING: GEMINI_API_KEY is not set!")

# Add these global variables after CHAT_HISTORY declaration
CHAT_HISTORY = {}  # Store chat history for different users

# Conversation context tracking
USER_CONTEXT = {}  # Store context for different users: last query type, last products found, etc.

ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "EAA3oBtMMm1MBO2niZA7bevRovOyIS479wXtOg0C9pWztSvnPHJIuWpsrO6fCvB6DGcDH5LMZCqaMwGSmpXJIMPlNZCSZBbjmp7gOGZBl8iZBpMSzS6B1NgfBtwU2cVJBGOrARd9VF5VpQpi7vW5itTOPyUZCPgiXwXYZClX5O6q44kCd7zvw8hrGRzyltfiOhykywvqFsimKXdB4uFFUEt49UaZBSp6bkHEw7stAeUKIF")
# Default phone number ID, but we'll use the one from the incoming message
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "725422520644608")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "whatsapptoken")

# Initialize WooCommerce connection
USE_WOOCOMMERCE = True
try:
    if woocommerce.is_connected:
        print("✅ WooCommerce API connected successfully")
    else:
        print("⚠️ WooCommerce API connection failed, falling back to local product database")
        USE_WOOCOMMERCE = False
except Exception as e:
    print(f"⚠️ Error initializing WooCommerce API: {e}")
    USE_WOOCOMMERCE = False

def load_product_db():
    """Load product database from JSON file."""
    try:
        with open('durmusbaba_products_chatbot.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            print(f"Loaded {len(data)} products from database.")
            return data
    except Exception as e:
        print(f"Error loading product database: {e}")
        return []

# Load product database
PRODUCT_DB = load_product_db()

def get_gemini_response(user_id, text):
    print(f"Getting Gemini response for text: '{text}'")
    try:
        # Initialize user context if not exists
        if user_id not in USER_CONTEXT:
            USER_CONTEXT[user_id] = {
                'last_query_type': None,
                'last_products': [],
                'last_category': None,
                'last_price_range': None,
                'product_page': 0
            }
        
        # Initialize or get existing chat session
        if user_id not in CHAT_HISTORY:
            # Create a new chat session with system prompt in German
            system_prompt = """
            Du bist ein freundlicher Kundendienstassistent für durmusbaba.de, einen Online-Shop für Kältetechnik und Kompressoren.
            
            Über durmusbaba.de:
            - durmusbaba.de ist ein spezialisierter Online-Shop für Kältetechnik, Kompressoren und Kühlsysteme
            - Wir bieten Produkte von führenden Herstellern wie Embraco, Bitzer, Danfoss und anderen an
            - Unser Hauptfokus liegt auf Kompressoren, Kühltechnik und Zubehör
            
            Produktinformationen:
            - Wir haben eine große Auswahl an Kompressoren verschiedener Marken und Modelle
            - Die Produktdatenbank enthält genaue Informationen zu Produktnamen und Preisen in Euro
            - Alle Preise sind in Euro (EUR) angegeben
            - Wenn ein Benutzer nach einem bestimmten Produkt fragt, sollst du IMMER den genauen Preis aus der Datenbank angeben
            - Wenn ein Benutzer nur den Produktnamen sendet, verstehe dies als Preisanfrage und gib den Preis zurück
            - Wenn du Produktinformationen bereitstellst, füge IMMER den Link zum Produkt hinzu
            - Gib auch die Verfügbarkeit des Produkts an (auf Lager oder nicht auf Lager)
            - Bei nicht verfügbaren Produkten, erwähne immer, dass Sonderbestellungen per E-Mail oder Telefon möglich sind
            - WICHTIG: Verwende NIEMALS Platzhalter wie "[Bitte geben Sie den Preis ein]" oder ähnliches
            - Wenn du die Produktinformationen nicht kennst, sage ehrlich, dass du das Produkt nicht finden konntest
            - Verwende IMMER die tatsächlichen Daten aus der Datenbank, nicht Vorlagen oder Platzhalter
            - Verwende NIEMALS eckige Klammern wie [Produktname] oder [Preis] in deinen Antworten
            - Wenn du unsicher bist, ob ein Produkt existiert, sage, dass du es nicht finden konntest
            
            Kundenservice:
            - Bei Fragen zur Verfügbarkeit oder technischen Details können Kunden uns kontaktieren
            - Wir bieten Beratung zur Auswahl des richtigen Kompressors oder Kühlsystems
            - Für detaillierte technische Informationen können Kunden unsere Website besuchen oder uns direkt kontaktieren
            - E-Mail-Kontakt: info@durmusbaba.com
            - Telefonnummer: +4915228474571
            - Reguläre Lieferzeit: 3-5 Werktage
            
            Bestellung und Versand:
            - Bestellungen können über unsere Website durmusbaba.de aufgegeben werden
            - Wir versenden in ganz Europa
            - Die reguläre Lieferzeit beträgt 3-5 Werktage
            - Bei Fragen zum Versand oder zur Lieferzeit stehen wir zur Verfügung
            
            Stil und Ton:
            - Sei freundlich, hilfsbereit und professionell
            - Verwende gelegentlich passende Emojis, um deine Antworten freundlicher zu gestalten
            - Stelle dich bei der ersten Nachricht eines Benutzers als KI-Kundendienstassistent für durmusbaba.de vor
            - Sei präzise und informativ, aber halte einen freundlichen Ton
            
            WICHTIG: Erkenne die Sprache des Benutzers und antworte IMMER in derselben Sprache, in der der Benutzer dich anspricht.
            Wenn der Benutzer auf Türkisch schreibt, antworte auf Türkisch.
            Wenn der Benutzer auf Englisch schreibt, antworte auf Englisch.
            Wenn der Benutzer auf Deutsch schreibt, antworte auf Deutsch.
            Wenn der Benutzer in einer anderen Sprache schreibt, versuche in dieser Sprache zu antworten.
            """
            
            model = genai.GenerativeModel(GEMINI_MODEL)
            print(f"Using Gemini model: {GEMINI_MODEL}")
            CHAT_HISTORY[user_id] = model.start_chat(history=[
                {"role": "user", "parts": ["Systeminfo"]},
                {"role": "model", "parts": [system_prompt]}
            ])
            
            # Send a welcome message for first-time users
            welcome_message = generate_welcome_message()
            CHAT_HISTORY[user_id].send_message(welcome_message)
        
        # Check if this is a follow-up request for more products
        if is_more_products_request(text):
            return handle_more_products_request(user_id, text)
        
        # Check if this is an order-related query
        if is_order_query(text):
            return handle_order_query(text, user_id)
        
        # Check if this is a sales inquiry (product recommendations, offers, etc.)
        if is_sales_inquiry(text):
            USER_CONTEXT[user_id]['last_query_type'] = 'sales'
            return handle_sales_inquiry(text, user_id)
        
        # First check if the message is just a product name (direct product query)
        exact_product = find_exact_product(text)
        if exact_product:
            # If it's an exact product name, return the price directly without calling Gemini
            product_name = exact_product['product_name']
            price = exact_product['price_eur']
            url = exact_product.get('url', '')
            status = exact_product.get('status', '')
            
            # Update user context
            USER_CONTEXT[user_id]['last_query_type'] = 'exact_product'
            USER_CONTEXT[user_id]['last_products'] = [exact_product]
            
            # Format status message
            status_message = ""
            if status == "instock":
                status_message = "auf Lager"
            elif status == "outofstock":
                status_message = "nicht auf Lager"
                
            # Detect language and format response accordingly
            if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                # Turkish
                response = f"📦 {product_name} fiyatı: {price} EUR\n"
                if status == "instock":
                    response += f"✅ Durum: {status_message}\n"
                    response += f"🚚 Teslimat süresi: 3-5 iş günü\n"
                else:
                    response += f"⚠️ Durum: {status_message}\n"
                    response += f"📧 Özel sipariş için lütfen bizimle iletişime geçin: info@durmusbaba.com veya +4915228474571\n"
                response += f"🔗 Ürün linki: {url}"
                return response
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                status_text = "in stock" if status == "instock" else "out of stock"
                response = f"📦 The price of {product_name} is {price} EUR\n"
                if status == "instock":
                    response += f"✅ Status: {status_text}\n"
                    response += f"🚚 Delivery time: 3-5 business days\n"
                else:
                    response += f"⚠️ Status: {status_text}\n"
                    response += f"📧 For special orders, please contact us at: info@durmusbaba.com or +4915228474571\n"
                response += f"🔗 Product link: {url}"
                return response
            else:
                # Default to German
                response = f"📦 Der Preis für {product_name} beträgt {price} EUR\n"
                if status == "instock":
                    response += f"✅ Status: {status_message}\n"
                    response += f"🚚 Lieferzeit: 3-5 Werktage\n"
                else:
                    response += f"⚠️ Status: {status_message}\n"
                    response += f"📧 Für Sonderbestellungen kontaktieren Sie uns bitte unter: info@durmusbaba.com oder +4915228474571\n"
                response += f"🔗 Produktlink: {url}"
                return response
        
        # Check if the message is a product query
        product_info = check_product_query(text, user_id)
        if product_info:
            # If product information is found, add it to the message
            text = f"{text}\n\nProduktinformationen: {product_info}"
            
            # For product queries, we'll handle the response directly to avoid template responses
            # This is especially important for cases where Gemini might generate placeholders
            return product_info
        
        # Check if this is a contact information request
        if is_contact_request(text):
            USER_CONTEXT[user_id]['last_query_type'] = 'contact'
            return generate_contact_info_response(text)
        
        # Check if this is a delivery time request
        if is_delivery_request(text):
            USER_CONTEXT[user_id]['last_query_type'] = 'delivery'
            return generate_delivery_info_response(text)
        
        # For non-product queries, get response from Gemini
        response = CHAT_HISTORY[user_id].send_message(text)
        response_text = response.text
        
        # Check if the response contains template placeholders
        placeholder_patterns = [
            r'\[\s*[Bb]itte[^]]*\]',  # [Bitte geben Sie...]
            r'\[\s*[Pp]lease[^]]*\]',  # [Please enter...]
            r'\[\s*[Pp]rodukt[^]]*\]', # [Produktname]
            r'\[\s*[Pp]reis[^]]*\]',   # [Preis]
            r'\[\s*[Pp]rice[^]]*\]',   # [Price]
            r'\[\s*[Vv]erfügbarkeit[^]]*\]', # [Verfügbarkeit]
            r'\[\s*[Ss]tatus[^]]*\]',  # [Status]
            r'\[\s*[Ll]ink[^]]*\]'     # [Link]
        ]
        
        has_placeholders = any(re.search(pattern, response_text) for pattern in placeholder_patterns)
        
        if has_placeholders:
            # If the response contains placeholders, return a generic response
            if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                # Turkish
                return "❓ Üzgünüm, bu ürün hakkında bilgi bulamadım. Lütfen ürün adını kontrol edin veya başka bir ürün sorun.\n\n📧 Yardıma ihtiyacınız varsa, lütfen bizimle iletişime geçin: info@durmusbaba.com veya +4915228474571"
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                return "❓ I'm sorry, I couldn't find information about this product. Please check the product name or ask about a different product.\n\n📧 If you need assistance, please contact us at: info@durmusbaba.com or +4915228474571"
            else:
                # Default to German
                return "❓ Es tut mir leid, ich konnte keine Informationen zu diesem Produkt finden. Bitte überprüfen Sie den Produktnamen oder fragen Sie nach einem anderen Produkt.\n\n📧 Wenn Sie Hilfe benötigen, kontaktieren Sie uns bitte unter: info@durmusbaba.com oder +4915228474571"
        
        print(f"Gemini response: {response_text}")
        return response_text
    except Exception as e:
        print(f"Error in get_gemini_response: {e}")
        traceback.print_exc()
        return f"Üzgünüm, bir hata oluştu: {str(e)}"

def is_contact_request(text):
    """Check if the message is asking for contact information."""
    text_lower = text.lower()
    contact_keywords = [
        'kontakt', 'contact', 'iletişim', 'email', 'e-mail', 'telefon', 'phone', 'nummer', 'number',
        'anrufen', 'call', 'arama', 'erreichen', 'reach', 'ulaşmak'
    ]
    return any(keyword in text_lower for keyword in contact_keywords)

def is_delivery_request(text):
    """Check if the message is asking about delivery times."""
    text_lower = text.lower()
    delivery_keywords = [
        'lieferzeit', 'delivery', 'teslimat', 'versand', 'shipping', 'kargo', 'wann', 'when', 'ne zaman',
        'liefern', 'deliver', 'teslim', 'zustellung', 'delivery time', 'teslimat süresi'
    ]
    return any(keyword in text_lower for keyword in delivery_keywords)

def generate_welcome_message():
    """Generate a welcome message for first-time users."""
    return """
Hallo! 👋 Ich bin der KI-Kundendienstassistent für durmusbaba.de, Ihren Spezialisten für Kältetechnik und Kompressoren.

Wie kann ich Ihnen heute helfen? Sie können mich nach Produkten, Preisen, Verfügbarkeit oder anderen Informationen fragen.

Hello! 👋 I'm the AI customer service assistant for durmusbaba.de, your specialist for refrigeration technology and compressors.

How can I help you today? You can ask me about products, prices, availability, or other information.

Merhaba! 👋 Ben durmusbaba.de'nin yapay zeka müşteri hizmetleri asistanıyım, soğutma teknolojisi ve kompresörler konusunda uzmanınız.

Bugün size nasıl yardımcı olabilirim? Bana ürünler, fiyatlar, stok durumu veya diğer bilgiler hakkında sorular sorabilirsiniz.
"""

def generate_contact_info_response(text):
    """Generate a response with contact information."""
    # Detect language
    if any(word in text.lower() for word in ['iletişim', 'telefon', 'e-posta', 'email', 'mail', 'ulaşmak']):
        # Turkish
        return """📞 İletişim Bilgileri:

📧 E-posta: info@durmusbaba.com
📱 Telefon: +4915228474571
🌐 Web sitesi: https://durmusbaba.de

Size nasıl yardımcı olabiliriz? 😊"""
    elif any(word in text.lower() for word in ['contact', 'phone', 'email', 'mail', 'reach']):
        # English
        return """📞 Contact Information:

📧 Email: info@durmusbaba.com
📱 Phone: +4915228474571
🌐 Website: https://durmusbaba.de

How can we assist you further? 😊"""
    else:
        # Default to German
        return """📞 Kontaktinformationen:

📧 E-Mail: info@durmusbaba.com
📱 Telefon: +4915228474571
🌐 Website: https://durmusbaba.de

Wie können wir Ihnen weiterhelfen? 😊"""

def generate_delivery_info_response(text):
    """Generate a response with delivery information."""
    # Detect language
    if any(word in text.lower() for word in ['teslimat', 'kargo', 'ne zaman', 'teslim']):
        # Turkish
        return """🚚 Teslimat Bilgileri:

📦 Standart teslimat süresi: 3-5 iş günü
🇪🇺 Tüm Avrupa'ya gönderim yapıyoruz
📧 Özel teslimat talepleri için lütfen bizimle iletişime geçin: info@durmusbaba.com

Başka bir sorunuz var mı? 😊"""
    elif any(word in text.lower() for word in ['delivery', 'shipping', 'when', 'ship']):
        # English
        return """🚚 Delivery Information:

📦 Standard delivery time: 3-5 business days
🇪🇺 We ship throughout Europe
📧 For special delivery requests, please contact us at: info@durmusbaba.com

Do you have any other questions? 😊"""
    else:
        # Default to German
        return """🚚 Lieferinformationen:

📦 Standardlieferzeit: 3-5 Werktage
🇪🇺 Wir versenden in ganz Europa
📧 Für besondere Lieferanfragen kontaktieren Sie uns bitte unter: info@durmusbaba.com

Haben Sie weitere Fragen? 😊"""

def find_exact_product(text):
    """Find a product by its exact name in the database."""
    # Use WooCommerce API if available
    if USE_WOOCOMMERCE and woocommerce.is_connected:
        try:
            # Clean up the input text
            cleaned_text = text.strip()
            
            # Search for products with this name
            products = woocommerce.search_products_by_name(cleaned_text)
            
            if products:
                # Find the best match
                best_match = None
                best_match_score = 0
                
                for product in products:
                    product_name = product['name'].lower()
                    query = cleaned_text.lower()
                    
                    # Check for exact match
                    if product_name == query:
                        # Create a compatible product object
                        return {
                            'product_name': product['name'],
                            'price_eur': product['price'],
                            'status': 'instock' if product['stock_status'] == 'instock' else 'outofstock',
                            'url': product['permalink'],
                            'sku': product.get('sku', '')
                        }
                    
                    # Check if product name is in query or vice versa
                    if product_name in query or query in product_name:
                        score = len(product_name) / max(len(query), 1)
                        if score > best_match_score:
                            best_match = product
                            best_match_score = score
                
                # If we found a good match
                if best_match and best_match_score > 0.5:
                    return {
                        'product_name': best_match['name'],
                        'price_eur': best_match['price'],
                        'status': 'instock' if best_match['stock_status'] == 'instock' else 'outofstock',
                        'url': best_match['permalink'],
                        'sku': best_match.get('sku', '')
                    }
            
            # If no match found in WooCommerce, fall back to local database
            print("No exact match found in WooCommerce, falling back to local database")
        except Exception as e:
            print(f"Error searching WooCommerce products: {e}")
            traceback.print_exc()
            # Fall back to local database
    
    # Use local database as fallback
    # Clean up the input text
    cleaned_text = text.strip()
    
    # First try exact match
    for product in PRODUCT_DB:
        if product['product_name'].lower() == cleaned_text.lower():
            return product
    
    # If no exact match, try to find products where the name is contained in the query
    # or the query contains the full product name
    for product in PRODUCT_DB:
        product_name = product['product_name'].lower()
        if product_name in cleaned_text.lower() or cleaned_text.lower() in product_name:
            # Check if it's a substantial match (at least 80% of the product name)
            if len(product_name) >= 5 and (
                len(product_name) >= 0.8 * len(cleaned_text) or 
                len(cleaned_text) >= 0.8 * len(product_name)
            ):
                return product
    
    # If still no match, try to match product model numbers
    # Many products have model numbers like "EMY 80 CLP" or "NEK 6160 Z"
    words = cleaned_text.split()
    for word in words:
        if len(word) >= 3 and any(c.isdigit() for c in word):
            for product in PRODUCT_DB:
                if word in product['product_name']:
                    return product
    
    return None

def check_product_query(text, user_id=None):
    """Check if the user is asking about a specific product and return relevant information."""
    text_lower = text.lower()
    
    # List of keywords that might indicate a product query
    product_keywords = [
        # Price-related keywords
        "preis", "price", "fiyat", "kosten", "cost", "euro", "€", "eur",
        # Product-related keywords
        "kompressor", "compressor", "kompresör", "produkt", "product", "ürün", 
        "modell", "model", "typ", "type", "artikel", "item",
        # Brand names
        "embraco", "bitzer", "danfoss", "secop", "copeland", "tecumseh", 
        "dcb", "ebm", "ebmpapst", "york", "drc",
        # Product categories
        "kältetechnik", "cooling", "soğutma", "kühlsystem", "kühlung", 
        "refrigeration", "soğutucu", "kühlschrank", "fridge", "freezer"
    ]
    
    # Check if the message contains any product keywords
    is_product_query = any(keyword in text_lower for keyword in product_keywords)
    
    # Special handling for queries that might be product names but don't contain keywords
    if not is_product_query:
        # Check for pure numeric queries (like "9238")
        if text_lower.strip().isdigit() and len(text_lower.strip()) >= 4:
            is_product_query = True
            
        # Check for alphanumeric combinations that might be product codes
        words = text_lower.split()
        for word in words:
            # Look for patterns like "DCB31", "EMY80", "NEK6160Z" - alphanumeric combinations
            if (len(word) >= 3 and 
                any(c.isdigit() for c in word) and 
                any(c.isalpha() for c in word)):
                is_product_query = True
                break
                
        # Check for standalone numbers that might be product codes
        if not is_product_query and len(words) <= 3:
            # Short queries with numbers might be product codes
            if any(any(c.isdigit() for c in word) for word in words):
                is_product_query = True
    
    if is_product_query:
        # First try direct product lookup for the query
        direct_product = find_exact_product(text)
        if direct_product:
            # Store in user context if user_id is provided
            if user_id and user_id in USER_CONTEXT:
                USER_CONTEXT[user_id]['last_query_type'] = 'exact_product'
                USER_CONTEXT[user_id]['last_products'] = [direct_product]
                USER_CONTEXT[user_id]['product_page'] = 0
            
            status_text = "auf Lager" if direct_product.get('status') == "instock" else "nicht auf Lager"
            status_emoji = "✅" if direct_product.get('status') == "instock" else "⚠️"
            
            # Detect language and format response
            if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                # Turkish
                response = f"📦 Ürün Bilgileri:\n\n"
                response += f"🔍 {direct_product['product_name']}\n"
                response += f"💰 Fiyat: {direct_product['price_eur']} EUR\n"
                response += f"{status_emoji} Durum: {status_text}\n"
                if direct_product.get('status') != "instock":
                    response += f"📧 Özel sipariş için lütfen bizimle iletişime geçin: info@durmusbaba.com\n"
                response += f"🚚 Teslimat süresi: 3-5 iş günü\n"
                response += f"🔗 Ürün linki: {direct_product.get('url', '')}"
                return response
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                response = f"📦 Product Information:\n\n"
                response += f"🔍 {direct_product['product_name']}\n"
                response += f"💰 Price: {direct_product['price_eur']} EUR\n"
                response += f"{status_emoji} Status: {status_text}\n"
                if direct_product.get('status') != "instock":
                    response += f"📧 For special orders, please contact us at: info@durmusbaba.com\n"
                response += f"🚚 Delivery time: 3-5 business days\n"
                response += f"🔗 Product link: {direct_product.get('url', '')}"
                return response
            else:
                # Default to German
                response = f"📦 Produktinformation:\n\n"
                response += f"🔍 {direct_product['product_name']}\n"
                response += f"💰 Preis: {direct_product['price_eur']} EUR\n"
                response += f"{status_emoji} Status: {status_text}\n"
                if direct_product.get('status') != "instock":
                    response += f"📧 Für Sonderbestellungen kontaktieren Sie uns bitte unter: info@durmusbaba.com\n"
                response += f"🚚 Lieferzeit: 3-5 Werktage\n"
                response += f"🔗 Produktlink: {direct_product.get('url', '')}"
                return response
        
        # Check for category filtering requests
        category_request = check_category_request(text_lower, user_id)
        if category_request:
            return category_request
        
        # Check for price range filtering
        price_range_request = check_price_range_request(text_lower, user_id)
        if price_range_request:
            return price_range_request
        
        # If we get here, try to find similar products based on partial matches
        matching_products = find_similar_products(text)
        
        # If we found matching products, return the information
        if matching_products:
            # Store in user context if user_id is provided
            if user_id and user_id in USER_CONTEXT:
                USER_CONTEXT[user_id]['last_query_type'] = 'similar_products'
                USER_CONTEXT[user_id]['last_products'] = matching_products
                USER_CONTEXT[user_id]['product_page'] = 0
            
            # Detect language
            is_turkish = any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar', 'ürün', 'kompresör'])
            is_english = any(word in text.lower() for word in ['price', 'cost', 'how much', 'product', 'compressor'])
            
            if len(matching_products) > 5:
                # If too many matches, return a summary
                if is_turkish:
                    result = f"🔍 {len(matching_products)} adet eşleşen ürün buldum. İşte ilk 5 tanesi:\n\n"
                elif is_english:
                    result = f"🔍 I found {len(matching_products)} matching products. Here are the first 5:\n\n"
                else:
                    result = f"🔍 Ich habe {len(matching_products)} passende Produkte gefunden. Hier sind die ersten 5:\n\n"
            else:
                # Return detailed information for up to 5 products
                if is_turkish:
                    result = f"🔍 {len(matching_products)} adet eşleşen ürün buldum:\n\n"
                elif is_english:
                    result = f"🔍 I found {len(matching_products)} matching products:\n\n"
                else:
                    result = f"🔍 Ich habe {len(matching_products)} passende Produkte gefunden:\n\n"
            
            # Add product information
            for i, product in enumerate(matching_products[:5]):
                status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                if is_turkish:
                    status_text = "stokta" if product.get('status') == "instock" else "stokta değil"
                elif is_english:
                    status_text = "in stock" if product.get('status') == "instock" else "out of stock"
                
                status_emoji = "✅" if product.get('status') == "instock" else "⚠️"
                result += f"{i+1}. 📦 {product['product_name']}\n"
                result += f"   💰 {product['price_eur']} EUR | {status_emoji} {status_text}\n"
                result += f"   🔗 {product.get('url', '')}\n\n"
            
            # Add message about more products if available
            if len(matching_products) > 5:
                if is_turkish:
                    result += f"... ve {len(matching_products) - 5} ürün daha. Daha fazla görmek için 'daha fazla göster' yazabilirsiniz.\n\n"
                elif is_english:
                    result += f"... and {len(matching_products) - 5} more products. You can type 'show more' to see additional products.\n\n"
                else:
                    result += f"... und {len(matching_products) - 5} weitere Produkte. Sie können 'mehr zeigen' eingeben, um weitere Produkte zu sehen.\n\n"
            
            # Add contact information for further assistance
            if is_turkish:
                result += "📞 Daha fazla yardıma ihtiyacınız varsa, lütfen bizimle iletişime geçin: info@durmusbaba.com"
            elif is_english:
                result += "📞 If you need further assistance, please contact us at: info@durmusbaba.com"
            else:
                result += "📞 Für weitere Informationen kontaktieren Sie uns bitte unter: info@durmusbaba.com"
                
            return result
        else:
            # No matching products found
            if is_contact_request(text):
                return generate_contact_info_response(text)
            
            # Detect language for no results message
            if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar', 'ürün', 'kompresör']):
                # Turkish
                return "❓ Üzgünüm, aradığınız ürünü bulamadım. Lütfen ürün adını kontrol edin veya başka bir ürün sorun.\n\n📧 Yardıma ihtiyacınız varsa, lütfen bizimle iletişime geçin: info@durmusbaba.com veya +4915228474571"
            elif any(word in text.lower() for word in ['price', 'cost', 'how much', 'product', 'compressor']):
                # English
                return "❓ I'm sorry, I couldn't find the product you're looking for. Please check the product name or ask about a different product.\n\n📧 If you need assistance, please contact us at: info@durmusbaba.com or +4915228474571"
            else:
                # Default to German
                return "❓ Es tut mir leid, ich konnte das gesuchte Produkt nicht finden. Bitte überprüfen Sie den Produktnamen oder fragen Sie nach einem anderen Produkt.\n\n📧 Wenn Sie Hilfe benötigen, kontaktieren Sie uns bitte unter: info@durmusbaba.com oder +4915228474571"
    
    return None

def find_similar_products(text):
    """Find products that are similar to the query text."""
    text_lower = text.lower()
    text_normalized = text_lower.replace(" ", "").replace("-", "")
    
    matching_products = []
    
    # Special handling for numeric-only queries (like "9238")
    if text.strip().isdigit() and len(text.strip()) >= 4:
        numeric_query = text.strip()
        print(f"Numeric search in similar products for: {numeric_query}")
        
        # First pass: look for exact numeric matches
        for product in PRODUCT_DB:
            product_name = product['product_name']
            # Check if this exact number appears in the product name
            if numeric_query in product_name:
                matching_products.append(product)
        
        # If we found matches, return them
        if matching_products:
            print(f"Found {len(matching_products)} products with exact numeric match for {numeric_query}")
            return matching_products
    
    # 1. Extract potential model numbers or significant terms
    potential_terms = []
    
    # Add all words from the query that might be significant
    words = text_lower.split()
    for word in words:
        # Skip very short words and common words
        if len(word) <= 2:
            continue
        if word in ['der', 'die', 'das', 'für', 'von', 'mit', 'und', 'oder', 'the', 'for', 'with', 'and', 'or']:
            continue
        potential_terms.append(word)
    
    # Add potential model numbers using regex patterns
    model_patterns = [
        r'([A-Za-z]{2,4})\s*[-]?\s*(\d+)\s*([A-Za-z0-9]{0,6})',  # Matches "EMY 80 CLP", "DCB31"
        r'([A-Za-z]{2,4})\s*[-]?\s*(\d+[.]\d+)\s*([A-Za-z0-9]{0,6})',  # Matches "FF 8.5 HBK"
    ]
    
    for pattern in model_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            model_parts = [part for part in match if part]
            model = ''.join(model_parts).strip()
            if model and model not in potential_terms:
                potential_terms.append(model)
    
    print(f"Potential terms for similarity search: {potential_terms}")
    
    # 2. Search for products matching these terms
    for product in PRODUCT_DB:
        product_name = product['product_name'].lower()
        product_normalized = product_name.replace(" ", "").replace("-", "")
        
        # Check if any significant term is in the product name
        for term in potential_terms:
            term_normalized = term.replace(" ", "").replace("-", "")
            
            if term_normalized in product_normalized:
                if product not in matching_products:
                    matching_products.append(product)
                    break
    
    # 3. If we have too many matches, try to refine based on brand or category
    if len(matching_products) > 10:
        # Check if we can identify a brand in the query
        brands = ['embraco', 'bitzer', 'danfoss', 'secop', 'copeland', 'tecumseh', 'dcb', 'ebm', 'ebmpapst', 'york', 'drc']
        identified_brand = None
        
        for brand in brands:
            if brand in text_lower:
                identified_brand = brand
                break
        
        # If we identified a brand, filter the results
        if identified_brand:
            filtered_products = []
            for product in matching_products:
                if identified_brand in product['product_name'].lower():
                    filtered_products.append(product)
            
            # If we have filtered products, use them instead
            if filtered_products:
                matching_products = filtered_products
    
    return matching_products

def check_category_request(text, user_id=None):
    """Check if the user is asking for products in a specific category."""
    # Define categories and their associated keywords
    categories = {
        "embraco": ["embraco", "embrac"],
        "bitzer": ["bitzer", "bitze"],
        "danfoss": ["danfoss", "danfo"],
        "secop": ["secop", "seco"],
        "copeland": ["copeland", "copel"],
        "tecumseh": ["tecumseh", "tecum"],
        "dcb": ["dcb"],
        "ebm": ["ebm", "ebmpapst", "papst"],
        "drc": ["drc"],
        "york": ["york"]
    }
    
    # Check if the text contains any category keywords
    for category, keywords in categories.items():
        if any(keyword in text for keyword in keywords):
            # Find products in this category
            matching_products = []
            for product in PRODUCT_DB:
                product_name = product.get('product_name', '').lower()
                if any(keyword in product_name for keyword in keywords):
                    matching_products.append(product)
            
            if matching_products:
                # Store search results in user context if user_id is provided
                if user_id and user_id in USER_CONTEXT:
                    USER_CONTEXT[user_id]['last_query_type'] = 'category'
                    USER_CONTEXT[user_id]['last_category'] = category
                    USER_CONTEXT[user_id]['last_products'] = matching_products
                    USER_CONTEXT[user_id]['product_page'] = 0
                
                # Detect language
                is_turkish = any(word in text for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar', 'ürün', 'kompresör'])
                is_english = any(word in text for word in ['price', 'cost', 'how much', 'product', 'compressor'])
                
                # Format the response based on language
                if is_turkish:
                    result = f"🏭 {category.upper()} kategorisinde {len(matching_products)} ürün buldum:\n\n"
                elif is_english:
                    result = f"🏭 I found {len(matching_products)} products in the {category.upper()} category:\n\n"
                else:
                    result = f"🏭 Ich habe {len(matching_products)} Produkte in der Kategorie {category.upper()} gefunden:\n\n"
                
                # Show up to 5 products
                for i, product in enumerate(matching_products[:5]):
                    status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                    if is_turkish:
                        status_text = "stokta" if product.get('status') == "instock" else "stokta değil"
                    elif is_english:
                        status_text = "in stock" if product.get('status') == "instock" else "out of stock"
                    
                    status_emoji = "✅" if product.get('status') == "instock" else "⚠️"
                    result += f"{i+1}. 📦 {product['product_name']}\n"
                    result += f"   💰 {product['price_eur']} EUR | {status_emoji} {status_text}\n"
                    result += f"   🔗 {product.get('url', '')}\n\n"
                
                # Add more info message if there are more than 5 products
                if len(matching_products) > 5:
                    if is_turkish:
                        result += f"... ve {len(matching_products) - 5} ürün daha. Daha fazla görmek için 'daha fazla göster' yazabilirsiniz.\n\n"
                    elif is_english:
                        result += f"... and {len(matching_products) - 5} more products. You can type 'show more' to see additional products.\n\n"
                    else:
                        result += f"... und {len(matching_products) - 5} weitere Produkte. Sie können 'mehr zeigen' eingeben, um weitere Produkte zu sehen.\n\n"
                
                # Add contact information
                if is_turkish:
                    result += "📞 Daha fazla bilgi için bizimle iletişime geçin: info@durmusbaba.com"
                elif is_english:
                    result += "📞 For more information, please contact us at: info@durmusbaba.com"
                else:
                    result += "📞 Für weitere Informationen kontaktieren Sie uns bitte unter: info@durmusbaba.com"
                
                return result
            else:
                # No products found in this category
                if any(word in text for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                    # Turkish
                    return f"❓ Üzgünüm, {category} kategorisinde ürün bulamadım. Lütfen başka bir kategori deneyin veya bizimle iletişime geçin: info@durmusbaba.com"
                elif any(word in text for word in ['price', 'cost', 'how much']):
                    # English
                    return f"❓ I'm sorry, I couldn't find any products in the {category} category. Please try another category or contact us at: info@durmusbaba.com"
                else:
                    # Default to German
                    return f"❓ Es tut mir leid, ich konnte keine Produkte in der Kategorie {category} finden. Bitte versuchen Sie eine andere Kategorie oder kontaktieren Sie uns unter: info@durmusbaba.com"
    
    return None

def check_price_range_request(text, user_id=None):
    """Check if the user is asking for products in a specific price range."""
    # Try to extract price range from the text
    price_range = extract_price_range(text)
    if price_range:
        min_price, max_price = price_range
        
        # Find products in this price range
        matching_products = []
        for product in PRODUCT_DB:
            try:
                price = float(product.get('price_eur', '0').replace('€', '').replace(',', '.').strip())
                if min_price <= price <= max_price:
                    matching_products.append(product)
            except (ValueError, TypeError):
                continue
        
        if matching_products:
            # Store search results in user context if user_id is provided
            if user_id and user_id in USER_CONTEXT:
                USER_CONTEXT[user_id]['last_query_type'] = 'price_range'
                USER_CONTEXT[user_id]['last_price_range'] = (min_price, max_price)
                USER_CONTEXT[user_id]['last_products'] = matching_products
                USER_CONTEXT[user_id]['product_page'] = 0
            
            # Detect language
            is_turkish = any(word in text for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar', 'ürün', 'kompresör'])
            is_english = any(word in text for word in ['price', 'cost', 'how much', 'product', 'compressor'])
            
            # Format the response based on language
            if is_turkish:
                result = f"💰 {min_price}-{max_price} EUR fiyat aralığında {len(matching_products)} ürün buldum:\n\n"
            elif is_english:
                result = f"💰 I found {len(matching_products)} products in the price range of {min_price}-{max_price} EUR:\n\n"
            else:
                result = f"💰 Ich habe {len(matching_products)} Produkte im Preisbereich von {min_price}-{max_price} EUR gefunden:\n\n"
            
            # Sort products by price
            matching_products.sort(key=lambda x: float(x.get('price_eur', '0').replace('€', '').replace(',', '.').strip()))
            
            # Show up to 5 products
            for i, product in enumerate(matching_products[:5]):
                status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                if is_turkish:
                    status_text = "stokta" if product.get('status') == "instock" else "stokta değil"
                elif is_english:
                    status_text = "in stock" if product.get('status') == "instock" else "out of stock"
                
                status_emoji = "✅" if product.get('status') == "instock" else "⚠️"
                result += f"{i+1}. 📦 {product['product_name']}\n"
                result += f"   💰 {product['price_eur']} EUR | {status_emoji} {status_text}\n"
                result += f"   🔗 {product.get('url', '')}\n\n"
            
            # Add more info message if there are more than 5 products
            if len(matching_products) > 5:
                if is_turkish:
                    result += f"... ve {len(matching_products) - 5} ürün daha. Daha fazla görmek için 'daha fazla göster' yazabilirsiniz.\n\n"
                elif is_english:
                    result += f"... and {len(matching_products) - 5} more products. You can type 'show more' to see additional products.\n\n"
                else:
                    result += f"... und {len(matching_products) - 5} weitere Produkte. Sie können 'mehr zeigen' eingeben, um weitere Produkte zu sehen.\n\n"
            
            # Add contact information
            if is_turkish:
                result += "📞 Daha fazla bilgi için bizimle iletişime geçin: info@durmusbaba.com"
            elif is_english:
                result += "📞 For more information, please contact us at: info@durmusbaba.com"
            else:
                result += "📞 Für weitere Informationen kontaktieren Sie uns bitte unter: info@durmusbaba.com"
            
            return result
        else:
            # No products found in this price range
            if any(word in text for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                # Turkish
                return f"❓ Üzgünüm, {min_price}-{max_price} EUR fiyat aralığında ürün bulamadım. Lütfen farklı bir fiyat aralığı deneyin veya bizimle iletişime geçin: info@durmusbaba.com"
            elif any(word in text for word in ['price', 'cost', 'how much']):
                # English
                return f"❓ I'm sorry, I couldn't find any products in the price range of {min_price}-{max_price} EUR. Please try a different price range or contact us at: info@durmusbaba.com"
            else:
                # Default to German
                return f"❓ Es tut mir leid, ich konnte keine Produkte im Preisbereich von {min_price}-{max_price} EUR finden. Bitte versuchen Sie einen anderen Preisbereich oder kontaktieren Sie uns unter: info@durmusbaba.com"
    
    return None

def extract_price_range(text):
    """Extract price range from text."""
    import re
    
    # Define patterns for price range queries in different languages
    patterns = [
        # German patterns
        r'unter (\d+)[\s]?(?:€|euro)',  # unter 500€
        r'bis zu (\d+)[\s]?(?:€|euro)',  # bis zu 500€
        r'weniger als (\d+)[\s]?(?:€|euro)',  # weniger als 500€
        r'über (\d+)[\s]?(?:€|euro)',  # über 500€
        r'mehr als (\d+)[\s]?(?:€|euro)',  # mehr als 500€
        r'zwischen (\d+) und (\d+)[\s]?(?:€|euro)',  # zwischen 500 und 1000€
        r'von (\d+) bis (\d+)[\s]?(?:€|euro)',  # von 500 bis 1000€
        
        # English patterns
        r'under (\d+)[\s]?(?:€|euro)',  # under 500€
        r'up to (\d+)[\s]?(?:€|euro)',  # up to 500€
        r'less than (\d+)[\s]?(?:€|euro)',  # less than 500€
        r'over (\d+)[\s]?(?:€|euro)',  # over 500€
        r'more than (\d+)[\s]?(?:€|euro)',  # more than 500€
        r'between (\d+) and (\d+)[\s]?(?:€|euro)',  # between 500 and 1000€
        r'from (\d+) to (\d+)[\s]?(?:€|euro)',  # from 500 to 1000€
        
        # Turkish patterns
        r'(\d+)[\s]?(?:€|euro) altında',  # 500€ altında
        r'(\d+)[\s]?(?:€|euro) kadar',  # 500€ kadar
        r'(\d+)[\s]?(?:€|euro)\'dan az',  # 500€'dan az
        r'(\d+)[\s]?(?:€|euro) üzerinde',  # 500€ üzerinde
        r'(\d+)[\s]?(?:€|euro)\'dan fazla',  # 500€'dan fazla
        r'(\d+) ve (\d+)[\s]?(?:€|euro) arasında',  # 500 ve 1000€ arasında
    ]
    
    min_price = None
    max_price = None
    
    # Check each pattern
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            if len(match.groups()) == 1:
                # Single price value patterns
                price = int(match.group(1))
                
                # Determine if it's a min or max constraint
                if any(keyword in text for keyword in ['unter', 'bis zu', 'weniger', 'under', 'up to', 'less than', 'altında', 'kadar', 'az']):
                    max_price = price
                    min_price = 0  # Set a default minimum
                elif any(keyword in text for keyword in ['über', 'mehr', 'over', 'more than', 'üzerinde', 'fazla']):
                    min_price = price
                    max_price = 10000  # Set a default maximum
            else:
                # Range patterns with two values
                min_price = int(match.group(1))
                max_price = int(match.group(2))
            
            break
    
    # If we found a price range, return it
    if min_price is not None and max_price is not None:
        return min_price, max_price
    
    return None

def is_more_products_request(text):
    """Check if the user is asking to see more products from a previous search."""
    text_lower = text.lower()
    more_patterns = [
        'mehr', 'weitere', 'zeig mehr', 'zeige mehr', 'mehr produkte', 'weitere produkte',  # German
        'more', 'show more', 'list more', 'next', 'continue', 'more products',  # English
        'daha', 'daha fazla', 'devam', 'diğer', 'başka', 'sonraki'  # Turkish
    ]
    
    return any(pattern in text_lower for pattern in more_patterns)

def handle_more_products_request(user_id, text):
    """Handle requests to show more products from a previous search."""
    if user_id not in USER_CONTEXT:
        # No context available
        if any(word in text.lower() for word in ['daha', 'fazla', 'devam']):
            # Turkish
            return "❓ Üzgünüm, şu anda gösterilecek daha fazla ürün yok. Lütfen yeni bir arama yapın."
        elif any(word in text.lower() for word in ['more', 'next', 'continue']):
            # English
            return "❓ I'm sorry, there are no more products to show at the moment. Please try a new search."
        else:
            # Default to German
            return "❓ Es tut mir leid, es gibt derzeit keine weiteren Produkte zum Anzeigen. Bitte versuchen Sie eine neue Suche."
    
    context = USER_CONTEXT[user_id]
    
    # Check if we have products from a previous search
    if context['last_query_type'] in ['category', 'price_range', 'similar_products'] and context['last_products']:
        # Update the page number
        context['product_page'] += 1
        start_idx = context['product_page'] * 5
        
        # Check if we have more products to show
        if start_idx >= len(context['last_products']):
            if any(word in text.lower() for word in ['daha', 'fazla', 'devam']):
                # Turkish
                return "❓ Üzgünüm, gösterilecek başka ürün kalmadı. Lütfen yeni bir arama yapın."
            elif any(word in text.lower() for word in ['more', 'next', 'continue']):
                # English
                return "❓ I'm sorry, there are no more products to show. Please try a new search."
            else:
                # Default to German
                return "❓ Es tut mir leid, es gibt keine weiteren Produkte zum Anzeigen. Bitte versuchen Sie eine neue Suche."
        
        # Get the next batch of products
        products_to_show = context['last_products'][start_idx:start_idx + 5]
        
        # Detect language from the request
        is_turkish = any(word in text.lower() for word in ['daha', 'fazla', 'devam', 'diğer', 'başka'])
        is_english = any(word in text.lower() for word in ['more', 'show', 'list', 'next', 'continue'])
        
        # Format the response based on language
        if is_turkish:
            result = f"🔍 İşte {len(context['last_products'])} üründen {start_idx + 1}-{min(start_idx + 5, len(context['last_products']))} arası ürünler:\n\n"
        elif is_english:
            result = f"🔍 Here are products {start_idx + 1}-{min(start_idx + 5, len(context['last_products']))} of {len(context['last_products'])}:\n\n"
        else:
            result = f"🔍 Hier sind Produkte {start_idx + 1}-{min(start_idx + 5, len(context['last_products']))} von {len(context['last_products'])}:\n\n"
        
        # Add product information
        for i, product in enumerate(products_to_show):
            status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
            if is_turkish:
                status_text = "stokta" if product.get('status') == "instock" else "stokta değil"
            elif is_english:
                status_text = "in stock" if product.get('status') == "instock" else "out of stock"
            
            status_emoji = "✅" if product.get('status') == "instock" else "⚠️"
            result += f"{start_idx + i + 1}. 📦 {product['product_name']}\n"
            result += f"   💰 {product['price_eur']} EUR | {status_emoji} {status_text}\n"
            result += f"   🔗 {product.get('url', '')}\n\n"
        
        # Add message about more products if available
        remaining = len(context['last_products']) - (start_idx + len(products_to_show))
        if remaining > 0:
            if is_turkish:
                result += f"... ve {remaining} ürün daha. Daha fazla görmek için 'daha fazla göster' yazabilirsiniz.\n\n"
            elif is_english:
                result += f"... and {remaining} more products. You can type 'show more' to see additional products.\n\n"
            else:
                result += f"... und {remaining} weitere Produkte. Sie können 'mehr zeigen' eingeben, um weitere Produkte zu sehen.\n\n"
        
        # Add contact information
        if is_turkish:
            result += "📞 Daha fazla bilgi için bizimle iletişime geçin: info@durmusbaba.com"
        elif is_english:
            result += "📞 For more information, please contact us at: info@durmusbaba.com"
        else:
            result += "📞 Für weitere Informationen kontaktieren Sie uns bitte unter: info@durmusbaba.com"
        
        return result
    else:
        # No relevant products in context
        if any(word in text.lower() for word in ['daha', 'fazla', 'devam']):
            # Turkish
            return "❓ Üzgünüm, önceki bir arama bulunamadı. Lütfen bir ürün veya kategori hakkında soru sorun."
        elif any(word in text.lower() for word in ['more', 'next', 'continue']):
            # English
            return "❓ I'm sorry, I couldn't find a previous search. Please ask about a product or category."
        else:
            # Default to German
            return "❓ Es tut mir leid, ich konnte keine vorherige Suche finden. Bitte fragen Sie nach einem Produkt oder einer Kategorie."

def is_order_query(text):
    """Check if the message is asking about an order."""
    order_keywords = {
        'german': ['bestellung', 'auftrag', 'bestellnummer', 'bestellt', 'lieferung', 'versand', 'sendung', 'paket', 'order'],
        'english': ['order', 'purchase', 'delivery', 'shipping', 'package', 'tracking', 'bought', 'ordered'],
        'turkish': ['sipariş', 'teslimat', 'kargo', 'paket', 'takip', 'satın aldım', 'sipariş ettim', 'sipariş durumu']
    }
    
    text_lower = text.lower()
    
    # Check for order number patterns
    order_number_pattern = r'\b\d{4,}\b'  # 4 or more digits
    if re.search(order_number_pattern, text_lower):
        # If we have digits that could be an order number, check for order keywords
        for language, keywords in order_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return True
    
    # Check for explicit order status requests
    for language, keywords in order_keywords.items():
        # If two or more order keywords are present, it's likely an order query
        keyword_count = sum(1 for keyword in keywords if keyword in text_lower)
        if keyword_count >= 2:
            return True
    
    return False

def extract_order_number(text):
    """Extract potential order numbers from text."""
    # Look for patterns like "#1234" or "order 1234" or just "1234" if it's 4+ digits
    patterns = [
        r'#(\d{4,})',  # #1234
        r'order\s+(\d{4,})',  # order 1234
        r'bestellung\s+(\d{4,})',  # bestellung 1234
        r'auftrag\s+(\d{4,})',  # auftrag 1234
        r'sipariş\s+(\d{4,})',  # sipariş 1234
        r'\b(\d{4,})\b'  # any 4+ digit number
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1)
    
    return None

def get_order_status(order_id=None, phone=None):
    """Get order status from WooCommerce."""
    if not USE_WOOCOMMERCE or not woocommerce.is_connected:
        return "❌ Sorry, order lookup is currently unavailable."
    
    try:
        if order_id:
            # Try to get order by ID
            order = woocommerce.get_order(order_id)
            if order:
                return format_order_info(order)
        
        if phone:
            # Try to find orders by phone number
            orders = woocommerce.get_customer_orders(phone=phone)
            if orders:
                # Return the most recent order
                return format_order_info(orders[0], show_all_link=True, total_orders=len(orders))
        
        return "❌ No order found with the provided information."
    except Exception as e:
        print(f"Error getting order status: {e}")
        traceback.print_exc()
        return "❌ Sorry, there was an error looking up your order."

def format_order_info(order, show_all_link=False, total_orders=1):
    """Format order information for display."""
    try:
        order_id = order['id']
        order_status = order['status']
        order_date = order['date_created'].split('T')[0]  # Just get the date part
        order_total = f"{order['total']} {order['currency']}"
        
        # Map WooCommerce status to user-friendly status
        status_map = {
            'pending': '⏳ Pending',
            'processing': '🔄 Processing',
            'on-hold': '⏸️ On Hold',
            'completed': '✅ Completed',
            'cancelled': '❌ Cancelled',
            'refunded': '💰 Refunded',
            'failed': '❌ Failed',
            'trash': '🗑️ Deleted'
        }
        
        friendly_status = status_map.get(order_status, f'📋 {order_status.capitalize()}')
        
        # Get shipping info if available
        shipping_info = ""
        if 'shipping' in order and order['shipping']:
            shipping = order['shipping']
            shipping_info = f"\n📦 Shipping Address: {shipping.get('first_name', '')} {shipping.get('last_name', '')}, {shipping.get('address_1', '')}, {shipping.get('city', '')}, {shipping.get('country', '')}"
        
        # Get line items
        items_info = "\n📝 Items:"
        for item in order['line_items']:
            items_info += f"\n  - {item['name']} x{item['quantity']} ({item['total']} {order['currency']})"
        
        # Additional info for multiple orders
        additional_info = ""
        if show_all_link and total_orders > 1:
            additional_info = f"\n\n📚 You have {total_orders} orders in total. To check other orders, please provide the specific order number."
        
        response = (
            f"🛒 Order #{order_id}\n"
            f"📅 Date: {order_date}\n"
            f"🔹 Status: {friendly_status}\n"
            f"💶 Total: {order_total}"
            f"{shipping_info}"
            f"{items_info}"
            f"{additional_info}"
        )
        
        return response
    except Exception as e:
        print(f"Error formatting order info: {e}")
        traceback.print_exc()
        return "❌ Sorry, there was an error formatting your order information."

def handle_order_query(text, user_id):
    """Handle order-related queries."""
    # Update user context
    if user_id not in USER_CONTEXT:
        USER_CONTEXT[user_id] = {}
    
    USER_CONTEXT[user_id]['last_query_type'] = 'order'
    
    # Extract order number if present
    order_id = extract_order_number(text)
    
    if order_id:
        # If we have an order ID, look it up directly
        return get_order_status(order_id=order_id)
    else:
        # If no order ID, try to look up by phone number
        # Extract the phone number from the WhatsApp ID (format: 491234567890:12)
        phone = user_id.split(':')[0] if ':' in user_id else user_id
        return get_order_status(phone=phone)

@app.route("/", methods=["GET"])
def home():
    return "WhatsApp Gemini Bot for durmusbaba.de is running. Use /webhook endpoint for WhatsApp API."

@app.route("/webhook", methods=["GET", "POST"])
def webhook():
    print(f"Received {request.method} request to /webhook")
    
    if request.method == "GET":
        print("Processing GET request (webhook verification)")
        verify_token = request.args.get("hub.verify_token")
        print(f"Received verify_token: {verify_token}, expected: {VERIFY_TOKEN}")
        if verify_token == VERIFY_TOKEN:
            challenge = request.args.get("hub.challenge")
            print(f"Verification successful, returning challenge: {challenge}")
            return challenge
        print("Invalid verification token")
        return "Invalid token", 403

    print("Processing POST request (incoming message)")
    
    # Tüm request verilerini detaylı olarak loglayalım
    print("Request Headers:")
    print(dict(request.headers))
    
    print("Request Raw Data:")
    print(request.get_data().decode('utf-8'))
    
    data = request.get_json()
    print("GELEN MESAJ (JSON):", json.dumps(data, indent=2))

    try:
        # Check if this is a WhatsApp message
        if "entry" in data and data["entry"] and "changes" in data["entry"][0] and data["entry"][0]["changes"]:
            value = data["entry"][0]["changes"][0]["value"]
            print("Value object:", json.dumps(value, indent=2))
            
            # Log metadata information if available
            if "metadata" in value:
                print("Metadata:", json.dumps(value["metadata"], indent=2))
                print(f"Phone number ID from metadata: {value['metadata'].get('phone_number_id')}")
                print(f"WhatsApp Business Account ID: {value['metadata'].get('phone_number_id')}")
                print(f"Display phone number: {value['metadata'].get('display_phone_number')}")
            else:
                print("WARNING: No metadata found in the incoming message!")
                print("Full value structure for debugging:")
                print(json.dumps(value, indent=2))
            
            # Check if there are messages
            if "messages" in value and value["messages"]:
                msg = value["messages"][0]
                print("Message object:", json.dumps(msg, indent=2))
                
                sender = msg["from"]
                print(f"Message from sender: {sender}")
                
                # Check if this is a text message
                if "text" in msg and "body" in msg["text"]:
                    message_text = msg["text"]["body"]
                    print(f"Message text: {message_text}")
                    
                    # Get response from Gemini AI
                    response_text = get_gemini_response(sender, message_text)
                    print(f"Response from Gemini: {response_text}")
                    
                    # Log user context for debugging
                    if sender in USER_CONTEXT:
                        print(f"User context: {json.dumps({k: v for k, v in USER_CONTEXT[sender].items() if k != 'last_products'})}")
                        print(f"Products in context: {len(USER_CONTEXT[sender].get('last_products', []))}")
                    
                    # Extract the phone number ID from the incoming message
                    recipient_phone_id = value.get("metadata", {}).get("phone_number_id", PHONE_NUMBER_ID)
                    print(f"Using phone_number_id: {recipient_phone_id}")
                    
                    # Debug info about phone IDs
                    print(f"Default PHONE_NUMBER_ID from env: {PHONE_NUMBER_ID}")
                    print(f"Extracted phone_number_id: {recipient_phone_id}")
                    
                    # Send response back to WhatsApp using the correct phone number ID
                    url = f"https://graph.facebook.com/v18.0/{recipient_phone_id}/messages"
                    headers = {
                        "Authorization": f"Bearer {ACCESS_TOKEN}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": sender,
                        "type": "text",
                        "text": {"body": response_text}
                    }
                    print(f"Sending response to WhatsApp API: {json.dumps(payload)}")
                    print(f"Request URL: {url}")
                    print(f"Request Headers: {headers}")
                    response = requests.post(url, headers=headers, json=payload)
                    print(f"WhatsApp API response: {response.status_code} - {response.text}")
                else:
                    print("Received message is not a text message or text structure is different than expected")
                    print("Full message structure:", json.dumps(msg, indent=2))
            else:
                print("No messages in the request or messages structure is different than expected")
                print("Full value structure:", json.dumps(value, indent=2))
        else:
            print("Not a valid WhatsApp message format or structure is different than expected")
            print("Full request data:", json.dumps(data, indent=2))

    except Exception as e:
        print(f"HATA: {e}")
        traceback.print_exc()

    return "ok", 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    print(f"Starting server on port {port}")
    app.run(host="0.0.0.0", port=port)
