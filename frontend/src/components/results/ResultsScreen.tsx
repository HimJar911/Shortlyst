"use client";

import { useState, useRef, useEffect } from "react";
import { glass } from "@/lib/styles";
import CandidateDetail from "@/components/candidate/CandidateDetail";
import { useJobStore } from "@/store/jobStore";
import { fetchResults, ApiError } from "@/lib/api";
import { transformResults } from "@/lib/transformers";

export default function ResultsScreen() {
  const [sidebarView, setSidebarView] = useState<"ranked" | "eliminated">("ranked");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const jobId   = useJobStore((s) => s.jobId);
  const stored  = useJobStore((s) => s.results);
  const setResults = useJobStore.getState().setResults;

  // If ProcessingScreen already fetched results (happy path), `stored` is
  // populated before this screen mounts. If not (direct navigation, refresh),
  // fetch now.
  useEffect(() => {
    if (stored || !jobId) return;
    fetchResults(jobId)
      .then(setResults)
      .catch((err) => {
        setFetchError(
          err instanceof ApiError
            ? `${err.status}: ${err.message}`
            : "Could not load results. Please try again."
        );
      });
  }, [jobId, stored]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed selectedId to the top-ranked candidate once data arrives.
  useEffect(() => {
    if (!stored || selectedId !== null) return;
    const first = stored.ranked_candidates[0];
    if (first) setSelectedId(first.candidate.resume_index);
  }, [stored]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loading / error guards ────────────────────────────────────────────────

  if (fetchError) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sans)" }}>
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 14, color: "#c0392b", marginBottom: 12 }}>{fetchError}</p>
          <p style={{ fontSize: 12, color: "var(--gray-400)", fontWeight: 300 }}>Check the backend is running and the job_id is valid.</p>
        </div>
      </div>
    );
  }

  if (!stored) {
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--sans)" }}>
        <p style={{ fontSize: 14, color: "var(--gray-400)", fontWeight: 300 }}>Loading results…</p>
      </div>
    );
  }

  // ── Transform ─────────────────────────────────────────────────────────────

  const { candidates, eliminated, jd } = transformResults(stored);

  const totalEliminated = stored.total_eliminated_phase1 + stored.total_eliminated_phase2;
  const selectedCandidate = candidates.find((c) => c.id === selectedId) ?? candidates[0];

  const selectCandidate = (id: number) => {
    setSelectedId(id);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--sans)" }}>
      <header style={{ padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, ...glass.header, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--black)" }}>Shortlyst</span>
          <span style={{ fontSize: 12, color: "var(--gray-400)", fontWeight: 300 }}>
            {jd.title}{jd.company ? ` · ${jd.company}` : ""}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 13, color: "var(--gray-500)", fontWeight: 300 }}>
          <span><strong style={{ color: "var(--black)", fontWeight: 500 }}>{stored.total_submitted}</strong> processed</span>
          <span><strong style={{ color: "var(--black)", fontWeight: 500 }}>{totalEliminated}</strong> eliminated</span>
          <span><strong style={{ color: "var(--black)", fontWeight: 500 }}>{stored.total_ranked}</strong> ranked</span>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <main ref={mainRef} style={{ flex: 1, overflowY: "auto", padding: "36px 48px 80px" }}>
          {selectedCandidate && <CandidateDetail candidate={selectedCandidate} />}
        </main>

        <aside style={{ width: 280, flexShrink: 0, display: "flex", flexDirection: "column", ...glass.panel, borderLeft: "1px solid rgba(0,0,0,0.06)" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
            <h2 style={{ fontFamily: "var(--serif)", fontSize: 18, fontWeight: 400, marginBottom: 12 }}>Results</h2>
            <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", ...glass.pill }}>
              {[
                { key: "ranked"    as const, label: `Ranked (${candidates.length})` },
                { key: "eliminated" as const, label: `Cut (${eliminated.length})` },
              ].map(v => (
                <button key={v.key} onClick={() => setSidebarView(v.key)} style={{
                  flex: 1, padding: "6px 8px", fontSize: 11, fontFamily: "var(--mono)",
                  fontWeight: sidebarView === v.key ? 500 : 400,
                  background: sidebarView === v.key ? "rgba(10,10,10,0.85)" : "transparent",
                  color: sidebarView === v.key ? "#fff" : "var(--gray-500)",
                  border: "none", cursor: "pointer", transition: "all 0.15s",
                  textTransform: "uppercase", letterSpacing: "0.03em",
                }}>{v.label}</button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {sidebarView === "ranked" && candidates.map(c => {
              const isActive = c.id === selectedCandidate?.id;
              return (
                <button key={c.id} onClick={() => selectCandidate(c.id)} style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 12,
                  padding: "14px 20px", border: "none", cursor: "pointer", textAlign: "left",
                  transition: "all 0.15s",
                  background: isActive ? "rgba(255,255,255,0.6)" : "transparent",
                  borderRight: isActive ? "3px solid var(--black)" : "3px solid transparent",
                  backdropFilter: isActive ? "blur(8px)" : "none",
                  WebkitBackdropFilter: isActive ? "blur(8px)" : "none",
                }}>
                  <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", width: 20, textAlign: "right", flexShrink: 0 }}>#{c.rank}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: isActive ? 500 : 400, color: isActive ? "var(--black)" : "var(--gray-700)", fontFamily: "var(--sans)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--gray-400)", fontWeight: 300, marginTop: 1 }}>{c.school ? (c.school.length > 22 ? c.school.slice(0, 22) + "…" : c.school) : ""}</div>
                  </div>
                  <span style={{ fontFamily: "var(--serif)", fontSize: 18, color: isActive ? "var(--black)" : "var(--gray-500)", flexShrink: 0 }}>{c.score}</span>
                </button>
              );
            })}
            {sidebarView === "eliminated" && eliminated.map((c, i) => (
              <div key={i} style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--black)", marginBottom: 3 }}>{c.name}</div>
                <div style={{ fontSize: 11, color: "var(--gray-500)", fontWeight: 300, lineHeight: 1.4 }}>{c.reason}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
