import uuid
from datetime import datetime, timedelta, timezone

import pytest
import jwt

from app.core.auth import (
    CurrentUser,
    PermissionChecker,
    create_access_token,
    get_current_user_websocket,
    get_password_hash,
    require_roles,
    verify_password,
)
from app.core.config import settings
from app.models.organization import Organization
from app.models.user import User
from app.schemas.analytics import DashboardMetricsResponse
from app.schemas.campaign import CampaignCreate, CampaignSchedule, CampaignTargeting, CampaignType
from app.schemas.compliance import OptOutCreate
from app.schemas.integration import APIKeyCreate, WebhookCreate
from app.schemas.phone_number import PhoneNumberCreate, PhoneNumberUpdate


def build_current_user(role: str = "admin") -> CurrentUser:
    org = Organization(
        id=uuid.uuid4(),
        name="Test Org",
        slug="test-org",
        brand_name="Test Brand",
    )
    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        username="tester",
        hashed_password="hashed",
        role=role,
        is_active=True,
        organization_id=org.id,
    )
    return CurrentUser(user, org)


def test_password_hashing_and_verification(monkeypatch):
    from passlib.context import CryptContext

    test_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")
    monkeypatch.setattr("app.core.auth.pwd_context", test_context)

    hashed = get_password_hash("secret")
    assert verify_password("secret", hashed) is True
    assert verify_password("wrong", hashed) is False


def test_create_access_token_includes_exp():
    token = create_access_token({"sub": "123"}, expires_delta=timedelta(minutes=5))
    decoded = jwt.decode(
        token,
        settings.JWT_SECRET_KEY,
        algorithms=[settings.JWT_ALGORITHM],
        options={"verify_aud": False},
    )
    assert decoded["sub"] == "123"
    assert "exp" in decoded


def test_permission_checker_and_roles():
    admin_user = build_current_user("admin")
    checker = PermissionChecker(admin_user)
    assert checker.can_manage_users() is True
    assert checker.can_manage_phone_numbers() is True

    viewer_user = build_current_user("viewer")
    checker = PermissionChecker(viewer_user)
    assert checker.can_manage_users() is False
    assert checker.can_create_campaigns() is False

    require_admin = require_roles(["admin"])
    assert require_admin(admin_user).role == "admin"
    with pytest.raises(Exception):
        require_admin(viewer_user)


@pytest.mark.asyncio
async def test_get_current_user_websocket():
    current = await get_current_user_websocket(None)
    assert current.email == "websocket@example.com"


def test_schema_instantiation():
    schedule = CampaignSchedule(start_at=datetime.now(timezone.utc))
    targeting = CampaignTargeting()
    campaign = CampaignCreate(
        name="Campaign",
        description="Desc",
        campaign_type=CampaignType.blast,
        template_ids=["tpl-1"],
        targeting=targeting,
        schedule=schedule,
    )
    assert campaign.template_ids == ["tpl-1"]

    opt_out = OptOutCreate(phoneNumber="+14155550123", source="manual")
    assert opt_out.phone_number == "+14155550123"

    phone_create = PhoneNumberCreate(e164="+14155550123")
    phone_update = PhoneNumberUpdate(status="inactive", mps=2)
    assert phone_create.status == "active"
    assert phone_update.mps == 2

    api_key = APIKeyCreate(name="Key", permissions=["read"])
    webhook = WebhookCreate(url="https://example.com", events=["message.sent"])
    assert api_key.permissions == ["read"]
    assert webhook.url.startswith("https://")

    dashboard = DashboardMetricsResponse(
        total_leads=1,
        active_campaigns=1,
        messages_today=2,
        delivery_rate=0.9,
        reply_rate=0.1,
        opt_out_rate=0.01,
        recent_activity=[],
        campaign_performance=[],
        system_health={"status": "ok"},
    )
    assert dashboard.total_leads == 1
