from fastapi import APIRouter
from services.redis_queue import ping

router = APIRouter()


@router.get("/health")
async def health():
    redis_ok = await ping()
    return {
        "status": "ok" if redis_ok else "degraded",
        "redis": "connected" if redis_ok else "disconnected",
    }
