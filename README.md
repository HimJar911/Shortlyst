# Shortlyst

AI-powered recruitment intelligence that verifies candidate claims against real code, real deployments, and real evidence — then ranks by what it finds.

## Overview

Shortlyst is a multi-agent pipeline that screens job candidates by going beyond resume text. Given a job description and a batch of resumes, it:

1. **Filters** candidates against hard requirements (skills, experience, education, GitHub presence) using LLM-assisted resume parsing and deterministic checks.
2. **Verifies** surviving candidates by auditing their GitHub repositories (code quality, architecture, problem difficulty), checking deployed project URLs via browser automation and vision AI, and matching JD skills against actual source code.
3. **Ranks** all verified candidates in a single LLM call with a weighted scoring rubric: GitHub signal (50%), deployment signal (30%), skills match (20%).

The system is async-first — all phases stream progress to the frontend via Server-Sent Events so the user sees real-time candidate-by-candidate updates. Results are stored in Redis with a 24-hour TTL. The frontend is a glassmorphism-styled Next.js app with Zustand state management.

Key design decisions: skill verification uses keyword matching against source code (no LLM) for speed and determinism; GitHub repos are assessed in a single batched LLM call rather than per-repo; commit history is treated as soft signal only and never penalizes candidates; deployment URLs are screenshotted and analyzed by vision AI to distinguish real apps from templates.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                    │
│  UploadScreen → ProcessingScreen (SSE) → ResultsScreen  │
│                   Zustand store                         │
└──────────────┬──────────────────────────┬───────────────┘
               │ POST /analyze           │ GET /jobs/:id/stream (SSE)
               │ GET /jobs/:id/results   │
┌──────────────▼──────────────────────────▼───────────────┐
│                  Backend (FastAPI)                       │
│                                                         │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────────┐  │
│  │ Phase 1 │──▶│   Phase 2    │──▶│    Phase 3      │  │
│  │ Filter  │   │   Verify     │   │    Rank         │  │
│  └────┬────┘   └──┬───┬───┬──┘   └────────┬────────┘  │
│       │           │   │   │               │            │
│   LLM (parse  GitHub  │  Code         LLM (rank       │
│   + check)   Auditor  │  Analyzer     all candidates)  │
│              (LLM)    │  (keyword)                     │
│                       │                                │
│              Deployment Verifier                       │
│              (Playwright + Vision AI)                  │
└──────────────┬──────────────────────────────────────────┘
               │
        ┌──────▼──────┐
        │    Redis     │
        │  (job state, │
        │   results,   │
        │   SSE queue) │
        └─────────────┘
```

**Data flow:** User uploads resumes + JD → `POST /analyze` creates a job in Redis and launches the pipeline as a background task → each phase pushes SSE events → frontend subscribes via `GET /jobs/:id/stream` → on completion, frontend fetches `GET /jobs/:id/results`.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Backend framework | FastAPI + Uvicorn | Async-native, built-in SSE support, Pydantic validation |
| LLM providers | OpenAI (GPT-4o) / Anthropic (Claude) | Configurable; OpenAI for vision, either for text |
| Resume parsing | pdfplumber | Reliable text + annotation extraction from PDFs |
| Browser automation | Playwright | Headless Chromium for deployment URL screenshots |
| Queue/cache | Redis | Lightweight job state, SSE event queue, GitHub data cache |
| GitHub API | httpx | Async HTTP with retry/rate-limit handling |
| Frontend framework | Next.js 16 + React 19 | Server components, fast refresh, TypeScript |
| State management | Zustand | Minimal boilerplate, persists across screen transitions |
| Styling | Inline styles + glassmorphism tokens | No CSS framework dependency, consistent design system |

## Getting Started

### Prerequisites

- Python 3.12
- Node.js 18+
- Redis server
- API keys: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GITHUB_TOKEN`

### Installation

```bash
# Clone
git clone https://github.com/HimJar911/Shortlyst.git
cd Shortlyst

# Backend
cd backend
py -3.12 -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
# source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium

# Frontend
cd ../frontend
npm install
```

### Environment Setup

Create `backend/.env`:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...

# Optional (defaults shown)
REDIS_URL=redis://localhost:6379/0
LLM_PROVIDER=openai            # openai | anthropic
LLM_MODEL=gpt-4o
LLM_MODEL_MINI=gpt-4o-mini
LLM_MAX_CONCURRENT=3
MAX_CONCURRENT_RESUMES=50
PLAYWRIGHT_POOL_SIZE=10
APP_PORT=8000
```

Frontend uses `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

### Running Locally

```bash
# Terminal 1: Redis
redis-server

# Terminal 2: Backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload

# Terminal 3: Frontend
cd frontend
npm run dev
```

Open `http://localhost:3000`.

## Usage

1. Paste a job description (or upload a PDF) in the left panel.
2. Drop resume PDFs in the right panel (batch upload supported).
3. Optionally toggle "Require GitHub" to filter candidates without GitHub links.
4. Click "Analyze Candidates" — the pipeline streams progress in real time.
5. Results page shows ranked candidates with scores, insights, verified skills, and deployment evidence.
6. Eliminated candidates are listed with specific failure reasons.

### API Quick Reference

```bash
# Submit analysis
curl -X POST http://localhost:8000/analyze \
  -F "jd_text=Senior Python engineer..." \
  -F "resumes=@resume1.pdf" \
  -F "resumes=@resume2.pdf" \
  -F "require_github=false"
# → { "job_id": "abc-123", "status": "queued", "total_resumes": 2 }

# Stream progress (SSE)
curl http://localhost:8000/jobs/abc-123/stream

# Fetch results
curl http://localhost:8000/jobs/abc-123/results
```

