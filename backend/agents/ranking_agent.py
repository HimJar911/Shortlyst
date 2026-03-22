"""
Ranking agent — Phase 3.
Takes all verified candidate profiles + JD requirements,
produces final ranked list with scores and reasoning.
One LLM call with all candidates at once.
"""

from services.claude_client import call_llm_json
from utils.logger import get_logger

logger = get_logger(__name__)


def build_candidate_summary(candidate: dict) -> str:
    """Build a compact text summary of a verified candidate for the ranking prompt."""
    name = candidate.get("name") or candidate.get("file_name", "Unknown")
    github = candidate.get("github_signal", {})
    deployments = candidate.get("deployment_signal", {})
    skills = candidate.get("verified_skills", [])

    lines = [f"CANDIDATE: {name}"]

    # GitHub signal
    if github.get("exists"):
        lines.append(
            f"GitHub: {github.get('overall_code_quality', 'unknown')} quality overall"
        )
        for repo in github.get("repo_analyses", [])[:3]:
            a = repo.get("assessment", {})
            lines.append(
                f"  - {repo['name']}: {a.get('problem_difficulty', '?')} problem, "
                f"{a.get('overall_quality', '?')} quality, {a.get('overall_complexity', '?')} complexity"
            )
            if a.get("standout_signals"):
                lines.append(f"    Standout: {', '.join(a['standout_signals'][:2])}")
    else:
        lines.append("GitHub: No GitHub profile")

    # Deployment signal
    dep_signal = deployments.get("signal", "none")
    dep_summary = deployments.get("summary", "")
    lines.append(f"Deployments: {dep_signal} — {dep_summary}")

    # Skill verdicts
    confirmed = [s for s in skills if s.get("status") == "confirmed"]
    flagged = [s for s in skills if s.get("status") == "flagged"]
    if confirmed:
        lines.append(f"Confirmed skills: {[s['skill'] for s in confirmed]}")
    if flagged:
        lines.append(f"Flagged skills: {[s['skill'] for s in flagged]}")

    return "\n".join(lines)


