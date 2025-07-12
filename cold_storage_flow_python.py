"""
Cold Storage Flow Handler for Python
Manages the step-by-step questionnaire for cold storage calculations
"""

import json
import re
from cold_room_calculator import calculate_capacity

# Question templates
QUESTIONS = {
    'en': {
        'temperature': "What is the required cold room temperature? (°C)\n\nSupported temperatures: 12, 5, 0, -5, -15, -18, -20, -25°C",
        'products': "What product(s) will be stored inside the room?\n\nExample: Fruits, vegetables, meat, dairy, etc.",
        'length': "What is the inner length of the room? (in meters)\n\nExample: 5.5",
        'width': "What is the inner width of the room? (in meters)\n\nExample: 3.2",
        'height': "What is the inner height of the room? (in meters)\n\nExample: 2.8",
        'insulation': "What is the thickness of insulation panels?\n\nExample: 8 cm, 10 cm, 12 cm",
        'floor_insulation': "Is there floor insulation?\n\nReply: Yes or No",
        'door_frequency': "How often will the door be opened daily?\n\nExample: 10 times, rarely, frequently",
        'loading_amount': "What is the daily loading/unloading amount? (in kg)\n\nExample: 500 kg",
        'entry_temperature': "What is the temperature of products when they enter the room? (°C)\n\nExample: 20°C"
    },
    'tr': {
        'temperature': "Gerekli soğuk oda sıcaklığı nedir? (°C)\n\nDesteklenen sıcaklıklar: 12, 5, 0, -5, -15, -18, -20, -25°C",
        'products': "Oda içerisinde hangi ürün(ler) saklanacak?\n\nÖrnek: Meyve, sebze, et, süt ürünleri, vb.",
        'length': "Odanın iç uzunluğu nedir? (metre cinsinden)\n\nÖrnek: 5.5",
        'width': "Odanın iç genişliği nedir? (metre cinsinden)\n\nÖrnek: 3.2",
        'height': "Odanın iç yüksekliği nedir? (metre cinsinden)\n\nÖrnek: 2.8",
        'insulation': "Yalıtım panellerinin kalınlığı nedir?\n\nÖrnek: 8 cm, 10 cm, 12 cm",
        'floor_insulation': "Zemin yalıtımı var mı?\n\nCevap: Evet veya Hayır",
        'door_frequency': "Kapı günde kaç kez açılacak?\n\nÖrnek: 10 kez, nadir, sık sık",
        'loading_amount': "Günlük yükleme/boşaltma miktarı nedir? (kg cinsinden)\n\nÖrnek: 500 kg",
        'entry_temperature': "Ürünler odaya girdiğinde sıcaklığı nedir? (°C)\n\nÖrnek: 20°C"
    },
    'de': {
        'temperature': "Welche Kühlraumtemperatur ist erforderlich? (°C)\n\nUnterstützte Temperaturen: 12, 5, 0, -5, -15, -18, -20, -25°C",
        'products': "Welche Produkte werden im Raum gelagert?\n\nBeispiel: Obst, Gemüse, Fleisch, Milchprodukte, usw.",
        'length': "Wie lang ist der Raum innen? (in Metern)\n\nBeispiel: 5.5",
        'width': "Wie breit ist der Raum innen? (in Metern)\n\nBeispiel: 3.2",
        'height': "Wie hoch ist der Raum innen? (in Metern)\n\nBeispiel: 2.8",
        'insulation': "Wie dick sind die Isolierpaneele?\n\nBeispiel: 8 cm, 10 cm, 12 cm",
        'floor_insulation': "Gibt es eine Bodenisolierung?\n\nAntwort: Ja oder Nein",
        'door_frequency': "Wie oft wird die Tür täglich geöffnet?\n\nBeispiel: 10 mal, selten, häufig",
        'loading_amount': "Wie viel wird täglich be-/entladen? (in kg)\n\nBeispiel: 500 kg",
        'entry_temperature': "Welche Temperatur haben die Produkte beim Einlagern? (°C)\n\nBeispiel: 20°C"
    }
}

