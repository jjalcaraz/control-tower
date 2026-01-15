from pydantic import BaseModel, field_serializer
from typing import Generic, TypeVar, List, Optional, Any
from datetime import datetime

# Generic type for paginated responses
T = TypeVar('T')


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response matching frontend expectations"""
    success: bool = True
    data: List[T]
    pagination: dict


class SuccessResponse(BaseModel):
    """Standard success response format"""
    success: bool = True
    message: str
    data: Optional[Any] = None


class ErrorResponse(BaseModel):
    """Standard error response format"""
    success: bool = False
    error: dict


class FilterParams(BaseModel):
    """Common filtering parameters"""
    search: Optional[str] = None
    page: int = 1
    limit: int = 50
    sort_by: Optional[str] = None
    sort_order: str = "desc"  # asc or desc

    def get_offset(self) -> int:
        return (self.page - 1) * self.limit


class DateRangeFilter(BaseModel):
    """Date range filtering"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class BaseTimestamps(BaseModel):
    """Common timestamp fields for all models"""
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    @field_serializer('created_at', 'updated_at')
    def serialize_datetime(self, dt: Optional[datetime]) -> Optional[str]:
        return dt.isoformat() if dt else None
