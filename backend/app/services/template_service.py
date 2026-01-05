from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_
import uuid
from datetime import datetime

from app.models.template import Template
from app.models.lead import Lead


class TemplateService:
    """Service class for template operations and rotation"""
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def select_template_for_lead(
        self,
        org_id: uuid.UUID,
        lead_id: uuid.UUID,
        category: str = "initial"
    ) -> Optional[Template]:
        """Smart template selection with rotation and usage tracking"""
        
        # Get all active templates for category
        result = await self.db.execute(
            select(Template).where(
                and_(
                    Template.organization_id == org_id,
                    Template.category == category,
                    Template.is_active == True
                )
            )
        )
        templates = result.scalars().all()
        
        if not templates:
            return None
        
        # Simple selection - first available template
        # In a full implementation, this would include rotation logic
        return templates[0]
    
    async def render_template(self, template: Template, lead: Lead) -> str:
        """Render template with variable substitution"""
        
        content = template.content
        
        # Standard variables
        variables = {
            'first_name': lead.first_name or '',
            'last_name': lead.last_name or '',
            'county': getattr(lead, 'county', '') or '',
            'brand': 'SMS Control Tower'  # Configurable
        }
        
        # Replace variables in template
        for var, value in variables.items():
            content = content.replace(f'{{{var}}}', value)
        
        return content
    
    async def get_active_templates(
        self, 
        org_id: uuid.UUID, 
        category: str
    ) -> List[Template]:
        """Get active templates for a category"""
        
        result = await self.db.execute(
            select(Template).where(
                and_(
                    Template.organization_id == org_id,
                    Template.category == category,
                    Template.is_active == True
                )
            )
        )
        
        return list(result.scalars().all())
    
    async def track_template_usage(
        self, 
        template_id: uuid.UUID, 
        lead_id: uuid.UUID
    ):
        """Track template usage for rotation algorithms"""
        
        # Update template usage count
        result = await self.db.execute(
            select(Template).where(Template.id == template_id)
        )
        template = result.scalar_one_or_none()
        
        if template:
            template.usage_count = (template.usage_count or 0) + 1
            template.last_used_at = datetime.utcnow()
            await self.db.commit()
    
    async def get_recent_template_usage(
        self, 
        lead_id: uuid.UUID, 
        days: int = 30
    ) -> List[uuid.UUID]:
        """Get recently used templates for a lead"""
        
        # In a full implementation, this would track usage per lead
        # For now, return empty list
        return []