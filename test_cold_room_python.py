#!/usr/bin/env python3
"""
Test script for Python cold room calculator
"""

from cold_room_calculator import (
    calculate_capacity, 
    extract_parameters, 
    is_cold_room_calculation_request,
    handle_cold_room_calculation
)

def test_cold_room_calculator():
    print("🧪 Testing Python Cold Room Calculator\n")
    
    # Test 1: Basic calculation
    print("Test 1: Basic calculation (330m³, -20°C, 35°C ambient)")
    try:
        result = calculate_capacity(
            volume=330,
            temperature=-20,
            ambient_temp=35,
            climate_zone='cool',
            safety_factor=1.2
        )
        print(f"✅ Result: {result['final_capacity']:,} W")
        print(f"   Capacity per m³: {result['capacity_per_m3']} W/m³")
    except Exception as error:
        print(f"❌ Error: {error}")
    
    print("\n" + "="*60 + "\n")
    
    # Test 2: Parameter extraction
    print("Test 2: Parameter extraction from message")
    test_messages = [
        "Calculate cold room capacity for 500m³ at -18°C with 40°C ambient temperature",
        "Soğuk oda kapasitesi hesapla 200m³ oda -5°C sıcaklık 30°C dış ortam",
        "Kühlraum Kapazität berechnen für 150m³ bei 0°C mit 45°C Umgebungstemperatur"
    ]
    
    for i, message in enumerate(test_messages, 1):
        print(f"Message {i}: \"{message}\"")
        params = extract_parameters(message)
        print(f"Extracted params: {params}")
        print()
    
    print("="*60 + "\n")
    
    # Test 3: Intent detection
    print("Test 3: Intent detection")
    cold_room_tests = [
        "Calculate cold room capacity for 330m³ at -20°C",
        "Soğuk oda kapasitesi hesapla 200m³ oda -5°C sıcaklık",
        "Kühlraum Kapazität berechnen für 150m³ bei 0°C",
        "Calculate capacity for 500m³ refrigeration room",
        "Kapasite hesapla 300m³ dondurucu oda",
        "Kapazität berechnen 400m³ Kühlraum"
    ]
    
    product_search_tests = [
        "I want to buy a compressor",
        "Show me products under 500 euros",
        "Looking for Embraco compressors"
    ]
    
    print("Cold room calculation requests:")
    for message in cold_room_tests:
        is_cold_room = is_cold_room_calculation_request(message)
        status = "✅ CORRECT" if is_cold_room else "❌ WRONG"
        print(f"  \"{message}\" -> {status}")
    
    print("\nProduct search requests:")
    for message in product_search_tests:
        is_cold_room = is_cold_room_calculation_request(message)
        status = "✅ CORRECT" if not is_cold_room else "❌ WRONG"
        print(f"  \"{message}\" -> {status}")
    
    print("\n" + "="*60 + "\n")
    
    # Test 4: Full handler
    print("Test 4: Full handler response")
    test_message = "Calculate cold room capacity for 250m³ at -15°C with 38°C ambient temperature"
    try:
        response = handle_cold_room_calculation(test_message, "test_user")
        print("Response:")
        print(response)
    except Exception as error:
        print(f"❌ Error: {error}")
    
    print("\n🧪 Python cold room calculator testing completed!")

if __name__ == "__main__":
    test_cold_room_calculator() 