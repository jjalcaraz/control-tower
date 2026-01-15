#!/bin/bash

# SMS Control Tower Backend - Development Startup Script

set -e

echo "🚀 Starting SMS Control Tower Backend Development Environment..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📋 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your configuration before continuing!"
    echo "   - Set your Supabase credentials"
    echo "   - Set your Twilio credentials"
    echo "   - Configure your database URL"
    exit 1
fi

# Create upload directory
mkdir -p uploads logs

echo "🗄️  Creating database tables..."
python -c "
import asyncio
import app.models  # Import models to register them with SQLAlchemy
from app.core.database import create_tables
asyncio.run(create_tables())
print('Database tables created successfully!')
"

echo "✅ Environment setup complete!"
echo ""
echo "🔥 Starting FastAPI development server..."
echo "   API: http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Health: http://localhost:8000/health"
echo ""

# Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000