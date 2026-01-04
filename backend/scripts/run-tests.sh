#!/bin/bash

# SMS Control Tower Backend - Test Runner Script

set -e

echo "🧪 Running SMS Control Tower Backend Tests..."

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# Set test environment
export TESTING=true
export DATABASE_URL="sqlite+aiosqlite:///:memory:"

echo "📋 Running pytest with coverage..."

# Run tests with coverage
pytest tests/ \
    --cov=app \
    --cov-report=html \
    --cov-report=term \
    --cov-fail-under=70 \
    -v \
    --tb=short

echo ""
echo "✅ Tests completed!"
echo "📊 Coverage report generated in htmlcov/"
echo ""