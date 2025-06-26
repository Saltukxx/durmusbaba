import json
import sys
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
    """Find a product by its exact name or partial match in the database."""
    # Clean up the input text
    cleaned_text = text.strip()
    
    print(f"Looking for product matching: '{cleaned_text}'")
    
    # First try exact match
    for product in products:
        if product['product_name'].lower() == cleaned_text.lower():
            print("Found exact match!")
            return product
    
    # Preprocess the query to handle common variations
    # Handle concatenated model numbers like "EMY80CLP" -> "EMY 80 CLP"
    preprocessed_text = cleaned_text
    
    # Pattern for model numbers without spaces like "EMY80CLP" or "NEK6160Z"
    pattern_nospace = r'([A-Za-z]{2,4})(\d+)([A-Za-z]{0,4})'
    preprocessed_text = re.sub(pattern_nospace, r'\1 \2 \3', preprocessed_text)
    
    if preprocessed_text != cleaned_text:
        print(f"Preprocessed query to: '{preprocessed_text}'")
        
        # If preprocessing changed the text, try exact match again with the preprocessed text
        for product in products:
            if product['product_name'].lower() == preprocessed_text.lower():
                print("Found exact match with preprocessed text!")
                return product
    
    # If no exact match, try to find products where the name is contained in the query
    # or the query contains the full product name
    potential_matches = []
    for product in products:
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
    if potential_matches:
        best_match = potential_matches[0]
        print(f"Found match with score {best_match[1]}")
        return best_match[0]
    
    # If we still haven't found a match, try to match individual words that might be model numbers
    words = cleaned_text.split() + preprocessed_text.split()
    for word in words:
        if len(word) >= 2 and any(c.isdigit() for c in word):
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
    
    # Test cases - from simple to challenging
    test_queries = [
        # Exact matches
        "Embraco EMY 80 CLP",
        # Partial model numbers
        "EMY 80",
        "NEK 6160",
        # Just numbers
        "6160",
        "80 CLP",
        # Misspelled or incomplete
        "Embracco EMY80",
        "EMY80CLP",
        "embraco emy",
        # With context
        "Was kostet Embraco EMY 80 CLP",
        "Preis für EMY 80 CLP",
        "EMY 80 CLP fiyatı ne kadar",
        "How much is EMY 80 CLP",
        # Very short queries
        "EMY",
        "CLP",
        # Brand only
        "Danfoss",
        # Generic terms
        "kompressor",
        # Challenging cases
        "EMY80 price",
        "emy80clp",
        "I need a price for EMY80"
    ]
    
    print("\nTesting product lookup functionality:")
    print("-" * 50)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        product = find_exact_product(query, products)
        if product:
            print(f"✅ Found: {product['product_name']} - {product['price_eur']} EUR")
        else:
            print(f"❌ No match found")
        print("-" * 50)

if __name__ == "__main__":
    main() 