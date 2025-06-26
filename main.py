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

CHAT_HISTORY = {}  # Store chat history for different users

ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "EAA3oBtMMm1MBO2niZA7bevRovOyIS479wXtOg0C9pWztSvnPHJIuWpsrO6fCvB6DGcDH5LMZCqaMwGSmpXJIMPlNZCSZBbjmp7gOGZBl8iZBpMSzS6B1NgfBtwU2cVJBGOrARd9VF5VpQpi7vW5itTOPyUZCPgiXwXYZClX5O6q44kCd7zvw8hrGRzyltfiOhykywvqFsimKXdB4uFFUEt49UaZBSp6bkHEw7stAeUKIF")
# Default phone number ID, but we'll use the one from the incoming message
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "725422520644608")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "whatsapptoken")

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
        
        # First check if the message is just a product name (direct product query)
        exact_product = find_exact_product(text)
        if exact_product:
            # If it's an exact product name, return the price directly without calling Gemini
            product_name = exact_product['product_name']
            price = exact_product['price_eur']
            url = exact_product.get('url', '')
            status = exact_product.get('status', '')
            
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
        product_info = check_product_query(text)
        if product_info:
            # If product information is found, add it to the message
            text = f"{text}\n\nProduktinformationen: {product_info}"
            
            # For product queries, we'll handle the response directly to avoid template responses
            # This is especially important for cases where Gemini might generate placeholders
            return product_info
        
        # Check if this is a contact information request
        if is_contact_request(text):
            return generate_contact_info_response(text)
        
        # Check if this is a delivery time request
        if is_delivery_request(text):
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
    """Find a product by its exact name or a close match in the database."""
    # Clean up the input text
    cleaned_text = text.strip()
    print(f"Looking for product matching: '{cleaned_text}'")
    
    # Normalize the query: remove spaces, convert to lowercase
    query_normalized = cleaned_text.lower().replace(" ", "").replace("-", "")
    
    # 1. First try exact match (case-insensitive)
    for product in PRODUCT_DB:
        if product['product_name'].lower() == cleaned_text.lower():
            print("Found exact match!")
            return product
    
    # 2. Try with normalized names (remove spaces, hyphens)
    for product in PRODUCT_DB:
        product_normalized = product['product_name'].lower().replace(" ", "").replace("-", "")
        if product_normalized == query_normalized:
            print(f"Found match after normalization! (removed spaces/hyphens)")
            return product
    
    # 3. Check if query is fully contained in product name or vice versa
    # This helps with queries like "DCB31" matching "DCB31 - Dijital"
    for product in PRODUCT_DB:
        product_normalized = product['product_name'].lower().replace(" ", "").replace("-", "")
        if query_normalized in product_normalized or product_normalized in query_normalized:
            # Ensure it's a substantial match (to avoid matching just "DCB" to all DCB products)
            if len(query_normalized) >= 4 and len(product_normalized) >= 4:
                print(f"Found containment match! Query contained in product or vice versa")
                return product
    
    # 4. Try to extract and match model numbers
    # Many products have model numbers like "EMY 80 CLP", "NEK 6160 Z", "DCB31", etc.
    model_patterns = [
        r'([A-Za-z]{2,4})\s*[-]?\s*(\d+)\s*([A-Za-z0-9]{0,6})',  # Matches "EMY 80 CLP", "DCB31", etc.
        r'([A-Za-z]{2,4})\s*[-]?\s*(\d+[.]\d+)\s*([A-Za-z0-9]{0,6})',  # Matches "FF 8.5 HBK"
        r'([A-Za-z]{1,4})\s*[-]?\s*(\d+[A-Za-z]{0,2})\s*[-]?\s*(\d*[A-Za-z0-9]{0,6})'  # Matches "NJ 6220 Z", "S4G-12,2Y"
    ]
    
    potential_models = []
    
    # Extract potential model numbers using multiple patterns
    for pattern in model_patterns:
        matches = re.findall(pattern, cleaned_text, re.IGNORECASE)
        for match in matches:
            # Create variations of the model with and without spaces/hyphens
            model_parts = [part for part in match if part]
            
            # Add joined version (no spaces)
            model_no_spaces = ''.join(model_parts).strip()
            if model_no_spaces and len(model_no_spaces) >= 3:
                potential_models.append(model_no_spaces)
            
            # Add spaced version
            model_with_spaces = ' '.join(model_parts).strip()
            if model_with_spaces and model_with_spaces != model_no_spaces:
                potential_models.append(model_with_spaces)
                
            # Add hyphenated version
            model_with_hyphens = '-'.join(model_parts).strip()
            if model_with_hyphens and model_with_hyphens != model_no_spaces and model_with_hyphens != model_with_spaces:
                potential_models.append(model_with_hyphens)
    
    # Also add the original query and its variations
    words = cleaned_text.split()
    for word in words:
        if len(word) >= 3 and (any(c.isdigit() for c in word) or any(c.isupper() for c in word)):
            potential_models.append(word)
    
    # Ensure we have unique models
    potential_models = list(set(potential_models))
    print(f"Potential models extracted: {potential_models}")
    
    # Search for these models in the product database
    if potential_models:
        for model in potential_models:
            model_normalized = model.lower().replace(" ", "").replace("-", "")
            for product in PRODUCT_DB:
                product_name = product['product_name']
                product_normalized = product_name.lower().replace(" ", "").replace("-", "")
                
                # Check if model is in product name (normalized comparison)
                if model_normalized in product_normalized:
                    # For short models (like "DCB"), ensure it's a substantial match
                    if len(model_normalized) <= 3:
                        # For short models, check if it's followed by numbers in the product
                        model_position = product_normalized.find(model_normalized)
                        if model_position + len(model_normalized) < len(product_normalized):
                            next_char = product_normalized[model_position + len(model_normalized)]
                            if next_char.isdigit():
                                print(f"Found match by model number (short): {model} in {product_name}")
                                return product
                    else:
                        print(f"Found match by model number: {model} in {product_name}")
                        return product
    
    # 5. Try to match individual words that might be model numbers or significant parts
    words = cleaned_text.split()
    for word in words:
        word_normalized = word.lower().replace("-", "")
        if len(word_normalized) >= 2:
            # Skip common words that aren't likely to be model numbers
            if word_normalized in ['preis', 'price', 'cost', 'fiyat', 'für', 'for', 'the', 'der', 'die', 'das', 'wie', 'viel', 'how', 'much', 'was', 'kostet', 'ist']:
                continue
                
            print(f"Checking word: {word}")
            for product in PRODUCT_DB:
                product_normalized = product['product_name'].lower().replace(" ", "").replace("-", "")
                
                # For model numbers, they should be exact matches or at boundaries
                if (word_normalized in product_normalized and 
                    (any(c.isdigit() for c in word_normalized) or len(word_normalized) >= 4)):
                    print(f"Found match by significant word: {word} in {product['product_name']}")
                    return product
    
    # 6. For queries with multiple words, try to match based on brand + model pattern
    if len(words) >= 2:
        # Common brand names
        brands = ['embraco', 'danfoss', 'bitzer', 'dcb', 'ebm', 'ebmpapst', 'york']
        
        # Check if first word is a brand and second might be a model
        if words[0].lower() in brands and len(words) > 1:
            brand = words[0].lower()
            rest = ' '.join(words[1:])
            
            for product in PRODUCT_DB:
                if brand in product['product_name'].lower():
                    # Check if any part of the rest matches in the product name
                    rest_parts = rest.split()
                    for part in rest_parts:
                        if len(part) >= 2 and part.lower() in product['product_name'].lower():
                            print(f"Found match by brand + model pattern: {brand} + {part}")
                            return product
    
    print("No match found")
    return None

