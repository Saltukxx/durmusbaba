# WhatsApp Business API Setup Guide

## Error Message
Currently, you're receiving this error:
```
"Hesap Mevcut Değil. Bulut API'sinde hesap mevcut değil, lütfen önce bir hesap oluşturmak için API'yi kullan / kaydet."
```

This means "Account does not exist. The account does not exist in the Cloud API, please first use/save the API to create an account."

## Setup Steps

### 1. Create a Facebook Developer Account
- Go to [Facebook Developer Portal](https://developers.facebook.com/)
- Sign in with your Facebook account
- Register as a developer if you haven't already

### 2. Create a Meta App
- Go to [My Apps](https://developers.facebook.com/apps/)
- Click "Create App"
- Select "Business" as the app type
- Fill in the required information and create the app

### 3. Add WhatsApp to Your App
- From your app dashboard, click "Add Product"
- Find and click on "WhatsApp" 
- Follow the setup instructions

### 4. Set Up WhatsApp Business Account
- In the WhatsApp setup page, you'll need to connect to or create a WhatsApp Business Account
- Follow the prompts to complete this process

### 5. Register Your Phone Number
- In the WhatsApp dashboard, go to "Getting Started"
- Click "Add phone number"
- Follow the verification process to register your phone number

### 6. Get Your Phone Number ID
- Once your phone number is registered, you'll see it listed in the dashboard
- Note the Phone Number ID associated with your number

### 7. Generate a New Access Token
- In your app dashboard, go to "WhatsApp" > "API Setup"
- Generate a new temporary access token (or set up a permanent one)
- Copy this token for use in your scripts

### 8. Update Your Scripts
- Update the `register_app.ps1` and `send_message.ps1` scripts with your new:
  - Phone Number ID
  - Access Token

### 9. Run the Scripts Again
- First run `register_app.ps1` to register your app
- Then run `send_message.ps1` to send a test message

## Additional Resources
- [WhatsApp Business API Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [WhatsApp Business Platform Overview](https://developers.facebook.com/docs/whatsapp/overview)
- [WhatsApp Cloud API Reference](https://developers.facebook.com/docs/whatsapp/cloud-api/reference)

## Troubleshooting
- Make sure your access token has the necessary permissions
- Ensure your phone number is properly registered and verified
- The recipient's phone number must have an active WhatsApp account
- Format phone numbers without the "+" prefix (e.g., "491783977612" not "+491783977612")
- If you continue to have issues, check the [WhatsApp Business API FAQ](https://developers.facebook.com/docs/whatsapp/cloud-api/support/faq) 