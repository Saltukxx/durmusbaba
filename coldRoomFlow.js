const coldRoomCalculator = require('./coldRoomCalculator');
const sessionManager = require('./sessionManager');
const logger = require('./logger');

/**
 * Cold Room Flow - Guided conversation system for cold room calculations
 * Provides step-by-step questions with edit/delete capabilities
 */

// Question definitions with validation and help
const QUESTIONS = [
    {
        id: 'dimensions',
        order: 1,
        required: true,
        question: {
            en: "📏 **Room Dimensions**\n\nWhat are the internal dimensions of your cold room?\n\nPlease provide:\n• Length × Width × Height (in meters)\n• OR total volume in m³\n\n**Examples:**\n• \"10m × 6m × 3m\"\n• \"180 m³\"\n• \"Length 10m, width 6m, height 3m\"",
            tr: "📏 **Oda Boyutları**\n\nSoğuk odanızın iç boyutları nelerdir?\n\nLütfen belirtin:\n• Uzunluk × Genişlik × Yükseklik (metre cinsinden)\n• VEYA toplam hacim m³ cinsinden\n\n**Örnekler:**\n• \"10m × 6m × 3m\"\n• \"180 m³\"\n• \"Uzunluk 10m, genişlik 6m, yükseklik 3m\"",
            de: "📏 **Raumabmessungen**\n\nWelche Innenmaße hat Ihr Kühlraum?\n\nBitte angeben:\n• Länge × Breite × Höhe (in Metern)\n• ODER Gesamtvolumen in m³\n\n**Beispiele:**\n• \"10m × 6m × 3m\"\n• \"180 m³\"\n• \"Länge 10m, Breite 6m, Höhe 3m\""
        },
        validate: (answer) => {
            const result = extractDimensions(answer);
            if (!result.volume && !(result.length && result.width && result.height)) {
                return { valid: false, error: "Please provide valid dimensions or volume" };
            }
            return { valid: true, data: result };
        }
    },
    {
        id: 'temperature',
        order: 2,
        required: true,
        question: {
            en: "🌡️ **Storage Temperature**\n\nWhat temperature will you store products at?\n\n**Supported temperatures:**\n• **+12°C** - Wine storage, pharmaceuticals\n• **+5°C** - Fresh produce, dairy\n• **0°C** - Fresh meat, fish\n• **-5°C** - Short-term frozen storage\n• **-15°C** - Frozen food storage\n• **-18°C** - Standard freezer temperature\n• **-20°C** - Deep freeze storage\n• **-25°C** - Ultra-low temperature\n\n**Examples:** \"-18°C\", \"-20\", \"minus 18 degrees\"",
            tr: "🌡️ **Depolama Sıcaklığı**\n\nÜrünleri hangi sıcaklıkta depolayacaksınız?\n\n**Desteklenen sıcaklıklar:**\n• **+12°C** - Şarap depolama, ilaçlar\n• **+5°C** - Taze ürünler, süt ürünleri\n• **0°C** - Taze et, balık\n• **-5°C** - Kısa süreli donmuş depolama\n• **-15°C** - Donmuş gıda depolama\n• **-18°C** - Standart dondurucu sıcaklığı\n• **-20°C** - Derin dondurucu\n• **-25°C** - Ultra düşük sıcaklık\n\n**Örnekler:** \"-18°C\", \"-20\", \"eksi 18 derece\"",
            de: "🌡️ **Lagertemperatur**\n\nBei welcher Temperatur lagern Sie Produkte?\n\n**Unterstützte Temperaturen:**\n• **+12°C** - Weinlagerung, Pharmazeutika\n• **+5°C** - Frischprodukte, Milchprodukte\n• **0°C** - Frisches Fleisch, Fisch\n• **-5°C** - Kurzzeit-Tiefkühllagerung\n• **-15°C** - Tiefkühlprodukte\n• **-18°C** - Standard Gefriertemperatur\n• **-20°C** - Tiefkühlung\n• **-25°C** - Ultra-Tieftemperatur\n\n**Beispiele:** \"-18°C\", \"-20\", \"minus 18 Grad\""
        },
        validate: (answer) => {
            const temp = extractTemperature(answer);
            if (!temp || !coldRoomCalculator.TEMPERATURE_COEFFICIENTS[temp]) {
                const supported = Object.keys(coldRoomCalculator.TEMPERATURE_COEFFICIENTS).join(', ');
                return { 
                    valid: false, 
                    error: `Please provide a supported temperature: ${supported}°C` 
                };
            }
            return { valid: true, data: { temperature: temp } };
        }
    },
    {
        id: 'ambient_temperature',
        order: 3,
        required: true,
        question: {
            en: "🌤️ **Installation Location Climate**\n\nWhat is the ambient (outside) temperature where the cold room will be installed?\n\n**Typical values by region:**\n• **Northern Europe** - 25-30°C\n• **Central Europe** - 30-35°C\n• **Southern Europe** - 35-40°C\n• **Middle East/Africa** - 40-45°C\n• **Tropical regions** - 35-45°C\n\n**Examples:**\n• \"35°C\" (standard design condition)\n• \"40°C\" (hot climate)\n• \"30°C\" (moderate climate)\n\n*This determines the temperature difference your system must handle.*",
            tr: "🌤️ **Kurulum Yeri İklimi**\n\nSoğuk odanın kurulacağı yerdeki çevre (dış) sıcaklığı nedir?\n\n**Bölgelere göre tipik değerler:**\n• **Kuzey Avrupa** - 25-30°C\n• **Orta Avrupa** - 30-35°C\n• **Güney Avrupa** - 35-40°C\n• **Orta Doğu/Afrika** - 40-45°C\n• **Tropik bölgeler** - 35-45°C\n\n**Örnekler:**\n• \"35°C\" (standart tasarım koşulu)\n• \"40°C\" (sıcak iklim)\n• \"30°C\" (ılıman iklim)\n\n*Bu, sisteminizin karşılaması gereken sıcaklık farkını belirler.*",
            de: "🌤️ **Installationsort-Klima**\n\nWie hoch ist die Umgebungstemperatur (außen) am Installationsort des Kühlraums?\n\n**Typische Werte nach Regionen:**\n• **Nordeuropa** - 25-30°C\n• **Mitteleuropa** - 30-35°C\n• **Südeuropa** - 35-40°C\n• **Naher Osten/Afrika** - 40-45°C\n• **Tropische Regionen** - 35-45°C\n\n**Beispiele:**\n• \"35°C\" (Standard-Auslegungsbedingung)\n• \"40°C\" (heißes Klima)\n• \"30°C\" (gemäßigtes Klima)\n\n*Dies bestimmt den Temperaturunterschied, den Ihr System bewältigen muss.*"
        },
        validate: (answer) => {
            const temp = extractTemperature(answer);
            if (temp === null || temp < 20 || temp > 55) {
                return { 
                    valid: false, 
                    error: "Please provide an ambient temperature between 20°C and 55°C" 
                };
            }
            return { valid: true, data: { ambient_temperature: temp } };
        }
    },
    {
        id: 'products',
        order: 4,
        required: true,
        question: {
            en: "📦 **Product Type**\n\nWhat products will you store in this cold room?\n\n**Product categories:**\n• **Meat** - Beef, pork, poultry\n• **Fish** - Fresh fish, seafood\n• **Dairy** - Milk, cheese, yogurt\n• **Fruits** - Apples, oranges, berries\n• **Vegetables** - Leafy greens, root vegetables\n• **Frozen** - Pre-frozen products\n• **Beverages** - Beer, soft drinks\n• **General** - Mixed products\n\n**Examples:** \"meat\", \"fresh fish\", \"dairy products\", \"mixed vegetables\"",
            tr: "📦 **Ürün Tipi**\n\nBu soğuk odada hangi ürünleri depolayacaksınız?\n\n**Ürün kategorileri:**\n• **Et** - Sığır, domuz, tavuk eti\n• **Balık** - Taze balık, deniz ürünleri\n• **Süt Ürünleri** - Süt, peynir, yoğurt\n• **Meyveler** - Elma, portakal, berry\n• **Sebzeler** - Yapraklı sebzeler, kök sebzeler\n• **Donmuş** - Önceden donmuş ürünler\n• **İçecekler** - Bira, meşrubat\n• **Genel** - Karışık ürünler\n\n**Örnekler:** \"et\", \"taze balık\", \"süt ürünleri\", \"karışık sebzeler\"",
            de: "📦 **Produkttyp**\n\nWelche Produkte lagern Sie in diesem Kühlraum?\n\n**Produktkategorien:**\n• **Fleisch** - Rind, Schwein, Geflügel\n• **Fisch** - Frischer Fisch, Meeresfrüchte\n• **Milchprodukte** - Milch, Käse, Joghurt\n• **Obst** - Äpfel, Orangen, Beeren\n• **Gemüse** - Blattgemüse, Wurzelgemüse\n• **Tiefkühl** - Vorgefrorene Produkte\n• **Getränke** - Bier, Erfrischungsgetränke\n• **Allgemein** - Gemischte Produkte\n\n**Beispiele:** \"fleisch\", \"frischer fisch\", \"milchprodukte\", \"gemischtes gemüse\""
        },
        validate: (answer) => {
            const productType = extractProductType(answer);
            return { valid: true, data: { product_type: productType } };
        }
    },
    {
        id: 'daily_load',
        order: 5,
        required: true,
        question: {
            en: "⚖️ **Daily Product Load**\n\nHow much product (in kg) will be loaded into the cold room daily?\n\nThis includes:\n• New products entering the room\n• Products being moved or restocked\n• Total daily throughput\n\n**Examples:**\n• \"500 kg per day\"\n• \"1000kg daily\"\n• \"2 tons\"\n• \"No daily loading\" (for static storage)\n\n*This affects the cooling capacity calculation.*",
            tr: "⚖️ **Günlük Ürün Yükü**\n\nSoğuk odaya günlük ne kadar ürün (kg cinsinden) yüklenecek?\n\nBu şunları içerir:\n• Odaya giren yeni ürünler\n• Taşınan veya yeniden stoklanan ürünler\n• Toplam günlük işlem miktarı\n\n**Örnekler:**\n• \"Günde 500 kg\"\n• \"Günlük 1000kg\"\n• \"2 ton\"\n• \"Günlük yükleme yok\" (statik depolama için)\n\n*Bu soğutma kapasitesi hesaplamasını etkiler.*",
            de: "⚖️ **Tägliche Produktmenge**\n\nWie viel Produkt (in kg) wird täglich in den Kühlraum geladen?\n\nDies umfasst:\n• Neue Produkte, die in den Raum gelangen\n• Bewegte oder nachgelagerte Produkte\n• Gesamter täglicher Durchsatz\n\n**Beispiele:**\n• \"500 kg pro Tag\"\n• \"1000kg täglich\"\n• \"2 Tonnen\"\n• \"Keine tägliche Beladung\" (für statische Lagerung)\n\n*Dies beeinflusst die Kühlkapazitätsberechnung.*"
        },
        validate: (answer) => {
            const load = extractDailyLoad(answer);
            if (load < 0 || load > 50000) {
                return { 
                    valid: false, 
                    error: "Please provide a daily load between 0 and 50,000 kg" 
                };
            }
            return { valid: true, data: { daily_product_load: load } };
        }
    },
    {
        id: 'entry_temperature',
        order: 6,
        required: true,
        question: {
            en: "🌡️ **Product Entry Temperature**\n\nWhat temperature are products when they enter the cold room?\n\n**Common scenarios:**\n• **Room temperature** - 20-25°C (fresh products)\n• **Pre-cooled** - 5-10°C (partially chilled)\n• **Ambient** - 15-35°C (varies by season)\n• **Already frozen** - -18°C (frozen products)\n\n**Examples:**\n• \"20°C\" (room temperature)\n• \"35°C\" (hot climate)\n• \"5°C\" (pre-cooled)\n• \"-18°C\" (already frozen)\n\n*Higher entry temperatures require more cooling capacity.*",
            tr: "🌡️ **Ürün Giriş Sıcaklığı**\n\nÜrünler soğuk odaya girdiğinde hangi sıcaklıktadır?\n\n**Yaygın senaryolar:**\n• **Oda sıcaklığı** - 20-25°C (taze ürünler)\n• **Ön soğutulmuş** - 5-10°C (kısmen soğutulmuş)\n• **Ortam** - 15-35°C (mevsime göre değişir)\n• **Zaten donmuş** - -18°C (donmuş ürünler)\n\n**Örnekler:**\n• \"20°C\" (oda sıcaklığı)\n• \"35°C\" (sıcak iklim)\n• \"5°C\" (ön soğutulmuş)\n• \"-18°C\" (zaten donmuş)\n\n*Yüksek giriş sıcaklıkları daha fazla soğutma kapasitesi gerektirir.*",
            de: "🌡️ **Produkteingangstemperatur**\n\nWelche Temperatur haben Produkte beim Eingang in den Kühlraum?\n\n**Häufige Szenarien:**\n• **Raumtemperatur** - 20-25°C (frische Produkte)\n• **Vorgekühlt** - 5-10°C (teilweise gekühlt)\n• **Umgebung** - 15-35°C (je nach Saison)\n• **Bereits gefroren** - -18°C (gefrorene Produkte)\n\n**Beispiele:**\n• \"20°C\" (Raumtemperatur)\n• \"35°C\" (heißes Klima)\n• \"5°C\" (vorgekühlt)\n• \"-18°C\" (bereits gefroren)\n\n*Höhere Eingangstemperaturen erfordern mehr Kühlkapazität.*"
        },
        validate: (answer) => {
            const temp = extractTemperature(answer);
            if (temp === null || temp < -30 || temp > 60) {
                return { 
                    valid: false, 
                    error: "Please provide a temperature between -30°C and 60°C" 
                };
            }
            return { valid: true, data: { product_entry_temperature: temp } };
        }
    },
    {
        id: 'insulation',
        order: 7,
        required: true,
        question: {
            en: "🧱 **Insulation Specification**\n\nWhat insulation will be used for the cold room panels?\n\n**Standard thicknesses:**\n• **80mm** - Light duty, positive temperatures\n• **100mm** - Standard for most applications\n• **120mm** - Heavy duty, energy efficient\n• **150mm** - Ultra-low temperatures\n• **200mm** - Maximum insulation\n\n**Examples:**\n• \"100mm polyurethane panels\"\n• \"120mm insulation\"\n• \"Standard 100mm\"\n\n*Thicker insulation reduces energy consumption.*",
            tr: "🧱 **Yalıtım Özellikleri**\n\nSoğuk oda panelleri için hangi yalıtım kullanılacak?\n\n**Standart kalınlıklar:**\n• **80mm** - Hafif hizmet, pozitif sıcaklıklar\n• **100mm** - Çoğu uygulama için standart\n• **120mm** - Ağır hizmet, enerji verimli\n• **150mm** - Ultra düşük sıcaklıklar\n• **200mm** - Maksimum yalıtım\n\n**Örnekler:**\n• \"100mm poliüretan paneller\"\n• \"120mm yalıtım\"\n• \"Standart 100mm\"\n\n*Daha kalın yalıtım enerji tüketimini azaltır.*",
            de: "🧱 **Isolierspezifikation**\n\nWelche Isolierung wird für die Kühlraumpaneele verwendet?\n\n**Standarddicken:**\n• **80mm** - Leichte Anwendungen, positive Temperaturen\n• **100mm** - Standard für die meisten Anwendungen\n• **120mm** - Schwere Anwendungen, energieeffizient\n• **150mm** - Ultra-Tieftemperaturen\n• **200mm** - Maximale Isolierung\n\n**Beispiele:**\n• \"100mm Polyurethan-Paneele\"\n• \"120mm Isolierung\"\n• \"Standard 100mm\"\n\n*Dickere Isolierung reduziert den Energieverbrauch.*"
        },
        validate: (answer) => {
            const thickness = extractInsulationThickness(answer);
            if (thickness < 50 || thickness > 300) {
                return { 
                    valid: false, 
                    error: "Please provide insulation thickness between 50mm and 300mm" 
                };
            }
            return { valid: true, data: { 
                wall_insulation: thickness,
                ceiling_insulation: thickness + 20, // Usually 20mm thicker
                floor_insulation: Math.max(50, thickness - 20) // Usually 20mm thinner
            } };
        }
    },
    {
        id: 'door_openings',
        order: 8,
        required: true,
        question: {
            en: "🚪 **Door Usage**\n\nHow often will the cold room door be opened daily?\n\n**Usage categories:**\n• **Low** (1-5 times) - Storage only, minimal access\n• **Medium** (6-20 times) - Regular restocking\n• **High** (21-50 times) - Frequent access, picking\n• **Very High** (50+ times) - Continuous operation\n\n**Or specify exact number:**\n• \"15 times per day\"\n• \"Once every hour\"\n\n**Examples:** \"medium\", \"20 times\", \"high usage\", \"minimal access\"\n\n*More door openings increase cooling load significantly.*",
            tr: "🚪 **Kapı Kullanımı**\n\nSoğuk oda kapısı günde kaç kez açılacak?\n\n**Kullanım kategorileri:**\n• **Düşük** (1-5 kez) - Sadece depolama, minimal erişim\n• **Orta** (6-20 kez) - Düzenli stoklama\n• **Yüksek** (21-50 kez) - Sık erişim, toplama\n• **Çok Yüksek** (50+ kez) - Sürekli operasyon\n\n**Veya tam sayı belirtin:**\n• \"Günde 15 kez\"\n• \"Saatte bir kez\"\n\n**Örnekler:** \"orta\", \"20 kez\", \"yoğun kullanım\", \"minimal erişim\"\n\n*Daha fazla kapı açılışı soğutma yükünü önemli ölçüde artırır.*",
            de: "🚪 **Türnutzung**\n\nWie oft wird die Kühlraumtür täglich geöffnet?\n\n**Nutzungskategorien:**\n• **Niedrig** (1-5 mal) - Nur Lagerung, minimaler Zugang\n• **Mittel** (6-20 mal) - Regelmäßige Nachbestückung\n• **Hoch** (21-50 mal) - Häufiger Zugang, Kommissionierung\n• **Sehr Hoch** (50+ mal) - Kontinuierlicher Betrieb\n\n**Oder genaue Anzahl angeben:**\n• \"15 mal pro Tag\"\n• \"Einmal pro Stunde\"\n\n**Beispiele:** \"mittel\", \"20 mal\", \"intensive Nutzung\", \"minimaler Zugang\"\n\n*Mehr Türöffnungen erhöhen die Kühllast erheblich.*"
        },
        validate: (answer) => {
            const openings = extractDoorOpenings(answer);
            if (openings < 0 || openings > 200) {
                return { 
                    valid: false, 
                    error: "Please provide door openings between 0 and 200 per day" 
                };
            }
            return { valid: true, data: { door_openings_per_day: openings } };
        }
    },
    {
        id: 'cooling_time',
        order: 9,
        required: true,
        question: {
            en: "⏱️ **Cooling Time Requirements**\n\nHow quickly do products need to be cooled to storage temperature?\n\n**Typical cooling times:**\n• **6 hours** - Rapid cooling (higher capacity needed)\n• **12 hours** - Standard fast cooling\n• **24 hours** - Normal cooling (most common)\n• **48 hours** - Slow cooling (lower capacity)\n\n**Examples:**\n• \"24 hours\" (standard)\n• \"12 hours\" (fast cooling required)\n• \"6 hours\" (rapid cooling)\n\n*Shorter cooling times require higher capacity equipment.*",
            tr: "⏱️ **Soğutma Süresi Gereksinimleri**\n\nÜrünlerin depolama sıcaklığına ne kadar sürede soğutulması gerekiyor?\n\n**Tipik soğutma süreleri:**\n• **6 saat** - Hızlı soğutma (yüksek kapasite gerekli)\n• **12 saat** - Standart hızlı soğutma\n• **24 saat** - Normal soğutma (en yaygın)\n• **48 saat** - Yavaş soğutma (düşük kapasite)\n\n**Örnekler:**\n• \"24 saat\" (standart)\n• \"12 saat\" (hızlı soğutma gerekli)\n• \"6 saat\" (çok hızlı soğutma)\n\n*Daha kısa soğutma süreleri daha yüksek kapasiteli ekipman gerektirir.*",
            de: "⏱️ **Kühlzeit-Anforderungen**\n\nWie schnell müssen Produkte auf Lagertemperatur gekühlt werden?\n\n**Typische Kühlzeiten:**\n• **6 Stunden** - Schnellkühlung (höhere Kapazität erforderlich)\n• **12 Stunden** - Standard-Schnellkühlung\n• **24 Stunden** - Normale Kühlung (am häufigsten)\n• **48 Stunden** - Langsame Kühlung (geringere Kapazität)\n\n**Beispiele:**\n• \"24 Stunden\" (Standard)\n• \"12 Stunden\" (Schnellkühlung erforderlich)\n• \"6 Stunden\" (Schnellkühlung)\n\n*Kürzere Kühlzeiten erfordern Geräte mit höherer Kapazität.*"
        },
        validate: (answer) => {
            const hours = extractCoolingTime(answer);
            if (hours < 2 || hours > 72) {
                return { 
                    valid: false, 
                    error: "Please provide cooling time between 2 and 72 hours" 
                };
            }
            return { valid: true, data: { cooling_time_hours: hours } };
        }
    },
    {
        id: 'system_requirements',
        order: 10,
        required: true,
        question: {
            en: "🔧 **System Requirements**\n\nWhat are your system design preferences?\n\n**Design considerations:**\n• **Standard** - Normal safety margins (20% extra capacity)\n• **Conservative** - High safety margins (30% extra capacity)\n• **Minimal** - Tight sizing (10% extra capacity)\n• **Future expansion** - Planning for growth (40% extra capacity)\n\n**Climate considerations:**\n• **Temperate** - Moderate climate\n• **Hot/Humid** - Tropical or desert climate\n• **Mild** - Northern European climate\n\n**Examples:**\n• \"standard design with temperate climate\"\n• \"conservative sizing for hot climate\"\n• \"future expansion, moderate climate\"\n\n*Higher safety factors ensure reliable operation.*",
            tr: "🔧 **Sistem Gereksinimleri**\n\nSistem tasarımı tercihleriniz nelerdir?\n\n**Tasarım değerlendirmeleri:**\n• **Standart** - Normal güvenlik marjları (%20 ekstra kapasite)\n• **Muhafazakar** - Yüksek güvenlik marjları (%30 ekstra kapasite)\n• **Minimal** - Sıkı boyutlandırma (%10 ekstra kapasite)\n• **Gelecek genişleme** - Büyüme planlaması (%40 ekstra kapasite)\n\n**İklim değerlendirmeleri:**\n• **Ilıman** - Orta iklim\n• **Sıcak/Nemli** - Tropik veya çöl iklimi\n• **Yumuşak** - Kuzey Avrupa iklimi\n\n**Örnekler:**\n• \"ılıman iklim ile standart tasarım\"\n• \"sıcak iklim için muhafazakar boyutlandırma\"\n• \"gelecek genişleme, orta iklim\"\n\n*Yüksek güvenlik faktörleri güvenilir çalışma sağlar.*",
            de: "🔧 **Systemanforderungen**\n\nWas sind Ihre Systemdesign-Präferenzen?\n\n**Design-Überlegungen:**\n• **Standard** - Normale Sicherheitsmargen (20% Zusatzkapazität)\n• **Konservativ** - Hohe Sicherheitsmargen (30% Zusatzkapazität)\n• **Minimal** - Enge Dimensionierung (10% Zusatzkapazität)\n• **Zukünftige Erweiterung** - Planung für Wachstum (40% Zusatzkapazität)\n\n**Klima-Überlegungen:**\n• **Gemäßigt** - Moderates Klima\n• **Heiß/Feucht** - Tropisches oder Wüstenklima\n• **Mild** - Nordeuropäisches Klima\n\n**Beispiele:**\n• \"Standarddesign mit gemäßigtem Klima\"\n• \"Konservative Dimensionierung für heißes Klima\"\n• \"Zukünftige Erweiterung, moderates Klima\"\n\n*Höhere Sicherheitsfaktoren gewährleisten zuverlässigen Betrieb.*"
        },
        validate: (answer) => {
            const requirements = extractSystemRequirements(answer);
            return { valid: true, data: requirements };
        }
    }
];

