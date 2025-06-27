#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from woocommerce_client import woocommerce
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def test_woocommerce_connection():
    """Test the connection to WooCommerce API"""
    print("Testing WooCommerce API connection...")
    if woocommerce.is_connected:
        print("✅ Successfully connected to WooCommerce API")
        return True
    else:
        print("❌ Failed to connect to WooCommerce API")
        return False

def test_get_products():
    """Test retrieving products from WooCommerce"""
    if not woocommerce.is_connected:
        print("❌ Not connected to WooCommerce API")
        return
    
    print("\nRetrieving products from WooCommerce...")
    products = woocommerce.get_products(per_page=5)
    
    if products:
        print(f"✅ Successfully retrieved {len(products)} products:")
        for product in products:
            print(f"  - {product['name']} (Price: {product.get('price', 'N/A')} EUR)")
            print(f"    SKU: {product.get('sku', 'N/A')}")
            print(f"    Status: {product.get('stock_status', 'N/A')}")
            print(f"    URL: {product.get('permalink', 'N/A')}")
            print()
    else:
        print("❌ No products found or error retrieving products")

def test_search_product():
    """Test searching for a product by name"""
    if not woocommerce.is_connected:
        print("❌ Not connected to WooCommerce API")
        return
    
    search_term = "Embraco"
    print(f"\nSearching for products with term: '{search_term}'...")
    products = woocommerce.search_products_by_name(search_term)
    
    if products:
        print(f"✅ Found {len(products)} products matching '{search_term}':")
        for product in products:
            print(f"  - {product['name']} (Price: {product.get('price', 'N/A')} EUR)")
    else:
        print(f"❌ No products found matching '{search_term}'")

def test_get_categories():
    """Test retrieving product categories"""
    if not woocommerce.is_connected:
        print("❌ Not connected to WooCommerce API")
        return
    
    print("\nRetrieving product categories...")
    categories = woocommerce.get_product_categories()
    
    if categories:
        print(f"✅ Successfully retrieved {len(categories)} categories:")
        for category in categories:
            print(f"  - {category['name']} (ID: {category['id']}, Count: {category['count']})")
    else:
        print("❌ No categories found or error retrieving categories")

def test_get_orders():
    """Test retrieving orders"""
    if not woocommerce.is_connected:
        print("❌ Not connected to WooCommerce API")
        return
    
    print("\nRetrieving recent orders...")
    # This would normally use customer email or phone, but for testing we'll just get recent orders
    # You would use: woocommerce.get_customer_orders(email="customer@example.com")
    
    # For testing, we'll try to get orders directly
    try:
        response = woocommerce.wcapi.get("orders", params={"per_page": 5})
        if response.status_code == 200:
            orders = response.json()
            if orders:
                print(f"✅ Successfully retrieved {len(orders)} recent orders:")
                for order in orders:
                    print(f"  - Order #{order['id']} - {order['date_created']}")
                    print(f"    Status: {order['status']}")
                    print(f"    Total: {order['total']} {order['currency']}")
                    print(f"    Items: {len(order['line_items'])}")
                    print()
            else:
                print("❌ No recent orders found")
        else:
            print(f"❌ Error retrieving orders: {response.status_code}")
    except Exception as e:
        print(f"❌ Exception retrieving orders: {str(e)}")

if __name__ == "__main__":
    # Add WooCommerce credentials to environment if not already set
    if not os.getenv("WC_CONSUMER_KEY"):
        os.environ["WC_CONSUMER_KEY"] = "ck_313cc3441e512568445f6148575e6c24813d1909"
    if not os.getenv("WC_CONSUMER_SECRET"):
        os.environ["WC_CONSUMER_SECRET"] = "cs_4fcbb1049c276a7e00ebd659c4c19ebf86055467"
    if not os.getenv("WC_STORE_URL"):
        os.environ["WC_STORE_URL"] = "https://durmusbaba.de"
    
    # Run tests
    if test_woocommerce_connection():
        test_get_products()
        test_search_product()
        test_get_categories()
        test_get_orders()
    else:
        print("Skipping tests due to connection failure") 