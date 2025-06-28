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
from conversation_context import conversation_context
import time
import threading
from order_notification import handle_order_webhook, notify_new_order, check_for_new_orders
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configuration from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
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

# Conversation context tracking - DEPRECATED, using conversation_context module instead
# USER_CONTEXT = {}  # Store context for different users: last query type, last products found, etc.

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
        # Update conversation context with the new message
        conversation_context.update_context(user_id, text)
        
        # Get context summary and referenced entities
        context_summary = conversation_context.get_conversation_summary(user_id)
        referenced_entities = conversation_context.get_referenced_entities(user_id, text)
        
        # Check if this is a chat history request
        if is_history_request(text):
            print("Chat history request detected")
            return handle_history_request(user_id, text)
        
        # Handle references to previous entities in the conversation
        if referenced_entities:
            if 'product' in referenced_entities:
                product_name = referenced_entities['product']['name']
                print(f"Referenced product detected: {product_name}")
                # Find the product in the database
                exact_product = find_exact_product(product_name)
                if exact_product:
                    # Return product information
                    return format_product_response(exact_product, user_id)
            
            if 'category' in referenced_entities:
                category = referenced_entities['category']
                print(f"Referenced category detected: {category}")
                # Return products from this category
                return check_category_request(category, user_id)
            
            if 'order' in referenced_entities:
                order_number = referenced_entities['order']
                print(f"Referenced order detected: {order_number}")
                # Return order information
                return handle_order_query(f"order {order_number}", user_id)
        
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
            context = conversation_context.get_context(user_id)
            context['current_topic'] = 'order_status'
            return handle_order_query(text, user_id)
        
        # Check if this is a sales inquiry (product recommendations, offers, etc.)
        if is_sales_inquiry(text):
            context = conversation_context.get_context(user_id)
            context['current_topic'] = 'sales_inquiry'
            return handle_sales_inquiry(text, user_id)
        
        # First check if the message is just a product name (direct product query)
        exact_product = find_exact_product(text)
        if exact_product:
            # If it's an exact product name, return the price directly without calling Gemini
            return format_product_response(exact_product, user_id)
        
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
            context = conversation_context.get_context(user_id)
            context['current_topic'] = 'contact'
            return generate_contact_info_response(text)
        
        # Check if this is a delivery time request
        if is_delivery_request(text):
            context = conversation_context.get_context(user_id)
            context['current_topic'] = 'delivery'
            return generate_delivery_info_response(text)
        
        # For non-product queries, get response from Gemini
        # Add conversation context to help Gemini understand the context
        context_info = ""
        if context_summary['current_topic']:
            context_info += f"Current topic: {context_summary['current_topic']}\n"
        if context_summary['mentioned_products']:
            context_info += f"Recently mentioned products: {', '.join(context_summary['mentioned_products'])}\n"
        if context_summary['mentioned_categories']:
            context_info += f"Recently mentioned categories: {', '.join(context_summary['mentioned_categories'])}\n"
        
        # Check if this message seems to be referring to previous conversation
        is_context_reference = conversation_context.detect_context_reference(user_id, text)
        
        # Get recent messages to provide context - use more messages for better context
        # If the message seems to be referring to previous conversation, include more history
        message_count = 15 if is_context_reference else 10
        recent_messages = conversation_context.get_recent_messages(user_id, count=message_count)
        
        # For very long conversations, include a summary instead of all messages
        conversation_length = len(conversation_context.get_full_conversation_history(user_id))
        if conversation_length > 20:  # If we have more than 20 messages in total
            conversation_summary = conversation_context.summarize_conversation(user_id)
            if conversation_summary:
                context_info += conversation_summary + "\n"
        
        if len(recent_messages) > 1:
            context_info += "Recent conversation:\n"
            for i, msg in enumerate(recent_messages[:-1]):  # Exclude the current message
                role = "User" if msg['is_user'] else "Bot"
                context_info += f"{role}: {msg['text']}\n"
        
        # Add context information to the message if available
        if context_info:
            enhanced_text = f"{text}\n\n[Context information (not visible to user): {context_info}]"
        else:
            enhanced_text = text
            
        response = CHAT_HISTORY[user_id].send_message(enhanced_text)
        response_text = response.text
        
        # Update conversation context with the bot's response
        conversation_context.update_context(user_id, response_text, is_user=False)
        
        # Check if the response contains template placeholders
        placeholder_patterns = [
            r'\[\s*[Bb]itte[^]]*\]',  # [Bitte geben Sie...]
            r'\[\s*[Pp]lease[^]]*\]',  # [Please enter...]
            r'\[\s*[Pp]rodukt[^]]*\]', # [Produktname]
            r'\[\s*[Pp]reis[^]]*\]',   # [Preis]
            r'\[\s*[Pp]rice[^]]*\]',   # [Price]
            r'\[\s*[Vv]erfügbarkeit[^]]*\]', # [Verfügbarkeit]
        ]
        
        for pattern in placeholder_patterns:
            if re.search(pattern, response_text):
                print(f"Warning: Response contains template placeholder: {pattern}")
                return "Es tut mir leid, aber ich konnte keine genauen Informationen zu Ihrer Anfrage finden. Bitte kontaktieren Sie uns direkt unter info@durmusbaba.com oder +4915228474571 für weitere Unterstützung."
        
        # Remove any context information that might have leaked into the response
        response_text = re.sub(r'\[Context information \(not visible to user\): .*?\]', '', response_text, flags=re.DOTALL)
        
        return response_text
    
    except Exception as e:
        print(f"Error in get_gemini_response: {e}")
        traceback.print_exc()
        return "Es tut mir leid, aber es gab ein Problem bei der Verarbeitung Ihrer Anfrage. Bitte versuchen Sie es später noch einmal oder kontaktieren Sie uns direkt unter info@durmusbaba.com."

