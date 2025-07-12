const logger = require('./logger');

// Cold storage calculation questions and flow
const COLD_STORAGE_QUESTIONS = [
    {
        id: 'temperature',
        question: {
            en: "❄️ What is the required cold room temperature (°C)?\n\nSupported temperatures: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C\n\nPlease reply with just the temperature number (e.g., -20)",
            tr: "❄️ Gerekli soğuk oda sıcaklığı nedir (°C)?\n\nDesteklenen sıcaklıklar: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C\n\nLütfen sadece sıcaklık numarasını yazın (örn: -20)",
            de: "❄️ Welche Kühlraumtemperatur ist erforderlich (°C)?\n\nUnterstützte Temperaturen: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C\n\nBitte antworten Sie nur mit der Temperaturnummer (z.B. -20)"
        },
        validate: (value) => {
            const temp = parseInt(value);
            const supportedTemps = [12, 5, 0, -5, -15, -18, -20, -25];
            return supportedTemps.includes(temp);
        },
        errorMessage: {
            en: "❌ Please enter a valid temperature from the supported list: 12, 5, 0, -5, -15, -18, -20, -25",
            tr: "❌ Lütfen desteklenen listeden geçerli bir sıcaklık girin: 12, 5, 0, -5, -15, -18, -20, -25",
            de: "❌ Bitte geben Sie eine gültige Temperatur aus der unterstützten Liste ein: 12, 5, 0, -5, -15, -18, -20, -25"
        }
    },
    {
        id: 'products',
        question: {
            en: "📦 What product(s) will be stored inside the room?\n\nCommon products:\n• Meat & Poultry\n• Fish & Seafood\n• Dairy Products\n• Fruits & Vegetables\n• Frozen Foods\n• Beverages\n• Pharmaceuticals\n• Other\n\nPlease specify the main product type:",
            tr: "📦 Odada hangi ürün(ler) depolanacak?\n\nYaygın ürünler:\n• Et ve Tavuk\n• Balık ve Deniz Ürünleri\n• Süt Ürünleri\n• Meyve ve Sebze\n• Dondurulmuş Gıdalar\n• İçecekler\n• İlaçlar\n• Diğer\n\nLütfen ana ürün tipini belirtin:",
            de: "📦 Welche Produkte werden im Raum gelagert?\n\nHäufige Produkte:\n• Fleisch & Geflügel\n• Fisch & Meeresfrüchte\n• Milchprodukte\n• Obst & Gemüse\n• Tiefkühlkost\n• Getränke\n• Pharmazeutika\n• Andere\n\nBitte geben Sie den Hauptprodukttyp an:"
        },
        validate: (value) => value && value.trim().length > 0,
        errorMessage: {
            en: "❌ Please specify the product type to be stored",
            tr: "❌ Lütfen depolanacak ürün tipini belirtin",
            de: "❌ Bitte geben Sie den zu lagernden Produkttyp an"
        }
    },
    {
        id: 'length',
        question: {
            en: "📏 What is the inner length of the room (in meters)?\n\nPlease enter the length in meters (e.g., 10.5):",
            tr: "📏 Odanın iç uzunluğu nedir (metre cinsinden)?\n\nLütfen uzunluğu metre cinsinden girin (örn: 10.5):",
            de: "📏 Wie lang ist der Innenraum (in Metern)?\n\nBitte geben Sie die Länge in Metern ein (z.B. 10.5):"
        },
        validate: (value) => {
            const length = parseFloat(value);
            return !isNaN(length) && length > 0 && length <= 100;
        },
        errorMessage: {
            en: "❌ Please enter a valid length between 0.1 and 100 meters",
            tr: "❌ Lütfen 0.1 ile 100 metre arasında geçerli bir uzunluk girin",
            de: "❌ Bitte geben Sie eine gültige Länge zwischen 0.1 und 100 Metern ein"
        }
    },
    {
        id: 'width',
        question: {
            en: "📐 What is the inner width of the room (in meters)?\n\nPlease enter the width in meters (e.g., 8.0):",
            tr: "📐 Odanın iç genişliği nedir (metre cinsinden)?\n\nLütfen genişliği metre cinsinden girin (örn: 8.0):",
            de: "📐 Wie breit ist der Innenraum (in Metern)?\n\nBitte geben Sie die Breite in Metern ein (z.B. 8.0):"
        },
        validate: (value) => {
            const width = parseFloat(value);
            return !isNaN(width) && width > 0 && width <= 100;
        },
        errorMessage: {
            en: "❌ Please enter a valid width between 0.1 and 100 meters",
            tr: "❌ Lütfen 0.1 ile 100 metre arasında geçerli bir genişlik girin",
            de: "❌ Bitte geben Sie eine gültige Breite zwischen 0.1 und 100 Metern ein"
        }
    },
    {
        id: 'height',
        question: {
            en: "📏 What is the inner height of the room (in meters)?\n\nPlease enter the height in meters (e.g., 3.5):",
            tr: "📏 Odanın iç yüksekliği nedir (metre cinsinden)?\n\nLütfen yüksekliği metre cinsinden girin (örn: 3.5):",
            de: "📏 Wie hoch ist der Innenraum (in Metern)?\n\nBitte geben Sie die Höhe in Metern ein (z.B. 3.5):"
        },
        validate: (value) => {
            const height = parseFloat(value);
            return !isNaN(height) && height > 0 && height <= 20;
        },
        errorMessage: {
            en: "❌ Please enter a valid height between 0.1 and 20 meters",
            tr: "❌ Lütfen 0.1 ile 20 metre arasında geçerli bir yükseklik girin",
            de: "❌ Bitte geben Sie eine gültige Höhe zwischen 0.1 und 20 Metern ein"
        }
    },
    {
        id: 'insulation',
        question: {
            en: "🧱 What is the thickness of insulation panels?\n\nCommon options:\n• 8 cm\n• 10 cm\n• 12 cm\n• 15 cm\n• 20 cm\n\nPlease enter the thickness in cm (e.g., 10):",
            tr: "🧱 Yalıtım panellerinin kalınlığı nedir?\n\nYaygın seçenekler:\n• 8 cm\n• 10 cm\n• 12 cm\n• 15 cm\n• 20 cm\n\nLütfen kalınlığı cm cinsinden girin (örn: 10):",
            de: "🧱 Welche Dicke haben die Isolierpaneele?\n\nHäufige Optionen:\n• 8 cm\n• 10 cm\n• 12 cm\n• 15 cm\n• 20 cm\n\nBitte geben Sie die Dicke in cm ein (z.B. 10):"
        },
        validate: (value) => {
            const thickness = parseInt(value);
            return !isNaN(thickness) && thickness >= 5 && thickness <= 30;
        },
        errorMessage: {
            en: "❌ Please enter a valid insulation thickness between 5 and 30 cm",
            tr: "❌ Lütfen 5 ile 30 cm arasında geçerli bir yalıtım kalınlığı girin",
            de: "❌ Bitte geben Sie eine gültige Isolierdicke zwischen 5 und 30 cm ein"
        }
    },
    {
        id: 'floorInsulation',
        question: {
            en: "🏠 Is there floor insulation?\n\nPlease answer:\n• Yes\n• No\n\nFloor insulation is recommended for better energy efficiency:",
            tr: "🏠 Zemin yalıtımı var mı?\n\nLütfen cevap verin:\n• Evet\n• Hayır\n\nDaha iyi enerji verimliliği için zemin yalıtımı önerilir:",
            de: "🏠 Gibt es eine Fußbodenisolierung?\n\nBitte antworten Sie:\n• Ja\n• Nein\n\nFußbodenisolierung wird für bessere Energieeffizienz empfohlen:"
        },
        validate: (value) => {
            const answer = value.toLowerCase().trim();
            return ['yes', 'no', 'evet', 'hayır', 'hayir', 'ja', 'nein'].includes(answer);
        },
        errorMessage: {
            en: "❌ Please answer with 'Yes' or 'No'",
            tr: "❌ Lütfen 'Evet' veya 'Hayır' ile cevap verin",
            de: "❌ Bitte antworten Sie mit 'Ja' oder 'Nein'"
        }
    },
    {
        id: 'doorFrequency',
        question: {
            en: "🚪 How often will the door be opened daily?\n\nOptions:\n• Low (1-5 times)\n• Medium (6-20 times)\n• High (21-50 times)\n• Very High (50+ times)\n\nOr enter specific number of times per day:",
            tr: "🚪 Kapı günde kaç kez açılacak?\n\nSeçenekler:\n• Düşük (1-5 kez)\n• Orta (6-20 kez)\n• Yüksek (21-50 kez)\n• Çok Yüksek (50+ kez)\n\nVeya günlük belirli sayıyı girin:",
            de: "🚪 Wie oft wird die Tür täglich geöffnet?\n\nOptionen:\n• Niedrig (1-5 mal)\n• Mittel (6-20 mal)\n• Hoch (21-50 mal)\n• Sehr Hoch (50+ mal)\n\nOder geben Sie die spezifische Anzahl pro Tag ein:"
        },
        validate: (value) => {
            const answer = value.toLowerCase().trim();
            const frequency = parseInt(value);
            return ['low', 'medium', 'high', 'very high', 'düşük', 'orta', 'yüksek', 'çok yüksek', 'niedrig', 'mittel', 'hoch', 'sehr hoch'].includes(answer) || 
                   (!isNaN(frequency) && frequency >= 0 && frequency <= 200);
        },
        errorMessage: {
            en: "❌ Please enter a frequency category or number between 0-200",
            tr: "❌ Lütfen frekans kategorisi veya 0-200 arası sayı girin",
            de: "❌ Bitte geben Sie eine Frequenzkategorie oder Zahl zwischen 0-200 ein"
        }
    },
    {
        id: 'loadingAmount',
        question: {
            en: "⚖️ What is the daily loading/unloading amount (in kg)?\n\nThis includes:\n• Products entering the room\n• Products leaving the room\n• Total daily throughput\n\nPlease enter the amount in kg (e.g., 500):",
            tr: "⚖️ Günlük yükleme/boşaltma miktarı nedir (kg cinsinden)?\n\nBu şunları içerir:\n• Odaya giren ürünler\n• Odadan çıkan ürünler\n• Toplam günlük işlem miktarı\n\nLütfen miktarı kg cinsinden girin (örn: 500):",
            de: "⚖️ Wie viel wird täglich be-/entladen (in kg)?\n\nDies umfasst:\n• Produkte, die in den Raum gelangen\n• Produkte, die den Raum verlassen\n• Gesamter täglicher Durchsatz\n\nBitte geben Sie die Menge in kg ein (z.B. 500):"
        },
        validate: (value) => {
            const amount = parseFloat(value);
            return !isNaN(amount) && amount >= 0 && amount <= 100000;
        },
        errorMessage: {
            en: "❌ Please enter a valid amount between 0 and 100,000 kg",
            tr: "❌ Lütfen 0 ile 100.000 kg arasında geçerli bir miktar girin",
            de: "❌ Bitte geben Sie eine gültige Menge zwischen 0 und 100.000 kg ein"
        }
    },
    {
        id: 'productTemperature',
        question: {
            en: "🌡️ What is the temperature of products when they enter the room (°C)?\n\nCommon temperatures:\n• Room temperature (20-25°C)\n• Pre-cooled (5-10°C)\n• Frozen (-18°C)\n• Other specific temperature\n\nPlease enter the temperature in °C (e.g., 20):",
            tr: "🌡️ Ürünler odaya girdiğinde sıcaklıkları nedir (°C)?\n\nYaygın sıcaklıklar:\n• Oda sıcaklığı (20-25°C)\n• Ön soğutulmuş (5-10°C)\n• Donmuş (-18°C)\n• Diğer özel sıcaklık\n\nLütfen sıcaklığı °C cinsinden girin (örn: 20):",
            de: "🌡️ Welche Temperatur haben die Produkte beim Eingang in den Raum (°C)?\n\nHäufige Temperaturen:\n• Raumtemperatur (20-25°C)\n• Vorgekühlt (5-10°C)\n• Gefroren (-18°C)\n• Andere spezifische Temperatur\n\nBitte geben Sie die Temperatur in °C ein (z.B. 20):"
        },
        validate: (value) => {
            const temp = parseFloat(value);
            return !isNaN(temp) && temp >= -30 && temp <= 60;
        },
        errorMessage: {
            en: "❌ Please enter a valid temperature between -30°C and 60°C",
            tr: "❌ Lütfen -30°C ile 60°C arasında geçerli bir sıcaklık girin",
            de: "❌ Bitte geben Sie eine gültige Temperatur zwischen -30°C und 60°C ein"
        }
    },
    {
        id: 'coolingDuration',
        question: {
            en: "⏱️ What is the required cooling duration (in hours)?\n\nThis is how long it takes to cool products from entry temperature to storage temperature.\n\nCommon durations:\n• Fast cooling (4-8 hours)\n• Standard cooling (12-24 hours)\n• Slow cooling (24-48 hours)\n\nPlease enter duration in hours (e.g., 24):",
            tr: "⏱️ Gerekli soğuma süresi nedir (saat cinsinden)?\n\nBu, ürünlerin giriş sıcaklığından depolama sıcaklığına soğutulması için gereken süredir.\n\nYaygın süreler:\n• Hızlı soğutma (4-8 saat)\n• Standart soğutma (12-24 saat)\n• Yavaş soğutma (24-48 saat)\n\nLütfen süreyi saat cinsinden girin (örn: 24):",
            de: "⏱️ Welche Kühldauer ist erforderlich (in Stunden)?\n\nDies ist die Zeit, die benötigt wird, um Produkte von der Eingangstemperatur auf die Lagertemperatur zu kühlen.\n\nÜbliche Dauern:\n• Schnellkühlung (4-8 Stunden)\n• Standardkühlung (12-24 Stunden)\n• Langsamkühlung (24-48 Stunden)\n\nBitte geben Sie die Dauer in Stunden ein (z.B. 24):"
        },
        validate: (value) => {
            const duration = parseFloat(value);
            return !isNaN(duration) && duration > 0 && duration <= 168;
        },
        errorMessage: {
            en: "❌ Please enter a valid duration between 1 and 168 hours",
            tr: "❌ Lütfen 1 ile 168 saat arasında geçerli bir süre girin",
            de: "❌ Bitte geben Sie eine gültige Dauer zwischen 1 und 168 Stunden ein"
        }
    },
    {
        id: 'coolingType',
        question: {
            en: "❄️ What type of cooling system do you prefer?\n\nOptions:\n• Air cooling (Forced air circulation)\n• Direct expansion (DX system)\n• Evaporative cooling (Water-based)\n• Glycol cooling (Indirect system)\n\nPlease select your preferred cooling type:",
            tr: "❄️ Hangi tip soğutma sistemi tercih ediyorsunuz?\n\nSeçenekler:\n• Hava soğutmalı (Zorlanmış hava sirkülasyonu)\n• Direkt ekspansiyonlu (DX sistem)\n• Evaporatif soğutma (Su bazlı)\n• Glikol soğutma (İndirekt sistem)\n\nLütfen tercih ettiğiniz soğutma tipini seçin:",
            de: "❄️ Welchen Kühlungstyp bevorzugen Sie?\n\nOptionen:\n• Luftkühlung (Forcierte Luftzirkulation)\n• Direktexpansion (DX-System)\n• Verdunstungskühlung (Wasserbasiert)\n• Glykolkühlung (Indirektes System)\n\nBitte wählen Sie Ihren bevorzugten Kühlungstyp:"
        },
        validate: (value) => {
            const coolingType = value.toLowerCase();
            return coolingType.includes('air') || coolingType.includes('hava') || coolingType.includes('luft') ||
                   coolingType.includes('direct') || coolingType.includes('direkt') ||
                   coolingType.includes('evap') || coolingType.includes('verdun') ||
                   coolingType.includes('glycol') || coolingType.includes('glikol');
        },
        errorMessage: {
            en: "❌ Please select: Air cooling, Direct expansion, Evaporative, or Glycol cooling",
            tr: "❌ Lütfen şunlardan birini seçin: Hava soğutmalı, Direkt ekspansiyonlu, Evaporatif, veya Glikol soğutma",
            de: "❌ Bitte wählen Sie: Luftkühlung, Direktexpansion, Verdunstung oder Glykolkühlung"
        }
    },
    {
        id: 'unitPreference',
        question: {
            en: "🏭 What type of cooling unit do you prefer?\n\nOptions:\n• Monoblock (All-in-one unit)\n• Split system (Indoor/outdoor units)\n• Modular system (Multiple units)\n• Central system (Large capacity)\n\nPlease select your preferred unit type:",
            tr: "🏭 Hangi tip soğutma ünitesi tercih ediyorsunuz?\n\nSeçenekler:\n• Monoblock (Tek parça ünite)\n• Split sistem (İç/dış üniteler)\n• Modüler sistem (Çoklu üniteler)\n• Merkezi sistem (Büyük kapasite)\n\nLütfen tercih ettiğiniz ünite tipini seçin:",
            de: "🏭 Welchen Kühlgerätetyp bevorzugen Sie?\n\nOptionen:\n• Monoblock (All-in-One-Gerät)\n• Split-System (Innen-/Außengeräte)\n• Modulares System (Mehrere Geräte)\n• Zentralsystem (Große Kapazität)\n\nBitte wählen Sie Ihren bevorzugten Gerätetyp:"
        },
        validate: (value) => {
            const unitType = value.toLowerCase();
            return unitType.includes('mono') || unitType.includes('split') || 
                   unitType.includes('modul') || unitType.includes('central') || unitType.includes('merkezi');
        },
        errorMessage: {
            en: "❌ Please select: Monoblock, Split system, Modular system, or Central system",
            tr: "❌ Lütfen şunlardan birini seçin: Monoblock, Split sistem, Modüler sistem, veya Merkezi sistem",
            de: "❌ Bitte wählen Sie: Monoblock, Split-System, Modulares System oder Zentralsystem"
        }
    },
    {
        id: 'electricityType',
        question: {
            en: "⚡ What type of electricity supply is available?\n\nOptions:\n• Single phase (220V/230V)\n• Three phase (380V/400V/415V)\n• Both available\n\nElectrical supply affects equipment selection and efficiency.\n\nPlease specify your electrical supply:",
            tr: "⚡ Hangi tip elektrik beslemesi mevcut?\n\nSeçenekler:\n• Tek faz (220V/230V)\n• Üç faz (380V/400V/415V)\n• İkisi de mevcut\n\nElektrik beslemesi ekipman seçimini ve verimliliği etkiler.\n\nLütfen elektrik beslemenizi belirtin:",
            de: "⚡ Welche Art der Stromversorgung ist verfügbar?\n\nOptionen:\n• Einphasig (220V/230V)\n• Dreiphasig (380V/400V/415V)\n• Beide verfügbar\n\nStromversorgung beeinflusst Geräteauswahl und Effizienz.\n\nBitte geben Sie Ihre Stromversorgung an:"
        },
        validate: (value) => {
            const elecType = value.toLowerCase();
            return elecType.includes('single') || elecType.includes('tek') || elecType.includes('einphasig') ||
                   elecType.includes('three') || elecType.includes('üç') || elecType.includes('drei') ||
                   elecType.includes('both') || elecType.includes('ikisi') || elecType.includes('beide') ||
                   elecType.includes('220') || elecType.includes('380') || elecType.includes('400');
        },
        errorMessage: {
            en: "❌ Please specify: Single phase, Three phase, or Both available",
            tr: "❌ Lütfen belirtin: Tek faz, Üç faz, veya İkisi de mevcut",
            de: "❌ Bitte geben Sie an: Einphasig, Dreiphasig oder Beide verfügbar"
        }
    },
    {
        id: 'installationCity',
        question: {
            en: "🏙️ In which city will the installation be located?\n\nCity affects:\n• Ambient temperature calculations\n• Local regulations\n• Service availability\n• Transportation costs\n\nPlease enter the installation city:",
            tr: "🏙️ Kurulum hangi şehirde yapılacak?\n\nŞehir şunları etkiler:\n• Çevre sıcaklığı hesaplamaları\n• Yerel düzenlemeler\n• Servis mevcudiyeti\n• Nakliye maliyetleri\n\nLütfen kurulum şehrini girin:",
            de: "🏙️ In welcher Stadt erfolgt die Installation?\n\nStadt beeinflusst:\n• Umgebungstemperatur-Berechnungen\n• Lokale Vorschriften\n• Service-Verfügbarkeit\n• Transportkosten\n\nBitte geben Sie die Installationsstadt ein:"
        },
        validate: (value) => value && value.trim().length >= 2,
        errorMessage: {
            en: "❌ Please enter a valid city name",
            tr: "❌ Lütfen geçerli bir şehir adı girin",
            de: "❌ Bitte geben Sie einen gültigen Stadtnamen ein"
        }
    },
    {
        id: 'ambientHeatSource',
        question: {
            en: "🌡️ Are there any heat sources near the cold room?\n\nPotential heat sources:\n• Ovens or cooking equipment\n• Boilers or heating systems\n• Direct sunlight exposure\n• Other machinery\n• None\n\nHeat sources increase cooling load significantly.\n\nPlease describe any nearby heat sources:",
            tr: "🌡️ Soğuk odanın yakınında ısı kaynağı var mı?\n\nPotansiyel ısı kaynakları:\n• Fırınlar veya pişirme ekipmanları\n• Kazanlar veya ısıtma sistemleri\n• Doğrudan güneş ışığı\n• Diğer makineler\n• Yok\n\nIsı kaynakları soğutma yükünü önemli ölçüde artırır.\n\nLütfen yakındaki ısı kaynaklarını açıklayın:",
            de: "🌡️ Gibt es Wärmequellen in der Nähe des Kühlraums?\n\nMögliche Wärmequellen:\n• Öfen oder Kochgeräte\n• Kessel oder Heizsysteme\n• Direkte Sonneneinstrahlung\n• Andere Maschinen\n• Keine\n\nWärmequellen erhöhen die Kühllast erheblich.\n\nBitte beschreiben Sie nahegelegene Wärmequellen:"
        },
        validate: (value) => value && value.trim().length > 0,
        errorMessage: {
            en: "❌ Please describe heat sources or enter 'none'",
            tr: "❌ Lütfen ısı kaynaklarını açıklayın veya 'yok' girin",
            de: "❌ Bitte beschreiben Sie Wärmequellen oder geben Sie 'keine' ein"
        }
    },
    {
        id: 'usageArea',
        question: {
            en: "📐 What is the usable storage area or capacity?\n\nSpecify either:\n• Usable floor area (in m²)\n• Number of pallets\n• Storage capacity (in tons)\n• Percentage of total volume used\n\nThis helps optimize the cooling system design.\n\nPlease specify your storage capacity:",
            tr: "📐 Kullanılabilir depolama alanı veya kapasitesi nedir?\n\nŞunlardan birini belirtin:\n• Kullanılabilir zemin alanı (m² cinsinden)\n• Palet sayısı\n• Depolama kapasitesi (ton cinsinden)\n• Toplam hacmin kullanılan yüzdesi\n\nBu, soğutma sistemi tasarımını optimize etmeye yardımcı olur.\n\nLütfen depolama kapasitenizi belirtin:",
            de: "📐 Wie groß ist die nutzbare Lagerfläche oder -kapazität?\n\nGeben Sie entweder an:\n• Nutzbare Bodenfläche (in m²)\n• Anzahl der Paletten\n• Lagerkapazität (in Tonnen)\n• Prozentsatz des genutzten Gesamtvolumens\n\nDies hilft bei der Optimierung des Kühlsystem-Designs.\n\nBitte geben Sie Ihre Lagerkapazität an:"
        },
        validate: (value) => value && value.trim().length > 0,
        errorMessage: {
            en: "❌ Please specify storage area, pallets, tonnage, or percentage",
            tr: "❌ Lütfen depolama alanı, palet, tonaj veya yüzde belirtin",
            de: "❌ Bitte geben Sie Lagerfläche, Paletten, Tonnage oder Prozentsatz an"
        }
    },
    {
        id: 'drawingPhoto',
        question: {
            en: "📋 Do you have technical drawings or photos of the space?\n\nHelpful documentation:\n• Floor plans\n• Technical drawings\n• Photos of the space\n• Existing equipment layouts\n• Site measurements\n\nThese help with accurate system design and installation planning.\n\nPlease answer Yes or No:",
            tr: "📋 Mekanın teknik çizimi veya fotoğrafı var mı?\n\nYardımcı belgeler:\n• Kat planları\n• Teknik çizimler\n• Mekan fotoğrafları\n• Mevcut ekipman düzenleri\n• Saha ölçümleri\n\nBunlar doğru sistem tasarımı ve kurulum planlaması için yardımcı olur.\n\nLütfen Evet veya Hayır cevabını verin:",
            de: "📋 Haben Sie technische Zeichnungen oder Fotos des Raums?\n\nHilfreiche Dokumentation:\n• Grundrisse\n• Technische Zeichnungen\n• Fotos des Raums\n• Bestehende Geräteanordnungen\n• Standortmessungen\n\nDiese helfen bei der präzisen Systemplanung und Installationsplanung.\n\nBitte antworten Sie mit Ja oder Nein:"
        },
        validate: (value) => {
            const answer = value.toLowerCase().trim();
            return ['yes', 'no', 'evet', 'hayır', 'hayir', 'ja', 'nein'].includes(answer);
        },
        errorMessage: {
            en: "❌ Please answer with 'Yes' or 'No'",
            tr: "❌ Lütfen 'Evet' veya 'Hayır' ile cevap verin",
            de: "❌ Bitte antworten Sie mit 'Ja' oder 'Nein'"
        }
    }
];

