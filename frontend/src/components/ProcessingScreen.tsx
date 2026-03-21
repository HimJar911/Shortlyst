"use client";

import { useState, useEffect, useRef, ComponentType } from "react";
import dynamic from "next/dynamic";
import ProgressBar from "./ui/ProgressBar";
import { glass } from "@/lib/styles";

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

// ─── Status log data ──────────────────────────────────────────────────────────

// Delays spread across ~110 seconds so progress fills naturally over 2 minutes
const lines = [
  { text: "Parsing 12 resumes...",                                              delay:  2_000 },
  { text: "Extracting skills, URLs, and experience from all documents",         delay:  6_000 },
  { text: "Phase 1 — Hard filter running on 12 candidates",                    delay: 12_000 },
  { text: "7 candidates eliminated — missing hard requirements",                delay: 22_000 },
  { text: "5 candidates advancing to Phase 2",                                  delay: 28_000 },
  { text: "Phase 2 — Deep verification started",                                delay: 35_000 },
  { text: "GitHub API: Fetching repos, commits, and contribution graphs",       delay: 48_000 },
  { text: "Playwright: Loading 11 URLs in headless browsers",                   delay: 60_000 },
  { text: "Reading source files from top repositories",                         delay: 72_000 },
  { text: "Cross-referencing claimed skills against verified evidence",         delay: 85_000 },
  { text: "Code quality assessment complete",                                   delay: 96_000 },
  { text: "Phase 3 — Ranking by verified signal",                               delay: 106_000 },
  { text: "Final shortlist ready — 5 candidates ranked",                        delay: 116_000 },
];

// ─── Component ────────────────────────────────────────────────────────────────

interface ProcessingScreenProps {
  onComplete: () => void;
}

export default function ProcessingScreen({ onComplete }: ProcessingScreenProps) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lines.forEach((line, i) => {
      setTimeout(() => {
        setStatusLines((prev) => [...prev, line.text]);
        setProgress(((i + 1) / lines.length) * 100);
        if (i < 5) setPhase(1);
        else if (i < 11) setPhase(2);
        else setPhase(3);
      }, line.delay);
    });
    setTimeout(onComplete, 120_000); // 2 minutes — matches the full visual rotation cycle
  }, [onComplete]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [statusLines]);

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

          {/* ── Visual rotation system ── */}
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
            {statusLines.map((line, i) => (
              <div
                key={i}
                style={{
                  fontFamily: "var(--mono)",
                  fontSize: 12,
                  color:
                    i === statusLines.length - 1
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
                {line}
              </div>
            ))}
            {statusLines.length < lines.length && (
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
