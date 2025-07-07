#!/usr/bin/env python
import requests
import json
import sys

# User inputs with actual values
country_code = "49"  # Germany country code
phone_number = "15221581762"  # Phone number without country code
verification_code = "VERIFICATION_CODE"  # The code you received via SMS or voice call

# API endpoint
url = "https://graph.whatsapp.com/v1/account/verify"

# Request body
body = {
    "cc": country_code,
    "phone_number": phone_number,
    "code": verification_code
}

# Headers
headers = {
    "Content-Type": "application/json"
}

print("Completing WhatsApp account registration...")
print(f"Sending verification code to: {url}")

try:
    response = requests.post(url, headers=headers, json=body)
    response.raise_for_status()  # Raise an exception for 4XX/5XX responses
    
    print("Registration completion successful!")
    response_data = response.json()
    print(json.dumps(response_data, indent=2))
    
    print("Your WhatsApp account has been registered successfully.")
    print("If you were re-registering your account, remember to restart the Coreapp.")
    
except requests.exceptions.RequestException as e:
    print("Registration completion failed:")
    print(f"Error: {str(e)}")
    
    if hasattr(e, "response") and e.response:
        print(f"Status code: {e.response.status_code}")
        print(f"Response body: {e.response.text}") 