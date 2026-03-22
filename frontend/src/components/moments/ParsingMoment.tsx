"use client";

const LETTERS = "Parsing".split("");

const glassBase: React.CSSProperties = {
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
};

export default function ParsingMoment() {
  return (
    <div style={glassBase}>
      <style>{`
        @keyframes pm-letter-in {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Headline */}
      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 80,
          fontWeight: 400,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          color: "var(--black)",
        }}
      >
        {LETTERS.map((letter, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: 0,
              animation: `pm-letter-in 0.15s ease forwards`,
              animationDelay: `${i * 0.08}s`,
            }}
          >
            {letter}
          </span>
        ))}
      </div>

    </div>
  );
}
