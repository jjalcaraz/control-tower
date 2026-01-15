import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import SMSServiceError
from app.models import Campaign, Lead, PhoneNumber, Suppression, Template
from app.services.analytics_service import AnalyticsService
from app.services.campaign_service import CampaignService
from app.services.compliance_service import ComplianceService
from app.services.integration_service import IntegrationService
from app.services.phone_service import PhoneService
from app.services.template_service import TemplateService
from app.services.twilio_service import TwilioService
from app.schemas.integration import APIKeyCreate, WebhookCreate, WebhookUpdate


ORG_ID = uuid.UUID("12345678-1234-5678-9abc-123456789012")
USER_ID = uuid.UUID("12345678-1234-5678-9abc-123456789013")


class FakeCampaignCreate:
    def __init__(self, name="Service Campaign", description="Service", campaign_type="blast"):
        self.name = name
        self.description = description
        self.campaign_type = campaign_type

    def model_dump(self):
        return {
            "name": self.name,
            "description": self.description,
            "campaign_type": self.campaign_type,
        }


@pytest_asyncio.fixture
async def service_lead(test_db: AsyncSession) -> Lead:
    lead = Lead(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        first_name="Avery",
        last_name="Hart",
        full_name="Avery Hart",
        phone1="+14155550111",
    )
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)
    yield lead
    await test_db.delete(lead)
    await test_db.commit()


@pytest_asyncio.fixture
async def service_template(test_db: AsyncSession) -> Template:
    template = Template(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        name="Greeting",
        category="initial",
        content="Hi {first_name} from {brand}",
        required_variables=["first_name"],
        optional_variables=[],
        variable_schema={},
        is_active=True,
        usage_count=0,
        created_by=USER_ID,
    )
    test_db.add(template)
    await test_db.commit()
    await test_db.refresh(template)
    yield template
    await test_db.delete(template)
    await test_db.commit()


@pytest.mark.asyncio
async def test_campaign_service_flow(test_db: AsyncSession):
    service = CampaignService(test_db)
    campaign = await service.create_campaign(FakeCampaignCreate(), ORG_ID, USER_ID)
    assert campaign.name == "Service Campaign"

    fetched = await service.get_campaign_by_id(campaign.id, ORG_ID)
    assert fetched is not None

    assert await service.start_campaign(campaign.id, ORG_ID)
    assert campaign.status == "active"

    assert await service.pause_campaign(campaign.id, ORG_ID)
    assert campaign.status == "paused"

    assert await service.resume_campaign(campaign.id, ORG_ID)
    assert campaign.status == "active"

    assert await service.stop_campaign(campaign.id, ORG_ID)
    assert campaign.status == "completed"

    response = await service.execute_campaign(campaign, dry_run=True)
    assert response.status == campaign.status

    response = await service.execute_campaign(campaign, dry_run=False)
    assert response.status == "active"


@pytest.mark.asyncio
async def test_analytics_service_returns_shapes(test_db: AsyncSession):
    service = AnalyticsService(test_db)
    metrics = await service.get_dashboard_metrics(ORG_ID)
    assert metrics["delivery_rate"] == 0.95

    campaign_metrics = await service.get_campaign_analytics(uuid.uuid4(), ORG_ID)
    assert campaign_metrics["campaign_id"]

    roi = await service.get_roi_analytics(ORG_ID, datetime.now(timezone.utc), datetime.now(timezone.utc))
    assert roi["total_cost"] == 0.0

    trend = await service.get_trend_analytics(
        ORG_ID, "messages", "daily", datetime.now(timezone.utc), datetime.now(timezone.utc)
    )
    assert trend["trend"] == "stable"

    funnel = await service.get_conversion_funnel(ORG_ID, datetime.now(timezone.utc), datetime.now(timezone.utc))
    assert funnel["stages"]

    report = await service.generate_custom_report(ORG_ID, {"type": "basic"}, USER_ID)
    assert "report_id" in report

    export_json = await service.export_data(ORG_ID, "messages", "json")
    assert export_json["data"] == []

    export_csv = await service.export_data(ORG_ID, "messages", "csv")
    assert export_csv.startswith("header1")

    export_excel = await service.export_data(ORG_ID, "messages", "xlsx")
    assert isinstance(export_excel, bytes)


