import asyncio
import httpx
from typing import Optional
from config import settings
from utils.logger import get_logger

logger = get_logger(__name__)

GITHUB_API_BASE = "https://api.github.com"

HEADERS = {
    "Authorization": f"token {settings.GITHUB_TOKEN}",
    "Accept": "application/vnd.github.v3+json",
    "X-GitHub-Api-Version": "2022-11-28",
}


async def get(client: httpx.AsyncClient, url: str) -> Optional[dict | list]:
    try:
        response = await client.get(
            url, headers=HEADERS, timeout=settings.GITHUB_REQUEST_TIMEOUT
        )
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            logger.warning(f"GitHub 404: {url}")
            return None
        elif response.status_code == 403:
            logger.warning(f"GitHub rate limited: {url}")
            return None
        else:
            logger.warning(f"GitHub {response.status_code}: {url}")
            return None
    except Exception as e:
        logger.error(f"GitHub request failed {url}: {e}")
        return None


async def get_user(username: str) -> Optional[dict]:
    async with httpx.AsyncClient() as client:
        return await get(client, f"{GITHUB_API_BASE}/users/{username}")


async def get_repos(username: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        data = await get(
            client,
            f"{GITHUB_API_BASE}/users/{username}/repos?per_page=100&sort=pushed&type=public",
        )
        return data if isinstance(data, list) else []


async def get_commits(username: str, repo_name: str) -> list[dict]:
    async with httpx.AsyncClient() as client:
        data = await get(
            client,
            f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/commits?per_page={settings.MAX_COMMITS_TO_FETCH}&author={username}",
        )
        return data if isinstance(data, list) else []


async def get_repo_languages(username: str, repo_name: str) -> dict:
    async with httpx.AsyncClient() as client:
        data = await get(
            client, f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/languages"
        )
        return data if isinstance(data, dict) else {}


async def get_repo_contents(
    username: str, repo_name: str, path: str = ""
) -> Optional[list[dict]]:
    async with httpx.AsyncClient() as client:
        data = await get(
            client, f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/contents/{path}"
        )
        return data if isinstance(data, list) else None


async def get_file_content(
    username: str, repo_name: str, file_path: str
) -> Optional[str]:
    async with httpx.AsyncClient() as client:
        url = f"{GITHUB_API_BASE}/repos/{username}/{repo_name}/contents/{file_path}"
        logger.debug(f"Fetching file: {url}")
        data = await get(client, url)
        if not data or not isinstance(data, dict):
            logger.warning(f"No data returned for file: {file_path}")
            return None
        if data.get("size", 0) > settings.MAX_FILE_SIZE_TO_READ_BYTES:
            logger.info(f"Skipping large file {file_path} ({data.get('size')} bytes)")
            return None
        encoding = data.get("encoding")
        content = data.get("content", "")
        if encoding == "base64":
            import base64

            try:
                return base64.b64decode(content).decode("utf-8", errors="ignore")
            except Exception:
                return None
        return content


async def get_readme(username: str, repo_name: str) -> Optional[str]:
    for readme_name in ["README.md", "readme.md", "README.rst", "README"]:
        content = await get_file_content(username, repo_name, readme_name)
        if content:
            return content[:3000]
    return None


def score_repos(repos: list[dict], required_skills: list[str]) -> list[dict]:
    skill_to_language = {
        "python": ["Python"],
        "javascript": ["JavaScript"],
        "typescript": ["TypeScript"],
        "java": ["Java"],
        "c++": ["C++"],
        "go": ["Go"],
        "rust": ["Rust"],
        "ruby": ["Ruby"],
        "react": ["JavaScript", "TypeScript"],
        "next.js": ["JavaScript", "TypeScript"],
        "node.js": ["JavaScript"],
        "fastapi": ["Python"],
        "django": ["Python"],
        "flask": ["Python"],
        "spring": ["Java"],
    }
    relevant_languages = set()
    for skill in required_skills:
        langs = skill_to_language.get(skill.lower(), [])
        relevant_languages.update(langs)

    scored = []
    for repo in repos:
        if repo.get("fork"):
            continue
        if repo.get("size", 0) < 10:
            continue
        score = 0
        lang = repo.get("language") or ""
        if lang in relevant_languages:
            score += 3
        if repo.get("stargazers_count", 0) > 0:
            score += 1
        if repo.get("size", 0) > 100:
            score += 1
        if repo.get("description"):
            score += 1
        if not repo.get("archived"):
            score += 1
        scored.append({**repo, "_score": score})

    scored.sort(key=lambda x: (x["_score"], x.get("pushed_at", "")), reverse=True)
    return scored


async def fetch_full_repo_data(
    username: str, repo: dict, required_skills: list[str]
) -> dict:
    repo_name = repo["name"]

    commits, languages, readme, contents = await asyncio.gather(
        get_commits(username, repo_name),
        get_repo_languages(username, repo_name),
        get_readme(username, repo_name),
        get_repo_contents(username, repo_name),
    )

    commit_messages = []
    for c in commits[: settings.MAX_COMMITS_TO_FETCH]:
        msg = c.get("commit", {}).get("message", "")
        if msg:
            commit_messages.append(msg.split("\n")[0][:100])

    source_files = {}
    has_tests = False
    has_ci = False

    if contents:
        interesting_extensions = {
            ".py",
            ".js",
            ".ts",
            ".jsx",
            ".tsx",
            ".java",
            ".go",
            ".rs",
            ".rb",
            ".cpp",
            ".c",
            ".cs",
        }
        has_tests = any(
            f.get("name", "").lower() in ("test", "tests", "__tests__", "spec")
            or "test" in f.get("name", "").lower()
            for f in contents
        )
        has_ci = any(
            f.get("name", "")
            in (".github", ".gitlab-ci.yml", "Jenkinsfile", ".circleci")
            for f in contents
        )

        def is_useful_code_file(f: dict) -> bool:
            """Skip empty files, __init__.py with no real content, and oversized files."""
            name = f.get("name", "")
            size = f.get("size", 0)
            if size == 0:
                return False
            if size > settings.MAX_FILE_SIZE_TO_READ_BYTES:
                return False
            if not any(name.endswith(ext) for ext in interesting_extensions):
                return False
            # Skip tiny __init__.py — they're almost always just comments or empty
            if name == "__init__.py" and size < 100:
                return False
            return True

        def collect_code_files(items: list[dict]) -> list[dict]:
            return [f for f in items if is_useful_code_file(f)]

        code_files = collect_code_files(contents)

        # If no real code files at root, search subdirs up to 2 levels deep
        # Keep collecting across multiple subdirs until we hit MAX_FILES limit
        if not code_files:
            common_src_dirs = ["src", "app", "backend", "api", "lib", "core"]
            for item in contents:
                if item.get("type") != "dir":
                    continue
                dir_name = item.get("name", "").lower()
                if dir_name not in common_src_dirs:
                    continue

                sub_contents = await get_repo_contents(
                    username, repo_name, item["name"]
                )
                if not sub_contents:
                    continue

                sub_code_files = collect_code_files(sub_contents)

                # If nothing useful at this level, drill into its subdirs
                if not sub_code_files:
                    logger.debug(
                        f"No useful files in {item['name']}/, drilling into subdirs..."
                    )
                    # Fetch all subdirs in parallel
                    subdir_items = [s for s in sub_contents if s.get("type") == "dir"]
                    subdir_contents_list = await asyncio.gather(
                        *[
                            get_repo_contents(username, repo_name, s["path"])
                            for s in subdir_items
                        ]
                    )
                    for deep_contents in subdir_contents_list:
                        if deep_contents:
                            deep_code_files = collect_code_files(deep_contents)
                            sub_code_files.extend(deep_code_files[:3])
                        if len(sub_code_files) >= settings.MAX_FILES_TO_READ_PER_REPO:
                            break

                code_files.extend(sub_code_files)
                # Don't break — keep going through common_src_dirs to gather more files
                if len(code_files) >= settings.MAX_FILES_TO_READ_PER_REPO:
                    break

        # Read up to MAX_FILES_TO_READ_PER_REPO, prioritize larger/more meaningful files
        code_files_sorted = sorted(
            code_files, key=lambda f: f.get("size", 0), reverse=True
        )
        for f in code_files_sorted[: settings.MAX_FILES_TO_READ_PER_REPO]:
            file_path = f.get("path") or f.get("name")
            if file_path:
                logger.debug(f"Reading: {file_path}")
                content = await get_file_content(username, repo_name, file_path)
                if content and len(content.strip()) > 50:
                    source_files[f["name"]] = content[:3000]  # increased from 2000
                else:
                    logger.warning(
                        f"Skipped {file_path} — empty or no content returned"
                    )

    return {
        "name": repo_name,
        "description": repo.get("description"),
        "language": repo.get("language"),
        "stars": repo.get("stargazers_count", 0),
        "last_updated": repo.get("pushed_at"),
        "languages": languages,
        "commit_messages": commit_messages,
        "readme": readme,
        "source_files": source_files,
        "has_tests": has_tests,
        "has_ci": has_ci,
        "is_fork": repo.get("fork", False),
        "size": repo.get("size", 0),
    }


async def fetch_candidate_github(
    username: str, required_skills: list[str]
) -> Optional[dict]:
    user = await get_user(username)
    if not user:
        logger.info(f"GitHub user not found: {username}")
        return None

    repos = await get_repos(username)
    if not repos:
        return {
            "exists": True,
            "username": username,
            "user": user,
            "repos": [],
            "top_repos_data": [],
        }

    scored_repos = score_repos(repos, required_skills)
    top_repos = scored_repos[: settings.TOP_REPOS_TO_ANALYZE]

    top_repos_data = await asyncio.gather(
        *[fetch_full_repo_data(username, repo, required_skills) for repo in top_repos]
    )

    return {
        "exists": True,
        "username": username,
        "user": user,
        "total_public_repos": user.get("public_repos", 0),
        "repos": scored_repos,
        "top_repos_data": list(top_repos_data),
    }
