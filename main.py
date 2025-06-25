from flask import Flask, request
import requests
import json
import google.auth
from google.auth.transport.requests import Request
from google.oauth2 import service_account
import os
import base64
import traceback
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Configuration from environment variables
PROJECT_ID = os.getenv("DIALOGFLOW_PROJECT_ID", "tugce-gundoner-website")
SESSION_ID = os.getenv("DIALOGFLOW_SESSION_ID", "123456")
LANGUAGE_CODE = os.getenv("DIALOGFLOW_LANGUAGE_CODE", "tr")

# Handle service account credentials with enhanced security
def setup_service_account():
    print("Setting up service account...")
    # Check for base64 encoded JSON first (more secure for CI/CD environments)
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BASE64"):
        try:
            print("Using GOOGLE_APPLICATION_CREDENTIALS_BASE64")
            # Decode base64 string to JSON
            service_account_json = base64.b64decode(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BASE64")).decode('utf-8')
            temp_file = "tmp_service_account.json"
            with open(temp_file, "w") as f:
                f.write(service_account_json)
            print(f"Temporary service account file created: {temp_file}")
            return temp_file
        except Exception as e:
            print(f"Error decoding base64 credentials: {e}")
            traceback.print_exc()
    
    # Check for plain JSON string (less secure, but works)
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"):
        try:
            print("Using GOOGLE_APPLICATION_CREDENTIALS_JSON")
            service_account_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
            temp_file = "tmp_service_account.json"
            with open(temp_file, "w") as f:
                f.write(service_account_json)
            print(f"Temporary service account file created: {temp_file}")
            return temp_file
        except Exception as e:
            print(f"Error writing credentials from JSON: {e}")
            traceback.print_exc()
    
    # Fall back to file path
    print("Using service-account.json file")
    return os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")

# Set up service account file path
SERVICE_ACCOUNT_FILE = setup_service_account()
print(f"Service account file path: {SERVICE_ACCOUNT_FILE}")

ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "EAA3oBtMMm1MBOzkt67d9vFc6dk1LzeHKv8MWy2PZA4GP2QGCZCpEdOYcw9jxDOkwetRCZCAhC3jCZCBNO5TQZCfcUOZCeDfgwldYRVT4mjLwgPs4tJ7FhaC3AoWK3FaeoaTbTZCnRzpyRAIfdMGVqQSO2ZA1l9vngzK5s5P7zQIAGdT2Ve7jWhCLg9TyJGyo5rjhaJAMiPbMcdTUS7SvmzfEHkjR36fZCoQL5xV2EpS5UVmkJNyAZD")
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "670086282856954")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "whatsapptoken")

def detect_intent_texts(project_id, session_id, text, language_code):
    print(f"Detecting intent for text: '{text}'")
    try:
        print(f"Loading credentials from: {SERVICE_ACCOUNT_FILE}")
        credentials = service_account.Credentials.from_service_account_file(
            SERVICE_ACCOUNT_FILE,
            scopes=["https://www.googleapis.com/auth/cloud-platform"],
        )
        print("Credentials loaded successfully")
        
        from google.cloud import dialogflow_v2 as dialogflow
        client_options = {"api_endpoint": "europe-west2-dialogflow.googleapis.com"}
        print("Creating session client...")
        session_client = dialogflow.SessionsClient(credentials=credentials, client_options=client_options)
        print(f"Creating session path for project: {project_id}, session: {session_id}")
        session = session_client.session_path(project_id, session_id)
        text_input = dialogflow.TextInput(text=text, language_code=language_code)
        query_input = dialogflow.QueryInput(text=text_input)
        print("Sending detect_intent request to Dialogflow...")
        response = session_client.detect_intent(
            request={"session": session, "query_input": query_input}
        )
        print(f"Got response from Dialogflow: {response.query_result.fulfillment_text}")
        return response.query_result.fulfillment_text
    except Exception as e:
        print(f"Error in detect_intent_texts: {e}")
        traceback.print_exc()
        return f"Üzgünüm, bir hata oluştu: {str(e)}"

@app.route("/", methods=["GET"])
def home():
    return "WhatsApp Dialogflow Bot is running. Use /webhook endpoint for WhatsApp API."

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
    data = request.get_json()
    print("GELEN MESAJ:", json.dumps(data, indent=2))

    try:
        # Check if this is a WhatsApp message
        if "entry" in data and data["entry"] and "changes" in data["entry"][0] and data["entry"][0]["changes"]:
            value = data["entry"][0]["changes"][0]["value"]
            
            # Check if there are messages
            if "messages" in value and value["messages"]:
                msg = value["messages"][0]
                sender = msg["from"]
                print(f"Message from sender: {sender}")
                
                # Check if this is a text message
                if "text" in msg and "body" in msg["text"]:
                    message_text = msg["text"]["body"]
                    print(f"Message text: {message_text}")
                    
                    # Get response from Dialogflow
                    response_text = detect_intent_texts(PROJECT_ID, SESSION_ID, message_text, LANGUAGE_CODE)
                    print(f"Response from Dialogflow: {response_text}")
                    
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
                    print("Received message is not a text message")
            else:
                print("No messages in the request")
        else:
            print("Not a valid WhatsApp message format")

    except Exception as e:
        print(f"HATA: {e}")
        traceback.print_exc()

    return "ok", 200

# Cleanup function to remove temporary credentials file on shutdown
def cleanup():
    if os.path.exists("tmp_service_account.json"):
        try:
            os.remove("tmp_service_account.json")
            print("Temporary credentials file removed")
        except Exception as e:
            print(f"Error removing temporary file: {e}")

# Register cleanup function to run at exit
import atexit
atexit.register(cleanup)

if __name__ == "__main__":
    port = int(os.getenv("PORT", 10000))
    print(f"Starting server on port {port}")
    app.run(host="0.0.0.0", port=port)
