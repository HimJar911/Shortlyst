/**
 * api.ts — single boundary between the frontend and the Shortlyst backend.
 *
 * This is the ONLY file that knows the backend base URL or any transport detail.
 * Everything else in the app imports from here.
 */

// ─── Base URL ─────────────────────────────────────────────────────────────────

const BASE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000").replace(/\/$/, "");

// ─── Backend raw types ────────────────────────────────────────────────────────
// These mirror the Pydantic models in backend/models/ exactly as they arrive
// over the wire (snake_case). Do not transform here — transformers live
// in lib/transformers.ts (to be added later).

export type SkillStatus = "confirmed" | "unverified" | "flagged";
export type ComplexityLevel = "trivial" | "basic" | "intermediate" | "advanced";
export type CodeQualityLevel = "poor" | "fair" | "good" | "excellent";
export type JobStatus = "queued" | "phase1" | "phase2" | "phase3" | "complete" | "failed";

export interface ApiRepoData {
  name: string;
  language: string | null;
  stars: number;
  last_updated: string | null;
  description: string | null;
  has_tests: boolean;
  has_ci: boolean;
  complexity: ComplexityLevel;
  commit_messages: string[];
  readme_summary: string | null;
  is_tutorial_clone: boolean;
  languages_used: string[];
}

export interface ApiCodeQuality {
  naming_conventions: string | null;
  structure: string | null;
  has_error_handling: boolean;
  is_tutorial_clone: boolean;
  overall: CodeQualityLevel;
  summary: string | null;
}

export interface ApiGitHubSignal {
  exists: boolean;
  username: string | null;
  total_public_repos: number;
  repos: ApiRepoData[];
  contribution_consistency: string | null;
  last_active: string | null;
  commit_quality_score: number;
  recent_burst_detected: boolean;
  code_quality: ApiCodeQuality | null;
}

export interface ApiDeployedUrl {
  url: string;
  is_live: boolean;
  http_status: number | null;
  assessment: string | null;
  is_trivial: boolean;
  is_real_app: boolean;
  screenshot_taken: boolean;
}

export interface ApiVerifiedSkill {
  name: string;
  status: SkillStatus;
  evidence: string;
}

export interface ApiCandidateVerified {
  resume_index: number;
  file_name: string;
  name: string | null;
  email: string | null;
  github_signal: ApiGitHubSignal;
  deployed_urls: ApiDeployedUrl[];
  verified_skills: ApiVerifiedSkill[];
  jd_match_score: number;
  jd_match_reasoning: string | null;
  overall_rank: number | null;
  rank_reasoning: string | null;
}

export interface ApiRankedCandidate {
  rank: number;
  candidate: ApiCandidateVerified;
  overall_score: number;
  score_breakdown: Record<string, number>;
  recommendation: string;
}

export interface ApiEliminatedCandidate {
  resume_index: number;
  file_name: string;
  name: string | null;
  eliminated_in_phase: number;
  reason: string;
}

/** Shape of GET /jobs/{job_id}/results */
export interface AnalysisResult {
  job_id: string;
  total_submitted: number;
  total_eliminated_phase1: number;
  total_eliminated_phase2: number;
  total_ranked: number;
  ranked_candidates: ApiRankedCandidate[];
  eliminated_candidates: ApiEliminatedCandidate[];
  /** Present on the result object but not on the Pydantic AnalysisResult model —
   *  the pipeline injects jd_requirements into the stored dict (phase3.py).
   *  role_title is also injected here from the LLM extraction dict; it is NOT
   *  in the JDRequirements Pydantic model but IS present in the raw dict stored
   *  by phase3. */
  jd_requirements?: {
    role_title?: string | null;
    required_skills: string[];
    preferred_skills: string[];
    min_years_experience: number | null;
    education_required: string | null;
    requires_github: boolean;
    role_level: string | null;
    raw_jd: string;
  };
}

/** Shape of POST /analyze response */
export interface SubmitResponse {
  job_id: string;
  status: "queued";
  total_resumes: number;
  message: string;
}

// ─── SSE event payload types ──────────────────────────────────────────────────
// One type per event name emitted by the pipeline.

export interface PhaseStartData {
  phase: "phase1" | "phase2" | "phase3";
  message: string;
  /** Only present for phase2 */
  total?: number;
}

export interface JdParsedData {
  role_title: string | null;
  required_skills: string[];
}

export interface CandidatePassedPhase1Data {
  resume_index: number;
  file_name: string;
  name: string | null;
}

export interface CandidateEliminatedData {
  resume_index: number;
  file_name: string;
  phase: number;
  reason: string;
}

export interface PhaseCompleteData {
  phase: "phase1" | "phase2" | "phase3";
  /** Phase 1: how many passed */
  passed?: number;
  /** Phase 1: how many eliminated */
  eliminated?: number;
  /** Phase 2: how many verified */
  verified?: number;
}

export interface Phase2CandidateStartData {
  resume_index: number;
  name: string;
}

export interface Phase2CandidateCompleteData {
  resume_index: number;
  name: string;
  github_quality: string | null;
  deployment_signal: string | null;
}

export interface Phase2CandidateErrorData {
  resume_index: number;
  name: string;
  error: string;
}

export interface CompleteData {
  total_ranked: number;
  top_candidate: string | null;
}

export interface StreamErrorData {
  message: string;
}

// ─── SSECallbacks ─────────────────────────────────────────────────────────────

