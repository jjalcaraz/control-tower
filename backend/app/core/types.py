"""
Custom types for cross-database compatibility
"""
from sqlalchemy import String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.types import TypeDecorator, CHAR
from app.core.config import settings
import uuid


class UniversalUUID(TypeDecorator):
    """Universal UUID type that works with both SQLite and PostgreSQL"""
    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(CHAR(36))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        elif dialect.name == 'postgresql':
            return value
        else:
            if isinstance(value, uuid.UUID):
                return str(value)
            else:
                return str(value)

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        else:
            if not isinstance(value, uuid.UUID):
                return uuid.UUID(value)
            else:
                return value


# Use the appropriate UUID type based on database
def get_uuid_column():
    """Get appropriate UUID column type for current database"""
    if settings.DATABASE_URL.startswith("sqlite"):
        return String(36)  # SQLite uses string UUIDs
    else:
        return UUID(as_uuid=True)  # PostgreSQL uses native UUIDs