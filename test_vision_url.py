#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import google.generativeai as genai
from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()

def test_gemini_vision_with_url():
    """Test the Gemini Vision API with an image from a URL"""
    
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        return False
    
    try:
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        # Use a test image URL of a refrigeration controller
        image_url = "https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png"
        
        print(f"Using test image URL: {image_url}")
        
        # Download the image
        response = requests.get(image_url)
        if response.status_code != 200:
            print(f"❌ Failed to download image: {response.status_code}")
            return False
            
        image_data = response.content
        print(f"Image size: {len(image_data) / 1024:.2f} KB")
        
        # Initialize the vision model
        print("Initializing Gemini Pro Vision model...")
        vision_model = genai.GenerativeModel('gemini-pro-vision')
        
        # Prepare the prompt for product identification
        prompt = """
        Identify what is shown in this image in detail.
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
    print("Testing Gemini Vision API with a URL image...")
    test_gemini_vision_with_url() 