## Project Structure

```
Shortlyst/
├── backend/
│   ├── main.py                    # FastAPI app, lifespan hooks, CORS
│   ├── config.py                  # Pydantic Settings (all env vars)
│   ├── agents/
│   │   ├── phase1_filter.py       # JD parsing, resume extraction, hard filters
│   │   ├── github_auditor.py      # GitHub repo assessment (batched LLM)
│   │   ├── code_analyzer.py       # Skill verification (keyword matching)
│   │   ├── ranking_agent.py       # Final candidate ranking (LLM)
│   │   └── deployment_verifier.py # URL screenshot + vision analysis
│   ├── pipeline/
│   │   ├── orchestrator.py        # Phase 1 → 2 → 3 coordinator
│   │   ├── phase1.py              # Batch resume screening
│   │   ├── phase2.py              # Deep verification (GitHub + deployments)
│   │   └── phase3.py              # Ranking + result assembly
│   ├── services/
│   │   ├── claude_client.py       # LLM abstraction (OpenAI/Anthropic)
│   │   ├── redis_queue.py         # Redis operations (jobs, results, SSE)
│   │   ├── github_client.py       # GitHub API client (repos, commits, files)
│   │   ├── pdf_parser.py          # Resume PDF text + URL extraction
│   │   ├── playwright_service.py  # Browser pool for screenshots
│   │   └── vision_service.py      # Screenshot analysis via vision LLM
│   ├── models/
│   │   ├── job.py                 # Job status, JD requirements
│   │   ├── candidate.py           # Candidate data models (raw → verified)
│   │   └── result.py              # Ranked results, SSE events
│   └── api/routes/                # FastAPI route handlers
├── frontend/
│   ├── src/
│   │   ├── app/                   # Next.js app router (layout, page)
│   │   ├── components/
│   │   │   ├── ShortlystApp.tsx   # Screen state machine
│   │   │   ├── upload/            # Upload page
│   │   │   ├── ProcessingScreen.tsx # Real-time progress + animations
│   │   │   ├── results/           # Results page + sidebar
│   │   │   ├── candidate/         # Candidate detail view
│   │   │   └── ui/                # Shared components (badges, cards)
│   │   ├── store/jobStore.ts      # Zustand global state
│   │   ├── lib/
│   │   │   ├── api.ts             # API client + SSE + types
│   │   │   ├── transformers.ts    # Backend → frontend data mapping
│   │   │   └── styles.ts          # Glassmorphism design tokens
│   │   └── types/index.ts         # Frontend domain types
│   └── package.json
└── docker-compose.yml
```

## Key Implementation Details

**LLM concurrency control.** All LLM calls go through a shared semaphore (`LLM_MAX_CONCURRENT`, default 3) to prevent tokens-per-minute spikes. Retries use exponential backoff with jitter, specifically handling 429 rate-limit responses.

**Single-call batching.** Rather than one LLM call per repo or per candidate, the GitHub auditor assesses all top repos in a single prompt and the ranking agent scores all candidates in one call. This reduces latency and cost significantly.

**Skill verification is deterministic.** Code analysis uses regex-based keyword matching against README content and source files — no LLM involved. This makes skill verdicts reproducible and fast. SQL variants (PostgreSQL, MySQL, SQLite) are handled as a family. Short skill names (Go, R, C) use case-sensitive matching to avoid false positives.

**Deployment verification pipeline.** URLs from resumes are filtered (skip social profiles, docs, package registries), then each is loaded in headless Chromium. Screenshots are sent to the vision LLM which assesses whether it's a real application, its complexity, and potential red flags (template clones, placeholder content).

**GitHub data caching.** Fetched GitHub profiles are cached in Redis with a 1-hour TTL to avoid redundant API calls if the same candidate appears in multiple analyses.

**SSE event streaming.** The backend pushes events to a Redis list per job. The frontend subscribes via `EventSource` and dispatches typed callbacks to update the Zustand store, which drives the progress UI.

## API Reference

### `POST /analyze`

Submit resumes and a job description for analysis.

**Request:** `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jd_text` | string | Yes* | Job description text |
| `jd_file` | file | Yes* | Job description PDF (*one of jd_text or jd_file required) |
| `resumes` | file[] | Yes | Resume PDFs (max 1000, max 10MB each) |
| `require_github` | boolean | No | Filter candidates without GitHub links |

**Response:** `200`
```json
{ "job_id": "uuid", "status": "queued", "total_resumes": 5, "message": "..." }
```

### `GET /jobs/{job_id}/stream`

SSE stream of pipeline progress events.

**Event types:** `phase_start`, `jd_parsed`, `candidate_passed_phase1`, `candidate_eliminated`, `phase2_candidate_start`, `phase2_candidate_complete`, `phase_complete`, `complete`, `error`

### `GET /jobs/{job_id}/results`

Fetch final results after pipeline completion.

**Response:** `200` — `AnalysisResult` with ranked candidates, eliminated candidates, scores, reasoning, and JD requirements. Returns `404` if job not found, `202` if still processing.

### `GET /health`

Redis connectivity check. Returns `200` with `{ "status": "ok" }`.

## Contributing

1. Fork the repo and create a feature branch.
2. Backend changes: run `pytest` from `backend/`. Keep LLM calls behind the existing `claude_client` abstraction.
3. Frontend changes: ensure `npm run build` passes with no TypeScript errors.
4. Maintain the SSE event contract — if adding new pipeline events, update both `backend/models/result.py` and `frontend/src/lib/api.ts`.
5. Open a PR against `main`.

## License

Proprietary. All rights reserved.
