#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
from woocommerce import API
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('woocommerce_client')

class WooCommerceClient:
    def __init__(self):
        """Initialize the WooCommerce API client with credentials from environment variables."""
        self.wcapi = None
        self.is_connected = False
        self.connect()
    
    def connect(self):
        """Establish connection to WooCommerce API."""
        try:
            consumer_key = os.getenv("WC_CONSUMER_KEY")
            consumer_secret = os.getenv("WC_CONSUMER_SECRET")
            store_url = os.getenv("WC_STORE_URL", "https://durmusbaba.de")
            
            if not consumer_key or not consumer_secret:
                logger.error("WooCommerce API credentials not found in environment variables")
                return False
            
            self.wcapi = API(
                url=store_url,
                consumer_key=consumer_key,
                consumer_secret=consumer_secret,
                version="wc/v3",
                timeout=30
            )
            
            # Test the connection
            response = self.wcapi.get("products", params={"per_page": 1})
            if response.status_code == 200:
                logger.info("Successfully connected to WooCommerce API")
                self.is_connected = True
                return True
            else:
                logger.error(f"Failed to connect to WooCommerce API: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Error connecting to WooCommerce API: {str(e)}")
            return False
    
    def get_products(self, page=1, per_page=20, search=None, category=None):
        """
        Get products from WooCommerce store
        
        Args:
            page (int): Page number
            per_page (int): Number of products per page
            search (str): Search term
            category (int): Category ID
            
        Returns:
            list: List of products or empty list if error
        """
        if not self.is_connected:
            if not self.connect():
                return []
        
        params = {
            "page": page,
            "per_page": per_page,
            "status": "publish"
        }
        
        if search:
            params["search"] = search
            
        if category:
            params["category"] = category
            
        try:
            response = self.wcapi.get("products", params=params)
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get products: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error getting products: {str(e)}")
            return []
    
    def get_product(self, product_id):
        """
        Get a specific product by ID
        
        Args:
            product_id (int): Product ID
            
        Returns:
            dict: Product data or None if error
        """
        if not self.is_connected:
            if not self.connect():
                return None
        
        try:
            response = self.wcapi.get(f"products/{product_id}")
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get product {product_id}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error getting product {product_id}: {str(e)}")
            return None
    
    def search_products_by_name(self, name):
        """
        Search products by name
        
        Args:
            name (str): Product name to search for
            
        Returns:
            list: List of matching products or empty list if error
        """
        return self.get_products(search=name, per_page=5)
    
    def get_order(self, order_id):
        """
        Get order details by ID
        
        Args:
            order_id (int): Order ID
            
        Returns:
            dict: Order data or None if error
        """
        if not self.is_connected:
            if not self.connect():
                return None
        
        try:
            response = self.wcapi.get(f"orders/{order_id}")
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get order {order_id}: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            logger.error(f"Error getting order {order_id}: {str(e)}")
            return None
    
    def get_customer_orders(self, email=None, phone=None):
        """
        Get orders for a customer by email or phone
        
        Args:
            email (str): Customer email
            phone (str): Customer phone number
            
        Returns:
            list: List of orders or empty list if error
        """
        if not self.is_connected:
            if not self.connect():
                return []
        
        if not email and not phone:
            logger.error("Either email or phone must be provided")
            return []
        
        try:
            # First find the customer
            params = {}
            if email:
                params["email"] = email
            
            customers = []
            if email:
                response = self.wcapi.get("customers", params=params)
                if response.status_code == 200:
                    customers = response.json()
            
            # If no customer found by email and phone is provided, search orders directly
            if not customers and phone:
                # Format phone number for search (remove spaces, +, etc.)
                formatted_phone = ''.join(filter(str.isdigit, phone))
                
                # Search orders with this phone number
                # Note: This is not ideal as WooCommerce API doesn't directly support filtering orders by phone
                # We'll need to get all orders and filter them manually
                all_orders = []
                page = 1
                
                while True:
                    response = self.wcapi.get("orders", params={"page": page, "per_page": 100})
                    if response.status_code != 200 or not response.json():
                        break
                    
                    page_orders = response.json()
                    all_orders.extend(page_orders)
                    
                    if len(page_orders) < 100:
                        break
                    
                    page += 1
                
                # Filter orders by phone number
                matching_orders = []
                for order in all_orders:
                    billing_phone = order.get("billing", {}).get("phone", "")
                    formatted_billing_phone = ''.join(filter(str.isdigit, billing_phone))
                    
                    if formatted_phone in formatted_billing_phone or formatted_billing_phone in formatted_phone:
                        matching_orders.append(order)
                
                return matching_orders
            
            # If customer found by email, get their orders
            if customers:
                customer_id = customers[0]["id"]
                response = self.wcapi.get("orders", params={"customer": customer_id})
                if response.status_code == 200:
                    return response.json()
            
            return []
            
        except Exception as e:
            logger.error(f"Error getting customer orders: {str(e)}")
            return []
    
    def get_product_categories(self):
        """
        Get all product categories
        
        Returns:
            list: List of categories or empty list if error
        """
        if not self.is_connected:
            if not self.connect():
                return []
        
        try:
            response = self.wcapi.get("products/categories", params={"per_page": 100})
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to get categories: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            logger.error(f"Error getting categories: {str(e)}")
            return []

# Create a singleton instance
woocommerce = WooCommerceClient()

def test_connection():
    """Test the WooCommerce connection"""
    client = WooCommerceClient()
    return client.is_connected

if __name__ == "__main__":
    # Test the connection when run directly
    if test_connection():
        print("✅ Successfully connected to WooCommerce API")
        
        # Get some sample data
        client = woocommerce
        products = client.get_products(per_page=5)
        print(f"Found {len(products)} products")
        for product in products:
            print(f"- {product['name']} (${product['price']})")
    else:
        print("❌ Failed to connect to WooCommerce API") 