# New function to format product responses consistently
def format_product_response(product, user_id):
    """Format product information response based on the detected language"""
    product_name = product['product_name']
    price = product['price_eur']
    url = product.get('url', '')
    status = product.get('status', '')
    
    # Update conversation context
    context = conversation_context.get_context(user_id)
    context['current_topic'] = 'product_info'
    
    # Add product to entities if not already there
    product_entity = {'name': product_name, 'mentioned_at': time.time()}
    if not any(p['name'] == product_name for p in context['entities']['products']):
        context['entities']['products'].append(product_entity)
    
    # Format status message
    status_message = ""
    if status == "instock":
        status_message = "auf Lager"
    elif status == "outofstock":
        status_message = "nicht auf Lager"
    
    # Get recent messages to detect language
    recent_messages = conversation_context.get_recent_messages(user_id)
    text = recent_messages[-1]['text'] if recent_messages else ""
    
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
            
            # Use advanced product search
            products = woocommerce.advanced_product_search(cleaned_text, limit=5)
            
            if products:
                # Return the best match (first result from advanced search)
                best_match = products[0]
                
                # Create a compatible product object
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
    """Check if the message is a product query and return product information if found."""
    print(f"Checking product query: '{text}'")
    
    # Get context for this user
    context = conversation_context.get_context(user_id) if user_id else None
    
    # Extract brand and model number from the query
    brands = ['embraco', 'bitzer', 'danfoss', 'secop', 'copeland', 'tecumseh', 'dcb', 'ebm', 'ebmpapst', 'york', 'drc']
    identified_brand = None
    model_number = None
    
    # Check if we have a brand in the query
    for brand in brands:
        if brand in text.lower():
            identified_brand = brand
            # Extract the rest as potential model number
            parts = text.lower().split()
            for part in parts:
                if brand not in part and any(c.isdigit() for c in part):
                    model_number = part
                    break
            break
    
    # Check for product model numbers in the text
    product_patterns = [
        r'(?:embraco|danfoss|bitzer)\s+[a-z0-9\s\-\.]{2,10}',  # Brand + model
        r'[a-z]{2,4}\s*\d{2,5}(?:\s*[a-z]{0,5})?',  # Model patterns like "EMY 80" or "NJ 9238"
        r'dcb\d{2,3}',  # DCB models
        r'ff\s*\d+\.?\d*',  # FF models
        r'\b\d{4,5}\b'  # Standalone numeric models like "9236"
    ]
    
    # Check if this is just a numeric model number (like "9236")
    if text.strip().isdigit() and len(text.strip()) >= 3:
        print(f"Detected standalone numeric model: {text.strip()}")
        potential_products = [text.strip()]
    else:
        # Extract potential product models from the text
        potential_products = []
        for pattern in product_patterns:
            matches = re.findall(pattern, text.lower())
            potential_products.extend([match.strip() for match in matches])
    
    print(f"Potential products found in text: {potential_products}")
    
    # If no products found in text, check if we have referenced products in context
    if not potential_products and context and context['entities']['products']:
        referenced_entities = conversation_context.get_referenced_entities(user_id, text)
        if 'product' in referenced_entities:
            potential_products.append(referenced_entities['product']['name'])
            print(f"Using referenced product from context: {potential_products}")
    
    # If we have potential products, search for them
    if potential_products:
        # First try WooCommerce if available
        if USE_WOOCOMMERCE:
            try:
                # Try to find products in WooCommerce
                for product_name in potential_products:
                    # Clean up the product name for search
                    search_term = re.sub(r'\s+', ' ', product_name).strip()
                    
                    # If we have a brand identified, combine it with the search term
                    if identified_brand and identified_brand not in search_term:
                        search_term = f"{identified_brand} {search_term}"
                    
                    # Search for the product
                    products = woocommerce.advanced_product_search(search_term)
                    
                    if products:
                        # Found products, format the response
                        product = products[0]  # Take the first match
                        
                        # Update context with found product
                        if context:
                            context['current_topic'] = 'product_info'
                            product_entity = {'name': product_name, 'mentioned_at': time.time()}
                            if not any(p['name'] == product_name for p in context['entities']['products']):
                                context['entities']['products'].append(product_entity)
                        
                        # Format the response based on language
                        return format_product_response({
                            'product_name': product['name'],
                            'price_eur': product['price'],
                            'url': product['permalink'],
                            'status': 'instock' if product['in_stock'] else 'outofstock'
                        }, user_id)
                
                # If we get here, no products were found in WooCommerce
                print("No products found in WooCommerce")
            except Exception as e:
                print(f"Error searching WooCommerce: {e}")
        
        # If WooCommerce search failed or is not available, try local database
        for product_name in potential_products:
            # Clean up the product name for search
            search_term = re.sub(r'\s+', ' ', product_name).strip()
            
            # If we have a brand identified, combine it with the search term for numeric-only queries
            if identified_brand and search_term.isdigit():
                combined_search_term = f"{identified_brand} {search_term}"
                print(f"Searching for combined term: {combined_search_term}")
                
                # Try exact match with combined term
                for product in PRODUCT_DB:
                    product_lower = product['product_name'].lower()
                    if identified_brand in product_lower and search_term in product_lower:
                        # Update context with found product
                        if context:
                            context['current_topic'] = 'product_info'
                            product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
                            if not any(p['name'] == product['product_name'] for p in context['entities']['products']):
                                context['entities']['products'].append(product_entity)
                        
                        # Format the response based on language
                        return format_product_response(product, user_id)
            
            # Try exact match first
            for product in PRODUCT_DB:
                product_lower = product['product_name'].lower()
                
                # For numeric model numbers, check if they appear anywhere in the product name
                if search_term.isdigit():
                    if search_term in product_lower.replace(" ", "").replace("-", ""):
                        # Update context with found product
                        if context:
                            context['current_topic'] = 'product_info'
                            product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
                            if not any(p['name'] == product['product_name'] for p in context['entities']['products']):
                                context['entities']['products'].append(product_entity)
                        
                        # Format the response based on language
                        return format_product_response(product, user_id)
                # For regular searches
                elif search_term.lower() in product_lower:
                    # Update context with found product
                    if context:
                        context['current_topic'] = 'product_info'
                        product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
                        if not any(p['name'] == product['product_name'] for p in context['entities']['products']):
                            context['entities']['products'].append(product_entity)
                    
                    # Format the response based on language
                    return format_product_response(product, user_id)
            
            # If no exact match, try fuzzy matching
            similar_products = find_similar_products(search_term)
            if similar_products:
                # Update context with found products
                if context:
                    context['current_topic'] = 'product_info'
                    context['entities']['products'] = []
                    for product in similar_products[:3]:  # Store top 3 matches
                        product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
                        context['entities']['products'].append(product_entity)
                
                # Format a response with multiple products
                if len(similar_products) == 1:
                    # Single product found
                    return format_product_response(similar_products[0], user_id)
                else:
                    # Multiple products found
                    products_list = ""
                    for i, product in enumerate(similar_products[:5]):  # Show top 5 matches
                        products_list += f"{i+1}. {product['product_name']} - {product['price_eur']} EUR\n"
                    
                    # Check if this was a search for a specific model number that wasn't found exactly
                    is_model_search = False
                    searched_model = None
                    
                    # Check if the search was for a numeric model
                    if text.strip().isdigit() and len(text.strip()) >= 3:
                        is_model_search = True
                        searched_model = text.strip()
                    # Check if the search was for a brand + model number
                    elif identified_brand and model_number:
                        is_model_search = True
                        searched_model = model_number
                    
                    # Detect language and format response accordingly
                    if is_model_search and searched_model:
                        # Format a "Did you mean" response
                        if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                            # Turkish
                            return f"❓ \"{searched_model}\" modeli bulunamadı. Bunları mı demek istediniz?\n\n{products_list}\n🔍 Daha fazla bilgi için ürün numarasını yazabilirsiniz."
                        elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                            # English
                            return f"❓ Model \"{searched_model}\" not found. Did you mean one of these?\n\n{products_list}\n🔍 You can type the product number for more information."
                        else:
                            # Default to German
                            return f"❓ Modell \"{searched_model}\" wurde nicht gefunden. Meinten Sie eines davon?\n\n{products_list}\n🔍 Sie können die Produktnummer für weitere Informationen eingeben."
                    else:
                        # Regular multiple results response
                        if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                            # Turkish
                            return f"📋 Aradığınız ürün için birkaç sonuç buldum:\n\n{products_list}\n🔍 Daha fazla bilgi için ürün numarasını yazabilirsiniz."
                        elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                            # English
                            return f"📋 I found several results for your query:\n\n{products_list}\n🔍 You can type the product number for more information."
                        else:
                            # Default to German
                            return f"📋 Ich habe mehrere Ergebnisse für Ihre Anfrage gefunden:\n\n{products_list}\n🔍 Sie können die Produktnummer für weitere Informationen eingeben."
    
    # Check if this is a category request
    category_result = check_category_request(text, user_id)
    if category_result:
        return category_result
    
    # Check if this is a price range request
    price_range_result = check_price_range_request(text, user_id)
    if price_range_result:
        return price_range_result
    
    # No product information found
    return None