@pytest.mark.asyncio
async def test_compliance_service_flow(test_db: AsyncSession):
    service = ComplianceService(test_db)
    normalized = service._normalize_phone_number("(415) 555-0100")
    assert normalized == "+14155550100"

    suppressed = await service.is_suppressed("+14155550100", ORG_ID)
    assert suppressed is False

    opt_out = await service.add_to_suppression("+14155550100", ORG_ID, source="manual")
    assert opt_out.phone_number

    suppressed = await service.is_suppressed("+14155550100", ORG_ID)
    assert suppressed is True

    handled_stop = await service.process_stop_keyword("+14155550101", "STOP", ORG_ID)
    assert handled_stop is True

    handled_help = await service.process_help_keyword("+14155550102", "help", ORG_ID)
    assert handled_help is True

    dashboard = await service.get_dashboard_metrics(ORG_ID)
    assert "total_opt_outs" in dashboard

    report = await service.generate_report(
        ORG_ID, "weekly", datetime.now(timezone.utc), datetime.now(timezone.utc), "json"
    )
    assert report["report_type"] == "weekly"

    violations = await service.get_violations(ORG_ID)
    assert violations["total_count"] == 0


@pytest.mark.asyncio
async def test_integration_service_flow(test_db: AsyncSession):
    service = IntegrationService(test_db)
    status = await service.get_all_integration_status(ORG_ID)
    assert status["twilio"]["status"] == "connected"

    updated = await service.update_integration_config(ORG_ID, "twilio", {"foo": "bar"})
    assert updated is True

    webhook = await service.create_webhook(
        ORG_ID,
        WebhookCreate(url="https://example.com", events=["message.sent"]),
        USER_ID,
    )
    assert webhook["url"] == "https://example.com"

    updated_webhook = await service.update_webhook(
        uuid.uuid4(),
        ORG_ID,
        WebhookUpdate(status="paused"),
    )
    assert updated_webhook["status"] == "updated"

    deleted = await service.delete_webhook(uuid.uuid4(), ORG_ID)
    assert deleted is True

    tested = await service.test_webhook(uuid.uuid4(), ORG_ID, {"foo": "bar"})
    assert tested["success"] is True

    keys = await service.get_api_keys(ORG_ID)
    assert keys["pagination"]["total"] == 0

    api_key = await service.create_api_key(
        ORG_ID,
        APIKeyCreate(name="Test", permissions=["read"]),
        USER_ID,
    )
    assert api_key["status"] == "active"

    revoked = await service.revoke_api_key(uuid.uuid4(), ORG_ID, USER_ID)
    assert revoked is True

    zapier = await service.get_zapier_status(ORG_ID)
    assert zapier["status"] == "not_configured"


@pytest.mark.asyncio
async def test_phone_service_flow(test_db: AsyncSession):
    phone = PhoneNumber(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        phone_number="+14155550111",
        formatted_number="+14155550111",
        display_number="(415) 555-0111",
        status="active",
    )
    test_db.add(phone)
    await test_db.commit()
    await test_db.refresh(phone)

    service = PhoneService(test_db)
    fetched = await service.get_by_number("+14155550111", ORG_ID)
    assert fetched is not None

    metrics = await service.get_health_metrics(phone.id)
    assert metrics["delivery_rate_7d"] == 0.95

    comprehensive = await service.get_comprehensive_health(str(phone.id), 30)
    assert comprehensive["health_score"] == 100

    pool = await service.get_pool_analytics(ORG_ID, datetime.now(timezone.utc), datetime.now(timezone.utc), "day")
    assert pool["total_numbers"] == 0


@pytest.mark.asyncio
async def test_template_service_flow(
    test_db: AsyncSession,
    service_lead: Lead,
    service_template: Template,
):
    service = TemplateService(test_db)
    selected = await service.select_template_for_lead(ORG_ID, service_lead.id)
    assert selected is not None

    rendered = await service.render_template(service_template, service_lead)
    assert service_lead.first_name in rendered

    active = await service.get_active_templates(ORG_ID, "initial")
    assert active

    await service.track_template_usage(service_template.id, service_lead.id)
    await test_db.refresh(service_template)
    assert service_template.usage_count == 1

    recent = await service.get_recent_template_usage(service_lead.id)
    assert recent == []


