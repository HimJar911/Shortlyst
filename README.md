<h1 align="center">Shortlyst</h1>

<p align="center">
  Multi-agent pipeline that verifies candidate claims against real code, real deployments, and real evidence — then ranks by what it finds.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/python-3.12+-blue?logo=python&logoColor=white" alt="Python"/>
  <img src="https://img.shields.io/badge/node-18+-green?logo=node.js&logoColor=white" alt="Node"/>
  <img src="https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi&logoColor=white" alt="FastAPI"/>
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/license-proprietary-red" alt="License"/>
</p>

<p align="center">
  <a href="https://shortlyst-five.vercel.app">Live Demo</a> · <a href="#quickstart">Quickstart</a> · <a href="#architecture">Architecture</a> · <a href="#api">API</a>
</p>

---

## Why

Resumes lie. Candidates list skills they barely touched, link repos full of tutorial forks, and claim "deployed" projects that never left localhost. Recruiters can't verify any of it at scale. Shortlyst automates the verification.

## What It Does

| Phase | Method | Detail |
|-------|--------|--------|
| **Filter** | LLM parsing + deterministic checks | Hard-gate on skills, experience, education, GitHub presence. Eliminated candidates get specific reasons. |
| **Verify** | GitHub audit + code analysis + deployment check | Repos assessed holistically via LLM. Skills cross-referenced against actual source code and repository evidence. URLs screenshotted with Playwright and analyzed by Vision AI. |
| **Rank** | Single weighted LLM call | GitHub (50%) · Deployment (30%) · Skills match (20%) |

All phases stream progress via SSE in real time.

## Live Deployment

| Service | URL |
|---------|-----|
| Frontend | [shortlyst-five.vercel.app](https://shortlyst-five.vercel.app) |
| Backend API | AWS ECS (Fargate) behind ALB |

## Architecture

<p align="center">
  <img src="docs/architecture.svg" alt="Shortlyst Architecture" width="700"/>
</p>

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Backend | FastAPI + Uvicorn | Async-native, SSE, Pydantic validation |
| LLM | Claude / GPT-4o (configurable) | Claude for reasoning, GPT-4o Vision for screenshots |
| Resume parsing | pdfplumber | Text + annotation URL extraction |
| Browser | Playwright | Headless Chromium screenshots |
| Cache | Redis | Job state, SSE queue, GitHub cache |
| HTTP | httpx | Async with semaphore + retry on 403 |
| Frontend | Next.js 16, React 19, Zustand | SSE-driven real-time updates, TypeScript |
| Hosting | Vercel (frontend) + AWS ECS Fargate (backend) | |

## Quickstart (Local)

**Prerequisites:** Python 3.12+ · Node.js 18+ · Redis · API keys

```bash
git clone https://github.com/HimJar911/Shortlyst.git && cd Shortlyst

# backend
cd backend
python -m venv venv && .\venv\Scripts\Activate.ps1   # Windows
pip install -r requirements.txt
python -m playwright install chromium

# frontend
cd ../frontend && npm install
```

Copy `.env.example` → `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...
REDIS_URL=redis://localhost:6379/0
LLM_PROVIDER=openai          # openai | anthropic
LLM_MODEL=gpt-4o
PLAYWRIGHT_NAVIGATION_TIMEOUT=30000
```

```bash
redis-server                                    # Terminal 1
cd backend && uvicorn main:app --port 8000      # Terminal 2
cd frontend && npm run dev                      # Terminal 3
```

→ [localhost:3000](http://localhost:3000)

## Usage

1. Paste or upload a job description.
2. Drop resume PDFs (batch supported).
3. Toggle **Require GitHub** if needed.
4. Click **Analyze Candidates** — watch real-time progress via live log feed.
5. View ranked results with scores, skill verification badges, deployment status, and elimination reasons.

## API

### `POST /analyze`

`multipart/form-data`

| Field | Type | Required | Notes |
|-------|------|:--------:|-------|
| `jd_text` | string | ✓ | Job description as plain text |
| `resumes` | file[] | ✓ | PDF resumes, max 1000 |

```json
→ { "job_id": "abc-123", "status": "queued", "total_resumes": 5 }
```

### `GET /jobs/{job_id}/stream`

SSE. Events: `phase_start` · `jd_parsed` · `candidate_passed_phase1` · `candidate_eliminated` · `phase2_candidate_start` · `phase2_candidate_complete` · `phase_complete` · `complete` · `error`

### `GET /jobs/{job_id}/results`

Ranked + eliminated candidates with scores and reasoning. `202` if still processing.

### `GET /health`

`→ { "status": "ok" }`

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Holistic GitHub assessment | Single LLM call per repo sees README + folder tree + languages + source files + commits. Problem difficulty as multiplier — advanced×good beats simple×excellent. |
| JD-only skill verification | Skills section shows only what the JD asks for. Resume skills are noise to the recruiter. |
| Deployment screenshot + Vision AI | Headless Chromium screenshots → Vision AI distinguishes real apps from templates and dead links. |
| GitHub semaphore | Caps concurrent API requests at 10. Prevents secondary rate limit bursts across parallel candidates. |
| Redis caching | GitHub data cached per username. Same candidate across runs = one API call. |

## License

Proprietary. All rights reserved.
