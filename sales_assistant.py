#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re
import random
from woocommerce_client import woocommerce
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('sales_assistant')

# Sales-related phrases in different languages
SALES_PHRASES = {
    'de': {
        'greetings': [
            "Wie kann ich Ihnen heute bei der Auswahl eines Produkts helfen?",
            "Wonach suchen Sie heute? Ich helfe Ihnen gerne!",
            "Haben Sie besondere Anforderungen an das Produkt, das Sie suchen?"
        ],
        'offers': [
            "Wir haben aktuell tolle Angebote für {}!",
            "Ich kann Ihnen {} empfehlen - eines unserer beliebtesten Produkte!",
            "Viele Kunden entscheiden sich für {} - eine ausgezeichnete Wahl!"
        ],
        'recommendations': [
            "Basierend auf Ihren Anforderungen würde ich {} empfehlen.",
            "Für Ihren Anwendungsfall wäre {} ideal.",
            "Haben Sie schon {} in Betracht gezogen? Es würde perfekt zu Ihren Anforderungen passen."
        ],
        'category_intro': [
            "In unserer Kategorie {} finden Sie eine große Auswahl an Produkten.",
            "Wir haben verschiedene Produkte in der Kategorie {}.",
            "Unsere {}-Kategorie bietet hochwertige Lösungen für Ihre Anforderungen."
        ],
        'follow_up': [
            "Haben Sie weitere Fragen zu diesem Produkt?",
            "Kann ich Ihnen mit weiteren Details zu diesem Produkt helfen?",
            "Benötigen Sie weitere Informationen, um eine Entscheidung zu treffen?"
        ],
        'closing': [
            "Soll ich Ihnen bei der Bestellung helfen?",
            "Wenn Sie bereit sind zu bestellen, können Sie direkt über den Link zum Produkt gehen oder uns anrufen.",
            "Für eine Bestellung oder weitere Beratung stehen wir Ihnen gerne zur Verfügung."
        ]
    },
    'en': {
        'greetings': [
            "How can I help you select a product today?",
            "What are you looking for today? I'm here to help!",
            "Do you have any specific requirements for the product you're looking for?"
        ],
        'offers': [
            "We currently have great offers on {}!",
            "I can recommend {} - one of our most popular products!",
            "Many customers choose {} - an excellent choice!"
        ],
        'recommendations': [
            "Based on your requirements, I would recommend {}.",
            "For your application, {} would be ideal.",
            "Have you considered {}? It would perfectly match your requirements."
        ],
        'category_intro': [
            "In our {} category, you'll find a wide selection of products.",
            "We have various products in the {} category.",
            "Our {} category offers high-quality solutions for your requirements."
        ],
        'follow_up': [
            "Do you have any further questions about this product?",
            "Can I help you with more details about this product?",
            "Do you need more information to make a decision?"
        ],
        'closing': [
            "Would you like me to help you with placing an order?",
            "When you're ready to order, you can go directly through the product link or call us.",
            "We're available to assist you with placing an order or providing further advice."
        ]
    },
    'tr': {
        'greetings': [
            "Bugün size ürün seçiminde nasıl yardımcı olabilirim?",
            "Bugün ne arıyorsunuz? Size yardımcı olmak için buradayım!",
            "Aradığınız ürün için özel gereksinimleriniz var mı?"
        ],
        'offers': [
            "{} için harika tekliflerimiz var!",
            "Size {} önerebilirim - en popüler ürünlerimizden biri!",
            "Birçok müşterimiz {} tercih ediyor - mükemmel bir seçim!"
        ],
        'recommendations': [
            "Gereksinimlerinize göre {} öneririm.",
            "Uygulamanız için {} ideal olacaktır.",
            "{} düşündünüz mü? Gereksinimlerinize mükemmel uyum sağlayacaktır."
        ],
        'category_intro': [
            "{} kategorimizde geniş bir ürün yelpazesi bulacaksınız.",
            "{} kategorisinde çeşitli ürünlerimiz var.",
            "{} kategorimiz, gereksinimleriniz için yüksek kaliteli çözümler sunar."
        ],
        'follow_up': [
            "Bu ürün hakkında başka sorularınız var mı?",
            "Bu ürün hakkında daha fazla ayrıntı ile yardımcı olabilir miyim?",
            "Karar vermek için daha fazla bilgiye ihtiyacınız var mı?"
        ],
        'closing': [
            "Sipariş vermenize yardımcı olmamı ister misiniz?",
            "Sipariş vermeye hazır olduğunuzda, doğrudan ürün bağlantısından gidebilir veya bizi arayabilirsiniz.",
            "Sipariş verme veya daha fazla tavsiye konusunda size yardımcı olmak için buradayız."
        ]
    }
}

