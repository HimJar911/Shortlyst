import os
import sys
import asyncio

# Windows: must be set before anything else touches asyncio
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes.analysis import router as analysis_router
from api.routes.jobs import router as jobs_router
from api.routes.health import router as health_router
from services.playwright_service import playwright_pool
from services.redis_queue import close_redis
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup — don't initialize Playwright here, let it initialize lazily on first use
    logger.info("Starting Shortlyst API...")
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    logger.info("Shortlyst API ready")
    yield
    # Shutdown
    logger.info("Shutting down...")
    await playwright_pool.shutdown()
    await close_redis()
    logger.info("Shutdown complete")


app = FastAPI(
    title="Shortlyst API",
    description="Multi-agent AI recruitment intelligence system",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, tags=["health"])
app.include_router(analysis_router, tags=["analysis"])
app.include_router(jobs_router, tags=["jobs"])


@app.get("/")
async def root():
    return {"message": "Shortlyst API", "docs": "/docs"}
