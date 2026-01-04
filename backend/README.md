# SMS Control Tower Backend

TCPA-compliant SMS marketing backend API built with FastAPI, Supabase, and Twilio integration.

## Features

### Core API Features
- ✅ **Authentication**: Supabase JWT integration with role-based access control
- ✅ **Lead Management**: CRUD operations with CSV import/export
- ✅ **Campaign Management**: SMS campaign creation and monitoring
- ✅ **Template System**: Message template management with rotation
- ✅ **Two-Way Messaging**: Real-time SMS conversations
- ✅ **Analytics Dashboard**: Performance metrics and reporting
- ✅ **Compliance**: TCPA compliance with opt-out management

### Infrastructure
- **FastAPI**: High-performance async Python web framework
- **Supabase**: PostgreSQL database with Row Level Security
- **Twilio**: SMS messaging provider integration
- **Celery + Redis**: Background task processing
- **WebSocket**: Real-time dashboard updates

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/          # API endpoints
│   ├── core/            # Core configuration and utilities
│   ├── models/          # SQLAlchemy database models
│   ├── schemas/         # Pydantic request/response schemas
│   ├── services/        # Business logic services
│   ├── workers/         # Celery background workers
│   └── db/              # Database migrations
├── docs/                # API documentation
└── tests/               # Test suites
```

## Development Setup

### Prerequisites
- Python 3.9+
- PostgreSQL (via Supabase)
- Redis server
- Twilio account

### Installation

1. **Create virtual environment**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Environment configuration**:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**:
   ```bash
   # Database tables are created automatically on startup
   # Or run manually:
   python -c "from app.core.database import create_tables; import asyncio; asyncio.run(create_tables())"
   ```

5. **Start development server**:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Development Commands

```bash
# Start API server
uvicorn app.main:app --reload

# Run tests
pytest

# Run tests with coverage
pytest --cov=app --cov-report=html

# Format code
black app/
isort app/

# Lint code
flake8 app/
mypy app/

# Start Celery worker
celery -A app.workers.celery_app worker --loglevel=info

# Start Celery monitoring
celery -A app.workers.celery_app flower
```

## API Documentation

### Authentication
All API endpoints require Supabase JWT authentication:
```bash
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     https://api.yourapp.com/api/v1/leads
```

### Key Endpoints

#### Leads Management
- `GET /api/v1/leads` - List leads with filtering
- `POST /api/v1/leads` - Create new lead
- `GET /api/v1/leads/{id}` - Get lead details
- `PATCH /api/v1/leads/{id}` - Update lead
- `DELETE /api/v1/leads/{id}` - Delete lead
- `POST /api/v1/leads/import/preview` - Preview CSV import
- `POST /api/v1/leads/import/execute` - Execute CSV import

#### Campaign Management
- `GET /api/v1/campaigns` - List campaigns
- `POST /api/v1/campaigns` - Create campaign
- `GET /api/v1/campaigns/{id}` - Get campaign details
- `POST /api/v1/campaigns/{id}/start` - Start campaign
- `POST /api/v1/campaigns/{id}/pause` - Pause campaign

#### Analytics
- `GET /api/v1/analytics/dashboard` - Dashboard metrics
- `GET /api/v1/analytics/campaigns/{id}` - Campaign analytics

#### WebSocket
- `WS /ws/campaigns/{id}` - Real-time campaign updates

### Interactive API Documentation
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Database Schema

### Core Tables
1. **organizations** - Multi-tenant organization data
2. **users** - User accounts with role-based access
3. **leads** - Lead contact information and metadata
4. **campaigns** - SMS campaign configurations
5. **campaign_targets** - Individual lead targets per campaign
6. **templates** - Message templates with variables
7. **messages** - SMS message history and status
8. **phone_numbers** - SMS phone number pool
9. **suppressions** - Opt-out and compliance management
10. **conversations** - Message threading and conversations

### Row Level Security (RLS)
All tables implement Supabase RLS policies for multi-tenant data isolation.

## Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_ROLE=your-service-role-key

# Authentication
JWT_SECRET_KEY=your-jwt-secret

# Twilio
TWILIO_ACCOUNT_SID=your-account-sid
TWILIO_AUTH_TOKEN=your-auth-token
TWILIO_MESSAGING_SERVICE_SID=your-messaging-service

# Redis
REDIS_URL=redis://localhost:6379/0
```

