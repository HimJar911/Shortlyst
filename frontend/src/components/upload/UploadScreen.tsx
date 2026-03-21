"use client";

import { useState } from "react";
import { glass } from "@/lib/styles";

interface UploadScreenProps {
  onStart: () => void;
}

export default function UploadScreen({ onStart }: UploadScreenProps) {
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFiles, setResumeFiles] = useState<{ name: string }[]>([]);
  const [jdText, setJdText] = useState("");
  const [dragOverJd, setDragOverJd] = useState(false);
  const [dragOverResumes, setDragOverResumes] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("paste");
  const [demoLoaded, setDemoLoaded] = useState(false);

  const loadDemo = () => {
    setInputMode("paste");
    setJdText(`Senior Full-Stack Engineer — Lattice Technologies\n\nWe're looking for a Senior Full-Stack Engineer to join our platform team.\n\nHard Requirements:\n• React (3+ years)\n• Node.js / Express\n• TypeScript\n• AWS (EC2, S3, or Lambda)\n• PostgreSQL\n• GitHub profile required\n\nNice to Have:\n• GraphQL, Docker, CI/CD, Testing frameworks`);
    setResumeFiles([
      { name: "marcus_chen_resume.pdf" }, { name: "priya_sharma_resume.pdf" },
      { name: "james_obrien_resume.pdf" }, { name: "sarah_kim_resume.pdf" },
      { name: "david_park_resume.pdf" }, { name: "alex_turner_resume.pdf" },
      { name: "maria_gonzalez_resume.pdf" }, { name: "kevin_wu_resume.pdf" },
      { name: "fatima_alhassan_resume.pdf" }, { name: "chris_miller_resume.pdf" },
      { name: "jordan_lee_resume.pdf" }, { name: "nicole_brown_resume.pdf" },
    ]);
    setDemoLoaded(true);
  };

  const canStart = (jdFile || jdText.trim()) && resumeFiles.length > 0;

  const dropZoneStyle = (active: boolean) => ({
    height: 220, borderRadius: 12, display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center", cursor: "pointer",
    transition: "all 0.25s",
    ...glass.surface,
    border: active ? "1.5px solid rgba(0,0,0,0.2)" : "1px solid rgba(255,255,255,0.6)",
    boxShadow: active ? "0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.3)" : glass.surface.boxShadow,
  });

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--sans)" }}>
      <header style={{ padding: "24px 40px", display: "flex", alignItems: "center", justifyContent: "space-between", ...glass.header, position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--black)", letterSpacing: "-0.02em" }}>Shortlyst</span>
          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gray-400)", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recruitment Intelligence</span>
        </div>
        <button onClick={loadDemo} style={{
          padding: "8px 20px", fontSize: 12, fontFamily: "var(--mono)", fontWeight: 500,
          background: demoLoaded ? "rgba(0,0,0,0.05)" : "rgba(10,10,10,0.85)",
          color: demoLoaded ? "var(--gray-400)" : "var(--white)",
          border: "none", borderRadius: 6, cursor: "pointer",
          letterSpacing: "0.04em", textTransform: "uppercase", transition: "all 0.2s",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        }}>{demoLoaded ? "✓ Demo Loaded" : "Load Demo Data"}</button>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 820 }}>
          <div style={{ marginBottom: 56, textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, color: "var(--black)", lineHeight: 1.15, marginBottom: 16 }}>
              Verify talent.<br />Rank by evidence.
            </h1>
            <p style={{ fontSize: 16, color: "var(--gray-500)", fontWeight: 300, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              Upload a job description and resumes. Shortlyst verifies every claim against real code, real deployments, and real evidence.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            {/* JD Column */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-600)" }}>Job Description</label>
                <div style={{ display: "flex", gap: 0, borderRadius: 6, overflow: "hidden", ...glass.pill }}>
                  {(["upload", "paste"] as const).map(m => (
                    <button key={m} onClick={() => setInputMode(m)} style={{
                      padding: "4px 12px", fontSize: 11, fontFamily: "var(--mono)", border: "none", cursor: "pointer",
                      background: inputMode === m ? "rgba(10,10,10,0.85)" : "transparent",
                      color: inputMode === m ? "#fff" : "var(--gray-500)",
                      textTransform: "uppercase", letterSpacing: "0.05em", transition: "all 0.15s",
                    }}>{m}</button>
                  ))}
                </div>
              </div>
              {inputMode === "upload" ? (
                <div
                  onDragOver={e => { e.preventDefault(); setDragOverJd(true); }}
                  onDragLeave={() => setDragOverJd(false)}
                  onDrop={e => { e.preventDefault(); setDragOverJd(false); setJdFile(e.dataTransfer.files[0]); }}
                  onClick={() => {
                    const i = document.createElement("input");
                    i.type = "file"; i.accept = ".pdf,.txt,.doc,.docx";
                    i.onchange = (e) => { const t = e.target as HTMLInputElement; if (t.files) setJdFile(t.files[0]); };
                    i.click();
                  }}
                  style={dropZoneStyle(dragOverJd)}
                >
                  {jdFile ? (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{jdFile.name}</p>
                      <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>Click to replace</p>
                    </div>
                  ) : (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", ...glass.pill }}>
                        <span style={{ fontSize: 18, color: "var(--gray-400)" }}>↑</span>
                      </div>
                      <p style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 300 }}>Drop PDF or click to upload</p>
                    </div>
                  )}
                </div>
              ) : (
                <textarea
                  value={jdText}
                  onChange={e => setJdText(e.target.value)}
                  placeholder="Paste the job description here..."
                  style={{ width: "100%", height: 220, padding: 16, borderRadius: 12, fontFamily: "var(--sans)", fontSize: 14, resize: "none", outline: "none", color: "var(--black)", lineHeight: 1.6, ...glass.input }}
                />
              )}
            </div>

            {/* Resumes Column */}
            <div>
              <label style={{ display: "block", fontSize: 12, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-600)", marginBottom: 12, height: 24, lineHeight: "24px" }}>
                Resumes {resumeFiles.length > 0 && `· ${resumeFiles.length} files`}
              </label>
              <div
                onDragOver={e => { e.preventDefault(); setDragOverResumes(true); }}
                onDragLeave={() => setDragOverResumes(false)}
                onDrop={e => { e.preventDefault(); setDragOverResumes(false); setResumeFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
                onClick={() => {
                  const i = document.createElement("input");
                  i.type = "file"; i.accept = ".pdf"; i.multiple = true;
                  i.onchange = (e) => { const t = e.target as HTMLInputElement; if (t.files) setResumeFiles(prev => [...prev, ...Array.from(t.files!)]); };
                  i.click();
                }}
                style={dropZoneStyle(dragOverResumes)}
              >
                {resumeFiles.length > 0 ? (
                  <div style={{ textAlign: "center", padding: 16 }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>📑</div>
                    <p style={{ fontSize: 14, fontWeight: 500 }}>{resumeFiles.length} resume{resumeFiles.length > 1 ? "s" : ""} selected</p>
                    <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 4 }}>Click to add more</p>
                  </div>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", ...glass.pill }}>
                      <span style={{ fontSize: 18, color: "var(--gray-400)" }}>↑</span>
                    </div>
                    <p style={{ fontSize: 14, color: "var(--gray-500)", fontWeight: 300 }}>Drop resume PDFs or click to upload</p>
                    <p style={{ fontSize: 11, color: "var(--gray-400)", marginTop: 6 }}>Batch upload — all processed in parallel</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <button onClick={() => canStart && onStart()} style={{
              padding: "14px 48px", fontFamily: "var(--sans)", fontSize: 15, fontWeight: 500,
              background: canStart ? "linear-gradient(135deg, var(--gray-800), var(--black))" : "rgba(0,0,0,0.06)",
              color: canStart ? "#fff" : "var(--gray-400)",
              border: "none", borderRadius: 10, cursor: canStart ? "pointer" : "default",
              letterSpacing: "0.02em", transition: "all 0.25s",
              boxShadow: canStart ? "0 4px 20px rgba(0,0,0,0.15)" : "none",
            }}>Analyze Candidates</button>
            <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 12, fontWeight: 300 }}>
              {canStart ? "Ready — 12 resumes will be processed" : "Upload both inputs to continue"}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
