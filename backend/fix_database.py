#!/usr/bin/env python3
"""
Fix database schema issues by dropping and recreating tables
"""
import asyncio
from app.core.database import engine, drop_tables, create_tables
from app.core.config import settings

async def fix_database():
    """Drop all tables and recreate them with correct schema"""
    print("Dropping all tables...")
    await drop_tables()
    print("Creating all tables with correct schema...")
    await create_tables()
    print("Database schema fixed!")

if __name__ == "__main__":
    asyncio.run(fix_database())