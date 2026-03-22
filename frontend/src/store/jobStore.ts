/**
 * jobStore.ts — global Zustand store for the active analysis job.
 *
 * Holds all state that outlives a single screen: job identity, pipeline
 * progress driven by SSE events, the running status log, and the final
 * fetched results. Screen components read from here; they do NOT hold their
 * own copies of this data.
 */

import { create } from "zustand";
import type { AnalysisResult, JobStatus } from "@/lib/api";

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LogLine {
  /** Monotonically increasing id — safe React key, no UUID needed. */
  id: number;
  text: string;
}

/**
 * Per-phase progress counters.
 *
 * `total` in phase1/phase2 is set once at the start of that phase so the
 * progress bar has a denominator. Phase 3 is a single ranking step (no
 * per-candidate events), so only `complete: 0 | 1` is tracked.
 */
export interface PhaseProgress {
  phase1: { total: number; complete: number; eliminated: number };
  phase2: { total: number; complete: number };
  phase3: { complete: 0 | 1 };
}

// ─── Store shape ──────────────────────────────────────────────────────────────

interface JobStore {
  // ── State ──────────────────────────────────────────────────────────────────

  /** null until a job is submitted. */
  jobId: string | null;

  /**
   * Mirrors the backend JobStatus enum.
   * null = no job in progress.
   * queued → phase1 → phase2 → phase3 → complete | failed
   */
  status: JobStatus | "failed" | null;

  /** Running counters for each pipeline phase. */
  phaseProgress: PhaseProgress;

  /**
   * Accumulated status log lines, driven by SSE events.
   * Append-only during a run; cleared on reset.
   */
  logLines: LogLine[];

  /**
   * The raw AnalysisResult from GET /jobs/{job_id}/results.
   * null until the job reaches "complete" and results are fetched.
   */
  results: AnalysisResult | null;

  // ── Actions ────────────────────────────────────────────────────────────────

  /** Call immediately after POST /analyze returns. */
  setJobId: (id: string) => void;

  /** Mirror status changes from SSE or polling. */
  setStatus: (status: JobStatus | "failed") => void;

  /**
   * Set the denominator for phase 1 progress.
   * Source: total_resumes from the POST /analyze response.
   */
  setPhase1Total: (total: number) => void;

  /**
   * Set the denominator for phase 2 progress.
   * Source: the `total` field on the phase2 `phase_start` SSE event.
   */
  setPhase2Total: (total: number) => void;

  /** Fire on each `candidate_passed_phase1` SSE event. */
  incrementPhase1Complete: () => void;

  /** Fire on each `candidate_eliminated` SSE event. */
  incrementPhase1Eliminated: () => void;

  /** Fire on each `phase2_candidate_complete` SSE event. */
  incrementPhase2Complete: () => void;

  /** Fire once on the `complete` SSE event (phase 3 is a single ranking step). */
  markPhase3Complete: () => void;

  /**
   * Append a human-readable line to the status log.
   * Callers build the text from SSE event fields; the store is text-agnostic.
   */
  appendLogLine: (text: string) => void;

  /** Store the final AnalysisResult after fetching GET /jobs/{id}/results. */
  setResults: (results: AnalysisResult) => void;

  /** Wipe all job state (e.g. "Analyze another batch"). */
  reset: () => void;
}

// ─── Initial values ───────────────────────────────────────────────────────────

const initialPhaseProgress: PhaseProgress = {
  phase1: { total: 0, complete: 0, eliminated: 0 },
  phase2: { total: 0, complete: 0 },
  phase3: { complete: 0 },
};

// Module-level counter — unique log line IDs within a session.
// Safe because IDs only need to be unique inside the logLines array at render
// time, not across server restarts or browser refreshes.
let _nextLogId = 0;

// ─── Store ────────────────────────────────────────────────────────────────────

export const useJobStore = create<JobStore>()((set) => ({
  // ── Initial state ─────────────────────────────────────────────────────────
  jobId: null,
  status: null,
  phaseProgress: {
    phase1: { ...initialPhaseProgress.phase1 },
    phase2: { ...initialPhaseProgress.phase2 },
    phase3: { ...initialPhaseProgress.phase3 },
  },
  logLines: [],
  results: null,

  // ── Actions ───────────────────────────────────────────────────────────────

  setJobId: (id) => set({ jobId: id }),

  setStatus: (status) => set({ status }),

  setPhase1Total: (total) =>
    set((s) => ({
      phaseProgress: {
        ...s.phaseProgress,
        phase1: { ...s.phaseProgress.phase1, total },
      },
    })),

  setPhase2Total: (total) =>
    set((s) => ({
      phaseProgress: {
        ...s.phaseProgress,
        phase2: { ...s.phaseProgress.phase2, total },
      },
    })),

  incrementPhase1Complete: () =>
    set((s) => ({
      phaseProgress: {
        ...s.phaseProgress,
        phase1: {
          ...s.phaseProgress.phase1,
          complete: s.phaseProgress.phase1.complete + 1,
        },
      },
    })),

  incrementPhase1Eliminated: () =>
    set((s) => ({
      phaseProgress: {
        ...s.phaseProgress,
        phase1: {
          ...s.phaseProgress.phase1,
          eliminated: s.phaseProgress.phase1.eliminated + 1,
        },
      },
    })),

  incrementPhase2Complete: () =>
    set((s) => ({
      phaseProgress: {
        ...s.phaseProgress,
        phase2: {
          ...s.phaseProgress.phase2,
          complete: s.phaseProgress.phase2.complete + 1,
        },
      },
    })),

  markPhase3Complete: () =>
    set((s) => ({
      phaseProgress: {
        ...s.phaseProgress,
        phase3: { complete: 1 },
      },
    })),

  appendLogLine: (text) =>
    set((s) => ({
      logLines: [...s.logLines, { id: _nextLogId++, text }],
    })),

  setResults: (results) => set({ results }),

  reset: () =>
    set({
      jobId: null,
      status: null,
      phaseProgress: {
        phase1: { ...initialPhaseProgress.phase1 },
        phase2: { ...initialPhaseProgress.phase2 },
        phase3: { ...initialPhaseProgress.phase3 },
      },
      logLines: [],
      results: null,
    }),
}));
