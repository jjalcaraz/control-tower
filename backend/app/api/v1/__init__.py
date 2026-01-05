# API v1 Router
from fastapi import APIRouter

from app.api.v1 import leads, campaigns, messages, templates
from app.api.v1 import phone_numbers, analytics, compliance, integrations, webhooks

api_router = APIRouter()

# Lead Management Routes
api_router.include_router(leads.router, prefix="/leads", tags=["leads"])

# Campaign Management Routes
api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])

# Message Routes
api_router.include_router(messages.router, prefix="/messages", tags=["messages"])

# Template Routes
api_router.include_router(templates.router, prefix="/templates", tags=["templates"])

# Phone Number Routes
api_router.include_router(phone_numbers.router, prefix="/phone-numbers", tags=["phone-numbers"])

# Analytics Routes
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])

# Compliance Routes
api_router.include_router(compliance.router, prefix="/compliance", tags=["compliance"])

# Integration Routes
api_router.include_router(integrations.router, prefix="/integrations", tags=["integrations"])

# Webhook Routes
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
