"use client";

export default function MeritLineMoment() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
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
        @keyframes mlm-brand {
          0%   { opacity: 0; }
          25%  { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      <div
        style={{
          fontFamily: "var(--serif)",
          fontSize: 56,
          fontWeight: 400,
          lineHeight: 1.1,
          letterSpacing: "-0.025em",
          color: "var(--black)",
          textAlign: "center",
          animation: "mlm-brand 8s ease-in-out forwards",
          // prevent flicker before animation starts
          opacity: 0,
        }}
      >
        Merit over pedigree.
      </div>
    </div>
  );
}
