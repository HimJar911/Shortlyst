"use client";

import { useState, useMemo } from "react";
import { glass } from "@/lib/styles";
import { submitAnalysis } from "@/lib/api";
import type { FilterSettings } from "@/lib/api";
import { useJobStore } from "@/store/jobStore";
import { SkillLogos } from "@/components/ui/SkillLogos";

// Re-export so callers that imported FilterSettings from here keep working.
export type { FilterSettings };

interface UploadScreenProps {
  onStart: () => void;
}

// ─── Skill keyword extraction from JD text ──────────────────────────────────
// Build a canonical list from SkillLogos keys, deduplicating aliases.
// Also includes extra tech keywords that don't have logos but are real skills.

const EXTRA_SKILLS = [
  "Elixir", "Haskell", "Scala", "Clojure", "Erlang", "F#", "OCaml", "Zig",
  "Lua", "Dart", "Julia", "MATLAB", "Solidity", "Groovy", "Objective-C",
  "Snowflake", "dbt", "Airflow", "Spark", "Hadoop", "Flink", "Presto",
  "Pulumi", "Ansible", "Chef", "Puppet", "Vagrant", "Packer",
  "Prometheus", "Grafana", "Datadog", "Splunk", "ELK", "Logstash", "Kibana",
  "Elasticsearch", "Cassandra", "DynamoDB", "CouchDB", "Neo4j", "InfluxDB",
  "Supabase", "Prisma", "Drizzle", "Sequelize", "SQLAlchemy", "Mongoose",
  "Remix", "Astro", "SolidJS", "Qwik", "Nuxt", "Gatsby",
  "Cypress", "Playwright", "Selenium", "Jest", "Mocha", "Vitest", "pytest",
  "Storybook", "Webpack", "Vite", "esbuild", "Rollup", "Turbopack",
  "gRPC", "WebSocket", "OAuth", "JWT", "OpenAPI", "Swagger",
  "Figma", "Vercel", "Netlify", "Heroku", "DigitalOcean", "Cloudflare",
  "CircleCI", "TravisCI", "GitLab", "ArgoCD", "Helm",
  "RxJS", "Redux", "MobX", "Zustand", "Jotai",
  "Three.js", "D3.js", "Chart.js", "Mapbox",
  "Unity", "Unreal", "Godot", "OpenCV", "scikit-learn", "Keras", "Hugging Face",
  "LangChain", "OpenAI", "Pinecone", "Weaviate", "ChromaDB", "FAISS",
  "Celery", "Sidekiq", "BullMQ",
];

const SKILL_CANONICAL: { name: string; pattern: RegExp }[] = (() => {
  // Keep only canonical names (skip alias-only entries like CSharp, CPP, etc.)
  const canonical = new Set<string>();
  const skip = new Set([
    "CSharp", "csharp", "CPP", "cpp", "NextJS", "Next", "VueJS",
    "AngularJS", "Mongo", "Node", "Postgres", "DotNet", "TailwindCSS",
    "k8s", "HTML5", "CSS3",
  ]);

  for (const key of Object.keys(SkillLogos)) {
    if (!skip.has(key)) canonical.add(key);
  }
  for (const name of EXTRA_SKILLS) {
    canonical.add(name);
  }

  return Array.from(canonical).map((name) => {
    // Escape regex special chars then wrap with word-boundary logic.
    // For very short names (C, R, Go) require surrounding boundaries.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return { name, pattern: new RegExp(`(?:^|[\\s,;(/])${escaped}(?=[\\s,;)/.,!?:]|$)`, "i") };
  });
})();

// ─── Toggle component ─────────────────────────────────────────────────────────

interface ToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}

