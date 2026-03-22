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


def _default_repo_assessment(repo_name: str = "unknown") -> dict:
    return {
        "repo_name": repo_name,
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


async def assess_repos_batch(repos_data: list[dict]) -> list[dict]:
    """
    Single LLM call that assesses ALL top repos for a candidate at once.
    Replaces N separate assess_repo_holistically calls.
    """
    if not repos_data:
        return []

    # Build per-repo sections
    repo_sections = []
    for repo in repos_data:
        source_files = repo.get("source_files", {})
        languages = repo.get("languages", {})
        commit_messages = repo.get("commit_messages", [])

        files_text = ""
        if source_files:
            for filename, content in source_files.items():
                files_text += f"\n--- {filename} ---\n{content}\n"
        else:
            files_text = "No source files fetched."

        lang_text = (
            ", ".join(f"{lang} ({bytes_:,} bytes)" for lang, bytes_ in languages.items())
            if languages
            else "Unknown"
        )

        tree_lines = [f"  {fname}" for fname in source_files.keys()]
        folder_tree = "\n".join(tree_lines) if tree_lines else "Structure not available"

        commit_text = build_commit_timeline(commit_messages)

        section = f"""=== REPO: {repo['name']} ===
Stars: {repo.get('stars', 0)} | Size: {repo.get('size', 0)}KB | Language: {repo.get('language', 'Unknown')}
README: {(repo.get('readme') or 'No README found.')[:1500]}
FOLDER STRUCTURE: {folder_tree}
LANGUAGES: {lang_text}
SOURCE FILES ({len(source_files)} files): {files_text[:4000]}
COMMITS ({len(commit_messages)} — low weight signal): {commit_text}"""
        repo_sections.append(section)

    all_repos_text = "\n\n".join(repo_sections)
    repo_names = [r["name"] for r in repos_data]

    system_prompt = """You are a senior engineering hiring manager assessing a candidate's GitHub repositories.
Your job is to judge the real sophistication of what was built — not surface patterns like test coverage or docstrings.

Weight your judgment in this exact order:
1. HIGHEST — Problem difficulty: What is this project actually doing? A messy multi-agent system beats a clean todo app.
2. HIGH — Architecture: Does the folder structure show systems thinking? Clear separation of concerns?
3. HIGH — Code sophistication: Do the sampled files show non-trivial logic, proper abstractions, real engineering?
4. LOWEST — Commit history: Treat this as a soft positive signal only. Many students build locally and push once.
   Few commits or a single push = completely neutral. Never penalize for this. Only give slight bonus for genuine development history."""

    user_prompt = f"""Assess each of these {len(repos_data)} GitHub repositories holistically.

{all_repos_text}

For EACH repo return an assessment object. Return JSON:
{{
    "assessments": [
        {{
            "repo_name": "exact repo name",
            "problem_difficulty": "trivial/simple/moderate/complex/advanced",
            "problem_summary": "one sentence — what does this project actually do",
            "architecture_quality": "poor/fair/good/excellent",
            "architecture_notes": "one sentence on folder structure and separation of concerns",
            "code_sophistication": "poor/fair/good/excellent",
            "code_notes": "one sentence on the actual logic and engineering in sampled files",
            "commit_signal": "none/weak/moderate/strong",
            "commit_notes": "one sentence — only note if genuinely interesting, otherwise say neutral",
            "is_tutorial_clone": true or false,
            "has_deployment_config": true or false,
            "overall_complexity": "trivial/basic/intermediate/advanced",
            "overall_quality": "poor/fair/good/excellent",
            "summary": "2-3 sentence honest holistic assessment",
            "standout_signals": ["up to 3 genuinely impressive things if any"],
            "concerns": ["up to 3 real concerns — only things that actually matter"]
        }}
    ]
}}

Complexity: trivial (hello world) < basic (single-purpose tool) < intermediate (multi-component, real integrations) < advanced (distributed systems, multi-agent pipelines)
Quality: poor (broken/plagiarized) < fair (shallow/copy-paste) < good (clean, real thought) < excellent (impressive architecture, production-grade)

You MUST return one assessment per repo: {repo_names}"""

    try:
        result = await call_llm_json(system_prompt, user_prompt, max_tokens=2000)
        assessments = result.get("assessments", [])

        # Build lookup by repo_name
        assessment_map = {a.get("repo_name", ""): a for a in assessments}

        # Return in same order as input, with fallbacks for missing ones
        ordered = []
        for repo in repos_data:
            name = repo["name"]
            if name in assessment_map:
                ordered.append(assessment_map[name])
            else:
                logger.warning(f"No assessment returned for repo {name}, using default")
                ordered.append(_default_repo_assessment(name))
        return ordered

    except Exception as e:
        logger.error(f"Batch repo assessment failed: {e}")
        return [_default_repo_assessment(r["name"]) for r in repos_data]


async def analyze_github_profile(
    github_data: dict,
    required_skills: list[str],
    preferred_skills: list[str],
) -> dict:
    repos = github_data.get("repos", [])
    top_repos_data = github_data.get("top_repos_data", [])

    for repo in top_repos_data:
        source_files = repo.get("source_files", {})
        logger.info(
            f"Repo {repo['name']}: {len(source_files)} source files: {list(source_files.keys())}"
        )

    # Single batched LLM call for all repos
    assessments = await assess_repos_batch(top_repos_data)

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
