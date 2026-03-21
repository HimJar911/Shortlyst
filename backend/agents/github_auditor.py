import asyncio
from services.claude_client import call_llm_json
from services.github_client import fetch_candidate_github
from services.redis_queue import get_cached_github_data, cache_github_data
from utils.logger import get_logger

logger = get_logger(__name__)


def build_folder_tree(contents: list[dict], prefix: str = "") -> str:
    """Build a readable folder tree string from GitHub contents API response."""
    if not contents:
        return ""
    lines = []
    for item in sorted(
        contents, key=lambda x: (x.get("type") == "file", x.get("name", ""))
    ):
        icon = "📁" if item.get("type") == "dir" else "📄"
        lines.append(
            f"{prefix}{icon} {item.get('name', '')} ({item.get('size', 0)} bytes)"
        )
    return "\n".join(lines)


def build_commit_timeline(commit_messages: list[str]) -> str:
    """Format commits for context — just as soft signal, not primary judge."""
    if not commit_messages:
        return "No commits available"
    lines = [f"  - {msg}" for msg in commit_messages[:20]]
    return "\n".join(lines)


async def assess_repo_holistically(
    repo_name: str,
    readme: str | None,
    folder_tree: str,
    languages: dict,
    source_files: dict,
    commit_messages: list[str],
    repo_metadata: dict,
) -> dict:
    """
    Single holistic LLM call that judges a repo in full context.
    Weighs: problem difficulty > architecture > code quality >> commits (soft bonus only)
    """

    # Build source files section
    files_text = ""
    if source_files:
        for filename, content in source_files.items():
            files_text += f"\n--- {filename} ---\n{content}\n"
    else:
        files_text = "No source files could be fetched."

    # Languages with byte counts
    lang_text = (
        ", ".join(f"{lang} ({bytes_:,} bytes)" for lang, bytes_ in languages.items())
        if languages
        else "Unknown"
    )

    # Commit timeline — framed explicitly as lowest weight signal
    commit_text = build_commit_timeline(commit_messages)
    commit_count = len(commit_messages)

    system_prompt = """You are a senior engineering hiring manager assessing a candidate's GitHub repository.
Your job is to judge the real sophistication of what was built — not surface patterns like test coverage or docstrings.

Weight your judgment in this exact order:
1. HIGHEST — Problem difficulty: What is this project actually doing? A messy multi-agent system beats a clean todo app.
2. HIGH — Architecture: Does the folder structure show systems thinking? Clear separation of concerns?
3. HIGH — Code sophistication: Do the sampled files show non-trivial logic, proper abstractions, real engineering?
4. LOWEST — Commit history: Treat this as a soft positive signal only. Many students build locally and push once.
   Few commits or a single push = completely neutral. Never penalize for this. Only give slight bonus for genuine development history."""

    user_prompt = f"""Assess this GitHub repository holistically.

REPO: {repo_name}
Stars: {repo_metadata.get('stars', 0)} | Size: {repo_metadata.get('size', 0)}KB | Language: {repo_metadata.get('language', 'Unknown')}

README:
{(readme or 'No README found.')[:2000]}

FOLDER STRUCTURE:
{folder_tree or 'Could not fetch folder structure.'}

LANGUAGES USED (GitHub byte analysis):
{lang_text}

SOURCE FILES SAMPLED ({len(source_files)} files):
{files_text[:7000]}

COMMIT HISTORY ({commit_count} commits — low weight signal):
{commit_text}

Return this exact JSON:
{{
    "problem_difficulty": "trivial/simple/moderate/complex/advanced",
    "problem_summary": "one sentence — what does this project actually do",
    "architecture_quality": "poor/fair/good/excellent",
    "architecture_notes": "one sentence on folder structure and separation of concerns",
    "code_sophistication": "poor/fair/good/excellent",
    "code_notes": "one sentence on the actual logic and engineering in sampled files",
    "commit_signal": "none/weak/moderate/strong",
    "commit_notes": "one sentence — only note if genuinely interesting, otherwise say single push or sparse history is neutral",
    "is_tutorial_clone": true or false,
    "has_deployment_config": true or false,
    "overall_complexity": "trivial/basic/intermediate/advanced",
    "overall_quality": "poor/fair/good/excellent",
    "summary": "2-3 sentence honest holistic assessment — lead with what the project IS, then judge the engineering",
    "standout_signals": ["up to 3 genuinely impressive things if any"],
    "concerns": ["up to 3 real concerns — only things that actually matter"]
}}

Complexity definitions — judge by problem being solved, not lines of code:
- trivial: hello world, static portfolio, direct tutorial copy
- basic: single-purpose tool, simple REST API, straightforward script
- intermediate: multi-component system, real integrations, async operations, non-trivial state
- advanced: distributed systems, multi-agent pipelines, production infrastructure, novel problem solving

Quality definitions:
- poor: broken, plagiarized, empty, or completely non-functional
- fair: works but shallow, copy-paste heavy, or far below what the README claims
- good: clean purposeful code that solves a real problem with real thought
- excellent: impressive architecture, non-trivial solutions, production-grade thinking"""

    try:
        return await call_llm_json(system_prompt, user_prompt, max_tokens=1000)
    except Exception as e:
        logger.error(f"Holistic repo assessment failed for {repo_name}: {e}")
        return {
            "problem_difficulty": "simple",
            "problem_summary": "Could not assess",
            "architecture_quality": "fair",
            "architecture_notes": "Could not assess",
            "code_sophistication": "fair",
            "code_notes": "Could not assess",
            "commit_signal": "none",
            "commit_notes": "Could not assess",
            "is_tutorial_clone": False,
            "has_deployment_config": False,
            "overall_complexity": "basic",
            "overall_quality": "fair",
            "summary": "Assessment failed",
            "standout_signals": [],
            "concerns": [],
        }


