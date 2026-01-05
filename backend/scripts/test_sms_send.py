#!/usr/bin/env python3
"""
Test script for sending actual SMS messages via Twilio

Twilio Test Numbers:
- +15005550006 - Success test (validates message sending works)
- +15005550007 - Queue timeout test
- +15005550008 - Unknown error test
- +15005550009 - Message rejected test

For production testing with real messages:
Use your own verified phone number as the destination.
"""
import asyncio
import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.twilio_service import TwilioService
from app.core.config import settings


async def test_send_sms():
    """Test sending SMS via Twilio"""

    print("=== SMS Control Tower - Send SMS Test ===")
    print()

    # Initialize Twilio service
    try:
        twilio_service = TwilioService()
        print("✅ Twilio service initialized")
    except Exception as e:
        print(f"❌ Failed to initialize Twilio service: {e}")
        return False

    # Check configuration
    print(f"📋 Twilio Phone Number: {settings.TWILIO_PHONE_NUMBER}")
    print()

    # Use Twilio's test number for testing
    # This number is specifically designed to always succeed in tests
    # Reference: https://www.twilio.com/docs/iam/test-credentials
    test_to_number = "+15005550006"  # Twilio magic number for successful tests

    print(f"🧪 Sending test SMS from {settings.TWILIO_PHONE_NUMBER} to {test_to_number}...")
    print(f"   Note: {test_to_number} is a Twilio test number that simulates success")
    print()

    try:
        message = await twilio_service.send_message(
            to=test_to_number,
            body="Test message from SMS Control Tower - Integration test!",
            from_=settings.TWILIO_PHONE_NUMBER
        )

        print("✅ Test SMS sent successfully!")
        print(f"   Message SID: {message.sid}")
        print(f"   Status: {message.status}")
        print(f"   From: {message.from_}")
        print(f"   To: {message.to}")
        print(f"   Body: {message.body}")
        print(f"   Price: {message.price}")
        print(f"   Price Unit: {message.price_unit}")
        print()

        # Test message status check
        print("📊 Checking message status...")
        status_info = await twilio_service.get_message_status(message.sid)
        print(f"   Status: {status_info['status']}")
        print(f"   Direction: {status_info['direction']}")
        print(f"   Segments: {status_info['num_segments']}")
        if status_info.get('price'):
            print(f"   Price: ${status_info['price']} {status_info['price_unit']}")
        print()

        print("✅ SMS sending test completed successfully!")
        return True

    except Exception as e:
        print(f"❌ Error sending SMS: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_phone_number_validation():
    """Test phone number validation"""

    print("🔍 Testing phone number validation...")
    print()

    twilio_service = TwilioService()

    test_numbers = [
        ("+15551234567", True, "Valid E.164 format"),
        ("+442071234567", True, "Valid UK number"),
        ("555-123-4567", False, "Non-E.164 format"),
        ("invalid", False, "Invalid format"),
        ("+15005550006", True, "Twilio test number"),
    ]

    for number, expected_valid, description in test_numbers:
        is_valid = twilio_service.is_phone_number_valid(number)
        status = "✅ Valid" if is_valid else "❌ Invalid"
        expected = "✅" if expected_valid else "❌"
        match = "✓" if is_valid == expected_valid else "✗ MISMATCH"
        print(f"   {number}: {status} (Expected: {expected}) - {description} {match}")

    print()


async def test_format_phone_number():
    """Test phone number formatting"""

    print("🔧 Testing phone number formatting...")
    print()

    twilio_service = TwilioService()

    test_numbers = [
        ("+15551234567", "Valid E.164"),
        ("555-123-4567", "US format with dashes"),
        ("(555) 123-4567", "US format with parentheses"),
        ("+44 20 7123 4567", "UK format with spaces"),
    ]

    for number, description in test_numbers:
        try:
            formatted = twilio_service._format_phone_number(number)
            print(f"   {number} → {formatted} ({description})")
        except Exception as e:
            print(f"   {number} → Error: {e} ({description})")

    print()


async def test_carrier_lookup():
    """Test carrier lookup (may not be available on all plans)"""

    print("📡 Testing carrier lookup...")
    print()

    twilio_service = TwilioService()

    test_numbers = [
        "+15551234567",
        "+15005550006",  # Twilio test number
    ]

    for number in test_numbers:
        carrier_info = await twilio_service.get_carrier_info(number)
        if carrier_info:
            print(f"   {number}:")
            print(f"      Carrier: {carrier_info.get('carrier_name', 'N/A')}")
            print(f"      Type: {carrier_info.get('type', 'N/A')}")
            print(f"      MCC: {carrier_info.get('mobile_country_code', 'N/A')}")
            print(f"      MNC: {carrier_info.get('mobile_network_code', 'N/A')}")
        else:
            print(f"   {number}: Carrier lookup not available or failed")

    print()


async def main():
    """Run all SMS tests"""

    print("=" * 60)
    print("SMS Control Tower - Twilio SMS Send Test Suite")
    print("=" * 60)
    print()

    # Check if credentials are configured
    if settings.TWILIO_ACCOUNT_SID == 'your_twilio_account_sid':
        print("⚠️  Twilio credentials not configured. Using mock mode.")
        print("   To test with real Twilio:")
        print("   1. Update TWILIO_ACCOUNT_SID in .env")
        print("   2. Update TWILIO_AUTH_TOKEN in .env")
        print()
        return

    # Run tests
    await test_phone_number_validation()
    await test_format_phone_number()

    # Carrier lookup may not be available on all Twilio plans
    await test_carrier_lookup()

    # Main SMS send test
    result = await test_send_sms()

    print()
    print("=" * 60)

    if result:
        print("✅ All SMS tests passed!")
        print()
        print("📝 Note: This test used Twilio's test number (+15005550006)")
        print("   To send a real SMS to your phone, update the test_to_number")
        print("   variable to your verified phone number.")
    else:
        print("❌ SMS test failed!")

    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