function Toggle({ label, description, value, onChange }: ToggleProps) {
  return (
    <div
      style={{
        flex: 1,
        minWidth: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 16,
        padding: "14px 18px",
        borderRadius: 10,
        cursor: "pointer",
        userSelect: "none",
        ...glass.surface,
        transition: "box-shadow 0.2s, border 0.2s",
      }}
      onClick={() => onChange(!value)}
    >
      <div>
        <div style={{ fontSize: 13, fontFamily: "var(--sans)", fontWeight: 500, color: "var(--black)", marginBottom: 3 }}>
          {label}
        </div>
        <div style={{ fontSize: 11, fontFamily: "var(--sans)", fontWeight: 300, color: "var(--gray-400)", lineHeight: 1.4 }}>
          {description}
        </div>
      </div>

      {/* Track */}
      <div style={{
        flexShrink: 0, width: 44, height: 24, borderRadius: 12,
        background: value ? "#1a1a1a" : "rgba(0,0,0,0.1)",
        position: "relative", transition: "background 0.2s ease",
      }}>
        {/* Knob */}
        <div style={{
          position: "absolute", top: 2, left: value ? 22 : 2,
          width: 20, height: 20, borderRadius: "50%", background: "#ffffff",
          boxShadow: "0 1px 4px rgba(0,0,0,0.22), 0 0 0 0.5px rgba(0,0,0,0.06)",
          transition: "left 0.2s ease",
        }} />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function UploadScreen({ onStart }: UploadScreenProps) {
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [resumeFiles, setResumeFiles] = useState<File[]>([]);
  const [jdText, setJdText] = useState("");
  const [dragOverJd, setDragOverJd] = useState(false);
  const [dragOverResumes, setDragOverResumes] = useState(false);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("paste");

  // Filter states
  const [requireGithub, setRequireGithub] = useState(false);
  const [strictMatch, setStrictMatch] = useState(false);

  // Extract skills from JD text by matching against known skill names
  const extractedSkills = useMemo(() => {
    const text = jdText.trim();
    if (!text) return [];
    return SKILL_CANONICAL
      .filter(({ pattern }) => pattern.test(text))
      .map(({ name }) => name);
  }, [jdText]);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Button hover state
  const [btnHovered, setBtnHovered] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);

  const store = useJobStore();

  const canStart = !!(( jdFile || jdText.trim()) && resumeFiles.length > 0) && !isSubmitting;

  const dropZoneStyle = (active: boolean) => ({
    height: 220, borderRadius: 12, display: "flex", flexDirection: "column" as const,
    alignItems: "center", justifyContent: "center", cursor: "pointer",
    transition: "all 0.25s", ...glass.surface,
    border: active ? "1.5px solid rgba(0,0,0,0.2)" : "1px solid rgba(255,255,255,0.6)",
    boxShadow: active ? "0 8px 32px rgba(0,0,0,0.1), inset 0 0 0 1px rgba(255,255,255,0.3)" : glass.surface.boxShadow,
  });

  // Analyze button styles — all states share the same property keys so the
  // browser can interpolate every value through the CSS transition cleanly.
  const btnStyle = (): React.CSSProperties => {
    // Base properties that never change
    const base: React.CSSProperties = {
      padding: "14px 48px",
      fontFamily: "var(--sans)",
      fontSize: 15,
      fontWeight: 500,
      borderRadius: 10,
      letterSpacing: "0.02em",
      transition: "background 0.25s ease, color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease, border-color 0.25s ease",
    };

    if (!canStart) return {
      ...base,
      background: "rgba(0,0,0,0.04)",
      color: "#a3a3a3",
      border: "1px solid transparent",
      boxShadow: "none",
      transform: "translateY(0px)",
      cursor: "default",
    };

    if (btnPressed) return {
      ...base,
      background: "#0a0a0a",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
      transform: "translateY(0px)",
      cursor: "pointer",
    };

    if (btnHovered) return {
      ...base,
      background: "#0a0a0a",
      color: "#ffffff",
      border: "1px solid transparent",
      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
      transform: "translateY(-2px)",
      cursor: "pointer",
    };

    // Default: frosted glass
    return {
      ...base,
      background: "rgba(255,255,255,0.45)",
      color: "#1a1a1a",
      border: "1px solid rgba(0,0,0,0.08)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      transform: "translateY(0px)",
      cursor: "pointer",
    };
  };

  const handleStart = async () => {
    if (!canStart) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      const jd = inputMode === "paste" ? jdText.trim() : jdFile!;
      const jobId = await submitAnalysis(jd, resumeFiles, { requireGithub, strictMatch });
      store.reset();
      store.setJobId(jobId);
      store.setStatus("queued");
      store.setPhase1Total(resumeFiles.length);
      onStart();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--sans)" }}>

      <style>{`
        .filter-toggles-row { display: flex; flex-direction: row; }
        @media (max-width: 768px) { .filter-toggles-row { flex-direction: column; } }
        .strict-match-panel { overflow: hidden; transition: max-height 0.3s ease, opacity 0.3s ease; }
      `}</style>

      {/* Header — logo only, no button */}
      <header style={{
        padding: "24px 40px", display: "flex", alignItems: "center",
        ...glass.header, position: "sticky", top: 0, zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontFamily: "var(--serif)", fontSize: 22, color: "var(--black)", letterSpacing: "-0.02em" }}>Shortlyst</span>
          <span style={{ fontSize: 10, fontFamily: "var(--mono)", color: "var(--gray-400)", marginLeft: 8, textTransform: "uppercase", letterSpacing: "0.1em" }}>Recruitment Intelligence</span>
        </div>
      </header>

      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ width: "100%", maxWidth: 820 }}>

          {/* Hero */}
          <div style={{ marginBottom: 56, textAlign: "center" }}>
            <h1 style={{ fontFamily: "var(--serif)", fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 400, color: "var(--black)", lineHeight: 1.15, marginBottom: 16 }}>
              Verify talent.<br />Rank by evidence.
            </h1>
            <p style={{ fontSize: 16, color: "var(--gray-500)", fontWeight: 300, maxWidth: 480, margin: "0 auto", lineHeight: 1.6 }}>
              Upload a job description and resumes. Shortlyst verifies every claim against real code, real deployments, and real evidence.
            </p>
          </div>

          {/* Upload cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>

            {/* JD Column */}
            <div>
              {/* Label left, toggle right — same flex row, marginBottom matches Resumes label height */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, height: 24 }}>
                <label style={{ fontSize: 12, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-700)", fontWeight: 600 }}>Job Description</label>
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
              {/* height+lineHeight match the JD flex row height so both cards start at the same Y */}
              <label style={{ display: "block", fontSize: 12, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--gray-700)", fontWeight: 600, marginBottom: 12, height: 24, lineHeight: "24px" }}>
                Resumes {resumeFiles.length > 0 && `· ${resumeFiles.length} ${resumeFiles.length === 1 ? "file" : "files"} selected`}
              </label>

              <div
                onDragOver={e => { e.preventDefault(); setDragOverResumes(true); }}
                onDragLeave={() => setDragOverResumes(false)}
                onDrop={e => { e.preventDefault(); setDragOverResumes(false); setResumeFiles(prev => { const newFiles = Array.from(e.dataTransfer.files).filter(f => !prev.some(ex => ex.name === f.name && ex.size === f.size)); return [...prev, ...newFiles]; }); }}
                onClick={() => {
                  const i = document.createElement("input");
                  i.type = "file"; i.accept = ".pdf"; i.multiple = true;
                  i.onchange = (e) => { const t = e.target as HTMLInputElement; if (t.files) setResumeFiles(prev => { const newFiles = Array.from(t.files!).filter(f => !prev.some(ex => ex.name === f.name && ex.size === f.size)); return [...prev, ...newFiles]; }); };
                  i.click();
                }}
                style={dropZoneStyle(dragOverResumes)}
              >
                {resumeFiles.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", padding: "14px 14px 8px" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxHeight: 180, overflowY: "auto", width: "100%" }}>
                      {resumeFiles.map((file, idx) => (
                        <div
                          key={`${file.name}-${idx}`}
                          style={{
                            width: 70, height: 85, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative",
                            background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                            border: "1px solid rgba(255,255,255,0.6)", transition: "box-shadow 0.2s, transform 0.2s",
                          }}
                          onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.1)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                          onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "translateY(0)"; }}
                        >
                          {/* Remove button */}
                          <button
                            onClick={e => { e.stopPropagation(); setResumeFiles(prev => prev.filter((_, i) => i !== idx)); }}
                            onMouseEnter={e => { e.currentTarget.style.background = "rgba(220,38,38,0.12)"; e.currentTarget.style.color = "#dc2626"; }}
                            onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,0,0,0.06)"; e.currentTarget.style.color = "rgba(0,0,0,0.45)"; }}
                            style={{
                              position: "absolute", top: 3, right: 3, width: 16, height: 16, borderRadius: "50%",
                              background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", display: "flex",
                              alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1,
                              fontSize: 9, color: "rgba(0,0,0,0.45)", transition: "background 0.15s",
                            }}
                          >✕</button>
                          {/* Page icon SVG */}
                          <svg viewBox="0 0 32 40" width="28" height="35" style={{ marginBottom: 4, flexShrink: 0 }}>
                            <path d="M2 2h20l8 8v28H2z" fill="#ebe7f0" stroke="rgba(0,0,0,0.1)" strokeWidth="1"/>
                            <path d="M22 2l8 8h-8z" fill="#d8d3e0" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5"/>
                            <circle cx="25" cy="6" r="1.5" fill="#e57373"/>
                            <line x1="7" y1="16" x2="25" y2="16" stroke="rgba(0,0,0,0.13)" strokeWidth="1.2"/>
                            <line x1="7" y1="21" x2="22" y2="21" stroke="rgba(0,0,0,0.1)" strokeWidth="1.2"/>
                            <line x1="7" y1="26" x2="20" y2="26" stroke="rgba(0,0,0,0.1)" strokeWidth="1.2"/>
                            <line x1="7" y1="31" x2="18" y2="31" stroke="rgba(0,0,0,0.08)" strokeWidth="1"/>
                          </svg>
                          {/* Filename */}
                          <span style={{
                            fontSize: 10, fontFamily: "var(--mono)", color: "var(--gray-600)",
                            maxWidth: 60, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center",
                          }}>{file.name.replace(/\.pdf$/i, "")}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8 }}>Click to add more</p>
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

          {/* ── Filter toggles ─────────────────────────────────────────────── */}
          <div style={{ marginTop: 32, marginBottom: 32 }}>
            <div className="filter-toggles-row" style={{ gap: 16 }}>
              <Toggle label="Require GitHub"   description="Reject candidates with no GitHub link"  value={requireGithub}   onChange={setRequireGithub} />
              <Toggle label="Strict Match"     description="Must meet every hard requirement"        value={strictMatch}     onChange={setStrictMatch} />
            </div>

            {/* Strict Match expansion */}
            <div className="strict-match-panel" style={{ maxHeight: strictMatch ? 120 : 0, opacity: strictMatch ? 1 : 0 }}>
              <div style={{ marginTop: 10, padding: "16px 20px", borderRadius: 10, ...glass.surface, border: "1px solid rgba(255,255,255,0.5)" }}>
                <div style={{ fontSize: 10, fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--gray-400)", marginBottom: 12 }}>
                  Required Skills
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {extractedSkills.length > 0 ? (
                    extractedSkills.map(skill => (
                      <span key={skill} style={{
                        padding: "4px 12px", borderRadius: 6, fontFamily: "var(--mono)", fontSize: 11,
                        color: "var(--gray-700)", background: "rgba(255,255,255,0.6)",
                        border: "1px solid rgba(0,0,0,0.08)",
                        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                      }}>
                        {skill}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 11, fontFamily: "var(--sans)", color: "var(--gray-400)", fontStyle: "italic" }}>
                      Paste a job description to see requirements
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Analyze button ─────────────────────────────────────────────── */}
          <div style={{ textAlign: "center" }}>
            <button
              onClick={handleStart}
              onMouseEnter={() => canStart && setBtnHovered(true)}
              onMouseLeave={() => { setBtnHovered(false); setBtnPressed(false); }}
              onMouseDown={() => canStart && setBtnPressed(true)}
              onMouseUp={() => setBtnPressed(false)}
              disabled={isSubmitting}
              style={btnStyle()}
            >
              {isSubmitting ? "Submitting…" : "Analyze Candidates"}
            </button>
            {submitError && (
              <p style={{ fontSize: 12, color: "#c0392b", marginTop: 8, fontWeight: 400 }}>
                {submitError}
              </p>
            )}
            <p style={{ fontSize: 12, color: "var(--gray-400)", marginTop: 8, fontWeight: 300 }}>
              {isSubmitting ? "Uploading files…" : canStart ? "Ready — resumes will be processed in parallel" : "Upload both inputs to continue"}
            </p>
          </div>

        </div>
      </main>
    </div>
  );
}
