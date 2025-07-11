#!/usr/bin/env python
# -*- coding: utf-8 -*-

from main import get_gemini_response

def simulate_conversation():
    """Simulate a conversation with the bot to test all features"""
    # Use a test user ID
    user_id = "test_user_123"
    
    conversations = [
        # Conversation 1: Product inquiry and sales
        [
            "Hallo, ich suche einen Kompressor für meine Kühlung",
            "Ich brauche etwas leises und energieeffizientes",
            "Haben Sie Embraco Kompressoren unter 200 Euro?",
            "Können Sie mir mehr über den Embraco NT 6222 GK erzählen?"
        ],
        
        # Conversation 2: Order tracking
        [
            "Hello, I'd like to check my order status",
            "My order number is #2157",
            "When will it be delivered?"
        ],
        
        # Conversation 3: Product categories
        [
            "Merhaba, hangi ürün kategorileriniz var?",
            "Thermostat kategorisinde neler var?",
            "DCB31 fiyatı ne kadar?"
        ]
    ]
    
    print("\n" + "=" * 50)
    print("WHATSAPP BOT CONVERSATION SIMULATOR")
    print("=" * 50)
    
    for i, conversation in enumerate(conversations):
        print(f"\nConversation {i+1}:")
        print("-" * 50)
        
        for message in conversation:
            print(f"\nUser: {message}")
            response = get_gemini_response(user_id, message)
            print(f"\nBot: {response}")
            print("-" * 50)
        
        # Reset user context for next conversation
        user_id = f"test_user_{i+2}"
        print("\n" + "=" * 50)

if __name__ == "__main__":
    simulate_conversation() 