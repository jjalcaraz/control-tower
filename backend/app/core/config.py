from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path
import os
from dotenv import load_dotenv

ROOT_DIR = Path(__file__).resolve().parents[3]
BACKEND_DIR = Path(__file__).resolve().parents[2]

# Load environment variables from .env file
_env_file = BACKEND_DIR / ".env"
if _env_file.exists():
    load_dotenv(_env_file)
else:
    # Fallback to .env.local
    load_dotenv(BACKEND_DIR / ".env.local")


class Settings(BaseSettings):
    # Application
    PROJECT_NAME: str = "SMS Control Tower"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # CORS
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "https://localhost:3000",
        "https://localhost:3001",
        "http://192.168.86.24:3000",
        "http://192.168.86.24:3001",
        "https://192.168.86.24:3000",
        "https://192.168.86.24:3001",
        "http://0.0.0.0:3000",
        "http://0.0.0.0:3001"
    ]
    
    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE: str
    DATABASE_URL: str
    
    # JWT Settings (from Supabase)
    JWT_ALGORITHM: str = "HS256"
    JWT_SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Twilio Configuration
    TWILIO_ACCOUNT_SID: str
    TWILIO_AUTH_TOKEN: str
    TWILIO_PHONE_NUMBER: Optional[str] = None
    TWILIO_MESSAGING_SERVICE_SID: Optional[str] = None
    TWILIO_WEBHOOK_URL: Optional[str] = None
    
    # Redis Configuration
    REDIS_URL: str = "redis://localhost:6379/0"
    
    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"
    
    # SMS Settings
    DEFAULT_RATE_LIMIT_MPS: int = 3  # Messages per second per phone number
    DEFAULT_QUIET_HOURS_START: str = "20:00"  # 8 PM
    DEFAULT_QUIET_HOURS_END: str = "08:00"    # 8 AM
    DEFAULT_TIMEZONE: str = "America/Chicago"
    
    # File Upload Settings
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB
    UPLOAD_DIR: str = "uploads"
    
    # Logging
    LOG_LEVEL: str = "INFO"
    SENTRY_DSN: Optional[str] = None
    
    # Development
    DEBUG: bool = False
    TESTING: bool = False

    class Config:
        env_file = [
            str(BACKEND_DIR / ".env"),           # Primary: backend/.env
            str(BACKEND_DIR / ".env.local"),     # Fallback: backend/.env.local
            str(ROOT_DIR / ".env.local"),        # Fallback: root .env.local
        ]
        case_sensitive = True
        extra = "ignore"


settings = Settings()


# Ensure upload directory exists
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
