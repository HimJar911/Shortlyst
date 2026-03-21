"""
Test the live API — sends real resumes to POST /analyze, polls for results.
Run from backend/:
    python test_api.py
"""

import requests
import time
import json
import sys

BASE_URL = "http://localhost:8000"
RESUME_FILES = (
    sys.argv[1:]
    if len(sys.argv) > 1
    else ["HimanshuJarodiya_Resume.pdf", "FriendsResume.pdf"]
)
JD_TEXT = """
We need a Python backend engineer with FastAPI experience, data structures knowledge, and Git proficiency. Bachelor's degree required.
Bonus: React, TypeScript, cloud deployment experience.
"""

print(f"\nPosting {len(RESUME_FILES)} resumes to {BASE_URL}/analyze...")

# Build multipart form
files = [("resumes", (f, open(f, "rb"), "application/pdf")) for f in RESUME_FILES]
data = {"jd_text": JD_TEXT}

response = requests.post(f"{BASE_URL}/analyze", files=files, data=data)
print(f"Status: {response.status_code}")
print(f"Response: {response.json()}")

if response.status_code != 200:
    print("Failed to start job")
    sys.exit(1)

job_id = response.json()["job_id"]
print(f"\nJob ID: {job_id}")
print("Polling for status...\n")

# Poll until complete
while True:
    status_response = requests.get(f"{BASE_URL}/jobs/{job_id}")
    job = status_response.json()
    status = job.get("status")
    print(
        f"  Status: {status} | phase1_complete: {job.get('phase1_complete')} | phase2_complete: {job.get('phase2_complete')}"
    )

    if status == "complete":
        print("\nJob complete! Fetching results...")
        results_response = requests.get(f"{BASE_URL}/jobs/{job_id}/results")
        results = results_response.json()

        print(f"\n{'='*60}")
        print("FINAL RANKINGS")
        print(f"{'='*60}")
        print(f"Total submitted: {results['total_submitted']}")
        print(f"Eliminated phase1: {results['total_eliminated_phase1']}")
        print(f"Ranked: {results['total_ranked']}")

        for r in results.get("ranked_candidates", []):
            print(f"\n#{r['rank']} — {r['name']}")
            print(f"  Score: {r['overall_score']}/10 | {r['recommendation']}")
            print(f"  Reasoning: {r['rank_reasoning']}")

        if results.get("eliminated_candidates"):
            print(f"\nEliminated:")
            for e in results["eliminated_candidates"]:
                print(f"  ❌ {e.get('file_name', 'unknown')}: {e.get('reason', '')}")
        break

    elif status == "failed":
        print(f"\nJob failed: {job.get('error')}")
        break

    time.sleep(3)
