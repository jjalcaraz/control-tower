#!/usr/bin/env python3
"""
Create a temporary Lead model that matches the existing database schema
"""
import asyncio
from sqlalchemy import Column, String, DateTime, Text, JSON, Boolean, Integer, Float
from sqlalchemy.orm import declarative_base
from sqlalchemy.sql import func
from app.core.database import AsyncSessionLocal

# Create a base class
Base = declarative_base()

class TemporaryLead(Base):
    """Temporary Lead model that matches the existing database schema"""
    __tablename__ = "leads"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)

    # Owner information (existing schema)
    owner_name = Column(Text, nullable=False)
    phone_number_1 = Column(Text, nullable=False)
    phone_number_2 = Column(Text, nullable=True)
    phone_number_3 = Column(Text, nullable=True)
    email = Column(String, nullable=True, index=True)
    street_address = Column(Text, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)
    country = Column(String, default="US")

    # Property information
    property_type = Column(String, nullable=True)
    property_value = Column(Float, nullable=True)
    acreage = Column(Float, nullable=True)
    year_built = Column(Integer, nullable=True)
    bedrooms = Column(Integer, nullable=True)
    bathrooms = Column(Float, nullable=True)
    square_feet = Column(Integer, nullable=True)
    last_tax_assessment = Column(Float, nullable=True)
    property_taxes = Column(Float, nullable=True)
    tax_year = Column(Integer, nullable=True)

    # Lead information
    ownership_type = Column(Text, nullable=True)
    ownership_length = Column(Integer, nullable=True)
    occupancy_status = Column(Text, nullable=True)
    source_of_lead = Column(Text, nullable=True)
    lead_score = Column(String, default="cold", index=True)
    lead_source = Column(String, nullable=True, index=True)
    asking_price = Column(Float, nullable=True)
    assessed_value = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    status = Column(String, default="new", index=True)
    tags = Column(JSON, default=list)

    # Contact and tracking
    last_contacted = Column(DateTime(timezone=True), nullable=True)
    next_follow_up = Column(DateTime(timezone=True), nullable=True)
    do_not_contact = Column(Boolean, default=False)
    opt_out_reason = Column(String, nullable=True)
    opt_out_date = Column(DateTime(timezone=True), nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now())

async def test_temporary_model():
    """Test the temporary model"""
    async with AsyncSessionLocal() as session:
        try:
            result = await session.execute(text("SELECT COUNT(*) FROM leads"))
            count = result.scalar()
            print(f"✅ Successfully connected to leads table: {count} records")

            # Test a simple query with the temporary model
            from sqlalchemy import select
            query = select(TemporaryLead).limit(1)
            result = await session.execute(query)
            lead = result.scalar_one_or_none()

            if lead:
                print(f"✅ Successfully queried lead: {lead.owner_name}")
            else:
                print("ℹ️ No leads found in database")

        except Exception as e:
            print(f"❌ Error: {e}")
            return False

    return True

if __name__ == "__main__":
    print("🔧 Testing temporary Lead model...")
    success = asyncio.run(test_temporary_model())
    print(f"\\nResult: {'✅ SUCCESS' if success else '❌ FAILED'}")