// Available commands for users
const COMMANDS = {
    en: {
        help: ['help', 'commands', '?'],
        back: ['back', 'previous', 'prev'],
        edit: ['edit', 'change', 'modify'],
        show: ['show', 'review', 'answers', 'summary'],
        restart: ['restart', 'start over', 'begin again'],
        cancel: ['cancel', 'stop', 'quit', 'exit'],
        skip: ['skip', 'next', 'default']
    },
    tr: {
        help: ['yardım', 'komutlar', 'help', '?'],
        back: ['geri', 'önceki', 'back'],
        edit: ['düzenle', 'değiştir', 'edit'],
        show: ['göster', 'cevaplar', 'özet', 'show'],
        restart: ['yeniden', 'baştan', 'restart'],
        cancel: ['iptal', 'dur', 'çık', 'cancel'],
        skip: ['geç', 'atla', 'skip']
    },
    de: {
        help: ['hilfe', 'befehle', 'help', '?'],
        back: ['zurück', 'vorherige', 'back'],
        edit: ['bearbeiten', 'ändern', 'edit'],
        show: ['zeigen', 'antworten', 'übersicht', 'show'],
        restart: ['neustart', 'von vorne', 'restart'],
        cancel: ['abbrechen', 'stopp', 'beenden', 'cancel'],
        skip: ['überspringen', 'weiter', 'skip']
    }
};