# Product categories with their IDs from WooCommerce
PRODUCT_CATEGORIES = {
    'Kompressoren': 132,
    'Halbhermetische Kompressoren': 86,
    'Kältesysteme': 74,
    'Expansionsventile': 95,
    'Thermostat': 161,
    'Kühlschranke': 90,
    'Tiefkühlraumtür': 94,
    'Klimageräte-Einheiten': 93
}

def detect_language(text):
    """Detect the language of the input text"""
    # Simple language detection based on common words
    german_words = ['der', 'die', 'das', 'und', 'ist', 'für', 'mit', 'auf', 'kompressor', 'kühlung', 'preis']
    english_words = ['the', 'and', 'is', 'for', 'with', 'on', 'compressor', 'cooling', 'price']
    turkish_words = ['bir', 've', 'için', 'ile', 'bu', 'kompresör', 'soğutma', 'fiyat']
    
    text_lower = text.lower()
    
    german_count = sum(1 for word in german_words if word in text_lower)
    english_count = sum(1 for word in english_words if word in text_lower)
    turkish_count = sum(1 for word in turkish_words if word in text_lower)
    
    if german_count > english_count and german_count > turkish_count:
        return 'de'
    elif english_count > german_count and english_count > turkish_count:
        return 'en'
    elif turkish_count > german_count and turkish_count > english_count:
        return 'tr'
    else:
        # Default to German
        return 'de'

def is_sales_inquiry(text):
    """Detect if the message is a sales inquiry"""
    sales_keywords = {
        'de': ['empfehlen', 'angebot', 'suche', 'kaufen', 'bestellen', 'interesse', 'verfügbar', 'vergleich', 
               'unterschied', 'besser', 'empfehlung', 'welche', 'welcher', 'welches', 'option', 'alternative'],
        'en': ['recommend', 'offer', 'looking for', 'buy', 'order', 'interest', 'available', 'compare', 
               'difference', 'better', 'recommendation', 'which', 'option', 'alternative'],
        'tr': ['öner', 'teklif', 'arıyorum', 'satın', 'sipariş', 'ilgi', 'mevcut', 'karşılaştır', 
               'fark', 'daha iyi', 'tavsiye', 'hangi', 'seçenek', 'alternatif']
    }
    
    # Detect language
    lang = detect_language(text)
    
    # Check for sales keywords in the detected language
    text_lower = text.lower()
    for keyword in sales_keywords[lang]:
        if keyword in text_lower:
            return True
    
    # Check for questions about products or categories
    question_patterns = [
        r'(?:was|welche|welcher|welches|wie).*(?:für|über).*(?:produkt|kategorie|kompressor|kühlung)',  # German
        r'(?:what|which|how).*(?:product|category|compressor|cooling)',  # English
        r'(?:ne|hangi|nasıl).*(?:ürün|kategori|kompresör|soğutma)'  # Turkish
    ]
    
    for pattern in question_patterns:
        if re.search(pattern, text_lower):
            return True
    
    return False

