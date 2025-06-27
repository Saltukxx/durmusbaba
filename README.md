# WhatsApp Gemini Bot

Bu proje, WhatsApp API ve Google Gemini AI'yi kullanarak akıllı bir chatbot oluşturmak için geliştirilmiştir. Bot, WhatsApp üzerinden gelen mesajları alır, Gemini AI ile işler ve yanıtları kullanıcıya geri gönderir.

## Özellikler

- WhatsApp API entegrasyonu
- Google Gemini AI entegrasyonu
- WooCommerce entegrasyonu (ürün ve sipariş sorgulama)
- Otomatik mesaj yanıtlama
- Kullanıcıya özel sohbet geçmişi
- E-ticaret ürün bilgileri
- Sipariş takibi
- Satış asistanı özellikleri:
  - Ürün önerileri ve teklifler
  - Kategori navigasyonu
  - Müşteri ihtiyaçlarına göre ürün eşleştirme
  - Çok dilli destek (Almanca, İngilizce, Türkçe)

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
woocommerce
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
WC_CONSUMER_KEY=your-woocommerce-consumer-key
WC_CONSUMER_SECRET=your-woocommerce-consumer-secret
WC_STORE_URL=https://durmusbaba.de
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

## WooCommerce Entegrasyonu

WooCommerce entegrasyonu için:
1. WooCommerce mağazanızda API anahtarları oluşturun:
   - WooCommerce > Ayarlar > Gelişmiş > REST API
   - "Add key" butonuna tıklayın
   - Yetkileri "Read" olarak ayarlayın
   - Consumer Key ve Consumer Secret değerlerini kopyalayın
2. Bu değerleri `.env` dosyasında ilgili değişkenlere atayın:
   ```
   WC_CONSUMER_KEY=your-consumer-key
   WC_CONSUMER_SECRET=your-consumer-secret
   WC_STORE_URL=https://durmusbaba.de
   ```

## Satış Asistanı Özellikleri

Bot, aşağıdaki satış asistanı özelliklerini sunmaktadır:

1. **Ürün Önerileri**: Kullanıcının ihtiyaçlarına göre ürün önerileri sunar
2. **Kategori Navigasyonu**: Kullanıcıya ürün kategorilerini gösterir ve kategorilere göre ürünleri listeler
3. **Akıllı Eşleştirme**: Kullanıcının belirttiği özelliklere göre (fiyat aralığı, marka, özellikler) ürünleri filtreler
4. **Çok Dilli Destek**: Almanca, İngilizce ve Türkçe dillerinde hizmet verir
5. **Satış Dili**: Profesyonel bir satış temsilcisi gibi iletişim kurar

Örnek kullanım:
- "Ich suche einen leisen Kompressor unter 200 Euro" (200 Euro altında sessiz bir kompresör arıyorum)
- "Can you recommend a powerful Embraco compressor?" (Güçlü bir Embraco kompresör önerebilir misiniz?)
- "Danfoss marka bir kompresör arıyorum" (Arıyorum bir kompresör de marca Danfoss)

## Test Etme

Uygulamayı test etmek için:
```bash
python test_webhook.py
```

WooCommerce entegrasyonunu test etmek için:
```bash
python test_woocommerce.py
```

Satış asistanını test etmek için:
```bash
python test_sales_assistant.py
```

Bu scriptler ile:
1. Webhook'a test mesajları gönderebilir
2. WhatsApp API'yi doğrudan test edebilir
3. Gemini AI'yi doğrudan test edebilirsiniz
4. WooCommerce ürün ve sipariş sorgulama özelliklerini test edebilirsiniz
5. Satış asistanı özelliklerini test edebilirsiniz

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 