/**
 * Initialize cold room calculation flow
 * @param {string} userId - User ID
 * @param {string} language - Language code
 * @returns {string} Welcome message with instructions
 */
function initializeColdRoomFlow(userId, language = 'en') {
    const session = sessionManager.getSession(userId);
    
    // Initialize flow state
    session.coldRoomFlow = {
        active: true,
        language: language,
        currentStep: 0,
        answers: {},
        startTime: Date.now(),
        totalQuestions: QUESTIONS.length
    };
    
    // Mark session as having active flow
    sessionManager.startFlow(session, 'cold_room');
    
    logger.info(`Initialized cold room flow for user ${userId} in ${language}`);
    
    return getWelcomeMessage(language) + '\n\n' + getCurrentQuestion(session);
}

/**
 * Get welcome message with all available commands
 * @param {string} language - Language code
 * @returns {string} Welcome message
 */
function getWelcomeMessage(language) {
    const messages = {
        en: {
            title: "❄️ **Cold Room Capacity Calculator**",
            subtitle: "Professional refrigeration system sizing with step-by-step guidance",
            intro: "I'll guide you through **10 essential questions** to calculate the optimal cooling capacity for your cold room.",
            commands: "**💬 Available Commands (use anytime):**",
            commandList: [
                "• **help** - Show this command list",
                "• **back** - Go to previous question",
                "• **edit [number]** - Edit specific question (e.g., 'edit 3')",
                "• **show** - Review all your current answers",
                "• **restart** - Start the calculation over",
                "• **cancel** - Exit the calculator",
                "• **skip** - Use default value for current question"
            ],
            tips: "**💡 Pro Tips:**",
            tipList: [
                "• You can edit any previous answer at any time",
                "• Type 'show' to see your progress",
                "• All questions are important for accurate results"
            ],
            ready: "**🎯 Ready to start? Let's calculate your cold room capacity!**"
        },
        tr: {
            title: "❄️ **Soğuk Oda Kapasite Hesaplayıcısı**",
            subtitle: "Adım adım rehberlik ile profesyonel soğutma sistemi boyutlandırması",
            intro: "Soğuk odanız için optimal soğutma kapasitesini hesaplamak üzere **10 temel soru** ile size rehberlik edeceğim.",
            commands: "**💬 Kullanılabilir Komutlar (istediğiniz zaman kullanın):**",
            commandList: [
                "• **yardım** - Bu komut listesini göster",
                "• **geri** - Önceki soruya git",
                "• **düzenle [numara]** - Belirli soruyu düzenle (örn: 'düzenle 3')",
                "• **göster** - Tüm mevcut cevaplarınızı gözden geçirin",
                "• **yeniden** - Hesaplamayı baştan başlat",
                "• **iptal** - Hesaplayıcıdan çık",
                "• **geç** - Mevcut soru için varsayılan değer kullan"
            ],
            tips: "**💡 Profesyonel İpuçları:**",
            tipList: [
                "• İstediğiniz zaman önceki cevapları düzenleyebilirsiniz",
                "• İlerlemenizi görmek için 'göster' yazın",
                "• Doğru sonuçlar için tüm sorular önemlidir"
            ],
            ready: "**🎯 Başlamaya hazır mısınız? Soğuk oda kapasitenizi hesaplayalım!**"
        },
        de: {
            title: "❄️ **Kühlraum-Kapazitätsrechner**",
            subtitle: "Professionelle Kühlsystemauslegung mit Schritt-für-Schritt-Anleitung",
            intro: "Ich führe Sie durch **10 wesentliche Fragen**, um die optimale Kühlkapazität für Ihren Kühlraum zu berechnen.",
            commands: "**💬 Verfügbare Befehle (jederzeit verwendbar):**",
            commandList: [
                "• **hilfe** - Diese Befehlsliste anzeigen",
                "• **zurück** - Zur vorherigen Frage gehen",
                "• **bearbeiten [nummer]** - Bestimmte Frage bearbeiten (z.B. 'bearbeiten 3')",
                "• **zeigen** - Alle aktuellen Antworten überprüfen",
                "• **neustart** - Berechnung von vorne beginnen",
                "• **abbrechen** - Rechner verlassen",
                "• **überspringen** - Standardwert für aktuelle Frage verwenden"
            ],
            tips: "**💡 Profi-Tipps:**",
            tipList: [
                "• Sie können jederzeit vorherige Antworten bearbeiten",
                "• Geben Sie 'zeigen' ein, um Ihren Fortschritt zu sehen",
                "• Alle Fragen sind für genaue Ergebnisse wichtig"
            ],
            ready: "**🎯 Bereit zum Start? Lassen Sie uns Ihre Kühlraumkapazität berechnen!**"
        }
    };
    
    const msg = messages[language] || messages.en;
    
    return `${msg.title}\n${msg.subtitle}\n\n` +
           `${msg.intro}\n\n` +
           `${msg.commands}\n${msg.commandList.join('\n')}\n\n` +
           `${msg.tips}\n${msg.tipList.join('\n')}\n\n` +
           `${msg.ready}`;
}