async def rank_candidates(
    verified_candidates: list[dict],
    jd_requirements: dict,
) -> list[dict]:
    """
    Takes all phase-2-verified candidates and ranks them.
    Returns list of dicts with rank, score, reasoning.
    """
    if not verified_candidates:
        logger.warning("No candidates to rank")
        return []

    if len(verified_candidates) == 1:
        c = verified_candidates[0]
        logger.info("Only one candidate — auto-ranked #1")
        return [
            {
                "rank": 1,
                "overall_score": 7.0,
                "score_breakdown": {"github_signal": 7.0, "deployment_signal": 5.0, "skills_match": 7.0},
                "recommendation": "Only qualified candidate — review manually",
                "rank_reasoning": "Sole survivor of Phase 1 and Phase 2 filters",
                "jd_alignment": "Only candidate — manual alignment review recommended",
                "key_strengths": [],
                "key_concerns": [],
                "candidate": {
                    "resume_index": c.get("resume_index", 0),
                    "file_name": c.get("file_name", ""),
                    "name": c.get("name"),
                    "email": c.get("email"),
                    "github_signal": c.get("github_signal", {}),
                    "deployment_signal": c.get("deployment_signal", {}),
                    "verified_skills": c.get("verified_skills", []),
                    "required_verdicts": c.get("required_verdicts", []),
                    "any_of_verdicts": c.get("any_of_verdicts", []),
                    "preferred_verdicts": c.get("preferred_verdicts", []),
                    "any_of_satisfied": c.get("any_of_satisfied", False),
                    "experience_years": c.get("experience_years"),
                    "education": c.get("education", []),
                    "candidate_info": c.get("candidate_info", {}),
                },
            }
        ]

    # Build candidate summaries
    candidate_summaries = []
    for i, c in enumerate(verified_candidates):
        summary = build_candidate_summary(c)
        candidate_summaries.append(f"[{i}] {summary}")

    candidates_text = "\n\n".join(candidate_summaries)

    role_title = jd_requirements.get("role_title", "Software Engineer")
    required_skills = jd_requirements.get("required_skills", [])
    preferred_skills = jd_requirements.get("preferred_skills", [])
    role_level = jd_requirements.get("role_level", "mid")

    system_prompt = """You are a senior engineering hiring manager making final ranking decisions.
You rank candidates based purely on verified real-world signal — actual code quality, actual deployed projects.
Resume claims mean nothing. GitHub signal and deployment evidence mean everything.
School name and GPA are irrelevant. A state school candidate with excellent real code beats an Ivy League candidate with dead links."""

    user_prompt = f"""Rank these candidates for the role: {role_title} ({role_level} level)

JD Required Skills: {required_skills}
JD Preferred Skills: {preferred_skills}

VERIFIED CANDIDATE PROFILES:
{candidates_text}

Rank ALL {len(verified_candidates)} candidates from best to worst fit.

Return JSON:
{{
    "rankings": [
        {{
            "candidate_index": 0,
            "rank": 1,
            "overall_score": 8.5,
            "score_breakdown": {{
                "github_signal": 9.0,
                "deployment_signal": 7.0,
                "skills_match": 8.0
            }},
            "rank_reasoning": "2-3 sentences explaining exactly why this rank — be specific about what code you saw",
            "jd_alignment": "One concise sentence on how well this candidate fits the specific role based on all verified evidence",
            "recommendation": "Strong hire / Hire / Maybe / Pass",
            "key_strengths": ["up to 3 specific verified strengths"],
            "key_concerns": ["up to 2 specific concerns based on evidence"]
        }}
    ]
}}

Scoring guide (0-10):
- github_signal: 9-10 excellent/advanced projects, 7-8 good/intermediate, 5-6 fair/basic, 1-4 poor or no GitHub
- deployment_signal: 9-10 multiple real apps live, 7-8 one real app, 5-6 live but trivial, 1-4 nothing live
- skills_match: 9-10 all required confirmed in code, 7-8 most confirmed, 5-6 some confirmed, 1-4 mostly unverified

Overall score = (github_signal * 0.5) + (deployment_signal * 0.3) + (skills_match * 0.2)

Include ALL {len(verified_candidates)} candidates in rankings array, ordered rank 1 to {len(verified_candidates)}."""

    try:
        result = await call_llm_json(system_prompt, user_prompt, max_tokens=2000)
        rankings = result.get("rankings", [])

        # Map back to candidate data — wrap in {rank, candidate, ...} shape
        # matching the Pydantic RankedCandidate model the frontend expects
        final_rankings = []
        for r in rankings:
            idx = r.get("candidate_index", 0)
            if idx >= len(verified_candidates):
                continue
            candidate = verified_candidates[idx]
            final_rankings.append(
                {
                    "rank": r.get("rank", idx + 1),
                    "overall_score": r.get("overall_score", 5.0),
                    "score_breakdown": r.get("score_breakdown", {}),
                    "recommendation": r.get("recommendation", "Maybe"),
                    "rank_reasoning": r.get("rank_reasoning", ""),
                    "jd_alignment": r.get("jd_alignment", ""),
                    "key_strengths": r.get("key_strengths", []),
                    "key_concerns": r.get("key_concerns", []),
                    "candidate": {
                        "resume_index": candidate.get("resume_index", idx),
                        "file_name": candidate.get("file_name", ""),
                        "name": candidate.get("name"),
                        "email": candidate.get("email"),
                        "github_signal": candidate.get("github_signal", {}),
                        "deployment_signal": candidate.get("deployment_signal", {}),
                        "verified_skills": candidate.get("verified_skills", []),
                        "required_verdicts": candidate.get("required_verdicts", []),
                        "any_of_verdicts": candidate.get("any_of_verdicts", []),
                        "preferred_verdicts": candidate.get("preferred_verdicts", []),
                        "any_of_satisfied": candidate.get("any_of_satisfied", False),
                        "experience_years": candidate.get("experience_years"),
                        "education": candidate.get("education", []),
                        "candidate_info": candidate.get("candidate_info", {}),
                    },
                }
            )

        # Sort by rank to be safe
        final_rankings.sort(key=lambda x: x["rank"])
        logger.info(f"Ranked {len(final_rankings)} candidates")
        return final_rankings

    except Exception as e:
        logger.error(f"Ranking failed: {e}")
        # Fallback — return candidates in original order, wrapped in correct shape
        return [
            {
                "rank": i + 1,
                "overall_score": 5.0,
                "score_breakdown": {},
                "recommendation": "Review manually",
                "rank_reasoning": "Ranking failed — manual review required",
                "key_strengths": [],
                "key_concerns": [],
                "candidate": {
                    "resume_index": c.get("resume_index", i),
                    "file_name": c.get("file_name", ""),
                    "name": c.get("name"),
                    "email": c.get("email"),
                    "github_signal": c.get("github_signal", {}),
                    "deployment_signal": c.get("deployment_signal", {}),
                    "verified_skills": c.get("verified_skills", []),
                    "experience_years": c.get("experience_years"),
                    "education": c.get("education", []),
                    "candidate_info": c.get("candidate_info", {}),
                },
            }
            for i, c in enumerate(verified_candidates)
        ]