def extract_product_requirements(text):
    """Extract product requirements from the text"""
    requirements = {
        'category': None,
        'brand': None,
        'price_range': None,
        'features': []
    }
    
    # Extract category
    category_patterns = [
        (r'(?:suche|brauche|benötige|interesse\san).*(?:kompressor)', 'Kompressoren'),
        (r'(?:suche|brauche|benötige|interesse\san).*(?:kältesystem)', 'Kältesysteme'),
        (r'(?:suche|brauche|benötige|interesse\san).*(?:ventil)', 'Expansionsventile'),
        (r'(?:suche|brauche|benötige|interesse\san).*(?:thermostat)', 'Thermostat'),
        (r'(?:suche|brauche|benötige|interesse\san).*(?:kühlschrank)', 'Kühlschranke'),
        (r'(?:suche|brauche|benötige|interesse\san).*(?:tür|türe)', 'Tiefkühlraumtür'),
        (r'(?:suche|brauche|benötige|interesse\san).*(?:klimagerät|klima)', 'Klimageräte-Einheiten'),
        
        (r'(?:looking\sfor|need|interested\sin).*(?:compressor)', 'Kompressoren'),
        (r'(?:looking\sfor|need|interested\sin).*(?:cooling\ssystem)', 'Kältesysteme'),
        (r'(?:looking\sfor|need|interested\sin).*(?:valve)', 'Expansionsventile'),
        (r'(?:looking\sfor|need|interested\sin).*(?:thermostat)', 'Thermostat'),
        (r'(?:looking\sfor|need|interested\sin).*(?:refrigerator)', 'Kühlschranke'),
        (r'(?:looking\sfor|need|interested\sin).*(?:door)', 'Tiefkühlraumtür'),
        (r'(?:looking\sfor|need|interested\sin).*(?:air\sconditioner)', 'Klimageräte-Einheiten'),
        
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:kompresör)', 'Kompressoren'),
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:soğutma\ssistemi)', 'Kältesysteme'),
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:valf)', 'Expansionsventile'),
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:termostat)', 'Thermostat'),
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:buzdolabı)', 'Kühlschranke'),
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:kapı)', 'Tiefkühlraumtür'),
        (r'(?:arıyorum|ihtiyacım|ilgileniyorum).*(?:klima)', 'Klimageräte-Einheiten')
    ]
    
    text_lower = text.lower()
    
    for pattern, category in category_patterns:
        if re.search(pattern, text_lower):
            requirements['category'] = category
            break
    
    # Extract brand
    brand_patterns = [
        (r'(?:embraco)', 'Embraco'),
        (r'(?:danfoss)', 'Danfoss'),
        (r'(?:bitzer)', 'Bitzer')
    ]
    
    for pattern, brand in brand_patterns:
        if re.search(pattern, text_lower):
            requirements['brand'] = brand
            break
    
    # Extract price range
    price_patterns = [
        r'(?:unter|weniger\sals|bis\szu)\s(\d+)(?:\s?€|\s?euro)?',  # German: under X€
        r'(?:zwischen|von)\s(\d+)(?:\s?€|\s?euro)?\s(?:bis|und|to)\s(\d+)(?:\s?€|\s?euro)?',  # German: between X€ and Y€
        r'(?:under|less\sthan|up\sto)\s(\d+)(?:\s?€|\s?euro)?',  # English: under X€
        r'(?:between)\s(\d+)(?:\s?€|\s?euro)?\s(?:and|to)\s(\d+)(?:\s?€|\s?euro)?',  # English: between X€ and Y€
        r'(?:altında|daha\saz|kadar)\s(\d+)(?:\s?€|\s?euro)?',  # Turkish: under X€
        r'(?:arasında)\s(\d+)(?:\s?€|\s?euro)?\s(?:ve|ile)\s(\d+)(?:\s?€|\s?euro)?'  # Turkish: between X€ and Y€
    ]
    
    for pattern in price_patterns:
        match = re.search(pattern, text_lower)
        if match:
            if len(match.groups()) == 1:
                # Under X€
                requirements['price_range'] = (0, int(match.group(1)))
            elif len(match.groups()) == 2:
                # Between X€ and Y€
                requirements['price_range'] = (int(match.group(1)), int(match.group(2)))
            break
    
    # Extract features
    feature_patterns = [
        (r'(?:leise|geräuscharm)', 'quiet'),
        (r'(?:energieeffizient|sparsam)', 'energy-efficient'),
        (r'(?:kompakt|klein)', 'compact'),
        (r'(?:leistungsstark|stark)', 'powerful'),
        (r'(?:quiet|low\snoise)', 'quiet'),
        (r'(?:energy.efficient|efficient)', 'energy-efficient'),
        (r'(?:compact|small)', 'compact'),
        (r'(?:powerful|strong)', 'powerful'),
        (r'(?:sessiz)', 'quiet'),
        (r'(?:enerji\sverimli)', 'energy-efficient'),
        (r'(?:kompakt|küçük)', 'compact'),
        (r'(?:güçlü)', 'powerful')
    ]
    
    for pattern, feature in feature_patterns:
        if re.search(pattern, text_lower):
            requirements['features'].append(feature)
    
    return requirements

