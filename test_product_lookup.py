import json
import sys

def load_product_database():
    try:
        with open('durmusbaba_products_chatbot.json', 'r', encoding='utf-8') as f:
            products = json.load(f)
            print(f"Product database loaded successfully. {len(products)} products found.")
            return products
    except Exception as e:
        print(f"Error loading product database: {e}")
        return []

def find_exact_product(text, products):
    """Find a product by its exact name in the database."""
    # Clean up the input text
    cleaned_text = text.strip()
    
    print(f"Looking for product matching: '{cleaned_text}'")
    
    # First try exact match
    for product in products:
        if product['product_name'].lower() == cleaned_text.lower():
            print("Found exact match!")
            return product
    
    # If no exact match, try to find products where the name is contained in the query
    # or the query contains the full product name
    for product in products:
        product_name = product['product_name'].lower()
        if product_name in cleaned_text.lower() or cleaned_text.lower() in product_name:
            # Check if it's a substantial match (at least 80% of the product name)
            if len(product_name) >= 5 and (
                len(product_name) >= 0.8 * len(cleaned_text) or 
                len(cleaned_text) >= 0.8 * len(product_name)
            ):
                print("Found substantial match!")
                return product
    
    # If still no match, try to match product model numbers
    # Many products have model numbers like "EMY 80 CLP" or "NEK 6160 Z"
    words = cleaned_text.split()
    for word in words:
        if len(word) >= 3 and any(c.isdigit() for c in word):
            print(f"Checking model number: {word}")
            for product in products:
                if word in product['product_name']:
                    print(f"Found match by model number: {word}")
                    return product
    
    return None

def main():
    products = load_product_database()
    if not products:
        print("Failed to load product database.")
        sys.exit(1)
    
    # Test cases
    test_queries = [
        "Embraco EMY 80 CLP",
        "EMY 80 CLP",
        "EMY 80",
        "Was kostet Embraco EMY 80 CLP",
        "Preis für EMY 80 CLP",
        "EMY 80 CLP fiyatı ne kadar",
        "How much is EMY 80 CLP"
    ]
    
    print("\nTesting product lookup functionality:")
    print("-" * 50)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        product = find_exact_product(query, products)
        if product:
            status = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
            print(f"✅ Found: {product['product_name']} - {product['price_eur']} EUR")
            print(f"Status: {status}")
            print(f"URL: {product.get('url', 'No URL available')}")
        else:
            print(f"❌ No match found")
        print("-" * 50)

if __name__ == "__main__":
    main() 