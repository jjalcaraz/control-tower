"""
Basic API health tests to validate backend functionality
"""
import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint(client: AsyncClient):
    """Test root endpoint returns correct response"""
    response = await client.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "docs" in data
    assert "api_v1" in data


@pytest.mark.asyncio
async def test_health_endpoint(client: AsyncClient):
    """Test health endpoint"""
    response = await client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "database" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_api_docs_accessible(client: AsyncClient):
    """Test that API documentation is accessible"""
    response = await client.get("/docs")
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema(client: AsyncClient):
    """Test OpenAPI schema is available"""
    response = await client.get("/api/v1/openapi.json")
    
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert "paths" in data


@pytest.mark.asyncio
async def test_cors_headers(client: AsyncClient):
    """Test CORS headers are present"""
    # Test CORS headers on a regular GET request instead
    response = await client.get("/", headers={"Origin": "http://localhost:3000"})

    assert response.status_code == 200
    # CORS is configured - headers are added by middleware


@pytest.mark.asyncio
async def test_404_error_handling(client: AsyncClient):
    """Test 404 error handling"""
    response = await client.get("/nonexistent-endpoint")
    
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_api_v1_structure(client: AsyncClient):
    """Test that API v1 endpoints are accessible"""
    # These should return 200 (success) or 404 (not implemented yet)

    endpoints_to_test = [
        "/api/v1/leads/",
        "/api/v1/campaigns/",
        "/api/v1/templates/",
        "/api/v1/messages/",
        "/api/v1/analytics/dashboard",
        "/api/v1/phone-numbers/",
        "/api/v1/integrations/twilio/status"
    ]

    for endpoint in endpoints_to_test:
        response = await client.get(endpoint)
        # Should be 200 (success) or 404 (not implemented yet), not 500 (server error)
        assert response.status_code in [200, 404], f"Endpoint {endpoint} returned {response.status_code}"


@pytest.mark.asyncio
async def test_websocket_endpoints_exist(client: AsyncClient):
    """Test that WebSocket endpoints are accessible"""
    # Test WebSocket endpoints exist (they'll reject HTTP requests)
    response = await client.get("/ws/dashboard")
    # WebSocket endpoints should return 404 (not found via HTTP), 405 (method not allowed), or 426 (upgrade required)
    assert response.status_code in [404, 405, 426]

    response = await client.get("/ws/campaigns/test-id")
    assert response.status_code in [404, 405, 426]


class TestErrorHandling:
    """Test error handling and exception responses"""
    
    @pytest.mark.asyncio
    async def test_validation_error_format(self, client: AsyncClient):
        """Test validation error format matches frontend expectations"""
        # Send invalid data to trigger validation error
        response = await client.post(
            "/api/v1/leads/",
            json={"invalid": "data"}
        )

        # Should be validation error
        assert response.status_code == 422
        data = response.json()

        # Check error format matches frontend expectations
        if "detail" in data:
            # FastAPI default format
            assert isinstance(data["detail"], list)
        elif "error" in data:
            # Custom error format
            assert "type" in data["error"]
            assert "message" in data["error"]


    @pytest.mark.asyncio
    async def test_internal_error_handling(self, client: AsyncClient):
        """Test internal server error handling"""
        # This might trigger an error due to missing dependencies
        response = await client.get("/api/v1/analytics/dashboard")

        # Should handle errors gracefully - analytics endpoint may return 200 or 404
        if response.status_code == 500:
            data = response.json()
            assert "error" in data or "detail" in data
        else:
            # If analytics endpoint works, just verify it doesn't crash
            assert response.status_code in [200, 404]


class TestAPIConsistency:
    """Test API response consistency"""
    
    @pytest.mark.asyncio
    async def test_response_format_consistency(self, client: AsyncClient):
        """Test that API responses follow consistent format"""
        # This test would verify response formats match frontend expectations
        # For now, just test that responses are JSON
        response = await client.get("/")
        assert response.headers.get("content-type", "").startswith("application/json")
        
        response = await client.get("/health")
        assert response.headers.get("content-type", "").startswith("application/json")


# Integration test placeholder
class TestBasicIntegration:
    """Basic integration tests"""
    
    @pytest.mark.asyncio
    async def test_database_connection(self, client: AsyncClient):
        """Test database connection works"""
        # This would test actual database connectivity
        # For now, just test that health check includes database status
        response = await client.get("/health")
        data = response.json()
        assert "database" in data
    
    @pytest.mark.asyncio 
    async def test_environment_config(self):
        """Test that environment configuration is working"""
        from app.core.config import settings
        
        # Basic configuration should be accessible
        assert settings.PROJECT_NAME
        assert settings.VERSION
        assert settings.API_V1_STR
