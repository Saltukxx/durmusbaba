#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def check_gemini_models():
    """Check available Gemini models and verify access to gemini-1.5-flash"""
    
    # Get API key from environment
    api_key = os.getenv("GEMINI_API_KEY")
    
    if not api_key:
        print("❌ GEMINI_API_KEY not found in environment variables")
        return False
    
    try:
        # Configure the Gemini API
        genai.configure(api_key=api_key)
        
        # List available models
        models = genai.list_models()
        
        print("Available models:")
        vision_model_found = False
        
        for model in models:
            model_name = model.name
            print(f"- {model_name}")
            
            # Check if this is the vision model
            if "gemini-1.5-flash" in model_name:
                vision_model_found = True
                print(f"✅ Found vision model: {model_name}")
                
                # Try to initialize the model to verify access
                try:
                    vision_model = genai.GenerativeModel(model_name)
                    print("✅ Successfully initialized vision model")
                    
                    # Print model details
                    print(f"   Display name: {model.display_name}")
                    print(f"   Description: {model.description}")
                    print(f"   Input token limit: {model.input_token_limit}")
                    print(f"   Output token limit: {model.output_token_limit}")
                    print(f"   Supported generation methods: {model.supported_generation_methods}")
                    
                    return True
                except Exception as e:
                    print(f"❌ Error initializing vision model: {e}")
                    return False
        
        if not vision_model_found:
            print("❌ gemini-1.5-flash model not found in available models")
            return False
            
    except Exception as e:
        print(f"❌ Error checking Gemini models: {e}")
        return False

if __name__ == "__main__":
    print("Checking Gemini models...")
    check_gemini_models() 