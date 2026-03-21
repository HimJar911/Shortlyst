"""
Quick test for ranking agent using mock verified candidate data.
Run from backend/:
    python test_ranking.py
"""

import asyncio
from agents.ranking_agent import rank_candidates

# Mock two verified candidates based on what we saw in pipeline tests
MOCK_CANDIDATES = [
    {
        "resume_index": 0,
        "file_name": "HimanshuJarodiya_Resume.pdf",
        "name": "Himanshu Jarodiya",
        "github_signal": {
            "exists": True,
            "overall_code_quality": "good",
            "repo_analyses": [
                {
                    "name": "incidentiq",
                    "assessment": {
                        "problem_difficulty": "advanced",
                        "overall_quality": "excellent",
                        "overall_complexity": "advanced",
                        "problem_summary": "Autonomous incident response system with multi-agent pipeline on AWS",
                        "standout_signals": [
                            "Advanced multi-agent pipeline",
                            "AWS ECS + Bedrock",
                            "Real-time Slack integration",
                        ],
                    },
                },
                {
                    "name": "LoadAudit",
                    "assessment": {
                        "problem_difficulty": "complex",
                        "overall_quality": "good",
                        "overall_complexity": "advanced",
                        "problem_summary": "High-concurrency load testing platform with real-time observability",
                        "standout_signals": [
                            "Async load testing",
                            "System resource management",
                        ],
                    },
                },
            ],
        },
        "deployment_signal": {
            "signal": "none",
            "summary": "No deployed projects found",
        },
        "verified_skills": [
            {
                "skill": "Python",
                "status": "confirmed",
                "evidence": "Used throughout agents and services",
            },
            {
                "skill": "FastAPI",
                "status": "confirmed",
                "evidence": "API layer in incidentiq",
            },
            {
                "skill": "TypeScript",
                "status": "confirmed",
                "evidence": "Found in Shortlyst frontend",
            },
        ],
    },
    {
        "resume_index": 1,
        "file_name": "FriendsResume.pdf",
        "name": "Kaustubh Upadhyay",
        "github_signal": {
            "exists": True,
            "overall_code_quality": "excellent",
            "repo_analyses": [
                {
                    "name": "QuestWeaver",
                    "assessment": {
                        "problem_difficulty": "advanced",
                        "overall_quality": "excellent",
                        "overall_complexity": "advanced",
                        "problem_summary": "AI-powered interactive narrative platform with GPT-4 and Stable Diffusion",
                        "standout_signals": [
                            "GPT-4 + Stable Diffusion integration",
                            "ChromaDB semantic memory",
                            "Production-ready architecture",
                        ],
                    },
                },
                {
                    "name": "PassVault",
                    "assessment": {
                        "problem_difficulty": "advanced",
                        "overall_quality": "excellent",
                        "overall_complexity": "advanced",
                        "problem_summary": "Enterprise-grade zero-knowledge password manager with breach detection",
                        "standout_signals": [
                            "Zero-knowledge architecture",
                            "HaveIBeenPwned integration",
                            "Cryptographic security",
                        ],
                    },
                },
            ],
        },
        "deployment_signal": {
            "signal": "moderate",
            "summary": "1 real deployed app found — QuestWeaver live on Vercel",
        },
        "verified_skills": [
            {
                "skill": "Python",
                "status": "confirmed",
                "evidence": "FastAPI backend in PassVault",
            },
            {
                "skill": "TypeScript",
                "status": "confirmed",
                "evidence": "Frontend components",
            },
            {
                "skill": "React",
                "status": "confirmed",
                "evidence": "UI layer in QuestWeaver",
            },
        ],
    },
]

MOCK_JD = {
    "role_title": "Software Engineer Intern - Summer 2025",
    "role_level": "intern",
    "required_skills": ["Python", "data structures", "algorithms"],
    "preferred_skills": ["React", "FastAPI", "TypeScript"],
}


async def main():
    print("\n" + "=" * 60)
    print("RANKING AGENT TEST")
    print("=" * 60)

    rankings = await rank_candidates(MOCK_CANDIDATES, MOCK_JD)

    for r in rankings:
        print(f"\nRank #{r['rank']} — {r['name']}")
        print(f"  Score: {r['overall_score']}/10")
        print(f"  Breakdown: {r['score_breakdown']}")
        print(f"  Recommendation: {r['recommendation']}")
        print(f"  Reasoning: {r['rank_reasoning']}")
        print(f"  Strengths: {r['key_strengths']}")
        print(f"  Concerns: {r['key_concerns']}")

    print("\n" + "=" * 60)
    print("RANKING COMPLETE")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    asyncio.run(main())
