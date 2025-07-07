from main import find_exact_product, load_product_database

def test_product_lookup():
    # Load the product database
    products = load_product_database()
    
    # Test cases
    test_queries = [
        "Embraco EMY 80 CLP",
        "EMY 80 CLP",
        "EMY 80",
        "Was kostet Embraco EMY 80 CLP"
    ]
    
    print("\nTesting product lookup functionality:")
    print("-" * 50)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        product = find_exact_product(query)
        if product:
            status = "auf Lager" if product.get('status') == "instock" else "nicht auf Lager"
            print(f"Found: {product['product_name']}")
            print(f"Price: {product['price_eur']} EUR")
            print(f"Status: {status}")
            print(f"URL: {product.get('url', 'No URL available')}")
        else:
            print(f"No match found")
        print("-" * 50)

if __name__ == "__main__":
    test_product_lookup() 