from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
import time
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import create_tables
from app.api.v1 import api_router
from app.api.websockets import campaign_websocket_endpoint, dashboard_websocket_endpoint
from test_endpoint import test_router


# Configure logging
logging.basicConfig(level=getattr(logging, settings.LOG_LEVEL.upper()))
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting SMS Control Tower Backend...")
    
    # Skip table creation to avoid schema conflicts - use existing tables
    # await create_tables()
    logger.info("Database connection ready")
    
    yield
    
    # Shutdown
    logger.info("Shutting down SMS Control Tower Backend...")


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="TCPA-compliant SMS marketing backend API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)


# CORS middleware for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=False,  # Set to False when using wildcard origins
    allow_methods=["*"],
    allow_headers=["*"],
)


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Global exception handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions with consistent format for frontend"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "type": "http_error",
                "code": exc.status_code,
                "message": exc.detail,
                "details": None
            }
        }
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors with detailed info for frontend forms"""
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(x) for x in error["loc"][1:]),  # Skip 'body' prefix
            "message": error["msg"],
            "type": error["type"]
        })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": {
                "type": "validation_error",
                "code": 422,
                "message": "Validation failed",
                "details": {
                    "errors": errors
                }
            }
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected errors"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "error": {
                "type": "internal_error",
                "code": 500,
                "message": "Internal server error" if not settings.DEBUG else str(exc),
                "details": None
            }
        }
    )


# Health check endpoint
@app.get("/health", tags=["health"])
async def health_check():
    """Health check endpoint for load balancers and monitoring"""
    from app.core.database import health_check as db_health
    
    db_status = await db_health()
    
    return {
        "status": "healthy" if db_status else "unhealthy",
        "version": settings.VERSION,
        "database": "connected" if db_status else "disconnected",
        "timestamp": time.time()
    }


@app.get("/", tags=["root"])
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "version": settings.VERSION,
        "docs": "/docs",
        "api_v1": settings.API_V1_STR
    }


# Include test endpoint first (no authentication)
app.include_router(test_router, prefix="/test")

# Include main API router
app.include_router(api_router, prefix=settings.API_V1_STR)

app.add_api_websocket_route("/ws/campaigns/{campaign_id}", campaign_websocket_endpoint)
app.add_api_websocket_route("/ws/dashboard", dashboard_websocket_endpoint)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
