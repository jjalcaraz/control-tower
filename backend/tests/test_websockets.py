import json
import uuid

import pytest

from app.api import websockets as ws
from app.core.auth import CurrentUser
from app.models.organization import Organization
from app.models.user import User


class FakeWebSocket:
    def __init__(self, should_fail: bool = False):
        self.should_fail = should_fail
        self.accepted = False
        self.sent = []

    async def accept(self):
        self.accepted = True

    async def send_text(self, text: str):
        if self.should_fail:
            raise RuntimeError("send failed")
        self.sent.append(text)


def build_user() -> CurrentUser:
    org = Organization(
        id=uuid.uuid4(),
        name="Org",
        slug="org",
        brand_name="Brand",
    )
    user = User(
        id=uuid.uuid4(),
        email="ws@example.com",
        username="ws",
        hashed_password="hashed",
        role="admin",
        is_active=True,
        organization_id=org.id,
    )
    return CurrentUser(user, org)


@pytest.mark.asyncio
async def test_connection_manager_broadcasts():
    manager = ws.ConnectionManager()
    user = build_user()
    socket = FakeWebSocket()

    await manager.connect_to_campaign(socket, "campaign-1", user)
    assert socket.accepted is True

    await manager.broadcast_to_campaign("campaign-1", {"type": "update"})
    assert socket.sent
    payload = json.loads(socket.sent[-1])
    assert payload["type"] == "update"

    await manager.connect_to_dashboard(socket, user)
    await manager.broadcast_to_dashboard(str(user.org_id), {"type": "dashboard"})
    assert any("dashboard" in msg for msg in socket.sent)

    await manager.send_to_user(str(user.id), {"type": "direct"})
    assert any("direct" in msg for msg in socket.sent)

    manager.disconnect(socket)
    stats = manager.campaign_connections
    assert "campaign-1" not in stats


@pytest.mark.asyncio
async def test_notify_helpers(monkeypatch):
    manager = ws.ConnectionManager()
    user = build_user()
    socket = FakeWebSocket()

    await manager.connect_to_campaign(socket, "campaign-2", user)
    await manager.connect_to_dashboard(socket, user)

    monkeypatch.setattr(ws, "manager", manager)

    await ws.notify_campaign_update("campaign-2", {"status": "active"})
    await ws.notify_dashboard_update(str(user.org_id), {"total": 1})
    await ws.notify_message_status_update(str(user.org_id), {"campaign_id": "campaign-2"})
    await ws.notify_lead_activity(str(user.org_id), {"lead_id": "lead-1"})
    await ws.notify_compliance_alert(str(user.org_id), {"type": "opt_out"})

    assert socket.sent
    stats = ws.get_connection_stats()
    assert stats["total_user_connections"] == 1
