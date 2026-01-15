from datetime import timedelta
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.auth import (
    create_access_token,
    get_password_hash,
    verify_password,
    get_current_user,
    CurrentUser,
    DEFAULT_ORG_ID,
    DEFAULT_ORG_NAME,
    DEFAULT_ORG_SLUG,
    DEFAULT_BRAND_NAME,
)
from app.core.database import get_db
from app.models import User, Organization

router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: str | None = None
    role: str | None = "admin"


class RefreshRequest(BaseModel):
    refreshToken: str


def _user_payload(user: User) -> dict:
    return {
        "id": str(user.id),
        "email": user.email,
        "username": user.username,
        "role": user.role,
    }


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


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()

    if user and not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if user is None:
        organization = await _get_or_create_default_org(db)
        username = payload.email.split("@")[0]
        user = User(
            id=uuid.uuid4(),
            email=payload.email,
            username=username,
            hashed_password=get_password_hash(payload.password),
            role="admin",
            is_active=True,
            organization_id=organization.id,
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=60 * 24),
    )
    refresh = create_access_token({"sub": str(user.id)}, expires_delta=timedelta(days=7))

    return {"user": _user_payload(user), "token": token, "refreshToken": refresh}


@router.post("/register")
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    organization = await _get_or_create_default_org(db)
    username = payload.username or payload.email.split("@")[0]
    user = User(
        id=uuid.uuid4(),
        email=payload.email,
        username=username,
        hashed_password=get_password_hash(payload.password),
        role=payload.role or "admin",
        is_active=True,
        organization_id=organization.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token(
        {"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=timedelta(minutes=60 * 24),
    )
    refresh = create_access_token({"sub": str(user.id)}, expires_delta=timedelta(days=7))

    return {"user": _user_payload(user), "token": token, "refreshToken": refresh}


@router.post("/refresh")
async def refresh_token(payload: RefreshRequest, db: AsyncSession = Depends(get_db)):
    token = create_access_token({"sub": payload.refreshToken}, expires_delta=timedelta(days=7))
    return {"token": token}


@router.post("/logout")
async def logout():
    return {"success": True}


@router.get("/me")
async def get_me(current_user: CurrentUser = Depends(get_current_user)):
    return _user_payload(current_user.user)
