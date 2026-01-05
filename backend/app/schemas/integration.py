from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import datetime


class IntegrationResponse(BaseModel):
    """Response schema for integration"""
    id: str
    type: str
    status: str
    config: Dict[str, Any]
    created_at: datetime


class IntegrationCreate(BaseModel):
    """Schema for creating integration"""
    type: str
    config: Dict[str, Any]


class IntegrationUpdate(BaseModel):
    """Schema for updating integration"""
    status: Optional[str] = None
    config: Optional[Dict[str, Any]] = None


class WebhookResponse(BaseModel):
    """Response schema for webhook"""
    id: str
    url: str
    events: List[str]
    status: str
    created_at: datetime


class WebhookCreate(BaseModel):
    """Schema for creating webhook"""
    url: str
    events: List[str]
    secret: Optional[str] = None


class WebhookUpdate(BaseModel):
    """Schema for updating webhook"""
    url: Optional[str] = None
    events: Optional[List[str]] = None
    status: Optional[str] = None
    secret: Optional[str] = None


class APIKeyResponse(BaseModel):
    """Response schema for API key"""
    id: str
    name: str
    key: str  # Only shown on creation
    permissions: List[str]
    status: str
    created_at: datetime


class APIKeyCreate(BaseModel):
    """Schema for creating API key"""
    name: str
    permissions: List[str]
    expires_at: Optional[datetime] = None


class IntegrationTestResponse(BaseModel):
    """Response schema for integration test"""
    success: bool
    message: str
    details: Dict[str, Any]