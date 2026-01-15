import asyncio
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
import phonenumbers
from twilio.rest import Client
from twilio.base.exceptions import TwilioException

from app.core.config import settings
from app.core.exceptions import SMSServiceError


class TwilioService:
    """
    Twilio SMS service integration for sending messages and managing phone numbers
    """
    
    def __init__(self):
        self.account_sid = settings.TWILIO_ACCOUNT_SID
        self.auth_token = settings.TWILIO_AUTH_TOKEN
        self.messaging_service_sid = getattr(settings, 'TWILIO_MESSAGING_SERVICE_SID', None)
        
        if not self.account_sid or not self.auth_token:
            # Allow service to initialize in dev without credentials.
            self.client = None
            return

        self.client = Client(self.account_sid, self.auth_token)
    
    async def send_message(
        self,
        to: str,
        body: str,
        from_: Optional[str] = None,
        media_urls: Optional[List[str]] = None
    ) -> Any:
        """
        Send SMS message via Twilio
        
        Args:
            to: Destination phone number in E.164 format
            body: Message content
            from_: Source phone number (optional if using messaging service)
            media_urls: List of media URLs for MMS (optional)
            
        Returns:
            Twilio message object
            
        Raises:
            SMSServiceError: If message sending fails
        """
        try:
            # Validate and format phone numbers
            to_number = self._format_phone_number(to)
            
            message_params = {
                'to': to_number,
                'body': body
            }
            
            # Use messaging service if available, otherwise use from number
            if self.messaging_service_sid:
                message_params['messaging_service_sid'] = self.messaging_service_sid
            elif from_:
                message_params['from_'] = self._format_phone_number(from_)
            else:
                raise SMSServiceError("Either messaging_service_sid or from_ number must be provided")
            
            # Add media URLs for MMS
            if media_urls:
                message_params['media_url'] = media_urls
            
            # Send message in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            message = await loop.run_in_executor(
                None,
                lambda: self.client.messages.create(**message_params)
            )
            
            return message
            
        except TwilioException as e:
            raise SMSServiceError(f"Twilio error: {e.msg}") from e
        except Exception as e:
            raise SMSServiceError(f"Failed to send SMS: {str(e)}") from e
    
    async def get_message_status(self, message_sid: str) -> Dict[str, Any]:
        """
        Get message status from Twilio
        
        Args:
            message_sid: Twilio message SID
            
        Returns:
            Dictionary with message status information
        """
        try:
            loop = asyncio.get_event_loop()
            message = await loop.run_in_executor(
                None,
                lambda: self.client.messages(message_sid).fetch()
            )
            
            return {
                'sid': message.sid,
                'status': message.status,
                'error_code': message.error_code,
                'error_message': message.error_message,
                'price': message.price,
                'price_unit': message.price_unit,
                'date_sent': message.date_sent,
                'date_updated': message.date_updated,
                'num_segments': message.num_segments,
                'direction': message.direction
            }
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to get message status: {e.msg}") from e
    
    async def get_account_info(self) -> Dict[str, Any]:
        """
        Get Twilio account information
        
        Returns:
            Dictionary with account details
        """
        try:
            loop = asyncio.get_event_loop()
            account = await loop.run_in_executor(
                None,
                lambda: self.client.api.accounts(self.account_sid).fetch()
            )
            
            return {
                'sid': account.sid,
                'friendly_name': account.friendly_name,
                'status': account.status,
                'type': account.type,
                'date_created': account.date_created,
                'date_updated': account.date_updated
            }
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to get account info: {e.msg}") from e
    
    async def get_messaging_service_info(self) -> Optional[Dict[str, Any]]:
        """
        Get messaging service information
        
        Returns:
            Dictionary with messaging service details or None if not configured
        """
        if not self.messaging_service_sid:
            return None
        
        try:
            loop = asyncio.get_event_loop()
            service = await loop.run_in_executor(
                None,
                lambda: self.client.messaging.v1.services(self.messaging_service_sid).fetch()
            )
            
            return {
                'sid': service.sid,
                'friendly_name': service.friendly_name,
                'inbound_request_url': service.inbound_request_url,
                'fallback_url': service.fallback_url,
                'status_callback': service.status_callback,
                'sticky_sender': service.sticky_sender,
                'smart_encoding': service.smart_encoding,
                'date_created': service.date_created,
                'date_updated': service.date_updated
            }
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to get messaging service info: {e.msg}") from e
    
    async def search_phone_numbers(
        self,
        area_code: Optional[str] = None,
        country: str = "US",
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for available phone numbers
        
        Args:
            area_code: Specific area code to search
            country: Country code (default: US)
            limit: Maximum number of results
            
        Returns:
            List of available phone number details
        """
        try:
            loop = asyncio.get_event_loop()
            
            search_params = {
                'limit': limit
            }
            
            if area_code:
                search_params['area_code'] = area_code
            
            available_numbers = await loop.run_in_executor(
                None,
                lambda: list(
                    self.client.available_phone_numbers(country)
                    .local
                    .list(**search_params)
                )
            )
            
            return [
                {
                    'phone_number': number.phone_number,
                    'friendly_name': number.friendly_name,
                    'iso_country': number.iso_country,
                    'region': number.region,
                    'postal_code': number.postal_code,
                    'locality': number.locality,
                    'rate_center': number.rate_center,
                    'latitude': number.latitude,
                    'longitude': number.longitude,
                    'capabilities': {
                        'voice': number.capabilities.get('voice', False),
                        'sms': number.capabilities.get('sms', False),
                        'mms': number.capabilities.get('mms', False),
                        'fax': number.capabilities.get('fax', False)
                    }
                }
                for number in available_numbers
            ]
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to search phone numbers: {e.msg}") from e
    
    async def purchase_phone_number(self, phone_number: str) -> Dict[str, Any]:
        """
        Purchase a phone number
        
        Args:
            phone_number: Phone number to purchase in E.164 format
            
        Returns:
            Dictionary with purchased phone number details
        """
        try:
            loop = asyncio.get_event_loop()
            
            purchase_params = {
                'phone_number': phone_number
            }
            
            # Add messaging service if configured
            if self.messaging_service_sid:
                purchase_params['sms_application_sid'] = self.messaging_service_sid
            
            purchased = await loop.run_in_executor(
                None,
                lambda: self.client.incoming_phone_numbers.create(**purchase_params)
            )
            
            return {
                'sid': purchased.sid,
                'phone_number': purchased.phone_number,
                'friendly_name': purchased.friendly_name,
                'capabilities': purchased.capabilities,
                'status': 'purchased',
                'date_created': purchased.date_created
            }
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to purchase phone number: {e.msg}") from e
    
    async def release_phone_number(self, phone_number_sid: str) -> bool:
        """
        Release a phone number
        
        Args:
            phone_number_sid: Twilio phone number SID
            
        Returns:
            True if successful
        """
        try:
            loop = asyncio.get_event_loop()
            
            await loop.run_in_executor(
                None,
                lambda: self.client.incoming_phone_numbers(phone_number_sid).delete()
            )
            
            return True
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to release phone number: {e.msg}") from e
    
    async def get_phone_numbers_count(self) -> int:
        """
        Get count of owned phone numbers
        
        Returns:
            Number of owned phone numbers
        """
        try:
            loop = asyncio.get_event_loop()
            
            numbers = await loop.run_in_executor(
                None,
                lambda: list(self.client.incoming_phone_numbers.list())
            )
            
            return len(numbers)
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to get phone numbers count: {e.msg}") from e
    
    async def get_usage_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get usage statistics for the past N days
        
        Args:
            days: Number of days to include in stats
            
        Returns:
            Dictionary with usage statistics
        """
        try:
            end_date = datetime.now(timezone.utc).date()
            start_date = end_date - timedelta(days=days)
            
            loop = asyncio.get_event_loop()
            
            # Get SMS usage
            sms_usage = await loop.run_in_executor(
                None,
                lambda: list(
                    self.client.usage.records.list(
                        category='sms',
                        start_date=start_date,
                        end_date=end_date
                    )
                )
            )
            
            # Get MMS usage
            mms_usage = await loop.run_in_executor(
                None,
                lambda: list(
                    self.client.usage.records.list(
                        category='mms',
                        start_date=start_date,
                        end_date=end_date
                    )
                )
            )
            
            total_sms = sum(int(record.count) for record in sms_usage)
            total_mms = sum(int(record.count) for record in mms_usage)
            total_cost = sum(float(record.price) for record in sms_usage + mms_usage)
            
            return {
                'period_days': days,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'sms_count': total_sms,
                'mms_count': total_mms,
                'total_messages': total_sms + total_mms,
                'total_cost': total_cost,
                'currency': 'USD'  # Twilio typically uses USD
            }
            
        except TwilioException as e:
            raise SMSServiceError(f"Failed to get usage stats: {e.msg}") from e
    
    async def validate_webhook_signature(
        self,
        url: str,
        params: Dict[str, Any],
        signature: str
    ) -> bool:
        """
        Validate Twilio webhook signature
        
        Args:
            url: The full URL that Twilio called
            params: POST parameters from Twilio
            signature: X-Twilio-Signature header value
            
        Returns:
            True if signature is valid
        """
        try:
            from twilio.request_validator import RequestValidator
            
            validator = RequestValidator(self.auth_token)
            return validator.validate(url, params, signature)
            
        except Exception as e:
            raise SMSServiceError(f"Failed to validate webhook signature: {str(e)}") from e
    
    def _format_phone_number(self, phone_number: str) -> str:
        """
        Format phone number to E.164 format
        
        Args:
            phone_number: Raw phone number
            
        Returns:
            E.164 formatted phone number
            
        Raises:
            SMSServiceError: If phone number is invalid
        """
        try:
            # Parse phone number
            parsed = phonenumbers.parse(phone_number, None)
            
            # Validate phone number
            if not phonenumbers.is_valid_number(parsed):
                raise SMSServiceError(f"Invalid phone number: {phone_number}")
            
            # Format to E.164
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
            
        except phonenumbers.NumberParseException as e:
            raise SMSServiceError(f"Failed to parse phone number {phone_number}: {str(e)}") from e
    
    def is_phone_number_valid(self, phone_number: str) -> bool:
        """
        Check if phone number is valid
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            True if valid
        """
        try:
            parsed = phonenumbers.parse(phone_number, None)
            return phonenumbers.is_valid_number(parsed)
        except:
            return False
    
    async def get_carrier_info(self, phone_number: str) -> Optional[Dict[str, Any]]:
        """
        Get carrier information for a phone number (requires Twilio Lookup)
        
        Args:
            phone_number: Phone number to lookup
            
        Returns:
            Dictionary with carrier information or None if not available
        """
        try:
            formatted_number = self._format_phone_number(phone_number)
            
            loop = asyncio.get_event_loop()
            
            lookup = await loop.run_in_executor(
                None,
                lambda: self.client.lookups.v1.phone_numbers(formatted_number)
                .fetch(type=['carrier'])
            )
            
            carrier_info = lookup.carrier or {}
            
            return {
                'carrier_name': carrier_info.get('name'),
                'mobile_country_code': carrier_info.get('mobile_country_code'),
                'mobile_network_code': carrier_info.get('mobile_network_code'),
                'error_code': carrier_info.get('error_code'),
                'type': carrier_info.get('type')  # mobile, landline, voip
            }
            
        except TwilioException:
            # Lookup service might not be enabled or number might be invalid
            return None
        except Exception:
            return None