/**
 * Get current question for the user
 * @param {Object} session - User session
 * @returns {string} Current question
 */
function getCurrentQuestion(session) {
    const flow = session.coldRoomFlow;
    if (!flow || !flow.active) return null;
    
    if (flow.currentStep >= QUESTIONS.length) {
        return null; // All questions completed
    }
    
    const question = QUESTIONS[flow.currentStep];
    const questionText = question.question[flow.language] || question.question.en;
    
    // Add progress indicator
    const progress = `📊 **Question ${flow.currentStep + 1} of ${flow.totalQuestions}**\n\n`;
    
    // Add command reminder
    const commandReminder = {
        en: "\n\n💬 *Commands: help | back | edit | show | restart | cancel*",
        tr: "\n\n💬 *Komutlar: yardım | geri | düzenle | göster | yeniden | iptal*",
        de: "\n\n💬 *Befehle: hilfe | zurück | bearbeiten | zeigen | neustart | abbrechen*"
    };
    
    const reminder = commandReminder[flow.language] || commandReminder.en;
    
    return progress + questionText + reminder;
}

/**
 * Process user answer or command
 * @param {Object} session - User session
 * @param {string} input - User input
 * @returns {string} Response message
 */
function processInput(session, input) {
    const flow = session.coldRoomFlow;
    if (!flow || !flow.active) {
        return null;
    }
    
    const trimmedInput = input.trim();
    
    // Check for commands first
    const command = detectCommand(trimmedInput, flow.language);
    if (command) {
        return handleCommand(session, command, trimmedInput);
    }
    
    // Process answer for current question
    return processAnswer(session, trimmedInput);
}

