"""
Cold Room Capacity Calculator for Python
Implements the same algorithm as the HTML calculator
"""

import re
import math

# Capacity table (W/m³) for different volumes and temperatures
# Format: volume: [12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C]
CAPACITY_TABLE = {
    5: [71, 94, 112, 130, 114, 121, 128, 144],
    10: [60, 80, 96, 111, 91, 97, 104, 116],
    15: [54, 72, 86, 100, 73, 79, 84, 95],
    20: [51, 68, 82, 96, 68, 73, 78, 88],
    25: [49, 66, 79, 92, 64, 69, 74, 84],
    30: [47, 62, 75, 88, 56, 60, 65, 73],
    35: [45, 60, 73, 85, 53, 58, 62, 71],
    40: [44, 59, 71, 83, 51, 55, 59, 68],
    45: [43, 58, 70, 82, 50, 54, 58, 66],
    50: [43, 57, 69, 81, 49, 53, 57, 65],
    60: [40, 54, 65, 77, 43, 46, 50, 57],
    70: [40, 53, 64, 76, 41, 45, 49, 56],
    80: [39, 52, 64, 75, 40, 44, 48, 55],
    90: [39, 52, 63, 74, 40, 43, 47, 54],
    100: [40, 53, 65, 76, 36, 40, 43, 50],
    125: [36, 48, 58, 69, 34, 37, 41, 47],
    150: [36, 47, 58, 68, 33, 36, 40, 46]
}

# Temperature index mapping
TEMPERATURE_INDEX = {
    12: 0, 5: 1, 0: 2, -5: 3, -15: 4, -18: 5, -20: 6, -25: 7
}

def interpolate_capacity(volume, temperature):
    """
    Interpolate capacity for given volume and temperature
    Args:
        volume (int): Room volume in m³
        temperature (int): Room temperature in °C
    Returns:
        float: Capacity in W/m³ or None if invalid
    """
    temp_index = TEMPERATURE_INDEX.get(temperature)
    if temp_index is None:
        return None

    volumes = sorted(CAPACITY_TABLE.keys())
    
    # Direct match
    if volume in CAPACITY_TABLE:
        return CAPACITY_TABLE[volume][temp_index]

    # Interpolation
    lower_vol = None
    upper_vol = None

    for i in range(len(volumes) - 1):
        if volume >= volumes[i] and volume <= volumes[i + 1]:
            lower_vol = volumes[i]
            upper_vol = volumes[i + 1]
            break

    if lower_vol is None:
        # Extrapolation
        if volume < volumes[0]:
            return CAPACITY_TABLE[volumes[0]][temp_index] * (volume / volumes[0])
        else:
            last_vol = volumes[-1]
            return CAPACITY_TABLE[last_vol][temp_index] * (volume / last_vol) * 0.8

    lower_cap = CAPACITY_TABLE[lower_vol][temp_index]
    upper_cap = CAPACITY_TABLE[upper_vol][temp_index]
    
    ratio = (volume - lower_vol) / (upper_vol - lower_vol)
    return lower_cap + (upper_cap - lower_cap) * ratio

def calculate_capacity(volume=330, temperature=-20, ambient_temp=35, climate_zone='cool', safety_factor=1.2):
    """
    Calculate cold room capacity
    Args:
        volume (int): Room volume in m³
        temperature (int): Room temperature in °C
        ambient_temp (int): Ambient temperature in °C
        climate_zone (str): Climate zone ('cool' or 'hot')
        safety_factor (float): Safety factor (1.0, 1.1, 1.2, 1.3)
    Returns:
        dict: Calculation results
    """
    # Validate inputs
    if not volume or volume <= 0:
        raise ValueError('Volume must be a positive number')

    if temperature not in TEMPERATURE_INDEX:
        raise ValueError('Invalid temperature. Supported temperatures: 12, 5, 0, -5, -15, -18, -20, -25°C')

    if ambient_temp < 25 or ambient_temp > 50:
        raise ValueError('Ambient temperature must be between 25°C and 50°C')

    if climate_zone not in ['cool', 'hot']:
        raise ValueError('Climate zone must be "cool" or "hot"')

    if safety_factor not in [1.0, 1.1, 1.2, 1.3]:
        raise ValueError('Safety factor must be 1.0, 1.1, 1.2, or 1.3')

    # Base capacity calculation (35°C reference) - this gives W/m³
    base_capacity_per_m3 = interpolate_capacity(volume, temperature)
    
    if base_capacity_per_m3 is None:
        raise ValueError('Unable to calculate capacity for the given parameters')

    # Calculate total base capacity for the volume
    base_capacity = base_capacity_per_m3 * volume

    # Temperature correction
    temp_correction = 1 + (ambient_temp - 35) * 0.02  # 2% increase per 1°C
    
    # Climate zone correction
    climate_correction = 1.1 if climate_zone == 'hot' else 1.0
    
    # Final capacity calculation
    final_capacity = round(base_capacity * temp_correction * climate_correction * safety_factor)

    return {
        'final_capacity': final_capacity,
        'base_capacity': round(base_capacity),
        'temp_correction': round(temp_correction, 2),
        'climate_correction': round(climate_correction, 2),
        'safety_factor': round(safety_factor, 1),
        'capacity_per_m3': round(final_capacity / volume),
        'parameters': {
            'volume': volume,
            'temperature': temperature,
            'ambient_temp': ambient_temp,
            'climate_zone': climate_zone,
            'safety_factor': safety_factor
        }
    }