def find_similar_products(text):
    """Find products that are similar to the query text."""
    text_lower = text.lower()
    text_normalized = text_lower.replace(" ", "").replace("-", "")
    
    matching_products = []
    
    # Extract brand and model number from the query
    brands = ['embraco', 'bitzer', 'danfoss', 'secop', 'copeland', 'tecumseh', 'dcb', 'ebm', 'ebmpapst', 'york', 'drc']
    identified_brand = None
    model_number = None
    
    # Check if we have a brand in the query
    for brand in brands:
        if brand in text_lower:
            identified_brand = brand
            # Extract the rest as potential model number
            parts = text_lower.split()
            for part in parts:
                if brand not in part and any(c.isdigit() for c in part):
                    model_number = part
                    break
            break
    
    # If we have both brand and model number, prioritize this search
    if identified_brand and model_number:
        print(f"Searching for brand: {identified_brand}, model: {model_number}")
        for product in PRODUCT_DB:
            product_name = product['product_name'].lower()
            if identified_brand in product_name and model_number in product_name:
                matching_products.append(product)
        
        # If no exact match found, try to find similar model numbers
        if not matching_products:
            print(f"No exact match found for {model_number}, looking for similar models")
            # Get the numeric part of the model number
            numeric_part = ''.join(filter(str.isdigit, model_number))
            if numeric_part and len(numeric_part) >= 3:
                # Find products with similar numeric parts
                similar_models = []
                for product in PRODUCT_DB:
                    product_name = product['product_name'].lower()
                    if identified_brand in product_name:
                        # Extract all numeric sequences from the product name
                        product_numbers = re.findall(r'\d+', product_name)
                        for num in product_numbers:
                            # Check if the numeric part is similar (first 3 digits match)
                            if len(num) >= 3 and num[:3] == numeric_part[:3]:
                                similar_models.append(product)
                                break
                
                if similar_models:
                    print(f"Found {len(similar_models)} products with similar model numbers")
                    return similar_models
        
        if matching_products:
            print(f"Found {len(matching_products)} products matching brand {identified_brand} and model {model_number}")
            return matching_products
    
    # Special handling for numeric-only queries (like "9236")
    if text.strip().isdigit() and len(text.strip()) >= 3:
        numeric_query = text.strip()
        print(f"Numeric search in similar products for: {numeric_query}")
        
        # First pass: look for exact numeric matches
        for product in PRODUCT_DB:
            product_name = product['product_name'].lower()
            # Check if this exact number appears in the product name
            if numeric_query in product_name.replace(" ", "").replace("-", ""):
                matching_products.append(product)
        
        # If we found matches, return them
        if matching_products:
            print(f"Found {len(matching_products)} products with exact numeric match for {numeric_query}")
            return matching_products
        
        # If no exact match, try to find similar model numbers
        print(f"No exact match found for {numeric_query}, looking for similar models")
        similar_models = []
        
        # Try to find products with similar numeric parts (first 3 digits match)
        if len(numeric_query) >= 3:
            for product in PRODUCT_DB:
                product_name = product['product_name'].lower()
                # Extract all numeric sequences from the product name
                product_numbers = re.findall(r'\d+', product_name)
                for num in product_numbers:
                    # Check if the numeric part is similar (first 3 digits match)
                    if len(num) >= 3 and num[:3] == numeric_query[:3]:
                        similar_models.append(product)
                        break
            
            if similar_models:
                print(f"Found {len(similar_models)} products with similar model numbers")
                return similar_models
    
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
        r'(\d{3,5})',  # Matches numeric model numbers like "9236"
    ]
    
    for pattern in model_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, tuple):
                model_parts = [part for part in match if part]
                model = ''.join(model_parts).strip()
                if model and model not in potential_terms:
                    potential_terms.append(model)
            else:
                # Single part match (like "9236")
                model = match.strip()
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
        if identified_brand:
            filtered_products = []
            for product in matching_products:
                if identified_brand in product['product_name'].lower():
                    filtered_products.append(product)
            
            # If we have filtered products, use them instead
            if filtered_products:
                matching_products = filtered_products
    
    # 4. If we have a brand but no matches yet, return all products from that brand
    if not matching_products and identified_brand:
        for product in PRODUCT_DB:
            if identified_brand in product['product_name'].lower():
                matching_products.append(product)
    
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
    
    # Get context for this user
    context = conversation_context.get_context(user_id) if user_id else None
    
    # Check if the text contains any category keywords
    for category, keywords in categories.items():
        if any(keyword in text.lower() for keyword in keywords):
            # Find products in this category
            matching_products = []
            for product in PRODUCT_DB:
                product_name = product.get('product_name', '').lower()
                if any(keyword in product_name for keyword in keywords):
                    matching_products.append(product)
            
            if matching_products:
                # Store search results in conversation context if user_id is provided
                if context:
                    context['current_topic'] = 'category_search'
                    # Add category to entities if not already there
                    if category not in context['entities']['categories']:
                        context['entities']['categories'].append(category)
                    
                    # Update product page
                    context['product_page'] = 0
                
                # Detect language
                is_turkish = any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar', 'ürün', 'kompresör'])
                is_english = any(word in text.lower() for word in ['price', 'cost', 'how much', 'product', 'compressor'])
                
                # Format the response based on language
                if is_turkish:
                    result = f"🏭 {category.upper()} kategorisinde {len(matching_products)} ürün buldum:\n\n"
                elif is_english:
                    result = f"🏭 I found {len(matching_products)} products in the {category.upper()} category:\n\n"
                else:
                    result = f"🏭 Ich habe {len(matching_products)} Produkte in der Kategorie {category.upper()} gefunden:\n\n"
                
                # Show up to 5 products
                for i, product in enumerate(matching_products[:5]):
                    # Add product to entities in context
                    if context:
                        product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
                        if not any(p['name'] == product_entity['name'] for p in context['entities']['products']):
                            context['entities']['products'].append(product_entity)
                    
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
                if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                    # Turkish
                    return f"❓ Üzgünüm, {category} kategorisinde ürün bulamadım. Lütfen başka bir kategori deneyin veya bizimle iletişime geçin: info@durmusbaba.com"
                elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                    # English
                    return f"❓ I'm sorry, I couldn't find any products in the {category} category. Please try another category or contact us at: info@durmusbaba.com"
                else:
                    # Default to German
                    return f"❓ Es tut mir leid, ich konnte keine Produkte in der Kategorie {category} finden. Bitte versuchen Sie eine andere Kategorie oder kontaktieren Sie uns unter: info@durmusbaba.com"
    
    # Check if there's a referenced category in the conversation context
    if not any(any(keyword in text.lower() for keyword in keywords) for category, keywords in categories.items()):
        if context and context['entities']['categories']:
            referenced_entities = conversation_context.get_referenced_entities(user_id, text)
            if 'category' in referenced_entities:
                category = referenced_entities['category']
                print(f"Found referenced category: {category}")
                # Recursively call this function with the category name
                return check_category_request(f"show products in {category}", user_id)
    
    return None