async def analyze_github_profile(
    github_data: dict,
    required_skills: list[str],
    preferred_skills: list[str],
) -> dict:
    repos = github_data.get("repos", [])
    top_repos_data = github_data.get("top_repos_data", [])

    # Run holistic assessment for each repo — all in parallel
    assessment_tasks = []
    for repo in top_repos_data:
        # Build folder tree from repo root contents if available
        # (we don't have it here but we have structure from source_files paths)
        source_files = repo.get("source_files", {})
        logger.info(
            f"Repo {repo['name']}: {len(source_files)} source files: {list(source_files.keys())}"
        )

        # Infer folder tree from source file paths we successfully read
        tree_lines = []
        seen_dirs = set()
        for fname in source_files.keys():
            tree_lines.append(f"📄 {fname}")
        folder_tree = "\n".join(tree_lines) if tree_lines else "Structure not available"

        assessment_tasks.append(
            assess_repo_holistically(
                repo_name=repo["name"],
                readme=repo.get("readme"),
                folder_tree=folder_tree,
                languages=repo.get("languages", {}),
                source_files=source_files,
                commit_messages=repo.get("commit_messages", []),
                repo_metadata={
                    "stars": repo.get("stars", 0),
                    "size": repo.get("size", 0),
                    "language": repo.get("language"),
                },
            )
        )

    assessments = await asyncio.gather(*assessment_tasks)

    # Build repo analyses
    repo_analyses = []
    for repo, assessment in zip(top_repos_data, assessments):
        repo_analyses.append(
            {
                "name": repo["name"],
                "language": repo.get("language"),
                "stars": repo.get("stars", 0),
                "last_updated": repo.get("last_updated"),
                "has_tests": repo.get("has_tests", False),
                "has_ci": repo.get("has_ci", False),
                "is_fork": repo.get("is_fork", False),
                "languages_used": list(repo.get("languages", {}).keys()),
                "assessment": assessment,
                # Keep these top-level for backward compatibility with ranking agent
                "code_quality": {
                    "overall": assessment.get("overall_quality", "fair"),
                    "complexity": assessment.get("overall_complexity", "basic"),
                    "summary": assessment.get("summary", ""),
                    "is_tutorial_clone": assessment.get("is_tutorial_clone", False),
                    "has_error_handling": False,  # no longer separately assessed
                },
            }
        )

    # Aggregate languages across all top repos
    languages_found = set()
    for repo in top_repos_data:
        for lang in repo.get("languages", {}).keys():
            languages_found.add(lang.lower())
        if repo.get("language"):
            languages_found.add(repo["language"].lower())

    # Skill verification via language presence
    skill_language_map = {
        "python": ["python"],
        "javascript": ["javascript"],
        "typescript": ["typescript"],
        "java": ["java"],
        "c++": ["c++"],
        "go": ["go"],
        "rust": ["rust"],
        "react": ["javascript", "typescript"],
        "node.js": ["javascript"],
        "fastapi": ["python"],
        "django": ["python"],
    }
    verified_via_github = [
        skill
        for skill in required_skills + preferred_skills
        if any(
            lang in languages_found
            for lang in skill_language_map.get(skill.lower(), [])
        )
    ]

    # Overall quality — weighted average across repos, problem difficulty as multiplier
    difficulty_weight = {
        "trivial": 0.5,
        "simple": 0.7,
        "moderate": 1.0,
        "complex": 1.3,
        "advanced": 1.5,
    }
    quality_score = {"poor": 1, "fair": 2, "good": 3, "excellent": 4}

    weighted_scores = []
    for a in assessments:
        q = quality_score.get(a.get("overall_quality", "fair"), 2)
        d = difficulty_weight.get(a.get("problem_difficulty", "simple"), 1.0)
        weighted_scores.append(q * d)

    avg = sum(weighted_scores) / len(weighted_scores) if weighted_scores else 2.0

    # Map weighted score back to quality label
    if avg >= 4.5:
        overall_quality = "excellent"
    elif avg >= 3.0:
        overall_quality = "good"
    elif avg >= 1.5:
        overall_quality = "fair"
    else:
        overall_quality = "poor"

    # Commit signal — soft bonus only, never negative
    all_commits = []
    for repo in top_repos_data:
        all_commits.extend(repo.get("commit_messages", []))

    commit_bonus = "none"
    if len(all_commits) >= 30:
        commit_bonus = "strong"
    elif len(all_commits) >= 10:
        commit_bonus = "moderate"
    elif len(all_commits) >= 3:
        commit_bonus = "weak"

    # Active repos
    active_repos = [r for r in repos if not r.get("fork") and r.get("size", 0) > 10]
    dates = [r.get("pushed_at") for r in repos if r.get("pushed_at")]
    last_active = max(dates) if dates else None

    return {
        "exists": True,
        "username": github_data.get("username"),
        "total_public_repos": github_data.get("total_public_repos", 0),
        "active_repos_count": len(active_repos),
        "last_active": last_active,
        "repo_analyses": repo_analyses,
        "overall_code_quality": overall_quality,
        "languages_found": list(languages_found),
        "skills_verified_via_github": verified_via_github,
        "commit_bonus": commit_bonus,
        # Keep for backward compat
        "contribution_consistency": (
            "active"
            if len(active_repos) >= 5
            else "moderate" if len(active_repos) >= 2 else "sparse"
        ),
        "burst_detected": False,  # no longer penalized
        "commit_quality": {
            "score": 0.5,
            "assessment": f"{len(all_commits)} commits across top repos — treated as soft signal only",
            "is_lazy": False,
            "burst_detected": False,
        },
    }


async def run_github_audit(
    github_username: str,
    required_skills: list[str],
    preferred_skills: list[str],
) -> dict:
    if not github_username:
        return {"exists": False, "reason": "No GitHub username found on resume"}

    cached = await get_cached_github_data(github_username)
    if cached:
        logger.info(f"Using cached GitHub data for {github_username}")
        github_data = cached
    else:
        logger.info(f"Fetching GitHub data for {github_username}")
        github_data = await fetch_candidate_github(github_username, required_skills)
        if github_data:
            await cache_github_data(github_username, github_data)

    if not github_data:
        return {"exists": False, "reason": f"GitHub user '{github_username}' not found"}

    return await analyze_github_profile(github_data, required_skills, preferred_skills)
