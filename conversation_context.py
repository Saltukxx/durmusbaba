#!/usr/bin/env python
# -*- coding: utf-8 -*-

import re
import json
import time
from datetime import datetime, timedelta

class ConversationContext:
    """
    Enhanced conversation context manager to improve contextual understanding
    between messages in a conversation.
    """
    def __init__(self):
        # Main storage for conversation contexts by user ID
        self.contexts = {}
        # Expiration time for contexts (in hours)
        self.expiration_hours = 24
    
    def get_context(self, user_id):
        """Get the conversation context for a user"""
        # Clean expired contexts first
        self._clean_expired_contexts()
        
        # Initialize context if it doesn't exist
        if user_id not in self.contexts:
            self.contexts[user_id] = {
                'last_updated': time.time(),
                'messages': [],
                'entities': {
                    'products': [],
                    'categories': [],
                    'price_ranges': [],
                    'orders': [],
                    'features': []
                },
                'current_topic': None,
                'last_query_type': None,
                'product_page': 0
            }
        
        return self.contexts[user_id]
    
    def update_context(self, user_id, message, is_user=True):
        """
        Update the conversation context with a new message
        
        Args:
            user_id (str): User identifier
            message (str): Message text
            is_user (bool): True if message is from user, False if from bot
        """
        context = self.get_context(user_id)
        
        # Update last updated time
        context['last_updated'] = time.time()
        
        # Add message to history
        context['messages'].append({
            'text': message,
            'timestamp': time.time(),
            'is_user': is_user
        })
        
        # Keep only the last 10 messages
        if len(context['messages']) > 10:
            context['messages'] = context['messages'][-10:]
        
        # If it's a user message, extract entities and determine topic
        if is_user:
            self._extract_entities(user_id, message)
            self._determine_topic(user_id, message)
    
    def get_recent_messages(self, user_id, count=5):
        """Get the most recent messages in the conversation"""
        context = self.get_context(user_id)
        return context['messages'][-count:] if context['messages'] else []
    
    def get_conversation_summary(self, user_id):
        """Generate a summary of the conversation context"""
        context = self.get_context(user_id)
        
        summary = {
            'current_topic': context['current_topic'],
            'last_query_type': context['last_query_type'],
            'mentioned_products': [p['name'] for p in context['entities']['products'][-3:]] if context['entities']['products'] else [],
            'mentioned_categories': context['entities']['categories'][-3:] if context['entities']['categories'] else [],
            'mentioned_price_ranges': context['entities']['price_ranges'][-1] if context['entities']['price_ranges'] else None,
            'mentioned_orders': context['entities']['orders'][-1] if context['entities']['orders'] else None,
            'mentioned_features': context['entities']['features'] if context['entities']['features'] else []
        }
        
        return summary
    
    def get_referenced_entities(self, user_id, message):
        """
        Identify entities that might be referenced in the message
        
        This handles cases like "Tell me more about that product" or
        "Show me the second one" by identifying what "that" or "second one" refers to.
        """
        context = self.get_context(user_id)
        referenced_entities = {}
        
        # Check for references to previously mentioned products
        product_references = [
            r'(?:that|this|the) product',
            r'(?:it|that one)',
            r'(?:the|this) (?:first|second|third|last|previous) (?:one|product|item)',
            r'(?:mehr|weitere) (?:details|informationen)',  # German: more details/information
            r'(?:tell me more|more information)',
            r'(?:zeig mir|zeige) (?:das|dieses)',  # German: show me this/that
            r'(?:daha fazla|hakkında)',  # Turkish: more about/about it
            r'dieses produkt',  # German: this product
            r'das produkt',  # German: the product
            r'das erste produkt',  # German: the first product
            r'der preis für dieses',  # German: the price for this
            r'ist das erste',  # German: is the first
        ]
        
        if any(re.search(pattern, message.lower()) for pattern in product_references) and context['entities']['products']:
            referenced_entities['product'] = context['entities']['products'][-1]
        
        # Check for references to previously mentioned categories
        category_references = [
            r'(?:that|this|the) category',
            r'(?:in|from) (?:that|this|the) category',
            r'(?:diese|jene|die) kategorie',  # German
            r'(?:bu|o|şu) kategori',  # Turkish
            r'in dieser kategorie',  # German: in this category
            r'aus dieser kategorie',  # German: from this category
        ]
        
        if any(re.search(pattern, message.lower()) for pattern in category_references) and context['entities']['categories']:
            referenced_entities['category'] = context['entities']['categories'][-1]
        
        # Check for references to previously mentioned orders
        order_references = [
            r'(?:that|this|the|my) order',
            r'(?:meine|diese) bestellung',  # German
            r'(?:siparişim|bu sipariş)',  # Turkish
            r'diese bestellung',  # German: this order
            r'wann wird diese bestellung',  # German: when will this order
        ]
        
        if any(re.search(pattern, message.lower()) for pattern in order_references) and context['entities']['orders']:
            referenced_entities['order'] = context['entities']['orders'][-1]
        
        return referenced_entities
    
    def _extract_entities(self, user_id, message):
        """Extract entities from the message"""
        context = self.get_context(user_id)
        
        # Extract product mentions
        product_patterns = [
            r'(?:embraco|danfoss|bitzer)\s+[a-z0-9\s\-\.]{2,10}',  # Brand + model
            r'[a-z]{2,4}\s*\d{2,5}(?:\s*[a-z]{0,5})?',  # Model patterns like "EMY 80" or "NJ 9238"
            r'dcb\d{2,3}',  # DCB models
            r'ff\s*\d+\.?\d*'  # FF models
        ]
        
        for pattern in product_patterns:
            matches = re.findall(pattern, message.lower())
            if matches:
                for match in matches:
                    # Add to products if not already there
                    product = {'name': match.strip(), 'mentioned_at': time.time()}
                    if not any(p['name'] == product['name'] for p in context['entities']['products']):
                        context['entities']['products'].append(product)
        
        # Extract category mentions
        category_patterns = {
            'kompressor': 'Kompressoren',
            'compressor': 'Kompressoren',
            'kältesystem': 'Kältesysteme',
            'cooling system': 'Kältesysteme',
            'ventil': 'Expansionsventile',
            'valve': 'Expansionsventile',
            'thermostat': 'Thermostat',
            'kühlschrank': 'Kühlschranke',
            'refrigerator': 'Kühlschranke',
            'tür': 'Tiefkühlraumtür',
            'door': 'Tiefkühlraumtür',
            'klimagerät': 'Klimageräte-Einheiten',
            'air conditioner': 'Klimageräte-Einheiten'
        }
        
        for keyword, category in category_patterns.items():
            if keyword in message.lower():
                if category not in context['entities']['categories']:
                    context['entities']['categories'].append(category)
        
        # Extract price ranges
        price_patterns = [
            r'(?:unter|weniger\sals|bis\szu)\s(\d+)(?:\s?€|\s?euro)?',  # under X€
            r'(?:zwischen|von)\s(\d+)(?:\s?€|\s?euro)?\s(?:bis|und|to)\s(\d+)(?:\s?€|\s?euro)?',  # between X€ and Y€
            r'(?:under|less\sthan|up\sto)\s(\d+)(?:\s?€|\s?euro)?',  # under X€
            r'(?:between)\s(\d+)(?:\s?€|\s?euro)?\s(?:and|to)\s(\d+)(?:\s?€|\s?euro)?',  # between X€ and Y€
        ]
        
        for pattern in price_patterns:
            match = re.search(pattern, message.lower())
            if match:
                if len(match.groups()) == 1:
                    # Under X€
                    price_range = (0, int(match.group(1)))
                    context['entities']['price_ranges'].append(price_range)
                elif len(match.groups()) == 2:
                    # Between X€ and Y€
                    price_range = (int(match.group(1)), int(match.group(2)))
                    context['entities']['price_ranges'].append(price_range)
        
        # Extract order numbers
        order_patterns = [
            r'#(\d{4,})',  # #1234
            r'order\s+(\d{4,})',  # order 1234
            r'bestellung\s+(\d{4,})',  # bestellung 1234
            r'auftrag\s+(\d{4,})',  # auftrag 1234
            r'sipariş\s+(\d{4,})'  # sipariş 1234
        ]
        
        for pattern in order_patterns:
            match = re.search(pattern, message.lower())
            if match:
                order_number = match.group(1)
                if order_number not in context['entities']['orders']:
                    context['entities']['orders'].append(order_number)
        
        # Extract product features
        feature_patterns = {
            r'(?:leise|geräuscharm|quiet|low\snoise|sessiz)': 'quiet',
            r'(?:energieeffizient|sparsam|energy.efficient|efficient|enerji\sverimli)': 'energy-efficient',
            r'(?:kompakt|klein|compact|small|küçük)': 'compact',
            r'(?:leistungsstark|stark|powerful|strong|güçlü)': 'powerful'
        }
        
        for pattern, feature in feature_patterns.items():
            if re.search(pattern, message.lower()):
                if feature not in context['entities']['features']:
                    context['entities']['features'].append(feature)
    
    def _determine_topic(self, user_id, message):
        """Determine the current topic of conversation"""
        context = self.get_context(user_id)
        
        # Topic detection patterns
        topic_patterns = {
            'product_info': [
                r'(?:preis|kosten|price|cost|fiyat)',
                r'(?:kompressor|compressor|kompresör)',
                r'(?:produkt|product|ürün)',
                r'(?:modell|model|typ|type)',
                r'(?:embraco|danfoss|bitzer|secop|copeland|tecumseh)'
            ],
            'order_status': [
                r'(?:bestellung|auftrag|order|sipariş)',
                r'(?:status|zustand|durum)',
                r'(?:lieferung|versand|delivery|shipping|teslimat)',
                r'(?:wann|when|ne zaman)'
            ],
            'sales_inquiry': [
                r'(?:empfehlen|recommend|öner)',
                r'(?:angebot|offer|teklif)',
                r'(?:suche|looking for|arıyorum)',
                r'(?:kaufen|bestellen|buy|order|satın|sipariş)'
            ],
            'support': [
                r'(?:hilfe|help|yardım)',
                r'(?:problem|issue|sorun)',
                r'(?:kontakt|contact|iletişim)',
                r'(?:frage|question|soru)'
            ]
        }
        
        # Determine the topic based on patterns
        for topic, patterns in topic_patterns.items():
            if any(re.search(pattern, message.lower()) for pattern in patterns):
                context['current_topic'] = topic
                context['last_query_type'] = topic
                return
        
        # If no topic is detected, keep the previous topic
        if not context['current_topic']:
            context['current_topic'] = 'general'
    
    def _clean_expired_contexts(self):
        """Remove expired conversation contexts"""
        current_time = time.time()
        expired_ids = []
        
        for user_id, context in self.contexts.items():
            last_updated = context['last_updated']
            expiration_time = last_updated + (self.expiration_hours * 3600)
            
            if current_time > expiration_time:
                expired_ids.append(user_id)
        
        for user_id in expired_ids:
            del self.contexts[user_id]

# Create a singleton instance
conversation_context = ConversationContext()

def test_conversation_context():
    """Test the conversation context functionality"""
    user_id = "test_user_123"
    
    # Simulate a conversation
    conversation = [
        "Hallo, ich suche einen Embraco Kompressor",
        "Ich brauche etwas leises und energieeffizientes",
        "Haben Sie Embraco NJ 9238 unter 400 Euro?",
        "Können Sie mir mehr über dieses Produkt erzählen?"
    ]
    
    print("Testing conversation context:")
    print("-" * 50)
    
    for message in conversation:
        print(f"\nUser: {message}")
        conversation_context.update_context(user_id, message)
        
        # Get the context summary
        summary = conversation_context.get_conversation_summary(user_id)
        print("Context Summary:")
        for key, value in summary.items():
            print(f"  {key}: {value}")
        
        # Check for referenced entities
        if "mehr" in message or "dieses" in message:
            references = conversation_context.get_referenced_entities(user_id, message)
            print("Referenced Entities:")
            for entity_type, entity in references.items():
                print(f"  {entity_type}: {entity}")
        
        print("-" * 50)

if __name__ == "__main__":
    test_conversation_context() 