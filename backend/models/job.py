from pydantic import BaseModel, Field
from typing import Optional, List
from enum import Enum
from datetime import datetime
import uuid


class JobStatus(str, Enum):
    QUEUED = "queued"
    PHASE1 = "phase1"
    PHASE2 = "phase2"
    PHASE3 = "phase3"
    COMPLETE = "complete"
    FAILED = "failed"


class JDRequirements(BaseModel):
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    min_years_experience: Optional[float] = None
    education_required: Optional[str] = None
    requires_github: bool = False
    role_level: Optional[str] = None
    raw_jd: str = ""


class AnalysisJob(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: JobStatus = JobStatus.QUEUED
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    total_resumes: int = 0
    phase1_complete: int = 0
    phase2_complete: int = 0
    eliminated_phase1: int = 0
    eliminated_phase2: int = 0
    jd_requirements: Optional[JDRequirements] = None
    error: Optional[str] = None