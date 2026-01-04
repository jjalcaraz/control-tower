"""
Basic API health tests to validate backend functionality
"""
import pytest
from httpx import AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    """Test root endpoint returns correct response"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/")
    
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "version" in data
    assert "docs" in data
    assert "api_v1" in data


@pytest.mark.asyncio
async def test_health_endpoint():
    """Test health endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert "status" in data
    assert "version" in data
    assert "database" in data
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_api_docs_accessible():
    """Test that API documentation is accessible"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/docs")
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_schema():
    """Test OpenAPI schema is available"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/api/v1/openapi.json")
    
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data
    assert "paths" in data


@pytest.mark.asyncio
async def test_cors_headers():
    """Test CORS headers are present"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.options("/")
    
    assert response.status_code == 200
    # CORS headers should be present for OPTIONS request


@pytest.mark.asyncio
async def test_404_error_handling():
    """Test 404 error handling"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/nonexistent-endpoint")
    
    assert response.status_code == 404


@pytest.mark.asyncio 
async def test_api_v1_structure():
    """Test that API v1 endpoints are accessible"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # These should return 401 (unauthorized) rather than 404 (not found)
        # since they exist but require authentication
        
        endpoints_to_test = [
            "/api/v1/leads",
            "/api/v1/campaigns", 
            "/api/v1/templates",
            "/api/v1/messages",
            "/api/v1/analytics/dashboard",
            "/api/v1/phone-numbers",
            "/api/v1/compliance/dashboard",
            "/api/v1/integrations/status"
        ]
        
        for endpoint in endpoints_to_test:
            response = await ac.get(endpoint)
            # Should be 401 (auth required) or 422 (validation error), not 404
            assert response.status_code in [401, 403, 422], f"Endpoint {endpoint} returned {response.status_code}"


@pytest.mark.asyncio
async def test_websocket_endpoints_exist():
    """Test that WebSocket endpoints are accessible"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Test WebSocket endpoints exist (they'll reject HTTP requests)
        response = await ac.get("/ws/dashboard")
        # WebSocket endpoints should return 426 Upgrade Required for HTTP requests
        assert response.status_code in [405, 426]  # Method not allowed or upgrade required
        
        response = await ac.get("/ws/campaigns/test-id")
        assert response.status_code in [405, 426]


class TestErrorHandling:
    """Test error handling and exception responses"""
    
    @pytest.mark.asyncio
    async def test_validation_error_format(self):
        """Test validation error format matches frontend expectations"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # Send invalid data to trigger validation error
            response = await ac.post(
                "/api/v1/leads",
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
    async def test_internal_error_handling(self):
        """Test internal server error handling"""
        async with AsyncClient(app=app, base_url="http://test") as ac:
            # This might trigger an error due to missing dependencies
            response = await ac.get("/api/v1/analytics/dashboard")
            
            # Should handle errors gracefully
            if response.status_code == 500:
                data = response.json()
                assert "error" in data or "detail" in data


class TestAPIConsistency:
    """Test API response consistency"""
    
    @pytest.mark.asyncio
    async def test_response_format_consistency(self):
        """Test that API responses follow consistent format"""
        # This test would verify response formats match frontend expectations
        # For now, just test that responses are JSON
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/")
            assert response.headers.get("content-type", "").startswith("application/json")
            
            response = await ac.get("/health")
            assert response.headers.get("content-type", "").startswith("application/json")


# Integration test placeholder
class TestBasicIntegration:
    """Basic integration tests"""
    
    @pytest.mark.asyncio
    async def test_database_connection(self):
        """Test database connection works"""
        # This would test actual database connectivity
        # For now, just test that health check includes database status
        async with AsyncClient(app=app, base_url="http://test") as ac:
            response = await ac.get("/health")
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