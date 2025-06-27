# WhatsApp Dialogflow Bot

A WhatsApp bot that integrates with Dialogflow and WooCommerce for durmusbaba.de.

## Features

- WhatsApp integration using Meta Cloud API
- Dialogflow integration for natural language processing
- WooCommerce integration for product and order information
- Product search and recommendation
- Order status queries
- Automatic order notifications via WhatsApp

## Order Notification System

The system automatically sends WhatsApp notifications to specified phone numbers when new orders are received. See [Order Notification Setup Guide](order_notification_setup.md) for details.

## Setup

1. Clone this repository
2. Create a `.env` file with your credentials (see `.env.example`)
3. Install dependencies: `pip install -r requirements.txt`
4. Run the application: `python main.py`

## Environment Variables

See `.env.example` for required environment variables.

## Webhook Configuration

- WhatsApp webhook: `/webhook`
- WooCommerce webhook: `/woocommerce-webhook`

## Özellikler

- WhatsApp API entegrasyonu
- Google Gemini AI entegrasyonu
- WooCommerce entegrasyonu (ürün ve sipariş sorgulama)
- Otomatik mesaj yanıtlama
- Gelişmiş sohbet bağlamı yönetimi
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

## Gelişmiş Sohbet Bağlamı Yönetimi

Bot, kullanıcı ile sohbet sırasında bağlamı akıllıca takip etmek için gelişmiş bir bağlam yönetim sistemi kullanır:

1. **Varlık Takibi**: Konuşma sırasında geçen ürünler, kategoriler, fiyat aralıkları ve siparişler otomatik olarak tanınır ve takip edilir.

2. **Bağlamsal Referanslar**: Bot, kullanıcının "bu ürün" veya "bu kategori" gibi referanslarını anlayabilir ve doğru bilgiyi sağlayabilir.

3. **Konu Takibi**: Konuşmanın hangi konuda olduğu (ürün bilgisi, sipariş durumu, satış sorgusu, destek) otomatik olarak tespit edilir.

4. **Çok Dilli Referans Algılama**: Almanca, İngilizce ve Türkçe dillerinde referanslar algılanabilir:
   - "Dieses Produkt" / "This product" / "Bu ürün"
   - "In dieser Kategorie" / "In this category" / "Bu kategoride"
   - "Diese Bestellung" / "This order" / "Bu sipariş"

5. **Otomatik Varlık Çıkarımı**: Mesajlardan ürün modelleri, kategoriler, fiyat aralıkları ve sipariş numaraları otomatik olarak çıkarılır.

Örnek kullanım:
- "Haben Sie Embraco NJ 9238?" ardından "Wie ist der Preis für dieses Produkt?"
- "Zeigen Sie mir Bitzer Kompressoren" ardından "Gibt es in dieser Kategorie etwas unter 500 Euro?"
- "Wo ist meine Bestellung #12345?" ardından "Wann wird diese Bestellung geliefert?"

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

Sohbet bağlamı yönetimini test etmek için:
```bash
python test_conversation_context.py
```

Bu scriptler ile:
1. Webhook'a test mesajları gönderebilir
2. WhatsApp API'yi doğrudan test edebilir
3. Gemini AI'yi doğrudan test edebilirsiniz
4. WooCommerce ürün ve sipariş sorgulama özelliklerini test edebilirsiniz
5. Satış asistanı özelliklerini test edebilirsiniz
6. Sohbet bağlamı yönetimini test edebilirsiniz

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır. 