# Progress messages
PROGRESS_MESSAGES = {
    'en': {
        'progress': "Progress: {current}/{total} questions completed",
        'calculation': "🔄 Calculating your cold storage requirements...",
        'complete': "✅ Calculation complete! Here are your results:",
        'restart': "To start a new calculation, send 'cold room' or 'soğuk oda'."
    },
    'tr': {
        'progress': "İlerleme: {current}/{total} soru tamamlandı",
        'calculation': "🔄 Soğuk hava deposu gereksinimleriniz hesaplanıyor...",
        'complete': "✅ Hesaplama tamamlandı! İşte sonuçlarınız:",
        'restart': "Yeni bir hesaplama başlatmak için 'cold room' veya 'soğuk oda' gönderin."
    },
    'de': {
        'progress': "Fortschritt: {current}/{total} Fragen beantwortet",
        'calculation': "🔄 Ihre Kühlraum-Anforderungen werden berechnet...",
        'complete': "✅ Berechnung abgeschlossen! Hier sind Ihre Ergebnisse:",
        'restart': "Für eine neue Berechnung senden Sie 'cold room' oder 'kühlraum'."
    }
}

# Question flow order
QUESTION_ORDER = [
    'temperature',
    'products',
    'length',
    'width',
    'height',
    'insulation',
    'floor_insulation',
    'door_frequency',
    'loading_amount',
    'entry_temperature'
]

# In-memory storage for user sessions (in production, use a database)
USER_SESSIONS = {}

def initialize_cold_storage_flow(user_id, language='en'):
    """
    Initialize cold storage flow for a user
    Args:
        user_id (str): User ID
        language (str): Language code (en/tr/de)
    Returns:
        str: First question
    """
    USER_SESSIONS[user_id] = {
        'active': True,
        'language': language,
        'current_step': 0,
        'answers': {},
        'start_time': None
    }
    
    return ask_current_question(user_id)

def process_answer(user_id, answer):
    """
    Process user answer and move to next question
    Args:
        user_id (str): User ID
        answer (str): User's answer
    Returns:
        str: Next question or calculation result
    """
    if user_id not in USER_SESSIONS:
        return "No active session found. Please start a new calculation."
    
    session = USER_SESSIONS[user_id]
    current_question_key = QUESTION_ORDER[session['current_step']]
    
    # Validate and store answer
    validation_result = validate_answer(current_question_key, answer)
    if validation_result['error']:
        return validation_result['error'] + "\n\n" + QUESTIONS[session['language']][current_question_key]
    
    session['answers'][current_question_key] = validation_result['value']
    session['current_step'] += 1
    
    # Check if all questions are answered
    if session['current_step'] >= len(QUESTION_ORDER):
        return calculate_and_finish(user_id)
    
    return ask_current_question(user_id)

def ask_current_question(user_id):
    """
    Ask the current question
    Args:
        user_id (str): User ID
    Returns:
        str: Current question
    """
    session = USER_SESSIONS[user_id]
    current_question_key = QUESTION_ORDER[session['current_step']]
    question = QUESTIONS[session['language']][current_question_key]
    
    progress = PROGRESS_MESSAGES[session['language']]['progress'].format(
        current=session['current_step'] + 1,
        total=len(QUESTION_ORDER)
    )
    
    return f"{progress}\n\n{question}"