@pytest.mark.asyncio
async def test_twilio_service_flow(monkeypatch):
    class FakeMessage:
        def __init__(self, sid="SM123"):
            self.sid = sid
            self.status = "sent"
            self.error_code = None
            self.error_message = None
            self.price = "0.01"
            self.price_unit = "USD"
            self.date_sent = datetime.now(timezone.utc)
            self.date_updated = datetime.now(timezone.utc)
            self.num_segments = 1
            self.direction = "outbound"

    class FakeMessageFetcher:
        def __init__(self, sid):
            self.sid = sid

        def fetch(self):
            return FakeMessage(self.sid)

    class FakeMessages:
        def create(self, **params):
            return FakeMessage()

        def __call__(self, sid):
            return FakeMessageFetcher(sid)

    class FakeAccounts:
        def __init__(self, account_sid):
            self.account_sid = account_sid

        def fetch(self):
            class Account:
                sid = self.account_sid
                friendly_name = "Test Account"
                status = "active"
                type = "full"
                date_created = datetime.now(timezone.utc)
                date_updated = datetime.now(timezone.utc)

            return Account()

    class FakeApi:
        def accounts(self, account_sid):
            return FakeAccounts(account_sid)

    class FakeService:
        def __init__(self, sid):
            self.sid = sid
            self.friendly_name = "Service"
            self.inbound_request_url = "https://example.com/inbound"
            self.fallback_url = "https://example.com/fallback"
            self.status_callback = "https://example.com/status"
            self.sticky_sender = True
            self.smart_encoding = True
            self.date_created = datetime.now(timezone.utc)
            self.date_updated = datetime.now(timezone.utc)

        def fetch(self):
            return self

    class FakeMessagingServices:
        def __init__(self, sid):
            self.sid = sid

        def fetch(self):
            return FakeService(self.sid)

    class FakeMessagingV1:
        def services(self, sid):
            return FakeMessagingServices(sid)

    class FakeMessaging:
        v1 = FakeMessagingV1()

    class FakeAvailableNumber:
        def __init__(self):
            self.phone_number = "+14155550123"
            self.friendly_name = "Number"
            self.iso_country = "US"
            self.region = "CA"
            self.postal_code = "94103"
            self.locality = "San Francisco"
            self.rate_center = "SF"
            self.latitude = "37.77"
            self.longitude = "-122.42"
            self.capabilities = {"sms": True, "voice": True, "mms": False, "fax": False}

    class FakeAvailableNumbers:
        def __init__(self):
            self.local = self

        def list(self, **params):
            return [FakeAvailableNumber()]

    class FakePurchasedNumber:
        sid = "PN123"
        phone_number = "+14155550123"
        friendly_name = "Purchased"
        capabilities = {"sms": True}
        date_created = datetime.now(timezone.utc)

    class FakeIncomingNumberFetcher:
        def delete(self):
            return True

    class FakeIncomingNumbers:
        def create(self, **params):
            return FakePurchasedNumber()

        def list(self):
            return [FakePurchasedNumber()]

        def __call__(self, sid):
            return FakeIncomingNumberFetcher()

    class FakeUsageRecord:
        def __init__(self, count, price):
            self.count = count
            self.price = price

    class FakeUsageRecords:
        def list(self, **params):
            return [FakeUsageRecord(2, "0.02")]

    class FakeUsage:
        records = FakeUsageRecords()

    class FakeLookup:
        carrier = {"name": "Carrier", "mobile_country_code": "310", "mobile_network_code": "260"}

    class FakeLookupNumber:
        def fetch(self, type):
            return FakeLookup()

    class FakeLookupsV1:
        def phone_numbers(self, number):
            return FakeLookupNumber()

    class FakeLookups:
        v1 = FakeLookupsV1()

    class FakeClient:
        def __init__(self):
            self.messages = FakeMessages()
            self.api = FakeApi()
            self.messaging = FakeMessaging()
            self.incoming_phone_numbers = FakeIncomingNumbers()
            self.usage = FakeUsage()
            self.lookups = FakeLookups()

        def available_phone_numbers(self, country):
            return FakeAvailableNumbers()

    service = TwilioService()
    service.client = FakeClient()
    service.account_sid = "AC123"
    service.auth_token = "token"
    service.messaging_service_sid = "MG123"

    message = await service.send_message("+14155550123", "Hello")
    assert message.sid == "SM123"

    status = await service.get_message_status("SM123")
    assert status["status"] == "sent"

    account = await service.get_account_info()
    assert account["sid"] == "AC123"

    messaging = await service.get_messaging_service_info()
    assert messaging["sid"] == "MG123"

    numbers = await service.search_phone_numbers(area_code="415")
    assert numbers[0]["phone_number"] == "+14155550123"

    purchased = await service.purchase_phone_number("+14155550123")
    assert purchased["sid"] == "PN123"

    released = await service.release_phone_number("PN123")
    assert released is True

    count = await service.get_phone_numbers_count()
    assert count == 1

    usage = await service.get_usage_stats(days=7)
    assert usage["sms_count"] == 2

    class FakeValidator:
        def __init__(self, token):
            self.token = token

        def validate(self, url, params, signature):
            return True

    import twilio.request_validator

    monkeypatch.setattr(twilio.request_validator, "RequestValidator", FakeValidator)
    assert await service.validate_webhook_signature("https://example.com", {}, "sig") is True

    assert service.is_phone_number_valid("+14155550123") is True

    service.messaging_service_sid = None
    with pytest.raises(SMSServiceError):
        await service.send_message("+14155550123", "Hello", from_=None)