def check_price_range_request(text, user_id=None):
    """Check if the user is asking for products in a specific price range."""
    # Get context for this user
    context = conversation_context.get_context(user_id) if user_id else None
    
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
            # Store search results in conversation context if user_id is provided
            if context:
                context['current_topic'] = 'price_search'
                # Add price range to entities
                context['entities']['price_ranges'].append((min_price, max_price))
                # Update product page
                context['product_page'] = 0
            
            # Detect language
            is_turkish = any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar', 'ürün', 'kompresör'])
            is_english = any(word in text.lower() for word in ['price', 'cost', 'how much', 'product', 'compressor'])
            
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
                # Add product to entities in context
                if context:
                    product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
                    if not any(p['name'] == product_entity['name'] for p in context['entities']['products']):
                        context['entities']['products'].append(product_entity)
                
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
            if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                # Turkish
                return f"❓ Üzgünüm, {min_price}-{max_price} EUR fiyat aralığında ürün bulamadım. Lütfen farklı bir fiyat aralığı deneyin veya bizimle iletişime geçin: info@durmusbaba.com"
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                return f"❓ I'm sorry, I couldn't find any products in the price range of {min_price}-{max_price} EUR. Please try a different price range or contact us at: info@durmusbaba.com"
            else:
                # Default to German
                return f"❓ Es tut mir leid, ich konnte keine Produkte im Preisbereich von {min_price}-{max_price} EUR finden. Bitte versuchen Sie einen anderen Preisbereich oder kontaktieren Sie uns unter: info@durmusbaba.com"
    
    # Check if there's a referenced price range in the conversation context
    elif context and context['entities']['price_ranges']:
        referenced_entities = conversation_context.get_referenced_entities(user_id, text)
        if 'price_range' in referenced_entities or any(word in text.lower() for word in ['price range', 'preisbereich', 'fiyat aralığı']):
            # Use the most recent price range
            min_price, max_price = context['entities']['price_ranges'][-1]
            # Recursively call this function with the price range
            return check_price_range_request(f"show products between {min_price} and {max_price} EUR", user_id)
    
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
    # Get context for this user
    context = conversation_context.get_context(user_id) if user_id else None
    
    if not context or not context['entities']['products']:
        # No context available or no products in context
        if any(word in text.lower() for word in ['daha', 'fazla', 'devam']):
            # Turkish
            return "❓ Üzgünüm, şu anda gösterilecek daha fazla ürün yok. Lütfen yeni bir arama yapın."
        elif any(word in text.lower() for word in ['more', 'next', 'continue']):
            # English
            return "❓ I'm sorry, there are no more products to show at the moment. Please try a new search."
        else:
            # Default to German
            return "❓ Es tut mir leid, es gibt derzeit keine weiteren Produkte zum Anzeigen. Bitte versuchen Sie eine neue Suche."
    
    # Increment the product page
    if 'product_page' not in context:
        context['product_page'] = 0
    context['product_page'] += 1
    
    # Get the current topic
    current_topic = context['current_topic']
    
    # Determine which products to show based on the current topic
    products_to_show = []
    
    if current_topic == 'category_search' and context['entities']['categories']:
        # Get products for the most recent category
        category = context['entities']['categories'][-1]
        
        # Define keywords for the category
        category_keywords = {
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
        
        # Find the keywords for this category
        keywords = []
        for cat, kw in category_keywords.items():
            if cat.lower() in category.lower():
                keywords = kw
                break
        
        # Find products in this category
        all_products = []
        for product in PRODUCT_DB:
            product_name = product.get('product_name', '').lower()
            if any(keyword in product_name for keyword in keywords):
                all_products.append(product)
        
        # Get the current page of products
        start_idx = (context['product_page'] - 1) * 5
        if start_idx < len(all_products):
            products_to_show = all_products[start_idx:start_idx + 5]
            total_products = len(all_products)
        else:
            # Reset to the first page if we've gone too far
            context['product_page'] = 1
            products_to_show = all_products[:5]
            total_products = len(all_products)
    
    elif current_topic == 'price_search' and context['entities']['price_ranges']:
        # Get products for the most recent price range
        min_price, max_price = context['entities']['price_ranges'][-1]
        
        # Find products in this price range
        all_products = []
        for product in PRODUCT_DB:
            try:
                price = float(product.get('price_eur', '0').replace('€', '').replace(',', '.').strip())
                if min_price <= price <= max_price:
                    all_products.append(product)
            except (ValueError, TypeError):
                continue
        
        # Sort products by price
        all_products.sort(key=lambda x: float(x.get('price_eur', '0').replace('€', '').replace(',', '.').strip()))
        
        # Get the current page of products
        start_idx = (context['product_page'] - 1) * 5
        if start_idx < len(all_products):
            products_to_show = all_products[start_idx:start_idx + 5]
            total_products = len(all_products)
        else:
            # Reset to the first page if we've gone too far
            context['product_page'] = 1
            products_to_show = all_products[:5]
            total_products = len(all_products)
    
    else:
        # Just show the next 5 products from the entities
        all_products = [{'product_name': p['name'], 'price_eur': '?', 'status': '', 'url': ''} for p in context['entities']['products']]
        
        # Try to find full product info for each product
        for i, product in enumerate(all_products):
            for db_product in PRODUCT_DB:
                if product['product_name'].lower() in db_product['product_name'].lower():
                    all_products[i] = db_product
                    break
        
        # Get the current page of products
        start_idx = (context['product_page'] - 1) * 5
        if start_idx < len(all_products):
            products_to_show = all_products[start_idx:start_idx + 5]
            total_products = len(all_products)
        else:
            # Reset to the first page if we've gone too far
            context['product_page'] = 1
            products_to_show = all_products[:5]
            total_products = len(all_products)
    
    # If we have no products to show, return an error message
    if not products_to_show:
        if any(word in text.lower() for word in ['daha', 'fazla', 'devam']):
            # Turkish
            return "❓ Üzgünüm, gösterilecek başka ürün kalmadı. Lütfen yeni bir arama yapın."
        elif any(word in text.lower() for word in ['more', 'next', 'continue']):
            # English
            return "❓ I'm sorry, there are no more products to show. Please try a new search."
        else:
            # Default to German
            return "❓ Es tut mir leid, es gibt keine weiteren Produkte zum Anzeigen. Bitte versuchen Sie eine neue Suche."
    
    # Calculate the current range of products being shown
    start_idx = (context['product_page'] - 1) * 5
    end_idx = start_idx + len(products_to_show)
    
    # Detect language from the request
    is_turkish = any(word in text.lower() for word in ['daha', 'fazla', 'devam', 'diğer', 'başka'])
    is_english = any(word in text.lower() for word in ['more', 'show', 'list', 'next', 'continue'])
    
    # Format the response based on language
    if is_turkish:
        result = f"🔍 İşte {total_products} üründen {start_idx + 1}-{end_idx} arası ürünler:\n\n"
    elif is_english:
        result = f"🔍 Here are products {start_idx + 1}-{end_idx} of {total_products}:\n\n"
    else:
        result = f"🔍 Hier sind Produkte {start_idx + 1}-{end_idx} von {total_products}:\n\n"
    
    # Add product information
    for i, product in enumerate(products_to_show):
        # Add product to entities in context
        product_entity = {'name': product['product_name'], 'mentioned_at': time.time()}
        if not any(p['name'] == product_entity['name'] for p in context['entities']['products']):
            context['entities']['products'].append(product_entity)
        
        status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
        if is_turkish:
            status_text = "stokta" if product.get('status') == "instock" else "stokta değil"
        elif is_english:
            status_text = "in stock" if product.get('status') == "instock" else "out of stock"
        
        status_emoji = "✅" if product.get('status') == "instock" else "⚠️"
        result += f"{start_idx + i + 1}. 📦 {product['product_name']}\n"
        result += f"   💰 {product.get('price_eur', '?')} EUR | {status_emoji} {status_text}\n"
        result += f"   🔗 {product.get('url', '')}\n\n"
    
    # Add message about more products if available
    remaining = total_products - end_idx
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
    # Get context for this user
    context = conversation_context.get_context(user_id) if user_id else None
    
    # Update conversation context
    if context:
        context['current_topic'] = 'order_status'
    
    # Check for referenced orders in the conversation context
    if context and context['entities']['orders']:
        referenced_entities = conversation_context.get_referenced_entities(user_id, text)
        if 'order' in referenced_entities:
            order_id = referenced_entities['order']
            print(f"Using referenced order from context: {order_id}")
            return get_order_status(order_id=order_id)
    
    # Extract order number if present
    order_id = extract_order_number(text)
    
    if order_id:
        # If we have an order ID, look it up directly
        # Add order to context
        if context and order_id not in context['entities']['orders']:
            context['entities']['orders'].append(order_id)
        
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
                
                # Extract the phone number ID from the incoming message
                recipient_phone_id = value.get("metadata", {}).get("phone_number_id", PHONE_NUMBER_ID)
                print(f"Using phone_number_id: {recipient_phone_id}")
                
                # Check message type
                if "type" in msg:
                    message_type = msg["type"]
                    print(f"Message type: {message_type}")
                    
                    # Handle different message types
                    if message_type == "text" and "text" in msg and "body" in msg["text"]:
                        # Handle text messages
                        message_text = msg["text"]["body"]
                        print(f"Message text: {message_text}")
                        
                        # Get response from Gemini AI
                        response_text = get_gemini_response(sender, message_text)
                        print(f"Response from Gemini: {response_text}")
                    
                    elif message_type == "image" and "image" in msg:
                        # Handle image messages
                        print("Received image message")
                        
                        # Get image ID
                        image_id = msg["image"].get("id")
                        if not image_id:
                            print("No image ID found in message")
                            response_text = "I received your image but couldn't process it. Could you please try sending it again?"
                        else:
                            print(f"Processing image with ID: {image_id}")
                            # Get image URL using the Media API
                            image_url = get_media_url(image_id, recipient_phone_id)
                            
                            if not image_url:
                                print("Failed to get image URL")
                                response_text = "I received your image but couldn't download it. Could you please try sending it again?"
                            else:
                                # Download the image
                                try:
                                    # Create temp directory if it doesn't exist
                                    temp_dir = os.path.join(os.getcwd(), "temp")
                                    os.makedirs(temp_dir, exist_ok=True)
                                    
                                    # Create a unique filename
                                    image_path = os.path.join(temp_dir, f"whatsapp_image_{image_id}.jpg")
                                    
                                    # Download the image
                                    download_headers = {
                                        "Authorization": f"Bearer {ACCESS_TOKEN}"
                                    }
                                    
                                    print(f"Downloading image from URL to {image_path}")
                                    image_response = requests.get(image_url, headers=download_headers)
                                    
                                    if image_response.status_code != 200:
                                        print(f"Failed to download image: {image_response.status_code}")
                                        response_text = "I received your image but couldn't download it. Could you please try sending it again?"
                                    else:
                                        # Save the image to a file
                                        with open(image_path, 'wb') as f:
                                            f.write(image_response.content)
                                        
                                        print(f"Image downloaded successfully to {image_path}")
                                        
                                        # Process the image with Gemini Vision using local file path
                                        print(f"Processing image with Gemini Vision")
                                        response_text = process_image_with_gemini(f"file://{image_path}", sender)
                                        
                                        # Clean up the temporary file
                                        try:
                                            os.remove(image_path)
                                            print(f"Removed temporary image file: {image_path}")
                                        except Exception as e:
                                            print(f"Error removing temporary file: {e}")
                                except Exception as e:
                                    print(f"Error downloading or processing image: {e}")
                                    traceback.print_exc()
                                    response_text = "I had trouble processing your image. Could you please try sending it again or describe what you're looking for?"
                    else:
                        # Unsupported message type
                        print(f"Unsupported message type: {message_type}")
                        response_text = "I received your message but I can only process text and images at the moment."
                    
                    # Log user context for debugging
                    user_context = conversation_context.get_context(sender)
                    if user_context:
                        print(f"User context: {json.dumps({k: v for k, v in user_context.items() if k != 'entities'})}")
                        print(f"Entities in context: {json.dumps(user_context.get('entities', {}))}")
                    
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
                    print("Message type not specified in the message")
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

def get_media_url(media_id, phone_number_id):
    """
    Get the URL of a media file from WhatsApp API
    
    Args:
        media_id (str): ID of the media file
        phone_number_id (str): Phone number ID
        
    Returns:
        str: URL of the media file or None if error
    """
    try:
        # Get media URL from WhatsApp API - use the correct endpoint format
        url = f"https://graph.facebook.com/v18.0/{media_id}"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}"
        }
        
        print(f"Getting media URL from: {url}")
        response = requests.get(url, headers=headers)
        if response.status_code != 200:
            print(f"Failed to get media URL: {response.status_code} - {response.text}")
            return None
        
        media_data = response.json()
        if "url" not in media_data:
            print(f"No URL found in media data: {media_data}")
            return None
        
        # Get the actual media file
        media_url = media_data["url"]
        print(f"Got media URL: {media_url}")
        
        return media_url
        
    except Exception as e:
        print(f"Error getting media URL: {e}")
        traceback.print_exc()
        return None

