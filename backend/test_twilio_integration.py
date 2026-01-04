#!/usr/bin/env python3
"""
Test script for Twilio SMS integration
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, '/Users/juanalcaraz/Documents/control-tower/backend')

from app.services.twilio_service import TwilioService
from app.core.config import settings

async def test_twilio_integration():
    """Test Twilio service integration"""
    
    print("=== SMS Control Tower - Twilio Integration Test ===")
    print()
    
    # Initialize Twilio service
    try:
        twilio_service = TwilioService()
        print("✅ Twilio service initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Twilio service: {e}")
        return
    
    # Check configuration
    print(f"📋 Twilio Account SID: {settings.TWILIO_ACCOUNT_SID[:8]}..." if settings.TWILIO_ACCOUNT_SID != 'your_twilio_account_sid' else "❌ Twilio not configured")
    print(f"📋 Auth Token: {'✅ Configured' if settings.TWILIO_AUTH_TOKEN != 'your_twilio_auth_token' else '❌ Not configured'}")
    print(f"📋 Messaging Service: {getattr(settings, 'TWILIO_MESSAGING_SERVICE_SID', 'Not set')}")
    print()
    
    if settings.TWILIO_ACCOUNT_SID == 'your_twilio_account_sid' or settings.TWILIO_AUTH_TOKEN == 'your_twilio_auth_token':
        print("⚠️  Twilio credentials not configured. Using mock mode.")
        print("   To test with real Twilio:")
        print("   1. Update TWILIO_ACCOUNT_SID in .env")
        print("   2. Update TWILIO_AUTH_TOKEN in .env")
        print("   3. Optionally set TWILIO_MESSAGING_SERVICE_SID")
        return
    
    try:
        # Test phone number validation
        print("🔍 Testing phone number validation...")
        test_numbers = ["+15551234567", "555-123-4567", "(555) 123-4567", "invalid"]
        
        for number in test_numbers:
            is_valid = twilio_service.is_phone_number_valid(number)
            status = "✅ Valid" if is_valid else "❌ Invalid"
            print(f"   {number}: {status}")
        
        print()
        
        # Test account info
        print("📊 Getting Twilio account info...")
        try:
            account_info = await twilio_service.get_account_info()
            print(f"   Account Name: {account_info.get('friendly_name', 'N/A')}")
            print(f"   Account Status: {account_info.get('status', 'N/A')}")
            print(f"   Account Type: {account_info.get('type', 'N/A')}")
        except Exception as e:
            print(f"   ❌ Error getting account info: {e}")
        
        print()
        
        # Test phone number count
        print("📱 Getting phone numbers count...")
        try:
            count = await twilio_service.get_phone_numbers_count()
            print(f"   Total phone numbers: {count}")
        except Exception as e:
            print(f"   ❌ Error getting phone numbers count: {e}")
        
        print()
        
        # Test messaging service info
        if hasattr(settings, 'TWILIO_MESSAGING_SERVICE_SID') and settings.TWILIO_MESSAGING_SERVICE_SID:
            print("📨 Getting messaging service info...")
            try:
                service_info = await twilio_service.get_messaging_service_info()
                if service_info:
                    print(f"   Service Name: {service_info.get('friendly_name', 'N/A')}")
                    print(f"   Sticky Sender: {service_info.get('sticky_sender', 'N/A')}")
                    print(f"   Smart Encoding: {service_info.get('smart_encoding', 'N/A')}")
                else:
                    print("   ❌ Messaging service not found")
            except Exception as e:
                print(f"   ❌ Error getting messaging service info: {e}")
            
            print()
        
        # Test usage stats
        print("📈 Getting usage statistics (last 7 days)...")
        try:
            usage = await twilio_service.get_usage_stats(days=7)
            print(f"   SMS Count: {usage.get('sms_count', 0)}")
            print(f"   MMS Count: {usage.get('mms_count', 0)}")
            print(f"   Total Messages: {usage.get('total_messages', 0)}")
            print(f"   Total Cost: ${usage.get('total_cost', 0):.4f}")
        except Exception as e:
            print(f"   ❌ Error getting usage stats: {e}")
        
        print()
        
        # Test search for available numbers
        print("🔍 Searching for available phone numbers...")
        try:
            available = await twilio_service.search_phone_numbers(limit=3)
            if available:
                print(f"   Found {len(available)} available numbers:")
                for number in available[:3]:
                    print(f"   - {number.get('phone_number', 'N/A')} ({number.get('locality', 'N/A')}, {number.get('region', 'N/A')})")
            else:
                print("   No available numbers found")
        except Exception as e:
            print(f"   ❌ Error searching available numbers: {e}")
        
        print()
        print("✅ Twilio integration test completed!")
        
    except Exception as e:
        print(f"❌ Unexpected error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_twilio_integration())