#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from dotenv import load_dotenv
from PIL import Image
import io
import traceback
import requests
import google.generativeai as genai

# Import functions from main.py
from main import search_products_from_vision, format_vision_product_response
from conversation_context import conversation_context

# Load environment variables
load_dotenv()

def test_snap_to_shop_flow(image_path=None):
    """
    Test the entire Snap-to-Shop flow with a local image
    
    Args:
        image_path (str): Path to local image file
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Use a default image path if none provided
        if not image_path:
            print("No image path provided, please provide a valid image path")
            return False
        
        # Check if file exists
        if not os.path.exists(image_path):
            print(f"❌ Image file not found: {image_path}")
            return False
        
        print(f"Loading image from: {image_path}")
        
        # Create a test user ID
        test_user_id = "test_user_123"
        
        # Initialize conversation context for the test user
        # The context is automatically initialized when we get it
        context = conversation_context.get_context(test_user_id)
        
        # 1. Process the image with Gemini Vision
        print("\n=== Step 1: Processing image with Gemini Vision ===")
        
        # Process the image directly instead of using process_image_with_gemini
        try:
            # Get API key from environment
            api_key = os.getenv("GEMINI_API_KEY")
            if not api_key:
                print("❌ GEMINI_API_KEY not found in environment variables")
                return False
                
            # Configure the Gemini API
            genai.configure(api_key=api_key)
            
            # Load the image with PIL
            image = Image.open(image_path)
            
            # Print image information
            print(f"Image dimensions: {image.size}")
            print(f"Image format: {image.format}")
            print(f"Image mode: {image.mode}")
            
            # Convert to RGB if needed
            if image.mode != "RGB":
                print(f"Converting image from {image.mode} to RGB")
                image = image.convert("RGB")
            
            # Configure Gemini Vision model
            vision_model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Prepare the prompt for product identification
            prompt = """
            Identify the product in this image in detail. 
            Focus on:
            1. Product type (e.g., refrigeration compressor, cooling system, etc.)
            2. Brand name if visible
            3. Model/style name or number if visible
            4. Key features visible in the image
            5. Technical specifications if visible
            
            If this appears to be a screenshot of a product search or website, extract the product information from the text visible in the image.
            
            Provide the information in a structured format that can be used for product search.
            """
            
            print("Sending image to Gemini Vision API...")
            
            # Process the image with Gemini Vision
            response = vision_model.generate_content([prompt, image])
            
            # Get the text response
            vision_response = response.text
            print(f"Gemini Vision response: {vision_response}")
            
            # Update conversation context
            conversation_context.update_context(test_user_id, f"[Image sent: {vision_response}]")
            
            # Search for matching products
            print("\n=== Step 2: Searching for matching products ===")
            product_matches = search_products_from_vision(vision_response)
            
            # Format the response
            print("\n=== Step 3: Formatting response with product matches ===")
            formatted_response = format_vision_product_response(vision_response, product_matches, test_user_id)
            
            print("\n=== Final Response ===")
            print(formatted_response)
            
        except Exception as e:
            print(f"❌ Error processing image: {e}")
            traceback.print_exc()
            return False
        
        # 4. Check the conversation context
        print("\n=== Step 4: Checking conversation context ===")
        context = conversation_context.get_context(test_user_id)
        
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
        
        # 5. Test follow-up query
        print("\n=== Step 5: Testing follow-up query ===")
        follow_up_query = "Tell me more about the first product"
        
        # This would normally go through get_gemini_response, but we'll just check the context
        if 'last_products' in context and context['last_products']:
            print(f"✅ Follow-up query would work: '{follow_up_query}'")
        else:
            print(f"⚠️ Follow-up query might not work: '{follow_up_query}'")
        
        print("\n=== Test completed successfully ===")
        return True
        
    except Exception as e:
        print(f"❌ Error testing Snap-to-Shop flow: {e}")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Check if an image path was provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        print("Please provide an image path as a command line argument")
        sys.exit(1)
    
    print("Testing Snap-to-Shop flow...")
    test_snap_to_shop_flow(image_path) 