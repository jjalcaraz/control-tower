from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List, Dict, Any, Union
import jwt
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.models.organization import Organization

DEFAULT_ORG_ID = uuid.UUID("12345678-1234-5678-9abc-123456789012")
DEFAULT_ORG_NAME = "Default Organization"
DEFAULT_ORG_SLUG = "default-org"
DEFAULT_BRAND_NAME = "Default Brand"

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

security = HTTPBearer()

# Password utilities
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Hash a password for storing in database"""
    return pwd_context.hash(password)

# Token utilities
def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)  # Default 24 hours
    
    to_encode.update({"exp": expire, "iat": datetime.now(timezone.utc)})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt


class CurrentUser:
    """Current authenticated user context"""
    def __init__(self, user: User, organization: Organization):
        self.user = user
        self.organization = organization
        self.id = user.id
        self.org_id = organization.id
        self.email = user.email
        self.role = user.role
        self.is_active = user.is_active


async def _get_or_create_default_org(db: AsyncSession) -> Organization:
    result = await db.execute(
        select(Organization).where(Organization.id == DEFAULT_ORG_ID)
    )
    organization = result.scalar_one_or_none()
    if organization:
        return organization

    organization = Organization(
        id=DEFAULT_ORG_ID,
        name=DEFAULT_ORG_NAME,
        slug=DEFAULT_ORG_SLUG,
        brand_name=DEFAULT_BRAND_NAME
    )
    db.add(organization)
    await db.commit()
    await db.refresh(organization)
    return organization


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db)
) -> CurrentUser:
    """
    Get current authenticated user from Supabase JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        # Decode JWT token (Supabase format)
        payload = jwt.decode(
            credentials.credentials,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_aud": False}  # Supabase tokens may not have standard aud
        )

        # Get user ID from token
        user_id_str: str = payload.get("sub")
        email: str = payload.get("email")

        if user_id_str is None:
            raise credentials_exception

        # Handle both integer and UUID user IDs
        user_id: Union[int, uuid.UUID]
        try:
            # Try parsing as integer first
            user_id = int(user_id_str)
        except ValueError:
            try:
                # Try parsing as UUID
                user_id = uuid.UUID(user_id_str)
            except ValueError:
                raise credentials_exception

    except jwt.PyJWTError:
        raise credentials_exception

    # Get user from database (temporarily without organization requirement)
    result = await db.execute(
        select(User)
        .where(User.id == user_id)
        .where(User.is_active == True)
    )
    user = result.scalar_one_or_none()

    if user is None:
        # Create a lightweight user record for development
        organization = await _get_or_create_default_org(db)
        user = User(
            id=user_id,
            email=email or f"user{user_id}@example.com",
            username=email.split("@")[0] if email else f"user{user_id}",
            hashed_password=get_password_hash("dev-password"),
            role="admin",
            is_active=True,
            organization_id=organization.id
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    organization = await _get_or_create_default_org(db)

    # Update last login
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()

    return CurrentUser(user, organization)


async def get_current_active_user(
    current_user: CurrentUser = Depends(get_current_user)
) -> CurrentUser:
    """Get current active user (additional check)"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user


def require_roles(allowed_roles: List[str]):
    """
    Dependency factory for role-based access control
    
    Usage:
        @app.get("/admin")
        async def admin_only(user: CurrentUser = Depends(require_roles(["admin"]))):
            pass
    """
    def role_checker(current_user: CurrentUser = Depends(get_current_active_user)) -> CurrentUser:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires one of these roles: {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


# Common role dependencies
require_admin = require_roles(["admin"])
require_admin_or_manager = require_roles(["admin", "campaign_manager"])
require_non_viewer = require_roles(["admin", "campaign_manager", "operator"])


class PermissionChecker:
    """Check specific permissions for operations"""
    
    def __init__(self, current_user: CurrentUser):
        self.user = current_user
    
    def can_manage_users(self) -> bool:
        return self.user.role == "admin"
    
    def can_create_campaigns(self) -> bool:
        return self.user.role in ["admin", "campaign_manager"]
    
    def can_manage_templates(self) -> bool:
        return self.user.role in ["admin", "campaign_manager", "operator"]
    
    def can_view_analytics(self) -> bool:
        return self.user.role in ["admin", "campaign_manager"]
    
    def can_manage_phone_numbers(self) -> bool:
        return self.user.role in ["admin"]
    
    def can_export_data(self) -> bool:
        return self.user.role in ["admin", "campaign_manager"]
    
    def can_import_leads(self) -> bool:
        return self.user.role in ["admin", "campaign_manager", "operator"]
    
    def can_send_messages(self) -> bool:
        return self.user.role in ["admin", "campaign_manager", "operator"]


def get_permissions(current_user: CurrentUser = Depends(get_current_active_user)) -> PermissionChecker:
    """Get permission checker for current user"""
    return PermissionChecker(current_user)


async def get_current_user_websocket(websocket) -> Optional[CurrentUser]:
    """Get current user from WebSocket connection (basic implementation)"""
    # Basic dev-friendly auth: allow connections without token.
    class MockOrg:
        id = "default-org"
        name = "Default Organization"
        domain = "localhost"

    user = User(
        id=0,
        email="websocket@example.com",
        username="websocket",
        hashed_password="dev-password",
        role="admin",
        is_active=True,
        organization_id=uuid.uuid4()
    )
    return CurrentUser(user, MockOrg())
