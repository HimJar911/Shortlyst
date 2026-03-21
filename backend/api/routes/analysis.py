import os
import asyncio
import shutil
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from typing import List
from pipeline.job_manager import create_analysis_job, run_pipeline_background
from services.redis_queue import get_job
from config import settings
from utils.logger import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/analyze")
async def analyze(
    resumes: List[UploadFile] = File(...),
    jd_text: str = Form(...),
):
    # Validate
    if not resumes:
        raise HTTPException(status_code=400, detail="No resumes uploaded")
    if len(resumes) > settings.MAX_RESUMES_PER_JOB:
        raise HTTPException(
            status_code=400,
            detail=f"Max {settings.MAX_RESUMES_PER_JOB} resumes per job",
        )
    if not jd_text.strip():
        raise HTTPException(status_code=400, detail="Job description is required")

    # Save uploaded files to temp dir
    os.makedirs(settings.TEMP_DIR, exist_ok=True)
    job_id = None

    try:
        job_id = await create_analysis_job(len(resumes), jd_text)
        temp_dir = os.path.join(settings.TEMP_DIR, job_id)
        os.makedirs(temp_dir, exist_ok=True)

        file_paths = []
        for resume in resumes:
            # Validate file type
            if not resume.filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=400, detail=f"{resume.filename} is not a PDF"
                )

            # Validate file size
            content = await resume.read()
            if len(content) > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                raise HTTPException(
                    status_code=400,
                    detail=f"{resume.filename} exceeds {settings.MAX_FILE_SIZE_MB}MB limit",
                )

            file_path = os.path.join(temp_dir, resume.filename)
            with open(file_path, "wb") as f:
                f.write(content)
            file_paths.append(file_path)

        # Launch pipeline as background task — return job_id immediately
        asyncio.create_task(run_pipeline_background(job_id, file_paths, jd_text))

        logger.info(f"Job {job_id} started with {len(file_paths)} resumes")
        return {
            "job_id": job_id,
            "status": "queued",
            "total_resumes": len(file_paths),
            "message": "Analysis started. Poll /jobs/{job_id} for status or stream /jobs/{job_id}/stream for live updates.",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start analysis job: {e}")
        raise HTTPException(status_code=500, detail=str(e))
