#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import requests
import json
import logging
import time
import threading
from datetime import datetime, timedelta
from dotenv import load_dotenv
from woocommerce_client import woocommerce
import traceback

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('order_notification')

# Configuration from environment variables
ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN")
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID")

# Notification recipients - hardcoded for security
NOTIFICATION_RECIPIENTS = [
    "+905492608080",  # Turkish number
    "+49178397612",  # German number
    "+905496607070",  # New Turkish number
    "+905054087289"   # New Turkish number
]

# Global variables for order tracking
last_checked_time = datetime.now() - timedelta(hours=1)  # Start by checking orders from the last hour
last_processed_orders = set()  # Set of order IDs that have been processed

def format_order_notification(order):
    """
    Format order information for notification message
    
    Args:
        order (dict): Order data from WooCommerce
        
    Returns:
        str: Formatted notification message
    """
    try:
        order_id = order['id']
        order_status = order['status']
        order_date = order['date_created'].split('T')[0]  # Just get the date part
        order_total = f"{order['total']} {order['currency']}"
        
        # Get customer info
        customer_name = f"{order['billing']['first_name']} {order['billing']['last_name']}"
        customer_email = order['billing']['email']
        customer_phone = order['billing']['phone']
        
        # Get shipping info if available
        shipping_info = ""
        if 'shipping' in order and order['shipping']:
            shipping = order['shipping']
            shipping_info = (
                f"📦 Shipping Address:\n"
                f"   {shipping.get('first_name', '')} {shipping.get('last_name', '')}\n"
                f"   {shipping.get('address_1', '')}\n"
                f"   {shipping.get('postcode', '')} {shipping.get('city', '')}\n"
                f"   {shipping.get('country', '')}"
            )
        
        # Get line items
        items_info = "📝 Items:"
        for item in order['line_items']:
            items_info += f"\n   - {item['name']} x{item['quantity']} ({item['total']} {order['currency']})"
        
        # Create notification message
        notification = (
            f"🔔 *NEW ORDER RECEIVED* 🔔\n\n"
            f"🛒 Order #{order_id}\n"
            f"📅 Date: {order_date}\n"
            f"💶 Total: {order_total}\n\n"
            f"👤 Customer:\n"
            f"   {customer_name}\n"
            f"   📧 {customer_email}\n"
            f"   📞 {customer_phone}\n\n"
            f"{shipping_info}\n\n"
            f"{items_info}\n\n"
            f"🌐 View in admin: https://durmusbaba.de/wp-admin/post.php?post={order_id}&action=edit"
        )
        
        return notification
    except Exception as e:
        logger.error(f"Error formatting order notification: {e}")
        return f"🔔 New order #{order.get('id', 'unknown')} received. Please check admin panel for details."

def send_whatsapp_notification(phone_number, message):
    """
    Send WhatsApp notification to a specific phone number
    
    Args:
        phone_number (str): Phone number in international format (e.g., +905492608080)
        message (str): Message to send
        
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Remove any spaces or special characters from phone number
        clean_phone = phone_number.replace(" ", "")
        if clean_phone.startswith("+"):
            clean_phone = clean_phone[1:]  # Remove the + sign
            
        url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
        headers = {
            "Authorization": f"Bearer {ACCESS_TOKEN}",
            "Content-Type": "application/json"
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": clean_phone,
            "type": "text",
            "text": {"body": message}
        }
        
        logger.info(f"Sending WhatsApp notification to {phone_number}")
        response = requests.post(url, headers=headers, json=payload)
        
        if response.status_code == 200:
            logger.info(f"Successfully sent notification to {phone_number}")
            return True
        else:
            logger.error(f"Failed to send notification to {phone_number}: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending WhatsApp notification: {e}")
        return False

def notify_new_order(order):
    """
    Send notifications about a new order to all configured recipients
    
    Args:
        order (dict): Order data from WooCommerce
        
    Returns:
        bool: True if all notifications were sent successfully, False otherwise
    """
    notification_message = format_order_notification(order)
    success = True
    
    for recipient in NOTIFICATION_RECIPIENTS:
        if not send_whatsapp_notification(recipient, notification_message):
            success = False
    
    return success

def handle_order_webhook(data):
    """
    Process WooCommerce webhook for new orders
    
    Args:
        data (dict): Webhook payload from WooCommerce
        
    Returns:
        bool: True if processed successfully, False otherwise
    """
    try:
        logger.info(f"Received webhook data: {json.dumps(data)[:200]}...")
        
        # Check if this is a new order
        order_id = data.get('id')
        order_status = data.get('status')
        
        if not order_id:
            logger.error("Webhook data missing order ID")
            return False
            
        logger.info(f"Processing webhook for order #{order_id} with status {order_status}")
        
        # Only process new orders
        if order_status in ['processing', 'pending']:
            # Add to processed orders set to avoid duplicate notifications
            global last_processed_orders
            if order_id in last_processed_orders:
                logger.info(f"Order #{order_id} already processed, skipping")
                return True
                
            # Get full order details from WooCommerce API
            logger.info(f"Fetching full details for order #{order_id}")
            order = woocommerce.get_order(order_id)
            
            if order:
                # Add to processed orders set
                last_processed_orders.add(order_id)
                
                # Send notifications
                logger.info(f"Sending notifications for order #{order_id}")
                return notify_new_order(order)
            else:
                logger.error(f"Failed to get order details for order #{order_id}")
                return False
        else:
            logger.info(f"Ignoring webhook for order #{order_id} with status {order_status}")
            return True
            
    except Exception as e:
        logger.error(f"Error processing order webhook: {e}")
        logger.error(traceback.format_exc())
        return False

def check_for_new_orders():
    """
    Periodically check for new orders and process them
    """
    global last_checked_time, last_processed_orders
    
    while True:
        try:
            current_time = datetime.now()
            # Check every 5 minutes instead of every hour
            if current_time - last_checked_time > timedelta(minutes=5):
                logger.info("Checking for new orders")
                
                # Get new orders from WooCommerce API
                new_orders = woocommerce.get_orders(status=['processing', 'pending'], after=last_checked_time)
                
                if new_orders:
                    logger.info(f"Found {len(new_orders)} new orders")
                    for order in new_orders:
                        order_id = order.get('id')
                        if order_id and order_id not in last_processed_orders:
                            logger.info(f"Processing new order #{order_id}")
                            notify_new_order(order)
                            last_processed_orders.add(order_id)
                else:
                    logger.info("No new orders found")
                
                # Always update the last checked time
                last_checked_time = current_time
                
            # Wait for 60 seconds before checking again
            time.sleep(60)
        except Exception as e:
            logger.error(f"Error checking for new orders: {e}")
            # Wait for 60 seconds before trying again
            time.sleep(60)

# For testing purposes
if __name__ == "__main__":
    # Test with a sample order
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
    print("Sample notification message:")
    print(notification)
    
    # Uncomment to test sending actual notifications
    # notify_new_order(test_order)

    # Start checking for new orders
    threading.Thread(target=check_for_new_orders).start() 