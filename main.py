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
            - WICHTIG: Verwende NIEMALS Platzhalter wie "[Bitte geben Sie den Preis ein]" oder ähnliches
            - Wenn du die Produktinformationen nicht kennst, sage ehrlich, dass du das Produkt nicht finden konntest
            - Verwende IMMER die tatsächlichen Daten aus der Datenbank, nicht Vorlagen oder Platzhalter
            - Verwende NIEMALS eckige Klammern wie [Produktname] oder [Preis] in deinen Antworten
            - Wenn du unsicher bist, ob ein Produkt existiert, sage, dass du es nicht finden konntest
            
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
            
            # For product queries, we'll handle the response directly to avoid template responses
            # This is especially important for cases where Gemini might generate placeholders
            return product_info
        
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
                return "Üzgünüm, bu ürün hakkında bilgi bulamadım. Lütfen ürün adını kontrol edin veya başka bir ürün sorun."
            elif any(word in text.lower() for word in ['price', 'cost', 'how much']):
                # English
                return "I'm sorry, I couldn't find information about this product. Please check the product name or ask about a different product."
            else:
                # Default to German
                return "Es tut mir leid, ich konnte keine Informationen zu diesem Produkt finden. Bitte überprüfen Sie den Produktnamen oder fragen Sie nach einem anderen Produkt."
        
        print(f"Gemini response: {response_text}")
        return response_text
    except Exception as e:
        print(f"Error in get_gemini_response: {e}")
        traceback.print_exc()
        return f"Üzgünüm, bir hata oluştu: {str(e)}"

def find_exact_product(text):
    """Find a product by its exact name or a close match in the database."""
    # Clean up the input text
    cleaned_text = text.strip()
    print(f"Looking for product matching: '{cleaned_text}'")
    
    # Normalize the query: remove spaces, convert to lowercase
    query_normalized = cleaned_text.lower().replace(" ", "").replace("-", "")
    
    # 1. First try exact match (case-insensitive)
    for product in PRODUCT_DATABASE:
        if product['product_name'].lower() == cleaned_text.lower():
            print("Found exact match!")
            return product
    
    # 2. Try with normalized names (remove spaces, hyphens)
    for product in PRODUCT_DATABASE:
        product_normalized = product['product_name'].lower().replace(" ", "").replace("-", "")
        if product_normalized == query_normalized:
            print(f"Found match after normalization! (removed spaces/hyphens)")
            return product
    
    # 3. Check if query is fully contained in product name or vice versa
    # This helps with queries like "DCB31" matching "DCB31 - Dijital"
    for product in PRODUCT_DATABASE:
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
            for product in PRODUCT_DATABASE:
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
            for product in PRODUCT_DATABASE:
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
            
            for product in PRODUCT_DATABASE:
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
            return f"Produktinformation:\n- {direct_product['product_name']}: {direct_product['price_eur']} EUR | {status_text} | {direct_product.get('url', '')}"
        
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
    for product in PRODUCT_DATABASE:
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