// Product heat load factors (W/kg)
const PRODUCT_HEAT_LOADS = {
    'meat': 0.8,
    'poultry': 0.9,
    'fish': 1.0,
    'dairy': 0.7,
    'fruits': 0.6,
    'vegetables': 0.5,
    'frozen': 0.3,
    'beverages': 0.4,
    'pharmaceuticals': 0.6,
    'other': 0.7
};

// System type recommendations based on cooling capacity
const SYSTEM_RECOMMENDATIONS = {
    small: { maxKW: 5, type: 'Monoblock Unit', description: 'Compact, easy installation' },
    medium: { maxKW: 15, type: 'Split System', description: 'Flexible installation, quieter operation' },
    large: { maxKW: 50, type: 'Industrial System', description: 'High capacity, modular design' },
    industrial: { maxKW: Infinity, type: 'Custom Industrial System', description: 'Tailored solution for large facilities' }
};

/**
 * Detect language from user message
 * @param {string} message - User message
 * @returns {string} - Language code (en, tr, de)
 */
function detectLanguage(message) {
    const turkishWords = ['soğuk', 'oda', 'sıcaklık', 'hesapla', 'kapasite', 'evet', 'hayır', 'metre'];
    const germanWords = ['kühl', 'raum', 'temperatur', 'berechnen', 'kapazität', 'ja', 'nein', 'meter'];
    
    const lowerMessage = message.toLowerCase();
    
    let turkishScore = 0;
    let germanScore = 0;
    
    turkishWords.forEach(word => {
        if (lowerMessage.includes(word)) turkishScore++;
    });
    
    germanWords.forEach(word => {
        if (lowerMessage.includes(word)) germanScore++;
    });
    
    if (turkishScore > germanScore && turkishScore > 0) return 'tr';
    if (germanScore > turkishScore && germanScore > 0) return 'de';
    
    return 'en';
}

