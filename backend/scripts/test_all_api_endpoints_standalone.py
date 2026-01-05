#!/usr/bin/env python3
"""
Comprehensive API endpoint test script for SMS Control Tower
Tests all API endpoints systematically
"""
import asyncio
import sys
import os
import httpx
from datetime import datetime, date, timedelta

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

API_BASE = "http://192.168.86.24:8000/api/v1"
RESULTS = {"passed": [], "failed": [], "skipped": []}


def print_result(method: str, endpoint: str, status: str, details: str = ""):
    """Print formatted test result"""
    icon = "✅" if status == "PASS" else "❌" if status == "FAIL" else "⏭️ "
    print(f"{icon} {method:6} {endpoint:50} {status}")
    if details:
        print(f"         {details}")

    if status == "PASS":
        RESULTS["passed"].append(f"{method} {endpoint}")
    elif status == "FAIL":
        RESULTS["failed"].append(f"{method} {endpoint} - {details}")
    else:
        RESULTS["skipped"].append(f"{method} {endpoint}")


async def test_leads_api(client: httpx.AsyncClient):
    """Test Leads API endpoints"""
    print("\n=== Testing Leads API ===")

    # List leads
    try:
        response = await client.get(f"{API_BASE}/leads")
        if response.status_code == 200:
            print_result("GET", "/leads", "PASS", f"Found {len(response.json())} leads")
            leads = response.json()
        else:
            print_result("GET", "/leads", "FAIL", f"Status {response.status_code}")
            leads = []
    except Exception as e:
        print_result("GET", "/leads", "FAIL", str(e))
        leads = []

    # Create lead
    try:
        new_lead = {
            "first_name": "Test",
            "last_name": "User",
            "email": "test@example.com",
            "phone1": "+15551234567",
            "county": "Test County",
            "status": "new"
        }
        response = await client.post(f"{API_BASE}/leads", json=new_lead)
        if response.status_code == 201:
            print_result("POST", "/leads", "PASS", f"Created lead: {response.json().get('id')}")
            lead_id = response.json().get('id')
        else:
            print_result("POST", "/leads", "FAIL", f"Status {response.status_code}: {response.text[:100]}")
            lead_id = None
    except Exception as e:
        print_result("POST", "/leads", "FAIL", str(e))
        lead_id = None

    # Get specific lead
    if lead_id:
        try:
            response = await client.get(f"{API_BASE}/leads/{lead_id}")
            if response.status_code == 200:
                print_result("GET", f"/leads/{{id}}", "PASS")
            else:
                print_result("GET", f"/leads/{{id}}", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("GET", f"/leads/{{id}}", "FAIL", str(e))

    # Update lead
    if lead_id:
        try:
            update_data = {"first_name": "Updated"}
            response = await client.patch(f"{API_BASE}/leads/{lead_id}", json=update_data)
            if response.status_code == 200:
                print_result("PATCH", f"/leads/{{id}}", "PASS")
            else:
                print_result("PATCH", f"/leads/{{id}}", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("PATCH", f"/leads/{{id}}", "FAIL", str(e))

    # Delete lead
    if lead_id:
        try:
            response = await client.delete(f"{API_BASE}/leads/{lead_id}")
            if response.status_code == 204:
                print_result("DELETE", f"/leads/{{id}}", "PASS")
            else:
                print_result("DELETE", f"/leads/{{id}}", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("DELETE", f"/leads/{{id}}", "FAIL", str(e))


async def test_campaigns_api(client: httpx.AsyncClient):
    """Test Campaigns API endpoints"""
    print("\n=== Testing Campaigns API ===")

    # List campaigns
    try:
        response = await client.get(f"{API_BASE}/campaigns")
        if response.status_code == 200:
            print_result("GET", "/campaigns", "PASS", f"Found {len(response.json())} campaigns")
            campaigns = response.json()
        else:
            print_result("GET", "/campaigns", "FAIL", f"Status {response.status_code}")
            campaigns = []
    except Exception as e:
        print_result("GET", "/campaigns", "FAIL", str(e))
        campaigns = []

    # Create campaign
    try:
        new_campaign = {
            "name": "Test Campaign",
            "description": "Test description",
            "campaign_type": "blast"
        }
        response = await client.post(f"{API_BASE}/campaigns", json=new_campaign)
        if response.status_code == 201:
            print_result("POST", "/campaigns", "PASS", f"Created campaign: {response.json().get('id')}")
            campaign_id = response.json().get('id')
        else:
            print_result("POST", "/campaigns", "FAIL", f"Status {response.status_code}: {response.text[:100]}")
            campaign_id = None
    except Exception as e:
        print_result("POST", "/campaigns", "FAIL", str(e))
        campaign_id = None

    # Get specific campaign
    if campaign_id:
        try:
            response = await client.get(f"{API_BASE}/campaigns/{campaign_id}")
            if response.status_code == 200:
                print_result("GET", f"/campaigns/{{id}}", "PASS")
            else:
                print_result("GET", f"/campaigns/{{id}}", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("GET", f"/campaigns/{{id}}", "FAIL", str(e))

    # Get campaign stats
    if campaign_id:
        try:
            response = await client.get(f"{API_BASE}/campaigns/{campaign_id}/stats")
            if response.status_code == 200:
                print_result("GET", f"/campaigns/{{id}}/stats", "PASS")
            else:
                print_result("GET", f"/campaigns/{{id}}/stats", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("GET", f"/campaigns/{{id}}/stats", "FAIL", str(e))

    # Delete campaign
    if campaign_id:
        try:
            response = await client.delete(f"{API_BASE}/campaigns/{campaign_id}")
            if response.status_code == 204:
                print_result("DELETE", f"/campaigns/{{id}}", "PASS")
            else:
                print_result("DELETE", f"/campaigns/{{id}}", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("DELETE", f"/campaigns/{{id}}", "FAIL", str(e))


async def test_messages_api(client: httpx.AsyncClient):
    """Test Messages API endpoints"""
    print("\n=== Testing Messages API ===")

    # List messages
    try:
        response = await client.get(f"{API_BASE}/messages")
        if response.status_code == 200:
            print_result("GET", "/messages", "PASS", f"Found {len(response.json())} messages")
        else:
            print_result("GET", "/messages", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/messages", "FAIL", str(e))

    # Test conversations endpoint
    try:
        response = await client.get(f"{API_BASE}/messages/conversations")
        # This might be routed wrong - test both ways
        if response.status_code == 200:
            print_result("GET", "/messages/conversations", "PASS")
        else:
            # Try with lead_id
            response = await client.get(f"{API_BASE}/messages/conversations/00000000-0000-0000-0000-000000000001")
            if response.status_code == 200:
                print_result("GET", "/messages/conversations/{id}", "PASS")
            else:
                print_result("GET", "/messages/conversations", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/messages/conversations", "FAIL", str(e))


async def test_templates_api(client: httpx.AsyncClient):
    """Test Templates API endpoints"""
    print("\n=== Testing Templates API ===")

    # List templates
    try:
        response = await client.get(f"{API_BASE}/templates")
        if response.status_code == 200:
            print_result("GET", "/templates", "PASS", f"Found {len(response.json())} templates")
            templates = response.json()
        else:
            print_result("GET", "/templates", "FAIL", f"Status {response.status_code}")
            templates = []
    except Exception as e:
        print_result("GET", "/templates", "FAIL", str(e))
        templates = []

    # Create template
    try:
        new_template = {
            "name": "Test Template",
            "category": "test",
            "content": "Hello {first_name}, this is a test message."
        }
        response = await client.post(f"{API_BASE}/templates", json=new_template)
        if response.status_code == 201:
            print_result("POST", "/templates", "PASS", f"Created template: {response.json().get('id')}")
            template_id = response.json().get('id')
        else:
            print_result("POST", "/templates", "FAIL", f"Status {response.status_code}: {response.text[:100]}")
            template_id = None
    except Exception as e:
        print_result("POST", "/templates", "FAIL", str(e))
        template_id = None

    # Test template endpoint
    if template_id:
        try:
            variables = {"first_name": "John"}
            response = await client.post(f"{API_BASE}/templates/{template_id}/test", json=variables)
            if response.status_code == 200:
                print_result("POST", f"/templates/{{id}}/test", "PASS")
            else:
                print_result("POST", f"/templates/{{id}}/test", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("POST", f"/templates/{{id}}/test", "FAIL", str(e))

    # Delete template
    if template_id:
        try:
            response = await client.delete(f"{API_BASE}/templates/{template_id}")
            if response.status_code == 204:
                print_result("DELETE", f"/templates/{{id}}", "PASS")
            else:
                print_result("DELETE", f"/templates/{{id}}", "FAIL", f"Status {response.status_code}")
        except Exception as e:
            print_result("DELETE", f"/templates/{{id}}", "FAIL", str(e))


async def test_phone_numbers_api(client: httpx.AsyncClient):
    """Test Phone Numbers API endpoints"""
    print("\n=== Testing Phone Numbers API ===")

    # List phone numbers
    try:
        response = await client.get(f"{API_BASE}/phone-numbers")
        if response.status_code == 200:
            print_result("GET", "/phone-numbers", "PASS", f"Found {len(response.json())} numbers")
        else:
            print_result("GET", "/phone-numbers", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/phone-numbers", "FAIL", str(e))


async def test_analytics_api(client: httpx.AsyncClient):
    """Test Analytics API endpoints"""
    print("\n=== Testing Analytics API ===")

    # Dashboard metrics
    try:
        response = await client.get(f"{API_BASE}/analytics/dashboard")
        if response.status_code == 200:
            print_result("GET", "/analytics/dashboard", "PASS")
        else:
            print_result("GET", "/analytics/dashboard", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/analytics/dashboard", "FAIL", str(e))

    # Trends
    try:
        response = await client.get(f"{API_BASE}/analytics/trends?date_range=7d")
        if response.status_code == 200:
            print_result("GET", "/analytics/trends", "PASS")
        else:
            print_result("GET", "/analytics/trends", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/analytics/trends", "FAIL", str(e))

    # Conversion funnel
    try:
        response = await client.get(f"{API_BASE}/analytics/conversion-funnel")
        if response.status_code == 200:
            print_result("GET", "/analytics/conversion-funnel", "PASS")
        else:
            print_result("GET", "/analytics/conversion-funnel", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/analytics/conversion-funnel", "FAIL", str(e))


async def test_compliance_api(client: httpx.AsyncClient):
    """Test Compliance API endpoints"""
    print("\n=== Testing Compliance API ===")

    # List opt-outs
    try:
        response = await client.get(f"{API_BASE}/compliance/opt-outs")
        if response.status_code == 200:
            print_result("GET", "/compliance/opt-outs", "PASS")
        else:
            print_result("GET", "/compliance/opt-outs", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/compliance/opt-outs", "FAIL", str(e))

    # Audit logs
    try:
        response = await client.get(f"{API_BASE}/compliance/audit-logs")
        if response.status_code == 200:
            print_result("GET", "/compliance/audit-logs", "PASS")
        else:
            print_result("GET", "/compliance/audit-logs", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/compliance/audit-logs", "FAIL", str(e))


async def test_integrations_api(client: httpx.AsyncClient):
    """Test Integrations API endpoints"""
    print("\n=== Testing Integrations API ===")

    # Twilio status
    try:
        response = await client.get(f"{API_BASE}/integrations/twilio/status")
        if response.status_code == 200:
            data = response.json()
            print_result("GET", "/integrations/twilio/status", "PASS", f"Configured: {data.get('is_configured')}")
        else:
            print_result("GET", "/integrations/twilio/status", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("GET", "/integrations/twilio/status", "FAIL", str(e))

    # Test Twilio connection
    try:
        response = await client.post(f"{API_BASE}/integrations/twilio/test")
        if response.status_code == 200:
            data = response.json()
            print_result("POST", "/integrations/twilio/test", "PASS", f"Status: {data.get('status')}")
        else:
            print_result("POST", "/integrations/twilio/test", "FAIL", f"Status {response.status_code}")
    except Exception as e:
        print_result("POST", "/integrations/twilio/test", "FAIL", str(e))


async def main():
    """Run all API tests"""
    print("=" * 80)
    print("SMS Control Tower - Comprehensive API Endpoint Test")
    print("=" * 80)
    print(f"Testing API at: {API_BASE}")
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        await test_leads_api(client)
        await test_campaigns_api(client)
        await test_messages_api(client)
        await test_templates_api(client)
        await test_phone_numbers_api(client)
        await test_analytics_api(client)
        await test_compliance_api(client)
        await test_integrations_api(client)

    # Print summary
    print("\n" + "=" * 80)
    print("TEST SUMMARY")
    print("=" * 80)
    print(f"✅ Passed: {len(RESULTS['passed'])}")
    print(f"❌ Failed: {len(RESULTS['failed'])}")
    print(f"⏭️  Skipped: {len(RESULTS['skipped'])}")
    print(f"Total: {len(RESULTS['passed']) + len(RESULTS['failed'])}")

    if RESULTS['failed']:
        print("\nFailed endpoints:")
        for failure in RESULTS['failed']:
            print(f"  - {failure}")

    print("=" * 80)
    print(f"Completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    # Return exit code
    return 0 if not RESULTS['failed'] else 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
