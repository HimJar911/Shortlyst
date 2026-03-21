"""
Debug script — calls fetch_full_repo_data directly so it uses the exact same
logic as the real pipeline. Shows exactly what files were read and what content
Claude will see when doing code quality assessment.

Run from backend/ directory:
    python debug_github.py <github_username>
"""

import asyncio
import sys
from services.github_client import (
    get_user,
    get_repos,
    score_repos,
    fetch_full_repo_data,
)
from config import settings

USERNAME = sys.argv[1] if len(sys.argv) > 1 else "HimJar911"
REQUIRED_SKILLS = ["Python", "JavaScript", "TypeScript"]


async def main():
    print(f"\n{'='*60}")
    print(f"GITHUB DEBUG — {USERNAME}")
    print(f"{'='*60}")
    print(f"TOP_REPOS_TO_ANALYZE: {settings.TOP_REPOS_TO_ANALYZE}")
    print(f"MAX_FILES_TO_READ_PER_REPO: {settings.MAX_FILES_TO_READ_PER_REPO}")
    print(f"MAX_FILE_SIZE_TO_READ_BYTES: {settings.MAX_FILE_SIZE_TO_READ_BYTES}")

    user = await get_user(USERNAME)
    if not user:
        print("ERROR: User not found — check GITHUB_TOKEN in .env")
        return
    print(f"User found: {user.get('login')} | public_repos={user.get('public_repos')}")

    repos = await get_repos(USERNAME)
    scored = score_repos(repos, REQUIRED_SKILLS)
    top = scored[: settings.TOP_REPOS_TO_ANALYZE]
    print(f"\nTop {len(top)} repos selected: {[r['name'] for r in top]}")

    for repo in top:
        print(f"\n{'─'*50}")
        print(
            f"REPO: {repo['name']} | lang={repo.get('language')} | size={repo.get('size')}KB"
        )

        repo_data = await fetch_full_repo_data(USERNAME, repo, REQUIRED_SKILLS)

        source_files = repo_data.get("source_files", {})
        print(f"\n  Source files read: {len(source_files)}")

        if not source_files:
            print(
                "  WARNING: ZERO source files — Claude will see nothing and rate quality as basic/poor"
            )
        else:
            for fname, content in source_files.items():
                print(f"  OK {fname} — {len(content)} chars")
                print(
                    f"     Preview: {content[:200].strip().replace(chr(10), ' ')[:200]}"
                )

        print(f"\n  Commits found: {len(repo_data.get('commit_messages', []))}")
        print(f"  Has tests: {repo_data.get('has_tests')}")
        print(f"  Has CI: {repo_data.get('has_ci')}")
        print(f"  Languages: {list(repo_data.get('languages', {}).keys())}")

    print(f"\n{'='*60}")
    print("DEBUG COMPLETE")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    asyncio.run(main())
