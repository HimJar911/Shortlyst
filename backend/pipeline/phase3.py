from agents.ranking_agent import rank_candidates
from services.redis_queue import (
    set_job_status,
    store_final_results,
    get_eliminated,
    push_sse_event,
)
from utils.logger import get_logger

logger = get_logger(__name__)


async def run_phase3_pipeline(
    job_id: str,
    verified_candidates: list[dict],
    eliminated_candidates: list[dict],
    jd_requirements: dict,
    total_submitted: int,
) -> dict:
    await set_job_status(job_id, "phase3")
    await push_sse_event(
        job_id,
        "phase_start",
        {
            "phase": "phase3",
            "message": f"Ranking {len(verified_candidates)} candidates...",
        },
    )

    rankings = await rank_candidates(verified_candidates, jd_requirements)

    # Build final result object
    final_results = {
        "job_id": job_id,
        "total_submitted": total_submitted,
        "total_eliminated_phase1": sum(
            1 for e in eliminated_candidates if e.get("phase") == 1
        ),
        "total_eliminated_phase2": sum(
            1 for e in eliminated_candidates if e.get("phase") == 2
        ),
        "total_ranked": len(rankings),
        "ranked_candidates": rankings,
        "eliminated_candidates": eliminated_candidates,
        "jd_requirements": jd_requirements,
    }

    await store_final_results(job_id, final_results)
    await set_job_status(job_id, "complete")
    await push_sse_event(
        job_id,
        "complete",
        {
            "total_ranked": len(rankings),
            "top_candidate": rankings[0]["candidate"]["name"] if rankings else None,
        },
    )

    logger.info(f"[{job_id}] Phase 3 done: {len(rankings)} candidates ranked")
    return final_results
