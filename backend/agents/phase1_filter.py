import asyncio
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
    "required_skills_any_of": ["skills where candidate needs AT LEAST ONE — when JD says 'such as', 'including', 'like', 'or', 'one of'"],
    "preferred_skills": ["nice to have skills — short names only"],
    "min_years_experience": null or number,
    "education_required": null or "Bachelor's" or "Master's" or "PhD" or "Any degree",
    "requires_github": true or false,
    "role_level": "intern" or "junior" or "mid" or "senior" or "lead",
    "role_title": "exact role title from JD",
    "key_responsibilities": ["top 3 main things this person will do"]
}}

Critical rules:
- NEVER put full sentences in any skills list — short skill names only
- required_skills: candidate must have ALL of these
- required_skills_any_of: candidate needs just ONE — use when JD says 'such as Java, Python, or C++'
- For 'Java, Python, C++, C#, Go, Rust, or TypeScript' → put ALL in required_skills_any_of
- Only put skills in required_skills if truly mandatory — when in doubt use preferred_skills
- requires_github is true only if JD explicitly asks for a GitHub profile link"""

    try:
        result = await call_llm_json(system_prompt, user_prompt, max_tokens=1000)
        logger.info(f"JD requirements extracted: {result.get('role_title')} | required skills: {result.get('required_skills')}")
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


async def extract_candidate_info(raw_text: str, file_name: str) -> dict:
    system_prompt = """You are parsing a resume to extract structured information.
Be accurate and conservative. Only extract what is clearly stated."""

    user_prompt = f"""Extract information from this resume as JSON:

RESUME ({file_name}):
{raw_text[:4000]}

Return this exact JSON structure:
{{
    "name": "full name or null",
    "current_title": "current or most recent job title or null",
    "skills": ["all technical skills, languages, frameworks, tools mentioned anywhere on resume including coursework"],
    "years_experience": null or number,
    "education": [
        {{
            "degree": "Bachelor's/Master's/PhD/Associate's or null",
            "field": "field of study or null",
            "institution": "university name or null",
            "graduation_year": null or number
        }}
    ],
    "projects": [
        {{
            "name": "project name",
            "description": "one line description",
            "technologies": ["tech used"]
        }}
    ],
    "has_degree": true or false,
    "total_experience_years": null or number
}}

Rules:
- For skills: include everything technical from ALL sections — skills section, coursework, experience, projects
- Include coursework topics as skills e.g. 'Data Structures & Algorithms' → add 'data structures', 'algorithms'
- For years_experience: calculate from work history dates if possible
- Be thorough — scan the entire resume"""

    try:
        result = await call_llm_json(system_prompt, user_prompt, max_tokens=1500)
        return result
    except Exception as e:
        logger.error(f"Failed to extract candidate info from {file_name}: {e}")
        return {
            "name": None,
            "current_title": None,
            "skills": [],
            "years_experience": None,
            "education": [],
            "projects": [],
            "has_degree": False,
            "total_experience_years": None,
        }


async def check_skills_match(
    required_skills: list[str],
    required_any: list[str],
    raw_resume_text: str,
) -> list[dict]:
    if not required_skills and not required_any:
        return []

    system_prompt = """You are checking whether a candidate's resume satisfies job requirements.
Be reasonable — if the resume demonstrates the concept even under a different name, count it as found."""

    user_prompt = f"""Check if this resume satisfies these skill requirements.

REQUIRED SKILLS (candidate needs ALL):
{required_skills}

REQUIRED ANY (candidate needs AT LEAST ONE):
{required_any}

RESUME TEXT:
{raw_resume_text[:3000]}

Return JSON:
{{
    "failures": [
        {{
            "skill": "skill name",
            "reason": "why it was not found",
            "type": "required_all or required_any"
        }}
    ]
}}

Rules:
- 'data structures' is satisfied by 'Data Structures & Algorithms' coursework
- 'algorithms' is satisfied by 'Data Structures & Algorithms' coursework
- 'OOP' is satisfied by 'object-oriented', 'OOP', 'Java', 'C++', 'Python'
- 'version control' is satisfied by 'Git', 'GitHub'
- For required_any: only fail if NONE of the listed skills are found anywhere
- Be reasonable — look at the full context, not just the skills section
- Return empty failures array if everything is satisfied"""

    try:
        result = await call_llm_json(system_prompt, user_prompt)
        return result.get("failures", [])
    except Exception:
        return []


async def check_hard_requirements(
    candidate_info: dict,
    jd_requirements: dict,
    mechanical: dict,
) -> list[dict]:
    failures = []

    skill_failures = await check_skills_match(
        required_skills=jd_requirements.get("required_skills", []),
        required_any=jd_requirements.get("required_skills_any_of", []),
        raw_resume_text=mechanical.get("raw_text", ""),
    )
    for f in skill_failures:
        failures.append({
            "check": "required_skill",
            "reason": f["reason"],
        })

    min_years = jd_requirements.get("min_years_experience")
    if min_years:
        candidate_years = (
            candidate_info.get("total_experience_years")
            or candidate_info.get("years_experience")
            or 0
        )
        if candidate_years < min_years:
            failures.append({
                "check": "experience",
                "reason": f"JD requires {min_years}+ years, candidate has ~{candidate_years} years",
            })

    education_required = jd_requirements.get("education_required")
    if education_required and education_required.lower() not in ("any", "none", "null"):
        has_degree = candidate_info.get("has_degree", False)
        if not has_degree:
            failures.append({
                "check": "education",
                "reason": f"JD requires {education_required}, no degree found on resume",
            })

    requires_github = jd_requirements.get("requires_github", False)
    if requires_github and not mechanical.get("github_url"):
        failures.append({
            "check": "github",
            "reason": "No GitHub profile linked",
        })

    return failures


async def run_phase1(
    file_path: str,
    resume_index: int,
    jd_requirements: dict,
) -> dict:
    mechanical = parse_resume_mechanical(file_path, resume_index)

    if not mechanical["raw_text"].strip():
        return {
            "resume_index": resume_index,
            "file_name": mechanical["file_name"],
            "passed": False,
            "reason": "Could not extract text from PDF — may be scanned or image-based",
            "candidate_info": None,
            "mechanical": mechanical,
        }

    candidate_info = await extract_candidate_info(
        mechanical["raw_text"],
        mechanical["file_name"],
    )

    failures = await check_hard_requirements(candidate_info, jd_requirements, mechanical)

    if failures:
        primary_reason = failures[0]["reason"]
        all_reasons = " | ".join(f["reason"] for f in failures)
        logger.info(f"Phase 1 ELIMINATED [{mechanical['file_name']}]: {primary_reason}")
        return {
            "resume_index": resume_index,
            "file_name": mechanical["file_name"],
            "passed": False,
            "reason": all_reasons,
            "candidate_info": candidate_info,
            "mechanical": mechanical,
        }

    logger.info(f"Phase 1 PASSED [{mechanical['file_name']}]: {candidate_info.get('name')}")
    return {
        "resume_index": resume_index,
        "file_name": mechanical["file_name"],
        "passed": True,
        "reason": None,
        "candidate_info": candidate_info,
        "mechanical": mechanical,
    }


async def run_phase1_batch(
    file_paths: list[str],
    jd_requirements: dict,
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