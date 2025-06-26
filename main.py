from flask import Flask, request
import requests
import json
import google.auth
from google.auth.transport.requests import Request
import os
import base64
import traceback
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configuration from environment variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-pro")
LANGUAGE_CODE = os.getenv("LANGUAGE_CODE", "tr")
CHAT_HISTORY = {}  # Store chat history for different users

# Configure Gemini AI
genai.configure(api_key=GEMINI_API_KEY)

ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "EAA3oBtMMm1MBOzkt67d9vFc6dk1LzeHKv8MWy2PZA4GP2QGCZCpEdOYcw9jxDOkwetRCZCAhC3jCZCBNO5TQZCfcUOZCeDfgwldYRVT4mjLwgPs4tJ7FhaC3AoWK3FaeoaTbTZCnRzpyRAIfdMGVqQSO2ZA1l9vngzK5s5P7zQIAGdT2Ve7jWhCLg9TyJGyo5rjhaJAMiPbMcdTUS7SvmzfEHkjR36fZCoQL5xV2EpS5UVmkJNyAZD")
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "670086282856954")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "whatsapptoken")

# Load e-commerce intents from JSON file
def load_ecommerce_intents():
    try:
        with open('ecommerce_intents.json', 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading ecommerce intents: {e}")
        return {"intents": [], "entities": []}

ECOMMERCE_DATA = load_ecommerce_intents()

def get_gemini_response(user_id, text):
    print(f"Getting Gemini response for text: '{text}'")
    try:
        # Initialize or get existing chat session
        if user_id not in CHAT_HISTORY:
            # Create a new chat session with system prompt in German
            system_prompt = """
            Du bist ein Kundendienstassistent für einen E-Commerce-Shop. 
            Du kannst über folgende Produktkategorien und Informationen helfen:
            - Hemden (Preis: ab 199 TL)
            - Hosen (Preis: ab 249 TL)
            - Schuhe (Preis: ab 399 TL)
            - Taschen (Preis: ab 299 TL)
            - Accessoires (Preis: ab 49 TL)
            
            Alle Produkte sind auf Lager verfügbar. Sei immer höflich und hilfsbereit zu den Kunden.
            Du kannst ihnen empfehlen, die Website zu besuchen oder den Kundenservice unter 0212 123 45 67 anzurufen, um eine Bestellung aufzugeben.
            
            WICHTIG: Erkenne die Sprache des Benutzers und antworte IMMER in derselben Sprache, in der der Benutzer dich anspricht.
            Wenn der Benutzer auf Türkisch schreibt, antworte auf Türkisch.
            Wenn der Benutzer auf Englisch schreibt, antworte auf Englisch.
            Wenn der Benutzer auf Deutsch schreibt, antworte auf Deutsch.
            Wenn der Benutzer in einer anderen Sprache schreibt, versuche in dieser Sprache zu antworten.
            """
            
            model = genai.GenerativeModel(GEMINI_MODEL)
            print(f"Using Gemini model: {GEMINI_MODEL}")
            CHAT_HISTORY[user_id] = model.start_chat(history=[
                {"role": "user", "parts": ["Systeminfo"]},
                {"role": "model", "parts": [system_prompt]}
            ])
        
        # Get response from Gemini
        response = CHAT_HISTORY[user_id].send_message(text)
        response_text = response.text
        print(f"Gemini response: {response_text}")
        return response_text
    except Exception as e:
        print(f"Error in get_gemini_response: {e}")
        traceback.print_exc()
        return f"Üzgünüm, bir hata oluştu: {str(e)}"

@app.route("/", methods=["GET"])
def home():
    return "WhatsApp Gemini Bot is running. Use /webhook endpoint for WhatsApp API."

@app.route("/webhook", methods=["GET", "POST"])
def webhook():
    print(f"Received {request.method} request to /webhook")
    
    if request.method == "GET":
        print("Processing GET request (webhook verification)")
        verify_token = request.args.get("hub.verify_token")
        print(f"Received verify_token: {verify_token}, expected: {VERIFY_TOKEN}")
        if verify_token == VERIFY_TOKEN:
            challenge = request.args.get("hub.challenge")
            print(f"Verification successful, returning challenge: {challenge}")
            return challenge
        print("Invalid verification token")
        return "Invalid token", 403

    print("Processing POST request (incoming message)")
    
    # Tüm request verilerini detaylı olarak loglayalım
    print("Request Headers:")
    print(dict(request.headers))
    
    print("Request Raw Data:")
    print(request.get_data().decode('utf-8'))
    
    data = request.get_json()
    print("GELEN MESAJ (JSON):", json.dumps(data, indent=2))

    try:
        # Check if this is a WhatsApp message
        if "entry" in data and data["entry"] and "changes" in data["entry"][0] and data["entry"][0]["changes"]:
            value = data["entry"][0]["changes"][0]["value"]
            print("Value object:", json.dumps(value, indent=2))
            
            # Check if there are messages
            if "messages" in value and value["messages"]:
                msg = value["messages"][0]
                print("Message object:", json.dumps(msg, indent=2))
                
                sender = msg["from"]
                print(f"Message from sender: {sender}")
                
                # Check if this is a text message
                if "text" in msg and "body" in msg["text"]:
                    message_text = msg["text"]["body"]
                    print(f"Message text: {message_text}")
                    
                    # Get response from Gemini AI
                    response_text = get_gemini_response(sender, message_text)
                    print(f"Response from Gemini: {response_text}")
                    
                    # Send response back to WhatsApp
                    url = f"https://graph.facebook.com/v18.0/{PHONE_NUMBER_ID}/messages"
                    headers = {
                        "Authorization": f"Bearer {ACCESS_TOKEN}",
                        "Content-Type": "application/json"
                    }
                    payload = {
                        "messaging_product": "whatsapp",
                        "to": sender,
                        "type": "text",
                        "text": {"body": response_text}
                    }
                    print(f"Sending response to WhatsApp API: {json.dumps(payload)}")
                    response = requests.post(url, headers=headers, json=payload)
                    print(f"WhatsApp API response: {response.status_code} - {response.text}")
                else:
                    print("Received message is not a text message or text structure is different than expected")
                    print("Full message structure:", json.dumps(msg, indent=2))
            else:
                print("No messages in the request or messages structure is different than expected")
                print("Full value structure:", json.dumps(value, indent=2))
        else:
            print("Not a valid WhatsApp message format or structure is different than expected")
            print("Full request data:", json.dumps(data, indent=2))

    except Exception as e:
        print(f"HATA: {e}")
        traceback.print_exc()

    return "ok", 200

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    print(f"Starting server on port {port}")
    app.run(host="0.0.0.0", port=port)
