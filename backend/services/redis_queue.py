import json
from typing import Optional, Any
from datetime import datetime
import redis.asyncio as aioredis
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

_redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def close_redis():
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


# ─── Job Operations ───────────────────────────────────────────────


async def create_job(job_id: str, total_resumes: int, jd_text: str) -> None:
    redis = await get_redis()
    job_data = {
        "id": job_id,
        "status": "queued",
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat(),
        "total_resumes": total_resumes,
        "phase1_complete": 0,
        "phase2_complete": 0,
        "eliminated_phase1": 0,
        "eliminated_phase2": 0,
        "jd_text": jd_text,
        "error": None,
    }
    await redis.set(
        f"job:{job_id}",
        json.dumps(job_data),
        ex=86400,
    )
    logger.info(f"Job created: {job_id} with {total_resumes} resumes")


async def get_job(job_id: str) -> Optional[dict]:
    redis = await get_redis()
    raw = await redis.get(f"job:{job_id}")
    if not raw:
        return None
    return json.loads(raw)


async def update_job(job_id: str, updates: dict) -> None:
    redis = await get_redis()
    job = await get_job(job_id)
    if not job:
        logger.warning(f"Tried to update non-existent job: {job_id}")
        return
    job.update(updates)
    job["updated_at"] = datetime.utcnow().isoformat()
    await redis.set(f"job:{job_id}", json.dumps(job), ex=86400)


async def set_job_status(job_id: str, status: str) -> None:
    await update_job(job_id, {"status": status})
    logger.info(f"Job {job_id} status → {status}")


async def increment_job_counter(job_id: str, field: str, amount: int = 1) -> None:
    redis = await get_redis()
    job = await get_job(job_id)
    if not job:
        return
    job[field] = job.get(field, 0) + amount
    job["updated_at"] = datetime.utcnow().isoformat()
    await redis.set(f"job:{job_id}", json.dumps(job), ex=86400)


async def fail_job(job_id: str, error: str) -> None:
    await update_job(job_id, {"status": "failed", "error": error})
    logger.error(f"Job {job_id} failed: {error}")


# ─── Candidate Results ────────────────────────────────────────────


async def store_phase1_result(job_id: str, resume_index: int, result: dict) -> None:
    redis = await get_redis()
    await redis.set(
        f"job:{job_id}:phase1:{resume_index}",
        json.dumps(result),
        ex=86400,
    )


async def get_phase1_result(job_id: str, resume_index: int) -> Optional[dict]:
    redis = await get_redis()
    raw = await redis.get(f"job:{job_id}:phase1:{resume_index}")
    return json.loads(raw) if raw else None


async def store_phase2_result(job_id: str, resume_index: int, result: dict) -> None:
    redis = await get_redis()
    await redis.set(
        f"job:{job_id}:phase2:{resume_index}",
        json.dumps(result),
        ex=86400,
    )


async def get_phase2_result(job_id: str, resume_index: int) -> Optional[dict]:
    redis = await get_redis()
    raw = await redis.get(f"job:{job_id}:phase2:{resume_index}")
    return json.loads(raw) if raw else None


async def store_final_results(job_id: str, results: dict) -> None:
    redis = await get_redis()
    await redis.set(
        f"job:{job_id}:results",
        json.dumps(results),
        ex=86400,
    )
    logger.info(f"Final results stored for job {job_id}")


async def get_final_results(job_id: str) -> Optional[dict]:
    redis = await get_redis()
    raw = await redis.get(f"job:{job_id}:results")
    return json.loads(raw) if raw else None


# ─── Eliminated Candidates ────────────────────────────────────────


async def store_eliminated(
    job_id: str, resume_index: int, reason: str, phase: int, name: str = None
) -> None:
    redis = await get_redis()
    data = {
        "resume_index": resume_index,
        "name": name,
        "reason": reason,
        "phase": phase,
    }
    await redis.rpush(f"job:{job_id}:eliminated", json.dumps(data))
    await redis.expire(f"job:{job_id}:eliminated", 86400)


async def get_eliminated(job_id: str) -> list[dict]:
    redis = await get_redis()
    raw_list = await redis.lrange(f"job:{job_id}:eliminated", 0, -1)
    return [json.loads(r) for r in raw_list]


# ─── SSE Events ───────────────────────────────────────────────────


async def push_sse_event(job_id: str, event: str, data: dict) -> None:
    redis = await get_redis()
    payload = json.dumps({"event": event, "data": data})
    await redis.rpush(f"job:{job_id}:events", payload)
    await redis.expire(f"job:{job_id}:events", 86400)


async def get_sse_events(job_id: str, after_index: int = 0) -> list[dict]:
    redis = await get_redis()
    raw_list = await redis.lrange(f"job:{job_id}:events", after_index, -1)
    return [json.loads(r) for r in raw_list]


# ─── GitHub Cache ─────────────────────────────────────────────────


async def cache_github_data(username: str, data: dict) -> None:
    redis = await get_redis()
    await redis.set(
        f"github_cache:{username.lower()}",
        json.dumps(data),
        ex=3600,
    )


async def get_cached_github_data(username: str) -> Optional[dict]:
    redis = await get_redis()
    raw = await redis.get(f"github_cache:{username.lower()}")
    return json.loads(raw) if raw else None


# ─── Health Check ─────────────────────────────────────────────────


async def ping() -> bool:
    try:
        redis = await get_redis()
        await redis.ping()
        return True
    except Exception as e:
        logger.error(f"Redis ping failed: {e}")
        return False