def validate_answer(question_key, answer):
    """
    Validate user answer based on question type
    Args:
        question_key (str): Question identifier
        answer (str): User's answer
    Returns:
        dict: Validation result with 'error' and 'value' keys
    """
    clean_answer = answer.strip()
    
    if question_key == 'temperature':
        try:
            temp = float(re.sub(r'[°C]', '', clean_answer))
            supported_temps = [12, 5, 0, -5, -15, -18, -20, -25]
            if temp not in supported_temps:
                return {'error': "❌ Please enter a valid temperature from the supported list.", 'value': None}
            return {'error': None, 'value': temp}
        except ValueError:
            return {'error': "❌ Please enter a valid temperature from the supported list.", 'value': None}
    
    elif question_key == 'products':
        if len(clean_answer) < 2:
            return {'error': "❌ Please describe the products to be stored.", 'value': None}
        return {'error': None, 'value': clean_answer}
    
    elif question_key in ['length', 'width', 'height']:
        try:
            dimension = float(re.sub(r'[m]', '', clean_answer))
            if dimension <= 0 or dimension > 50:
                return {'error': "❌ Please enter a valid dimension in meters (0.1 - 50).", 'value': None}
            return {'error': None, 'value': dimension}
        except ValueError:
            return {'error': "❌ Please enter a valid dimension in meters (0.1 - 50).", 'value': None}
    
    elif question_key == 'insulation':
        try:
            thickness = float(re.sub(r'[cm]', '', clean_answer))
            if thickness < 5 or thickness > 30:
                return {'error': "❌ Please enter insulation thickness in cm (5-30 cm).", 'value': None}
            return {'error': None, 'value': thickness}
        except ValueError:
            return {'error': "❌ Please enter insulation thickness in cm (5-30 cm).", 'value': None}
    
    elif question_key == 'floor_insulation':
        lower_answer = clean_answer.lower()
        if any(word in lower_answer for word in ['yes', 'evet', 'ja']):
            return {'error': None, 'value': True}
        elif any(word in lower_answer for word in ['no', 'hayır', 'nein']):
            return {'error': None, 'value': False}
        else:
            return {'error': "❌ Please answer 'Yes'/'Evet'/'Ja' or 'No'/'Hayır'/'Nein' for floor insulation.", 'value': None}
    
    elif question_key == 'door_frequency':
        lower_answer = clean_answer.lower()
        if any(word in lower_answer for word in ['rare', 'nadir', 'selten']):
            return {'error': None, 'value': 2}
        elif any(word in lower_answer for word in ['frequent', 'sık', 'häufig']):
            return {'error': None, 'value': 20}
        else:
            try:
                number = int(re.sub(r'[^0-9]', '', clean_answer))
                if 0 <= number <= 100:
                    return {'error': None, 'value': number}
                else:
                    return {'error': "❌ Please enter door opening frequency (number of times per day or 'rarely'/'frequently').", 'value': None}
            except ValueError:
                return {'error': "❌ Please enter door opening frequency (number of times per day or 'rarely'/'frequently').", 'value': None}
    
    elif question_key == 'loading_amount':
        try:
            amount = float(re.sub(r'[kg]', '', clean_answer))
            if amount < 0 or amount > 50000:
                return {'error': "❌ Please enter daily loading amount in kg (0-50000).", 'value': None}
            return {'error': None, 'value': amount}
        except ValueError:
            return {'error': "❌ Please enter daily loading amount in kg (0-50000).", 'value': None}
    
    elif question_key == 'entry_temperature':
        try:
            temp = float(re.sub(r'[°C]', '', clean_answer))
            if temp < -30 or temp > 60:
                return {'error': "❌ Please enter product entry temperature in °C (-30 to 60).", 'value': None}
            return {'error': None, 'value': temp}
        except ValueError:
            return {'error': "❌ Please enter product entry temperature in °C (-30 to 60).", 'value': None}
    
    return {'error': "❌ Invalid question type.", 'value': None}

def calculate_and_finish(user_id):
    """
    Calculate results and finish the flow
    Args:
        user_id (str): User ID
    Returns:
        str: Final calculation result
    """
    session = USER_SESSIONS[user_id]
    answers = session['answers']
    
    try:
        # Calculate room volume
        volume = answers['length'] * answers['width'] * answers['height']
        
        # Estimate ambient temperature based on geographical assumptions
        ambient_temp = 35  # Default assumption for calculations
        
        # Calculate additional loads
        additional_loads = calculate_additional_loads(answers)
        
        # Base calculation parameters
        calc_params = {
            'volume': volume,
            'temperature': answers['temperature'],
            'ambient_temp': ambient_temp,
            'climate_zone': 'cool',  # Default
            'safety_factor': 1.2  # Default safety factor
        }
        
        # Get base calculation
        base_result = calculate_capacity(**calc_params)
        
        # Add additional loads
        final_capacity = base_result['final_capacity'] + additional_loads['total']
        
        # Format comprehensive result
        result = format_cold_storage_result(answers, volume, final_capacity, additional_loads, session['language'])
        
        # Clean up session
        del USER_SESSIONS[user_id]
        
        return PROGRESS_MESSAGES[session['language']]['complete'] + "\n\n" + result + "\n\n" + PROGRESS_MESSAGES[session['language']]['restart']
        
    except Exception as error:
        del USER_SESSIONS[user_id]
        return "❌ Sorry, there was an error calculating your requirements. Please try again."

