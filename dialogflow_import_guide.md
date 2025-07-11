# Dialogflow'da Intent'leri Toplu Olarak İçe Aktarma Kılavuzu

Bu kılavuz, hazırladığımız e-ticaret chatbot intent'lerini Dialogflow'a toplu olarak nasıl aktarabileceğinizi anlatmaktadır.

## 1. Dialogflow Konsolu'na Giriş Yapın

- [Dialogflow Console](https://dialogflow.cloud.google.com/) adresine gidin
- Google hesabınızla giriş yapın
- Agent'inizi seçin (durmusbaba)

## 2. Dil Ayarlarını Kontrol Edin

- Sol menüden "Languages" sekmesine gidin
- Agent'inizin dilinin "de" (Almanca) olarak ayarlandığından emin olun
- Eğer değilse, dil ayarını değiştirin

## 3. Zip Dosyası Oluşturma

Dialogflow'a toplu içe aktarma için, JSON dosyalarını bir zip dosyası içinde organize etmeniz gerekir. Ancak bu biraz karmaşık olabilir. Bunun yerine, Dialogflow'un arayüzünü kullanarak intent'leri ve entity'leri tek tek eklemek daha kolay olacaktır.

## 4. Intent'leri Manuel Olarak Ekleme

1. Sol menüden "Intents" sekmesine gidin
2. "CREATE INTENT" butonuna tıklayın
3. Intent'e bir isim verin (örneğin "Begrüßung")
4. "Training phrases" bölümüne ecommerce_intents_deutsch.json dosyasındaki ilgili intent'in training phrases'lerini ekleyin
5. "Responses" bölümüne ilgili intent'in yanıtlarını ekleyin
6. "SAVE" butonuna tıklayarak intent'i kaydedin
7. Diğer intent'ler için aynı işlemi tekrarlayın

## 5. Entity'leri Ekleme

1. Sol menüden "Entities" sekmesine gidin
2. "CREATE ENTITY" butonuna tıklayın
3. Entity'ye bir isim verin (örneğin "produkt")
4. ecommerce_intents_deutsch.json dosyasındaki entity değerlerini ve eş anlamlılarını ekleyin
5. "SAVE" butonuna tıklayarak entity'yi kaydedin

## 6. Agent'i Yayınlama

1. Tüm intent'leri ve entity'leri ekledikten sonra, sağ üst köşedeki "SAVE" butonuna tıklayın
2. Ardından "PUBLISH A VERSION" butonuna tıklayarak agent'inizi yayınlayın

## 7. Test Etme

1. Sağ paneldeki "Try it now" bölümünü kullanarak agent'inizi test edin
2. Örnek ifadeler yazın ve doğru intent'lerin tetiklenip tetiklenmediğini kontrol edin

## Not

Bu kılavuz, Dialogflow'un web arayüzünü kullanarak intent'leri ve entity'leri eklemeyi anlatmaktadır. Eğer çok sayıda intent ve entity eklemeniz gerekiyorsa, Dialogflow API'yi kullanarak programatik olarak da ekleyebilirsiniz, ancak bu daha ileri düzey bir konudur. 