"""
Full end-to-end pipeline test — no mocks, no hardcoding.
Runs Phase 1 + Phase 2 (github audit + deployment verifier) + Phase 3 (ranking)
on real resumes with real JD.

Run from backend/:
    python test_e2e.py "Resume1.pdf" "Resume2.pdf" ...
"""

import asyncio
import sys
from agents.phase1_filter import extract_jd_requirements, run_phase1_batch
from agents.github_auditor import run_github_audit
from agents.deployment_verifier import verify_deployments
from agents.code_analyzer import run_code_analysis
from agents.ranking_agent import rank_candidates

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

RESUME_PATHS = sys.argv[1:] if len(sys.argv) > 1 else []


async def run_phase2_for_candidate(candidate: dict, jd_requirements: dict) -> dict:
    """Run all Phase 2 agents in parallel for a single candidate."""
    mechanical = candidate.get("mechanical", {})
    candidate_info = candidate.get("candidate_info", {})

    github_username = mechanical.get("github_username")
    all_urls = mechanical.get("all_urls", [])
    claimed_skills = candidate_info.get("skills", [])
    required_skills = jd_requirements.get("required_skills", []) + jd_requirements.get(
        "required_skills_any_of", []
    )
    preferred_skills = jd_requirements.get("preferred_skills", [])

    print(f"\n  [{candidate['file_name']}] Running Phase 2...")
    print(f"    GitHub: {github_username}")
    print(
        f"    URLs to check: {[u for u in all_urls if 'github.com' not in u and 'linkedin.com' not in u]}"
    )

    # Run github audit + deployment verifier in parallel
    github_task = run_github_audit(github_username, required_skills, preferred_skills)
    deployment_task = verify_deployments(all_urls)

    github_signal, deployment_signal = await asyncio.gather(
        github_task, deployment_task
    )

    # Run code analysis (uses github signal)
    code_analysis = await run_code_analysis(
        github_signal, claimed_skills, required_skills
    )

    print(f"    GitHub quality: {github_signal.get('overall_code_quality', 'N/A')}")
    print(
        f"    Deployment signal: {deployment_signal.get('signal')} — {deployment_signal.get('summary')}"
    )
    print(f"    Skills analysis: {code_analysis.get('summary')}")

    return {
        "resume_index": candidate["resume_index"],
        "file_name": candidate["file_name"],
        "name": candidate_info.get("name"),
        "email": mechanical.get("email"),
        "github_signal": github_signal,
        "deployment_signal": deployment_signal,
        "verified_skills": code_analysis.get("skill_verdicts", []),
        "candidate_info": candidate_info,
        "mechanical": mechanical,
    }


async def main():
    if not RESUME_PATHS:
        print("Usage: python test_e2e.py Resume1.pdf Resume2.pdf ...")
        print(
            "Example: python test_e2e.py HimanshuJarodiya_Resume.pdf FriendsResume.pdf"
        )
        return

    print("\n" + "=" * 60)
    print("SHORTLYST END-TO-END PIPELINE TEST")
    print(f"Resumes: {RESUME_PATHS}")
    print("=" * 60)

    # ── Phase 1 ──────────────────────────────────────────────────
    print("\n[PHASE 1] Extracting JD + filtering resumes...")
    jd_requirements = await extract_jd_requirements(SAMPLE_JD)
    print(f"  Role: {jd_requirements.get('role_title')}")
    print(f"  Required: {jd_requirements.get('required_skills')}")
    print(f"  Any of: {jd_requirements.get('required_skills_any_of')}")

    passed, eliminated = await run_phase1_batch(RESUME_PATHS, jd_requirements)
    print(f"\n  Passed: {len(passed)} | Eliminated: {len(eliminated)}")

    for e in eliminated:
        print(f"  ❌ {e['file_name']}: {e['reason']}")
    for p in passed:
        print(f"  ✅ {p['file_name']}: {p['candidate_info'].get('name')}")

    if not passed:
        print("\nNo candidates passed Phase 1. Done.")
        return

    # ── Phase 2 ──────────────────────────────────────────────────
    print(
        f"\n[PHASE 2] Deep verification for {len(passed)} candidates (all parallel)..."
    )
    phase2_tasks = [run_phase2_for_candidate(c, jd_requirements) for c in passed]
    verified_candidates = await asyncio.gather(*phase2_tasks)
    verified_candidates = list(verified_candidates)

    # ── Phase 3 ──────────────────────────────────────────────────
    print(f"\n[PHASE 3] Ranking {len(verified_candidates)} candidates...")
    rankings = await rank_candidates(verified_candidates, jd_requirements)

    # ── Final Output ─────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("FINAL RANKINGS")
    print("=" * 60)

    for r in rankings:
        print(f"\n#{r['rank']} — {r['name']} ({r['file_name']})")
        print(f"  Score: {r['overall_score']}/10 | {r['recommendation']}")
        print(f"  Breakdown: {r['score_breakdown']}")
        print(f"  Reasoning: {r['rank_reasoning']}")
        if r.get("key_strengths"):
            print(f"  Strengths: {r['key_strengths']}")
        if r.get("key_concerns"):
            print(f"  Concerns: {r['key_concerns']}")

    if eliminated:
        print(f"\n{'─'*40}")
        print(f"ELIMINATED ({len(eliminated)}):")
        for e in eliminated:
            print(f"  ❌ {e['file_name']}: {e['reason']}")

    print("\n" + "=" * 60)
    print("PIPELINE COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
