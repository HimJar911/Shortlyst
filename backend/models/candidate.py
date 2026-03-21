from pydantic import BaseModel
from typing import Optional, List
from enum import Enum


class SkillStatus(str, Enum):
    CONFIRMED = "confirmed"
    UNVERIFIED = "unverified"
    FLAGGED = "flagged"


class ComplexityLevel(str, Enum):
    TRIVIAL = "trivial"
    BASIC = "basic"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class CodeQualityLevel(str, Enum):
    POOR = "poor"
    FAIR = "fair"
    GOOD = "good"
    EXCELLENT = "excellent"


class Education(BaseModel):
    degree: Optional[str] = None
    institution: Optional[str] = None
    graduation_year: Optional[int] = None


class Project(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    urls: List[str] = []


class CandidateRaw(BaseModel):
    resume_index: int
    file_name: str
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    github_url: Optional[str] = None
    github_username: Optional[str] = None
    linkedin_url: Optional[str] = None
    all_urls: List[str] = []
    claimed_skills: List[str] = []
    experience_years: float = 0.0
    education: List[Education] = []
    projects: List[Project] = []
    raw_text: str = ""


class VerifiedSkill(BaseModel):
    name: str
    status: SkillStatus
    evidence: str


class RepoData(BaseModel):
    name: str
    language: Optional[str] = None
    stars: int = 0
    last_updated: Optional[str] = None
    description: Optional[str] = None
    has_tests: bool = False
    has_ci: bool = False
    complexity: ComplexityLevel = ComplexityLevel.BASIC
    commit_messages: List[str] = []
    readme_summary: Optional[str] = None
    is_tutorial_clone: bool = False
    languages_used: List[str] = []


class DeployedUrl(BaseModel):
    url: str
    is_live: bool = False
    http_status: Optional[int] = None
    assessment: Optional[str] = None
    is_trivial: bool = True
    is_real_app: bool = False
    screenshot_taken: bool = False


class CodeQuality(BaseModel):
    naming_conventions: Optional[str] = None
    structure: Optional[str] = None
    has_error_handling: bool = False
    is_tutorial_clone: bool = False
    overall: CodeQualityLevel = CodeQualityLevel.FAIR
    summary: Optional[str] = None


class GitHubSignal(BaseModel):
    exists: bool = False
    username: Optional[str] = None
    total_public_repos: int = 0
    repos: List[RepoData] = []
    contribution_consistency: Optional[str] = None
    last_active: Optional[str] = None
    commit_quality_score: float = 0.0
    recent_burst_detected: bool = False
    code_quality: Optional[CodeQuality] = None


class CandidateVerified(BaseModel):
    resume_index: int
    file_name: str
    name: Optional[str] = None
    email: Optional[str] = None
    github_signal: GitHubSignal = GitHubSignal()
    deployed_urls: List[DeployedUrl] = []
    verified_skills: List[VerifiedSkill] = []
    jd_match_score: float = 0.0
    jd_match_reasoning: Optional[str] = None
    overall_rank: Optional[int] = None
    rank_reasoning: Optional[str] = None


class EliminatedCandidate(BaseModel):
    resume_index: int
    file_name: str
    name: Optional[str] = None
    eliminated_in_phase: int
    reason: str