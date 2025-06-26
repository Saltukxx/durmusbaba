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

ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "EAA3oBtMMm1MBOxLs4OIoek3CnWSCdpfJm7Sh7DmBXts5QWKDf8gFieh42N1lg4NNhC9Cugk6ooeuAgKGE8TeOpgvxqpXFo0VMV8duoenz622duGWlLCYh3vIQB1b6pwdy1dMccpkSZCekitzxesLM5v2LypY3ZBsO437izcvMT9484TRrKXxJKTMrDTF4kno2DLw2ZCYKNyyXwA7l2xFmVJldKupRFiky5y6W2uOwqClcwZD")
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "670086282856954")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "whatsapptoken")

# Load product database
def load_product_database():
    try:
        # Changed from produkt_preise_db.json to durmusbaba_products_chatbot.json
        with open('durmusbaba_products_chatbot.json', 'r', encoding='utf-8') as f:
            products = json.load(f)
            print(f"Product database loaded successfully. {len(products)} products found.")
            return products
    except Exception as e:
        print(f"Error loading product database: {e}")
        traceback.print_exc()
        return []

PRODUCT_DATABASE = load_product_database()

def get_gemini_response(user_id, text):
    print(f"Getting Gemini response for text: '{text}'")
    try:
        # Initialize or get existing chat session
        if user_id not in CHAT_HISTORY:
            # Create a new chat session with system prompt in German
            system_prompt = """
            Du bist ein Kundendienstassistent für durmusbaba.de, einen Online-Shop für Kältetechnik und Kompressoren. 
            
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
            
            Kundenservice:
            - Bei Fragen zur Verfügbarkeit oder technischen Details können Kunden uns kontaktieren
            - Wir bieten Beratung zur Auswahl des richtigen Kompressors oder Kühlsystems
            - Für detaillierte technische Informationen können Kunden unsere Website besuchen oder uns direkt kontaktieren
            
            Bestellung und Versand:
            - Bestellungen können über unsere Website durmusbaba.de aufgegeben werden
            - Wir versenden in ganz Europa
            - Bei Fragen zum Versand oder zur Lieferzeit stehen wir zur Verfügung
            
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
                return f"{product_name} fiyatı: {price} EUR\nDurum: {status_message}\nÜrün linki: {url}"
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                status_text = "in stock" if status == "instock" else "out of stock"
                return f"The price of {product_name} is {price} EUR\nStatus: {status_text}\nProduct link: {url}"
            else:
                # Default to German
                return f"Der Preis für {product_name} beträgt {price} EUR\nStatus: {status_message}\nProduktlink: {url}"
        
        # Check if the message is a product query
        product_info = check_product_query(text)
        if product_info:
            # If product information is found, add it to the message
            text = f"{text}\n\nProduktinformationen: {product_info}"
        
        # Get response from Gemini
        response = CHAT_HISTORY[user_id].send_message(text)
        response_text = response.text
        print(f"Gemini response: {response_text}")
        return response_text
    except Exception as e:
        print(f"Error in get_gemini_response: {e}")
        traceback.print_exc()
        return f"Üzgünüm, bir hata oluştu: {str(e)}"

def find_exact_product(text):
    """Find a product by its exact name in the database."""
    # Clean up the input text
    cleaned_text = text.strip()
    
    # First try exact match
    for product in PRODUCT_DATABASE:
        if product['product_name'].lower() == cleaned_text.lower():
            return product
    
    # If no exact match, try to find products where the name is contained in the query
    # or the query contains the full product name
    for product in PRODUCT_DATABASE:
        product_name = product['product_name'].lower()
        if product_name in cleaned_text.lower() or cleaned_text.lower() in product_name:
            # Check if it's a substantial match (at least 80% of the product name)
            if len(product_name) >= 5 and (
                len(product_name) >= 0.8 * len(cleaned_text) or 
                len(cleaned_text) >= 0.8 * len(product_name)
            ):
                return product
    
    # Extract potential model numbers from the text
    # Look for patterns like "EMY 80 CLP", "NEK 6160 Z", etc.
    potential_models = []
    
    # Pattern for model numbers like "EMY 80 CLP" or "NEK 6160 Z"
    pattern1 = r'([A-Za-z]{2,4})\s+(\d+)\s*([A-Za-z]{0,4})'
    matches = re.findall(pattern1, cleaned_text)
    for match in matches:
        model = ' '.join(match).strip()
        if model:
            potential_models.append(model)
    
    # If we found potential model numbers, search for them in the database
    if potential_models:
        for model in potential_models:
            for product in PRODUCT_DATABASE:
                if model.lower() in product['product_name'].lower():
                    return product
    
    # If still no match, try to match individual words that might be model numbers
    words = cleaned_text.split()
    for word in words:
        if len(word) >= 3 and any(c.isdigit() for c in word):
            for product in PRODUCT_DATABASE:
                if word in product['product_name']:
                    return product
    
    return None

def check_product_query(text):
    """Check if the user is asking about a specific product and return relevant information."""
    text_lower = text.lower()
    
    # List of keywords that might indicate a product query
    product_keywords = [
        "preis", "price", "fiyat", "kosten", "cost", "kompressor", "compressor", "kompresör",
        "embraco", "bitzer", "danfoss", "kältetechnik", "cooling", "soğutma", "kühlsystem",
        "kühlung", "refrigeration", "soğutucu", "produkt", "product", "ürün", "modell", "model"
    ]
    
    # Check if the message contains any product keywords
    is_product_query = any(keyword in text_lower for keyword in product_keywords)
    
    if is_product_query:
        # Check for category filtering requests
        category_request = check_category_request(text_lower)
        if category_request:
            return category_request
        
        # Check for price range filtering
        price_range_request = check_price_range_request(text_lower)
        if price_range_request:
            return price_range_request
        
        # Search for product matches by name
        matching_products = []
        for product in PRODUCT_DATABASE:
            product_name = product.get("product_name", "").lower()
            
            # Check if any significant word from the query is in the product name
            for term in text_lower.split():
                if len(term) > 3 and term in product_name:
                    matching_products.append(product)
                    break
                    
            # Also check if the product model number is in the query
            # Many products have model numbers like "EMY 80 CLP" or "NEK 6160 Z"
            words = product_name.split()
            for word in words:
                if len(word) >= 2 and any(c.isdigit() for c in word) and word in text_lower:
                    if product not in matching_products:
                        matching_products.append(product)
                        break
        
        # If we found matching products, return the information
        if matching_products:
            if len(matching_products) > 5:
                # If too many matches, return a summary
                return f"Ich habe {len(matching_products)} passende Produkte gefunden. Bitte geben Sie spezifischere Details an."
            else:
                # Return detailed information for up to 5 products
                result = ""
                for product in matching_products[:5]:
                    status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR | {status_text} | {product.get('url', '')}"
                return result
    
    return None

def check_category_request(text):
    """Check if the user is asking for products from a specific category or brand."""
    # Define common brands and categories
    brands = {
        "embraco": ["embraco"],
        "bitzer": ["bitzer"],
        "danfoss": ["danfoss"],
        "secop": ["secop"],
        "copeland": ["copeland"],
        "tecumseh": ["tecumseh"]
    }
    
    categories = {
        "kompressor": ["kompressor", "compressor", "kompresör"],
        "kältetechnik": ["kältetechnik", "refrigeration", "soğutma"],
        "ersatzteile": ["ersatzteile", "spare parts", "yedek parça"],
        "zubehör": ["zubehör", "accessories", "aksesuar"]
    }
    
    # Check for brand filtering
    brand_filter = None
    for brand, keywords in brands.items():
        if any(keyword in text for keyword in keywords):
            brand_filter = brand
            break
    
    # Check for category filtering
    category_filter = None
    for category, keywords in categories.items():
        if any(keyword in text for keyword in keywords):
            category_filter = category
            break
    
    # Apply filters if any
    if brand_filter or category_filter:
        matching_products = []
        
        for product in PRODUCT_DATABASE:
            product_name = product.get("product_name", "").lower()
            
            # Apply brand filter if present
            if brand_filter and brand_filter not in product_name:
                continue
                
            # Apply category filter if present
            if category_filter and not any(keyword in product_name for keyword in categories.get(category_filter, [])):
                continue
                
            matching_products.append(product)
        
        # Return results
        if matching_products:
            if len(matching_products) > 10:
                # If too many matches, return a summary with the first 5
                result = f"Ich habe {len(matching_products)} passende Produkte gefunden. Hier sind die ersten 5:"
                for product in matching_products[:5]:
                    status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR | {status_text} | {product.get('url', '')}"
                return result
            else:
                # Return detailed information for up to 10 products
                result = f"Ich habe {len(matching_products)} passende Produkte gefunden:"
                for product in matching_products[:10]:
                    status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR | {status_text} | {product.get('url', '')}"
                return result
        else:
            if brand_filter and category_filter:
                return f"Ich konnte keine {category_filter} Produkte von {brand_filter} finden."
            elif brand_filter:
                return f"Ich konnte keine Produkte von {brand_filter} finden."
            else:
                return f"Ich konnte keine {category_filter} Produkte finden."
    
    return None

def check_price_range_request(text):
    """Check if the user is asking for products in a specific price range."""
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
                elif any(keyword in text for keyword in ['über', 'mehr', 'over', 'more than', 'üzerinde', 'fazla']):
                    min_price = price
            else:
                # Range patterns with two values
                min_price = int(match.group(1))
                max_price = int(match.group(2))
            
            break
    
    # If we found a price range, filter products
    if min_price is not None or max_price is not None:
        matching_products = []
        
        for product in PRODUCT_DATABASE:
            price = product.get("price_eur", 0)
            if isinstance(price, str):
                price = float(price.replace('€', '').replace(',', '.').strip())
            
            # Apply min price filter if present
            if min_price is not None and price < min_price:
                continue
                
            # Apply max price filter if present
            if max_price is not None and price > max_price:
                continue
                
            matching_products.append(product)
        
        # Return results
        if matching_products:
            if len(matching_products) > 10:
                # If too many matches, return a summary with the first 5
                result = f"Ich habe {len(matching_products)} Produkte in diesem Preisbereich gefunden. Hier sind die ersten 5:"
                for product in matching_products[:5]:
                    status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR | {status_text} | {product.get('url', '')}"
                return result
            else:
                # Return detailed information for up to 10 products
                result = f"Ich habe {len(matching_products)} Produkte in diesem Preisbereich gefunden:"
                for product in matching_products[:10]:
                    status_text = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR | {status_text} | {product.get('url', '')}"
                return result
        else:
            if min_price is not None and max_price is not None:
                return f"Ich konnte keine Produkte zwischen {min_price}€ und {max_price}€ finden."
            elif min_price is not None:
                return f"Ich konnte keine Produkte über {min_price}€ finden."
            else:
                return f"Ich konnte keine Produkte unter {max_price}€ finden."
    
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
                    
                    # Send response back to WhatsApp
                    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
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