def calculate_additional_loads(answers):
    """
    Calculate additional loads based on specific parameters
    Args:
        answers (dict): User answers
    Returns:
        dict: Additional loads breakdown
    """
    loads = {
        'infiltration': 0,
        'product': 0,
        'floor': 0,
        'total': 0
    }
    
    volume = answers['length'] * answers['width'] * answers['height']
    
    # Infiltration load (door openings)
    infiltration_factor = min(answers['door_frequency'] * 0.1, 2.0)  # Max 200% increase
    loads['infiltration'] = volume * infiltration_factor * 15  # 15W per m³ per door opening factor
    
    # Product load (cooling from entry temperature to storage temperature)
    temp_diff = answers['entry_temperature'] - answers['temperature']
    product_load = answers['loading_amount'] * temp_diff * 0.5  # Simplified: 0.5W per kg per °C difference
    loads['product'] = max(product_load, 0)
    
    # Floor load (if no insulation)
    if not answers['floor_insulation']:
        loads['floor'] = answers['length'] * answers['width'] * 20  # 20W per m² for uninsulated floor
    
    loads['total'] = loads['infiltration'] + loads['product'] + loads['floor']
    
    return loads

def format_cold_storage_result(answers, volume, final_capacity, additional_loads, language):
    """
    Format the final calculation result
    Args:
        answers (dict): User answers
        volume (float): Room volume
        final_capacity (float): Final cooling capacity
        additional_loads (dict): Additional loads breakdown
        language (str): Language code
    Returns:
        str: Formatted result
    """
    # Language-specific text mappings
    texts = {
        'en': {
            'title': 'Cold Storage Calculation Results',
            'room_specs': 'Room Specifications',
            'dimensions': 'Dimensions',
            'volume': 'Volume',
            'temperature': 'Temperature',
            'products': 'Products',
            'insulation': 'Insulation',
            'floor_insulation': 'Floor Insulation',
            'yes': 'Yes',
            'no': 'No',
            'operational_params': 'Operational Parameters',
            'door_frequency': 'Door Opening Frequency',
            'times_per_day': 'times/day',
            'daily_loading': 'Daily Loading',
            'entry_temp': 'Product Entry Temperature',
            'cooling_capacity': 'Cooling Capacity',
            'base_capacity': 'Base Capacity',
            'infiltration_load': 'Infiltration Load',
            'product_load': 'Product Cooling Load',
            'floor_load': 'Floor Load',
            'total_capacity': 'TOTAL CAPACITY',
            'in_kw': 'In kW'
        },
        'tr': {
            'title': 'Soğuk Hava Deposu Hesaplama Sonuçları',
            'room_specs': 'Oda Özellikleri',
            'dimensions': 'Boyutlar',
            'volume': 'Hacim',
            'temperature': 'Sıcaklık',
            'products': 'Ürün',
            'insulation': 'Yalıtım',
            'floor_insulation': 'Zemin Yalıtımı',
            'yes': 'Var',
            'no': 'Yok',
            'operational_params': 'Çalışma Parametreleri',
            'door_frequency': 'Kapı Açma Sıklığı',
            'times_per_day': 'kez/gün',
            'daily_loading': 'Günlük Yükleme',
            'entry_temp': 'Ürün Giriş Sıcaklığı',
            'cooling_capacity': 'Soğutma Kapasitesi',
            'base_capacity': 'Temel Kapasite',
            'infiltration_load': 'Infiltrasyon Yükü',
            'product_load': 'Ürün Soğutma Yükü',
            'floor_load': 'Zemin Yükü',
            'total_capacity': 'TOPLAM KAPASİTE',
            'in_kw': 'kW Cinsinden'
        },
        'de': {
            'title': 'Kühlraum-Berechnungsergebnisse',
            'room_specs': 'Raum-Spezifikationen',
            'dimensions': 'Abmessungen',
            'volume': 'Volumen',
            'temperature': 'Temperatur',
            'products': 'Produkte',
            'insulation': 'Isolierung',
            'floor_insulation': 'Bodenisolierung',
            'yes': 'Ja',
            'no': 'Nein',
            'operational_params': 'Betriebsparameter',
            'door_frequency': 'Türöffnungsfrequenz',
            'times_per_day': 'mal/Tag',
            'daily_loading': 'Tägliche Beladung',
            'entry_temp': 'Produkteingangstemperatur',
            'cooling_capacity': 'Kühlkapazität',
            'base_capacity': 'Grundkapazität',
            'infiltration_load': 'Infiltrationslast',
            'product_load': 'Produktkühlungslast',
            'floor_load': 'Bodenlast',
            'total_capacity': 'GESAMTKAPAZITÄT',
            'in_kw': 'In kW'
        }
    }
    
    t = texts.get(language, texts['en'])
    
    result = f"❄️ {t['title']}\n\n"
    
    # Room specifications
    result += f"📏 {t['room_specs']}:\n"
    result += f"• {t['dimensions']}: {answers['length']}m × {answers['width']}m × {answers['height']}m\n"
    result += f"• {t['volume']}: {volume:.1f} m³\n"
    result += f"• {t['temperature']}: {answers['temperature']}°C\n"
    result += f"• {t['products']}: {answers['products']}\n"
    result += f"• {t['insulation']}: {answers['insulation']} cm\n"
    result += f"• {t['floor_insulation']}: {t['yes'] if answers['floor_insulation'] else t['no']}\n\n"
    
    # Operational parameters
    result += f"⚙️ {t['operational_params']}:\n"
    result += f"• {t['door_frequency']}: {answers['door_frequency']} {t['times_per_day']}\n"
    result += f"• {t['daily_loading']}: {answers['loading_amount']} kg\n"
    result += f"• {t['entry_temp']}: {answers['entry_temperature']}°C\n\n"
    
    # Capacity calculation
    result += f"🔧 {t['cooling_capacity']}:\n"
    result += f"• {t['base_capacity']}: {round(final_capacity - additional_loads['total']):,} W\n"
    if additional_loads['infiltration'] > 0:
        result += f"• {t['infiltration_load']}: {round(additional_loads['infiltration']):,} W\n"
    if additional_loads['product'] > 0:
        result += f"• {t['product_load']}: {round(additional_loads['product']):,} W\n"
    if additional_loads['floor'] > 0:
        result += f"• {t['floor_load']}: {round(additional_loads['floor']):,} W\n"
    result += f"• *{t['total_capacity']}: {round(final_capacity):,} W*\n"
    result += f"• *{t['in_kw']}: {(final_capacity / 1000):.1f} kW*\n\n"
    
    return result

def has_active_cold_storage_flow(user_id):
    """
    Check if user has an active cold storage flow
    Args:
        user_id (str): User ID
    Returns:
        bool: True if flow is active
    """
    return user_id in USER_SESSIONS and USER_SESSIONS[user_id]['active']

def cancel_cold_storage_flow(user_id):
    """
    Cancel current cold storage flow
    Args:
        user_id (str): User ID
    """
    if user_id in USER_SESSIONS:
        del USER_SESSIONS[user_id]

def detect_language(message):
    """
    Detect language from message
    Args:
        message (str): User message
    Returns:
        str: Language code
    """
    lower_message = message.lower()
    
    # Turkish keywords
    if any(word in lower_message for word in ['soğuk', 'oda', 'sıcaklık', 'hesapla', 'evet', 'hayır', 'iptal', 'dur']):
        return 'tr'
    
    # German keywords
    if any(word in lower_message for word in ['kühlraum', 'temperatur', 'berechnen', 'berechnung', 'kühlung', 'isolierung', 'häufig', 'selten', 'ja', 'nein', 'abbrechen', 'meter', 'produkte', 'fleisch', 'obst', 'gemüse']):
        return 'de'
    
    # Default to English
    return 'en'