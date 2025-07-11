#!/usr/bin/env python
# -*- coding: utf-8 -*-

import json
from main import is_order_query, extract_order_number, handle_order_query

def test_order_detection():
    """Test the order query detection function"""
    test_messages = [
        "Wo ist meine Bestellung?",
        "Ich möchte den Status meiner Bestellung #2157 wissen",
        "Order status 2157",
        "Sipariş durumumu öğrenmek istiyorum",
        "What's the status of my order?",
        "Ich habe vor 3 Tagen etwas bestellt",
        "Wann kommt mein Paket?",
        "Ich suche nach Kompressoren",  # Not an order query
        "Embraco NT 6222 GK Preis",  # Not an order query
    ]
    
    print("\nTesting order query detection:")
    print("-" * 50)
    
    for message in test_messages:
        is_order = is_order_query(message)
        print(f"Message: '{message}'")
        print(f"Is order query: {'✅ Yes' if is_order else '❌ No'}")
        
        if is_order:
            order_number = extract_order_number(message)
            if order_number:
                print(f"Extracted order number: {order_number}")
            else:
                print("No order number extracted")
        print("-" * 50)

def test_order_handling():
    """Test the order handling function"""
    test_messages = [
        "Wo ist meine Bestellung #2157?",
        "Order status",  # No order number, should use phone number
    ]
    
    print("\nTesting order handling:")
    print("-" * 50)
    
    for message in test_messages:
        print(f"Message: '{message}'")
        # Use a test user ID that resembles a WhatsApp ID
        response = handle_order_query(message, "491234567890:12")
        print(f"Response:\n{response}")
        print("-" * 50)

if __name__ == "__main__":
    test_order_detection()
    test_order_handling() 