@app.route("/woocommerce-webhook", methods=["POST"])
def woocommerce_webhook():
    """Handle WooCommerce webhooks for new orders"""
    try:
        print("Received WooCommerce webhook")
        
        # Get the webhook data
        data = request.get_json()
        print(f"WooCommerce webhook data: {json.dumps(data, indent=2)}")
        
        # Check if this is an order-related webhook
        if data and 'id' in data and 'status' in data:
            print(f"Processing order webhook: Order #{data['id']} with status {data['status']}")
            
            # Handle the order webhook (send notifications)
            success = handle_order_webhook(data)
            
            if success:
                print(f"Successfully processed order webhook for order #{data['id']}")
                return "OK", 200
            else:
                print(f"Failed to process order webhook for order #{data['id']}")
                return "Failed to process webhook", 500
        else:
            print("Not an order webhook or missing required data")
            return "Invalid webhook data", 400
            
    except Exception as e:
        print(f"Error processing WooCommerce webhook: {e}")
        traceback.print_exc()
        return "Error", 500

@app.route("/test-notification", methods=["GET"])
def test_notification():
    """Test route to manually trigger order notifications"""
    try:
        # Check for authorization token
        auth_token = request.args.get("token")
        if auth_token != VERIFY_TOKEN:
            return "Unauthorized", 401
            
        # Get order ID from query parameters or use "latest" to get the most recent order
        order_id = request.args.get("order_id", "latest")
        
        # If "latest", get the most recent order
        if order_id == "latest":
            print("Getting most recent order for test notification")
            recent_orders = woocommerce.get_orders(limit=1)
            if not recent_orders:
                return "No orders found", 404
            order = recent_orders[0]
            order_id = order['id']
        else:
            # Get order details from WooCommerce API
            print(f"Getting order #{order_id} for test notification")
            order = woocommerce.get_order(order_id)
            if not order:
                return f"Order #{order_id} not found", 404
            
        # Send notifications
        print(f"Sending test notification for order #{order_id}")
        from order_notification import notify_new_order
        success = notify_new_order(order)
        
        if success:
            return f"Successfully sent test notification for order #{order_id}", 200
        else:
            return f"Failed to send test notification for order #{order_id}", 500
            
    except Exception as e:
        print(f"Error sending test notification: {e}")
        traceback.print_exc()
        return f"Error: {str(e)}", 500

# Check if this is a chat history request
def is_history_request(text):
    """Check if the message is requesting chat history"""
    patterns = [
        r'(?:show|get|view|display).+(?:history|chat|conversation)',
        r'(?:what.+(?:talked|said|discussed))',
        r'(?:previous.+(?:messages|conversation))',
        r'(?:our.+(?:chat|conversation))',
        r'(?:zeig|zeige).+(?:verlauf|chat|konversation)',  # German
        r'(?:geçmiş|sohbet).+(?:göster|getir)'  # Turkish
    ]
    
    return any(re.search(pattern, text.lower()) for pattern in patterns)

