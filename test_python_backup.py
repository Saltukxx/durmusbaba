#!/usr/bin/env python3
"""
Test script for Python cold room backup
"""

from cold_room_python_backup import cold_room_flow_python

def test_python_backup():
    """Test the Python backup functionality"""
    print("🧪 Testing Python Cold Room Backup...")
    
    # Test initialization
    user_id = "test_user_123"
    response = cold_room_flow_python.initialize_flow(user_id, 'en')
    print("✅ Initialization successful")
    print(f"Response: {response[:100]}...")
    
    # Test processing input
    response = cold_room_flow_python.process_input(user_id, "10x6x3")
    print("✅ Input processing successful")
    print(f"Response: {response[:100]}...")
    
    # Test navigation commands
    response = cold_room_flow_python.process_input(user_id, "show")
    print("✅ Navigation commands work")
    print(f"Response: {response[:100]}...")
    
    print("🎉 Python backup test completed successfully!")

if __name__ == "__main__":
    test_python_backup() 