/**
 * Initialize cold storage calculation session
 * @param {Object} session - User session
 * @param {string} language - Language code
 */
function initializeColdStorageSession(session, language = 'en') {
    session.coldStorage = {
        active: true,
        currentStep: 0,
        language: language,
        answers: {},
        startTime: new Date().toISOString()
    };
    
    logger.info(`Cold storage session initialized for user ${session.userId} in ${language}`);
}

/**
 * Get current question for cold storage calculation
 * @param {Object} session - User session
 * @returns {string} - Current question text
 */
function getCurrentQuestion(session) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return null;
    }
    
    const currentStep = session.coldStorage.currentStep;
    const language = session.coldStorage.language;
    
    if (currentStep >= COLD_STORAGE_QUESTIONS.length) {
        return null;
    }
    
    const question = COLD_STORAGE_QUESTIONS[currentStep];
    const questionText = question.question[language] || question.question.en;
    
    // Add progress indicator and helpful commands
    const progressTexts = {
        en: `📊 Question ${currentStep + 1} of ${COLD_STORAGE_QUESTIONS.length}`,
        tr: `📊 Soru ${currentStep + 1} / ${COLD_STORAGE_QUESTIONS.length}`,
        de: `📊 Frage ${currentStep + 1} von ${COLD_STORAGE_QUESTIONS.length}`
    };
    
    const commandTexts = {
        en: "\n\n💬 Commands: 'wrong' | 'show' | 'restart' | 'stop'",
        tr: "\n\n💬 Komutlar: 'yanlış' | 'göster' | 'restart' | 'dur'",
        de: "\n\n💬 Befehle: 'falsch' | 'zeigen' | 'restart' | 'stopp'"
    };
    
    const progressText = progressTexts[language] || progressTexts.en;
    const commandText = commandTexts[language] || commandTexts.en;
    
    return `${progressText}\n\n${questionText}${commandText}`;
}

