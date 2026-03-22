"use client";

import { useState } from "react";
import UploadScreen from "./upload/UploadScreen";
import ProcessingScreen from "./ProcessingScreen";
import ResultsScreen from "./results/ResultsScreen";
import { useJobStore } from "@/store/jobStore";

type Screen = "upload" | "processing" | "results";

export default function ShortlystApp() {
  const [screen, setScreen] = useState<Screen>("upload");
  const hasResults = useJobStore((s) => s.results !== null);

  return (
    <>
      {screen === "upload" && (
        <UploadScreen
          onStart={() => setScreen("processing")}
          hasResults={hasResults}
          onCheckResults={() => setScreen("results")}
        />
      )}
      {screen === "processing" && <ProcessingScreen onComplete={() => setScreen("results")} />}
      {screen === "results" && <ResultsScreen onGoToUpload={() => setScreen("upload")} />}
    </>
  );
}
