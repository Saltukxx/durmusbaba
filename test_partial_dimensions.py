#!/usr/bin/env python3
"""
Test script for partial dimension handling
"""

from cold_room_python_backup import cold_room_flow_python

def test_partial_dimensions():
    """Test partial dimension handling"""
    print("🧪 Testing Partial Dimension Handling...")
    
    # Test 1: User provides only 2 dimensions (10m x 6m)
    user_id = "test_user_partial"
    response = cold_room_flow_python.initialize_flow(user_id, 'en')
    print("✅ Flow initialized")
    
    # User provides "10m x 6m"
    response = cold_room_flow_python.process_input(user_id, "10m x 6m")
    print("✅ Partial dimensions (10m x 6m) processed")
    print(f"Response: {response[:200]}...")
    
    # User provides height "3m"
    response = cold_room_flow_python.process_input(user_id, "3m")
    print("✅ Height (3m) added")
    print(f"Response: {response[:200]}...")
    
    # Test 2: User provides only 1 dimension first
    user_id2 = "test_user_single"
    response = cold_room_flow_python.initialize_flow(user_id2, 'en')
    print("✅ Second flow initialized")
    
    # User provides "10m"
    response = cold_room_flow_python.process_input(user_id2, "10m")
    print("✅ Single dimension (10m) processed")
    print(f"Response: {response[:200]}...")
    
    # User provides "6m x 3m"
    response = cold_room_flow_python.process_input(user_id2, "6m x 3m")
    print("✅ Remaining dimensions (6m x 3m) added")
    print(f"Response: {response[:200]}...")
    
    print("🎉 Partial dimension handling test completed successfully!")

if __name__ == "__main__":
    test_partial_dimensions() 