"""
Quick pipeline test — runs Phase 1 on a resume then GitHub audit.
Run from backend/ directory:
    python test_pipeline.py <path_to_resume.pdf> <github_username>
"""

import asyncio
import sys
from agents.phase1_filter import extract_jd_requirements, run_phase1
from agents.github_auditor import run_github_audit

SAMPLE_JD = """
Software Engineer Intern - Summer 2025

We're looking for a passionate software engineering intern to join our team.

Requirements:
- Currently pursuing a Bachelor's degree in Computer Science or related field
- Proficiency in at least one of: Python, Java, JavaScript, or TypeScript
- Experience with data structures and algorithms
- Familiarity with Git and version control
- Strong problem-solving skills

Nice to have:
- Experience with React or Node.js
- Knowledge of SQL or NoSQL databases
- Prior internship or project experience
- GitHub profile with public projects
"""

RESUME_PATH = sys.argv[1] if len(sys.argv) > 1 else None
TEST_GITHUB_USERNAME = sys.argv[2] if len(sys.argv) > 2 else None


async def main():
    print("\n" + "=" * 60)
    print("SHORTLYST PIPELINE TEST")
    print("=" * 60)

    print("\n[1/3] Extracting JD requirements...")
    jd_requirements = await extract_jd_requirements(SAMPLE_JD)
    print(f"  Role: {jd_requirements.get('role_title')}")
    print(f"  Required skills: {jd_requirements.get('required_skills')}")
    print(f"  Required any of: {jd_requirements.get('required_skills_any_of')}")
    print(f"  Min experience: {jd_requirements.get('min_years_experience')} years")
    print(f"  Education: {jd_requirements.get('education_required')}")

    if RESUME_PATH:
        print(f"\n[2/3] Running Phase 1 on: {RESUME_PATH}")
        result = await run_phase1(RESUME_PATH, 0, jd_requirements)
        print(f"  Passed: {result['passed']}")
        if result["passed"]:
            info = result["candidate_info"]
            print(f"  Name: {info.get('name')}")
            print(f"  Skills found: {info.get('skills', [])[:10]}")
            print(f"  Experience: {info.get('total_experience_years')} years")
            print(f"  Has degree: {info.get('has_degree')}")
            print(f"  GitHub on resume: {result['mechanical'].get('github_username')}")
        else:
            print(f"  ELIMINATED: {result['reason']}")
    else:
        print("\n[2/3] No resume path provided, skipping Phase 1")

    if TEST_GITHUB_USERNAME:
        print(f"\n[3/3] Running GitHub audit for: {TEST_GITHUB_USERNAME}")
        github_result = await run_github_audit(
            github_username=TEST_GITHUB_USERNAME,
            required_skills=jd_requirements.get("required_skills", [])
            + jd_requirements.get("required_skills_any_of", []),
            preferred_skills=jd_requirements.get("preferred_skills", []),
        )
        print(f"  GitHub exists: {github_result.get('exists')}")
        if github_result.get("exists"):
            print(f"  Total repos: {github_result.get('total_public_repos')}")
            print(f"  Active repos: {github_result.get('active_repos_count')}")
            print(
                f"  Overall code quality: {github_result.get('overall_code_quality')}"
            )
            print(f"  Languages found: {github_result.get('languages_found')}")
            print(
                f"  Skills verified via GitHub: {github_result.get('skills_verified_via_github')}"
            )
            print(
                f"  Commit bonus: {github_result.get('commit_bonus')} (soft signal only)"
            )

            print(f"\n  Repo breakdown:")
            for repo in github_result.get("repo_analyses", []):
                a = repo.get("assessment", {})
                print(f"\n    [{repo['name']}]")
                print(
                    f"      Problem: {a.get('problem_difficulty')} — {a.get('problem_summary')}"
                )
                print(
                    f"      Architecture: {a.get('architecture_quality')} — {a.get('architecture_notes')}"
                )
                print(
                    f"      Code: {a.get('code_sophistication')} — {a.get('code_notes')}"
                )
                print(
                    f"      Commits: {a.get('commit_signal')} — {a.get('commit_notes')}"
                )
                print(
                    f"      Overall: {a.get('overall_quality')} / {a.get('overall_complexity')}"
                )
                print(f"      Summary: {a.get('summary')}")
                if a.get("standout_signals"):
                    print(f"      Standout: {a.get('standout_signals')}")
                if a.get("concerns"):
                    print(f"      Concerns: {a.get('concerns')}")
    else:
        print("\n[3/3] No GitHub username provided, skipping audit")

    print("\n" + "=" * 60)
    print("TEST COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
