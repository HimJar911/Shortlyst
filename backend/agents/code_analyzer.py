"""
Dedicated code analysis agent.
Verifies JD-required skills against source code + READMEs from all repos.
Only checks skills the JD actually asks for — resume skills are irrelevant here.
"""

import asyncio
from services.claude_client import call_llm_json
from services.redis_queue import get_cached_github_data
from services.github_client import get_readme, get_repo_contents
from utils.logger import get_logger

logger = get_logger(__name__)


import re


# SQL variants — if any of these appear in a README, any SQL-related skill is confirmed
_SQL_VARIANTS = {"sql", "mysql", "postgresql", "postgres", "sqlite", "mssql", "mariadb", "oracle", "supabase", "prisma"}
_SQL_SKILLS = {"sql", "mysql", "postgresql", "postgres", "sqlite", "nosql", "database", "mssql", "mariadb"}

# Short skill names that match common English words — require case-sensitive matching
_CASE_SENSITIVE_SKILLS = {"go", "c", "r", "rust", "dart", "swift", "helm", "chef", "flask", "puppet"}


def _skill_mentioned(skill: str, text: str) -> bool:
    """Keyword match with word boundaries. Case-sensitive for short/ambiguous names."""
    escaped = re.escape(skill)
    if skill.lower() in _CASE_SENSITIVE_SKILLS:
        pattern = re.compile(
            r"(?:^|[^a-zA-Z0-9])(" + escaped + r")(?=[^a-zA-Z0-9]|$)",
        )
    else:
        pattern = re.compile(
            r"(?:^|[^a-zA-Z0-9])(" + escaped + r")(?=[^a-zA-Z0-9]|$)",
            re.IGNORECASE,
        )
    return bool(pattern.search(text))


def _check_sql_family(skill: str, text: str) -> bool:
    """If the skill is SQL-related, check for any SQL variant in the text."""
    if skill.lower() in _SQL_SKILLS:
        text_lower = text.lower()
        return any(_skill_mentioned(variant, text) for variant in _SQL_VARIANTS)
    return False


def verify_all_jd_skills(
    source_files: dict,
    readme_text: str,
    required_skills: list[str],
    required_any_of: list[str],
    preferred_skills: list[str],
) -> dict:
    """
    Simple keyword matching — checks if each skill is mentioned in any README.
    No LLM call needed.
    """
    all_readme = readme_text or ""

    def _check(skill: str) -> dict:
        if _skill_mentioned(skill, all_readme):
            return {"skill": skill, "status": "confirmed", "evidence": "Found in GitHub"}
        if _check_sql_family(skill, all_readme):
            return {"skill": skill, "status": "confirmed", "evidence": "SQL variant found in GitHub"}
        return {"skill": skill, "status": "unverified", "evidence": "Not found in GitHub"}

    required_verdicts = [_check(s) for s in required_skills]
    any_of_verdicts = [_check(s) for s in required_any_of]
    preferred_verdicts = [_check(s) for s in preferred_skills]
    any_of_satisfied = any(v["status"] == "confirmed" for v in any_of_verdicts)

    return {
        "required": required_verdicts,
        "any_of": any_of_verdicts,
        "preferred": preferred_verdicts,
        "any_of_satisfied": any_of_satisfied,
    }


# Skills that can't be verified from code/README — filter these out
NON_VERIFIABLE_SKILLS = {
    "debugging",
    "problem-solving",
    "communication",
    "teamwork",
    "agile",
    "scrum",
    "agile/scrum",
    "sdlc",
    "software development lifecycle",
    "code reviews",
    "open-source",
    "open source",
    "version control",
    "leadership",
    "mentoring",
    "written communication",
    "verbal communication",
    "analytical skills",
    "critical thinking",
    "time management",
    "collaboration",
    "attention to detail",
    "ai tools",
    "ai tools for development productivity",
}


