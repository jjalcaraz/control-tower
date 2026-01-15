from celery import current_app as celery_app
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from datetime import datetime, timezone
import asyncio
import json
from typing import Dict, Any, Optional

from app.core.database import AsyncSessionLocal
from app.models.webhook import WebhookLog
from app.services.twilio_service import TwilioService
from app.workers.message_tasks import process_inbound_message, update_message_status


@celery_app.task(bind=True)
def process_twilio_webhook(self, webhook_data: Dict[str, Any], headers: Dict[str, str], webhook_url: str) -> Dict[str, Any]:
    """
    Process Twilio webhook callback
    
    Args:
        webhook_data: POST data from Twilio
        headers: HTTP headers from Twilio
        webhook_url: The URL that was called
        
    Returns:
        Processing result
    """
    return asyncio.run(_process_twilio_webhook_async(webhook_data, headers, webhook_url))


async def _process_twilio_webhook_async(webhook_data: Dict[str, Any], headers: Dict[str, str], webhook_url: str) -> Dict[str, Any]:
    """Async implementation of process_twilio_webhook"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Log webhook for debugging and audit
            webhook_log = WebhookLog(
                webhook_type="twilio",
                provider="twilio",
                headers=headers,
                payload=webhook_data,
                processed=False
            )
            db.add(webhook_log)
            await db.commit()
            await db.refresh(webhook_log)
            
            # Validate webhook signature
            twilio_service = TwilioService()
            signature = headers.get('X-Twilio-Signature', '')
            
            if signature:
                is_valid = await twilio_service.validate_webhook_signature(
                    url=webhook_url,
                    params=webhook_data,
                    signature=signature
                )
                
                if not is_valid:
                    webhook_log.error_message = "Invalid webhook signature"
                    await db.commit()
                    return {"status": "error", "error": "Invalid webhook signature"}
            
            # Process based on webhook type
            webhook_type = _determine_webhook_type(webhook_data)
            
            if webhook_type == "message_status":
                result = await _process_message_status_webhook(webhook_data)
            elif webhook_type == "inbound_message":
                result = await _process_inbound_message_webhook(webhook_data)
            else:
                result = {"status": "ignored", "reason": f"Unknown webhook type: {webhook_type}"}
            
            # Mark webhook as processed
            webhook_log.processed = True
            webhook_log.processing_result = result
            await db.commit()
            
            return result
            
        except Exception as e:
            # Mark webhook as failed
            if 'webhook_log' in locals():
                webhook_log.error_message = str(e)
                await db.commit()
            
            return {"status": "error", "error": str(e)}


async def _process_message_status_webhook(webhook_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process message status update webhook"""
    
    message_sid = webhook_data.get('MessageSid')
    message_status = webhook_data.get('MessageStatus')
    error_code = webhook_data.get('ErrorCode')
    error_message = webhook_data.get('ErrorMessage')
    
    if not message_sid or not message_status:
        return {"status": "error", "error": "Missing required fields"}
    
    # Trigger message status update task
    update_message_status.delay(
        message_sid=message_sid,
        status=message_status,
        error_code=error_code,
        error_message=error_message
    )
    
    return {
        "status": "processed",
        "type": "message_status",
        "message_sid": message_sid,
        "new_status": message_status
    }


async def _process_inbound_message_webhook(webhook_data: Dict[str, Any]) -> Dict[str, Any]:
    """Process inbound message webhook"""
    
    from_number = webhook_data.get('From')
    to_number = webhook_data.get('To')
    message_body = webhook_data.get('Body', '')
    
    if not from_number or not to_number:
        return {"status": "error", "error": "Missing required fields"}
    
    # Trigger inbound message processing task
    process_inbound_message.delay(
        phone_number=to_number,
        message_body=message_body,
        from_number=from_number,
        provider_data=webhook_data
    )
    
    return {
        "status": "processed",
        "type": "inbound_message",
        "from": from_number,
        "to": to_number
    }


def _determine_webhook_type(webhook_data: Dict[str, Any]) -> str:
    """Determine the type of Twilio webhook"""
    
    # Message status webhooks have MessageStatus field
    if webhook_data.get('MessageStatus'):
        return "message_status"
    
    # Inbound message webhooks have Body field and direction
    if webhook_data.get('Body') is not None and webhook_data.get('From') and webhook_data.get('To'):
        return "inbound_message"
    
    return "unknown"


