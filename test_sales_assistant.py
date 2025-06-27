#!/usr/bin/env python
# -*- coding: utf-8 -*-

from sales_assistant import (
    is_sales_inquiry, 
    detect_language, 
    extract_product_requirements,
    handle_sales_inquiry
)

def test_sales_inquiry_detection():
    """Test the sales inquiry detection function"""
    test_messages = [
        "Ich suche einen Kompressor für meine Kühlung",
        "Können Sie mir ein Kältesystem empfehlen?",
        "Welche Produkte haben Sie für unter 200 Euro?",
        "I'm looking for a compressor",
        "Can you recommend a cooling system?",
        "What products do you have under 200 euros?",
        "Bir kompresör arıyorum",
        "Soğutma sistemi önerebilir misiniz?",
        "200 euro altında hangi ürünleriniz var?",
        "Was kostet der Embraco NT 6222 GK?",  # Price query, not a sales inquiry
        "Embraco NT 6222 GK",  # Direct product query, not a sales inquiry
        "Wo ist meine Bestellung?",  # Order query, not a sales inquiry
    ]
    
    print("\nTesting sales inquiry detection:")
    print("-" * 50)
    
    for message in test_messages:
        is_sales = is_sales_inquiry(message)
        lang = detect_language(message)
        print(f"Message: '{message}'")
        print(f"Language: {lang}")
        print(f"Is sales inquiry: {'✅ Yes' if is_sales else '❌ No'}")
        
        if is_sales:
            requirements = extract_product_requirements(message)
            print(f"Requirements: {requirements}")
        print("-" * 50)

def test_sales_handling():
    """Test the sales handling function"""
    test_messages = [
        "Ich suche einen leisen Kompressor unter 200 Euro",
        "Can you recommend a powerful Embraco compressor?",
        "Danfoss marka bir kompresör arıyorum",
        "Welche Kältesysteme habt ihr?",
        "I need a thermostat for my refrigerator"
    ]
    
    print("\nTesting sales handling:")
    print("-" * 50)
    
    for message in test_messages:
        print(f"Message: '{message}'")
        # Use a test user ID
        response = handle_sales_inquiry(message, "test_user_123")
        print(f"Response:\n{response}")
        print("-" * 50)

if __name__ == "__main__":
    test_sales_inquiry_detection()
    test_sales_handling() 