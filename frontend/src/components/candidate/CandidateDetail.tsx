"use client";

import type { Candidate } from "@/types";
import { glass } from "@/lib/styles";
import SectionLabel from "@/components/ui/SectionLabel";
import StatusBadge from "@/components/ui/StatusBadge";
import SkillBadge from "@/components/ui/SkillBadge";
import InsightCard from "@/components/ui/InsightCard";

export default function CandidateDetail({ candidate }: { candidate: Candidate }) {
  const confirmed = candidate.skills.filter(s => s.status === "confirmed").length;
  const total = candidate.skills.length;
  const liveCount = candidate.deployments.filter(d => d.status === "live").length;

  return (
    <div style={{ animation: "fadeIn 0.3s ease-out" }}>
      {/* Header */}
      <div style={{ marginBottom: 40, paddingBottom: 32, borderBottom: "1px solid rgba(0,0,0,0.06)", textAlign: "center" }}>
        <div style={{
          fontFamily: "var(--serif)", fontSize: 26,
          background: "linear-gradient(135deg, var(--gray-800), var(--black))",
          color: "#fff", width: 64, height: 64, borderRadius: "50%",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,0.18)",
          margin: "0 auto 20px",
        }}>{candidate.score}</div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 12, marginBottom: 8 }}>
          <h1 style={{ fontFamily: "var(--serif)", fontSize: 36, fontWeight: 400, color: "var(--black)", lineHeight: 1.1 }}>{candidate.name}</h1>
          <span style={{ fontFamily: "var(--mono)", fontSize: 11, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Rank #{candidate.rank}</span>
        </div>
        <p style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 300, marginBottom: 28 }}>
          {candidate.school}{candidate.gpa !== "N/A" ? ` · ${candidate.gpa} GPA` : ""} · {candidate.experience} experience
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: 48 }}>
          {[
            { label: "Skills Confirmed", value: `${confirmed}/${total}` },
            { label: "Live Deployments", value: liveCount },
            { label: "GitHub", value: candidate.github.activity },
            { label: "Repos", value: candidate.github.repos },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <strong style={{ color: "var(--black)", fontWeight: 600, fontSize: 18, fontFamily: "var(--serif)" }}>{s.value}</strong>
              <span style={{ fontSize: 11, fontFamily: "var(--mono)", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Overview — Insight Cards */}
      <div style={{ marginBottom: 40 }}>
        <SectionLabel>Overview</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, padding: 16, borderRadius: 16, background: "rgba(0,0,0,0.02)", border: "1px solid rgba(0,0,0,0.03)" }}>
          {candidate.insights.map((insight, i) => <InsightCard key={insight.label} insight={insight} index={i} />)}
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 40 }}>
        <SectionLabel>Skills Verification</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {candidate.skills.map(s => <SkillBadge key={s.name} skill={s} />)}
        </div>
        <p style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 12, fontWeight: 300, fontStyle: "italic" }}>Hover over any skill for verification details</p>
      </div>

      {/* GitHub Stats */}
      <div style={{ marginBottom: 32 }}>
        <SectionLabel>GitHub Activity</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
          {[
            { label: "Repositories", value: candidate.github.repos },
            { label: "Commits (6mo)", value: candidate.github.commits6mo },
            { label: "Activity", value: candidate.github.activity },
          ].map(m => (
            <div key={m.label} style={{ padding: "18px 20px", borderRadius: 10, ...glass.surface }}>
              <div style={{ fontSize: 10, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 6 }}>{m.label}</div>
              <div style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--black)" }}>{m.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Repos + Deployments */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
          <div>
            <SectionLabel>Top Repositories</SectionLabel>
            <div style={{ ...glass.surface, borderRadius: 12, padding: "4px 20px" }}>
              {candidate.github.topRepos.map((r, i) => (
                <div key={r.name} style={{ padding: "16px 0", borderBottom: i < candidate.github.topRepos.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 500, color: "var(--black)" }}>{r.name}</span>
                    <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gray-500)", padding: "2px 8px", background: "rgba(0,0,0,0.04)", borderRadius: 4 }}>{r.lang}</span>
                    {r.stars > 0 && <span style={{ fontSize: 12, color: "var(--gray-400)" }}>★ {r.stars}</span>}
                  </div>
                  <p style={{ fontSize: 13, color: "var(--gray-500)", fontWeight: 300, lineHeight: 1.5, marginBottom: 4 }}>{r.desc}</p>
                  <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Complexity: {r.complexity}</span>
                </div>
              ))}
              {candidate.github.topRepos.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--gray-400)", fontStyle: "italic", padding: "16px 0" }}>No significant repositories found</p>
              )}
            </div>
          </div>
          <div>
            <SectionLabel>Deployments</SectionLabel>
            <div style={{ ...glass.surface, borderRadius: 12, padding: "4px 20px" }}>
              {candidate.deployments.map((d, i) => (
                <div key={d.url} style={{ padding: "16px 0", borderBottom: i < candidate.deployments.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <StatusBadge status={d.status} />
                    <span style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--gray-600)" }}>{d.url}</span>
                  </div>
                  <p style={{ fontSize: 13, color: "var(--gray-500)", fontWeight: 300, lineHeight: 1.5 }}>{d.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Commit History */}
      <div style={{ marginBottom: 40 }}>
        <SectionLabel>Commit History</SectionLabel>
        <div style={{ ...glass.surface, borderRadius: 10, padding: "16px 20px" }}>
          <p style={{ fontSize: 14, color: "var(--gray-600)", fontWeight: 300, lineHeight: 1.65, fontStyle: "italic" }}>{candidate.commitStyle}</p>
        </div>
      </div>
    </div>
  );
}