/**
 * Detect if input is a command
 * @param {string} input - User input
 * @param {string} language - Language code
 * @returns {string|null} Command type or null
 */
function detectCommand(input, language) {
    const lowerInput = input.toLowerCase();
    const commands = COMMANDS[language] || COMMANDS.en;
    
    for (const [commandType, keywords] of Object.entries(commands)) {
        if (keywords.some(keyword => lowerInput.includes(keyword))) {
            return commandType;
        }
    }
    
    return null;
}

/**
 * Handle user commands
 * @param {Object} session - User session
 * @param {string} command - Command type
 * @param {string} input - Original input
 * @returns {string} Command response
 */
function handleCommand(session, command, input) {
    const flow = session.coldRoomFlow;
    const language = flow.language;
    
    switch (command) {
        case 'help':
            return getHelpMessage(language);
            
        case 'back':
            return goToPreviousQuestion(session);
            
        case 'edit':
            return handleEditCommand(session, input);
            
        case 'show':
            return showCurrentAnswers(session);
            
        case 'restart':
            return restartFlow(session);
            
        case 'cancel':
            return cancelFlow(session);
            
        case 'skip':
            return skipCurrentQuestion(session);
            
        default:
            return getCurrentQuestion(session);
    }
}

/**
 * Process answer for current question
 * @param {Object} session - User session
 * @param {string} answer - User answer
 * @returns {string} Response message
 */
