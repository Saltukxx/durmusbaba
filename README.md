# WhatsApp Gemini Bot

Bu proje, WhatsApp API ve Google Gemini AI'yi kullanarak akıllı bir chatbot oluşturmak için geliştirilmiştir. Bot, WhatsApp üzerinden gelen mesajları alır, Gemini AI ile işler ve yanıtları kullanıcıya geri gönderir.

## Özellikler

- WhatsApp API entegrasyonu
- Google Gemini AI entegrasyonu
- Otomatik mesaj yanıtlama
- Kullanıcıya özel sohbet geçmişi
- E-ticaret ürün bilgileri

## Kurulum

### Gereksinimler

```
Flask
requests
google-auth
google-auth-oauthlib
google-auth-httplib2
google-generativeai>=0.3.0
python-dotenv
```

### Yerel Geliştirme

1. Repository'yi klonlayın:
```bash
git clone https://github.com/kullanıcıadınız/whatsapp-gemini-bot.git
cd whatsapp-gemini-bot
```

2. Gerekli paketleri yükleyin:
```bash
pip install -r requirements.txt
```

3. `.env` dosyası oluşturun ve aşağıdaki değişkenleri ayarlayın:
```
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-pro
LANGUAGE_CODE=tr
META_ACCESS_TOKEN=your-meta-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
WEBHOOK_VERIFY_TOKEN=your-webhook-token
PORT=10000
```

4. Uygulamayı çalıştırın:
```bash
python main.py
```

### Render'a Deployment

1. Render'da yeni bir Web Service oluşturun
2. GitHub repository'nizi bağlayın
3. Environment variables bölümünde tüm `.env` değişkenlerini ekleyin
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python main.py`
6. Auto-Deploy ayarını etkinleştirin

## WhatsApp API Webhook Ayarları

1. Meta for Developers hesabınızda WhatsApp API uygulamanızı açın
2. Webhooks bölümüne gidin
3. Webhook URL'nizi ayarlayın: `https://[your-render-url]/webhook`
4. Verify Token'ı `.env` dosyasında belirttiğiniz `WEBHOOK_VERIFY_TOKEN` değeri ile aynı olacak şekilde ayarlayın

## Gemini API Kullanımı

Google Gemini API'yi kullanmak için:
1. [Google AI Studio](https://aistudio.google.com/) adresine gidin
2. API key oluşturun
3. Oluşturduğunuz API key'i `.env` dosyasında `GEMINI_API_KEY` değişkenine atayın

## Test Etme

Uygulamayı test etmek için:
```bash
python test_webhook.py
```
Bu script ile:
1. Webhook'a test mesajları gönderebilir
2. WhatsApp API'yi doğrudan test edebilir
3. Gemini AI'yi doğrudan test edebilirsiniz

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 