import asyncio
from agents.phase1_filter import extract_jd_requirements, run_phase1_batch
from services.redis_queue import (
    set_job_status,
    store_phase1_result,
    store_eliminated,
    increment_job_counter,
    push_sse_event,
)
from utils.logger import get_logger

logger = get_logger(__name__)


async def run_phase1_pipeline(
    job_id: str,
    file_paths: list[str],
    jd_text: str,
    *,
    require_github: bool = False,
) -> tuple[list[dict], list[dict], dict]:
    await set_job_status(job_id, "phase1")
    await push_sse_event(
        job_id, "phase_start", {"phase": "phase1", "message": "Filtering resumes..."}
    )

    jd_requirements = await extract_jd_requirements(jd_text)
    # If the user toggled "Require GitHub" in the UI, override the LLM flag
    if require_github:
        jd_requirements["requires_github"] = True
    await push_sse_event(
        job_id,
        "jd_parsed",
        {
            "role_title": jd_requirements.get("role_title"),
            "required_skills": jd_requirements.get("required_skills", []),
        },
    )

    passed, eliminated = await run_phase1_batch(file_paths, jd_requirements)

    # Store results and push SSE events
    for result in passed:
        await store_phase1_result(job_id, result["resume_index"], result)
        await increment_job_counter(job_id, "phase1_complete")
        await push_sse_event(
            job_id,
            "candidate_passed_phase1",
            {
                "resume_index": result["resume_index"],
                "file_name": result["file_name"],
                "name": (
                    result["candidate_info"].get("name")
                    if result.get("candidate_info")
                    else None
                ),
            },
        )

    for result in eliminated:
        await store_eliminated(
            job_id,
            result["resume_index"],
            result["reason"],
            phase=1,
            name=(
                result["candidate_info"].get("name")
                if result.get("candidate_info")
                else None
            ),
        )
        await increment_job_counter(job_id, "eliminated_phase1")
        await push_sse_event(
            job_id,
            "candidate_eliminated",
            {
                "resume_index": result["resume_index"],
                "file_name": result["file_name"],
                "name": (
                    result["candidate_info"].get("name")
                    if result.get("candidate_info")
                    else None
                ),
                "phase": 1,
                "reason": result["reason"],
            },
        )

    logger.info(
        f"[{job_id}] Phase 1 done: {len(passed)} passed, {len(eliminated)} eliminated"
    )
    await push_sse_event(
        job_id,
        "phase_complete",
        {
            "phase": "phase1",
            "passed": len(passed),
            "eliminated": len(eliminated),
        },
    )

    return passed, eliminated, jd_requirements
