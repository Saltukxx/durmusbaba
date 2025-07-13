#!/usr/bin/env python3
"""
Test the next step in cold room flow
"""

from cold_room_python_backup import cold_room_flow_python

def test_next_step():
    """Test the next step in the flow"""
    user_id = "491783977612"
    
    print("🧪 Testing next step in cold room flow...")
    
    # Check current state
    has_flow = cold_room_flow_python.has_active_flow(user_id)
    print(f"User has active flow: {has_flow}")
    
    if has_flow:
        flow_data = cold_room_flow_python.active_flows[user_id]
        print(f"Current step: {flow_data['current_step']}")
        print(f"Current answers: {flow_data['answers']}")
        
        # Test the next question (temperature)
        test_input = "-18°C"
        print(f"Testing input: '{test_input}'")
        
        try:
            response = cold_room_flow_python.process_input(user_id, test_input)
            print(f"Response: {response[:300]}...")
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    test_next_step() 