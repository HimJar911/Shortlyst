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


async def verify_jd_skills(
    source_files: dict,
    readme_text: str,
    required_skills: list[str],
    required_any_of: list[str],
) -> dict:
    """
    Verifies only JD-required skills against code + README evidence.

    Returns:
    {
        "required": [{"skill": ..., "status": ..., "evidence": ...}, ...],
        "any_of":   [{"skill": ..., "status": ..., "evidence": ...}, ...],
        "any_of_satisfied": bool  -- true if at least one any_of skill is confirmed
    }
    """
    all_jd_skills = list(set(required_skills + required_any_of))

    if not all_jd_skills:
        return {"required": [], "any_of": [], "any_of_satisfied": False}

    has_code = bool(source_files)
    has_readme = bool(readme_text and readme_text.strip())

    if not has_code and not has_readme:
        empty = [
            {
                "skill": s,
                "status": "unverified",
                "evidence": "No source code or README available",
            }
            for s in all_jd_skills
        ]
        return {
            "required": [e for e in empty if e["skill"] in required_skills],
            "any_of": [e for e in empty if e["skill"] in required_any_of],
            "any_of_satisfied": False,
        }

    files_text = ""
    if has_code:
        for filename, content in source_files.items():
            files_text += f"\n--- {filename} ---\n{content[:1500]}\n"

    system_prompt = """You are verifying whether a candidate's GitHub repositories demonstrate the skills a job requires.
Evidence sources:
1. Source code — confirms the skill is actively used
2. README files — confirms the skill is part of their documented tech stack

Both are valid. README mention of a technology counts as confirmation.
Be specific about where you saw evidence."""

    # Build languages summary from github_signal for extra context
    user_prompt = f"""Verify these job-required skills against the candidate's GitHub evidence.

REQUIRED SKILLS (candidate needs ALL):
{required_skills}

ANY-OF SKILLS (candidate needs AT LEAST ONE):
{required_any_of}

README CONTENT FROM ALL REPOS:
{readme_text[:3000] if has_readme else "No README available"}

SOURCE CODE FILES:
{files_text[:4000] if has_code else "No source files available"}

IMPORTANT: If a programming language appears in source code files or README, count it as confirmed.
If a skill like TypeScript, Python, Java etc appears as a file extension (.ts, .py, .java) in filenames
shown above, that confirms the candidate uses that language.

For each skill return:
- confirmed: used in code OR mentioned in README as part of tech stack
- unverified: no evidence found (not a red flag, may exist in other repos)
- flagged: claimed but evidence shows only superficial or misunderstood usage

Return JSON:
{{
    "verdicts": [
        {{
            "skill": "exact skill name from the lists above",
            "status": "confirmed/unverified/flagged",
            "evidence": "one sentence — what you saw and where"
        }}
    ]
}}

Include every skill from both lists. README mentions count as confirmation."""

    try:
        result = await call_llm_json(system_prompt, user_prompt, max_tokens=2000)
        verdicts = result.get("verdicts", [])

        verdict_map = {v["skill"]: v for v in verdicts}

        # Fallback for any skills the LLM missed
        for s in all_jd_skills:
            if s not in verdict_map:
                verdict_map[s] = {
                    "skill": s,
                    "status": "unverified",
                    "evidence": "Not assessed",
                }

        required_verdicts = [
            verdict_map[s] for s in required_skills if s in verdict_map
        ]
        any_of_verdicts = [verdict_map[s] for s in required_any_of if s in verdict_map]
        any_of_satisfied = any(v["status"] == "confirmed" for v in any_of_verdicts)

        return {
            "required": required_verdicts,
            "any_of": any_of_verdicts,
            "any_of_satisfied": any_of_satisfied,
        }

    except Exception as e:
        logger.error(f"JD skill verification failed: {e}")
        empty = [
            {"skill": s, "status": "unverified", "evidence": "Analysis failed"}
            for s in all_jd_skills
        ]
        return {
            "required": [e for e in empty if e["skill"] in required_skills],
            "any_of": [e for e in empty if e["skill"] in required_any_of],
            "any_of_satisfied": False,
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
            readme_sections.append(f"=== {repo_name} README ===\n{readme[:800]}")
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
        f"{len(required_skills)} required + {len(required_any_of)} any-of skills"
    )

    # Verify preferred skills too (already filtered to technical ones)
    preferred_verdicts = []
    if preferred_skills:
        preferred_result = await verify_jd_skills(
            source_files=all_source_files,
            readme_text=combined_readme,
            required_skills=preferred_skills,
            required_any_of=[],
        )
        preferred_verdicts = preferred_result["required"]

    result = await verify_jd_skills(
        source_files=all_source_files,
        readme_text=combined_readme,
        required_skills=required_skills,
        required_any_of=required_any_of,
    )

    # Flatten all verdicts — required + any_of + preferred, all treated equally
    all_verdicts = result["required"] + result["any_of"] + preferred_verdicts
    confirmed = [v for v in all_verdicts if v["status"] == "confirmed"]

    total_slots = len(required_skills) + len(required_any_of) + len(preferred_verdicts)
    confirmed_slots = len(confirmed)

    summary = f"{confirmed_slots}/{total_slots} JD skills verified"

    return {
        "skill_verdicts": all_verdicts,
        "required_verdicts": result["required"],
        "any_of_verdicts": result["any_of"],
        "preferred_verdicts": preferred_verdicts,
        "any_of_satisfied": result["any_of_satisfied"],
        "summary": summary,
    }