def check_product_query(text):
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
        category_request = check_category_request(text_lower)
        if category_request:
            return category_request
        
        # Check for price range filtering
        price_range_request = check_price_range_request(text_lower)
        if price_range_request:
            return price_range_request
        
        # If we get here, try to find similar products based on partial matches
        matching_products = find_similar_products(text)
        
        # If we found matching products, return the information
        if matching_products:
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
            
            # Add contact information for further assistance
            if is_turkish:
                result += "📞 Daha fazla yardıma ihtiyacınız varsa, lütfen bizimle iletişime geçin: info@durmusbaba.com"
            elif is_english:
                result += "📞 If you need further assistance, please contact us at: info@durmusbaba.com"
            else:
                result += "📞 Wenn Sie weitere Hilfe benötigen, kontaktieren Sie uns bitte unter: info@durmusbaba.com"
                
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

def check_category_request(text):
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
                        result += f"... ve {len(matching_products) - 5} ürün daha.\n\n"
                    elif is_english:
                        result += f"... and {len(matching_products) - 5} more products.\n\n"
                    else:
                        result += f"... und {len(matching_products) - 5} weitere Produkte.\n\n"
                
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

def check_price_range_request(text):
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
                    result += f"... ve {len(matching_products) - 5} ürün daha.\n\n"
                elif is_english:
                    result += f"... and {len(matching_products) - 5} more products.\n\n"
                else:
                    result += f"... und {len(matching_products) - 5} weitere Produkte.\n\n"
            
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
