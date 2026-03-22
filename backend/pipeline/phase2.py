import asyncio
from agents.github_auditor import run_github_audit
from agents.deployment_verifier import verify_deployments
from agents.code_analyzer import run_code_analysis
from services.redis_queue import (
    store_phase2_result,
    store_eliminated,
    increment_job_counter,
    push_sse_event,
)
from utils.logger import get_logger

logger = get_logger(__name__)


async def run_phase2_for_candidate(
    job_id: str,
    candidate: dict,
    jd_requirements: dict,
) -> dict | None:
    mechanical = candidate.get("mechanical", {})
    candidate_info = candidate.get("candidate_info", {})
    resume_index = candidate["resume_index"]
    file_name = candidate["file_name"]
    name = candidate_info.get("name", file_name)

    github_username = mechanical.get("github_username")
    all_urls = mechanical.get("all_urls", [])
    claimed_skills = candidate_info.get("skills", [])
    required_skills = jd_requirements.get("required_skills", []) + jd_requirements.get(
        "required_skills_any_of", []
    )
    preferred_skills = jd_requirements.get("preferred_skills", [])

    logger.info(f"[{job_id}] Phase 2 starting for {name}")
    await push_sse_event(
        job_id,
        "phase2_candidate_start",
        {
            "resume_index": resume_index,
            "name": name,
        },
    )

    try:
        # Run github audit + deployment verifier in parallel
        github_signal, deployment_signal = await asyncio.gather(
            run_github_audit(github_username, required_skills, preferred_skills),
            verify_deployments(all_urls),
        )

        # Code analysis uses github signal
        # Verify only JD skills — pass any_of group separately for correct slot counting
        required_any_of = jd_requirements.get("required_skills_any_of", [])
        code_analysis = await run_code_analysis(
            github_signal=github_signal,
            claimed_skills=claimed_skills,
            required_skills=required_skills,
            required_any_of=required_any_of,
        )

        verified = {
            "resume_index": resume_index,
            "file_name": file_name,
            "name": name,
            "email": mechanical.get("email"),
            "github_signal": github_signal,
            "deployment_signal": deployment_signal,
            "verified_skills": code_analysis.get("skill_verdicts", []),
            "required_verdicts": code_analysis.get("required_verdicts", []),
            "any_of_verdicts": code_analysis.get("any_of_verdicts", []),
            "any_of_satisfied": code_analysis.get("any_of_satisfied", False),
            "experience_years": candidate_info.get("total_experience_years")
            or candidate_info.get("years_experience"),
            "education": candidate_info.get("education", []),
            "candidate_info": candidate_info,
            "mechanical": mechanical,
        }

        await store_phase2_result(job_id, resume_index, verified)
        await increment_job_counter(job_id, "phase2_complete")
        await push_sse_event(
            job_id,
            "phase2_candidate_complete",
            {
                "resume_index": resume_index,
                "name": name,
                "github_quality": github_signal.get("overall_code_quality"),
                "deployment_signal": deployment_signal.get("signal"),
            },
        )

        logger.info(
            f"[{job_id}] Phase 2 complete for {name}: "
            f"github={github_signal.get('overall_code_quality')} "
            f"deployment={deployment_signal.get('signal')}"
        )
        return verified

    except Exception as e:
        logger.error(f"[{job_id}] Phase 2 failed for {name}: {e}")
        await push_sse_event(
            job_id,
            "phase2_candidate_error",
            {
                "resume_index": resume_index,
                "name": name,
                "error": str(e),
            },
        )
        return None


async def run_phase2_pipeline(
    job_id: str,
    passed_candidates: list[dict],
    jd_requirements: dict,
) -> list[dict]:
    from services.redis_queue import set_job_status

    await set_job_status(job_id, "phase2")
    await push_sse_event(
        job_id,
        "phase_start",
        {
            "phase": "phase2",
            "message": f"Deep verification for {len(passed_candidates)} candidates...",
            "total": len(passed_candidates),
        },
    )

    # All candidates verified in parallel
    tasks = [
        run_phase2_for_candidate(job_id, candidate, jd_requirements)
        for candidate in passed_candidates
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    verified = []
    for r in results:
        if isinstance(r, Exception):
            logger.error(f"[{job_id}] Phase 2 task exception: {r}")
        elif r is not None:
            verified.append(r)

    logger.info(f"[{job_id}] Phase 2 done: {len(verified)} verified")
    await push_sse_event(
        job_id,
        "phase_complete",
        {
            "phase": "phase2",
            "verified": len(verified),
        },
    )

    return verified
