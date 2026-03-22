import asyncio
import os
import shutil
from pipeline.phase1 import run_phase1_pipeline
from pipeline.phase2 import run_phase2_pipeline
from pipeline.phase3 import run_phase3_pipeline
from services.redis_queue import get_job, get_eliminated, fail_job, push_sse_event
from utils.logger import get_logger

logger = get_logger(__name__)


async def run_full_pipeline(job_id: str, file_paths: list[str], jd_text: str, *, require_github: bool = False) -> dict:
    """
    Master coordinator. Runs Phase 1 → Phase 2 → Phase 3.
    Handles errors and cleans up temp files.
    """
    logger.info(f"[{job_id}] Pipeline starting: {len(file_paths)} resumes")

    try:
        # Phase 1 — filter
        passed, eliminated, jd_requirements = await run_phase1_pipeline(
            job_id, file_paths, jd_text, require_github=require_github
        )

        if not passed:
            logger.info(f"[{job_id}] No candidates passed Phase 1")
            eliminated_records = await get_eliminated(job_id)
            return await run_phase3_pipeline(
                job_id=job_id,
                verified_candidates=[],
                eliminated_candidates=eliminated_records,
                jd_requirements=jd_requirements,
                total_submitted=len(file_paths),
            )

        # Phase 2 — deep verification
        verified = await run_phase2_pipeline(job_id, passed, jd_requirements)

        # Phase 3 — ranking
        eliminated_records = await get_eliminated(job_id)
        final_results = await run_phase3_pipeline(
            job_id=job_id,
            verified_candidates=verified,
            eliminated_candidates=eliminated_records,
            jd_requirements=jd_requirements,
            total_submitted=len(file_paths),
        )

        logger.info(f"[{job_id}] Pipeline complete")
        return final_results

    except Exception as e:
        logger.error(f"[{job_id}] Pipeline failed: {e}")
        await fail_job(job_id, str(e))
        await push_sse_event(job_id, "error", {"message": str(e)})
        raise

    finally:
        # Clean up temp files
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.remove(path)
            except Exception:
                pass
