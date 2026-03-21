"use client";

interface ProgressBarProps {
  value: number;
  max?: number;
}

export default function ProgressBar({ value, max = 100 }: ProgressBarProps) {
  return (
    <div style={{
      width: "100%", height: 4,
      background: "rgba(0,0,0,0.06)", borderRadius: 4,
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      border: "1px solid rgba(255,255,255,0.5)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    }}>
      <div style={{
        width: `${(value / max) * 100}%`, height: "100%",
        background: "linear-gradient(90deg, var(--gray-800), var(--black))",
        borderRadius: 4, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)",
      }} />
    </div>
  );
}
