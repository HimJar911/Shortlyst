"use client";

const CODE_LINES = [
  `import { verifySkills } from './agents';`,
  `import { github, playwright } from './tools';`,
  `const candidates = await db.getAll({ phase: 2 });`,
  `const repos = await github.getPublicRepos(username);`,
  `if (commitCount < 10) flag('sparse-activity');`,
  `await playwright.screenshot(deployUrl);`,
  `const liveUrls = await checkLiveness(portfolioUrls);`,
  `const skills = await extractFromReadme(repoUrl);`,
  `skills.forEach(s => crossRef(claimed, found));`,
  `if (mismatch > threshold) candidate.score -= 20;`,
  `const codeQuality = await analyzeTopRepo(repos[0]);`,
  `await saveEvidence(candidateId, evidence);`,
  `const rank = computeSignalScore(candidate);`,
  `shortlist.push({ candidate, rank, evidence });`,
  `shortlist.sort((a, b) => b.rank - a.rank);`,
  `console.log('Phase 2 complete:', shortlist.length);`,
  `return shortlist.slice(0, 5);`,
];

const LINE_HEIGHT = 28;
const VISIBLE_LINES = 10;
const SCROLL_DISTANCE = (CODE_LINES.length - VISIBLE_LINES) * LINE_HEIGHT;
const HIGHLIGHTED_IDX = 3; // "const repos = await github..."

export default function ReadingCodeMoment() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        background: "#0d0d0f",
        borderRadius: 16,
        overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        @keyframes rcm-scroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-${SCROLL_DISTANCE}px); }
        }
        @keyframes rcm-pulse {
          0%, 100% { text-shadow: 0 0 6px rgba(255,255,255,0.25); color: #ffffff; }
          50%       { text-shadow: 0 0 18px rgba(255,255,255,0.7); color: #f8f8f8; }
        }
      `}</style>

      {/* Top fade */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 48,
          background: "linear-gradient(to bottom, #0d0d0f, transparent)",
          zIndex: 2,
          borderRadius: "16px 16px 0 0",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          overflow: "hidden",
          height: VISIBLE_LINES * LINE_HEIGHT,
          padding: "0 40px",
        }}
      >
        <div
          style={{
            animation: `rcm-scroll 6s linear infinite`,
          }}
        >
          {CODE_LINES.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 13,
                lineHeight: `${LINE_HEIGHT}px`,
                color: i === HIGHLIGHTED_IDX ? "#ffffff" : "#3a3a44",
                animation:
                  i === HIGHLIGHTED_IDX
                    ? "rcm-pulse 2s ease-in-out infinite"
                    : undefined,
                whiteSpace: "nowrap",
                display: "flex",
                gap: 20,
              }}
            >
              <span
                style={{
                  color: "#252530",
                  userSelect: "none",
                  flexShrink: 0,
                  minWidth: 24,
                  textAlign: "right",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{line}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom fade */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: 48,
          background: "linear-gradient(to top, #0d0d0f, transparent)",
          zIndex: 2,
          borderRadius: "0 0 16px 16px",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
