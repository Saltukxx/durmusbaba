#!/usr/bin/env python
import requests
import json
import sys

# Your Meta credentials
token = "EAA3oBtMMm1MBO7Tbd3OgrZBO8QouJRvyLFFyvzjeQPp2yar81O7hJyf14ZBo4cS1qmgtLWs7q6dxxinuZAGrKaRA9rOOc44vrlAAfxmwCowdMOu3YRpX0LcoKi9u0DZAJmhhySWVeWQPPSHnYLQAjHrFdah4TUxgpliiELIWtxB8BNZBt3kWil0LHkNlGNDbTxnEh0cQxvUhYCWqkh6TlItZChjBjQudMYZAF9NBAOf"
phone_id = "725422520644608"

# User inputs with actual values
country_code = "49"  # Germany country code
phone_number = "15221581762"  # Phone number without country code
method = "sms"  # Options: "sms" or "voice"
certificate_base64 = "CmoKJgio2JGKsKvAAxIGZW50OndhIg1EVVJNVVNCQUJBLkRFUMmj9cIGGkAue7qWxaNwjhWPRTKm/fPscgxdUjV1oI1F5cqkAFlt7hwBEf6N46GY69eSPnNVcDpW+/+bVDbKgFrD52CdHZsCEjBtRQbH55fg6/Bas7aRrWgrl1vh7V3C9i9eBSK9TzrcXgtyFjcQzHfmtr2VNBSbpOE="
# pin = "123456"  # Uncomment and set this if you have two-step verification enabled

# API endpoint - using the Graph API endpoint
url = f"https://graph.facebook.com/v18.0/{phone_id}/register"

# Request body
body = {
    "messaging_product": "whatsapp",
    "cc": country_code,
    "phone_number": phone_number,
    "method": method,
    "cert": certificate_base64
}

# Add PIN if it's set (for two-step verification)
# if pin:
#     body["pin"] = pin

# Headers with authorization
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print("Registering WhatsApp account...")
print(f"Sending registration request to: {url}")

try:
    response = requests.post(url, headers=headers, json=body)
    response.raise_for_status()  # Raise an exception for 4XX/5XX responses
    
    print("Registration request successful!")
    print(f"Response status: {response.status_code}")
    response_data = response.json()
    print(json.dumps(response_data, indent=2))
    
    if response.status_code == 201:
        print("Account already exists. You are already registered.")
    elif response.status_code == 202:
        print("Account does not exist. Check your SMS or voice number for the registration code.")
        if "account" in response_data and response_data["account"] and "vname" in response_data["account"][0]:
            print(f"Verified name from certificate: {response_data['account'][0]['vname']}")
            print("If this is correct, proceed with completing your account registration.")
    
except requests.exceptions.RequestException as e:
    print("Registration request failed:")
    print(f"Error: {str(e)}")
    
    if hasattr(e, "response") and e.response:
        print(f"Status code: {e.response.status_code}")
        print(f"Response body: {e.response.text}") 