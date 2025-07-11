#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
from dotenv import load_dotenv
from woocommerce_client import woocommerce
from order_notification import notify_new_order, format_order_notification

# Load environment variables from .env file
load_dotenv()

def test_with_sample_order():
    """Test with a sample order data"""
    print("Testing with sample order data...")
    
    # Sample order data
    test_order = {
        'id': 12345,
        'status': 'processing',
        'date_created': '2023-11-10T15:30:45',
        'total': '259.99',
        'currency': 'EUR',
        'billing': {
            'first_name': 'Test',
            'last_name': 'Customer',
            'email': 'test@example.com',
            'phone': '+49123456789'
        },
        'shipping': {
            'first_name': 'Test',
            'last_name': 'Customer',
            'address_1': 'Test Street 123',
            'postcode': '12345',
            'city': 'Berlin',
            'country': 'DE'
        },
        'line_items': [
            {
                'name': 'Embraco Compressor EMY80CLP',
                'quantity': 1,
                'total': '199.99',
            },
            {
                'name': 'Refrigerant R134a',
                'quantity': 2,
                'total': '60.00',
            }
        ]
    }
    
    # Format and print the notification message
    notification = format_order_notification(test_order)
    print("\nSample notification message:")
    print(notification)
    
    # Ask for confirmation before sending
    confirm = input("\nDo you want to send this notification to the configured numbers? (y/n): ")
    if confirm.lower() == 'y':
        print("Sending notification...")
        result = notify_new_order(test_order)
        if result:
            print("✅ Notification sent successfully!")
        else:
            print("❌ Failed to send notification")
    else:
        print("Operation cancelled")

def test_with_real_order():
    """Test with a real order from WooCommerce"""
    if not woocommerce.is_connected:
        print("❌ WooCommerce API is not connected")
        return
    
    # Get order ID from command line or prompt
    if len(sys.argv) > 1:
        order_id = sys.argv[1]
    else:
        order_id = input("Enter a WooCommerce order ID: ")
    
    print(f"Fetching order #{order_id} from WooCommerce...")
    order = woocommerce.get_order(order_id)
    
    if not order:
        print(f"❌ Order #{order_id} not found")
        return
    
    print(f"✅ Order #{order_id} found")
    
    # Format and print the notification message
    notification = format_order_notification(order)
    print("\nNotification message:")
    print(notification)
    
    # Ask for confirmation before sending
    confirm = input("\nDo you want to send this notification to the configured numbers? (y/n): ")
    if confirm.lower() == 'y':
        print("Sending notification...")
        result = notify_new_order(order)
        if result:
            print("✅ Notification sent successfully!")
        else:
            print("❌ Failed to send notification")
    else:
        print("Operation cancelled")

if __name__ == "__main__":
    print("WhatsApp Order Notification Test")
    print("===============================")
    
    print("\nSelect test mode:")
    print("1. Test with sample order data")
    print("2. Test with real order from WooCommerce")
    
    choice = input("\nEnter your choice (1/2): ")
    
    if choice == '1':
        test_with_sample_order()
    elif choice == '2':
        test_with_real_order()
    else:
        print("Invalid choice") 