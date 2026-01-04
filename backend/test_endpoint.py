from fastapi import APIRouter

test_router = APIRouter()

@test_router.get("/test")
async def simple_test():
    """Simple test endpoint without any authentication"""
    return {
        "success": True,
        "message": "Backend is working!",
        "templates": [
            {"id": 1, "name": "Welcome Message", "content": "Hi {{name}}, welcome!"},
            {"id": 2, "name": "Appointment Reminder", "content": "Your appointment is on {{date}}"}
        ]
    }