def extract_parameters(message):
    """
    Extract calculation parameters from user message
    Args:
        message (str): User message
    Returns:
        dict: Extracted parameters
    """
    lower_message = message.lower()
    params = {}

    # Extract volume - more comprehensive patterns
    volume_match = re.search(r'(\d+)\s*(?:m3|m³|cubic meters?|hacim|volume|room|oda|raum)', lower_message)
    if volume_match:
        params['volume'] = int(volume_match.group(1))
    else:
        # Look for volume patterns like "330m³", "500 cubic meters", etc.
        volume_pattern = re.search(r'(\d+)\s*(?:m3|m³|cubic meters?)', lower_message)
        if volume_pattern:
            params['volume'] = int(volume_pattern.group(1))

    # Extract room temperature - look for negative temperatures first
    neg_temp_match = re.search(r'(?:room|iç|temperature|sıcaklık)\s*(?:is\s*)?(-?\d+)\s*°?c', lower_message)
    if neg_temp_match:
        params['temperature'] = int(neg_temp_match.group(1))
    else:
        # Look for temperature patterns like "-20°C", "-5C", etc.
        temp_pattern = re.search(r'(-?\d+)\s*°?c', lower_message)
        if temp_pattern:
            temp = int(temp_pattern.group(1))
            if temp in TEMPERATURE_INDEX:
                params['temperature'] = temp

    # Extract ambient temperature
    ambient_match = re.search(r'(?:ambient|dış|outside|external)\s*(?:temperature|sıcaklık)\s*(?:is\s*)?(\d+)\s*°?c', lower_message)
    if ambient_match:
        params['ambient_temp'] = int(ambient_match.group(1))
    else:
        # Look for ambient temperature patterns like "35°C ambient", "40C outside", etc.
        ambient_pattern = re.search(r'(\d+)\s*°?c\s*(?:ambient|dış|outside|external)', lower_message)
        if ambient_pattern:
            params['ambient_temp'] = int(ambient_pattern.group(1))

    # Extract climate zone
    if any(word in lower_message for word in ['hot', 'sıcak', 'warm']):
        params['climate_zone'] = 'hot'
    elif any(word in lower_message for word in ['cool', 'serin', 'cold']):
        params['climate_zone'] = 'cool'

    # Extract safety factor
    if '30%' in lower_message or '1.3' in lower_message:
        params['safety_factor'] = 1.3
    elif '20%' in lower_message or '1.2' in lower_message:
        params['safety_factor'] = 1.2
    elif '10%' in lower_message or '1.1' in lower_message:
        params['safety_factor'] = 1.1
    elif '0%' in lower_message or '1.0' in lower_message:
        params['safety_factor'] = 1.0

    return params

