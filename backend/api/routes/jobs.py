import asyncio
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from services.redis_queue import get_job, get_final_results, get_sse_events
from utils.logger import get_logger
import json

router = APIRouter()
logger = get_logger(__name__)


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@router.get("/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.get("status") != "complete":
        raise HTTPException(
            status_code=202, detail=f"Job not complete yet: {job.get('status')}"
        )
    results = await get_final_results(job_id)
    if not results:
        raise HTTPException(status_code=404, detail="Results not found")
    return results


@router.get("/jobs/{job_id}/stream")
async def stream_job_events(job_id: str):
    """SSE endpoint — streams events as they happen."""
    job = await get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    async def event_generator():
        last_index = 0
        while True:
            events = await get_sse_events(job_id, after_index=last_index)
            for event in events:
                data = json.dumps(event)
                yield f"data: {data}\n\n"
                last_index += 1

            # Check if job is done
            job = await get_job(job_id)
            if job and job.get("status") in ("complete", "failed"):
                # Flush remaining events then close
                events = await get_sse_events(job_id, after_index=last_index)
                for event in events:
                    data = json.dumps(event)
                    yield f"data: {data}\n\n"
                yield 'data: {"event": "stream_end"}\n\n'
                break

            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