/**
 * Process user answer for cold storage calculation
 * @param {Object} session - User session
 * @param {string} answer - User's answer
 * @returns {Object} - Processing result
 */
function processAnswer(session, answer) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return { success: false, message: 'No active cold storage session' };
    }
    
    const currentStep = session.coldStorage.currentStep;
    const language = session.coldStorage.language;
    
    if (currentStep >= COLD_STORAGE_QUESTIONS.length) {
        return { success: false, message: 'All questions completed' };
    }
    
    const question = COLD_STORAGE_QUESTIONS[currentStep];
    
    // Validate answer
    if (!question.validate(answer)) {
        return {
            success: false,
            message: question.errorMessage[language] || question.errorMessage.en
        };
    }
    
    // Store answer
    session.coldStorage.answers[question.id] = answer;
    session.coldStorage.currentStep++;
    
    logger.info(`Cold storage answer recorded: ${question.id} = ${answer}`);
    
    // Check if all questions are completed
    if (session.coldStorage.currentStep >= COLD_STORAGE_QUESTIONS.length) {
        return {
            success: true,
            completed: true,
            result: calculateColdStorageCapacity(session)
        };
    }
    
    // Return next question
    return {
        success: true,
        completed: false,
        nextQuestion: getCurrentQuestion(session)
    };
}

/**
 * Calculate cold storage capacity based on collected answers
 * @param {Object} session - User session
 * @returns {Object} - Calculation results
 */
