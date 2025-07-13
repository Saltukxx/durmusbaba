"""
Python backup for cold room flow handling
Used when Node.js modules are not available
"""

import re
import time
from typing import Dict, List, Optional, Tuple

class ColdRoomFlowPython:
    def __init__(self):
        self.active_flows = {}  # user_id -> flow_data
        self.questions = [
            'dimensions',
            'temperature', 
            'ambientTemperature',
            'productType',
            'dailyLoad',
            'entryTemperature',
            'insulationThickness',
            'doorOpenings',
            'coolingTime',
            'safetyFactor',
            'climateZone'
        ]
        
        # Supported temperatures
        self.supported_temperatures = [-25, -20, -18, -15, -5, 0, 5, 12]
        
        # Product types
        self.product_types = {
            'meat': 'meat',
            'et': 'meat',
            'fleisch': 'meat',
            'fish': 'fish',
            'balık': 'fish',
            'fisch': 'fish',
            'dairy': 'dairy',
            'süt': 'dairy',
            'milch': 'dairy',
            'vegetables': 'vegetables',
            'sebze': 'vegetables',
            'gemüse': 'vegetables',
            'fruits': 'fruits',
            'meyve': 'fruits',
            'obst': 'fruits',
            'frozen': 'frozen',
            'donmuş': 'frozen',
            'gefroren': 'frozen',
            'general': 'general',
            'genel': 'general',
            'allgemein': 'general'
        }
        
        # Climate zones
        self.climate_zones = {
            'hot': 'hot',
            'sıcak': 'hot',
            'heiß': 'hot',
            'warm': 'warm',
            'ılık': 'warm',
            'warm': 'warm',
            'temperate': 'temperate',
            'ılıman': 'temperate',
            'gemäßigt': 'temperate',
            'cool': 'cool',
            'serin': 'cool',
            'kühl': 'cool'
        }

    def has_active_flow(self, user_id: str) -> bool:
        """Check if user has active cold room flow"""
        return user_id in self.active_flows

    def initialize_flow(self, user_id: str, language: str = 'en') -> str:
        """Initialize cold room calculation flow"""
        flow_data = {
            'user_id': user_id,
            'language': language,
            'current_step': 0,
            'answers': {},
            'parameters': {},
            'start_time': time.time()
        }
        
        self.active_flows[user_id] = flow_data
        print(f"Started cold room flow for user {user_id} in {language}")
        
        return self.get_welcome_message(language) + '\n\n' + self.get_current_question(flow_data)

    def process_input(self, user_id: str, input_text: str) -> str:
        """Process user input in the cold room flow"""
        if user_id not in self.active_flows:
            return self.initialize_flow(user_id, 'en')
        
        flow_data = self.active_flows[user_id]
        lower_input = input_text.lower().strip()
        
        # Handle navigation commands
        if self.is_navigation_command(lower_input):
            return self.handle_navigation_command(flow_data, lower_input)
        
        # Handle current question
        current_question = self.questions[flow_data['current_step']]
        processed = self.process_answer(flow_data, current_question, input_text)
        
        if not processed:
            return self.get_invalid_answer_message(flow_data) + '\n\n' + self.get_current_question(flow_data)
        
        # Check if we have complete dimensions (special case for dimensions question)
        if current_question == 'dimensions':
            if not self.has_complete_dimensions(flow_data):
                return self.get_follow_up_dimension_question(flow_data)
        
        # Move to next question or complete calculation
        flow_data['current_step'] += 1
        
        if flow_data['current_step'] >= len(self.questions):
            # Complete calculation
            return self.complete_calculation(flow_data)
        else:
            # Show next question
            return self.get_current_question(flow_data)

    def process_answer(self, flow_data: Dict, question: str, answer: str) -> bool:
        """Process answer for a specific question"""
        try:
            if question == 'dimensions':
                return self.process_dimensions(flow_data, answer)
            elif question == 'temperature':
                return self.process_temperature(flow_data, answer)
            elif question == 'ambientTemperature':
                return self.process_ambient_temperature(flow_data, answer)
            elif question == 'productType':
                return self.process_product_type(flow_data, answer)
            elif question == 'dailyLoad':
                return self.process_daily_load(flow_data, answer)
            elif question == 'entryTemperature':
                return self.process_entry_temperature(flow_data, answer)
            elif question == 'insulationThickness':
                return self.process_insulation_thickness(flow_data, answer)
            elif question == 'doorOpenings':
                return self.process_door_openings(flow_data, answer)
            elif question == 'coolingTime':
                return self.process_cooling_time(flow_data, answer)
            elif question == 'safetyFactor':
                return self.process_safety_factor(flow_data, answer)
            elif question == 'climateZone':
                return self.process_climate_zone(flow_data, answer)
            else:
                return False
        except Exception as e:
            print(f"Error processing answer for {question}: {e}")
            return False

    def process_dimensions(self, flow_data: Dict, answer: str) -> bool:
        """Process room dimensions"""
        # Check if we already have partial dimensions and this is a follow-up
        params = flow_data['parameters']
        
        # If we have length and width but no height, expect just height
        if 'length' in params and 'width' in params and 'height' not in params:
            height_match = re.search(r'(\d+(?:\.\d+)?)', answer)
            if height_match:
                height = float(height_match.group(1))
                if 1 <= height <= 10:
                    flow_data['parameters']['height'] = height
                    flow_data['answers']['dimensions'] = f"{params['length']}m × {params['width']}m × {height}m"
                    return True
        
        # If we have length but no width, expect width and height
        elif 'length' in params and 'width' not in params:
            two_dim_pattern = r'(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)'
            two_dim_match = re.search(two_dim_pattern, answer, re.IGNORECASE)
            
            if two_dim_match:
                width = float(two_dim_match.group(1))
                height = float(two_dim_match.group(2))
                
                if 1 <= width <= 50 and 1 <= height <= 10:
                    flow_data['parameters']['width'] = width
                    flow_data['parameters']['height'] = height
                    flow_data['answers']['dimensions'] = f"{params['length']}m × {width}m × {height}m"
                    return True
        
        # Full dimension input (3 dimensions) - check this first for new inputs
        dimension_pattern = r'(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)'
        space_pattern = r'(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)'
        
        match = re.search(dimension_pattern, answer, re.IGNORECASE) or re.search(space_pattern, answer)
        
        if match:
            length = float(match.group(1))
            width = float(match.group(2))
            height = float(match.group(3))
            
            if 1 <= length <= 50 and 1 <= width <= 50 and 1 <= height <= 10:
                flow_data['parameters']['length'] = length
                flow_data['parameters']['width'] = width
                flow_data['parameters']['height'] = height
                flow_data['answers']['dimensions'] = f"{length}m × {width}m × {height}m"
                return True
        
        # Check if user provided only 2 dimensions (missing height) - only for new inputs
        if not params:  # Only if no parameters exist yet
            two_dim_pattern = r'(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)'
            two_dim_match = re.search(two_dim_pattern, answer, re.IGNORECASE)
            
            if two_dim_match:
                length = float(two_dim_match.group(1))
                width = float(two_dim_match.group(2))
                
                if 1 <= length <= 50 and 1 <= width <= 50:
                    # Store partial dimensions and ask for height
                    flow_data['parameters']['length'] = length
                    flow_data['parameters']['width'] = width
                    flow_data['answers']['dimensions'] = f"{length}m × {width}m (height needed)"
                    return True
        
        # Check if user provided only 1 dimension - only for new inputs
        if not params:  # Only if no parameters exist yet
            single_dim_pattern = r'(\d+(?:\.\d+)?)'
            single_dim_match = re.search(single_dim_pattern, answer, re.IGNORECASE)
            
            if single_dim_match:
                length = float(single_dim_match.group(1))
                
                if 1 <= length <= 50:
                    # Store partial dimension and ask for width and height
                    flow_data['parameters']['length'] = length
                    flow_data['answers']['dimensions'] = f"{length}m (width and height needed)"
                    return True
        
        return False

    def process_temperature(self, flow_data: Dict, answer: str) -> bool:
        """Process storage temperature"""
        temp_match = re.search(r'(-?\d+)\s*°?c', answer, re.IGNORECASE)
        if temp_match:
            temp = int(temp_match.group(1))
            if temp in self.supported_temperatures:
                flow_data['parameters']['temperature'] = temp
                flow_data['answers']['temperature'] = f"{temp}°C"
                return True
        return False

    def process_ambient_temperature(self, flow_data: Dict, answer: str) -> bool:
        """Process ambient temperature"""
        temp_match = re.search(r'(\d+)\s*°?c', answer, re.IGNORECASE)
        if temp_match:
            temp = int(temp_match.group(1))
            if 20 <= temp <= 50:
                flow_data['parameters']['ambientTemperature'] = temp
                flow_data['answers']['ambientTemperature'] = f"{temp}°C"
                return True
        return False

    def process_product_type(self, flow_data: Dict, answer: str) -> bool:
        """Process product type"""
        for keyword, product_type in self.product_types.items():
            if keyword in answer.lower():
                flow_data['parameters']['productType'] = product_type
                flow_data['answers']['productType'] = product_type
                return True
        return False

    def process_daily_load(self, flow_data: Dict, answer: str) -> bool:
        """Process daily load"""
        load_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:kg|kilo)', answer, re.IGNORECASE)
        if load_match:
            load = float(load_match.group(1))
            if load >= 0:
                flow_data['parameters']['dailyLoad'] = load
                flow_data['answers']['dailyLoad'] = f"{load} kg/day"
                return True
        
        # Handle "none" or "0"
        if any(word in answer.lower() for word in ['none', '0', 'yok', 'keine']):
            flow_data['parameters']['dailyLoad'] = 0
            flow_data['answers']['dailyLoad'] = 'No daily load'
            return True
        
        return False

    def process_entry_temperature(self, flow_data: Dict, answer: str) -> bool:
        """Process entry temperature"""
        temp_match = re.search(r'(\d+)\s*°?c', answer, re.IGNORECASE)
        if temp_match:
            temp = int(temp_match.group(1))
            if 0 <= temp <= 40:
                flow_data['parameters']['entryTemperature'] = temp
                flow_data['answers']['entryTemperature'] = f"{temp}°C"
                return True
        return False

    def process_insulation_thickness(self, flow_data: Dict, answer: str) -> bool:
        """Process insulation thickness"""
        thickness_match = re.search(r'(\d+)\s*(?:mm|millimeter)', answer, re.IGNORECASE)
        if thickness_match:
            thickness = int(thickness_match.group(1))
            if 50 <= thickness <= 200:
                flow_data['parameters']['insulationThickness'] = thickness
                flow_data['answers']['insulationThickness'] = f"{thickness}mm"
                return True
        return False

    def process_door_openings(self, flow_data: Dict, answer: str) -> bool:
        """Process door openings"""
        openings_match = re.search(r'(\d+)\s*(?:times|kez|mal)', answer, re.IGNORECASE)
        if openings_match:
            openings = int(openings_match.group(1))
            if 0 <= openings <= 100:
                flow_data['parameters']['doorOpenings'] = openings
                flow_data['answers']['doorOpenings'] = f"{openings} times/day"
                return True
        return False

    def process_cooling_time(self, flow_data: Dict, answer: str) -> bool:
        """Process cooling time"""
        time_match = re.search(r'(\d+)\s*(?:hours|saat|stunden)', answer, re.IGNORECASE)
        if time_match:
            time_val = int(time_match.group(1))
            if 1 <= time_val <= 48:
                flow_data['parameters']['coolingTime'] = time_val
                flow_data['answers']['coolingTime'] = f"{time_val} hours"
                return True
        return False

    def process_safety_factor(self, flow_data: Dict, answer: str) -> bool:
        """Process safety factor"""
        factor_match = re.search(r'(\d+)\s*%', answer, re.IGNORECASE)
        if factor_match:
            factor = int(factor_match.group(1))
            if 0 <= factor <= 30:
                flow_data['parameters']['safetyFactor'] = factor
                flow_data['answers']['safetyFactor'] = f"{factor}%"
                return True
        return False

    def process_climate_zone(self, flow_data: Dict, answer: str) -> bool:
        """Process climate zone"""
        for keyword, zone in self.climate_zones.items():
            if keyword in answer.lower():
                flow_data['parameters']['climateZone'] = zone
                flow_data['answers']['climateZone'] = zone
                return True
        return False

    def has_complete_dimensions(self, flow_data: Dict) -> bool:
        """Check if we have complete dimensions (length, width, height)"""
        return all(key in flow_data['parameters'] for key in ['length', 'width', 'height'])

    def get_follow_up_dimension_question(self, flow_data: Dict) -> str:
        """Get follow-up question for missing dimensions"""
        params = flow_data['parameters']
        
        if 'length' in params and 'width' in params and 'height' not in params:
            return f"""✅ Length ({params['length']}m) and Width ({params['width']}m) recorded!

📏 **Missing: Height**

What is the height of your cold room?

Please provide just the height value:
Examples: "3m" or "3" or "3.5"

**Supported range:** 1-10 meters"""
        
        elif 'length' in params and 'width' not in params:
            return f"""✅ Length ({params['length']}m) recorded!

📏 **Missing: Width and Height**

What are the width and height of your cold room?

Please provide in format: **Width × Height**
Examples: "6m × 3m" or "6x3" or "6 3"

**Supported ranges:**
• Width: 1-50 meters
• Height: 1-10 meters"""
        
        else:
            return "❌ Please provide complete dimensions. Format: Length × Width × Height"

    def is_navigation_command(self, input_text: str) -> bool:
        """Check if input is a navigation command"""
        commands = [
            'show', 'göster', 'zeigen',
            'back', 'geri', 'zurück',
            'edit', 'düzenle', 'bearbeiten',
            'restart', 'yeniden', 'neustart',
            'cancel', 'iptal', 'abbrechen'
        ]
        return any(cmd in input_text for cmd in commands)

    def handle_navigation_command(self, flow_data: Dict, input_text: str) -> str:
        """Handle navigation commands"""
        if 'show' in input_text or 'göster' in input_text or 'zeigen' in input_text:
            return self.show_current_answers(flow_data)
        elif 'back' in input_text or 'geri' in input_text or 'zurück' in input_text:
            return self.go_back(flow_data)
        elif 'restart' in input_text or 'yeniden' in input_text or 'neustart' in input_text:
            return self.restart_flow(flow_data)
        else:
            return self.get_current_question(flow_data)

    def show_current_answers(self, flow_data: Dict) -> str:
        """Show current answers"""
        response = "📋 **Your Current Answers:**\n\n"
        
        if not flow_data['answers']:
            response += "No answers recorded yet.\n"
        else:
            question_names = {
                'dimensions': 'Room Dimensions',
                'temperature': 'Storage Temperature',
                'ambientTemperature': 'Ambient Temperature',
                'productType': 'Product Type',
                'dailyLoad': 'Daily Load',
                'entryTemperature': 'Entry Temperature',
                'insulationThickness': 'Insulation Thickness',
                'doorOpenings': 'Door Openings',
                'coolingTime': 'Cooling Time',
                'safetyFactor': 'Safety Factor',
                'climateZone': 'Climate Zone'
            }
            
            for i, (key, value) in enumerate(flow_data['answers'].items(), 1):
                question_name = question_names.get(key, key)
                response += f"{i}. **{question_name}:** {value}\n"
        
        response += "\nType \"back\" to go to previous question\nType \"edit [number]\" to edit an answer"
        return response

    def go_back(self, flow_data: Dict) -> str:
        """Go back to previous question"""
        if flow_data['current_step'] > 0:
            flow_data['current_step'] -= 1
            last_question = self.questions[flow_data['current_step']]
            if last_question in flow_data['answers']:
                del flow_data['answers'][last_question]
            if last_question in flow_data['parameters']:
                del flow_data['parameters'][last_question]
            
            return "Going back to previous question...\n\n" + self.get_current_question(flow_data)
        
        return self.get_current_question(flow_data)

    def restart_flow(self, flow_data: Dict) -> str:
        """Restart the flow"""
        user_id = flow_data['user_id']
        language = flow_data['language']
        
        del self.active_flows[user_id]
        return self.initialize_flow(user_id, language)

    def complete_calculation(self, flow_data: Dict) -> str:
        """Complete calculation and return results"""
        try:
            # Set default values for missing parameters
            defaults = {
                'ambientTemperature': 35,
                'productType': 'general',
                'dailyLoad': 0,
                'entryTemperature': 20,
                'insulationThickness': 100,
                'doorOpenings': 10,
                'coolingTime': 24,
                'safetyFactor': 10,
                'climateZone': 'temperate'
            }
            
            parameters = {**defaults, **flow_data['parameters']}
            
            # Simple calculation (basic version)
            length = parameters.get('length', 0)
            width = parameters.get('width', 0)
            height = parameters.get('height', 0)
            temperature = parameters.get('temperature', 0)
            
            if not all([length, width, height, temperature]):
                return "❌ **Calculation Error:** Missing required parameters. Please restart the calculation."
            
            # Calculate volume
            volume = length * width * height
            
            # Simple capacity estimation (W/m³ based on temperature)
            base_capacity = {
                -25: 80, -20: 70, -18: 65, -15: 60,
                -5: 45, 0: 40, 5: 35, 12: 30
            }
            
            capacity_per_m3 = base_capacity.get(temperature, 40)
            total_capacity = volume * capacity_per_m3
            
            # Apply safety factor
            final_capacity = total_capacity * (1 + parameters['safetyFactor'] / 100)
            
            # End the flow
            del self.active_flows[flow_data['user_id']]
            
            # Format results
            return f"""❄️ **Cold Room Capacity Calculation Results**

📏 **Room Volume:** {volume:.0f} m³
🔧 **Required Cooling Capacity:** {final_capacity/1000:.1f} kW ({final_capacity:.0f} W)

💡 **System Recommendations:**
• Cooling Unit: {final_capacity/1000:.1f} kW capacity
• Evaporator: {final_capacity*0.8/1000:.1f} kW capacity
• Insulation: {parameters['insulationThickness']}mm thickness
• Door: Standard cold room door

🚀 **What's Next?**
• Contact our technical team for detailed system design
• Request detailed quotation
• Schedule site visit

⚠️ This calculation provides an estimate. Professional engineering review is recommended."""
            
        except Exception as e:
            print(f"Error completing calculation: {e}")
            return "❌ An error occurred during calculation. Please try again."

    def get_welcome_message(self, language: str) -> str:
        """Get welcome message"""
        messages = {
            'en': """❄️ **Cold Room Capacity Calculator**

I'll help you calculate the required cooling capacity for your cold room. I need to ask you a few questions to get accurate results.

**Commands you can use:**
• Type "show" to see your current answers
• Type "back" to go to previous question
• Type "edit [number]" to edit a specific answer
• Type "restart" to start over
• Type "cancel" to exit

Let's begin!""",
            'tr': """❄️ **Soğuk Oda Kapasite Hesaplayıcısı**

Soğuk odanız için gerekli soğutma kapasitesini hesaplamanıza yardımcı olacağım. Doğru sonuçlar almak için size birkaç soru sormam gerekiyor.

**Kullanabileceğiniz komutlar:**
• Mevcut cevaplarınızı görmek için "göster" yazın
• Önceki soruya dönmek için "geri" yazın
• Belirli bir cevabı düzenlemek için "düzenle [numara]" yazın
• Yeniden başlamak için "yeniden" yazın
• Çıkmak için "iptal" yazın

Başlayalım!""",
            'de': """❄️ **Kühlraum-Kapazitätsrechner**

Ich helfe Ihnen dabei, die erforderliche Kühlkapazität für Ihren Kühlraum zu berechnen. Ich muss Ihnen einige Fragen stellen, um genaue Ergebnisse zu erhalten.

**Befehle, die Sie verwenden können:**
• Geben Sie "zeigen" ein, um Ihre aktuellen Antworten zu sehen
• Geben Sie "zurück" ein, um zur vorherigen Frage zu gehen
• Geben Sie "bearbeiten [Nummer]" ein, um eine bestimmte Antwort zu bearbeiten
• Geben Sie "neustart" ein, um von vorne zu beginnen
• Geben Sie "abbrechen" ein, um zu beenden

Lassen Sie uns beginnen!"""
        }
        
        return messages.get(language, messages['en'])

    def get_current_question(self, flow_data: Dict) -> str:
        """Get current question"""
        question_index = flow_data['current_step']
        question = self.questions[question_index]
        
        return self.get_question_text(question, flow_data['language'], question_index + 1, len(self.questions))

    def get_question_text(self, question: str, language: str, current: int, total: int) -> str:
        """Get question text"""
        questions = {
            'dimensions': {
                'en': f"""📏 **Question {current}/{total}: Room Dimensions**

What are the dimensions of your cold room?

Please provide in format: **Length × Width × Height**
Examples: "10m × 6m × 3m" or "10x6x3" or "10 6 3"

**Supported ranges:**
• Length: 1-50 meters
• Width: 1-50 meters  
• Height: 1-10 meters""",
                'tr': f"""📏 **Soru {current}/{total}: Oda Boyutları**

Soğuk odanızın boyutları nedir?

Lütfen şu formatta verin: **Uzunluk × Genişlik × Yükseklik**
Örnekler: "10m × 6m × 3m" veya "10x6x3" veya "10 6 3"

**Desteklenen aralıklar:**
• Uzunluk: 1-50 metre
• Genişlik: 1-50 metre
• Yükseklik: 1-10 metre""",
                'de': f"""📏 **Frage {current}/{total}: Raumabmessungen**

Was sind die Abmessungen Ihres Kühlraums?

Bitte geben Sie im Format an: **Länge × Breite × Höhe**
Beispiele: "10m × 6m × 3m" oder "10x6x3" oder "10 6 3"

**Unterstützte Bereiche:**
• Länge: 1-50 Meter
• Breite: 1-50 Meter
• Höhe: 1-10 Meter"""
            }
        }
        
        return questions.get(question, {}).get(language, questions.get(question, {}).get('en', 'Question not found'))

    def get_invalid_answer_message(self, flow_data: Dict) -> str:
        """Get invalid answer message"""
        messages = {
            'en': "❌ I didn't understand that answer. Please try again with the suggested format.",
            'tr': "❌ Bu cevabı anlayamadım. Lütfen önerilen formatta tekrar deneyin.",
            'de': "❌ Ich habe diese Antwort nicht verstanden. Bitte versuchen Sie es erneut mit dem vorgeschlagenen Format."
        }
        
        return messages.get(flow_data['language'], messages['en'])

    def cancel_flow(self, user_id: str) -> str:
        """Cancel active flow"""
        if user_id in self.active_flows:
            del self.active_flows[user_id]
            print(f"Cancelled cold room flow for user {user_id}")
        
        return "✅ Cold room calculation cancelled. How can I help you?"

# Global instance
cold_room_flow_python = ColdRoomFlowPython() 