#!/usr/bin/env python
"""
Bu script, kullanılabilir Gemini modellerini listeler.
"""

import os
import google.generativeai as genai
from dotenv import load_dotenv

# .env dosyasından değişkenleri yükle
load_dotenv()

def list_available_models():
    """
    Kullanılabilir Gemini modellerini listeler
    """
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    
    if not gemini_api_key:
        print("ERROR: GEMINI_API_KEY not found in .env file")
        return False
    
    try:
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        
        # List available models
        print("Listing available models...")
        models = genai.list_models()
        
        print("\nAvailable Models:")
        for model in models:
            print(f"- {model.name}")
            print(f"  Supported generation methods: {model.supported_generation_methods}")
            print()
        
        return True
    except Exception as e:
        print(f"Error listing models: {e}")
        return False

if __name__ == "__main__":
    print("Gemini Models Lister")
    print("===================\n")
    
    success = list_available_models()
    
    if not success:
        print("\n❌ Failed to list models.") 