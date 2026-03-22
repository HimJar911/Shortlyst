<p align="center">
  <h1 align="center">Shortlyst</h1>
  <p align="center">
    <strong>AI-powered recruitment intelligence that verifies candidate claims against real code, real deployments, and real evidence.</strong>
  </p>
  <p align="center">
    <a href="#getting-started">Getting Started</a> · <a href="#how-it-works">How It Works</a> · <a href="#api-reference">API Reference</a> · <a href="#contributing">Contributing</a>
  </p>
</p>

---

## The Problem

Resumes lie. Candidates list skills they barely touched, link GitHub profiles full of tutorial forks, and claim "deployed" projects that are just localhost screenshots. Recruiters don't have time to verify any of it — so they guess.

## What Shortlyst Does

Shortlyst is a multi-agent pipeline that goes beyond resume text. Upload a batch of resumes and a job description, and it will:

1. **Filter** — Parse resumes with LLM-assisted extraction, then run deterministic checks against hard requirements (skills, experience, education, GitHub presence). Candidates who don't meet the bar are eliminated with specific reasons.

2. **Verify** — For surviving candidates, audit their GitHub repos (code quality, architecture, problem difficulty), run keyword-based skill matching against actual source code, and screenshot deployed project URLs with headless Chromium + vision AI to distinguish real apps from templates.

3. **Rank** — Score all verified candidates in a single LLM call using a weighted rubric: GitHub signal (50%), deployment signal (30%), skills match (20%).

Everything streams to the frontend in real time via Server-Sent Events, so you see candidate-by-candidate progress as it happens.

## Demo

```
Upload resumes + JD → Watch real-time screening → Get ranked results with evidence
```

The frontend is a glassmorphism-styled Next.js app. Results include scores, reasoning, verified skills, deployment screenshots, and specific elimination reasons for filtered candidates.

## How It Works

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│   UploadScreen → ProcessingScreen (SSE) → ResultsScreen  │
│                     Zustand store                        │
└───────────────┬──────────────────────────┬───────────────┘
                │ POST /analyze            │ GET /jobs/:id/stream
                │ GET /jobs/:id/results    │
┌───────────────▼──────────────────────────▼───────────────┐
│                   Backend (FastAPI)                       │
│                                                          │
│   ┌──────────┐   ┌───────────────┐   ┌───────────────┐  │
│   │ Phase 1  │──▶│   Phase 2     │──▶│   Phase 3     │  │
│   │ Filter   │   │   Verify      │   │   Rank        │  │
│   └────┬─────┘   └──┬────┬───┬──┘   └───────┬───────┘  │
│        │             │    │   │               │          │
│    LLM (parse     GitHub  │  Code         LLM (rank     │
│    + check)      Auditor  │  Analyzer     all at once)  │
│                  (LLM)    │  (keyword)                   │
│                           │                              │
│                  Deployment Verifier                     │
│                  (Playwright + Vision AI)                │
└───────────────┬──────────────────────────────────────────┘
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
| Backend | FastAPI + Uvicorn | Async-native, built-in SSE, Pydantic validation |
| LLM | OpenAI (GPT-4o) / Anthropic (Claude) | Configurable — OpenAI for vision, either for text |
| Resume Parsing | pdfplumber | Reliable text + annotation extraction from PDFs |
| Browser Automation | Playwright | Headless Chromium for deployment URL screenshots |
| Cache / Queue | Redis | Job state, SSE event queue, GitHub data cache |
| GitHub API | httpx | Async HTTP with retry and rate-limit handling |
| Frontend | Next.js 16 + React 19 | Server components, TypeScript, fast refresh |
| State | Zustand | Minimal boilerplate, persists across screen transitions |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- Redis server
- API keys: `ANTHROPIC_API_KEY` and/or `OPENAI_API_KEY`, plus `GITHUB_TOKEN`

### Install

```bash
git clone https://github.com/HimJar911/Shortlyst.git
cd Shortlyst

# Backend
cd backend
py -3.12 -m venv venv
.\venv\Scripts\Activate.ps1        # Windows
# source venv/bin/activate          # macOS / Linux
pip install --upgrade pip
pip install -r requirements.txt
python -m playwright install chromium

# Frontend
cd ../frontend
npm install
```

### Environment Variables

Create `backend/.env` (see `.env.example` at the repo root):

```env
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
GITHUB_TOKEN=ghp_...

# Optional (defaults shown)
REDIS_URL=redis://localhost:6379/0
LLM_PROVIDER=openai              # openai | anthropic
LLM_MODEL=gpt-4o
LLM_MODEL_MINI=gpt-4o-mini
LLM_MAX_CONCURRENT=3
MAX_CONCURRENT_RESUMES=50
PLAYWRIGHT_POOL_SIZE=10
APP_PORT=8000
```

The frontend reads `NEXT_PUBLIC_API_URL` (defaults to `http://localhost:8000`).

### Run

