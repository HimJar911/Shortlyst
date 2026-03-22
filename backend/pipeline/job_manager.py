import asyncio
import uuid
from services.redis_queue import create_job
from utils.logger import get_logger

logger = get_logger(__name__)


async def create_analysis_job(total_resumes: int, jd_text: str) -> str:
    """Create a new job in Redis and return the job ID."""
    job_id = str(uuid.uuid4())
    await create_job(job_id, total_resumes, jd_text)
    logger.info(f"Created job {job_id} for {total_resumes} resumes")
    return job_id


async def run_pipeline_background(job_id: str, file_paths: list[str], jd_text: str, require_github: bool = False):
    """Run the full pipeline as a background asyncio task."""
    from pipeline.orchestrator import run_full_pipeline

    try:
        await run_full_pipeline(job_id, file_paths, jd_text, require_github=require_github)
    except Exception as e:
        logger.error(f"Background pipeline task failed for {job_id}: {e}")