function processAnswer(session, answer) {
    const flow = session.coldRoomFlow;
    const currentQuestion = QUESTIONS[flow.currentStep];
    
    // Validate answer
    const validation = currentQuestion.validate(answer);
    if (!validation.valid) {
        return getErrorMessage(validation.error, flow.language) + '\n\n' + getCurrentQuestion(session);
    }
    
    // Store answer
    flow.answers[currentQuestion.id] = {
        raw: answer,
        processed: validation.data,
        timestamp: Date.now()
    };
    
    // Move to next question
    flow.currentStep++;
    
    logger.debug(`Cold room flow: Question ${currentQuestion.id} answered for user ${session.userId}`);
    
    // Check if flow is complete
    if (flow.currentStep >= QUESTIONS.length) {
        return completeCalculation(session);
    }
    
    // Return next question
    return getSuccessMessage(flow.language) + '\n\n' + getCurrentQuestion(session);
}

/**
 * Complete the calculation and show results
 * @param {Object} session - User session
 * @returns {string} Final results
 */
function completeCalculation(session) {
    const flow = session.coldRoomFlow;
    
    try {
        // Compile all answers into calculation parameters
        const params = compileCalculationParameters(flow.answers);
        
        // Perform calculation
        const result = coldRoomCalculator.calculateColdRoomCapacity(params);
        
        // Store result in session for potential equipment recommendations
        session.lastColdRoomResult = result;
        
        // End flow
        flow.active = false;
        flow.completedAt = Date.now();
        sessionManager.endFlow(session);
        
        logger.info(`Cold room calculation completed for user ${session.userId}: ${result.total_capacity_kw} kW`);
        
        // Format and return results
        return formatFinalResults(result, flow.answers, flow.language);
        
    } catch (error) {
        logger.error(`Error completing cold room calculation for user ${session.userId}:`, error);
        
        const errorMessages = {
            en: "❌ **Calculation Error**\n\nThere was an error processing your calculation. Please try again or contact support.",
            tr: "❌ **Hesaplama Hatası**\n\nHesaplama işlenirken bir hata oluştu. Lütfen tekrar deneyin veya destek ile iletişime geçin.",
            de: "❌ **Berechnungsfehler**\n\nBeim Verarbeiten Ihrer Berechnung ist ein Fehler aufgetreten. Bitte versuchen Sie es erneut oder kontaktieren Sie den Support."
        };
        
        return errorMessages[flow.language] || errorMessages.en;
    }
}

// Helper functions for parameter extraction and validation...

function extractDimensions(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    // Check for volume
    const volumeMatch = lowerAnswer.match(/(\d+(?:\.\d+)?)\s*(?:m³|m3|cubic\s*meters?)/);
    if (volumeMatch) {
        const volume = parseFloat(volumeMatch[1]);
        const side = Math.cbrt(volume);
        return {
            volume: volume,
            length: side,
            width: side,
            height: Math.min(side, 4)
        };
    }
    
    // Check for dimension pattern like "10m × 6m × 3m"
    const dimensionPattern = lowerAnswer.match(/(\d+(?:\.\d+)?)\s*m?\s*[×x]\s*(\d+(?:\.\d+)?)\s*m?\s*[×x]\s*(\d+(?:\.\d+)?)\s*m?/);
    if (dimensionPattern) {
        return {
            length: parseFloat(dimensionPattern[1]),
            width: parseFloat(dimensionPattern[2]),
            height: parseFloat(dimensionPattern[3])
        };
    }
    
    // Look for individual dimensions
    const lengthMatch = lowerAnswer.match(/(?:length|long|uzunluk|länge|lang).*?(\d+(?:\.\d+)?)\s*m/);
    const widthMatch = lowerAnswer.match(/(?:width|wide|genişlik|breite|breit).*?(\d+(?:\.\d+)?)\s*m/);
    const heightMatch = lowerAnswer.match(/(?:height|high|yükseklik|höhe|hoch).*?(\d+(?:\.\d+)?)\s*m/);
    
    const result = {};
    if (lengthMatch) result.length = parseFloat(lengthMatch[1]);
    if (widthMatch) result.width = parseFloat(widthMatch[1]);
    if (heightMatch) result.height = parseFloat(heightMatch[1]);
    
    return result;
}

function extractTemperature(answer) {
    const tempMatch = answer.match(/(-?\d+(?:\.\d+)?)\s*°?c/i);
    return tempMatch ? parseFloat(tempMatch[1]) : null;
}

function extractProductType(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    const productTypes = {
        'meat': ['meat', 'beef', 'pork', 'poultry', 'chicken', 'et', 'fleisch'],
        'fish': ['fish', 'seafood', 'salmon', 'tuna', 'balık', 'fisch'],
        'dairy': ['dairy', 'milk', 'cheese', 'yogurt', 'butter', 'süt', 'milch', 'käse'],
        'fruits': ['fruit', 'apple', 'orange', 'berry', 'banana', 'meyve', 'obst'],
        'vegetables': ['vegetable', 'carrot', 'potato', 'lettuce', 'sebze', 'gemüse'],
        'frozen': ['frozen', 'donmuş', 'gefroren', 'tiefkühl'],
        'beverages': ['beverage', 'drink', 'beer', 'wine', 'soda', 'içecek', 'getränk']
    };
    
    for (const [type, keywords] of Object.entries(productTypes)) {
        if (keywords.some(keyword => lowerAnswer.includes(keyword))) {
            return type;
        }
    }
    
    return 'general';
}

function extractDailyLoad(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    // Check for "no loading" or similar
    if (lowerAnswer.includes('no') || lowerAnswer.includes('yok') || lowerAnswer.includes('keine')) {
        return 0;
    }
    
    // Extract number
    const numberMatch = answer.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return 500; // Default
    
    let amount = parseFloat(numberMatch[1]);
    
    // Check for tons
    if (lowerAnswer.includes('ton')) {
        amount *= 1000;
    }
    
    return amount;
}

function extractInsulationThickness(answer) {
    const numberMatch = answer.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return 100; // Default
    
    let thickness = parseFloat(numberMatch[1]);
    
    // Convert cm to mm if needed
    if (answer.toLowerCase().includes('cm')) {
        thickness *= 10;
    }
    
    return thickness;
}

function extractDoorOpenings(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    // Check for categories
    if (lowerAnswer.includes('low') || lowerAnswer.includes('düşük') || lowerAnswer.includes('niedrig')) {
        return 3;
    }
    if (lowerAnswer.includes('medium') || lowerAnswer.includes('orta') || lowerAnswer.includes('mittel')) {
        return 13;
    }
    if (lowerAnswer.includes('high') || lowerAnswer.includes('yüksek') || lowerAnswer.includes('hoch')) {
        return 35;
    }
    if (lowerAnswer.includes('very') || lowerAnswer.includes('çok') || lowerAnswer.includes('sehr')) {
        return 75;
    }
    
    // Extract number
    const numberMatch = answer.match(/(\d+(?:\.\d+)?)/);
    return numberMatch ? parseFloat(numberMatch[1]) : 10; // Default
}

