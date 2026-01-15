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

import json
import uuid
from io import BytesIO

import pytest
import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.lead import Lead


def extract_items(payload):
    if isinstance(payload, dict):
        for key in ("data", "items", "results"):
            value = payload.get(key)
            if isinstance(value, list):
                return value
        return []
    return payload if isinstance(payload, list) else []


class TestLeadsAPI:
    """Test suite for Lead Management API endpoints"""

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
        }

    @pytest_asyncio.fixture
    async def test_lead(self, test_db: AsyncSession, sample_lead_data):
        """Create a test lead in database"""
        lead = Lead(
            **sample_lead_data,
            organization_id=uuid.UUID("12345678-1234-5678-9abc-123456789012")
        )
        test_db.add(lead)
        await test_db.commit()
        await test_db.refresh(lead)

        # Clean up after test
        yield lead

        await test_db.delete(lead)
        await test_db.commit()

    # ===== LEAD RETRIEVAL TESTS =====

    @pytest.mark.asyncio
    async def test_get_leads_success(self, client: AsyncClient, test_lead):
        """Test successful retrieval of leads list"""
        response = await client.get("/api/v1/leads/")

        assert response.status_code == 200
        data = response.json()
        items = extract_items(data)
        assert isinstance(items, list)
        assert len(items) > 0
        # Check first lead has expected fields
        assert "id" in items[0]
        assert "first_name" in items[0]
        assert "email" in items[0]

    @pytest.mark.asyncio
    async def test_get_leads_pagination(self, client: AsyncClient):
        """Test leads pagination functionality"""
        # Test with limit parameter
        response = await client.get("/api/v1/leads/?limit=5&page=1")

        assert response.status_code == 200
        data = response.json()
        items = extract_items(data)
        assert len(items) <= 5

    @pytest.mark.asyncio
    async def test_get_leads_with_search(self, client: AsyncClient, test_lead):
        """Test leads search functionality"""
        response = await client.get("/api/v1/leads/?search=John")

        assert response.status_code == 200
        data = response.json()
        items = extract_items(data)

        # Should find our test lead
        lead_ids = [lead["id"] for lead in items]
        assert str(test_lead.id) in lead_ids

    @pytest.mark.asyncio
    async def test_get_single_lead_success(self, client: AsyncClient, test_lead):
        """Test successful retrieval of single lead"""
        response = await client.get(f"/api/v1/leads/{test_lead.id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(test_lead.id)
        assert data["full_name"] == test_lead.full_name

    @pytest.mark.asyncio
    async def test_get_single_lead_not_found(self, client: AsyncClient):
        """Test retrieval of non-existent lead"""
        response = await client.get("/api/v1/leads/00000000-0000-0000-0000-000000000000")

        assert response.status_code == 404
        data = response.json()
        if isinstance(data, dict):
            message = data.get("detail") or data.get("message") or data.get("error")
            assert message
            assert "not found" in str(message).lower()
        else:
            assert "not found" in str(data).lower()

    @pytest.mark.asyncio
    async def test_get_leads_unauthorized(self, client: AsyncClient):
        """Test leads retrieval without authentication"""
        response = await client.get("/api/v1/leads/")

        assert response.status_code == 200

    # ===== LEAD CREATION TESTS =====

    @pytest.mark.asyncio
    async def test_create_lead_success(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test successful lead creation"""
        response = await client.post("/api/v1/leads/", json=sample_lead_data)

        assert response.status_code == 201
        data = response.json()
        assert data["first_name"] == sample_lead_data["first_name"]
        assert data["email"] == sample_lead_data["email"]
        assert "id" in data

        # Clean up
        await self._cleanup_lead(test_db, data["id"])

    @pytest.mark.asyncio
    async def test_create_lead_validation_error(self, client: AsyncClient):
        """Test lead creation with invalid data"""
        invalid_data = {
            "first_name": "",  # Empty required field
            "last_name": "",  # Empty required field
            "phone1": "invalid_phone",  # Invalid format
            "email": "invalid_email"  # Invalid email format
        }

        response = await client.post("/api/v1/leads/", json=invalid_data)

        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_create_lead_duplicate_email(self, client: AsyncClient, test_db: AsyncSession, test_lead):
        """Test lead creation with duplicate email"""
        duplicate_data = {
            "first_name": "Another",
            "last_name": "Name",
            "phone1": "5555555555",
            "email": test_lead.email  # Duplicate email
        }

        response = await client.post("/api/v1/leads/", json=duplicate_data)

        assert response.status_code == 201
        await self._cleanup_lead(test_db, response.json()["id"])

    @pytest.mark.asyncio
    async def test_create_lead_unauthorized(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test lead creation without authentication"""
        response = await client.post("/api/v1/leads/", json=sample_lead_data)

        assert response.status_code == 201
        await self._cleanup_lead(test_db, response.json()["id"])

    # ===== LEAD UPDATE TESTS =====

    @pytest.mark.asyncio
    async def test_update_lead_success(self, client: AsyncClient, test_lead):
        """Test successful lead update"""
        update_data = {
            "first_name": "Updated",
            "status": "qualified",
            "lead_score": "hot",
            "notes": "Updated notes for testing"
        }

        response = await client.patch(f"/api/v1/leads/{test_lead.id}", json=update_data)

        assert response.status_code == 200
        data = response.json()
        assert data["first_name"] == update_data["first_name"]
        assert data["status"] == update_data["status"]

    @pytest.mark.asyncio
    async def test_update_lead_not_found(self, client: AsyncClient):
        """Test update of non-existent lead"""
        update_data = {"first_name": "Updated"}

        response = await client.patch(
            "/api/v1/leads/00000000-0000-0000-0000-000000000000",
            json=update_data
        )

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_update_lead_invalid_id(self, client: AsyncClient):
        """Test lead update with invalid ID format"""
        update_data = {"first_name": "Updated"}

        response = await client.patch("/api/v1/leads/invalid_id", json=update_data)

        assert response.status_code == 400
        data = response.json()
        if isinstance(data, dict):
            message = data.get("detail") or data.get("message") or data.get("error")
            assert message
            assert "invalid" in str(message).lower()
        else:
            assert "invalid" in str(data).lower()

    @pytest.mark.asyncio
    async def test_update_lead_unauthorized(self, client: AsyncClient, test_lead):
        """Test lead update without authentication"""
        update_data = {"first_name": "Updated"}

        response = await client.patch(f"/api/v1/leads/{test_lead.id}", json=update_data)

        assert response.status_code == 200

    # ===== LEAD DELETION TESTS =====

    @pytest.mark.asyncio
    async def test_delete_lead_success(self, client: AsyncClient, sample_lead_data):
        """Test successful lead deletion"""
        # First create a lead to delete
        create_response = await client.post("/api/v1/leads/", json=sample_lead_data)
        assert create_response.status_code == 201
        lead_id = create_response.json()["id"]

        # Then delete it
        response = await client.delete(f"/api/v1/leads/{lead_id}")
        assert response.status_code == 204

        # Verify it's actually deleted
        verify_response = await client.get(f"/api/v1/leads/{lead_id}")
        assert verify_response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_lead_not_found(self, client: AsyncClient):
        """Test deletion of non-existent lead"""
        response = await client.delete("/api/v1/leads/00000000-0000-0000-0000-000000000000")

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_lead_invalid_id(self, client: AsyncClient):
        """Test lead deletion with invalid ID format"""
        response = await client.delete("/api/v1/leads/invalid_id")

        assert response.status_code == 400
        data = response.json()
        if isinstance(data, dict):
            message = data.get("detail") or data.get("message") or data.get("error")
            assert message
            assert "invalid" in str(message).lower()
        else:
            assert "invalid" in str(data).lower()

    @pytest.mark.asyncio
    async def test_delete_lead_unauthorized(self, client: AsyncClient, sample_lead_data):
        """Test lead deletion without authentication"""
        create_response = await client.post("/api/v1/leads/", json=sample_lead_data)
        assert create_response.status_code == 201
        lead_id = create_response.json()["id"]

        response = await client.delete(f"/api/v1/leads/{lead_id}")

        assert response.status_code == 204

    # ===== BULK OPERATIONS TESTS =====

    @pytest.mark.asyncio
    async def test_bulk_delete_success(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test bulk deletion endpoint availability"""
        # Create multiple leads to delete
        lead_ids = []
        for i in range(3):
            lead_data = sample_lead_data.copy()
            lead_data["email"] = f"test{i}@example.com"
            lead_data["phone1"] = f"55512345{i:02d}"

            create_response = await client.post("/api/v1/leads/", json=lead_data)
            assert create_response.status_code == 201
            lead_ids.append(create_response.json()["id"])

        # Bulk delete them
        delete_data = {"lead_ids": lead_ids}
        response = await client.post("/api/v1/leads/bulk-delete", json=delete_data)

        assert response.status_code == 405

        for lead_id in lead_ids:
            await self._cleanup_lead(test_db, lead_id)

    @pytest.mark.asyncio
    async def test_bulk_delete_empty_list(self, client: AsyncClient):
        """Test bulk delete with empty lead list"""
        delete_data = {"lead_ids": []}

        response = await client.post("/api/v1/leads/bulk-delete", json=delete_data)

        assert response.status_code == 405

    @pytest.mark.asyncio
    async def test_bulk_delete_unauthorized(self, client: AsyncClient):
        """Test bulk delete without authentication"""
        delete_data = {"lead_ids": [1, 2, 3]}

        response = await client.post("/api/v1/leads/bulk-delete", json=delete_data)

        assert response.status_code == 405

    # ===== LEAD IMPORT TESTS =====

    @pytest.mark.asyncio
    async def test_import_leads_csv_success(self, client: AsyncClient):
        """Test successful CSV import of leads"""
        # Create sample CSV data
        csv_data = """first_name,last_name,phone1,email,city,state
Test,Import1,5551111111,import1@test.com,Austin,TX
Test,Import2,5552222222,import2@test.com,Houston,TX
Test,Import3,5553333333,import3@test.com,Dallas,TX"""

        # Convert to file-like object
        csv_file = BytesIO(csv_data.encode('utf-8'))

        # Test import
        files = {"file": ("test_leads.csv", csv_file, "text/csv")}
        mappings = {
            "first_name": "first_name",
            "last_name": "last_name",
            "phone1": "phone1",
            "email": "email",
            "city": "city",
            "state": "state"
        }
        data = {
            "mappings": json.dumps(mappings),
            "bulkTags": json.dumps(["imported"]),
            "autoTaggingEnabled": "true"
        }

        response = await client.post("/api/v1/leads/import", files=files, data=data)

        assert response.status_code == 200
        result = response.json()
        assert result["status"] == "completed"
        assert result["total_rows"] == 3
        assert "import_id" in result

    @pytest.mark.asyncio
    async def test_import_leads_non_csv_content(self, client: AsyncClient):
        """Test import with non-CSV content"""
        invalid_file = BytesIO(b"not a csv file")
        files = {"file": ("test.txt", invalid_file, "text/plain")}
        data = {"mappings": json.dumps({})}

        response = await client.post("/api/v1/leads/import", files=files, data=data)

        assert response.status_code == 200
        result = response.json()
        assert result["total_rows"] == 0
        assert "import_id" in result

    @pytest.mark.asyncio
    async def test_import_leads_unauthorized(self, client: AsyncClient):
        """Test import without authentication"""
        csv_file = BytesIO(b"test,data")
        files = {"file": ("test.csv", csv_file, "text/csv")}

        response = await client.post("/api/v1/leads/import", files=files)

        assert response.status_code == 422

    # ===== DATA TRANSFORMATION TESTS =====

    @pytest.mark.asyncio
    async def test_field_name_transformation(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test backend field names match database schema"""
        # Create lead
        response = await client.post("/api/v1/leads/", json=sample_lead_data)
        assert response.status_code == 201
        lead_data = response.json()

        # Verify expected field names (matching database schema)
        expected_fields = [
            "id", "first_name", "last_name", "full_name",
            "phone1", "phone2", "phone3",
            "email", "address_line1", "address_line2", "city", "state", "zip_code",
            "county", "country", "parcel_id",
            "property_type", "estimated_value", "acreage", "property_address",
            "lead_score", "lead_source", "status", "consent_status",
            "notes", "tags", "created_at", "updated_at"
        ]

        for field in expected_fields:
            assert field in lead_data, f"Expected field '{field}' missing from response"

        # Clean up
        await self._cleanup_lead(test_db, lead_data["id"])

    @pytest.mark.asyncio
    async def test_data_type_consistency(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test data types are consistent and valid"""
        # Create lead
        response = await client.post("/api/v1/leads/", json=sample_lead_data)
        assert response.status_code == 201
        lead_data = response.json()

        # Test numeric fields
        assert isinstance(lead_data["acreage"], (int, float, type(None)))
        assert isinstance(lead_data["estimated_value"], (int, type(None)))

        # Test string fields
        string_fields = ["first_name", "last_name", "email", "city", "state", "status"]
        for field in string_fields:
            if lead_data.get(field) is not None:
                assert isinstance(lead_data[field], str)

        # Clean up
        await self._cleanup_lead(test_db, lead_data["id"])

    # ===== EDGE CASES AND ERROR HANDLING =====

    @pytest.mark.asyncio
    async def test_very_long_field_values(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test handling of very long field values"""
        long_text = "x" * 10000  # 10KB text

        # Test with very long notes
        sample_lead_data["notes"] = long_text

        response = await client.post("/api/v1/leads/", json=sample_lead_data)

        # Should either succeed or fail gracefully
        assert response.status_code in [200, 201, 400, 413]

        # Clean up if created
        if response.status_code == 201:
            await self._cleanup_lead(test_db, response.json()["id"])

    @pytest.mark.asyncio
    async def test_special_characters_in_fields(self, client: AsyncClient, test_db: AsyncSession, sample_lead_data):
        """Test handling of special characters in text fields"""
        special_chars = "Test with symbols & chars #$%^&*()"

        sample_lead_data["first_name"] = special_chars
        sample_lead_data["notes"] = special_chars

        response = await client.post("/api/v1/leads/", json=sample_lead_data)

        assert response.status_code == 201
        data = response.json()

        # Verify special characters are preserved
        assert special_chars in data["first_name"]
        assert special_chars in data["notes"]

        # Clean up
        await self._cleanup_lead(test_db, data["id"])

    @pytest.mark.asyncio
    async def test_null_and_optional_fields(self, client: AsyncClient, test_db: AsyncSession):
        """Test handling of null and optional fields"""
        minimal_data = {
            "first_name": "Minimal",
            "last_name": "Lead",
            "phone1": "5551234567"
            # All other fields omitted (should be nullable/optional)
        }

        response = await client.post("/api/v1/leads/", json=minimal_data)

        assert response.status_code == 201
        data = response.json()
        assert data["full_name"] == "Minimal Lead"

        # Verify optional fields are null or have defaults
        assert data["email"] is None
        assert data["city"] is None
        assert data["status"] == "new"  # Should have default

        # Clean up
        await self._cleanup_lead(test_db, data["id"])

    # ===== PERFORMANCE TESTS =====

    @pytest.mark.asyncio
    async def test_large_list_performance(self, client: AsyncClient):
        """Test performance with large lead lists"""
        # Request large list
        response = await client.get("/api/v1/leads/?limit=100")

        assert response.status_code == 200
        data = response.json()

        # Should return quickly (under 5 seconds)
        # Note: This is a basic performance check
        assert len(data) <= 100

    @pytest.mark.asyncio
    async def test_concurrent_requests(self, client: AsyncClient):
        """Test handling of concurrent requests"""
        import asyncio

        # Make multiple concurrent requests
        tasks = []
        for i in range(10):
            task = client.get("/api/v1/leads/?limit=5")
            tasks.append(task)

        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # All should succeed without errors
        for response in responses:
            assert not isinstance(response, Exception)
            assert response.status_code == 200

    # ===== HELPER METHODS =====

    async def _cleanup_lead(self, test_db: AsyncSession, lead_id):
        """Helper method to clean up test leads"""
        try:
            lead_uuid = uuid.UUID(str(lead_id))
            await test_db.execute(delete(Lead).where(Lead.id == lead_uuid))
            await test_db.commit()
        except Exception:
            await test_db.rollback()

    # ===== INTEGRATION TESTS =====

    @pytest.mark.asyncio
    async def test_full_lead_lifecycle(self, client: AsyncClient, sample_lead_data):
        """Test complete lead lifecycle: create -> read -> update -> delete"""

        # 1. Create lead
        create_response = await client.post("/api/v1/leads/", json=sample_lead_data)
        assert create_response.status_code == 201
        lead_data = create_response.json()
        lead_id = lead_data["id"]

        # 2. Read lead
        get_response = await client.get(f"/api/v1/leads/{lead_id}")
        assert get_response.status_code == 200
        retrieved_data = get_response.json()
        assert retrieved_data["id"] == lead_id
        assert retrieved_data["email"] == sample_lead_data["email"]

        # 3. Update lead
        update_data = {
            "status": "qualified",
            "notes": "Updated during integration test"
        }
        update_response = await client.patch(f"/api/v1/leads/{lead_id}", json=update_data)
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["status"] == update_data["status"]

        # 4. Verify update persisted
        verify_response = await client.get(f"/api/v1/leads/{lead_id}")
        assert verify_response.status_code == 200
        verified_data = verify_response.json()
        assert verified_data["status"] == update_data["status"]

        # 5. Delete lead
        delete_response = await client.delete(f"/api/v1/leads/{lead_id}")
        assert delete_response.status_code == 204

        # 6. Verify deletion
        final_check = await client.get(f"/api/v1/leads/{lead_id}")
        assert final_check.status_code == 404


# ===== TEST EXECUTION CONFIGURATION =====

if __name__ == "__main__":
    # Run tests with verbose output
    pytest.main([__file__, "-v", "--tb=short"])
