"use client";

import { useState } from "react";
import UploadScreen from "./upload/UploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import ResultsScreen from "./results/ResultsScreen";

type Screen = "upload" | "processing" | "results";

const screens: { key: Screen; label: string }[] = [
  { key: "upload", label: "1 · Upload" },
  { key: "processing", label: "2 · Processing" },
  { key: "results", label: "3 · Results" },
];

export default function ShortlystApp() {
  const [screen, setScreen] = useState<Screen>("upload");

  return (
    <>
      {screen === "upload" && <UploadScreen onStart={() => setScreen("processing")} />}
      {screen === "processing" && <ProcessingScreen onComplete={() => setScreen("results")} />}
      {screen === "results" && <ResultsScreen />}

      <div style={{
        position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
        display: "flex", gap: 0, borderRadius: 12, padding: 4, zIndex: 200,
        background: "rgba(10,10,10,0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.08)",
      }}>
        {screens.map(s => (
          <button key={s.key} onClick={() => setScreen(s.key)} style={{
            padding: "8px 18px", fontSize: 12, fontFamily: "var(--mono)", fontWeight: 500,
            background: screen === s.key ? "rgba(255,255,255,0.15)" : "transparent",
            color: screen === s.key ? "#fff" : "rgba(255,255,255,0.4)",
            border: "none", borderRadius: 8, cursor: "pointer",
            letterSpacing: "0.03em", transition: "all 0.15s",
          }}>{s.label}</button>
        ))}
      </div>
    </>
  );
}