def get_category_products(category_id, limit=5):
    """Get products from a specific category"""
    if not woocommerce.is_connected:
        logger.error("WooCommerce API not connected")
        return []
    
    try:
        products = woocommerce.get_products(per_page=limit, category=category_id)
        return products
    except Exception as e:
        logger.error(f"Error getting category products: {e}")
        return []

def get_recommended_products(requirements, limit=3):
    """Get recommended products based on requirements"""
    if not woocommerce.is_connected:
        logger.error("WooCommerce API not connected")
        return []
    
    try:
        params = {"per_page": 10}
        
        # Add category filter if specified
        if requirements['category'] and requirements['category'] in PRODUCT_CATEGORIES:
            params["category"] = PRODUCT_CATEGORIES[requirements['category']]
        
        # Add brand filter if specified
        if requirements['brand']:
            # We'll filter by brand manually since WooCommerce API doesn't directly support it
            params["search"] = requirements['brand']
        
        products = woocommerce.get_products(**params)
        
        # Filter by price range if specified
        if requirements['price_range']:
            min_price, max_price = requirements['price_range']
            products = [p for p in products if p.get('price') and float(p['price']) >= min_price and float(p['price']) <= max_price]
        
        # Sort by relevance (this is a simple implementation)
        # In a real system, you'd use a more sophisticated relevance algorithm
        if products:
            # If we have features, prioritize products that might match those features
            if requirements['features']:
                # This is a simple heuristic - in reality, you'd need product feature data
                feature_keywords = {
                    'quiet': ['quiet', 'silent', 'low noise', 'geräuscharm', 'leise'],
                    'energy-efficient': ['energy', 'efficient', 'saving', 'sparsam', 'energieeffizient'],
                    'compact': ['compact', 'small', 'mini', 'kompakt', 'klein'],
                    'powerful': ['powerful', 'strong', 'high performance', 'leistungsstark', 'stark']
                }
                
                # Score products based on feature matches in name and description
                for product in products:
                    product['feature_score'] = 0
                    product_text = (product.get('name', '') + ' ' + product.get('description', '')).lower()
                    
                    for feature in requirements['features']:
                        if feature in feature_keywords:
                            for keyword in feature_keywords[feature]:
                                if keyword in product_text:
                                    product['feature_score'] += 1
                
                # Sort by feature score (descending)
                products.sort(key=lambda p: p.get('feature_score', 0), reverse=True)
        
        # Return top products
        return products[:limit]
    
    except Exception as e:
        logger.error(f"Error getting recommended products: {e}")
        return []

def format_product_recommendation(product, lang='de'):
    """Format a product recommendation message"""
    try:
        name = product['name']
        price = product.get('price', 'N/A')
        url = product.get('permalink', '')
        status = '✅ auf Lager' if product.get('stock_status') == 'instock' else '⚠️ nicht auf Lager'
        
        if lang == 'en':
            status = '✅ in stock' if product.get('stock_status') == 'instock' else '⚠️ out of stock'
        elif lang == 'tr':
            status = '✅ stokta' if product.get('stock_status') == 'instock' else '⚠️ stokta değil'
        
        # Format the message
        message = f"📦 {name}\n"
        message += f"💰 {price} EUR\n"
        message += f"🔹 {status}\n"
        
        if url:
            message += f"🔗 {url}\n"
        
        return message
    except Exception as e:
        logger.error(f"Error formatting product recommendation: {e}")
        return "❌ Error formatting product recommendation"

