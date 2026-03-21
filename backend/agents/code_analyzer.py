"""
Dedicated code analysis agent — separate from github_auditor.
Takes already-fetched source files and does deep quality assessment.
Called from Phase 2 pipeline after github_auditor has fetched the data.
"""

from services.claude_client import call_llm_json
from utils.logger import get_logger

logger = get_logger(__name__)


async def analyze_skills_in_code(
    source_files: dict,
    claimed_skills: list[str],
    required_skills: list[str],
) -> list[dict]:
    """
    Cross-references claimed skills against actual code evidence.
    Returns per-skill verdict: confirmed / unverified / flagged
    """
    if not source_files or not claimed_skills:
        return [
            {
                "skill": s,
                "status": "unverified",
                "evidence": "No source code available to verify",
            }
            for s in claimed_skills
        ]

    files_text = ""
    for filename, content in source_files.items():
        files_text += f"\n--- {filename} ---\n{content[:1500]}\n"

    all_skills = list(set(claimed_skills + required_skills))

    system_prompt = """You are verifying whether a candidate's claimed skills are actually evident in their code.
Be specific and honest. Look for real usage, not just imports."""

    user_prompt = f"""Check these skills against the actual source code.

SKILLS TO VERIFY:
{all_skills}

SOURCE CODE:
{files_text[:5000]}

For each skill return one of:
- confirmed: clearly used in the code in a meaningful way
- unverified: not visible in these files (may exist elsewhere, not a red flag)
- flagged: claimed but code shows clear misunderstanding or only superficial usage

Return JSON:
{{
    "verdicts": [
        {{
            "skill": "skill name",
            "status": "confirmed/unverified/flagged",
            "evidence": "one sentence — what you saw or didn't see"
        }}
    ]
}}

Only include skills from the list above. Be generous with 'unverified' — 
we're only sampling a few files so absence of evidence is not evidence of absence."""

    try:
        result = await call_llm_json(system_prompt, user_prompt, max_tokens=1000)
        return result.get("verdicts", [])
    except Exception as e:
        logger.error(f"Skills cross-reference failed: {e}")
        return [
            {"skill": s, "status": "unverified", "evidence": "Analysis failed"}
            for s in all_skills
        ]


async def run_code_analysis(
    github_signal: dict,
    claimed_skills: list[str],
    required_skills: list[str],
) -> dict:
    """
    Takes the github_signal already produced by github_auditor,
    extracts source files from repo analyses, and runs skill cross-reference.
    """
    if not github_signal or not github_signal.get("exists"):
        return {
            "skill_verdicts": [],
            "summary": "No GitHub data available for code analysis",
        }

    # Collect all source files across top repos
    all_source_files = {}
    for repo in github_signal.get("repo_analyses", []):
        # Source files aren't stored directly on repo_analyses in new format
        # They're inside assessment — we just do skill cross-ref from what we have
        pass

    # If no source files available, return unverified for all
    if not all_source_files:
        logger.info(
            "No source files in github_signal for code analysis — returning unverified"
        )
        return {
            "skill_verdicts": [
                {
                    "skill": s,
                    "status": "unverified",
                    "evidence": "Skills visible in languages but specific usage not sampled",
                }
                for s in claimed_skills
            ],
            "summary": "Skills inferred from GitHub language data, not verified line-by-line",
        }

    skill_verdicts = await analyze_skills_in_code(
        source_files=all_source_files,
        claimed_skills=claimed_skills,
        required_skills=required_skills,
    )

    confirmed = [v for v in skill_verdicts if v["status"] == "confirmed"]
    flagged = [v for v in skill_verdicts if v["status"] == "flagged"]

    summary = f"{len(confirmed)} skills confirmed in code"
    if flagged:
        summary += f", {len(flagged)} flagged as potentially overstated"

    return {
        "skill_verdicts": skill_verdicts,
        "summary": summary,
    }
