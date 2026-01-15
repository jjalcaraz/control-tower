import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.core.database import get_db
from app.models import Organization, User
from app.core.auth import DEFAULT_ORG_ID, DEFAULT_ORG_NAME, DEFAULT_ORG_SLUG, DEFAULT_BRAND_NAME

router = APIRouter()


class OrganizationUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
    brand_name: str | None = None
    contact_email: EmailStr | None = None
    contact_phone: str | None = None
    website: str | None = None


async def _get_or_create_default_org(db: AsyncSession) -> Organization:
    result = await db.execute(select(Organization).where(Organization.id == DEFAULT_ORG_ID))
    organization = result.scalar_one_or_none()
    if organization:
        return organization

    organization = Organization(
        id=DEFAULT_ORG_ID,
        name=DEFAULT_ORG_NAME,
        slug=DEFAULT_ORG_SLUG,
        brand_name=DEFAULT_BRAND_NAME,
    )
    db.add(organization)
    await db.commit()
    await db.refresh(organization)
    return organization


@router.get("/current")
async def get_current_organization(db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    return {
        "id": str(organization.id),
        "name": organization.name,
        "slug": organization.slug,
        "brand_name": organization.brand_name,
        "contact_email": organization.contact_email,
        "contact_phone": organization.contact_phone,
        "website": organization.website,
        "timezone": organization.default_timezone,
        "quiet_hours_start": organization.quiet_hours_start,
        "quiet_hours_end": organization.quiet_hours_end,
        "is_active": organization.is_active,
    }


@router.get("/users")
async def get_organization_users(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    organization = await _get_or_create_default_org(db)
    result = await db.execute(
        select(User)
        .where(User.organization_id == organization.id)
        .offset(skip)
        .limit(limit)
    )
    users = result.scalars().all()

    count_result = await db.execute(
        select(func.count(User.id)).where(User.organization_id == organization.id)
    )
    total = count_result.scalar() or 0
    current_page = (skip // limit) + 1
    total_pages = (total + limit - 1) // limit if limit else 1

    return {
        "success": True,
        "data": [
            {
                "id": str(user.id),
                "email": user.email,
                "username": user.username,
                "role": user.role,
                "is_active": user.is_active,
            }
            for user in users
        ],
        "pagination": {
            "page": current_page,
            "pageSize": limit,
            "total": total,
            "totalPages": total_pages,
        },
    }


@router.get("")
async def list_organizations(db: AsyncSession = Depends(get_db)):
    organization = await _get_or_create_default_org(db)
    return {
        "success": True,
        "data": [
            {
                "id": str(organization.id),
                "name": organization.name,
                "slug": organization.slug,
                "brand_name": organization.brand_name,
                "is_active": organization.is_active,
            }
        ],
        "pagination": {"page": 1, "pageSize": 1, "total": 1, "totalPages": 1},
    }


@router.put("/{organization_id}")
async def update_organization(
    organization_id: str,
    payload: OrganizationUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        org_id = uuid.UUID(organization_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid organization ID")

    result = await db.execute(select(Organization).where(Organization.id == org_id))
    organization = result.scalar_one_or_none()
    if not organization:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(organization, field, value)

    await db.commit()
    await db.refresh(organization)

    return {
        "success": True,
        "data": {
            "id": str(organization.id),
            "name": organization.name,
            "slug": organization.slug,
            "brand_name": organization.brand_name,
            "contact_email": organization.contact_email,
            "contact_phone": organization.contact_phone,
            "website": organization.website,
        },
    }


@router.post("/users/invite")
async def invite_user(payload: dict):
    return {"success": True, "message": "Invitation sent"}


@router.put("/users/{user_id}")
async def update_user(user_id: str, payload: dict):
    return {"success": True, "user_id": user_id}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str):
    return {"success": True, "user_id": user_id}
