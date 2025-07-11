#!/usr/bin/env python
"""
Bu script, WhatsApp webhook'unuzu test etmek için kullanılır.
WhatsApp'tan gelen bir mesajı simüle eder.
"""

import requests
import json
import os
from dotenv import load_dotenv
from main import get_gemini_response

# .env dosyasından değişkenleri yükle
load_dotenv()

def test_webhook(webhook_url, message_text="Merhaba, bu bir test mesajıdır."):
    """
    WhatsApp webhook'una test mesajı gönderir
    """
    # WhatsApp'tan gelen mesaj formatını simüle et
    payload = {
        "object": "whatsapp_business_account",
        "entry": [
            {
                "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
                "changes": [
                    {
                        "value": {
                            "messaging_product": "whatsapp",
                            "metadata": {
                                "display_phone_number": "905551234567",
                                "phone_number_id": "PHONE_NUMBER_ID"
                            },
                            "contacts": [
                                {
                                    "profile": {
                                        "name": "Test User"
                                    },
                                    "wa_id": "905551234567"
                                }
                            ],
                            "messages": [
                                {
                                    "from": "905551234567",
                                    "id": "wamid.test123456789",
                                    "timestamp": "1623456789",
                                    "text": {
                                        "body": message_text
                                    },
                                    "type": "text"
                                }
                            ]
                        },
                        "field": "messages"
                    }
                ]
            }
        ]
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        print(f"Sending test payload to {webhook_url}:")
        print(json.dumps(payload, indent=2))
        response = requests.post(webhook_url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_send_message(phone_number):
    """
    WhatsApp API'ye doğrudan mesaj gönderir
    """
    access_token = os.getenv("META_ACCESS_TOKEN")
    phone_number_id = os.getenv("META_PHONE_NUMBER_ID")
    
    if not access_token or not phone_number_id:
        print("ERROR: META_ACCESS_TOKEN or META_PHONE_NUMBER_ID not found in .env file")
        return False
    
    url = f"https://graph.facebook.com/v18.0/{phone_number_id}/messages"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone_number,
        "type": "text",
        "text": {"body": "Bu bir test mesajıdır. WhatsApp API çalışıyor mu kontrol ediyoruz."}
    }
    
    try:
        print(f"Sending direct message to {phone_number} via WhatsApp API:")
        print(json.dumps(payload, indent=2))
        response = requests.post(url, json=payload, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {e}")
        return False

def test_gemini_direct():
    """
    Gemini AI'yi doğrudan test eder, WhatsApp API'ye bağlanmadan
    """
    import google.generativeai as genai
    
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    
    if not gemini_api_key:
        print("ERROR: GEMINI_API_KEY not found in .env file")
        return False
    
    try:
        # Configure Gemini
        genai.configure(api_key=gemini_api_key)
        print(f"Using Gemini model: {gemini_model}")
        model = genai.GenerativeModel(gemini_model)
        
        # Test in different languages
        test_messages = {
            "Türkçe": "Merhaba, ürünleriniz hakkında bilgi alabilir miyim?",
            "English": "Hello, can I get information about your products?",
            "Deutsch": "Hallo, kann ich Informationen über Ihre Produkte bekommen?"
        }
        
        for language, message in test_messages.items():
            print(f"\n\nTesting in {language}:")
            print(f"Sending test prompt to Gemini AI: '{message}'")
            response = model.generate_content(message)
            
            print(f"\nGemini AI Response ({language}):")
            print(response.text)
        
        return True
    except Exception as e:
        print(f"Error testing Gemini AI: {e}")
        return False

def test_product_lookup():
    # Test user ID
    user_id = "test_user_123"
    
    # Test queries
    test_queries = [
        "Embraco EMY 80 CLP",
        "EMY 80 CLP",
        "EMY 80",
        "Was kostet Embraco EMY 80 CLP",
        "Preis für EMY 80 CLP",
        "Zeige mir Produkte von Embraco unter 100 Euro",
        "Danfoss Produkte"
    ]
    
    print("\nTesting product lookup functionality:")
    print("-" * 50)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        response = get_gemini_response(user_id, query)
        print(f"Response:\n{response}")
        print("-" * 50)

if __name__ == "__main__":
    print("WhatsApp Gemini Bot Test Tool")
    print("=========================\n")
    
    choice = input("Ne yapmak istiyorsunuz?\n1. Webhook'a test mesajı gönder\n2. WhatsApp API ile doğrudan mesaj gönder\n3. Gemini AI'yi doğrudan test et\n4. Ürün arama işlevini test et\nSeçiminiz (1/2/3/4): ")
    
    if choice == "1":
        webhook_url = input("Webhook URL'nizi girin (örn: https://durmusbaba.onrender.com/webhook): ")
        test_message = input("Test mesajını girin (veya varsayılan için boş bırakın): ")
        if not test_message:
            test_message = "Merhaba, bu bir test mesajıdır."
        
        print(f"\nWebhook test ediliyor: {webhook_url}")
        print(f"Mesaj: {test_message}")
        
        success = test_webhook(webhook_url, test_message)
        
        if success:
            print("\n✅ Test başarılı! Webhook yanıt verdi.")
        else:
            print("\n❌ Test başarısız. Webhook yanıt vermedi veya bir hata oluştu.")
    
    elif choice == "2":
        phone_number = input("Mesaj göndermek istediğiniz telefon numarasını girin (örn: 905551234567): ")
        
        print(f"\nWhatsApp API ile {phone_number} numarasına mesaj gönderiliyor...")
        
        success = test_send_message(phone_number)
        
        if success:
            print("\n✅ Test başarılı! WhatsApp API yanıt verdi.")
        else:
            print("\n❌ Test başarısız. WhatsApp API yanıt vermedi veya bir hata oluştu.")
    
    elif choice == "3":
        print("\nGemini AI doğrudan test ediliyor...")
        
        success = test_gemini_direct()
        
        if success:
            print("\n✅ Test başarılı! Gemini AI yanıt verdi.")
        else:
            print("\n❌ Test başarısız. Gemini AI yanıt vermedi veya bir hata oluştu.")
    
    elif choice == "4":
        test_product_lookup()
    
    else:
        print("Geçersiz seçim.") 