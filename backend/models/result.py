from pydantic import BaseModel
from typing import List, Optional
from .candidate import CandidateVerified, EliminatedCandidate


class RankedCandidate(BaseModel):
    rank: int
    candidate: CandidateVerified
    overall_score: float
    score_breakdown: dict = {}
    recommendation: str


class AnalysisResult(BaseModel):
    job_id: str
    total_submitted: int
    total_eliminated_phase1: int
    total_eliminated_phase2: int
    total_ranked: int
    ranked_candidates: List[RankedCandidate] = []
    eliminated_candidates: List[EliminatedCandidate] = []


class SSEEvent(BaseModel):
    event: str
    data: dict


class PhaseUpdate(BaseModel):
    job_id: str
    phase: str
    total: int
    complete: int
    eliminated: int
    message: Optional[str] = None