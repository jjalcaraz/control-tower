from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models import Template

router = APIRouter()


@router.get("")
async def list_message_templates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    query = select(Template).offset(skip).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()

    total_result = await db.execute(select(func.count(Template.id)))
    total = total_result.scalar() or 0
    current_page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit if limit else 1

    return {
        "success": True,
        "data": [
            {
                "id": str(template.id),
                "name": template.name,
                "category": template.category,
                "content": template.content,
                "is_active": template.is_active,
            }
            for template in templates
        ],
        "pagination": {
            "page": current_page,
            "pageSize": limit,
            "total": total,
            "totalPages": total_pages,
        },
    }
