#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import google.generativeai as genai
from dotenv import load_dotenv
from PIL import Image
import io

# Load environment variables
load_dotenv()

def test_gemini_vision_with_pil(image_path=None):
    """
    Test the Gemini Vision API with an image using PIL
    
    Args:
        image_path (str): Path to local image file
        
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
        
        # Use a default image path if none provided
        if not image_path:
            print("No image path provided, please provide a valid image path")
            return False
        
        # Load and process the image with PIL
        print(f"Loading image from: {image_path}")
        try:
            # Open the image file
            image = Image.open(image_path)
            
            # Print image information
            print(f"Image dimensions: {image.size}")
            print(f"Image format: {image.format}")
            print(f"Image mode: {image.mode}")
            
            # Convert to RGB if needed
            if image.mode != "RGB":
                print(f"Converting image from {image.mode} to RGB")
                image = image.convert("RGB")
            
            # Initialize the vision model (using the new recommended model)
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
            
            Provide the information in a structured format that can be used for product search.
            """
            
            print("Sending image to Gemini Vision API...")
            # Process the image with Gemini Vision
            response = vision_model.generate_content([prompt, image])
            
            # Get the text response
            vision_response = response.text
            print("\n=== Gemini Vision Response ===")
            print(vision_response)
            print("=============================\n")
            
            print("✅ Successfully tested Gemini Vision API")
            return True
            
        except Exception as e:
            print(f"❌ Error processing image: {e}")
            import traceback
            traceback.print_exc()
            return False
        
    except Exception as e:
        print(f"❌ Error testing Gemini Vision: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    import sys
    
    # Check if an image path was provided
    if len(sys.argv) > 1:
        image_path = sys.argv[1]
    else:
        print("Please provide an image path as a command line argument")
        sys.exit(1)
    
    print("Testing Gemini Vision API with PIL...")
    test_gemini_vision_with_pil(image_path) 