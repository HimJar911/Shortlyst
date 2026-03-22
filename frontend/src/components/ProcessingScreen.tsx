"use client";

import { useState, useEffect, useRef, ComponentType } from "react";
import dynamic from "next/dynamic";
import ProgressBar from "./ui/ProgressBar";
import { glass } from "@/lib/styles";
import { streamJob, fetchResults, ApiError } from "@/lib/api";
import { useJobStore } from "@/store/jobStore";
import type { PhaseProgress } from "@/store/jobStore";

import ParsingMoment       from "./moments/ParsingMoment";
import ReadingCodeMoment   from "./moments/ReadingCodeMoment";
import VisitingLinksMoment from "./moments/VisitingLinksMoment";
import SkillVerdictsMoment from "./moments/SkillVerdictsMoment";
import SynthesizingMoment  from "./moments/SynthesizingMoment";
import MeritLineMoment     from "./moments/MeritLineMoment";

// ─── Dynamic imports (canvas + rotator are client-only) ───────────────────────

const VisualRotator = dynamic(
  () => import("./VisualRotator"),
  { ssr: false, loading: () => <div style={{ height: 340, borderRadius: 16 }} /> }
);

const ResumesToDiamondsDynamic = dynamic(
  () => import("./ResumesToDiamonds"),
  { ssr: false, loading: () => <div style={{ height: "100%", borderRadius: 16 }} /> }
);

// Wrapper so the conveyor fills the rotator slot at the correct height.
// Defined outside the component to keep a stable reference (no re-render churn).
const ConveyorMoment: ComponentType = () => <ResumesToDiamondsDynamic height={340} />;

// ─── Fixed rotation order ─────────────────────────────────────────────────────
// 1. Conveyor  2. Parsing  3. ReadingCode  4. VisitingLinks
// 5. Conveyor  6. SkillVerdicts  7. Synthesizing  8. MeritLine
const MOMENTS: ComponentType[] = [
  ConveyorMoment,
  ParsingMoment,
  ReadingCodeMoment,
  VisitingLinksMoment,
  ConveyorMoment,
  SkillVerdictsMoment,
  SynthesizingMoment,
  MeritLineMoment,
];

// ─── Progress helper ──────────────────────────────────────────────────────────

function computeProgress(pp: PhaseProgress): number {
  const { phase1, phase2, phase3 } = pp;
  const p1 = phase1.total > 0
    ? Math.min((phase1.complete + phase1.eliminated) / phase1.total, 1)
    : 0;
  const p2 = phase2.total > 0
    ? Math.min(phase2.complete / phase2.total, 1)
    : 0;
  const p3 = phase3.complete;
  return Math.round(p1 * 33 + p2 * 33 + p3 * 34);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  onComplete: () => void;
}

