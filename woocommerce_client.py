#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import re
from woocommerce import API
from dotenv import load_dotenv
import logging
from fuzzywuzzy import fuzz

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
        self.product_cache = {}  # Cache for product data
    
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
            "per_page": per_page
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
    
    def advanced_product_search(self, query, limit=5):
        """
        Advanced product search that handles model numbers and partial queries
        
        Args:
            query (str): Search query
            limit (int): Maximum number of results to return
            
        Returns:
            list: List of matching products sorted by relevance
        """
        if not self.is_connected:
            if not self.connect():
                return []
        
        try:
            # Clean up the query
            query = query.strip().lower()
            
            # Extract potential model numbers from the query
            model_numbers = self._extract_model_numbers(query)
            
            # Try direct search first
            direct_results = self.get_products(search=query, per_page=20)
            
            # If we have model numbers, try searching for each one
            model_results = []
            if model_numbers:
                for model in model_numbers:
                    model_search = self.get_products(search=model, per_page=10)
                    model_results.extend(model_search)
            
            # Combine results
            all_results = direct_results + model_results
            
            # Remove duplicates
            unique_results = {}
            for product in all_results:
                if product['id'] not in unique_results:
                    unique_results[product['id']] = product
            
            # Score and sort results
            scored_results = []
            for product in unique_results.values():
                score = self._calculate_relevance_score(product, query, model_numbers)
                scored_results.append((score, product))
            
            # Sort by score (descending)
            scored_results.sort(key=lambda x: x[0], reverse=True)
            
            # Return top results
            return [product for _, product in scored_results[:limit]]
        
        except Exception as e:
            logger.error(f"Error in advanced product search: {e}")
            return []
    
    def _extract_model_numbers(self, text):
        """
        Extract potential model numbers from text
        
        Args:
            text (str): Text to extract model numbers from
            
        Returns:
            list: List of potential model numbers
        """
        model_numbers = []
        
        # Pattern for model numbers like "EMY 80 CLP", "NEK 6160 Z", "9238"
        patterns = [
            r'([A-Za-z]{2,4})\s*[-]?\s*(\d+)\s*([A-Za-z0-9]{0,6})',  # EMY 80 CLP
            r'([A-Za-z]{2,4})\s*[-]?\s*(\d+[.]\d+)\s*([A-Za-z0-9]{0,6})',  # FF 8.5 HBK
            r'(\d{4,})',  # 9238
            r'([A-Za-z]{1,3})(\d{2,})',  # NJ9238
            r'([A-Za-z]{2,4})[-]?(\d+)',  # DCB-31
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, text)
            for match in matches:
                if isinstance(match, tuple):
                    # Join the parts for multi-part matches
                    model = ''.join(match).strip()
                    if model:
                        model_numbers.append(model)
                        
                        # Also add variations with and without spaces
                        if len(match) > 1:
                            # Add with spaces
                            spaced_model = ' '.join(part for part in match if part).strip()
                            if spaced_model and spaced_model != model:
                                model_numbers.append(spaced_model)
                else:
                    # Single part match
                    model_numbers.append(match)
        
        # Add individual words that might be model numbers
        words = text.split()
        for word in words:
            # If it contains both letters and numbers, it might be a model number
            if (len(word) >= 3 and 
                any(c.isdigit() for c in word) and 
                any(c.isalpha() for c in word)):
                model_numbers.append(word)
            # If it's just a number with 4+ digits, it might be a model number
            elif word.isdigit() and len(word) >= 4:
                model_numbers.append(word)
        
        # Remove duplicates
        return list(set(model_numbers))
    
    def _calculate_relevance_score(self, product, query, model_numbers):
        """
        Calculate relevance score for a product based on the query
        
        Args:
            product (dict): Product data
            query (str): Original search query
            model_numbers (list): Extracted model numbers from the query
            
        Returns:
            float: Relevance score (higher is better)
        """
        score = 0
        
        # Get product text to search in
        product_name = product.get('name', '').lower()
        product_sku = product.get('sku', '').lower()
        product_desc = product.get('short_description', '').lower()
        
        # Direct name match is best
        name_ratio = fuzz.partial_ratio(query, product_name)
        score += name_ratio * 2  # Weight name matches more heavily
        
        # SKU match is also very good
        if product_sku:
            sku_ratio = fuzz.partial_ratio(query, product_sku)
            score += sku_ratio * 1.5
        
        # Description match
        if product_desc:
            desc_ratio = fuzz.partial_ratio(query, product_desc)
            score += desc_ratio * 0.5
        
        # Model number match
        for model in model_numbers:
            # Check if model appears in product name
            if model.lower() in product_name:
                score += 100  # Strong bonus for model number match
            
            # Check for fuzzy model match
            model_ratio = fuzz.partial_ratio(model.lower(), product_name)
            score += model_ratio
            
            # Check SKU for model match
            if product_sku and model.lower() in product_sku:
                score += 75
        
        # Brand match bonuses
        brands = ['embraco', 'danfoss', 'bitzer', 'secop', 'copeland', 'tecumseh']
        for brand in brands:
            if brand in query and brand in product_name:
                score += 50  # Bonus for matching brand
        
        return score
    
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
        
        # Test the advanced search
        query = "embraco 9238"
        print(f"\nTesting advanced search for: '{query}'")
        results = woocommerce.advanced_product_search(query)
        print(f"Found {len(results)} results:")
        for product in results:
            print(f"- {product['name']} (${product['price']})")
            
        # Test with just a model number
        query = "9238"
        print(f"\nTesting advanced search for: '{query}'")
        results = woocommerce.advanced_product_search(query)
        print(f"Found {len(results)} results:")
        for product in results:
            print(f"- {product['name']} (${product['price']})")
    else:
        print("❌ Failed to connect to WooCommerce API") 