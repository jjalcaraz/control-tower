import uuid
from datetime import date

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditEvent, Campaign, Lead, Message, PhoneNumber, Suppression, Template
from app.models.message_status import MessageStatusEvent


ORG_ID = uuid.UUID("12345678-1234-5678-9abc-123456789012")
USER_ID = uuid.UUID("12345678-1234-5678-9abc-123456789013")


def extract_items(payload):
    if isinstance(payload, dict):
        for key in ("data", "items", "results"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return []
    return payload if isinstance(payload, list) else []


@pytest_asyncio.fixture
async def campaign(test_db: AsyncSession) -> Campaign:
    campaign = Campaign(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        created_by=USER_ID,
        name="Spring Blast",
        description="Seasonal campaign",
        campaign_type="blast",
        status="draft",
    )
    test_db.add(campaign)
    await test_db.commit()
    await test_db.refresh(campaign)

    yield campaign

    await test_db.delete(campaign)
    await test_db.commit()


@pytest_asyncio.fixture
async def template(test_db: AsyncSession) -> Template:
    template = Template(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        name="Initial Outreach",
        category="initial",
        content="Hi {first_name}",
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


@pytest_asyncio.fixture
async def phone_number(test_db: AsyncSession) -> PhoneNumber:
    number = PhoneNumber(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        phone_number="+15125550100",
        formatted_number="+15125550100",
        display_number="(512) 555-0100",
        status="active",
        health_score=99,
        sms_enabled=True,
        delivery_rate=0.98,
    )
    test_db.add(number)
    await test_db.commit()
    await test_db.refresh(number)

    yield number

    await test_db.delete(number)
    await test_db.commit()


@pytest_asyncio.fixture
async def lead(test_db: AsyncSession) -> Lead:
    lead = Lead(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        first_name="Maya",
        last_name="Lopez",
        full_name="Maya Lopez",
        phone1="+15125550123",
        email="maya@example.com",
    )
    test_db.add(lead)
    await test_db.commit()
    await test_db.refresh(lead)

    yield lead

    await test_db.delete(lead)
    await test_db.commit()


@pytest_asyncio.fixture
async def message_with_twilio(test_db: AsyncSession, lead: Lead) -> Message:
    message = Message(
        id=uuid.uuid4(),
        organization_id=ORG_ID,
        lead_id=lead.id,
        direction="outbound",
        from_phone="+15125550100",
        to_phone=lead.phone1,
        content="Hello",
        status="queued",
        twilio_message_sid="SM1234567890",
    )
    test_db.add(message)
    await test_db.commit()
    await test_db.refresh(message)

    yield message

    await test_db.delete(message)
    await test_db.commit()


@pytest.mark.asyncio
async def test_campaigns_crud_flow(client: AsyncClient):
    response = await client.post(
        "/api/v1/campaigns/",
        json={
            "name": "Test Campaign",
            "description": "API campaign",
            "campaign_type": "blast",
        },
    )
    assert response.status_code == 201
    campaign_id = response.json()["id"]

    response = await client.get("/api/v1/campaigns/")
    assert response.status_code == 200
    ids = [item["id"] for item in extract_items(response.json())]
    assert campaign_id in ids

    response = await client.get(f"/api/v1/campaigns/{campaign_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Test Campaign"

    response = await client.patch(
        f"/api/v1/campaigns/{campaign_id}",
        json={"name": "Updated Campaign", "description": "Updated", "campaign_type": "manual"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Campaign"

    response = await client.post(f"/api/v1/campaigns/{campaign_id}/start")
    assert response.status_code == 200
    assert response.json()["status"] == "active"

    response = await client.post(f"/api/v1/campaigns/{campaign_id}/pause")
    assert response.status_code == 200
    assert response.json()["status"] == "paused"

    response = await client.post(f"/api/v1/campaigns/{campaign_id}/stop")
    assert response.status_code == 200
    assert response.json()["status"] == "stopped"

    response = await client.get(f"/api/v1/campaigns/{campaign_id}/stats")
    assert response.status_code == 200
    assert response.json()["campaign_id"] == campaign_id

    response = await client.delete(f"/api/v1/campaigns/{campaign_id}")
    assert response.status_code == 204

    response = await client.get(f"/api/v1/campaigns/{campaign_id}")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_template_endpoints(client: AsyncClient):
    response = await client.post(
        "/api/v1/templates/",
        json={
            "name": "Welcome",
            "category": "initial",
            "content": "Hi {first_name}",
        },
    )
    assert response.status_code == 201
    template_id = response.json()["id"]

    response = await client.get("/api/v1/templates/")
    assert response.status_code == 200
    assert any(item["id"] == template_id for item in extract_items(response.json()))

    response = await client.get(f"/api/v1/templates/{template_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Welcome"

    response = await client.patch(
        f"/api/v1/templates/{template_id}",
        json={"name": "Updated", "category": "initial", "content": "Hello {first_name}"},
    )
    assert response.status_code == 200
    assert response.json()["name"] == "Updated"

    response = await client.post(
        f"/api/v1/templates/{template_id}/test",
        json={"first_name": "Sam"},
    )
    assert response.status_code == 200
    assert "Sam" in response.json()["rendered"]

    response = await client.delete(f"/api/v1/templates/{template_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_phone_number_endpoints(client: AsyncClient, phone_number: PhoneNumber):
    response = await client.get("/api/v1/phone-numbers/")
    assert response.status_code == 200
    assert any(item["id"] == str(phone_number.id) for item in extract_items(response.json()))

    response = await client.get(f"/api/v1/phone-numbers/{phone_number.id}")
    assert response.status_code == 200
    assert response.json()["phone_number"] == phone_number.phone_number

    response = await client.get(f"/api/v1/phone-numbers/{phone_number.id}/health")
    assert response.status_code == 200
    assert response.json()["health_score"] == phone_number.health_score

    response = await client.post("/api/v1/phone-numbers/acquire", params={"area_code": "513"})
    assert response.status_code == 201
    acquired_id = response.json()["id"]

    response = await client.patch(
        f"/api/v1/phone-numbers/{acquired_id}/settings",
        params={"rate_limit_mps": 2, "daily_limit": 50, "status": "inactive"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "inactive"

    response = await client.delete(f"/api/v1/phone-numbers/{acquired_id}")
    assert response.status_code == 204


@pytest.mark.asyncio
async def test_compliance_endpoints(client: AsyncClient, test_db: AsyncSession):
    response = await client.post(
        "/api/v1/compliance/opt-outs/bulk",
        json=["+15125550111", "+15125550122"],
    )
    assert response.status_code == 200
    assert response.json()["added"] == 2

    response = await client.get("/api/v1/compliance/opt-outs?search=555")
    assert response.status_code == 200
    opt_outs = extract_items(response.json())
    assert len(opt_outs) >= 1

    opt_out_id = opt_outs[0]["id"]
    response = await client.delete(f"/api/v1/compliance/opt-outs/{opt_out_id}")
    assert response.status_code == 204

    audit = AuditEvent(
        org_id=ORG_ID,
        event_type="opt_out_processed",
        phone_number="+15125550111",
        details={"source": "test"},
    )
    test_db.add(audit)
    await test_db.commit()

    response = await client.get("/api/v1/compliance/audit-logs")
    assert response.status_code == 200
    audit_entries = extract_items(response.json())
    assert len(audit_entries) >= 1

    response = await client.post(
        "/api/v1/compliance/reports/generate",
        params={"report_type": "weekly", "start_date": "2024-01-01", "end_date": "2024-01-07"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "generated"


@pytest.mark.asyncio
async def test_integrations_endpoints(client: AsyncClient, monkeypatch):
    class FakeAccount:
        sid = "AC123"
        friendly_name = "Test Account"

    class FakeAccounts:
        def __init__(self, account_sid):
            self.account_sid = account_sid

        def fetch(self):
            return FakeAccount()

    class FakeApi:
        def accounts(self, account_sid):
            return FakeAccounts(account_sid)

    class FakeClient:
        def __init__(self, account_sid, auth_token):
            self.api = FakeApi()

    import twilio.rest

    monkeypatch.setattr(twilio.rest, "Client", FakeClient)

    response = await client.get("/api/v1/integrations/twilio/status")
    assert response.status_code == 200

    response = await client.patch(
        "/api/v1/integrations/twilio/config",
        json={"account_sid": "AC123", "auth_token": "token"},
    )
    assert response.status_code == 200

    response = await client.post("/api/v1/integrations/twilio/test")
    assert response.status_code == 200

    response = await client.get("/api/v1/integrations/api-keys")
    assert response.status_code == 200

    response = await client.post("/api/v1/integrations/api-keys", params={"name": "Test Key"})
    assert response.status_code == 200
    key_id = response.json()["id"]

    response = await client.delete(f"/api/v1/integrations/api-keys/{key_id}")
    assert response.status_code == 200

    response = await client.get("/api/v1/integrations/webhooks")
    assert response.status_code == 200

    class FakeResponse:
        status_code = 200
        text = "ok"

    class FakeAsyncClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, url, json, timeout):
            return FakeResponse()

    import httpx

    monkeypatch.setattr(httpx, "AsyncClient", FakeAsyncClient)

    response = await client.post("/api/v1/integrations/webhooks/test", params={"url": "https://example.com"})
    assert response.status_code == 200
    assert response.json()["status"] == "success"


@pytest.mark.asyncio
async def test_messages_and_webhooks_flow(
    client: AsyncClient,
    test_db: AsyncSession,
    lead: Lead,
    message_with_twilio: Message,
):
    response = await client.post(
        "/api/v1/messages/send",
        json={"to": lead.phone1, "body": "Hello", "lead_id": str(lead.id)},
    )
    assert response.status_code == 201
    message_id = response.json()["id"]

    response = await client.get("/api/v1/messages/")
    assert response.status_code == 200
    assert any(item["id"] == message_id for item in extract_items(response.json()))

    response = await client.get(f"/api/v1/messages/{message_id}")
    assert response.status_code == 200
    assert response.json()["lead_id"] == str(lead.id)

    response = await client.get("/api/v1/messages/conversations/")
    assert response.status_code == 200
    conversations = extract_items(response.json())
    assert len(conversations) >= 1

    response = await client.get(f"/api/v1/messages/conversations/{lead.id}")
    assert response.status_code == 200
    assert response.json()["lead_id"] == str(lead.id)

    response = await client.post(
        f"/api/v1/messages/conversations/{lead.id}/messages",
        json={"content": "Follow up"},
    )
    assert response.status_code == 201

    response = await client.put(f"/api/v1/messages/conversations/{lead.id}/archive")
    assert response.status_code == 200

    response = await client.put(f"/api/v1/messages/conversations/{lead.id}/read")
    assert response.status_code == 200

    response = await client.put(f"/api/v1/messages/conversations/{lead.id}/star")
    assert response.status_code == 200

    response = await client.put(f"/api/v1/messages/conversations/{lead.id}/unstar")
    assert response.status_code == 200

    response = await client.delete(f"/api/v1/messages/conversations/{lead.id}")
    assert response.status_code == 200

    response = await client.post("/api/v1/messages/broadcast", json={"content": "Broadcast"})
    assert response.status_code == 200

    response = await client.post(
        "/api/v1/webhooks/twilio/status",
        data={"MessageSid": message_with_twilio.twilio_message_sid, "MessageStatus": "delivered"},
    )
    assert response.status_code == 200

    result = await test_db.execute(
        select(Message).where(Message.id == message_with_twilio.id)
    )
    updated_message = result.scalar_one()
    assert updated_message.status == "delivered"

    status_events = await test_db.execute(
        select(MessageStatusEvent).where(MessageStatusEvent.message_id == message_with_twilio.id)
    )
    assert status_events.scalar_one_or_none() is not None

    response = await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={"From": "+15125550111", "To": "+15125550100", "Body": "STOP"},
    )
    assert response.status_code == 200
    assert "opted out" in response.text.lower()

    response = await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={"From": "+15125550112", "To": "+15125550100", "Body": "HELP"},
    )
    assert response.status_code == 200
    assert "support" in response.text.lower()

    response = await client.post(
        "/api/v1/webhooks/twilio/inbound",
        data={"From": "+15125550113", "To": "+15125550100", "Body": "Hello"},
    )
    assert response.status_code == 200

    response = await client.post(
        "/api/v1/webhooks/twilio/fallback",
        data={"ErrorCode": "123"},
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_analytics_endpoints(client: AsyncClient, campaign: Campaign, phone_number: PhoneNumber):
    response = await client.get("/api/v1/analytics/dashboard")
    assert response.status_code == 200
    assert "total_leads" in response.json()

    response = await client.get(
        "/api/v1/analytics/campaigns/comparison",
        params=[
            ("campaign_ids", str(campaign.id)),
            ("campaign_ids", "not-a-uuid"),
            ("start_date", "2024-01-01"),
            ("end_date", "2024-01-31"),
        ],
    )
    assert response.status_code == 200
    assert response.json()["campaigns"]

    response = await client.get("/api/v1/analytics/trends", params={"date_range": "7d"})
    assert response.status_code == 200

    response = await client.get("/api/v1/analytics/roi", params={"timeRange": "7d"})
    assert response.status_code == 200

    response = await client.get("/api/v1/analytics/conversion-funnel")
    assert response.status_code == 200

    response = await client.get(f"/api/v1/analytics/campaigns/{campaign.id}")
    assert response.status_code == 200

    response = await client.get("/api/v1/analytics/campaigns/not-a-uuid")
    assert response.status_code == 422

    response = await client.get("/api/v1/analytics/leads", params={"timeRange": "7d"})
    assert response.status_code == 200

    response = await client.get("/api/v1/analytics/messages", params={"timeRange": "7d"})
    assert response.status_code == 200

    response = await client.post(
        "/api/v1/analytics/campaigns-comparison",
        json={"campaignIds": [str(campaign.id)], "metrics": ["messages_sent"]},
    )
    assert response.status_code == 200

    response = await client.get("/api/v1/analytics/phone-health")
    assert response.status_code == 200
