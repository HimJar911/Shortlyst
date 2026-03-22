import asyncio
from config import settings
from services.claude_client import call_llm_json
from services.pdf_parser import parse_resume_mechanical
from utils.logger import get_logger

logger = get_logger(__name__)


async def extract_jd_requirements(jd_text: str) -> dict:
    system_prompt = """You are an expert technical recruiter analyzing a job description.
Extract the requirements precisely. Be strict about what is truly REQUIRED vs merely preferred."""

    user_prompt = f"""Analyze this job description and extract requirements as JSON.

JOB DESCRIPTION:
{jd_text}

Return this exact JSON structure:
{{
    "required_skills": ["skills where candidate needs ALL of them — short names only e.g. 'Python', 'SQL'"],
    "required_skills_any_of": ["skills where candidate needs AT LEAST ONE"],
    "preferred_skills": ["nice to have skills"],
    "min_years_experience": null or number,
    "education_required": null or "Bachelor's" or "Master's" or "PhD" or "Any degree",
    "requires_github": true or false,
    "role_level": "intern" or "junior" or "mid" or "senior" or "lead",
    "role_title": "exact role title from JD",
    "key_responsibilities": ["top 3 main things this person will do"]
}}"""

    try:
        result = await call_llm_json(
            system_prompt, user_prompt, max_tokens=1000,
            model=settings.LLM_MODEL_MINI,
        )
        logger.info(
            f"JD extracted: {result.get('role_title')} | required: {result.get('required_skills')}"
        )
        return result
    except Exception as e:
        logger.error(f"Failed to extract JD requirements: {e}")
        return {
            "required_skills": [],
            "required_skills_any_of": [],
            "preferred_skills": [],
            "min_years_experience": None,
            "education_required": None,
            "requires_github": False,
            "role_level": "mid",
            "role_title": "Unknown",
            "key_responsibilities": [],
        }


async def extract_and_check(
    raw_text: str, file_name: str, jd_requirements: dict
) -> tuple[dict, list[dict]]:
    """
    Single LLM call that extracts candidate info AND checks skill requirements.
    Replaces the old extract_candidate_info + check_skills_match two-call flow.
    """
    required_skills = jd_requirements.get("required_skills", [])
    required_any = jd_requirements.get("required_skills_any_of", [])

    system_prompt = """You are parsing a resume to extract structured information AND checking if the candidate meets job requirements.
Be accurate and conservative. Only extract what is clearly stated.
For skill matching, be reasonable — if the resume demonstrates the concept even under a different name, count it as found."""

    user_prompt = f"""Extract information from this resume AND check skill requirements.

RESUME ({file_name}):
{raw_text[:4000]}

JOB REQUIRED SKILLS (candidate needs ALL): {required_skills}
JOB REQUIRED ANY (candidate needs AT LEAST ONE): {required_any}

Return this exact JSON structure:
{{
    "candidate_info": {{
        "name": "full name or null",
        "current_title": "current or most recent job title or null",
        "skills": ["all technical skills, languages, frameworks, tools mentioned anywhere including coursework"],
        "years_experience": null or number,
        "education": [{{"degree": "Bachelor's/Master's/PhD/Associate's or null", "field": "field or null", "institution": "university or null", "graduation_year": null or number, "gpa": "GPA as string e.g. '3.5' or null if not mentioned"}}],
        "projects": [{{"name": "project name", "description": "one line", "technologies": ["tech used"]}}],
        "has_degree": true or false,
        "total_experience_years": null or number
    }},
    "skill_failures": [
        {{"skill": "skill name", "reason": "why not found", "type": "required_all or required_any"}}
    ]
}}

Skill matching rules:
- 'data structures' satisfied by 'Data Structures & Algorithms' coursework
- 'OOP' satisfied by Java, C++, Python
- 'version control' satisfied by Git/GitHub
- For required_any: only fail if NONE of the listed skills are found
- Return empty skill_failures array if everything is satisfied"""

    try:
        result = await call_llm_json(
            system_prompt, user_prompt, max_tokens=2000,
            model=settings.LLM_MODEL_MINI,
        )
        candidate_info = result.get("candidate_info", {})
        skill_failures = result.get("skill_failures", [])
        return candidate_info, skill_failures
    except Exception as e:
        logger.error(f"Failed to extract+check from {file_name}: {e}")
        return {
            "name": None,
            "current_title": None,
            "skills": [],
            "years_experience": None,
            "education": [],
            "projects": [],
            "has_degree": False,
            "total_experience_years": None,
        }, []


async def check_hard_requirements(
    candidate_info: dict, jd_requirements: dict, mechanical: dict, skill_failures: list[dict]
) -> list[dict]:
    failures = []

    for f in skill_failures:
        failures.append({"check": "required_skill", "reason": f["reason"]})

    min_years = jd_requirements.get("min_years_experience")
    if min_years:
        candidate_years = (
            candidate_info.get("total_experience_years")
            or candidate_info.get("years_experience")
            or 0
        )
        if candidate_years < min_years:
            failures.append(
                {
                    "check": "experience",
                    "reason": f"JD requires {min_years}+ years, candidate has ~{candidate_years} years",
                }
            )

    education_required = jd_requirements.get("education_required")
    if education_required and education_required.lower() not in ("any", "none", "null"):
        if not candidate_info.get("has_degree", False):
            failures.append(
                {
                    "check": "education",
                    "reason": f"JD requires {education_required}, no degree found",
                }
            )

    if jd_requirements.get("requires_github", False) and not mechanical.get(
        "github_url"
    ):
        failures.append(
            {"check": "github", "reason": "JD requires GitHub profile, none found"}
        )

    return failures


async def run_phase1(file_path: str, resume_index: int, jd_requirements: dict) -> dict:
    mechanical = parse_resume_mechanical(file_path, resume_index)

    if not mechanical["raw_text"].strip():
        return {
            "resume_index": resume_index,
            "file_name": mechanical["file_name"],
            "passed": False,
            "reason": "Could not extract text from PDF",
            "candidate_info": None,
            "mechanical": mechanical,
        }

    candidate_info, skill_failures = await extract_and_check(
        mechanical["raw_text"], mechanical["file_name"], jd_requirements
    )
    failures = await check_hard_requirements(
        candidate_info, jd_requirements, mechanical, skill_failures
    )

    if failures:
        all_reasons = " | ".join(f["reason"] for f in failures)
        logger.info(
            f"Phase 1 ELIMINATED [{mechanical['file_name']}]: {failures[0]['reason']}"
        )
        return {
            "resume_index": resume_index,
            "file_name": mechanical["file_name"],
            "passed": False,
            "reason": all_reasons,
            "candidate_info": candidate_info,
            "mechanical": mechanical,
        }

    logger.info(
        f"Phase 1 PASSED [{mechanical['file_name']}]: {candidate_info.get('name')}"
    )
    return {
        "resume_index": resume_index,
        "file_name": mechanical["file_name"],
        "passed": True,
        "reason": None,
        "candidate_info": candidate_info,
        "mechanical": mechanical,
    }


async def run_phase1_batch(
    file_paths: list[str], jd_requirements: dict
) -> tuple[list[dict], list[dict]]:
    tasks = [
        run_phase1(file_path, i, jd_requirements)
        for i, file_path in enumerate(file_paths)
    ]
    results = await asyncio.gather(*tasks)
    passed = [r for r in results if r["passed"]]
    eliminated = [r for r in results if not r["passed"]]
    logger.info(f"Phase 1 complete: {len(passed)} passed, {len(eliminated)} eliminated")
    return passed, eliminated
