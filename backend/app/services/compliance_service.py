from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
import uuid
from datetime import datetime
import re

from app.models.suppression import Suppression
from app.models.audit import AuditEvent
from app.models.message import Message


class ComplianceService:
    """Service class for compliance operations and STOP/HELP handling"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    def _normalize_phone_number(self, phone_number: str) -> str:
        if not phone_number:
            return ""
        digits = re.sub(r"\D", "", phone_number)
        if not digits:
            return phone_number
        if len(digits) == 10:
            return f"+1{digits}"
        if len(digits) == 11 and digits.startswith("1"):
            return f"+{digits}"
        if phone_number.startswith("+"):
            return f"+{digits}"
        return f"+{digits}"
    
    async def is_suppressed(self, phone_number: str, org_id: uuid.UUID) -> bool:
        """Check if phone number is suppressed (opted out)"""
        normalized = self._normalize_phone_number(phone_number)
        result = await self.db.execute(
            select(Suppression).where(
                and_(
                    or_(
                        Suppression.phone_number == normalized,
                        Suppression.normalized_phone == normalized,
                        Suppression.phone_number == phone_number
                    ),
                    Suppression.organization_id == org_id,
                    Suppression.is_active == True
                )
            )
        )
        
        return result.scalar_one_or_none() is not None
    
    async def get_active_opt_out(
        self, 
        phone_number: str, 
        org_id: uuid.UUID
    ) -> Optional[Suppression]:
        """Get active opt-out record for phone number"""
        normalized = self._normalize_phone_number(phone_number)
        result = await self.db.execute(
            select(Suppression).where(
                and_(
                    or_(
                        Suppression.phone_number == normalized,
                        Suppression.normalized_phone == normalized,
                        Suppression.phone_number == phone_number
                    ),
                    Suppression.organization_id == org_id,
                    Suppression.is_active == True
                )
            )
        )
        
        return result.scalar_one_or_none()
    
    async def process_stop_keyword(
        self,
        phone_number: str,
        message_content: str,
        org_id: uuid.UUID,
        campaign_id: Optional[uuid.UUID] = None
    ) -> bool:
        """Process STOP/ALTO keywords with immediate suppression"""
        
        stop_keywords = ['stop', 'alto', 'quit', 'cancel', 'end', 'unsubscribe']
        
        message_lower = message_content.lower().strip()
        if any(keyword in message_lower for keyword in stop_keywords):
            # Add to suppression list
            await self.add_to_suppression(phone_number, org_id, source='keyword', campaign_id=campaign_id)
            
            # Log compliance event
            await self.log_audit_event(
                org_id=org_id,
                event_type='opt_out_processed',
                phone_number=phone_number,
                campaign_id=campaign_id,
                details={'keyword': message_content, 'method': 'automatic'}
            )
            
            return True
        
        return False
    
    async def process_help_keyword(
        self,
        phone_number: str,
        message_content: str,
        org_id: uuid.UUID
    ) -> bool:
        """Process HELP/AYUDA keywords"""
        
        help_keywords = ['help', 'ayuda', 'info', 'information']
        
        message_lower = message_content.lower().strip()
        if any(keyword in message_lower for keyword in help_keywords):
            # Log help request
            await self.log_audit_event(
                org_id=org_id,
                event_type='help_requested',
                phone_number=phone_number,
                details={'keyword': message_content, 'method': 'automatic'}
            )
            
            # Would send help response via messaging service
            return True
        
        return False
    
    async def add_to_suppression(
        self,
        phone_number: str,
        org_id: uuid.UUID,
        source: str = 'manual',
        reason: Optional[str] = None,
        campaign_id: Optional[uuid.UUID] = None
    ) -> Suppression:
        """Add phone number to suppression list"""
        
        # Check if already suppressed
        existing = await self.get_active_opt_out(phone_number, org_id)
        if existing:
            return existing

        normalized_phone = self._normalize_phone_number(phone_number)
        suppression_reason = reason or "opt_out"
        
        # Create new opt-out record
        opt_out = Suppression(
            organization_id=org_id,
            phone_number=normalized_phone or phone_number,
            normalized_phone=normalized_phone or phone_number,
            source=source,
            reason=suppression_reason,
            campaign_id=campaign_id
        )
        
        self.db.add(opt_out)
        await self.db.commit()
        await self.db.refresh(opt_out)
        
        return opt_out
    
    async def log_audit_event(
        self,
        org_id: uuid.UUID,
        event_type: str,
        phone_number: Optional[str] = None,
        campaign_id: Optional[uuid.UUID] = None,
        lead_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        details: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        """Log compliance audit event"""
        
        audit_event = AuditEvent(
            org_id=org_id,
            event_type=event_type,
            phone_number=phone_number,
            campaign_id=campaign_id,
            lead_id=lead_id,
            user_id=user_id,
            details=details or {}
        )
        
        self.db.add(audit_event)
        await self.db.commit()
        await self.db.refresh(audit_event)
        
        return audit_event
    
    async def get_dashboard_metrics(self, org_id: uuid.UUID) -> Dict[str, Any]:
        """Get compliance dashboard metrics"""
        
        # Count active opt-outs
        active_opt_outs = await self.db.scalar(
            select(func.count(Suppression.id)).where(
                and_(
                    Suppression.organization_id == org_id,
                    Suppression.is_active == True
                )
            )
        )
        
        return {
            "total_opt_outs": active_opt_outs or 0,
            "opt_out_rate": 0.02,
            "compliance_score": 95.0,
            "violations": [],
            "recent_opt_outs": [],
            "help_requests": 0
        }
    
    async def generate_report(
        self,
        org_id: uuid.UUID,
        report_type: str,
        start_date: datetime,
        end_date: datetime,
        format: str
    ) -> Dict[str, Any]:
        """Generate compliance report"""
        
        return {
            "report_type": report_type,
            "period": {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            },
            "format": format,
            "data": {},
            "generated_at": datetime.utcnow().isoformat()
        }
    
    async def get_violations(
        self,
        org_id: uuid.UUID,
        severity: Optional[str] = None,
        resolved: Optional[bool] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get compliance violations"""
        
        return {
            "violations": [],
            "total_count": 0,
            "by_severity": {
                "critical": 0,
                "high": 0,
                "medium": 0,
                "low": 0
            }
        }
