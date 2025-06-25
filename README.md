# WhatsApp Dialogflow Bot

Bu proje, WhatsApp API ve Google Dialogflow'u kullanarak akıllı bir chatbot oluşturmak için geliştirilmiştir. Bot, WhatsApp üzerinden gelen mesajları alır, Dialogflow ile işler ve yanıtları kullanıcıya geri gönderir.

## Özellikler

- WhatsApp API entegrasyonu
- Google Dialogflow NLP işleme
- Otomatik mesaj yanıtlama
- Güvenli kimlik doğrulama yönetimi

## Kurulum

### Gereksinimler

```
Flask
requests
google-auth
google-auth-oauthlib
google-auth-httplib2
google-api-python-client
google-cloud-dialogflow
python-dotenv
```

### Yerel Geliştirme

1. Repository'yi klonlayın:
```bash
git clone https://github.com/kullanıcıadınız/whatsapp-dialogflow-bot.git
cd whatsapp-dialogflow-bot
```

2. Gerekli paketleri yükleyin:
```bash
pip install -r requirements.txt
```

3. `.env` dosyası oluşturun ve aşağıdaki değişkenleri ayarlayın:
```
DIALOGFLOW_PROJECT_ID=your-project-id
DIALOGFLOW_SESSION_ID=123456
DIALOGFLOW_LANGUAGE_CODE=tr
META_ACCESS_TOKEN=your-meta-access-token
META_PHONE_NUMBER_ID=your-phone-number-id
WEBHOOK_VERIFY_TOKEN=your-webhook-token
PORT=10000
```

4. Google Cloud Service Account anahtarınızı `service-account.json` olarak kaydedin veya Base64 kodlanmış halini `.env` dosyasına ekleyin:
```
GOOGLE_APPLICATION_CREDENTIALS_BASE64=base64-encoded-credentials
```

5. Uygulamayı çalıştırın:
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

## Güvenlik

Bu projede güvenlik için aşağıdaki önlemler alınmıştır:
- Service account kimlik bilgilerinin güvenli yönetimi
- Hassas bilgilerin environment variables olarak saklanması
- Geçici dosyaların otomatik temizlenmesi

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 