def format_category_recommendation(category_name, lang='de'):
    """Format a category recommendation message"""
    try:
        category_id = PRODUCT_CATEGORIES.get(category_name)
        if not category_id:
            return f"❌ Category {category_name} not found"
        
        # Get the category URL
        store_url = "https://durmusbaba.de"
        category_url = f"{store_url}/product-category/{category_name.lower().replace(' ', '-')}/"
        
        # Format the message based on language
        if lang == 'de':
            message = f"🔍 Kategorie: {category_name}\n"
            message += f"🔗 Alle Produkte in dieser Kategorie ansehen: {category_url}\n"
        elif lang == 'en':
            message = f"🔍 Category: {category_name}\n"
            message += f"🔗 View all products in this category: {category_url}\n"
        elif lang == 'tr':
            message = f"🔍 Kategori: {category_name}\n"
            message += f"🔗 Bu kategorideki tüm ürünleri görüntüle: {category_url}\n"
        else:
            message = f"🔍 Category: {category_name}\n"
            message += f"🔗 View all products in this category: {category_url}\n"
        
        return message
    except Exception as e:
        logger.error(f"Error formatting category recommendation: {e}")
        return "❌ Error formatting category recommendation"

def handle_sales_inquiry(text, user_id=None):
    """Handle a sales inquiry and generate a response"""
    try:
        # Detect language
        lang = detect_language(text)
        
        # Extract product requirements
        requirements = extract_product_requirements(text)
        
        # Generate response based on the requirements
        response = ""
        
        # Add a greeting if this is likely a new conversation
        if "hello" in text.lower() or "hallo" in text.lower() or "merhaba" in text.lower():
            response += random.choice(SALES_PHRASES[lang]['greetings']) + "\n\n"
        
        # If a specific category was mentioned, recommend that category
        if requirements['category']:
            category_name = requirements['category']
            response += random.choice(SALES_PHRASES[lang]['category_intro']).format(category_name) + "\n\n"
            response += format_category_recommendation(category_name, lang) + "\n\n"
            
            # Get and recommend products from this category
            category_id = PRODUCT_CATEGORIES.get(category_name)
            if category_id:
                products = get_category_products(category_id, limit=3)
                if products:
                    response += random.choice(SALES_PHRASES[lang]['offers']).format(category_name) + "\n\n"
                    for product in products:
                        response += format_product_recommendation(product, lang) + "\n"
        
        # If specific requirements were provided, recommend matching products
        elif requirements['brand'] or requirements['price_range'] or requirements['features']:
            products = get_recommended_products(requirements, limit=3)
            if products:
                if requirements['brand']:
                    response += random.choice(SALES_PHRASES[lang]['offers']).format(requirements['brand']) + "\n\n"
                else:
                    # Use a generic phrase if no specific brand was mentioned
                    if lang == 'de':
                        response += "Hier sind einige Produkte, die Ihren Anforderungen entsprechen:\n\n"
                    elif lang == 'en':
                        response += "Here are some products that match your requirements:\n\n"
                    else:  # Turkish
                        response += "İşte gereksinimlerinize uygun bazı ürünler:\n\n"
                
                for product in products:
                    response += format_product_recommendation(product, lang) + "\n"
        
        # If no specific requirements were found, recommend popular categories
        else:
            # List popular categories
            if lang == 'de':
                response += "Hier sind unsere beliebtesten Produktkategorien:\n\n"
            elif lang == 'en':
                response += "Here are our most popular product categories:\n\n"
            else:  # Turkish
                response += "İşte en popüler ürün kategorilerimiz:\n\n"
            
            # List top 3 categories
            top_categories = ['Kompressoren', 'Kältesysteme', 'Thermostat']
            for category in top_categories:
                response += format_category_recommendation(category, lang) + "\n"
        
        # Add a follow-up question
        response += "\n" + random.choice(SALES_PHRASES[lang]['follow_up'])
        
        return response
    
    except Exception as e:
        logger.error(f"Error handling sales inquiry: {e}")
        return "❌ Error handling sales inquiry"

def test_sales_assistant():
    """Test the sales assistant functionality"""
    test_queries = [
        "Ich suche einen leisen Kompressor unter 200 Euro",
        "Can you recommend a powerful Embraco compressor?",
        "Danfoss marka bir kompresör arıyorum",
        "Welche Kältesysteme habt ihr?",
        "I need a thermostat for my refrigerator"
    ]
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        print("-" * 50)
        print(f"Is sales inquiry: {'Yes' if is_sales_inquiry(query) else 'No'}")
        print(f"Detected language: {detect_language(query)}")
        print(f"Requirements: {extract_product_requirements(query)}")
        print("-" * 50)
        print(handle_sales_inquiry(query))
        print("=" * 50)

if __name__ == "__main__":
    test_sales_assistant() 