from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
import uuid
from datetime import datetime

from app.models.campaign_minimal import Campaign
from app.models.lead import Lead
from app.schemas.campaign import CampaignCreate, CampaignUpdate, CampaignStats, CampaignExecuteResponse


class CampaignService:
    """Service class for campaign operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_campaign(
        self, 
        campaign_data: CampaignCreate, 
        org_id: uuid.UUID, 
        created_by: uuid.UUID
    ) -> Campaign:
        """Create a new campaign"""
        campaign_kwargs = campaign_data.model_dump()
        if hasattr(Campaign, "organization_id"):
            campaign_kwargs["organization_id"] = org_id
        if hasattr(Campaign, "created_by"):
            campaign_kwargs["created_by"] = created_by

        campaign = Campaign(**campaign_kwargs)
        
        self.db.add(campaign)
        await self.db.commit()
        await self.db.refresh(campaign)
        
        return campaign
    
    async def get_campaign_by_id(
        self, 
        campaign_id: uuid.UUID, 
        org_id: uuid.UUID
    ) -> Optional[Campaign]:
        """Get campaign by ID"""
        conditions = [Campaign.id == campaign_id]
        if hasattr(Campaign, "organization_id"):
            conditions.append(Campaign.organization_id == org_id)
        if hasattr(Campaign, "deleted_at"):
            conditions.append(Campaign.deleted_at.is_(None))

        result = await self.db.execute(select(Campaign).where(and_(*conditions)))
        
        return result.scalar_one_or_none()
    
    async def build_campaign_targets(
        self, 
        campaign_id: uuid.UUID, 
        org_id: uuid.UUID
    ) -> List[dict]:
        """Build campaign targets based on campaign criteria"""
        
        # This would implement the logic to select leads based on campaign criteria
        # For now, return empty list
        return []
    
    async def start_campaign(
        self, 
        campaign_id: uuid.UUID, 
        org_id: uuid.UUID
    ) -> bool:
        """Start a campaign"""
        
        campaign = await self.get_campaign_by_id(campaign_id, org_id)
        if not campaign:
            return False
        
        campaign.status = "active"
        if hasattr(campaign, "started_at"):
            campaign.started_at = datetime.utcnow()
        
        await self.db.commit()
        return True
    
    async def pause_campaign(
        self, 
        campaign_id: uuid.UUID, 
        org_id: uuid.UUID
    ) -> bool:
        """Pause a running campaign"""
        
        campaign = await self.get_campaign_by_id(campaign_id, org_id)
        if not campaign:
            return False
        
        campaign.status = "paused"
        if hasattr(campaign, "paused_at"):
            campaign.paused_at = datetime.utcnow()
        
        await self.db.commit()
        return True

    async def resume_campaign(self, campaign_id: uuid.UUID, org_id: uuid.UUID) -> bool:
        """Resume a paused campaign"""
        campaign = await self.get_campaign_by_id(campaign_id, org_id)
        if not campaign:
            return False

        campaign.status = "active"
        await self.db.commit()
        return True

    async def stop_campaign(self, campaign_id: uuid.UUID, org_id: uuid.UUID) -> bool:
        """Stop a campaign"""
        campaign = await self.get_campaign_by_id(campaign_id, org_id)
        if not campaign:
            return False

        campaign.status = "completed"
        await self.db.commit()
        return True

    async def get_campaign_stats(self, campaign_id: uuid.UUID) -> CampaignStats:
        """Get basic campaign stats (stub)."""
        return CampaignStats()

    async def execute_campaign(
        self,
        campaign: Campaign,
        dry_run: bool = False,
        force_send: bool = False,
        user_id: Optional[uuid.UUID] = None
    ) -> CampaignExecuteResponse:
        """Execute campaign (stubbed)."""
        if not dry_run:
            campaign.status = "active"
            await self.db.commit()

        return CampaignExecuteResponse(
            campaign_id=str(campaign.id),
            status=campaign.status,
            targets_generated=0,
            estimated_cost=0.0,
            estimated_messages=0,
            next_send_at=None,
            warnings=[]
        )
