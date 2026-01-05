# Templates API Routes
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
import uuid

from app.core.database import get_db
from app.models import Template

router = APIRouter()


class TemplateCreate(BaseModel):
    name: str
    category: str
    content: str


class TemplateResponse(BaseModel):
    id: str
    name: str
    category: str
    content: str
    required_variables: List[str]
    is_active: bool
    usage_count: int
    created_at: datetime
    updated_at: Optional[datetime]


@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    category: Optional[str] = None,
    is_active: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db)
):
    """List all templates with filtering"""
    from sqlalchemy import select

    query = select(Template)

    if category:
        query = query.where(Template.category == category)
    if is_active is not None:
        query = query.where(Template.is_active == is_active)

    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    templates = result.scalars().all()

    return [
        TemplateResponse(
            id=str(t.id),
            name=t.name,
            category=t.category,
            content=t.content,
            required_variables=t.required_variables or [],
            is_active=t.is_active,
            usage_count=t.usage_count,
            created_at=t.created_at,
            updated_at=t.updated_at
        )
        for t in templates
    ]


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, db: AsyncSession = Depends(get_db)):
    """Get a specific template"""
    from sqlalchemy import select

    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        category=template.category,
        content=template.content,
        required_variables=template.required_variables or [],
        is_active=template.is_active,
        usage_count=template.usage_count,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_template(template_data: TemplateCreate, db: AsyncSession = Depends(get_db)):
    """Create a new template"""
    # Use default organization and user from seed data (TODO: get from auth context)
    default_org_id = uuid.UUID("12345678-1234-5678-9abc-123456789012")
    default_user_id = uuid.UUID("12345678-1234-5678-9abc-123456789013")

    new_template = Template(
        id=uuid.uuid4(),
        organization_id=default_org_id,
        name=template_data.name,
        category=template_data.category,
        content=template_data.content,
        required_variables=[],
        optional_variables=[],
        variable_schema={},
        is_active=True,
        usage_count=0,
        created_by=default_user_id
    )

    db.add(new_template)
    await db.commit()
    await db.refresh(new_template)

    return TemplateResponse(
        id=str(new_template.id),
        name=new_template.name,
        category=new_template.category,
        content=new_template.content,
        required_variables=new_template.required_variables or [],
        is_active=new_template.is_active,
        usage_count=new_template.usage_count,
        created_at=new_template.created_at,
        updated_at=new_template.updated_at
    )


@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateCreate,
    db: AsyncSession = Depends(get_db)
):
    """Update a template"""
    from sqlalchemy import select

    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    template.name = template_data.name
    template.category = template_data.category
    template.content = template_data.content

    await db.commit()
    await db.refresh(template)

    return TemplateResponse(
        id=str(template.id),
        name=template.name,
        category=template.category,
        content=template.content,
        required_variables=template.required_variables or [],
        is_active=template.is_active,
        usage_count=template.usage_count,
        created_at=template.created_at,
        updated_at=template.updated_at
    )


@router.delete("/{template_id}", status_code=204)
async def delete_template(template_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a template"""
    from sqlalchemy import select

    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    await db.delete(template)
    await db.commit()

    return None


@router.post("/{template_id}/test")
async def test_template(
    template_id: str,
    variables: dict,
    db: AsyncSession = Depends(get_db)
):
    """Test template with variable substitution"""
    from sqlalchemy import select

    result = await db.execute(
        select(Template).where(Template.id == template_id)
    )
    template = result.scalar_one_or_none()

    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    # Simple variable substitution
    rendered = template.content
    for key, value in variables.items():
        rendered = rendered.replace(f"{{{key}}}", str(value))

    return {
        "template_id": template_id,
        "rendered": rendered
    }
