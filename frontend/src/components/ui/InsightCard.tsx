"use client";

import { useState } from "react";
import type { Insight } from "@/types";

function InsightIcon({ type }: { type: string }) {
  const props = { width: 18, height: 18, fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (type) {
    case "code": return <svg viewBox="0 0 24 24" {...props}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
    case "target": return <svg viewBox="0 0 24 24" {...props}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case "git": return <svg viewBox="0 0 24 24" {...props}><circle cx="12" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><line x1="12" y1="9" x2="12" y2="12"/><path d="M12 12c0 3-6 3-6 6"/><path d="M12 12c0 3 6 3 6 6"/></svg>;
    case "signal": return <svg viewBox="0 0 24 24" {...props}><path d="M2 20h2V14h-2zm5 0h2V10H7zm5 0h2V6h-2zm5 0h2V2h-2z" fill="currentColor" stroke="none"/></svg>;
    default: return null;
  }
}

export default function InsightCard({ insight, index }: { insight: Insight; index: number }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: "18px 22px", borderRadius: 12, cursor: "default",
        transition: "all 0.25s cubic-bezier(0.4,0,0.2,1)",
        animation: `cardIn 0.4s ease-out ${index * 0.08}s both`,
        background: hovered ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.45)",
        backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
        border: hovered ? "1px solid rgba(255,255,255,0.9)" : "1px solid rgba(255,255,255,0.5)",
        boxShadow: hovered ? "0 8px 32px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,0.3)" : "0 2px 12px rgba(0,0,0,0.03)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          transition: "all 0.25s",
          background: hovered ? "rgba(10,10,10,0.85)" : "rgba(0,0,0,0.05)",
          color: hovered ? "#fff" : "var(--gray-600)",
        }}>
          <InsightIcon type={insight.icon} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontFamily: "var(--mono)", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-400)", marginBottom: 6 }}>{insight.label}</div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--gray-700)", fontWeight: 400, fontFamily: "var(--sans)", margin: 0 }}>{insight.text}</p>
        </div>
      </div>
    </div>
  );
}
