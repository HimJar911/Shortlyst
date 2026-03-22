"use client";

import { useState, useEffect } from "react";

interface Verdict {
  word: string;
  color: string;
  subtext: string;
  animationName?: string;
}

const VERDICTS: Verdict[] = [
  {
    word: "Confirmed",
    color: "#0a0a0a",
    subtext: "React — found across 7 repos",
  },
  {
    word: "Unverified",
    color: "#a3a3a3",
    subtext: "AWS — zero evidence found",
  },
  {
    word: "Flagged",
    color: "#0a0a0a",
    subtext: "Claims 2 years React — only a counter component",
    animationName: "svm-flagged-pulse",
  },
];

const HOLD_MS = 2500;
const FADE_MS = 300;

export default function SkillVerdictsMoment() {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % VERDICTS.length);
        setVisible(true);
      }, FADE_MS);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  const verdict = VERDICTS[idx];

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
        @keyframes svm-word-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes svm-flagged-pulse {
          0%, 100% { opacity: 1; }
          40%       { opacity: 0.55; }
          70%       { opacity: 0.85; }
        }
      `}</style>

      <div
        style={{
          opacity: visible ? 1 : 0,
          transition: `opacity ${FADE_MS}ms ease-in-out`,
          textAlign: "center",
          padding: "0 40px",
        }}
      >
        {/* The verdict word */}
        <div
          key={`${idx}-word`}
          style={{
            fontFamily: "var(--serif)",
            fontSize: 72,
            fontWeight: 400,
            lineHeight: 1,
            letterSpacing: "-0.02em",
            color: verdict.color,
            animation: verdict.animationName
              ? `${verdict.animationName} 0.9s ease-in-out infinite`
              : `svm-word-in 0.3s ease forwards`,
          }}
        >
          {verdict.word}
        </div>

      </div>
    </div>
  );
}
