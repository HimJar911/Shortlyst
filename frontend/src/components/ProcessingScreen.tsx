"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import ProgressBar from "./ui/ProgressBar";
import { glass } from "@/lib/styles";

const ResumesToDiamonds = dynamic(() => import("./ResumesToDiamonds"), {
  ssr: false,
  loading: () => <div style={{ height: 340 }} />,
});

interface ProcessingScreenProps {
  onComplete: () => void;
}

const lines = [
  { text: "Parsing 12 resumes...", delay: 400 },
  { text: "Extracting skills, URLs, and experience from all documents", delay: 800 },
  { text: "Phase 1 — Hard filter running on 12 candidates", delay: 1200 },
  { text: "7 candidates eliminated — missing hard requirements", delay: 2200 },
  { text: "5 candidates advancing to Phase 2", delay: 2600 },
  { text: "Phase 2 — Deep verification started", delay: 3000 },
  { text: "GitHub API: Fetching repos, commits, and contribution graphs", delay: 3400 },
  { text: "Playwright: Loading 11 URLs in headless browsers", delay: 3800 },
  { text: "Reading source files from top repositories", delay: 4200 },
  { text: "Cross-referencing claimed skills against verified evidence", delay: 5000 },
  { text: "Code quality assessment complete", delay: 5800 },
  { text: "Phase 3 — Ranking by verified signal", delay: 6400 },
  { text: "Final shortlist ready — 5 candidates ranked", delay: 7200 },
];

export default function ProcessingScreen({ onComplete }: ProcessingScreenProps) {
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(0);
  const [statusLines, setStatusLines] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    lines.forEach((line, i) => {
      setTimeout(() => {
        setStatusLines(prev => [...prev, line.text]);
        setProgress(((i + 1) / lines.length) * 100);
        if (i < 5) setPhase(1); else if (i < 11) setPhase(2); else setPhase(3);
      }, line.delay);
    });
    setTimeout(onComplete, 8200);
  }, [onComplete]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [statusLines]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--sans)" }}>
      <header style={{ padding: "24px 40px", ...glass.header }}>
        <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--black)" }}>Shortlyst</span>
      </header>
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 760 }}>
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 32, fontWeight: 400, marginBottom: 8 }}>Analyzing candidates</h2>
            <p style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 300 }}>Verifying claims against real-world evidence</p>
          </div>

          {/* 3D animation */}
          <ResumesToDiamonds height={340} />

          <div style={{ display: "flex", gap: 24, marginTop: 28, marginBottom: 28, justifyContent: "center" }}>
            {[1, 2, 3].map(p => (
              <div key={p} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontFamily: "var(--mono)", fontWeight: 500, transition: "all 0.3s",
                  background: phase >= p ? "rgba(10,10,10,0.85)" : "rgba(255,255,255,0.5)",
                  color: phase >= p ? "#fff" : "var(--gray-400)",
                  border: `1px solid ${phase >= p ? "transparent" : "rgba(0,0,0,0.08)"}`,
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  boxShadow: phase >= p ? "0 2px 8px rgba(0,0,0,0.15)" : "none",
                }}>{p}</div>
                <span style={{ fontSize: 13, fontWeight: phase === p ? 500 : 300, color: phase >= p ? "var(--black)" : "var(--gray-400)" }}>
                  {p === 1 ? "Hard Filter" : p === 2 ? "Deep Verify" : "Ranking"}
                </span>
              </div>
            ))}
          </div>
          <ProgressBar value={progress} />
          <div ref={logRef} style={{ marginTop: 24, height: 240, overflowY: "auto", padding: 20, borderRadius: 12, ...glass.surface }}>
            {statusLines.map((line, i) => (
              <div key={i} style={{ fontFamily: "var(--mono)", fontSize: 12, color: i === statusLines.length - 1 ? "var(--black)" : "var(--gray-500)", marginBottom: 6, lineHeight: 1.7, display: "flex", gap: 8 }}>
                <span style={{ color: "var(--gray-300)", userSelect: "none", flexShrink: 0 }}>{String(i + 1).padStart(2, "0")}</span>{line}
              </div>
            ))}
            {statusLines.length < lines.length && (
              <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-400)", animation: "blink 1s infinite" }}>▊</span>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