async def run_code_analysis(
    github_signal: dict,
    claimed_skills: list[str],  # kept for signature compat, not used
    required_skills: list[str],
    required_any_of: list[str] = None,
    preferred_skills: list[str] = None,
    cached_github_data: dict = None,
) -> dict:
    """
    Verifies JD skills against source code + READMEs from all repos.
    Checks required, any_of, and preferred skills — filters non-verifiable ones.
    """
    if required_any_of is None:
        required_any_of = []
    if preferred_skills is None:
        preferred_skills = []

    # Filter preferred skills — only keep technical ones
    preferred_skills = [
        s for s in preferred_skills if s.lower().strip() not in NON_VERIFIABLE_SKILLS
    ]

    if not github_signal or not github_signal.get("exists"):
        return {
            "skill_verdicts": [],
            "required_verdicts": [],
            "any_of_verdicts": [],
            "any_of_satisfied": False,
            "summary": "No GitHub data available",
        }

    username = github_signal.get("username")
    if not username:
        return {
            "skill_verdicts": [],
            "required_verdicts": [],
            "any_of_verdicts": [],
            "any_of_satisfied": False,
            "summary": "No GitHub username",
        }

    # Use pre-fetched data if available, otherwise fall back to Redis cache
    cached = cached_github_data or await get_cached_github_data(username)

    # ── Source files from top repos ──────────────────────────────────────────
    all_source_files = {}
    cached_readmes = {}

    if cached:
        for repo in cached.get("top_repos_data", []):
            repo_name = repo.get("name", "")
            for fname, content in repo.get("source_files", {}).items():
                all_source_files[f"{repo_name}/{fname}"] = content
            if repo.get("readme"):
                cached_readmes[repo_name] = repo["readme"]

    # ── READMEs from remaining repos ─────────────────────────────────────────
    # Fetch contents listing first, then use it to check README existence
    # in a single call instead of the 4-call cascade (README.md → readme.md → ...)
    all_repos = cached.get("repos", []) if cached else []
    top_repo_names = set(cached_readmes.keys())
    remaining_repos = [
        r
        for r in all_repos
        if r.get("name") not in top_repo_names
        and not r.get("fork")
        and r.get("size", 0) > 5
    ]

    if remaining_repos:
        repos_to_check = remaining_repos[:10]
        # Fetch contents listings in parallel (1 call each)
        contents_tasks = [
            get_repo_contents(username, r["name"]) for r in repos_to_check
        ]
        contents_results = await asyncio.gather(*contents_tasks, return_exceptions=True)

        # Now fetch READMEs using the contents listing to avoid cascade
        readme_tasks = []
        repos_with_tasks = []
        for repo, contents in zip(repos_to_check, contents_results):
            if isinstance(contents, Exception) or not contents:
                continue
            repos_with_tasks.append(repo)
            readme_tasks.append(
                get_readme(username, repo["name"], contents=contents)
            )

        if readme_tasks:
            readme_results = await asyncio.gather(*readme_tasks, return_exceptions=True)
            for repo, readme in zip(repos_with_tasks, readme_results):
                if readme and not isinstance(readme, Exception):
                    cached_readmes[repo["name"]] = readme

    readme_sections = []
    for repo_name, readme in cached_readmes.items():
        if readme and readme.strip():
            readme_sections.append(f"=== {repo_name} README ===\n{readme[:3000]}")
    combined_readme = "\n\n".join(readme_sections)

    # Add languages found by GitHub API as extra README context
    languages_found = github_signal.get("languages_found", [])
    if languages_found:
        lang_note = f"\n\n=== GitHub Language Stats ===\nLanguages detected across repos: {', '.join(languages_found)}"
        combined_readme = combined_readme + lang_note

    logger.info(
        f"JD skill verification for {username}: "
        f"{len(all_source_files)} source files, "
        f"{len(cached_readmes)} READMEs, "
        f"languages: {languages_found}, "
        f"{len(required_skills)} required + {len(required_any_of)} any-of + {len(preferred_skills)} preferred skills"
    )
    logger.debug(
        f"README content for skill matching ({username}):\n{combined_readme[:3000]}"
    )

    # Simple keyword matching against READMEs
    result = verify_all_jd_skills(
        source_files=all_source_files,
        readme_text=combined_readme,
        required_skills=required_skills,
        required_any_of=required_any_of,
        preferred_skills=preferred_skills,
    )

    preferred_verdicts = result["preferred"]
    all_verdicts = result["required"] + result["any_of"] + preferred_verdicts
    confirmed = [v for v in all_verdicts if v["status"] == "confirmed"]

    total_slots = len(required_skills) + len(required_any_of) + len(preferred_skills)
    confirmed_slots = len(confirmed)

    summary = f"{confirmed_slots}/{total_slots} JD skills verified"
    logger.info(
        f"Skill verdicts for {username}: "
        + ", ".join(f"{v['skill']}={'✓' if v['status'] == 'confirmed' else '✗'}" for v in all_verdicts)
    )

    return {
        "skill_verdicts": all_verdicts,
        "required_verdicts": result["required"],
        "any_of_verdicts": result["any_of"],
        "preferred_verdicts": preferred_verdicts,
        "any_of_satisfied": result["any_of_satisfied"],
        "summary": summary,
    }