export interface SSECallbacks {
  onPhaseStart?: (data: PhaseStartData) => void;
  onJdParsed?: (data: JdParsedData) => void;
  onCandidatePassedPhase1?: (data: CandidatePassedPhase1Data) => void;
  onCandidateEliminated?: (data: CandidateEliminatedData) => void;
  onPhaseComplete?: (data: PhaseCompleteData) => void;
  onPhase2CandidateStart?: (data: Phase2CandidateStartData) => void;
  onPhase2CandidateComplete?: (data: Phase2CandidateCompleteData) => void;
  onPhase2CandidateError?: (data: Phase2CandidateErrorData) => void;
  onComplete?: (data: CompleteData) => void;
  onError?: (data: StreamErrorData) => void;
  onStreamEnd?: () => void;
  /** Fires if the EventSource connection itself fails (network drop, etc.) */
  onConnectionError?: (err: Event) => void;
}

// ─── FilterSettings ───────────────────────────────────────────────────────────
// Defined here (not in UploadScreen) so the API layer owns the contract.
// UploadScreen will import this type when it is wired up.

export interface FilterSettings {
  requireGithub: boolean;
  strictMatch: boolean;
}

// ─── Error class ──────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function throwIfError(res: Response): Promise<void> {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail ?? detail;
    } catch {
      // keep statusText fallback
    }
    throw new ApiError(res.status, detail);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Submit a new analysis job.
 *
 * @param jd        The job description — either pasted text (string) or an
 *                  uploaded file. Text files (.txt) are read client-side.
 *                  NOTE: The current backend only accepts plain text via the
 *                  `jd_text` form field. If a PDF is passed as a File, this
 *                  function calls file.text() which will produce garbled output.
 *                  A dedicated JD-parse endpoint or a PDF extraction library
 *                  (e.g. pdf-parse) should be added before PDF JD upload is
 *                  considered production-ready.
 *
 * @param resumes   Array of PDF File objects for the candidate resumes.
 *
 * @param filters   UI filter toggles sent alongside the analysis request.
 *
 * @returns         The job_id string to use for streaming and result fetching.
 */
export async function submitAnalysis(
  jd: string | File,
  resumes: File[],
  filters: FilterSettings,
): Promise<string> {
  // Resolve JD to a string the backend can accept
  const jdText = typeof jd === "string" ? jd : await jd.text();

  const form = new FormData();
  form.append("jd_text", jdText);
  form.append("require_github", filters.requireGithub ? "true" : "false");
  for (const file of resumes) {
    form.append("resumes", file);
  }

  const res = await fetch(`${BASE_URL}/analyze`, {
    method: "POST",
    body: form,
    // Do NOT set Content-Type manually — the browser sets it with the correct
    // multipart boundary when you pass a FormData body.
  });

  await throwIfError(res);

  const body = (await res.json()) as SubmitResponse;
  return body.job_id;
}

/**
 * Open a Server-Sent Events connection for a running job.
 * The backend sends all events as `data: <json>\n\n` using the default SSE
 * message type (no named event fields). Each JSON payload has the shape:
 *   { event: string, data: object }
 *
 * @returns A cleanup function — call it to close the EventSource (e.g. on
 *          component unmount or after onStreamEnd fires).
 */
export function streamJob(jobId: string, callbacks: SSECallbacks): () => void {
  const es = new EventSource(`${BASE_URL}/jobs/${jobId}/stream`);

  es.onmessage = (msg) => {
    let parsed: { event: string; data?: unknown };
    try {
      parsed = JSON.parse(msg.data);
    } catch {
      return; // skip malformed frames
    }

    const { event, data } = parsed;

    switch (event) {
      case "phase_start":
        callbacks.onPhaseStart?.(data as PhaseStartData);
        break;
      case "jd_parsed":
        callbacks.onJdParsed?.(data as JdParsedData);
        break;
      case "candidate_passed_phase1":
        callbacks.onCandidatePassedPhase1?.(data as CandidatePassedPhase1Data);
        break;
      case "candidate_eliminated":
        callbacks.onCandidateEliminated?.(data as CandidateEliminatedData);
        break;
      case "phase_complete":
        callbacks.onPhaseComplete?.(data as PhaseCompleteData);
        break;
      case "phase2_candidate_start":
        callbacks.onPhase2CandidateStart?.(data as Phase2CandidateStartData);
        break;
      case "phase2_candidate_complete":
        callbacks.onPhase2CandidateComplete?.(data as Phase2CandidateCompleteData);
        break;
      case "phase2_candidate_error":
        callbacks.onPhase2CandidateError?.(data as Phase2CandidateErrorData);
        break;
      case "complete":
        callbacks.onComplete?.(data as CompleteData);
        break;
      case "error":
        callbacks.onError?.(data as StreamErrorData);
        break;
      case "stream_end":
        callbacks.onStreamEnd?.();
        es.close();
        break;
      // Unknown events are silently ignored — the backend may add new event
      // types in future phases without breaking this client.
    }
  };

  es.onerror = (err) => {
    callbacks.onConnectionError?.(err);
  };

  return () => es.close();
}

/**
 * Fetch the final results for a completed job.
 *
 * Throws ApiError(202, ...) if the job is still running.
 * Throws ApiError(404, ...) if the job_id is unknown.
 */
export async function fetchResults(jobId: string): Promise<AnalysisResult> {
  const res = await fetch(`${BASE_URL}/jobs/${jobId}/results`);
  await throwIfError(res);
  return res.json() as Promise<AnalysisResult>;
}
