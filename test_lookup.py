import json
import re

def load_product_database():
    try:
        with open('produkt_preise_db.json', 'r', encoding='utf-8') as f:
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
        print(f"Extracted potential models: {potential_models}")
        for model in potential_models:
            for product in products:
                if model.lower() in product['product_name'].lower():
                    print(f"Found match by model: {model}")
                    return product
    
    # If still no match, try to match individual words that might be model numbers
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
    # Load the product database
    try:
        with open('durmusbaba_products_chatbot.json', 'r', encoding='utf-8') as f:
            products = json.load(f)
            print(f"Product database loaded successfully. {len(products)} products found.")
    except Exception as e:
        print(f"Error loading product database: {e}")
        return
    
    # Print the first 3 products with their details
    print("\nSample products:")
    print("-" * 50)
    
    for product in products[:3]:
        print(f"Product: {product['product_name']}")
        print(f"Price: {product['price_eur']} EUR")
        print(f"Status: {product.get('status', 'unknown')}")
        print(f"URL: {product.get('url', 'No URL available')}")
        print("-" * 50)
    
    # Test looking up a specific product
    test_product = "Embraco EMY 80 CLP"
    print(f"\nLooking for product: {test_product}")
    
    found = False
    for product in products:
        if product['product_name'] == test_product:
            found = True
            print(f"Found product: {product['product_name']}")
            print(f"Price: {product['price_eur']} EUR")
            print(f"Status: {product.get('status', 'unknown')}")
            print(f"URL: {product.get('url', 'No URL available')}")
            break
    
    if not found:
        print(f"Product '{test_product}' not found.")

if __name__ == "__main__":
    main() 