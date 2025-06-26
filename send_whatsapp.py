#!/usr/bin/env python
# -*- coding: utf-8 -*-

import requests
import json
import os
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

def send_whatsapp_message(phone_number, message_text):
    """
    Send a WhatsApp message using the Facebook Graph API
    
    Args:
        phone_number (str): The phone number to send the message to (with country code, no + or spaces)
        message_text (str): The text message to send
    
    Returns:
        dict: The API response
    """
    # Get credentials from environment variables or use defaults from command arguments
    phone_number_id = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "725422520644608")
    access_token = os.getenv("WHATSAPP_ACCESS_TOKEN", "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf")
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "text",
        "text": {
            "body": message_text
        }
    }
    
    try:
        response = requests.post(url, headers=headers, json=data)
        response_data = response.json()
        
        if response.status_code == 200:
            print(f"✅ Message sent successfully to {phone_number}")
            print(f"Message ID: {response_data.get('messages', [{}])[0].get('id', 'Unknown')}")
        else:
            print(f"❌ Failed to send message. Status code: {response.status_code}")
            print(f"Error: {response_data.get('error', {}).get('message', 'Unknown error')}")
        
        return response_data
    
    except Exception as e:
        print(f"❌ Exception occurred: {str(e)}")
        return {"error": str(e)}

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Send WhatsApp messages using the Facebook Graph API")
    parser.add_argument("--phone", required=True, help="Phone number to send the message to (with country code, no + or spaces)")
    parser.add_argument("--message", required=True, help="Message text to send")
    
    args = parser.parse_args()
    
    send_whatsapp_message(args.phone, args.message) 