@celery_app.task
def process_generic_webhook(webhook_type: str, provider: str, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """
    Process generic webhook from external services
    
    Args:
        webhook_type: Type of webhook (e.g., "status_callback", "delivery_report")
        provider: Provider name (e.g., "twilio", "zapier", "hubspot")
        payload: Webhook payload data
        headers: HTTP headers
        
    Returns:
        Processing result
    """
    return asyncio.run(_process_generic_webhook_async(webhook_type, provider, payload, headers))


async def _process_generic_webhook_async(webhook_type: str, provider: str, payload: Dict[str, Any], headers: Dict[str, str]) -> Dict[str, Any]:
    """Async implementation of process_generic_webhook"""
    
    async with AsyncSessionLocal() as db:
        try:
            # Log webhook
            webhook_log = WebhookLog(
                webhook_type=webhook_type,
                provider=provider,
                headers=headers,
                payload=payload,
                processed=False
            )
            db.add(webhook_log)
            await db.commit()
            await db.refresh(webhook_log)
            
            # Route to appropriate processor based on provider
            if provider == "twilio":
                # Already handled by process_twilio_webhook
                result = {"status": "ignored", "reason": "Use process_twilio_webhook for Twilio webhooks"}
            elif provider == "zapier":
                result = await _process_zapier_webhook(webhook_type, payload)
            elif provider == "hubspot":
                result = await _process_hubspot_webhook(webhook_type, payload)
            elif provider == "salesforce":
                result = await _process_salesforce_webhook(webhook_type, payload)
            else:
                result = {"status": "ignored", "reason": f"Unsupported provider: {provider}"}
            
            # Mark as processed
            webhook_log.processed = True
            webhook_log.processing_result = result
            await db.commit()
            
            return result
            
        except Exception as e:
            if 'webhook_log' in locals():
                webhook_log.error_message = str(e)
                await db.commit()
            
            return {"status": "error", "error": str(e)}


async def _process_zapier_webhook(webhook_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process Zapier webhook (placeholder for future implementation)"""
    
    # This would be implemented based on specific Zapier integration needs
    return {
        "status": "processed",
        "type": "zapier",
        "webhook_type": webhook_type,
        "message": "Zapier webhook processing not yet implemented"
    }


async def _process_hubspot_webhook(webhook_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process HubSpot webhook (placeholder for future implementation)"""
    
    # This would implement HubSpot contact/deal updates
    return {
        "status": "processed",
        "type": "hubspot",
        "webhook_type": webhook_type,
        "message": "HubSpot webhook processing not yet implemented"
    }


async def _process_salesforce_webhook(webhook_type: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    """Process Salesforce webhook (placeholder for future implementation)"""
    
    # This would implement Salesforce lead/opportunity updates
    return {
        "status": "processed",
        "type": "salesforce",
        "webhook_type": webhook_type,
        "message": "Salesforce webhook processing not yet implemented"
    }


@celery_app.task
def cleanup_old_webhook_logs(days_to_keep: int = 30) -> Dict[str, Any]:
    """
    Clean up old webhook logs to prevent database bloat
    
    Args:
        days_to_keep: Number of days of logs to retain
        
    Returns:
        Cleanup summary
    """
    return asyncio.run(_cleanup_old_webhook_logs_async(days_to_keep))


async def _cleanup_old_webhook_logs_async(days_to_keep: int) -> Dict[str, Any]:
    """Async implementation of cleanup_old_webhook_logs"""
    
    async with AsyncSessionLocal() as db:
        try:
            from sqlalchemy import delete
            from datetime import timedelta
            
            cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
            
            # Delete old webhook logs
            delete_stmt = delete(WebhookLog).where(WebhookLog.created_at < cutoff_date)
            result = await db.execute(delete_stmt)
            deleted_count = result.rowcount
            
            await db.commit()
            
            return {
                "status": "completed",
                "deleted_count": deleted_count,
                "cutoff_date": cutoff_date.isoformat()
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}


@celery_app.task(bind=True)
def retry_failed_webhooks(self, max_age_hours: int = 24) -> Dict[str, Any]:
    """
    Retry failed webhook processing
    
    Args:
        max_age_hours: Maximum age of failed webhooks to retry
        
    Returns:
        Retry summary
    """
    return asyncio.run(_retry_failed_webhooks_async(max_age_hours))


async def _retry_failed_webhooks_async(max_age_hours: int) -> Dict[str, Any]:
    """Async implementation of retry_failed_webhooks"""
    
    async with AsyncSessionLocal() as db:
        try:
            from datetime import timedelta
            
            cutoff_time = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
            
            # Find failed webhook logs
            result = await db.execute(
                select(WebhookLog).where(
                    and_(
                        WebhookLog.processed == False,
                        WebhookLog.error_message.is_not(None),
                        WebhookLog.created_at >= cutoff_time
                    )
                ).limit(50)  # Process in batches
            )
            failed_webhooks = result.scalars().all()
            
            retry_count = 0
            
            for webhook_log in failed_webhooks:
                try:
                    # Retry based on provider
                    if webhook_log.provider == "twilio":
                        process_twilio_webhook.delay(
                            webhook_data=webhook_log.payload,
                            headers=webhook_log.headers or {},
                            webhook_url=""  # Not available in retry
                        )
                    else:
                        process_generic_webhook.delay(
                            webhook_type=webhook_log.webhook_type,
                            provider=webhook_log.provider,
                            payload=webhook_log.payload,
                            headers=webhook_log.headers or {}
                        )
                    
                    retry_count += 1
                    
                except Exception as e:
                    # Log retry failure but continue with others
                    webhook_log.error_message = f"Retry failed: {str(e)}"
                    continue
            
            await db.commit()
            
            return {
                "status": "completed",
                "failed_webhooks_found": len(failed_webhooks),
                "retry_count": retry_count
            }
            
        except Exception as e:
            return {"status": "error", "error": str(e)}