```bash
# Terminal 1 — Redis
redis-server

# Terminal 2 — Backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload

# Terminal 3 — Frontend
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Docker

```bash
docker-compose up --build
```

## Usage

1. Paste a job description (or upload a PDF) in the left panel.
2. Drop resume PDFs in the right panel — batch upload supported.
3. Optionally toggle **Require GitHub** to filter candidates without GitHub links.
4. Click **Analyze Candidates** — the pipeline streams progress in real time.
5. View ranked results with scores, insights, verified skills, and deployment evidence.

## API Reference

### `POST /analyze`

Submit resumes and a job description for analysis.

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `jd_text` | string | Yes* | Job description text |
| `jd_file` | file | Yes* | Job description PDF (*one of the two required) |
| `resumes` | file[] | Yes | Resume PDFs (max 1000, 10MB each) |
| `require_github` | boolean | No | Filter out candidates without GitHub links |

**Response:**
```json
{ "job_id": "abc-123", "status": "queued", "total_resumes": 5 }
```

### `GET /jobs/{job_id}/stream`

SSE stream of pipeline progress. Event types: `phase_start`, `jd_parsed`, `candidate_passed_phase1`, `candidate_eliminated`, `phase2_candidate_start`, `phase2_candidate_complete`, `phase_complete`, `complete`, `error`.

### `GET /jobs/{job_id}/results`

Final ranked results. Returns `202` if still processing, `404` if not found.

### `GET /health`

Redis connectivity check.

## Project Structure

```
Shortlyst/
├── backend/
│   ├── main.py                       # FastAPI app, lifespan, CORS
│   ├── config.py                     # Pydantic Settings
│   ├── agents/
│   │   ├── phase1_filter.py          # JD parsing, resume extraction, hard filters
│   │   ├── github_auditor.py         # GitHub repo assessment (batched LLM)
│   │   ├── code_analyzer.py          # Skill verification (keyword matching)
│   │   ├── ranking_agent.py          # Final candidate ranking (LLM)
│   │   └── deployment_verifier.py    # URL screenshot + vision analysis
│   ├── pipeline/
│   │   ├── orchestrator.py           # Phase 1 → 2 → 3 coordinator
│   │   ├── phase1.py                 # Batch resume screening
│   │   ├── phase2.py                 # Deep verification
│   │   └── phase3.py                 # Ranking + result assembly
│   ├── services/
│   │   ├── claude_client.py          # LLM abstraction (OpenAI / Anthropic)
│   │   ├── redis_queue.py            # Redis ops (jobs, results, SSE)
│   │   ├── github_client.py          # GitHub API client
│   │   ├── pdf_parser.py             # Resume PDF text + URL extraction
│   │   ├── playwright_service.py     # Browser pool for screenshots
│   │   └── vision_service.py         # Screenshot analysis via vision LLM
│   ├── models/                       # Pydantic models (job, candidate, result)
│   └── api/routes/                   # FastAPI route handlers
├── frontend/
│   ├── src/
│   │   ├── app/                      # Next.js app router
│   │   ├── components/               # Upload, processing, results, candidate views
│   │   ├── store/jobStore.ts         # Zustand global state
│   │   ├── lib/
│   │   │   ├── api.ts                # API client + SSE + types
│   │   │   ├── transformers.ts       # Backend → frontend data mapping
│   │   │   └── styles.ts             # Glassmorphism design tokens
│   │   └── types/index.ts            # Frontend domain types
│   └── package.json
├── docker-compose.yml
├── docker-compose.dev.yml
└── Makefile
```

## Design Decisions

**Skill verification is deterministic.** Code analysis uses regex-based keyword matching against README content and source files — no LLM involved. This makes skill verdicts reproducible, fast, and auditable. SQL variants (PostgreSQL, MySQL, SQLite) are handled as a family. Short skill names (Go, R, C) use case-sensitive matching to avoid false positives.

**Single-call batching over per-item calls.** The GitHub auditor assesses all top repos in a single prompt. The ranking agent scores all candidates in one call. This cuts latency and cost significantly compared to one LLM call per repo or per candidate.

**Deployment verification catches fakes.** URLs from resumes are filtered (skip social profiles, docs, package registries), loaded in headless Chromium, screenshotted, and analyzed by vision AI. The model assesses whether it's a real application, its complexity, and red flags like template clones or placeholder content.

**Commit history is soft signal only.** Commit frequency and recency are factored into GitHub assessment, but never penalize candidates. Sparse commit history doesn't mean someone can't code.

**LLM concurrency control.** All LLM calls go through a shared semaphore (configurable via `LLM_MAX_CONCURRENT`) to prevent tokens-per-minute spikes. Retries use exponential backoff with jitter, with specific handling for 429 rate-limit responses.

**GitHub data caching.** Fetched GitHub profiles are cached in Redis with a 1-hour TTL to avoid redundant API calls when the same candidate appears in multiple analyses.

## Contributing

1. Fork the repo and create a feature branch.
2. **Backend:** Run `pytest` from `backend/`. Keep LLM calls behind the existing `claude_client` abstraction.
3. **Frontend:** Ensure `npm run build` passes with no TypeScript errors.
4. **SSE contract:** If adding new pipeline events, update both `backend/models/result.py` and `frontend/src/lib/api.ts`.
5. Open a PR against `main`.

## License

Proprietary. All rights reserved.