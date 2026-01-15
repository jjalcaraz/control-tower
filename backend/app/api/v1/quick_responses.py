from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_quick_responses():
    return {
        "success": True,
        "data": [
            {"id": "qr_1", "title": "Intro", "content": "Hi {{firstName}}, thanks for reaching out."},
            {"id": "qr_2", "title": "Follow Up", "content": "Checking in to see if you had any questions."},
            {"id": "qr_3", "title": "Opt Out", "content": "Understood. You will no longer receive messages."},
        ],
    }
