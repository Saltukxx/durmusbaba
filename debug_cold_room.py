#!/usr/bin/env python3
"""
Debug script for cold room flow
"""

from cold_room_python_backup import cold_room_flow_python

def debug_cold_room_flow():
    """Debug the cold room flow"""
    user_id = "491783977612"  # Your WhatsApp number
    
    print("🔍 Debugging Cold Room Flow...")
    
    # Check if user has active flow
    has_flow = cold_room_flow_python.has_active_flow(user_id)
    print(f"User has active flow: {has_flow}")
    
    if has_flow:
        print("Active flows:", cold_room_flow_python.active_flows.keys())
        if user_id in cold_room_flow_python.active_flows:
            flow_data = cold_room_flow_python.active_flows[user_id]
            print(f"Flow data: {flow_data}")
    
    # Test dimension processing
    print("\n🧪 Testing dimension processing...")
    
    # Test "10 6 3"
    test_input = "10 6 3"
    print(f"Testing input: '{test_input}'")
    
    try:
        # Create a test flow
        if not has_flow:
            print("Creating test flow...")
            response = cold_room_flow_python.initialize_flow(user_id, 'en')
            print(f"Initialization response: {response[:200]}...")
        
        # Process the dimension input
        response = cold_room_flow_python.process_input(user_id, test_input)
        print(f"Processing response: {response[:200]}...")
        
        # Check flow state after processing
        has_flow_after = cold_room_flow_python.has_active_flow(user_id)
        print(f"User has active flow after processing: {has_flow_after}")
        
        if has_flow_after:
            flow_data = cold_room_flow_python.active_flows[user_id]
            print(f"Flow data after processing: {flow_data}")
    
    except Exception as e:
        print(f"❌ Error during processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_cold_room_flow() 