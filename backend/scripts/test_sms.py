#!/usr/bin/env python3
"""
Test script for Twilio SMS sending
"""
import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the project root to the path
sys.path.insert(0, '/Users/juanalcaraz/Documents/GitHub/control-tower/backend')

# Load environment variables
load_dotenv('/Users/juanalcaraz/Documents/GitHub/control-tower/backend/.env')

# Import Twilio service
from app.services.twilio_service import TwilioService
from app.core.exceptions import SMSServiceError


async def test_twilio_sms():
    """Test sending SMS via Twilio"""
    print("=" * 60)
    print("Twilio SMS Test")
    print("=" * 60)

    # Check credentials
    account_sid = os.getenv('TWILIO_ACCOUNT_SID')
    auth_token = os.getenv('TWILIO_AUTH_TOKEN')
    from_number = os.getenv('TWILIO_PHONE_NUMBER')

    print(f"\n📱 Twilio Configuration:")
    print(f"  Account SID: {account_sid[:10]}...{account_sid[-4:] if account_sid else 'NOT SET'}")
    print(f"  Auth Token: {'SET' if auth_token else 'NOT SET'}")
    print(f"  From Number: {from_number}")

    if not account_sid or not auth_token or not from_number:
        print("\n❌ ERROR: Twilio credentials not configured!")
        print("   Please set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in .env")
        return False

    # Initialize Twilio service
    print("\n🔧 Initializing Twilio service...")
    twilio_service = TwilioService()

    if not twilio_service.client:
        print("\n❌ ERROR: Failed to initialize Twilio client!")
        return False

    # Test recipient
    to_number = "+12102328914"
    test_message = "This is a test message from SMS Control Tower! Testing Twilio integration. Reply to confirm receipt."

    print(f"\n📨 Sending Test SMS:")
    print(f"  To: {to_number}")
    print(f"  From: {from_number}")
    print(f"  Message: {test_message}")

    try:
        # Send message
        print("\n⏳ Sending...")
        message = await twilio_service.send_message(
            to=to_number,
            body=test_message,
            from_=from_number
        )

        print(f"\n✅ SUCCESS! Message sent!")
        print(f"  Message SID: {message.sid}")
        print(f"  Status: {message.status}")
        print(f"  Direction: {message.direction}")
        print(f"  Date Sent: {message.date_sent}")
        print(f"  Price: {message.price} {message.price_unit if message.price else ''}")

        # Wait a moment and check status
        print("\n⏳ Checking message status in 2 seconds...")
        await asyncio.sleep(2)

        status = await twilio_service.get_message_status(message.sid)
        print(f"\n📊 Current Message Status:")
        print(f"  Status: {status['status']}")
        print(f"  Error Code: {status.get('error_code', 'N/A')}")
        print(f"  Error Message: {status.get('error_message', 'N/A')}")
        print(f"  Segments: {status.get('num_segments', 'N/A')}")

        # Get account info
        print("\n📞 Twilio Account Info:")
        account_info = await twilio_service.get_account_info()
        print(f"  Account SID: {account_info['sid']}")
        print(f"  Friendly Name: {account_info['friendly_name']}")
        print(f"  Status: {account_info['status']}")
        print(f"  Type: {account_info['type']}")

        return True

    except SMSServiceError as e:
        print(f"\n❌ SMS Service Error: {e}")
        return False
    except Exception as e:
        print(f"\n❌ Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(test_twilio_sms())
    print("\n" + "=" * 60)
    if success:
        print("✅ Test completed successfully!")
    else:
        print("❌ Test failed!")
    print("=" * 60)