### Optional Configuration
- `DEBUG=true` - Enable debug mode
- `LOG_LEVEL=INFO` - Set logging level
- `SENTRY_DSN=your-dsn` - Error tracking
- `MAX_UPLOAD_SIZE=10485760` - File upload limit

## Testing

### Running Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_leads.py

# Run tests matching pattern
pytest -k "test_create_lead"
```

### Test Categories
- **Unit Tests**: Individual function testing
- **Integration Tests**: API endpoint testing
- **E2E Tests**: Complete workflow testing
- **Load Tests**: Performance and scalability testing

## Deployment

### Production Setup

1. **Database migrations**:
   ```bash
   alembic upgrade head
   ```

2. **Environment variables**:
   - Set all required environment variables
   - Use strong JWT secrets
   - Configure proper CORS origins

3. **Process management**:
   ```bash
   # API server
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

   # Background workers
   celery -A app.workers.celery_app worker --concurrency=4

   # Monitoring
   celery -A app.workers.celery_app flower
   ```

### Docker Deployment
```bash
# Build image
docker build -t sms-control-tower-backend .

# Run container
docker run -p 8000:8000 --env-file .env sms-control-tower-backend
```

### Health Checks
- **API Health**: `GET /health`
- **Database**: Automatic connection testing
- **Redis**: Queue health monitoring
- **Celery**: Worker status monitoring

## Monitoring and Logging

### Application Monitoring
- **Health endpoints**: Built-in health checks
- **Structured logging**: JSON formatted logs
- **Error tracking**: Sentry integration (optional)
- **Metrics**: Prometheus metrics (optional)

### SMS Delivery Monitoring
- **Delivery rates**: Track per phone number
- **Error tracking**: Twilio webhook integration
- **Compliance monitoring**: Opt-out rate tracking

## Security

### Authentication & Authorization
- **JWT tokens**: Supabase integration
- **Role-based access**: Admin, Campaign Manager, Operator, Viewer
- **API rate limiting**: Prevent abuse
- **Input validation**: Pydantic schema validation

### Data Protection
- **Encryption**: Sensitive data encryption at rest
- **PII handling**: GDPR compliant data handling
- **Audit trails**: Complete action logging
- **Multi-tenancy**: RLS data isolation

### SMS Compliance
- **TCPA compliance**: Automated opt-out processing
- **Quiet hours**: Time-based sending restrictions
- **Rate limiting**: Carrier-friendly sending rates
- **DNC integration**: Do Not Call list checking

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow code standards**: Use Black, isort, flake8
4. **Write tests**: Maintain >85% coverage
5. **Update documentation**: Keep docs current
6. **Submit pull request**: Detailed description required

### Code Standards
- **Type hints**: Required for all functions
- **Docstrings**: Required for public functions
- **Error handling**: Proper exception handling
- **Async/await**: Use async patterns throughout

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Check DATABASE_URL format
   - Verify Supabase credentials
   - Test network connectivity

2. **Authentication failures**:
   - Verify JWT_SECRET_KEY matches Supabase
   - Check token expiration
   - Validate user permissions

3. **SMS sending issues**:
   - Verify Twilio credentials
   - Check phone number format
   - Review rate limiting settings

4. **Import failures**:
   - Check CSV format and encoding
   - Verify column mappings
   - Review validation errors

### Getting Help
- **Documentation**: Check inline comments and docstrings
- **Logs**: Review application logs for errors
- **Health checks**: Use `/health` endpoint for diagnostics
- **Issues**: Report bugs in the project repository

## License

Private - All rights reserved