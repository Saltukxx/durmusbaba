#!/usr/bin/env python
# -*- coding: utf-8 -*-

from woocommerce_client import woocommerce
from main import find_exact_product
import sys

def install_dependencies():
    """Install required dependencies if they're not already installed"""
    try:
        import fuzzywuzzy
    except ImportError:
        print("Installing required dependencies...")
        import subprocess
        subprocess.check_call([sys.executable, "-m", "pip", "install", "fuzzywuzzy", "python-Levenshtein"])
        print("Dependencies installed successfully.")

def test_advanced_search():
    """Test the advanced product search functionality"""
    test_queries = [
        "9238",
        "embraco 9238",
        "nj9238",
        "NJ 9238",
        "danfoss sz185",
        "DCB31",
        "thermostat dcb",
        "emy 80",
        "FF 8.5"
    ]
    
    print("\nTesting advanced product search:")
    print("-" * 70)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        results = woocommerce.advanced_product_search(query, limit=3)
        
        if results:
            print(f"✅ Found {len(results)} results:")
            for i, product in enumerate(results, 1):
                print(f"  {i}. {product['name']} - {product.get('price', 'N/A')} EUR")
                print(f"     SKU: {product.get('sku', 'N/A')}")
                print(f"     URL: {product.get('permalink', 'N/A')}")
        else:
            print("❌ No results found")
        
        print("-" * 70)

def test_find_exact_product():
    """Test the find_exact_product function with the improved search"""
    test_queries = [
        "9238",
        "embraco 9238",
        "nj9238",
        "NJ 9238",
        "danfoss sz185",
        "DCB31",
        "thermostat dcb",
        "emy 80",
        "FF 8.5"
    ]
    
    print("\nTesting find_exact_product function:")
    print("-" * 70)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        product = find_exact_product(query)
        
        if product:
            print(f"✅ Found product:")
            print(f"  Name: {product['product_name']}")
            print(f"  Price: {product['price_eur']} EUR")
            print(f"  Status: {product['status']}")
            print(f"  URL: {product.get('url', 'N/A')}")
        else:
            print("❌ No product found")
        
        print("-" * 70)

def compare_search_methods():
    """Compare the old search method with the new advanced search"""
    test_queries = [
        "9238",
        "embraco 9238",
        "nj9238",
        "NJ 9238",
        "danfoss sz185",
        "DCB31",
        "thermostat dcb",
        "emy 80",
        "FF 8.5"
    ]
    
    print("\nComparing search methods:")
    print("-" * 70)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        
        # Old method
        old_results = woocommerce.search_products_by_name(query)
        
        # New method
        new_results = woocommerce.advanced_product_search(query, limit=3)
        
        print("Old search method results:")
        if old_results:
            print(f"  Found {len(old_results)} results")
            for i, product in enumerate(old_results[:2], 1):  # Show top 2 for brevity
                print(f"  {i}. {product['name']}")
        else:
            print("  No results found")
        
        print("\nNew advanced search method results:")
        if new_results:
            print(f"  Found {len(new_results)} results")
            for i, product in enumerate(new_results[:2], 1):  # Show top 2 for brevity
                print(f"  {i}. {product['name']}")
        else:
            print("  No results found")
        
        print("-" * 70)

if __name__ == "__main__":
    # Install dependencies if needed
    install_dependencies()
    
    # Run tests
    if woocommerce.is_connected:
        test_advanced_search()
        test_find_exact_product()
        compare_search_methods()
    else:
        print("❌ WooCommerce API not connected. Please check your credentials.") 