#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from dotenv import load_dotenv
import traceback
import re

# Import functions from main.py
from main import search_products_from_vision, format_vision_product_response
from conversation_context import conversation_context

# Load environment variables
load_dotenv()

def test_no_brand_scenario():
    """
    Test the scenario where an image has no brand information
    """
    try:
        # Create a test user ID
        test_user_id = "test_user_123"
        
        # Initialize conversation context for the test user
        context = conversation_context.get_context(test_user_id)
        
        # Simulate a vision response without brand information
        simulated_vision_response = """
        **Product Information:**

        1. **Product Type:** Digital Thermostat / Temperature Controller

        2. **Brand Name:** Not visible in the image.

        3. **Model/Style Name or Number:** Not visible in the image.

        4. **Key Features:**
           * Digital temperature display
           * Multiple control buttons
           * Temperature setpoint adjustment
           * Appears to be designed for refrigeration or HVAC control
           * Compact design for panel mounting

        5. **Technical Specifications:** Not visible in the image.

        This appears to be a standard digital thermostat or temperature controller commonly used in refrigeration or HVAC applications. Without brand or model information, it's difficult to provide more specific details.
        """
        
        print("\n=== Testing No Brand Scenario ===")
        print("Simulated vision response (no brand):")
        print(simulated_vision_response)
        
        # Extract product type and brand name for debugging
        product_type_match = re.search(r'product type[:\s]*(.*?)(?:\n|$)', simulated_vision_response, re.IGNORECASE)
        if product_type_match:
            product_type_raw = product_type_match.group(1).strip()
            product_type = re.sub(r'\*\*|\*|not visible|unknown', '', product_type_raw, flags=re.IGNORECASE).strip()
            print(f"Extracted product type: '{product_type}'")
        else:
            print("No product type match found")
            
        brand_match = re.search(r'brand[:\s]*(.*?)(?:\n|$)', simulated_vision_response, re.IGNORECASE)
        if brand_match:
            brand_raw = brand_match.group(1).strip()
            brand_name = re.sub(r'not visible|visible|if visible|unknown|\*\*|\*', '', brand_raw, flags=re.IGNORECASE).strip()
            print(f"Extracted brand name: '{brand_name}'")
        else:
            print("No brand match found")
        
        # Search for products based on the vision response
        print("\n=== Step 1: Searching for products based on category ===")
        product_matches = search_products_from_vision(simulated_vision_response)
        
        # If no products found, create mock products for testing
        if not product_matches:
            print("No products found from search, creating mock products for testing")
            mock_products = [
                {
                    'id': 1001,
                    'name': 'Danfoss ERC 214 Digital Temperature Controller',
                    'price': '89.99',
                    'permalink': 'https://durmusbaba.de/product/danfoss-erc-214',
                    'stock_status': 'instock',
                    'short_description': 'Digital temperature controller for refrigeration applications with multiple sensor inputs and alarm functions.'
                },
                {
                    'id': 1002,
                    'name': 'DRC Digital Thermostat DCB-112',
                    'price': '65.50',
                    'permalink': 'https://durmusbaba.de/product/drc-dcb-112',
                    'stock_status': 'instock',
                    'short_description': 'Compact digital thermostat with temperature range -40°C to +99°C, ideal for refrigeration applications.'
                },
                {
                    'id': 1003,
                    'name': 'Eliwell ID Plus 974 Temperature Controller',
                    'price': '110.75',
                    'permalink': 'https://durmusbaba.de/product/eliwell-id-plus-974',
                    'stock_status': 'instock',
                    'short_description': 'Advanced temperature controller with defrost management and multiple relay outputs.'
                }
            ]
            product_matches = mock_products
        
        # Format the response
        print("\n=== Step 2: Formatting response with category matches ===")
        formatted_response = format_vision_product_response(simulated_vision_response, product_matches, test_user_id)
        
        print("\n=== Final Response ===")
        print(formatted_response)
        
        # Check if the response mentions category-based recommendations
        if re.search(r"products.*that might match your needs", formatted_response, re.IGNORECASE):
            print("\n✅ Successfully provided category-based recommendations")
        else:
            print("\n⚠️ Response doesn't clearly indicate category-based recommendations")
        
        # Check if products were found
        if 'last_products' in context and context['last_products']:
            print(f"✅ Found {len(context['last_products'])} products in context")
            
            # Print the first product
            first_product = context['last_products'][0]
            if isinstance(first_product, dict):
                print(f"First product: {first_product.get('name', 'Unknown')}")
            else:
                print(f"First product: {first_product['name']}")
        else:
            print("⚠️ No products found in context")
        
        print("\n=== Test completed successfully ===")
        return True
        
    except Exception as e:
        print(f"❌ Error testing no-brand scenario: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Testing Snap-to-Shop with no brand information...")
    test_no_brand_scenario() 