# Format chat history for display
def format_chat_history(messages):
    """Format chat history for display to the user"""
    if not messages:
        return "Es gibt noch keine Chatverläufe."
    
    formatted = "Hier ist unser Gesprächsverlauf:\n\n"
    
    for i, msg in enumerate(messages):
        # Format timestamp
        timestamp = datetime.fromtimestamp(msg['timestamp']).strftime('%H:%M:%S')
        role = "Sie" if msg['is_user'] else "Ich"
        formatted += f"{timestamp} - {role}: {msg['text']}\n\n"
    
    return formatted

# Handle chat history request
def handle_history_request(user_id, text):
    """Handle a request to view chat history"""
    # Get full conversation history
    full_history = conversation_context.get_full_conversation_history(user_id)
    
    # Remove the current request from history for display
    display_history = full_history[:-1] if full_history else []
    
    # Format the history for display
    return format_chat_history(display_history)

def process_image_with_gemini(image_path, user_id):
    """
    Process an image with Gemini Vision API to identify products
    
    Args:
        image_path (str): Path or URL of the image to process
        user_id (str): User ID for conversation context
        
    Returns:
        str: Gemini's response about the image
    """
    try:
        print(f"Processing image with Gemini Vision: {image_path}")
        
        # Convert to PIL Image for better compatibility
        try:
            from PIL import Image
            import io
            
            # Check if it's a local file path
            if image_path.startswith("file://"):
                local_path = image_path.replace("file://", "")
                print(f"Loading image from local path: {local_path}")
                image = Image.open(local_path)
            else:
                # It's a URL, download the image
                print(f"Downloading image from URL: {image_path}")
                response = requests.get(image_path)
                if response.status_code != 200:
                    print(f"Failed to download image: {response.status_code}")
                    return "Sorry, I couldn't download the image to analyze it."
                
                image_data = response.content
                image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB if needed
            if image.mode != "RGB":
                print(f"Converting image from {image.mode} to RGB")
                image = image.convert("RGB")
                
            print(f"Image dimensions: {image.size}")
            print(f"Image format: {image.format}")
                
        except Exception as e:
            print(f"Error processing image with PIL: {e}")
            traceback.print_exc()
            return "Sorry, I encountered an error while processing the image. Could you please describe what you're looking for instead?"
        
        # Configure Gemini Vision model (using the updated model)
        vision_model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Prepare the prompt for product identification
        prompt = """
        Identify the product in this image in detail. 
        Focus on:
        1. Product type (e.g., refrigeration compressor, cooling system, etc.)
        2. Brand name if visible
        3. Model/style name or number if visible
        4. Key features visible in the image
        5. Technical specifications if visible
        
        If this appears to be a screenshot of a product search or website, extract the product information from the text visible in the image.
        
        Provide the information in a structured format that can be used for product search.
        """
        
        # Process the image with Gemini Vision
        response = vision_model.generate_content([prompt, image])
        
        # Get the text response
        vision_response = response.text
        print(f"Gemini Vision response: {vision_response}")
        
        # Update conversation context
        conversation_context.update_context(user_id, f"[Image sent: {vision_response}]")
        
        # Search for matching products
        product_matches = search_products_from_vision(vision_response)
        
        if product_matches:
            # Format the response with product matches
            return format_vision_product_response(vision_response, product_matches, user_id)
        else:
            # No matches found, return the vision analysis with a message
            return f"I analyzed your image and found: \n\n{vision_response}\n\nI couldn't find exact matches in our inventory. Would you like to search for something specific?"
            
    except Exception as e:
        print(f"Error processing image with Gemini Vision: {e}")
        traceback.print_exc()
        return "Sorry, I encountered an error while analyzing the image. Could you please describe what you're looking for instead?"

def format_vision_product_response(vision_analysis, products, user_id):
    """
    Format the response with product matches from vision analysis
    
    Args:
        vision_analysis (str): Gemini Vision's analysis of the image
        products (list): List of matching products
        user_id (str): User ID for conversation context
        
    Returns:
        str: Formatted response with product matches
    """
    try:
        # Update user context with found products
        context = conversation_context.get_context(user_id)
        if 'last_products' not in context:
            context['last_products'] = []
        
        # Store the products in context
        context['last_products'] = products
        context['current_topic'] = 'product_search'
        context['last_search_page'] = 1
        
        # Extract key information from vision analysis
        product_type = "product"
        brand_name = ""
        
        # Try to extract product type
        product_type_match = re.search(r'product type[:\s]*(.*?)(?:\n|$)', vision_analysis, re.IGNORECASE)
        if product_type_match:
            product_type_raw = product_type_match.group(1).strip()
            # Clean up product type
            product_type = re.sub(r'\*\*|\*|not visible|unknown', '', product_type_raw, flags=re.IGNORECASE).strip()
        
        # If no product type found, look for it in the text
        if not product_type or product_type.lower() == "product":
            # Check for common product types
            product_types = ["thermostat", "controller", "temperature controller", "compressor", 
                            "refrigeration controller", "digital controller", "valve", "expansion valve"]
            for p_type in product_types:
                if p_type.lower() in vision_analysis.lower():
                    product_type = p_type
                    break
        
        # Try to extract brand name
        brand_match = re.search(r'brand name[:\s]*(.*?)(?:\n|$)', vision_analysis, re.IGNORECASE)
        if not brand_match:
            brand_match = re.search(r'brand[:\s]*(.*?)(?:\n|$)', vision_analysis, re.IGNORECASE)
            
        if brand_match:
            brand_raw = brand_match.group(1).strip()
            # Check if the brand is not visible
            if re.search(r'not visible|unknown|none', brand_raw, re.IGNORECASE):
                brand_name = ""
            else:
                # Clean up brand name
                brand_name = re.sub(r'\*\*|\*', '', brand_raw).strip()
        
        # Check for common brand names directly in the text
        if not brand_name or brand_name.lower() in ["", "not", "none"]:
            common_brands = ["DRC", "Embraco", "Danfoss", "Bitzer", "Copeland", "Tecumseh", "Aspera"]
            for brand in common_brands:
                if brand.lower() in vision_analysis.lower():
                    brand_name = brand
                    break
        
        # Format the response
        if brand_name and brand_name.lower() not in ["not", "none", ""]:
            response = f"I analyzed your image and identified it as a {brand_name} {product_type}.\n\n"
        else:
            response = f"I analyzed your image and identified it as a {product_type}.\n\n"
        
        # Add a summary of the analysis
        summary = extract_summary_from_vision(vision_analysis)
        if summary:
            response += f"{summary}\n\n"
        
        # Add matching products section
        if products:
            # Determine if we're showing brand-specific products or category recommendations
            if brand_name and brand_name.lower() not in ["not", "none", ""]:
                response += f"Here are some matching {brand_name} products from our inventory:\n\n"
            else:
                response += f"Here are some {product_type} products from our inventory that might match your needs:\n\n"
            
            for i, product in enumerate(products, 1):
                # Format product information
                if isinstance(product, dict):
                    # WooCommerce product format
                    name = product.get('name', 'Unknown Product')
                    price = product.get('price', 'Price not available')
                    link = product.get('permalink', '')
                    stock_status = product.get('stock_status', 'instock')
                    
                    # Format price with currency
                    if price and price != 'Price not available':
                        price = f"{price} €"
                    
                    # Format stock status
                    stock_text = "✅ In Stock" if stock_status == 'instock' else "⚠️ Out of Stock"
                    
                    response += f"{i}. *{name}*\n"
                    response += f"   Price: {price}\n"
                    response += f"   {stock_text}\n"
                    
                    # Add short description if available
                    if 'short_description' in product and product['short_description']:
                        # Clean HTML tags
                        short_desc = re.sub(r'<.*?>', '', product['short_description'])
                        if short_desc:
                            # Limit to 100 characters
                            if len(short_desc) > 100:
                                short_desc = short_desc[:97] + "..."
                            response += f"   {short_desc}\n"
                    
                    if link:
                        response += f"   [View Product]({link})\n"
                else:
                    # Local product database format
                    response += f"{i}. *{product['name']}*\n"
                    response += f"   Price: {product['price']} €\n"
                    response += f"   ✅ In Stock\n"
                
                response += "\n"
            
            # Add follow-up suggestions
            if brand_name and brand_name.lower() not in ["not", "none", ""]:
                response += "Would you like more information about any of these products? You can ask for details about a specific product by number or name."
            else:
                response += f"These are some {product_type} options from our inventory. Would you like more information about any specific product or would you like to see more options?"
        else:
            # No matches found
            response += "I couldn't find exact matches in our inventory, but I can help you find similar products.\n\n"
            
            # Suggest search terms based on what we know
            if brand_name and brand_name.lower() not in ["not", "none", ""]:
                # If we have a brand name, suggest searching for that brand
                response += f"Would you like to search for other {brand_name} products or similar {product_type}s?"
            elif "temperature controller" in product_type.lower() or "controller" in product_type.lower():
                # If it's a temperature controller, suggest specific controllers
                response += f"Would you like to see our selection of temperature controllers or digital thermostats? We carry brands like Danfoss and DRC."
            elif "thermostat" in product_type.lower():
                # If it's a thermostat, suggest thermostat products
                response += f"Would you like to see our selection of digital thermostats and temperature controllers? We have various models for different applications."
            elif "compressor" in product_type.lower():
                # If it's a compressor, suggest compressor brands
                response += f"Would you like to see our selection of compressors from brands like Embraco, Danfoss, or Bitzer? We have various models for different refrigeration needs."
            elif "valve" in product_type.lower():
                # If it's a valve, suggest valve types
                response += f"Would you like to see our selection of refrigeration valves? We carry expansion valves, solenoid valves, and other types from brands like Danfoss."
            else:
                # Generic suggestion
                response += f"Would you like to search for similar {product_type}s or browse our catalog? We carry products from top brands like Danfoss, Embraco, and Bitzer."
        
        return response
        
    except Exception as e:
        print(f"Error formatting vision product response: {e}")
        traceback.print_exc()
        return "I found some products that might match what you're looking for, but I'm having trouble formatting the details. Could you please describe what you're looking for?"