function extractCoolingTime(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    // Extract number and check for time units
    const numberMatch = answer.match(/(\d+(?:\.\d+)?)/);
    if (!numberMatch) return 24; // Default
    
    let hours = parseFloat(numberMatch[1]);
    
    // Convert days to hours if specified
    if (lowerAnswer.includes('day') || lowerAnswer.includes('gün') || lowerAnswer.includes('tag')) {
        hours *= 24;
    }
    
    return hours;
}

function extractSystemRequirements(answer) {
    const lowerAnswer = answer.toLowerCase();
    
    // Extract safety factor
    let safety_factor = 1.2; // Default standard
    if (lowerAnswer.includes('minimal') || lowerAnswer.includes('tight')) {
        safety_factor = 1.1;
    } else if (lowerAnswer.includes('conservative') || lowerAnswer.includes('muhafazakar') || lowerAnswer.includes('konservativ')) {
        safety_factor = 1.3;
    } else if (lowerAnswer.includes('expansion') || lowerAnswer.includes('future') || lowerAnswer.includes('genişleme') || lowerAnswer.includes('erweiterung')) {
        safety_factor = 1.4;
    }
    
    // Extract climate zone
    let climate_zone = 'temperate'; // Default
    if (lowerAnswer.includes('hot') || lowerAnswer.includes('humid') || lowerAnswer.includes('tropical') || 
        lowerAnswer.includes('desert') || lowerAnswer.includes('sıcak') || lowerAnswer.includes('heiß')) {
        climate_zone = 'tropical';
    } else if (lowerAnswer.includes('mild') || lowerAnswer.includes('cool') || lowerAnswer.includes('northern') ||
               lowerAnswer.includes('yumuşak') || lowerAnswer.includes('mild')) {
        climate_zone = 'arctic';
    }
    
    // Extract humidity factor
    let humidity_factor = 1.0; // Default
    if (lowerAnswer.includes('humid') || lowerAnswer.includes('nemli') || lowerAnswer.includes('feucht')) {
        humidity_factor = 1.15;
    } else if (lowerAnswer.includes('dry') || lowerAnswer.includes('kuru') || lowerAnswer.includes('trocken')) {
        humidity_factor = 0.95;
    }
    
    return {
        safety_factor: safety_factor,
        climate_zone: climate_zone,
        humidity_factor: humidity_factor,
        future_expansion: safety_factor > 1.3 ? 1.1 : 1.0 // Additional expansion factor
    };
}

function compileCalculationParameters(answers) {
    const params = {};
    
    // Extract parameters from answers
    Object.values(answers).forEach(answer => {
        Object.assign(params, answer.processed);
    });
    
    // Set defaults for missing values
    return {
        length: params.length || 10,
        width: params.width || 6,
        height: params.height || 3,
        temperature: params.temperature || -18,
        ambient_temperature: params.ambient_temperature || 35,
        product_type: params.product_type || 'general',
        daily_product_load: params.daily_product_load || 500,
        product_entry_temperature: params.product_entry_temperature || 20,
        wall_insulation: params.wall_insulation || 100,
        ceiling_insulation: (params.wall_insulation || 100) + 20,
        floor_insulation: (params.wall_insulation || 100) - 20,
        door_openings_per_day: params.door_openings_per_day || 10,
        cooling_time_hours: 24,
        safety_factor: 1.2,
        defrost_factor: 1.0,
        future_expansion: 1.0,
        ...params
    };
}

function formatFinalResults(result, answers, language) {
    const texts = {
        en: {
            title: "🎉 **Cold Room Calculation Complete!**",
            capacity: "Required Cooling Capacity",
            summary: "Calculation Summary",
            breakdown: "Load Breakdown", 
            system: "System Recommendations",
            next: "What's Next?",
            equipment: "Get equipment recommendations",
            contact: "Contact our sales team",
            save: "Results saved for future reference"
        },
        tr: {
            title: "🎉 **Soğuk Oda Hesaplaması Tamamlandı!**",
            capacity: "Gerekli Soğutma Kapasitesi",
            summary: "Hesaplama Özeti",
            breakdown: "Yük Dağılımı",
            system: "Sistem Önerileri", 
            next: "Sırada Ne Var?",
            equipment: "Ekipman önerileri alın",
            contact: "Satış ekibimizle iletişime geçin",
            save: "Sonuçlar gelecekte kullanım için kaydedildi"
        },
        de: {
            title: "🎉 **Kühlraum-Berechnung Abgeschlossen!**",
            capacity: "Erforderliche Kühlkapazität",
            summary: "Berechnungszusammenfassung",
            breakdown: "Lastverteilung",
            system: "Systemempfehlungen",
            next: "Wie geht es weiter?",
            equipment: "Geräteempfehlungen erhalten",
            contact: "Kontaktieren Sie unser Verkaufsteam",
            save: "Ergebnisse für zukünftige Verwendung gespeichert"
        }
    };
    
    const t = texts[language] || texts.en;
    
    let response = `${t.title}\n\n`;
    
    // Main results
    response += `💡 **${t.capacity}**: ${result.total_capacity_kw} kW (${result.total_capacity_watts.toLocaleString()} W)\n`;
    response += `📐 **Room**: ${result.room.dimensions} = ${result.room.volume} m³\n`;
    response += `🌡️ **Temperature**: ${result.room.temperature}°C (ambient: ${result.room.ambient_temperature}°C)\n\n`;
    
    // Load breakdown
    response += `📊 **${t.breakdown}**:\n`;
    response += `• Transmission: ${result.loads.transmission.toLocaleString()} W\n`;
    response += `• Infiltration: ${result.loads.infiltration.toLocaleString()} W\n`;
    response += `• Product cooling: ${result.loads.product.toLocaleString()} W\n`;
    response += `• Equipment: ${result.loads.equipment.toLocaleString()} W\n`;
    if (result.loads.defrost > 0) {
        response += `• Defrost: ${result.loads.defrost.toLocaleString()} W\n`;
    }
    response += `• **Total**: ${result.total_capacity_watts.toLocaleString()} W\n\n`;
    
    // System recommendations
    response += `🔧 **${t.system}**:\n`;
    response += `• System: ${result.recommendations.system_type}\n`;
    response += `• Compressor: ${result.recommendations.compressor_type}\n`;
    response += `• Refrigerant: ${result.recommendations.refrigerant_suggestion}\n`;
    response += `• Power: ${result.recommendations.estimated_power_consumption}\n\n`;
    
    // Next steps
    response += `🚀 **${t.next}**\n`;
    response += `• Type "equipment recommendation" to ${t.equipment}\n`;
    response += `• ${t.contact} for detailed quotes\n`;
    response += `• ${t.save}\n`;
    
    return response;
}

function getErrorMessage(error, language) {
    const prefixes = {
        en: "❌ **Invalid Input**\n",
        tr: "❌ **Geçersiz Girdi**\n", 
        de: "❌ **Ungültige Eingabe**\n"
    };
    
    return (prefixes[language] || prefixes.en) + error;
}

