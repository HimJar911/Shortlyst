"use client";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "xs";
  dark?: boolean;
}

export default function StatusBadge({ status, size = "sm", dark = false }: StatusBadgeProps) {
  const styles: Record<string, { bg: string; color: string; label: string; border?: boolean }> = {
    confirmed: { bg: "rgba(10,10,10,0.85)", color: "#fff", label: "Confirmed" },
    unverified: { bg: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)", color: dark ? "#fff" : "var(--black)", label: "Unverified" },
    flagged: { bg: dark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.7)", color: dark ? "#fff" : "var(--black)", label: "Flagged", border: !dark },
    live: { bg: "rgba(10,10,10,0.85)", color: "#fff", label: "Live" },
    dead: { bg: dark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)", color: dark ? "#fff" : "var(--gray-600)", label: "Dead" },
  };
  const s = styles[status] || styles.unverified;
  const fs = size === "xs" ? 9 : 11;
  const pd = size === "xs" ? "2px 6px" : "3px 10px";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: pd,
      fontSize: fs, fontFamily: "var(--mono)", fontWeight: 500, letterSpacing: "0.05em",
      textTransform: "uppercase", borderRadius: 4,
      background: s.bg, color: s.color,
      border: s.border ? "1.5px solid rgba(0,0,0,0.2)" : "none",
      lineHeight: 1, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
    }}>
      {s.label === "Flagged" && <span style={{ marginRight: 3 }}>⚠</span>}
      {s.label}
    </span>
  );
}