def extract_summary_from_vision(vision_analysis):
    """
    Extract a concise summary from the vision analysis
    
    Args:
        vision_analysis (str): Gemini Vision's analysis of the image
        
    Returns:
        str: Concise summary of the product
    """
    try:
        # Extract key features section
        features_match = re.search(r'key features(.*?)(?:technical specifications|\d\.|$)', vision_analysis, re.IGNORECASE | re.DOTALL)
        if features_match:
            features_text = features_match.group(1).strip()
            # Clean up the text
            features_text = re.sub(r'\*\*|\*', '', features_text)  # Remove markdown
            features_text = re.sub(r'\n+', '\n', features_text)    # Remove extra newlines
            
            # Limit to a reasonable length
            if len(features_text) > 200:
                sentences = re.split(r'[.!?]', features_text)
                summary = ""
                for sentence in sentences:
                    if len(summary) + len(sentence) < 200:
                        if sentence.strip():
                            summary += sentence.strip() + ". "
                    else:
                        break
                return summary.strip()
            return features_text
        
        # If no features section, extract the first paragraph
        paragraphs = vision_analysis.split('\n\n')
        for paragraph in paragraphs:
            if paragraph and not paragraph.startswith('#') and len(paragraph) > 20:
                # Clean up the text
                paragraph = re.sub(r'\*\*|\*', '', paragraph)  # Remove markdown
                
                # Limit to a reasonable length
                if len(paragraph) > 200:
                    return paragraph[:197] + "..."
                return paragraph
                
        return ""
    except Exception as e:
        print(f"Error extracting summary from vision: {e}")
        return ""

