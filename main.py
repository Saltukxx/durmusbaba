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
        with open('produkt_preise_db.json', 'r', encoding='utf-8') as f:
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
            
            # Detect language and format response accordingly
            if any(word in text.lower() for word in ['fiyat', 'fiyatı', 'kaç', 'ne kadar']):
                # Turkish
                return f"{product_name} fiyatı: {price} EUR"
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                return f"The price of {product_name} is {price} EUR"
            else:
                # Default to German
                return f"Der Preis für {product_name} beträgt {price} EUR"
        
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
    """Find a product by its exact name or partial match in the database."""
    # Clean up the input text
    cleaned_text = text.strip()
    
    # First try exact match
    for product in PRODUCT_DATABASE:
        if product['product_name'].lower() == cleaned_text.lower():
            return product
    
    # Preprocess the query to handle common variations
    # Handle concatenated model numbers like "EMY80CLP" -> "EMY 80 CLP"
    preprocessed_text = cleaned_text
    
    # Pattern for model numbers without spaces like "EMY80CLP" or "NEK6160Z"
    pattern_nospace = r'([A-Za-z]{2,4})(\d+)([A-Za-z]{0,4})'
    preprocessed_text = re.sub(pattern_nospace, r'\1 \2 \3', preprocessed_text)
    
    # If preprocessing changed the text, try exact match again with the preprocessed text
    if preprocessed_text != cleaned_text:
        for product in PRODUCT_DATABASE:
            if product['product_name'].lower() == preprocessed_text.lower():
                return product
    
    # If no exact match, try to find products where the name is contained in the query
    # or the query contains the full product name
    potential_matches = []
    for product in PRODUCT_DATABASE:
        product_name = product['product_name'].lower()
        cleaned_text_lower = cleaned_text.lower()
        preprocessed_text_lower = preprocessed_text.lower()
        
        # Calculate similarity score based on several factors
        score = 0
        
        # Direct substring match
        if product_name in cleaned_text_lower or cleaned_text_lower in product_name:
            score += 10
        elif product_name in preprocessed_text_lower or preprocessed_text_lower in product_name:
            score += 8
            
        # Check if it's a substantial match (at least 80% of the product name)
        if len(product_name) >= 5 and (
            len(product_name) >= 0.8 * len(cleaned_text) or 
            len(cleaned_text) >= 0.8 * len(product_name)
        ):
            score += 20
        
        # Word-level matching
        product_words = product_name.split()
        query_words = cleaned_text_lower.split()
        preprocessed_words = preprocessed_text_lower.split()
        
        # Count matching words
        matching_words = 0
        for word in query_words:
            if len(word) >= 3 and word in product_words:
                matching_words += 1
                score += 5
        
        # Also try with preprocessed words
        for word in preprocessed_words:
            if len(word) >= 3 and word in product_words and word not in query_words:
                matching_words += 1
                score += 4  # Slightly lower score for preprocessed matches
        
        # Bonus for matching a high percentage of words
        if matching_words > 0:
            word_match_percentage = matching_words / max(len(query_words), len(preprocessed_words))
            score += int(word_match_percentage * 15)
        
        # Model number detection (higher weight)
        # Pattern for model numbers like "EMY 80 CLP" or "NEK 6160 Z"
        pattern1 = r'([A-Za-z]{2,4})\s+(\d+)\s*([A-Za-z]{0,4})'
        product_models = re.findall(pattern1, product_name)
        query_models = re.findall(pattern1, cleaned_text_lower)
        preprocessed_models = re.findall(pattern1, preprocessed_text_lower)
        
        # Check for model number matches
        all_query_models = query_models + preprocessed_models
        for q_model in all_query_models:
            q_model_str = ' '.join(q_model).strip()
            for p_model in product_models:
                p_model_str = ' '.join(p_model).strip()
                if q_model_str == p_model_str:
                    score += 30  # Exact model match is highly valuable
                elif q_model_str in p_model_str or p_model_str in q_model_str:
                    score += 20  # Partial model match
        
        # Check for individual number matches (like part numbers)
        product_numbers = [word for word in product_words if any(c.isdigit() for c in word)]
        query_numbers = [word for word in query_words if any(c.isdigit() for c in word)]
        preprocessed_numbers = [word for word in preprocessed_words if any(c.isdigit() for c in word)]
        
        all_query_numbers = query_numbers + [n for n in preprocessed_numbers if n not in query_numbers]
        for q_num in all_query_numbers:
            if len(q_num) >= 2:  # Lowered threshold to catch more matches
                for p_num in product_numbers:
                    if q_num == p_num:
                        score += 25  # Exact number match
                    elif q_num in p_num or p_num in q_num:
                        score += 15  # Partial number match
        
        # Brand name detection
        brands = ["embraco", "bitzer", "danfoss", "secop", "copeland", "tecumseh", "ebm", "ebmpapst", "york"]
        for brand in brands:
            if brand in product_name:
                if brand in cleaned_text_lower:
                    score += 15  # Brand match is valuable
                elif brand.lower() in cleaned_text_lower:  # Case insensitive match
                    score += 10
        
        # Handle common misspellings of brands
        misspellings = {
            "embracco": "embraco", 
            "embracho": "embraco",
            "danfos": "danfoss", 
            "danfoss": "danfoss",
            "bitzer": "bitzer",
            "bitser": "bitzer"
        }
        
        for misspelled, correct in misspellings.items():
            if misspelled in cleaned_text_lower and correct in product_name:
                score += 8  # Misspelled brand still counts
        
        # If we have any kind of match, add to potential matches
        if score > 0:
            potential_matches.append((product, score))
    
    # Sort by score (highest first)
    potential_matches.sort(key=lambda x: x[1], reverse=True)
    
    # Return the best match if we have one with a minimum threshold
    if potential_matches and potential_matches[0][1] >= 10:  # Minimum threshold
        return potential_matches[0][0]
    
    # If we still haven't found a match, try to match individual words that might be model numbers
    words = cleaned_text.split() + preprocessed_text.split()
    for word in words:
        if len(word) >= 2 and any(c.isdigit() for c in word):
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
    
    # First, try to find an exact product match
    exact_product = find_exact_product(text)
    if exact_product:
        # If we found an exact match, return its information directly
        product_name = exact_product['product_name']
        price = exact_product['price_eur']
        
        # Detect language to format response appropriately
        if any(word in text_lower for word in ["fiyat", "fiyatı", "ne kadar", "kaç", "tl", "lira"]):
            return f"{product_name} fiyatı: {price} EUR"
        elif any(word in text_lower for word in ["price", "cost", "how much", "what is the price"]):
            return f"The price of {product_name} is {price} EUR"
        else:
            return f"Der Preis für {product_name} beträgt {price} EUR"
    
    # Check if the message contains any product keywords
    is_product_query = any(keyword in text_lower for keyword in product_keywords)
    
    if is_product_query or len(text_lower) >= 3:  # Also check short queries that might be just product names
        # Check for category filtering requests
        category_request = check_category_request(text_lower)
        if category_request:
            return category_request
        
        # Check for price range filtering
        price_range_request = check_price_range_request(text_lower)
        if price_range_request:
            return price_range_request
        
        # Search for product matches by name with scoring
        matching_products = []
        for product in PRODUCT_DATABASE:
            product_name = product.get("product_name", "").lower()
            score = 0
            
            # Check for direct substring matches
            if text_lower in product_name:
                score += 15
            elif any(term in product_name for term in text_lower.split() if len(term) > 3):
                score += 10
                
            # Check for word-level matches
            product_words = product_name.split()
            query_words = text_lower.split()
            
            matching_words = sum(1 for word in query_words if len(word) > 2 and word in product_words)
            score += matching_words * 5
            
            # Check for model number matches
            product_numbers = [word for word in product_words if any(c.isdigit() for c in word)]
            query_numbers = [word for word in query_words if any(c.isdigit() for c in word)]
            
            for q_num in query_numbers:
                if len(q_num) >= 2 and any(q_num in p_num for p_num in product_numbers):
                    score += 20
            
            # Brand detection
            brands = ["embraco", "bitzer", "danfoss", "secop", "copeland", "tecumseh", "ebm", "ebmpapst", "york"]
            for brand in brands:
                if brand in product_name and brand in text_lower:
                    score += 15
            
            # If we have any kind of match, add to potential matches
            if score > 0:
                matching_products.append((product, score))
        
        # Sort by score (highest first)
        matching_products.sort(key=lambda x: x[1], reverse=True)
        matching_products = [p[0] for p in matching_products]
        
        # If we found matching products, return the information
        if matching_products:
            if len(matching_products) > 5:
                # If too many matches, return the top 5 most relevant
                result = f"Ich habe {len(matching_products)} passende Produkte gefunden. Hier sind die relevantesten:"
                for product in matching_products[:5]:
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
                return result
            else:
                # Return detailed information for up to 5 products
                result = f"Ich habe {len(matching_products)} passende Produkte gefunden:"
                for product in matching_products:
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
                return result
        else:
            # Try a more lenient search if we didn't find anything
            lenient_matches = []
            for product in PRODUCT_DATABASE:
                product_name = product.get("product_name", "").lower()
                
                # Check if any word from the query (min 2 chars) is in the product name
                for term in text_lower.split():
                    if len(term) >= 2 and term in product_name:
                        lenient_matches.append(product)
                        break
            
            if lenient_matches:
                if len(lenient_matches) > 5:
                    return f"Ich habe {len(lenient_matches)} mögliche Übereinstimmungen gefunden. Bitte geben Sie spezifischere Details an."
                else:
                    result = "Meinten Sie eines dieser Produkte?"
                    for product in lenient_matches[:5]:
                        result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
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
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
                return result
            else:
                # Return detailed information for up to 10 products
                result = f"Ich habe {len(matching_products)} passende Produkte gefunden:"
                for product in matching_products[:10]:
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
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
            price = float(product.get("price_eur", "0").replace('€', '').replace(',', '.').strip())
            
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
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
                return result
            else:
                # Return detailed information for up to 10 products
                result = f"Ich habe {len(matching_products)} Produkte in diesem Preisbereich gefunden:"
                for product in matching_products[:10]:
                    result += f"\n- {product['product_name']}: {product['price_eur']} EUR"
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
