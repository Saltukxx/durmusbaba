#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import google.generativeai as genai
from dotenv import load_dotenv
import requests
from PIL import Image
import io
import base64

# Load environment variables
load_dotenv()

def test_gemini_vision(image_path_or_url=None):
    """
    Test the Gemini Vision API with an image
    
    Args:
        image_path_or_url (str): Path to local image file or URL to image
        
    Returns:
        bool: True if successful, False otherwise
    """
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        return False
    
    try:
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        # Get image data
        if not image_path_or_url:
            print("No image path or URL provided. Using a default test image.")
            # Use a default test image URL
            image_path_or_url = "https://durmusbaba.de/wp-content/uploads/2023/09/compressor-1.jpg"
        
        image_data = None
        
        # Check if it's a URL or local path
        if image_path_or_url.startswith(('http://', 'https://')):
            print(f"Downloading image from URL: {image_path_or_url}")
            response = requests.get(image_path_or_url)
            if response.status_code != 200:
                print(f"❌ Failed to download image: {response.status_code}")
                return False
            image_data = response.content
        else:
            # It's a local file path
            if not os.path.exists(image_path_or_url):
                print(f"❌ Image file not found: {image_path_or_url}")
                return False
            print(f"Reading image from local file: {image_path_or_url}")
            with open(image_path_or_url, 'rb') as f:
                image_data = f.read()
        
        # Display image dimensions and size
        try:
            image = Image.open(io.BytesIO(image_data))
            print(f"Image dimensions: {image.size}")
            print(f"Image format: {image.format}")
            print(f"Image size: {len(image_data) / 1024:.2f} KB")
            
            # Convert image to RGB if needed
            if image.mode != "RGB":
                print(f"Converting image from {image.mode} to RGB")
                image = image.convert("RGB")
                
            # Save to a temporary buffer
            temp_buffer = io.BytesIO()
            image.save(temp_buffer, format="JPEG")
            image_data = temp_buffer.getvalue()
            
        except Exception as e:
            print(f"Warning: Could not analyze image details: {e}")
        
        # Initialize the vision model
        print("Initializing Gemini 2.5 Flash model...")
        vision_model = genai.GenerativeModel('gemini-2.5-flash')
        
        # Prepare the prompt for product identification
        prompt = """
        Identify the product in this image in detail. 
        Focus on:
        1. Product type (e.g., refrigeration compressor, cooling system, temperature controller, etc.)
        2. Brand name if visible
        3. Model/style name or number if visible
        4. Key features visible in the image
        5. Technical specifications if visible
        
        If this appears to be a screenshot of a product search or website, extract the product information from the text visible in the image.
        
        Provide the information in a structured format that can be used for product search.
        """
        
        print("Sending image to Gemini Vision API...")
        # Process the image with Gemini Vision
        response = vision_model.generate_content([prompt, image_data])
        
        # Get the text response
        vision_response = response.text
        print("\n=== Gemini Vision Response ===")
        print(vision_response)
        print("=============================\n")
        
        print("✅ Successfully tested Gemini Vision API")
        return True
        
    except Exception as e:
        print(f"❌ Error testing Gemini Vision: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    # Check if an image path or URL was provided as a command-line argument
    image_path_or_url = None
    if len(sys.argv) > 1:
        image_path_or_url = sys.argv[1]
    
    print("Testing Gemini Vision API...")
    test_gemini_vision(image_path_or_url) 