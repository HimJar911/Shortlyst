"use client";

export default function SynthesizingMoment() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(255,255,255,0.45)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        borderRadius: 16,
      }}
    >
      <style>{`
        @keyframes sym-shimmer {
          0%   { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes sym-sub-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Shimmer headline */}
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 64,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          background:
            "linear-gradient(90deg, #1a1a1a 20%, #d4d4d4 45%, #f0f0f0 50%, #d4d4d4 55%, #1a1a1a 80%)",
          backgroundSize: "300% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animation: "sym-shimmer 2.8s linear infinite",
        }}
      >
        Synthesizing
      </div>

      {/* Subtext */}
      <p
        style={{
          marginTop: 22,
          fontFamily: "var(--mono)",
          fontSize: 13,
          color: "var(--gray-500)",
          letterSpacing: "0.02em",
          animation: "sym-sub-in 0.6s ease forwards",
          animationDelay: "0.4s",
          opacity: 0,
        }}
      >
        Ranking candidates
      </p>
    </div>
  );
}