function calculateColdStorageCapacity(session) {
    const answers = session.coldStorage.answers;
    const language = session.coldStorage.language;
    
    try {
        // Parse answers
        const temperature = parseInt(answers.temperature);
        const length = parseFloat(answers.length);
        const width = parseFloat(answers.width);
        const height = parseFloat(answers.height);
        const insulation = parseInt(answers.insulation);
        const hasFloorInsulation = ['yes', 'evet', 'ja'].includes(answers.floorInsulation.toLowerCase());
        const loadingAmount = parseFloat(answers.loadingAmount);
        const productTemperature = parseFloat(answers.productTemperature);
        
        // Calculate room volume
        const volume = length * width * height;
        
        // Parse door frequency
        let doorOpenings = 0;
        const doorFreq = answers.doorFrequency.toLowerCase();
        if (doorFreq.includes('low') || doorFreq.includes('düşük') || doorFreq.includes('niedrig')) {
            doorOpenings = 3;
        } else if (doorFreq.includes('medium') || doorFreq.includes('orta') || doorFreq.includes('mittel')) {
            doorOpenings = 13;
        } else if (doorFreq.includes('high') || doorFreq.includes('yüksek') || doorFreq.includes('hoch')) {
            doorOpenings = 35;
        } else if (doorFreq.includes('very') || doorFreq.includes('çok') || doorFreq.includes('sehr')) {
            doorOpenings = 75;
        } else {
            doorOpenings = parseInt(answers.doorFrequency) || 10;
        }
        
        // Base capacity calculation (simplified version)
        let baseCapacity = 0;
        
        // Room cooling load based on volume and temperature
        const tempDiff = 35 - temperature; // Assuming 35°C ambient
        baseCapacity += volume * tempDiff * 0.5; // Base thermal load
        
        // Product load
        const productType = answers.products.toLowerCase();
        let productHeatLoad = PRODUCT_HEAT_LOADS.other;
        
        Object.keys(PRODUCT_HEAT_LOADS).forEach(key => {
            if (productType.includes(key)) {
                productHeatLoad = PRODUCT_HEAT_LOADS[key];
            }
        });
        
        // Product cooling load
        const productTempDiff = Math.max(0, productTemperature - temperature);
        const productLoad = loadingAmount * productTempDiff * productHeatLoad * 0.001; // Convert to kW
        baseCapacity += productLoad;
        
        // Infiltration load (door openings)
        const infiltrationLoad = doorOpenings * volume * 0.02; // Simplified infiltration
        baseCapacity += infiltrationLoad;
        
        // Insulation factor
        const insulationFactor = Math.max(0.8, 1 - (insulation - 8) * 0.02);
        baseCapacity *= insulationFactor;
        
        // Floor insulation penalty
        if (!hasFloorInsulation) {
            baseCapacity *= 1.15; // 15% penalty for no floor insulation
        }
        
        // Additional loads from new questions
        let additionalFactors = 1.0;
        
        // Cooling duration factor
        if (answers.coolingDuration) {
            const duration = parseFloat(answers.coolingDuration);
            if (duration <= 8) {
                additionalFactors *= 1.3; // Fast cooling requires more capacity
            } else if (duration <= 24) {
                additionalFactors *= 1.1; // Standard cooling
            }
            // Slow cooling (>24h) uses base factor
        }
        
        // Cooling type factor
        if (answers.coolingType) {
            const coolingType = answers.coolingType.toLowerCase();
            if (coolingType.includes('direct') || coolingType.includes('direkt')) {
                additionalFactors *= 0.95; // Direct expansion is more efficient
            } else if (coolingType.includes('evap') || coolingType.includes('verdun')) {
                additionalFactors *= 1.1; // Evaporative cooling less efficient in humid conditions
            } else if (coolingType.includes('glycol') || coolingType.includes('glikol')) {
                additionalFactors *= 1.15; // Indirect systems have heat exchanger losses
            }
        }
        
        // Heat source penalty
        if (answers.ambientHeatSource) {
            const heatSource = answers.ambientHeatSource.toLowerCase();
            if (!heatSource.includes('none') && !heatSource.includes('yok') && !heatSource.includes('keine')) {
                if (heatSource.includes('oven') || heatSource.includes('fırın') || heatSource.includes('sun') || heatSource.includes('güneş')) {
                    additionalFactors *= 1.2; // Significant heat sources
                } else {
                    additionalFactors *= 1.1; // Other heat sources
                }
            }
        }
        
        // Apply additional factors
        baseCapacity *= additionalFactors;
        
        // Safety factor
        const safetyFactor = 1.2;
        const finalCapacity = Math.round(baseCapacity * safetyFactor);
        
        // System recommendation based on unit preference and capacity
        let systemType = 'Custom System';
        let systemDescription = 'Contact us for detailed specifications';
        
        if (answers.unitPreference) {
            const unitPref = answers.unitPreference.toLowerCase();
            if (unitPref.includes('mono') && finalCapacity <= 5000) {
                systemType = 'Monoblock Unit';
                systemDescription = 'Compact all-in-one solution, easy installation';
            } else if (unitPref.includes('split') && finalCapacity <= 15000) {
                systemType = 'Split System';
                systemDescription = 'Indoor/outdoor configuration, flexible installation';
            } else if (unitPref.includes('modul') && finalCapacity <= 50000) {
                systemType = 'Modular System';
                systemDescription = 'Multiple units for redundancy and efficiency';
            } else if (unitPref.includes('central') || unitPref.includes('merkezi')) {
                systemType = 'Central Cooling System';
                systemDescription = 'Large capacity centralized solution';
            }
        } else {
            // Default recommendations based on capacity
            Object.keys(SYSTEM_RECOMMENDATIONS).forEach(key => {
                const rec = SYSTEM_RECOMMENDATIONS[key];
                if (finalCapacity <= rec.maxKW * 1000) { // Convert kW to W
                    systemType = rec.type;
                    systemDescription = rec.description;
                    return;
                }
            });
        }
        
        // End cold storage session
        session.coldStorage.active = false;
        session.coldStorage.completedAt = new Date().toISOString();
        
        return {
            success: true,
            capacity: finalCapacity,
            volume: Math.round(volume * 100) / 100,
            systemType: systemType,
            systemDescription: systemDescription,
            calculations: {
                baseCapacity: Math.round(baseCapacity),
                productLoad: Math.round(productLoad),
                infiltrationLoad: Math.round(infiltrationLoad),
                safetyFactor: safetyFactor,
                finalCapacity: finalCapacity
            },
            parameters: {
                temperature: temperature,
                dimensions: `${length}m × ${width}m × ${height}m`,
                volume: volume,
                insulation: insulation,
                floorInsulation: hasFloorInsulation,
                doorOpenings: doorOpenings,
                loadingAmount: loadingAmount,
                productTemperature: productTemperature,
                products: answers.products,
                coolingDuration: answers.coolingDuration || 'Not specified',
                coolingType: answers.coolingType || 'Not specified',
                unitPreference: answers.unitPreference || 'Not specified',
                electricityType: answers.electricityType || 'Not specified',
                installationCity: answers.installationCity || 'Not specified',
                ambientHeatSource: answers.ambientHeatSource || 'Not specified',
                usageArea: answers.usageArea || 'Not specified',
                drawingPhoto: answers.drawingPhoto || 'Not specified',
                additionalFactors: additionalFactors
            }
        };
        
    } catch (error) {
        logger.error('Error calculating cold storage capacity:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Format calculation results for display
 * @param {Object} result - Calculation results
 * @param {string} language - Language code
 * @returns {string} - Formatted results
 */
function formatResults(result, language = 'en') {
    const messages = {
        en: {
            title: "❄️ Cold Storage Capacity Calculation Results",
            roomSpecs: "🏠 Room Specifications",
            dimensions: "Dimensions",
            volume: "Volume",
            temperature: "Target Temperature",
            insulation: "Insulation Thickness",
            floorInsulation: "Floor Insulation",
            capacity: "💡 Cooling Requirements",
            totalCapacity: "Total Cooling Capacity",
            capacityPerM3: "Capacity per m³",
            systemRec: "🔧 System Recommendation",
            systemType: "Recommended System",
            description: "Description",
            details: "📊 Calculation Details",
            baseCapacity: "Base Cooling Load",
            productLoad: "Product Cooling Load",
            infiltrationLoad: "Infiltration Load",
            safetyFactor: "Safety Factor",
            finalCapacity: "Final Capacity",
            parameters: "⚙️ Input Parameters",
            products: "Products",
            doorOpenings: "Daily Door Openings",
            loadingAmount: "Daily Loading Amount",
            productTemp: "Product Entry Temperature",
            yes: "Yes",
            no: "No"
        },
        tr: {
            title: "❄️ Soğuk Depo Kapasite Hesaplama Sonuçları",
            roomSpecs: "🏠 Oda Özellikleri",
            dimensions: "Boyutlar",
            volume: "Hacim",
            temperature: "Hedef Sıcaklık",
            insulation: "Yalıtım Kalınlığı",
            floorInsulation: "Zemin Yalıtımı",
            capacity: "💡 Soğutma Gereksinimleri",
            totalCapacity: "Toplam Soğutma Kapasitesi",
            capacityPerM3: "m³ başına kapasite",
            systemRec: "🔧 Sistem Önerisi",
            systemType: "Önerilen Sistem",
            description: "Açıklama",
            details: "📊 Hesaplama Detayları",
            baseCapacity: "Temel Soğutma Yükü",
            productLoad: "Ürün Soğutma Yükü",
            infiltrationLoad: "Sızıntı Yükü",
            safetyFactor: "Güvenlik Faktörü",
            finalCapacity: "Final Kapasite",
            parameters: "⚙️ Girdi Parametreleri",
            products: "Ürünler",
            doorOpenings: "Günlük Kapı Açılışı",
            loadingAmount: "Günlük Yükleme Miktarı",
            productTemp: "Ürün Giriş Sıcaklığı",
            yes: "Evet",
            no: "Hayır"
        },
        de: {
            title: "❄️ Kältelagerkapazität Berechnungsergebnisse",
            roomSpecs: "🏠 Raumspezifikationen",
            dimensions: "Abmessungen",
            volume: "Volumen",
            temperature: "Zieltemperatur",
            insulation: "Isolierdicke",
            floorInsulation: "Bodenisolierung",
            capacity: "💡 Kühlanforderungen",
            totalCapacity: "Gesamtkühlkapazität",
            capacityPerM3: "Kapazität pro m³",
            systemRec: "🔧 Systemempfehlung",
            systemType: "Empfohlenes System",
            description: "Beschreibung",
            details: "📊 Berechnungsdetails",
            baseCapacity: "Grundkühllast",
            productLoad: "Produktkühllast",
            infiltrationLoad: "Infiltrationslast",
            safetyFactor: "Sicherheitsfaktor",
            finalCapacity: "Endkapazität",
            parameters: "⚙️ Eingabeparameter",
            products: "Produkte",
            doorOpenings: "Tägliche Türöffnungen",
            loadingAmount: "Tägliche Lademenge",
            productTemp: "Produkteingangstemperatur",
            yes: "Ja",
            no: "Nein"
        }
    };
    
    const msg = messages[language] || messages.en;
    
    let response = `${msg.title}\n\n`;
    
    // Room specifications
    response += `${msg.roomSpecs}:\n`;
    response += `• ${msg.dimensions}: ${result.parameters.dimensions}\n`;
    response += `• ${msg.volume}: ${result.volume} m³\n`;
    response += `• ${msg.temperature}: ${result.parameters.temperature}°C\n`;
    response += `• ${msg.insulation}: ${result.parameters.insulation} cm\n`;
    response += `• ${msg.floorInsulation}: ${result.parameters.floorInsulation ? msg.yes : msg.no}\n\n`;
    
    // Cooling requirements
    response += `${msg.capacity}:\n`;
    response += `• ${msg.totalCapacity}: *${result.capacity.toLocaleString()} W*\n`;
    response += `• ${msg.capacityPerM3}: *${Math.round(result.capacity / result.volume)} W/m³*\n\n`;
    
    // System recommendation
    response += `${msg.systemRec}:\n`;
    response += `• ${msg.systemType}: *${result.systemType}*\n`;
    response += `• ${msg.description}: ${result.systemDescription}\n\n`;
    
    // Calculation details
    response += `${msg.details}:\n`;
    response += `• ${msg.baseCapacity}: ${result.calculations.baseCapacity.toLocaleString()} W\n`;
    response += `• ${msg.productLoad}: ${result.calculations.productLoad.toLocaleString()} W\n`;
    response += `• ${msg.infiltrationLoad}: ${result.calculations.infiltrationLoad.toLocaleString()} W\n`;
    response += `• ${msg.safetyFactor}: ${result.calculations.safetyFactor}×\n`;
    response += `• ${msg.finalCapacity}: *${result.calculations.finalCapacity.toLocaleString()} W*\n\n`;
    
    // Input parameters
    response += `${msg.parameters}:\n`;
    response += `• ${msg.products}: ${result.parameters.products}\n`;
    response += `• ${msg.doorOpenings}: ${result.parameters.doorOpenings}\n`;
    response += `• ${msg.loadingAmount}: ${result.parameters.loadingAmount} kg\n`;
    response += `• ${msg.productTemp}: ${result.parameters.productTemperature}°C`;
    
    return response;
}

/**
 * Check if message is a cold storage calculation request
 * @param {string} message - User message
 * @returns {boolean} - True if it's a cold storage request
 */
function isColdStorageRequest(message) {
    const coldStorageKeywords = [
        'cold storage', 'cold room', 'refrigeration', 'cooling capacity',
        'soğuk depo', 'soğuk oda', 'soğutma kapasitesi', 'dondurucu',
        'kühlhaus', 'kühlraum', 'kühlkapazität', 'kältetechnik',
        'calculate capacity', 'kapasite hesapla', 'kapazität berechnen',
        'cold storage calculation', 'soğuk depo hesaplama', 'kühlraum berechnung'
    ];
    
    const lowerMessage = message.toLowerCase();
    return coldStorageKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Handle cold storage calculation request
 * @param {Object} session - User session
 * @param {string} message - User message
 * @returns {string} - Response message
 */
function handleColdStorageRequest(session, message) {
    try {
        const language = detectLanguage(message);
        
        // Check if there's an active cold storage session
        if (session.coldStorage && session.coldStorage.active) {
            // Check for special commands first
            if (isCancelRequest(message)) {
                return cancelColdStorageSession(session);
            }
            
            if (isBackRequest(message)) {
                const backResult = goBackToPreviousQuestion(session);
                return backResult || "❌ Unable to go back.";
            }
            
            if (isRestartRequest(message)) {
                // Cancel current session and start new one
                cancelColdStorageSession(session);
                initializeColdStorageSession(session, language);
                const restartMessages = {
                    en: `🔄 Restarting cold storage calculation...\n\n${getCurrentQuestion(session)}`,
                    tr: `🔄 Soğuk depo hesaplaması yeniden başlatılıyor...\n\n${getCurrentQuestion(session)}`,
                    de: `🔄 Kältelagerberechnung wird neu gestartet...\n\n${getCurrentQuestion(session)}`
                };
                return restartMessages[language] || restartMessages.en;
            }
            
            if (isReviewRequest(message)) {
                const reviewResult = showCurrentAnswers(session);
                return reviewResult || "❌ Unable to show answers.";
            }
            
            const editRequest = isEditRequest(message);
            if (editRequest) {
                if (editRequest.questionNumber === null) {
                    const helpMessages = {
                        en: "❌ Please specify which question to edit:\n• 'edit question 3' - Edit question by number\n• 'edit temperature' - Edit by topic\n• 'review' - See all your answers",
                        tr: "❌ Lütfen hangi soruyu düzenlemek istediğinizi belirtin:\n• 'edit question 3' - Soru numarasıyla düzenle\n• 'edit temperature' - Konuya göre düzenle\n• 'review' - Tüm cevaplarınızı görün",
                        de: "❌ Bitte geben Sie an, welche Frage bearbeitet werden soll:\n• 'edit question 3' - Nach Nummer bearbeiten\n• 'edit temperature' - Nach Thema bearbeiten\n• 'review' - Alle Ihre Antworten anzeigen"
                    };
                    return helpMessages[language] || helpMessages.en;
                } else {
                    const editResult = editSpecificQuestion(session, editRequest.questionNumber);
                    return editResult || "❌ Unable to edit question.";
                }
            }
            
            // Process the answer normally
            const result = processAnswer(session, message);
            
            if (!result.success) {
                // Add helpful commands reminder when there's an error
                const language = session.coldStorage.language;
                const helpTexts = {
                    en: "\n\n💡 Need help? Type 'wrong' to go back, 'show' to see answers, or 'restart' to start over.",
                    tr: "\n\n💡 Yardım mı lazım? 'yanlış' yazarak geri gidin, 'göster' ile cevapları görün, ya da 'restart' ile yeniden başlayın.",
                    de: "\n\n💡 Hilfe benötigt? Geben Sie 'falsch' ein um zurückzugehen, 'zeigen' für Antworten, oder 'restart' für Neustart."
                };
                const helpText = helpTexts[language] || helpTexts.en;
                return result.message + helpText;
            }
            
            if (result.completed) {
                // Calculation completed
                if (result.result.success) {
                    return formatResults(result.result, language);
                } else {
                    const errorMessages = {
                        en: `❌ Calculation error: ${result.result.error}`,
                        tr: `❌ Hesaplama hatası: ${result.result.error}`,
                        de: `❌ Berechnungsfehler: ${result.result.error}`
                    };
                    return errorMessages[language] || errorMessages.en;
                }
            } else {
                // Return next question
                return result.nextQuestion;
            }
        } else {
            // Start new cold storage calculation
            initializeColdStorageSession(session, language);
            const welcomeMessages = {
                en: `🏗️ Welcome to Cold Storage Capacity Calculator!\n\nI'll guide you through 18 comprehensive questions to calculate the optimal cooling capacity for your cold storage room.\n\n📋 **HELPFUL COMMANDS YOU CAN USE:**\n✅ Type **'wrong'** or **'back'** if you made a mistake\n✅ Type **'restart'** to start over completely\n✅ Type **'show'** or **'review'** to see all your answers\n✅ Type **'stop'** or **'cancel'** to exit\n\n💡 You can use these commands at any time during the questions!\n\n${getCurrentQuestion(session)}`,
                tr: `🏗️ Soğuk Depo Kapasite Hesaplayıcıya Hoş Geldiniz!\n\nSoğuk depo odanız için optimal soğutma kapasitesini hesaplamak için 18 kapsamlı soruda size rehberlik edeceğim.\n\n📋 **KULLANABİLECEĞİNİZ YARDIMCI KOMUTLAR:**\n✅ Hata yaptıysanız **'yanlış'** veya **'geri'** yazın\n✅ Tamamen yeniden başlamak için **'restart'** yazın\n✅ Tüm cevaplarınızı görmek için **'göster'** yazın\n✅ Çıkmak için **'dur'** veya **'iptal'** yazın\n\n💡 Bu komutları sorular sırasında istediğiniz zaman kullanabilirsiniz!\n\n${getCurrentQuestion(session)}`,
                de: `🏗️ Willkommen zum Kältelager-Kapazitätsrechner!\n\nIch führe Sie durch 18 umfassende Fragen, um die optimale Kühlkapazität für Ihren Kühlraum zu berechnen.\n\n📋 **HILFREICHE BEFEHLE DIE SIE VERWENDEN KÖNNEN:**\n✅ Geben Sie **'falsch'** oder **'zurück'** ein, wenn Sie einen Fehler gemacht haben\n✅ Geben Sie **'restart'** ein, um komplett neu zu beginnen\n✅ Geben Sie **'zeigen'** ein, um alle Ihre Antworten zu sehen\n✅ Geben Sie **'stopp'** oder **'abbrechen'** ein, um zu beenden\n\n💡 Sie können diese Befehle jederzeit während der Fragen verwenden!\n\n${getCurrentQuestion(session)}`
            };
            
            return welcomeMessages[language] || welcomeMessages.en;
        }
        
    } catch (error) {
        logger.error('Error handling cold storage request:', error);
        
        const errorMessages = {
            en: "❌ An error occurred while processing your request. Please try again.",
            tr: "❌ İsteğiniz işlenirken bir hata oluştu. Lütfen tekrar deneyin.",
            de: "❌ Beim Verarbeiten Ihrer Anfrage ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut."
        };
        
        const language = detectLanguage(message);
        return errorMessages[language] || errorMessages.en;
    }
}

/**
 * Cancel active cold storage session
 * @param {Object} session - User session
 * @returns {string} - Cancellation message
 */
function cancelColdStorageSession(session) {
    if (session.coldStorage && session.coldStorage.active) {
        session.coldStorage.active = false;
        session.coldStorage.cancelledAt = new Date().toISOString();
        
        const language = session.coldStorage.language || 'en';
        const messages = {
            en: "❌ Cold storage calculation cancelled. Type 'cold storage' to start again.",
            tr: "❌ Soğuk depo hesaplaması iptal edildi. Tekrar başlamak için 'soğuk depo' yazın.",
            de: "❌ Kältelagerberechnung abgebrochen. Geben Sie 'Kühlraum' ein, um erneut zu beginnen."
        };
        
        return messages[language] || messages.en;
    }
    
    return null;
}

/**
 * Check if user wants to cancel current session
 * @param {string} message - User message
 * @returns {boolean} - True if user wants to cancel
 */
function isCancelRequest(message) {
    const cancelKeywords = [
        'cancel', 'stop', 'quit', 'exit', 'iptal', 'dur', 'çık', 'abbrechen', 'stopp', 'beenden'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return cancelKeywords.includes(lowerMessage);
}

/**
 * Check if user wants to go back to previous question
 * @param {string} message - User message
 * @returns {boolean} - True if user wants to go back
 */
function isBackRequest(message) {
    const backKeywords = [
        'back', 'previous', 'go back', 'geri', 'önceki', 'zurück', 'vorherige', 'früher',
        'wrong', 'mistake', 'error', 'yanlış', 'hata', 'falsch', 'fehler'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return backKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check if user wants to restart calculation
 * @param {string} message - User message
 * @returns {boolean} - True if user wants to restart
 */
function isRestartRequest(message) {
    const restartKeywords = [
        'restart', 'start over', 'begin again', 'yeniden başla', 'tekrar başla', 'neu starten', 'von vorne'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return restartKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check if user wants to review current answers
 * @param {string} message - User message
 * @returns {boolean} - True if user wants to review
 */
function isReviewRequest(message) {
    const reviewKeywords = [
        'review', 'show answers', 'my answers', 'show', 'cevaplarım', 'göster', 'überprüfen', 'anzeigen', 'zeigen'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    return reviewKeywords.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Check if user wants to edit a specific question
 * @param {string} message - User message
 * @returns {Object|null} - Edit request details or null
 */
function isEditRequest(message) {
    const editKeywords = [
        'edit', 'change', 'modify', 'düzenle', 'değiştir', 'bearbeiten', 'ändern'
    ];
    
    const lowerMessage = message.toLowerCase().trim();
    
    // Check for edit keywords
    const hasEditKeyword = editKeywords.some(keyword => lowerMessage.includes(keyword));
    if (!hasEditKeyword) return null;
    
    // Check for question number (e.g., "edit question 3", "change answer 5")
    const questionMatch = lowerMessage.match(/(?:question|answer|soru|cevap|frage|antwort)\s*(\d+)/);
    if (questionMatch) {
        const questionNumber = parseInt(questionMatch[1]);
        if (questionNumber >= 1 && questionNumber <= COLD_STORAGE_QUESTIONS.length) {
            return { questionNumber: questionNumber - 1 }; // Convert to 0-based index
        }
    }
    
    // Check for question keywords (e.g., "edit temperature", "change length")
    const questionKeywords = {
        'temperature': 0, 'sıcaklık': 0, 'temperatur': 0,
        'product': 1, 'products': 1, 'ürün': 1, 'produkt': 1,
        'length': 2, 'uzunluk': 2, 'länge': 2,
        'width': 3, 'genişlik': 3, 'breite': 3,
        'height': 4, 'yükseklik': 4, 'höhe': 4,
        'insulation': 5, 'yalıtım': 5, 'isolierung': 5,
        'floor': 6, 'zemin': 6, 'boden': 6,
        'door': 7, 'kapı': 7, 'tür': 7,
        'loading': 8, 'yükleme': 8, 'beladen': 8,
        'entry': 9, 'giriş': 9, 'eingang': 9,
        'cooling': 10, 'soğutma': 10, 'kühlung': 10,
        'unit': 12, 'ünite': 12, 'gerät': 12,
        'electricity': 13, 'elektrik': 13, 'strom': 13,
        'city': 14, 'şehir': 14, 'stadt': 14,
        'heat': 15, 'ısı': 15, 'wärme': 15,
        'area': 16, 'alan': 16, 'fläche': 16,
        'drawing': 17, 'çizim': 17, 'zeichnung': 17
    };
    
    for (const [keyword, index] of Object.entries(questionKeywords)) {
        if (lowerMessage.includes(keyword)) {
            return { questionNumber: index };
        }
    }
    
    return { questionNumber: null }; // Edit request but no specific question identified
}

/**
 * Go back to previous question
 * @param {Object} session - User session
 * @returns {string} - Previous question or error message
 */
function goBackToPreviousQuestion(session) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return null;
    }
    
    const language = session.coldStorage.language;
    
    if (session.coldStorage.currentStep <= 0) {
        const messages = {
            en: "❌ You're already at the first question. Type 'restart' to start over.",
            tr: "❌ Zaten ilk sorudasınız. Yeniden başlamak için 'restart' yazın.",
            de: "❌ Sie sind bereits bei der ersten Frage. Geben Sie 'restart' ein, um von vorne zu beginnen."
        };
        return messages[language] || messages.en;
    }
    
    // Go back one step and remove the previous answer
    session.coldStorage.currentStep--;
    const previousQuestionKey = COLD_STORAGE_QUESTIONS[session.coldStorage.currentStep].id;
    delete session.coldStorage.answers[previousQuestionKey];
    
    const backMessages = {
        en: "⬅️ Going back to previous question:",
        tr: "⬅️ Önceki soruya dönülüyor:",
        de: "⬅️ Zurück zur vorherigen Frage:"
    };
    
    const backMessage = backMessages[language] || backMessages.en;
    const question = getCurrentQuestion(session);
    
    return `${backMessage}\n\n${question}`;
}

/**
 * Edit a specific question answer
 * @param {Object} session - User session
 * @param {number} questionIndex - Question index to edit
 * @returns {string} - Question to re-answer
 */
function editSpecificQuestion(session, questionIndex) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return null;
    }
    
    const language = session.coldStorage.language;
    
    if (questionIndex < 0 || questionIndex >= COLD_STORAGE_QUESTIONS.length) {
        const messages = {
            en: `❌ Invalid question number. Please choose between 1 and ${COLD_STORAGE_QUESTIONS.length}.`,
            tr: `❌ Geçersiz soru numarası. Lütfen 1 ile ${COLD_STORAGE_QUESTIONS.length} arasında seçin.`,
            de: `❌ Ungültige Fragennummer. Bitte wählen Sie zwischen 1 und ${COLD_STORAGE_QUESTIONS.length}.`
        };
        return messages[language] || messages.en;
    }
    
    if (questionIndex >= session.coldStorage.currentStep) {
        const messages = {
            en: "❌ You haven't answered that question yet. Continue with the current question.",
            tr: "❌ Bu soruyu henüz cevaplamadınız. Mevcut soruyla devam edin.",
            de: "❌ Sie haben diese Frage noch nicht beantwortet. Setzen Sie mit der aktuellen Frage fort."
        };
        return messages[language] || messages.en;
    }
    
    // Remove the answer for this question and all subsequent questions
    for (let i = questionIndex; i < session.coldStorage.currentStep; i++) {
        const questionKey = COLD_STORAGE_QUESTIONS[i].id;
        delete session.coldStorage.answers[questionKey];
    }
    
    // Set current step to the question being edited
    session.coldStorage.currentStep = questionIndex;
    
    const editMessages = {
        en: `✏️ Editing question ${questionIndex + 1}:`,
        tr: `✏️ ${questionIndex + 1}. soru düzenleniyor:`,
        de: `✏️ Bearbeitung von Frage ${questionIndex + 1}:`
    };
    
    const editMessage = editMessages[language] || editMessages.en;
    const question = getCurrentQuestion(session);
    
    return `${editMessage}\n\n${question}`;
}

/**
 * Show current answers for review
 * @param {Object} session - User session
 * @returns {string} - Formatted list of current answers
 */
function showCurrentAnswers(session) {
    if (!session.coldStorage || !session.coldStorage.active) {
        return null;
    }
    
    const language = session.coldStorage.language;
    const answers = session.coldStorage.answers;
    
    const headers = {
        en: {
            title: "📋 Your Current Answers:",
            noAnswers: "❌ No answers recorded yet.",
            commands: "\n💡 Commands:\n• Type 'back' to go to previous question\n• Type 'edit question X' to edit a specific question\n• Type 'restart' to start over\n• Continue answering to proceed"
        },
        tr: {
            title: "📋 Mevcut Cevaplarınız:",
            noAnswers: "❌ Henüz hiç cevap kaydedilmedi.",
            commands: "\n💡 Komutlar:\n• Önceki soruya dönmek için 'back' yazın\n• Belirli bir soruyu düzenlemek için 'edit question X' yazın\n• Yeniden başlamak için 'restart' yazın\n• Devam etmek için cevaplamaya devam edin"
        },
        de: {
            title: "📋 Ihre aktuellen Antworten:",
            noAnswers: "❌ Noch keine Antworten aufgezeichnet.",
            commands: "\n💡 Befehle:\n• Geben Sie 'back' ein, um zur vorherigen Frage zu gehen\n• Geben Sie 'edit question X' ein, um eine bestimmte Frage zu bearbeiten\n• Geben Sie 'restart' ein, um von vorne zu beginnen\n• Setzen Sie das Beantworten fort, um fortzufahren"
        }
    };
    
    const h = headers[language] || headers.en;
    
    if (Object.keys(answers).length === 0) {
        return h.noAnswers + h.commands;
    }
    
    let response = h.title + "\n\n";
    
    for (let i = 0; i < session.coldStorage.currentStep; i++) {
        const question = COLD_STORAGE_QUESTIONS[i];
        const answer = answers[question.id];
        if (answer !== undefined) {
            response += `${i + 1}. ${question.id}: ${answer}\n`;
        }
    }
    
    response += h.commands;
    return response;
}

module.exports = {
    isColdStorageRequest,
    handleColdStorageRequest,
    cancelColdStorageSession,
    isCancelRequest,
    isBackRequest,
    isRestartRequest,
    isReviewRequest,
    isEditRequest,
    goBackToPreviousQuestion,
    editSpecificQuestion,
    showCurrentAnswers,
    detectLanguage,
    getCurrentQuestion,
    processAnswer,
    formatResults
};