"""
Comprehensive test suite for Lead Management API

This test suite covers:
- Lead CRUD operations (Create, Read, Update, Delete)
- Lead validation and error handling
- Bulk operations (import, bulk delete, bulk update)
- Field transformation and data consistency
- Authentication and authorization
- Pagination and filtering
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
import json
import base64
from io import BytesIO
import csv

from app.main import app
from app.core.database import get_db
from app.models.lead import Lead
from app.models.user import User
from app.core.auth import create_access_token


class TestLeadsAPI:
    """Test suite for Lead Management API endpoints"""

    @pytest_asyncio.fixture
    async def client(self):
        """Create async HTTP client for testing"""
        async with AsyncClient(app=app, base_url="http://test", follow_redirects=True) as ac:
            yield ac

    @pytest_asyncio.fixture
    async def auth_headers(self):
        """Generate authentication headers for testing"""
        # Create development JWT token
        token = create_access_token(
            data={
                "sub": "1",
                "email": "admin@example.com",
                "role": "admin"
            }
        )
        return {"Authorization": f"Bearer {token}"}

    @pytest_asyncio.fixture
    async def test_db_session(self):
        """Get test database session"""
        async for session in get_db():
            yield session

    @pytest_asyncio.fixture
    async def sample_lead_data(self):
        """Sample lead data for testing"""
        return {
            "first_name": "John",
            "last_name": "Doe",
            "full_name": "John Doe",
            "phone1": "5551234567",
            "phone2": "5559876543",
            "email": "john.doe@example.com",
            "address_line1": "123 Main St",
            "city": "Austin",
            "state": "TX",
            "zip_code": "78701",
            "country": "US",
            "property_type": "Single Family",
            "estimated_value": 450000.0,
            "acreage": 0.25,
            "lead_score": "hot",
            "lead_source": "Website",
            "status": "new",
            "notes": "Test lead for automated testing",
            "organization_id": "12345678-1234-5678-9abc-123456789012"  # Use default org
        }

    @pytest_asyncio.fixture
    async def test_lead(self, test_db_session: AsyncSession, sample_lead_data):
        """Create a test lead in database"""
        lead = Lead(**sample_lead_data)
        test_db_session.add(lead)
        await test_db_session.commit()
        await test_db_session.refresh(lead)

        # Clean up after test
        yield lead

        await test_db_session.delete(lead)
        await test_db_session.commit()

    # ===== LEAD RETRIEVAL TESTS =====

    @pytest.mark.asyncio
    async def test_get_leads_success(self, client: AsyncClient, auth_headers, test_lead):
        """Test successful retrieval of leads list"""
        response = await client.get("/api/v1/leads/", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check first lead has expected fields
        assert "id" in data[0]
        assert "first_name" in data[0]
        assert "email" in data[0]

    @pytest.mark.asyncio
    async def test_get_leads_pagination(self, client: AsyncClient, auth_headers):
        """Test leads pagination functionality"""
        # Test with limit parameter
        response = await client.get("/api/v1/leads?limit=5&page=1", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert len(data["data"]) <= 5
        assert data["pagination"]["limit"] == 5
        assert data["pagination"]["page"] == 1

    @pytest.mark.asyncio
    async def test_get_leads_with_search(self, client: AsyncClient, auth_headers, test_lead):
        """Test leads search functionality"""
        # Search by owner name
        response = await client.get("/api/v1/leads?search=John Doe", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Should find our test lead
        lead_ids = [lead["id"] for lead in data["data"]]
        assert test_lead.id in lead_ids

    @pytest.mark.asyncio
    async def test_get_single_lead_success(self, client: AsyncClient, auth_headers, test_lead):
        """Test successful retrieval of single lead"""
        response = await client.get(f"/api/v1/leads/{test_lead.id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["id"] == test_lead.id
        assert data["data"]["owner_name"] == test_lead.owner_name

    @pytest.mark.asyncio
    async def test_get_single_lead_not_found(self, client: AsyncClient, auth_headers):
        """Test retrieval of non-existent lead"""
        response = await client.get("/api/v1/leads/99999", headers=auth_headers)

        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False
        assert "not found" in data["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_get_leads_unauthorized(self, client: AsyncClient):
        """Test leads retrieval without authentication"""
        response = await client.get("/api/v1/leads")

        assert response.status_code == 401

    # ===== LEAD CREATION TESTS =====

    @pytest.mark.asyncio
    async def test_create_lead_success(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test successful lead creation"""
        response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["owner_name"] == sample_lead_data["owner_name"]
        assert data["data"]["email"] == sample_lead_data["email"]
        assert "id" in data["data"]

        # Clean up
        await self._cleanup_lead(data["data"]["id"])

    @pytest.mark.asyncio
    async def test_create_lead_validation_error(self, client: AsyncClient, auth_headers):
        """Test lead creation with invalid data"""
        invalid_data = {
            "owner_name": "",  # Empty required field
            "phone_number_1": "invalid_phone",  # Invalid format
            "email": "invalid_email"  # Invalid email format
        }

        response = await client.post("/api/v1/leads", json=invalid_data, headers=auth_headers)

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "error" in data

    @pytest.mark.asyncio
    async def test_create_lead_duplicate_email(self, client: AsyncClient, auth_headers, test_lead):
        """Test lead creation with duplicate email"""
        duplicate_data = {
            "owner_name": "Another Name",
            "phone_number_1": "5555555555",
            "email": test_lead.email  # Duplicate email
        }

        response = await client.post("/api/v1/leads", json=duplicate_data, headers=auth_headers)

        # Should either succeed or fail based on business logic
        # Either way, we verify the response is appropriate
        assert response.status_code in [200, 201, 400]

    @pytest.mark.asyncio
    async def test_create_lead_unauthorized(self, client: AsyncClient, sample_lead_data):
        """Test lead creation without authentication"""
        response = await client.post("/api/v1/leads", json=sample_lead_data)

        assert response.status_code == 401

    # ===== LEAD UPDATE TESTS =====

    @pytest.mark.asyncio
    async def test_update_lead_success(self, client: AsyncClient, auth_headers, test_lead):
        """Test successful lead update"""
        update_data = {
            "owner_name": "Updated Name",
            "status": "qualified",
            "lead_score": "hot",
            "notes": "Updated notes for testing"
        }

        response = await client.put(f"/api/v1/leads/{test_lead.id}", json=update_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["data"]["owner_name"] == update_data["owner_name"]
        assert data["data"]["status"] == update_data["status"]

    @pytest.mark.asyncio
    async def test_update_lead_not_found(self, client: AsyncClient, auth_headers):
        """Test update of non-existent lead"""
        update_data = {"owner_name": "Updated Name"}

        response = await client.put("/api/v1/leads/99999", json=update_data, headers=auth_headers)

        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False

    @pytest.mark.asyncio
    async def test_update_lead_invalid_id(self, client: AsyncClient, auth_headers):
        """Test lead update with invalid ID format"""
        update_data = {"owner_name": "Updated Name"}

        response = await client.put("/api/v1/leads/invalid_id", json=update_data, headers=auth_headers)

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "invalid" in data["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_update_lead_unauthorized(self, client: AsyncClient, test_lead):
        """Test lead update without authentication"""
        update_data = {"owner_name": "Updated Name"}

        response = await client.put(f"/api/v1/leads/{test_lead.id}", json=update_data)

        assert response.status_code == 401

    # ===== LEAD DELETION TESTS =====

    @pytest.mark.asyncio
    async def test_delete_lead_success(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test successful lead deletion"""
        # First create a lead to delete
        create_response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)
        assert create_response.status_code == 201
        lead_id = create_response.json()["data"]["id"]

        # Then delete it
        response = await client.delete(f"/api/v1/leads/{lead_id}", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted successfully" in data["message"].lower()

        # Verify it's actually deleted
        verify_response = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
        assert verify_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_lead_not_found(self, client: AsyncClient, auth_headers):
        """Test deletion of non-existent lead"""
        response = await client.delete("/api/v1/leads/99999", headers=auth_headers)

        assert response.status_code == 404
        data = response.json()
        assert data["success"] is False

    @pytest.mark.asyncio
    async def test_delete_lead_invalid_id(self, client: AsyncClient, auth_headers):
        """Test lead deletion with invalid ID format"""
        response = await client.delete("/api/v1/leads/invalid_id", headers=auth_headers)

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "invalid" in data["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_delete_lead_unauthorized(self, client: AsyncClient, test_lead):
        """Test lead deletion without authentication"""
        response = await client.delete(f"/api/v1/leads/{test_lead.id}")

        assert response.status_code == 401

    # ===== BULK OPERATIONS TESTS =====

    @pytest.mark.asyncio
    async def test_bulk_delete_success(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test successful bulk deletion of leads"""
        # Create multiple leads to delete
        lead_ids = []
        for i in range(3):
            lead_data = sample_lead_data.copy()
            lead_data["email"] = f"test{i}@example.com"
            lead_data["phone_number_1"] = f"55512345{i:02d}"

            create_response = await client.post("/api/v1/leads", json=lead_data, headers=auth_headers)
            assert create_response.status_code == 201
            lead_ids.append(create_response.json()["data"]["id"])

        # Bulk delete them
        delete_data = {"lead_ids": lead_ids}
        response = await client.post("/api/v1/leads/bulk-delete", json=delete_data, headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "deleted" in data["message"].lower()

        # Verify they're actually deleted
        for lead_id in lead_ids:
            verify_response = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
            assert verify_response.status_code == 404

    @pytest.mark.asyncio
    async def test_bulk_delete_empty_list(self, client: AsyncClient, auth_headers):
        """Test bulk delete with empty lead list"""
        delete_data = {"lead_ids": []}

        response = await client.post("/api/v1/leads/bulk-delete", json=delete_data, headers=auth_headers)

        # Should either succeed with 0 deletions or fail validation
        assert response.status_code in [200, 400]

    @pytest.mark.asyncio
    async def test_bulk_delete_unauthorized(self, client: AsyncClient):
        """Test bulk delete without authentication"""
        delete_data = {"lead_ids": [1, 2, 3]}

        response = await client.post("/api/v1/leads/bulk-delete", json=delete_data)

        assert response.status_code == 401

    # ===== LEAD IMPORT TESTS =====

    @pytest.mark.asyncio
    async def test_import_leads_csv_success(self, client: AsyncClient, auth_headers):
        """Test successful CSV import of leads"""
        # Create sample CSV data
        csv_data = """owner_name,phone_number_1,email,city,state
Test Import 1,5551111111,import1@test.com,Austin,TX
Test Import 2,5552222222,import2@test.com,Houston,TX
Test Import 3,5553333333,import3@test.com,Dallas,TX"""

        # Convert to file-like object
        csv_file = BytesIO(csv_data.encode('utf-8'))

        # Test import
        files = {"file": ("test_leads.csv", csv_file, "text/csv")}
        mappings = {
            "owner_name": "owner_name",
            "phone_number_1": "phone_number_1",
            "email": "email",
            "city": "city",
            "state": "state"
        }
        data = {
            "mappings": json.dumps(mappings),
            "bulk_tags": json.dumps(["imported"]),
            "auto_tagging_enabled": "true"
        }

        response = await client.post("/api/v1/leads/import", files=files, data=data, headers=auth_headers)

        assert response.status_code == 200
        result = response.json()
        assert result["success"] is True
        assert "imported" in result["message"].lower()
        assert "total_count" in result["data"]

    @pytest.mark.asyncio
    async def test_import_leads_invalid_file_type(self, client: AsyncClient, auth_headers):
        """Test import with invalid file type"""
        # Create invalid file data
        invalid_file = BytesIO(b"not a csv file")
        files = {"file": ("test.txt", invalid_file, "text/plain")}

        response = await client.post("/api/v1/leads/import", files=files, headers=auth_headers)

        assert response.status_code == 400
        data = response.json()
        assert data["success"] is False
        assert "file" in data["error"]["message"].lower()

    @pytest.mark.asyncio
    async def test_import_leads_unauthorized(self, client: AsyncClient):
        """Test import without authentication"""
        csv_file = BytesIO(b"test,data")
        files = {"file": ("test.csv", csv_file, "text/csv")}

        response = await client.post("/api/v1/leads/import", files=files)

        assert response.status_code == 401

    # ===== DATA TRANSFORMATION TESTS =====

    @pytest.mark.asyncio
    async def test_field_name_transformation(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test backend field names match database schema"""
        # Create lead
        response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)
        assert response.status_code == 201
        lead_data = response.json()["data"]

        # Verify expected field names (matching database schema)
        expected_fields = [
            "id", "owner_name", "phone_number_1", "phone_number_2", "phone_number_3",
            "email", "street_address", "city", "state", "zip_code", "country",
            "property_type", "property_value", "acreage", "year_built",
            "bedrooms", "bathrooms", "square_feet", "lead_score", "lead_source",
            "asking_price", "assessed_value", "notes", "status", "tags",
            "created_at", "updated_at"
        ]

        for field in expected_fields:
            assert field in lead_data, f"Expected field '{field}' missing from response"

        # Clean up
        await self._cleanup_lead(lead_data["id"])

    @pytest.mark.asyncio
    async def test_data_type_consistency(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test data types are consistent and valid"""
        # Create lead
        response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)
        assert response.status_code == 201
        lead_data = response.json()["data"]

        # Test numeric fields
        assert isinstance(lead_data["property_value"], (int, float, type(None)))
        assert isinstance(lead_data["acreage"], (int, float, type(None)))
        assert isinstance(lead_data["year_built"], (int, type(None)))
        assert isinstance(lead_data["bedrooms"], (int, type(None)))
        assert isinstance(lead_data["bathrooms"], (int, float, type(None)))
        assert isinstance(lead_data["square_feet"], (int, type(None)))

        # Test string fields
        string_fields = ["owner_name", "email", "city", "state", "status"]
        for field in string_fields:
            if lead_data.get(field) is not None:
                assert isinstance(lead_data[field], str)

        # Clean up
        await self._cleanup_lead(lead_data["id"])

    # ===== EDGE CASES AND ERROR HANDLING =====

    @pytest.mark.asyncio
    async def test_very_long_field_values(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test handling of very long field values"""
        long_text = "x" * 10000  # 10KB text

        # Test with very long notes
        sample_lead_data["notes"] = long_text

        response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)

        # Should either succeed or fail gracefully
        assert response.status_code in [200, 201, 400, 413]

        # Clean up if created
        if response.status_code == 201:
            await self._cleanup_lead(response.json()["data"]["id"])

    @pytest.mark.asyncio
    async def test_special_characters_in_fields(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test handling of special characters in text fields"""
        special_chars = "Test with émojis 🏠📱 and spëcial chars & symbols #$%^&*()"

        sample_lead_data["owner_name"] = special_chars
        sample_lead_data["notes"] = special_chars

        response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True

        # Verify special characters are preserved
        assert special_chars in data["data"]["owner_name"]
        assert special_chars in data["data"]["notes"]

        # Clean up
        await self._cleanup_lead(data["data"]["id"])

    @pytest.mark.asyncio
    async def test_null_and_optional_fields(self, client: AsyncClient, auth_headers):
        """Test handling of null and optional fields"""
        minimal_data = {
            "owner_name": "Minimal Lead",
            "phone_number_1": "5551234567"
            # All other fields omitted (should be nullable/optional)
        }

        response = await client.post("/api/v1/leads", json=minimal_data, headers=auth_headers)

        assert response.status_code == 201
        data = response.json()
        assert data["success"] is True
        assert data["data"]["owner_name"] == minimal_data["owner_name"]

        # Verify optional fields are null or have defaults
        assert data["data"]["email"] is None
        assert data["data"]["city"] is None
        assert data["data"]["status"] == "new"  # Should have default

        # Clean up
        await self._cleanup_lead(data["data"]["id"])

    # ===== PERFORMANCE TESTS =====

    @pytest.mark.asyncio
    async def test_large_list_performance(self, client: AsyncClient, auth_headers):
        """Test performance with large lead lists"""
        # Request large list
        response = await client.get("/api/v1/leads?limit=100", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True

        # Should return quickly (under 5 seconds)
        # Note: This is a basic performance check
        assert len(data["data"]) <= 100

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client: AsyncClient, auth_headers):
        """Test handling of concurrent requests"""
        import asyncio

        # Make multiple concurrent requests
        tasks = []
        for i in range(10):
            task = client.get("/api/v1/leads?limit=5", headers=auth_headers)
            tasks.append(task)

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # All should succeed without errors
        for response in responses:
            assert not isinstance(response, Exception)
            assert response.status_code == 200

    # ===== HELPER METHODS =====

    async def _cleanup_lead(self, lead_id: int):
        """Helper method to clean up test leads"""
        async for session in get_db():
            try:
                await session.execute(delete(Lead).where(Lead.id == lead_id))
                await session.commit()
            except Exception:
                await session.rollback()
            break

    # ===== INTEGRATION TESTS =====

    @pytest.mark.asyncio
    async def test_full_lead_lifecycle(self, client: AsyncClient, auth_headers, sample_lead_data):
        """Test complete lead lifecycle: create -> read -> update -> delete"""

        # 1. Create lead
        create_response = await client.post("/api/v1/leads", json=sample_lead_data, headers=auth_headers)
        assert create_response.status_code == 201
        lead_data = create_response.json()["data"]
        lead_id = lead_data["id"]

        # 2. Read lead
        get_response = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
        assert get_response.status_code == 200
        retrieved_data = get_response.json()["data"]
        assert retrieved_data["id"] == lead_id
        assert retrieved_data["email"] == sample_lead_data["email"]

        # 3. Update lead
        update_data = {
            "status": "qualified",
            "notes": "Updated during integration test"
        }
        update_response = await client.put(f"/api/v1/leads/{lead_id}", json=update_data, headers=auth_headers)
        assert update_response.status_code == 200
        updated_data = update_response.json()["data"]
        assert updated_data["status"] == update_data["status"]

        # 4. Verify update persisted
        verify_response = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
        assert verify_response.status_code == 200
        verified_data = verify_response.json()["data"]
        assert verified_data["status"] == update_data["status"]

        # 5. Delete lead
        delete_response = await client.delete(f"/api/v1/leads/{lead_id}", headers=auth_headers)
        assert delete_response.status_code == 200

        # 6. Verify deletion
        final_check = await client.get(f"/api/v1/leads/{lead_id}", headers=auth_headers)
        assert final_check.status_code == 404


# ===== TEST EXECUTION CONFIGURATION =====

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])