def format_result(result, language='en'):
    """
    Format calculation results for chat response
    Args:
        result (dict): Calculation result
        language (str): Language code
    Returns:
        str: Formatted response
    """
    responses = {
        'en': {
            'title': "❄️ Cold Room Capacity Calculation Results",
            'capacity': "Required Cooling Capacity",
            'perM3': "Capacity per m³",
            'details': "Calculation Details",
            'base': "Base Capacity (35°C reference)",
            'tempCorr': "Temperature Correction",
            'climateCorr': "Climate Zone Correction",
            'safety': "Safety Factor",
            'total': "TOTAL CAPACITY",
            'parameters': "Parameters Used",
            'volume': "Room Volume",
            'temperature': "Room Temperature",
            'ambient': "Ambient Temperature",
            'climate': "Climate Zone",
            'safetyFactor': "Safety Factor"
        },
        'tr': {
            'title': "❄️ Soğuk Oda Kapasite Hesaplama Sonuçları",
            'capacity': "Gerekli Soğutma Kapasitesi",
            'perM3': "m³ başına kapasite",
            'details': "Hesaplama Detayları",
            'base': "Temel Kapasite (35°C referans)",
            'tempCorr': "Sıcaklık Düzeltmesi",
            'climateCorr': "İklim Bölgesi Düzeltmesi",
            'safety': "Güvenlik Faktörü",
            'total': "TOPLAM KAPASİTE",
            'parameters': "Kullanılan Parametreler",
            'volume': "Oda Hacmi",
            'temperature': "Oda Sıcaklığı",
            'ambient': "Dış Ortam Sıcaklığı",
            'climate': "İklim Bölgesi",
            'safetyFactor': "Güvenlik Faktörü"
        },
        'de': {
            'title': "❄️ Kühlraum-Kapazitätsberechnung Ergebnisse",
            'capacity': "Erforderliche Kühlkapazität",
            'perM3': "Kapazität pro m³",
            'details': "Berechnungsdetails",
            'base': "Grundkapazität (35°C Referenz)",
            'tempCorr': "Temperaturkorrektur",
            'climateCorr': "Klimazone Korrektur",
            'safety': "Sicherheitsfaktor",
            'total': "GESAMTKAPAZITÄT",
            'parameters': "Verwendete Parameter",
            'volume': "Raumvolumen",
            'temperature': "Raumtemperatur",
            'ambient': "Umgebungstemperatur",
            'climate': "Klimazone",
            'safetyFactor': "Sicherheitsfaktor"
        }
    }

    r = responses.get(language, responses['en'])

    response = f"{r['title']}\n\n"
    response += f"🔹 {r['capacity']}: *{result['final_capacity']:,} W*\n"
    response += f"🔹 {r['perM3']}: *{result['capacity_per_m3']} W/m³*\n\n"
    
    response += f"📊 {r['details']}:\n"
    response += f"• {r['base']}: {result['base_capacity']:,} W\n"
    response += f"• {r['tempCorr']}: x{result['temp_correction']}\n"
    response += f"• {r['climateCorr']}: x{result['climate_correction']}\n"
    response += f"• {r['safety']}: x{result['safety_factor']}\n"
    response += f"• {r['total']}: *{result['final_capacity']:,} W*\n\n"
    
    response += f"⚙️ {r['parameters']}:\n"
    response += f"• {r['volume']}: {result['parameters']['volume']} m³\n"
    response += f"• {r['temperature']}: {result['parameters']['temperature']}°C\n"
    response += f"• {r['ambient']}: {result['parameters']['ambient_temp']}°C\n"
    response += f"• {r['climate']}: {'Hot' if result['parameters']['climate_zone'] == 'hot' else 'Cool'}\n"
    response += f"• {r['safetyFactor']}: {int((result['parameters']['safety_factor'] - 1) * 100)}%"

    return response

def is_cold_room_calculation_request(text):
    """
    Check if the message is a cold room calculation request
    Args:
        text (str): User message
    Returns:
        bool: True if it's a cold room calculation request
    """
    lower_text = text.lower()
    
    # Cold room capacity calculation keywords
    cold_room_keywords = [
        'cold room', 'soğuk oda', 'kühlraum',
        'refrigeration', 'dondurucu', 'kältetechnik',
        'cooling capacity', 'soğutma kapasitesi', 'kühlkapazität',
        'calculate capacity', 'kapasite hesapla', 'kapazität berechnen'
    ]
    
    # Check for compound keywords
    compound_patterns = [
        ('capacity', ['calculate', 'hesapla', 'berechnen']),
        ('kapasite', ['hesapla', 'calculate']),
        ('kapazität', ['berechnen', 'calculate'])
    ]
    
    # Check simple keywords
    for keyword in cold_room_keywords:
        if keyword in lower_text:
            return True
    
    # Check compound patterns
    for main_word, action_words in compound_patterns:
        if main_word in lower_text:
            for action_word in action_words:
                if action_word in lower_text:
                    return True
    
    return False

