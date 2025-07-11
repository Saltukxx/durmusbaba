#!/usr/bin/env python
# -*- coding: utf-8 -*-

import time
from conversation_context import conversation_context

def test_conversation_flow():
    """Test a complete conversation flow with the context manager."""
    user_id = "test_user_123"
    
    print("Testing conversation flow with context manager")
    print("=" * 60)
    
    # Simulate a conversation about products
    messages = [
        # Initial product inquiry
        "Ich suche einen Embraco Kompressor",
        
        # Follow-up with specific model
        "Haben Sie Embraco NJ 9238?",
        
        # Reference to the product
        "Wie ist der Preis für dieses Produkt?",
        
        # Ask about another product
        "Was ist mit Danfoss FR10G?",
        
        # Reference to previous product
        "Ist das erste Produkt auf Lager?",
        
        # Ask about price range
        "Zeigen Sie mir Kompressoren unter 300 Euro",
        
        # Ask for more products
        "Zeigen Sie mir mehr Produkte",
        
        # Ask about a specific category
        "Was haben Sie von Bitzer?",
        
        # Reference to that category
        "Gibt es in dieser Kategorie etwas unter 500 Euro?",
        
        # Ask about an order
        "Wo ist meine Bestellung #12345?",
        
        # Reference to the order
        "Wann wird diese Bestellung geliefert?"
    ]
    
    # Process each message and show context updates
    for i, message in enumerate(messages):
        print(f"\n[Message {i+1}]: {message}")
        
        # Update context with user message
        conversation_context.update_context(user_id, message)
        
        # Get context summary
        context = conversation_context.get_context(user_id)
        summary = conversation_context.get_conversation_summary(user_id)
        
        print("\nContext Summary:")
        print(f"  Current Topic: {summary['current_topic']}")
        print(f"  Last Query Type: {summary['last_query_type']}")
        print(f"  Mentioned Products: {summary['mentioned_products']}")
        print(f"  Mentioned Categories: {summary['mentioned_categories']}")
        print(f"  Mentioned Price Range: {summary['mentioned_price_ranges']}")
        print(f"  Mentioned Orders: {summary['mentioned_orders']}")
        
        # Check for referenced entities
        referenced = conversation_context.get_referenced_entities(user_id, message)
        if referenced:
            print("\nReferenced Entities:")
            for entity_type, entity in referenced.items():
                if entity_type == 'product':
                    print(f"  Product: {entity['name']}")
                elif entity_type == 'category':
                    print(f"  Category: {entity}")
                elif entity_type == 'order':
                    print(f"  Order: {entity}")
        
        # Simulate a bot response
        bot_response = generate_mock_response(message, referenced)
        print(f"\n[Bot Response]: {bot_response}")
        
        # Update context with bot response
        conversation_context.update_context(user_id, bot_response, is_user=False)
        
        print("-" * 60)
    
    # Show final context state
    print("\nFinal Context State:")
    print(f"  Messages in history: {len(context['messages'])}")
    print(f"  Products tracked: {len(context['entities']['products'])}")
    print(f"  Categories tracked: {context['entities']['categories']}")
    print(f"  Price ranges tracked: {context['entities']['price_ranges']}")
    print(f"  Orders tracked: {context['entities']['orders']}")

def generate_mock_response(message, referenced_entities):
    """Generate a mock bot response based on the message and referenced entities."""
    message_lower = message.lower()
    
    # Handle referenced entities
    if referenced_entities:
        if 'product' in referenced_entities:
            product_name = referenced_entities['product']['name']
            if 'preis' in message_lower or 'price' in message_lower:
                return f"Der Preis für {product_name} beträgt 350 EUR."
            elif 'lager' in message_lower or 'stock' in message_lower:
                return f"Ja, {product_name} ist auf Lager und kann innerhalb von 3-5 Werktagen geliefert werden."
            return f"Ich habe Informationen zu {product_name} gefunden. Was möchten Sie wissen?"
        
        if 'category' in referenced_entities:
            category = referenced_entities['category']
            if 'unter' in message_lower or 'under' in message_lower:
                return f"Ja, wir haben mehrere {category} Produkte unter 500 Euro. Zum Beispiel: {category} X100 für 450 EUR."
            return f"In der Kategorie {category} haben wir verschiedene Modelle verfügbar."
        
        if 'order' in referenced_entities:
            order_number = referenced_entities['order']
            if 'wann' in message_lower or 'when' in message_lower:
                return f"Ihre Bestellung #{order_number} wird voraussichtlich am 15. Juni geliefert."
            return f"Ich habe Ihre Bestellung #{order_number} gefunden. Sie ist derzeit in Bearbeitung."
    
    # Handle specific message types
    if 'embraco' in message_lower and 'nj 9238' in message_lower:
        return "Ja, wir haben den Embraco NJ 9238 Kompressor auf Lager. Der Preis beträgt 350 EUR."
    
    if 'danfoss' in message_lower and 'fr10g' in message_lower:
        return "Der Danfoss FR10G ist verfügbar für 280 EUR."
    
    if 'unter 300 euro' in message_lower:
        return "Ich habe 5 Kompressoren unter 300 Euro gefunden: Embraco EMY70, Danfoss FR8.5G, Secop SC15G, Tecumseh AE1390 und Embraco EMT22."
    
    if 'mehr produkte' in message_lower:
        return "Hier sind weitere Produkte: Embraco EMT36, Danfoss FR10G, Secop SC18G, Tecumseh AE1415 und Embraco EMT45."
    
    if 'bitzer' in message_lower:
        return "Wir haben verschiedene Bitzer Kompressoren: Bitzer 4DES-5Y, Bitzer 4CC-6.2Y, Bitzer 4FC-3.2Y und Bitzer 4EC-4.2Y."
    
    if 'bestellung #12345' in message_lower:
        return "Ihre Bestellung #12345 ist in Bearbeitung und wird voraussichtlich am 15. Juni versendet."
    
    # Default response
    return "Ich habe Ihre Anfrage verstanden. Wie kann ich Ihnen weiterhelfen?"

if __name__ == "__main__":
    test_conversation_flow() 