function getSuccessMessage(language) {
    const messages = {
        en: "✅ **Answer recorded!**",
        tr: "✅ **Cevap kaydedildi!**",
        de: "✅ **Antwort aufgezeichnet!**"
    };
    
    return messages[language] || messages.en;
}

function getHelpMessage(language) {
    return getWelcomeMessage(language);
}

function goToPreviousQuestion(session) {
    const flow = session.coldRoomFlow;
    
    if (flow.currentStep <= 0) {
        const messages = {
            en: "❌ You're already at the first question.",
            tr: "❌ Zaten ilk sorudasınız.",
            de: "❌ Sie sind bereits bei der ersten Frage."
        };
        return messages[flow.language] || messages.en;
    }
    
    flow.currentStep--;
    const prevQuestionId = QUESTIONS[flow.currentStep].id;
    delete flow.answers[prevQuestionId];
    
    const messages = {
        en: "⬅️ **Going back to previous question**",
        tr: "⬅️ **Önceki soruya dönülüyor**",
        de: "⬅️ **Zurück zur vorherigen Frage**"
    };
    
    const message = messages[flow.language] || messages.en;
    return message + '\n\n' + getCurrentQuestion(session);
}

function handleEditCommand(session, input) {
    // Implementation for edit command
    const flow = session.coldRoomFlow;
    
    // Extract question number if provided
    const numberMatch = input.match(/\d+/);
    if (numberMatch) {
        const questionNumber = parseInt(numberMatch[0]) - 1;
        if (questionNumber >= 0 && questionNumber < flow.currentStep) {
            // Go to specific question
            flow.currentStep = questionNumber;
            const questionId = QUESTIONS[questionNumber].id;
            delete flow.answers[questionId];
            
            const messages = {
                en: `✏️ **Editing Question ${questionNumber + 1}**`,
                tr: `✏️ **${questionNumber + 1}. Soru Düzenleniyor**`,
                de: `✏️ **Frage ${questionNumber + 1} bearbeiten**`
            };
            
            const message = messages[flow.language] || messages.en;
            return message + '\n\n' + getCurrentQuestion(session);
        }
    }
    
    // Show edit help
    const messages = {
        en: "To edit a specific question, use: **edit [number]**\n\nExample: \"edit 3\" to edit question 3\n\nOr use **show** to see all questions and their numbers.",
        tr: "Belirli bir soruyu düzenlemek için: **düzenle [numara]**\n\nÖrnek: \"düzenle 3\" ile 3. soruyu düzenleyin\n\nVeya tüm soruları ve numaralarını görmek için **göster** kullanın.",
        de: "Um eine bestimmte Frage zu bearbeiten: **bearbeiten [nummer]**\n\nBeispiel: \"bearbeiten 3\" um Frage 3 zu bearbeiten\n\nOder verwenden Sie **zeigen** um alle Fragen und ihre Nummern zu sehen."
    };
    
    return messages[flow.language] || messages.en;
}

function showCurrentAnswers(session) {
    const flow = session.coldRoomFlow;
    
    if (Object.keys(flow.answers).length === 0) {
        const messages = {
            en: "📋 **No answers recorded yet**\n\nStart by answering the current question.",
            tr: "📋 **Henüz hiç cevap kaydedilmedi**\n\nMevcut soruyu cevaplayarak başlayın.",
            de: "📋 **Noch keine Antworten aufgezeichnet**\n\nBeginnen Sie mit der Beantwortung der aktuellen Frage."
        };
        return messages[flow.language] || messages.en;
    }
    
    const titles = {
        en: "📋 **Your Current Answers**",
        tr: "📋 **Mevcut Cevaplarınız**",
        de: "📋 **Ihre aktuellen Antworten**"
    };
    
    let response = titles[flow.language] || titles.en;
    response += '\n\n';
    
    QUESTIONS.slice(0, flow.currentStep).forEach((question, index) => {
        const answer = flow.answers[question.id];
        if (answer) {
            response += `${index + 1}. **${question.id}**: ${answer.raw}\n`;
        }
    });
    
    const footers = {
        en: "\n💡 Use **edit [number]** to change any answer.",
        tr: "\n💡 Herhangi bir cevabı değiştirmek için **düzenle [numara]** kullanın.",
        de: "\n💡 Verwenden Sie **bearbeiten [nummer]** um eine Antwort zu ändern."
    };
    
    response += footers[flow.language] || footers.en;
    
    return response;
}

function restartFlow(session) {
    const language = session.coldRoomFlow?.language || 'en';
    
    // Clear existing flow
    session.coldRoomFlow = null;
    sessionManager.endFlow(session);
    
    // Start new flow
    return initializeColdRoomFlow(session.userId, language);
}

function cancelFlow(session) {
    const language = session.coldRoomFlow?.language || 'en';
    
    // End flow
    session.coldRoomFlow.active = false;
    sessionManager.endFlow(session);
    
    const messages = {
        en: "❌ **Cold room calculation cancelled**\n\nType 'cold room' to start a new calculation anytime.",
        tr: "❌ **Soğuk oda hesaplaması iptal edildi**\n\nİstediğiniz zaman yeni hesaplama başlatmak için 'soğuk oda' yazın.",
        de: "❌ **Kühlraum-Berechnung abgebrochen**\n\nGeben Sie 'kühlraum' ein, um jederzeit eine neue Berechnung zu starten."
    };
    
    return messages[language] || messages.en;
}

function skipCurrentQuestion(session) {
    // Use default value and move to next question
    const flow = session.coldRoomFlow;
    const currentQuestion = QUESTIONS[flow.currentStep];
    
    // Get default answer based on question type
    const defaultAnswers = {
        'dimensions': '10m × 6m × 3m',
        'temperature': '-18°C',
        'products': 'general',
        'daily_load': '500 kg',
        'entry_temperature': '20°C',
        'ambient_temperature': '35°C',
        'insulation': '100mm',
        'door_openings': '10 times',
        'cooling_time': '24 hours',
        'system_requirements': 'standard design with temperate climate'
    };
    
    const defaultAnswer = defaultAnswers[currentQuestion.id] || 'default';
    
    const messages = {
        en: `⏭️ **Using default value**: ${defaultAnswer}`,
        tr: `⏭️ **Varsayılan değer kullanılıyor**: ${defaultAnswer}`,
        de: `⏭️ **Standardwert verwenden**: ${defaultAnswer}`
    };
    
    const message = messages[flow.language] || messages.en;
    
    // Process the default answer
    processAnswer(session, defaultAnswer);
    
    return message + '\n\n' + getCurrentQuestion(session);
}

/**
 * Check if user has active cold room flow
 * @param {Object} session - User session
 * @returns {boolean} True if flow is active
 */
function hasActiveColdRoomFlow(session) {
    return session.coldRoomFlow && session.coldRoomFlow.active;
}

module.exports = {
    initializeColdRoomFlow,
    processInput,
    hasActiveColdRoomFlow,
    getCurrentQuestion,
    cancelFlow
};