def search_products_from_vision(vision_response):
    """
    Search for products based on Gemini Vision's analysis
    
    Args:
        vision_response (str): Gemini Vision's analysis of the image
        
    Returns:
        list: List of matching products
    """
    try:
        print(f"Searching products based on vision analysis")
        
        # Extract key terms from the vision response
        # Focus on brand names, model numbers, and product types
        
        # Look for product type mentions
        product_type_patterns = [
            r'product type[:\s]*(.*?)(?:\n|$)',
            r'type[:\s]*(.*?)(?:\n|$)',
            r'identified as[:\s]*(.*?)(?:\n|$)'
        ]
        
        product_types = []
        for pattern in product_type_patterns:
            matches = re.findall(pattern, vision_response, re.IGNORECASE)
            product_types.extend(matches)
            
        # Extract specific product types we're interested in
        specific_types = ["compressor", "refrigeration", "cooling", "hvac", "air conditioner", "freezer", 
                         "controller", "temperature controller", "digital controller", "thermostat",
                         "valve", "expansion valve", "solenoid valve", "condenser", "evaporator"]
        
        found_types = []
        for p_type in specific_types:
            if p_type.lower() in vision_response.lower():
                found_types.append(p_type)
                
        # Add any found product types from patterns
        for p_type in product_types:
            # Clean up the product type
            cleaned_type = re.sub(r'\*\*|\*|not visible|unknown', '', p_type, flags=re.IGNORECASE).strip()
            if cleaned_type:
                found_types.append(cleaned_type)
        
        # Look for brand names
        brand_patterns = [
            r'brand[:\s]*(.*?)(?:\n|$)',
            r'brand name[:\s]*(.*?)(?:\n|$)',
            r'manufacturer[:\s]*(.*?)(?:\n|$)'
        ]
        
        brand_matches = []
        for pattern in brand_patterns:
            matches = re.findall(pattern, vision_response, re.IGNORECASE)
            brand_matches.extend(matches)
            
        # Clean up brand matches
        cleaned_brands = []
        has_brand = False
        for brand in brand_matches:
            # Check if the brand is not visible
            if re.search(r'not visible|unknown|none', brand, re.IGNORECASE):
                continue
                
            # Remove common words and markdown
            brand = re.sub(r'not visible|visible|if visible|unknown|\*\*|\*', '', brand, flags=re.IGNORECASE).strip()
            if brand and len(brand) > 1:  # Ensure it's not empty and more than one character
                cleaned_brands.append(brand)
                has_brand = True
        
        # Look for model numbers
        model_patterns = [
            r'model(?:\s*number|\s*no)?[:\s]*(.*?)(?:\n|$)',
            r'model(?:\s*name|\s*style)?[:\s]*(.*?)(?:\n|$)',
            r'(?:part|product)\s*number[:\s]*(.*?)(?:\n|$)'
        ]
        
        model_matches = []
        for pattern in model_patterns:
            matches = re.findall(pattern, vision_response, re.IGNORECASE)
            model_matches.extend(matches)
            
        # Clean up model matches
        cleaned_models = []
        for model in model_matches:
            # Check if the model is not visible
            if re.search(r'not visible|unknown|none', model, re.IGNORECASE):
                continue
                
            # Remove common words and markdown
            model = re.sub(r'not visible|visible|if visible|unknown|\*\*|\*', '', model, flags=re.IGNORECASE).strip()
            if model and len(model) > 1:  # Ensure it's not empty and more than one character
                cleaned_models.append(model)
        
        # Extract any alphanumeric patterns that might be model numbers
        # This is a more aggressive approach to find potential model numbers
        alphanumeric_pattern = r'([A-Z0-9]{2,}[-]?[A-Z0-9]{2,})'
        potential_models = re.findall(alphanumeric_pattern, vision_response)
        for model in potential_models:
            if model not in cleaned_models:
                cleaned_models.append(model)
        
        # Directly check for common brand names in the text
        common_brands = ["DRC", "Embraco", "Danfoss", "Bitzer", "Copeland", "Tecumseh", "Aspera", "Eliwell", "Carel"]
        for brand in common_brands:
            if brand.lower() in vision_response.lower() and brand not in cleaned_brands:
                cleaned_brands.append(brand)
                has_brand = True
        
        # Build search queries based on extracted information
        search_queries = []
        
        # If we have brand names, they're good starting points
        if cleaned_brands:
            for brand in cleaned_brands:
                search_queries.append(brand)
                
                # If we also have model numbers, combine them with brands
                if cleaned_models:
                    for model in cleaned_models:
                        search_queries.append(f"{brand} {model}")
                
                # Combine brands with product types
                if found_types:
                    for p_type in found_types:
                        search_queries.append(f"{brand} {p_type}")
        
        # If we have model numbers but no brands
        elif cleaned_models:
            search_queries.extend(cleaned_models)
            
            # Combine models with product types
            if found_types:
                for model in cleaned_models:
                    for p_type in found_types:
                        search_queries.append(f"{model} {p_type}")
        
        # If we only have product types
        elif found_types:
            search_queries.extend(found_types)
        
        # If no structured information was found, use key phrases from the response
        if not search_queries:
            # Extract key phrases (sentences containing product-related terms)
            key_phrases = []
            sentences = re.split(r'[.!?]', vision_response)
            product_related_terms = ["product", "device", "equipment", "system", "controller", "compressor", "refrigeration"]
            
            for sentence in sentences:
                if any(term in sentence.lower() for term in product_related_terms):
                    key_phrases.append(sentence.strip())
            
            if key_phrases:
                # Use the first few key phrases as search queries
                search_queries.extend(key_phrases[:3])
            else:
                # Fallback to using the first part of the response
                search_queries = [vision_response[:100]]
        
        # Remove duplicates and empty strings
        search_queries = list(set([q.strip() for q in search_queries if q.strip()]))
        
        # Additional search queries for common product types
        if "temperature controller" in vision_response.lower() or "refrigeration controller" in vision_response.lower():
            search_queries.extend(["temperature controller", "refrigeration controller", "digital temperature controller"])
        elif "thermostat" in vision_response.lower():
            search_queries.extend(["thermostat", "digital thermostat", "temperature control"])
        elif "compressor" in vision_response.lower():
            search_queries.extend(["compressor", "refrigeration compressor", "cooling compressor"])
        elif "valve" in vision_response.lower():
            search_queries.extend(["expansion valve", "solenoid valve", "refrigeration valve"])
        elif "condenser" in vision_response.lower():
            search_queries.extend(["condenser", "refrigeration condenser", "cooling condenser"])
        elif "evaporator" in vision_response.lower():
            search_queries.extend(["evaporator", "refrigeration evaporator", "cooling evaporator"])
            
        # Map general product types to specific categories
        product_type_mapping = {
            "controller": ["temperature controller", "refrigeration controller", "digital controller"],
            "thermostat": ["thermostat", "digital thermostat", "temperature control"],
            "compressor": ["compressor", "refrigeration compressor", "cooling compressor"],
            "valve": ["expansion valve", "solenoid valve", "refrigeration valve"],
            "condenser": ["condenser", "refrigeration condenser", "cooling condenser"],
            "evaporator": ["evaporator", "refrigeration evaporator", "cooling evaporator"],
            "cooling": ["refrigeration", "cooling system", "chiller"],
            "refrigeration": ["refrigeration system", "cooling system", "refrigeration equipment"],
            "air conditioner": ["air conditioning", "hvac", "climate control"],
            "freezer": ["freezer", "cold storage", "freezing equipment"]
        }
        
        # Add category-based searches for when no brand is available
        if not has_brand:
            print("No brand information found, adding category-based searches")
            
            # Try to identify the general product type
            general_type = None
            for p_type in found_types:
                for key in product_type_mapping.keys():
                    if key in p_type.lower():
                        general_type = key
                        break
                if general_type:
                    break
            
            # If we identified a general type, add its specific categories
            if general_type and general_type in product_type_mapping:
                search_queries.extend(product_type_mapping[general_type])
                
                # Add top brands for this product type
                if general_type == "controller" or general_type == "thermostat":
                    search_queries.extend(["Danfoss controller", "DRC controller", "Eliwell controller", "Carel controller"])
                elif general_type == "compressor":
                    search_queries.extend(["Embraco compressor", "Danfoss compressor", "Bitzer compressor", "Copeland compressor"])
                elif general_type == "valve":
                    search_queries.extend(["Danfoss valve", "Castel valve", "Sporlan valve"])
            
            # Add top product categories as fallback
            if not general_type and found_types:
                top_categories = ["compressor", "controller", "valve", "thermostat", "refrigeration"]
                search_queries.extend(top_categories)
        
        print(f"Generated search queries: {search_queries}")
        
        # Search for products using the queries
        all_matches = []
        for query in search_queries:
            if USE_WOOCOMMERCE and woocommerce.is_connected:
                # Use WooCommerce API for search
                matches = woocommerce.advanced_product_search(query, limit=3)
                if matches:
                    all_matches.extend(matches)
            else:
                # Use local product database
                matches = find_similar_products(query)
                if matches:
                    all_matches.extend(matches)
        
        # Remove duplicates
        unique_matches = {}
        for product in all_matches:
            if isinstance(product, dict) and 'id' in product:
                if product['id'] not in unique_matches:
                    unique_matches[product['id']] = product
        
        # Return the unique matches, limited to top 5
        result = list(unique_matches.values())[:5]
        print(f"Found {len(result)} matching products")
        return result
        
    except Exception as e:
        print(f"Error searching products from vision: {e}")
        traceback.print_exc()
        return []

def download_whatsapp_image(image_id):
    """
    Download an image from WhatsApp API
    
    Args:
        image_id (str): The image ID from WhatsApp
        
    Returns:
        str: Path to the downloaded image or None if failed
    """
    try:
        # Get access token from environment
        access_token = os.getenv("META_ACCESS_TOKEN")
        phone_number_id = os.getenv("META_PHONE_NUMBER_ID")
        
        # Set up the request URL
        url = f"https://graph.facebook.com/v18.0/{phone_number_id}/media/{image_id}"
        
        # Set up headers with authentication
        headers = {
            "Authorization": f"Bearer {access_token}"
        }
        
        # Get the media URL
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Failed to get media URL: {response.status_code} - {response.text}")
            return None
            
        # Extract the media URL from the response
        media_data = response.json()
        if 'url' not in media_data:
            print(f"No URL in media response: {media_data}")
            return None
            
        media_url = media_data['url']
        
        # Download the actual media file
        media_response = requests.get(media_url, headers=headers)
        
        if media_response.status_code != 200:
            print(f"Failed to download media: {media_response.status_code}")
            return None
            
        # Create a temporary file to store the image
        temp_dir = os.path.join(os.getcwd(), "temp")
        os.makedirs(temp_dir, exist_ok=True)
        
        # Create a unique filename
        filename = os.path.join(temp_dir, f"whatsapp_image_{image_id}.jpg")
        
        # Write the image data to the file
        with open(filename, 'wb') as f:
            f.write(media_response.content)
            
        print(f"Image downloaded successfully to {filename}")
        return filename
        
    except Exception as e:
        print(f"Error downloading WhatsApp image: {e}")
        traceback.print_exc()
        return None

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    print(f"Starting server on port {port}")
    
    # Start the order checking thread
    print("Starting order notification background thread")
    order_check_thread = threading.Thread(target=check_for_new_orders, daemon=True)
    order_check_thread.start()
    
    app.run(host="0.0.0.0", port=port)