export default function ProcessingScreen({ onComplete }: ProcessingScreenProps) {
  const [phase, setPhase] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);

  // Keep onComplete stable inside the SSE effect closure.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  const jobId        = useJobStore((s) => s.jobId);
  const logLines     = useJobStore((s) => s.logLines);
  const phaseProgress = useJobStore((s) => s.phaseProgress);
  const {
    setStatus,
    setPhase2Total,
    incrementPhase1Complete,
    incrementPhase1Eliminated,
    incrementPhase2Complete,
    markPhase3Complete,
    appendLogLine,
    setResults,
  } = useJobStore.getState();

  const progress = computeProgress(phaseProgress);

  // Auto-scroll log to bottom on new entries.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  // ── SSE + polling fallback ─────────────────────────────────────────────────
  useEffect(() => {
    if (!jobId) return;

    let completed = false;
    let pollingInterval: ReturnType<typeof setInterval> | null = null;

    const handleComplete = () => {
      if (completed) return;
      completed = true;
      if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
      markPhase3Complete();
      setStatus("complete");
      onCompleteRef.current();
    };

    const startPolling = () => {
      if (pollingInterval || completed) return;
      pollingInterval = setInterval(async () => {
        try {
          const results = await fetchResults(jobId);
          setResults(results);
          handleComplete();
        } catch (err) {
          // 202 = job still running — keep polling.
          if (err instanceof ApiError && err.status === 202) return;
          // Other errors (404, 500): stop polling but don't transition.
          if (pollingInterval) { clearInterval(pollingInterval); pollingInterval = null; }
          appendLogLine(`Polling error: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }, 4_000);
    };

    const closeSSE = streamJob(jobId, {

      onPhaseStart: (data) => {
        const num = data.phase === "phase1" ? 1 : data.phase === "phase2" ? 2 : 3;
        setPhase(num);
        setStatus(data.phase);
        if (data.phase === "phase2" && data.total != null) setPhase2Total(data.total);
        appendLogLine(data.message);
      },

      onJdParsed: (data) => {
        const skills = data.required_skills.slice(0, 5).join(", ");
        appendLogLine(
          `JD parsed — role: ${data.role_title ?? "unknown"}${skills ? ` · skills: ${skills}` : ""}`
        );
      },

      onCandidatePassedPhase1: (data) => {
        incrementPhase1Complete();
        appendLogLine(`✓ ${data.name ?? data.file_name} — passed phase 1`);
      },

      onCandidateEliminated: (data) => {
        incrementPhase1Eliminated();
        appendLogLine(`✗ ${data.file_name} — eliminated (${data.reason})`);
      },

      onPhaseComplete: (data) => {
        if (data.phase === "phase1") {
          appendLogLine(`Phase 1 complete — ${data.passed ?? 0} passed, ${data.eliminated ?? 0} eliminated`);
        } else if (data.phase === "phase2") {
          appendLogLine(`Phase 2 complete — ${data.verified ?? 0} verified`);
        } else if (data.phase === "phase3") {
          appendLogLine("Phase 3 complete — ranking finalised");
        }
      },

      onPhase2CandidateStart: (data) => {
        appendLogLine(`Verifying ${data.name}…`);
      },

      onPhase2CandidateComplete: (data) => {
        incrementPhase2Complete();
        const notes = [data.github_quality, data.deployment_signal].filter(Boolean).join(", ");
        appendLogLine(`✓ ${data.name} verified${notes ? ` — ${notes}` : ""}`);
      },

      onPhase2CandidateError: (data) => {
        // Count errors as complete so progress doesn't stall.
        incrementPhase2Complete();
        appendLogLine(`⚠ ${data.name} — verification error: ${data.error}`);
      },

      onComplete: (data) => {
        const n = data.total_ranked;
        appendLogLine(
          `Analysis complete — ${n} candidate${n !== 1 ? "s" : ""} ranked` +
          (data.top_candidate ? ` · top: ${data.top_candidate}` : "")
        );
        // Fetch results independently of the transition so the results screen
        // has data ready when it mounts.
        fetchResults(jobId)
          .then((results) => setResults(results))
          .catch(() => {/* results screen can re-fetch if null */})
          .finally(() => handleComplete());
      },

      onError: (data) => {
        appendLogLine(`Pipeline error: ${data.message}`);
        setStatus("failed");
      },

      // SSE stream closed by server — if completion hasn't been signalled yet,
      // fall back to polling so we don't leave the user stuck.
      onStreamEnd: () => {
        if (!completed) startPolling();
      },

      // Network drop: start polling immediately.
      onConnectionError: () => {
        appendLogLine("Connection interrupted — polling for results…");
        startPolling();
      },
    });

    return () => {
      closeSSE();
      if (pollingInterval) clearInterval(pollingInterval);
    };
  }, [jobId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--sans)",
      }}
    >
      <header style={{ padding: "24px 40px", ...glass.header }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--black)" }}>
          Shortlyst
        </span>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 40,
        }}
      >
        <div style={{ width: "100%", maxWidth: 760 }}>
          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2
              style={{
                fontFamily: "var(--serif)",
                fontSize: 32,
                fontWeight: 400,
                marginBottom: 8,
              }}
            >
              Analyzing candidates
            </h2>
            <p style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 300 }}>
              Verifying claims against real-world evidence
            </p>
          </div>

          {/* ── Visual rotation system — untouched ── */}
          <VisualRotator moments={MOMENTS} intervalMs={8000} fadeDurationMs={800} />

          {/* Phase indicators */}
          <div
            style={{
              display: "flex",
              gap: 24,
              marginTop: 28,
              marginBottom: 28,
              justifyContent: "center",
            }}
          >
            {[1, 2, 3].map((p) => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontFamily: "var(--mono)",
                    fontWeight: 500,
                    transition: "all 0.3s",
                    background:
                      phase >= p ? "rgba(10,10,10,0.85)" : "rgba(255,255,255,0.5)",
                    color: phase >= p ? "#fff" : "var(--gray-400)",
                    border: `1px solid ${phase >= p ? "transparent" : "rgba(0,0,0,0.08)"}`,
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    boxShadow: phase >= p ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                  }}
                >
                  {p}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: phase === p ? 500 : 300,
                    color: phase >= p ? "var(--black)" : "var(--gray-400)",
                  }}
                >
                  {p === 1 ? "Hard Filter" : p === 2 ? "Deep Verify" : "Ranking"}
                </span>
              </div>
            ))}
          </div>

          <ProgressBar value={progress} />

          {/* Status log */}
          <div
            ref={logRef}
            style={{
              marginTop: 24,
              height: 240,
              overflowY: "auto",
              padding: 20,
              borderRadius: 12,
              ...glass.surface,
            }}
          >
            {logLines.map((line, i) => (
              <div
                key={line.id}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color:
                    i === logLines.length - 1
                      ? "var(--black)"
                      : "var(--gray-500)",
                  marginBottom: 6,
                  lineHeight: 1.7,
                  display: "flex",
                  gap: 8,
                }}
              >
                <span
                  style={{ color: "var(--gray-300)", userSelect: "none", flexShrink: 0 }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {line.text}
              </div>
            ))}
            {progress < 100 && (
              <span
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color: "var(--gray-400)",
                  animation: "blink 1s infinite",
                }}
              >
                ▊
              </span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
