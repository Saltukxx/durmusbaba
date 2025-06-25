from flask import Flask, request
import requests
import json
import google.auth
from google.auth.transport.requests import Request
from google.oauth2 import service_account
import os
import base64
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
    # Check for base64 encoded JSON first (more secure for CI/CD environments)
    if os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BASE64"):
        try:
            # Decode base64 string to JSON
            service_account_json = base64.b64decode(os.getenv("GOOGLE_APPLICATION_CREDENTIALS_BASE64")).decode('utf-8')
            temp_file = "tmp_service_account.json"
            with open(temp_file, "w") as f:
                f.write(service_account_json)
            return temp_file
        except Exception as e:
            print(f"Error decoding base64 credentials: {e}")
    
    # Check for plain JSON string (less secure, but works)
    elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON"):
        try:
            service_account_json = os.getenv("GOOGLE_APPLICATION_CREDENTIALS_JSON")
            temp_file = "tmp_service_account.json"
            with open(temp_file, "w") as f:
                f.write(service_account_json)
            return temp_file
        except Exception as e:
            print(f"Error writing credentials from JSON: {e}")
    
    # Fall back to file path
    return os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")

# Set up service account file path
SERVICE_ACCOUNT_FILE = setup_service_account()

ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "EAA3oBtMMm1MBOzkt67d9vFc6dk1LzeHKv8MWy2PZA4GP2QGCZCpEdOYcw9jxDOkwetRCZCAhC3jCZCBNO5TQZCfcUOZCeDfgwldYRVT4mjLwgPs4tJ7FhaC3AoWK3FaeoaTbTZCnRzpyRAIfdMGVqQSO2ZA1l9vngzK5s5P7zQIAGdT2Ve7jWhCLg9TyJGyo5rjhaJAMiPbMcdTUS7SvmzfEHkjR36fZCoQL5xV2EpS5UVmkJNyAZD")
PHONE_NUMBER_ID = os.getenv("META_PHONE_NUMBER_ID", "670086282856954")
VERIFY_TOKEN = os.getenv("WEBHOOK_VERIFY_TOKEN", "whatsapptoken")

def detect_intent_texts(project_id, session_id, text, language_code):
    credentials = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE,
        scopes=["https://www.googleapis.com/auth/cloud-platform"],
    )
    from google.cloud import dialogflow_v2 as dialogflow
    client_options = {"api_endpoint": "europe-west2-dialogflow.googleapis.com"}
    session_client = dialogflow.SessionsClient(credentials=credentials, client_options=client_options)
    session = session_client.session_path(project_id, session_id)
    text_input = dialogflow.TextInput(text=text, language_code=language_code)
    query_input = dialogflow.QueryInput(text=text_input)
    response = session_client.detect_intent(
        request={"session": session, "query_input": query_input}
    )
    return response.query_result.fulfillment_text

@app.route("/webhook", methods=["GET", "POST"])
def webhook():
    if request.method == "GET":
        if request.args.get("hub.verify_token") == VERIFY_TOKEN:
            return request.args.get("hub.challenge")
        return "Invalid token", 403

    data = request.get_json()
    print("GELEN MESAJ:", json.dumps(data, indent=2))

    try:
        msg = data["entry"][0]["changes"][0]["value"]["messages"][0]
        sender = msg["from"]
        message_text = msg["text"]["body"]
        response_text = detect_intent_texts(PROJECT_ID, SESSION_ID, message_text, LANGUAGE_CODE)

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
        requests.post(url, headers=headers, json=payload)

    except Exception as e:
        print("HATA:", e)

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
    app.run(host="0.0.0.0", port=port)