def handle_cold_room_calculation(text, user_id):
    """
    Handle cold room capacity calculation request
    Args:
        text (str): User message
        user_id (str): User ID
    Returns:
        str: Response message
    """
    try:
        # Extract parameters from the message
        extracted_params = extract_parameters(text)
        
        # Determine language from the message
        language = 'en'
        if any(word in text.lower() for word in ['soğuk', 'oda', 'kapasite', 'hesapla', 'sıcaklık']):
            language = 'tr'
        elif any(word in text.lower() for word in ['kühlraum', 'kapazität', 'berechnen', 'temperatur']):
            language = 'de'
        
        # If no parameters extracted, ask for them
        if not extracted_params:
            prompts = {
                'en': """❄️ I can help you calculate cold room capacity! Please provide the following information:

• Room volume (in m³)
• Room temperature (in °C)
• Ambient temperature (in °C)
• Climate zone (hot/cool)
• Safety factor (0%, 10%, 20%, 30%)

Example: "Calculate for 330m³ room at -20°C with 35°C ambient temperature\"""",
                'tr': """❄️ Soğuk oda kapasitesi hesaplamanıza yardımcı olabilirim! Lütfen aşağıdaki bilgileri verin:

• Oda hacmi (m³ cinsinden)
• Oda sıcaklığı (°C cinsinden)
• Dış ortam sıcaklığı (°C cinsinden)
• İklim bölgesi (sıcak/serin)
• Güvenlik faktörü (%0, %10, %20, %30)

Örnek: "330m³ oda için -20°C sıcaklıkta 35°C dış ortam sıcaklığında hesapla\"""",
                'de': """❄️ Ich kann Ihnen bei der Berechnung der Kühlraumkapazität helfen! Bitte geben Sie folgende Informationen an:

• Raumvolumen (in m³)
• Raumtemperatur (in °C)
• Umgebungstemperatur (in °C)
• Klimazone (heiß/kühl)
• Sicherheitsfaktor (0%, 10%, 20%, 30%)

Beispiel: "Berechnen für 330m³ Raum bei -20°C mit 35°C Umgebungstemperatur\""""
            }
            
            return prompts.get(language, prompts['en'])
        
        # Set default values for missing parameters
        params = {
            'volume': extracted_params.get('volume', 330),
            'temperature': extracted_params.get('temperature', -20),
            'ambient_temp': extracted_params.get('ambient_temp', 35),
            'climate_zone': extracted_params.get('climate_zone', 'cool'),
            'safety_factor': extracted_params.get('safety_factor', 1.2)
        }
        
        # Calculate capacity
        result = calculate_capacity(**params)
        
        # Format response
        response = format_result(result, language)
        
        # Add helpful tips
        tips = {
            'en': f"""

💡 *Tips:*
• Supported temperatures: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C
• Ambient temperature range: 25°C to 50°C
• For critical applications, use 30% safety factor
• Hot climate zones require 10% additional capacity""",
            'tr': f"""

💡 *İpuçları:*
• Desteklenen sıcaklıklar: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C
• Dış ortam sıcaklığı aralığı: 25°C ile 50°C arası
• Kritik uygulamalar için %30 güvenlik faktörü kullanın
• Sıcak iklim bölgeleri %10 ek kapasite gerektirir""",
            'de': f"""

💡 *Tipps:*
• Unterstützte Temperaturen: 12°C, 5°C, 0°C, -5°C, -15°C, -18°C, -20°C, -25°C
• Umgebungstemperaturbereich: 25°C bis 50°C
• Für kritische Anwendungen 30% Sicherheitsfaktor verwenden
• Heiße Klimazonen benötigen 10% zusätzliche Kapazität"""
        }
        
        response += tips.get(language, tips['en'])
        
        return response
        
    except Exception as error:
        error_messages = {
            'en': f"❌ Calculation error: {str(error)}\n\nPlease check your parameters and try again.",
            'tr': f"❌ Hesaplama hatası: {str(error)}\n\nLütfen parametrelerinizi kontrol edin ve tekrar deneyin.",
            'de': f"❌ Berechnungsfehler: {str(error)}\n\nBitte überprüfen Sie Ihre Parameter und versuchen Sie es erneut."
        }
        
        # Determine language for error message
        language = 'en'
        if any(word in text.lower() for word in ['soğuk', 'oda', 'kapasite', 'hesapla']):
            language = 'tr'
        elif any(word in text.lower() for word in ['kühlraum', 'kapazität', 'berechnen']):
            language = 'de'
        
        return error_messages.get(language, error_messages['en']) 