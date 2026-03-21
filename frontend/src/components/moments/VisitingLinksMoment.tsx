"use client";

import { useState, useEffect } from "react";

const URLS = [
  { url: "portfolio-app.vercel.app", live: true },
  { url: "mchen-auth.fly.dev", live: true },
  { url: "davidpark-portfolio.com", live: false },
  { url: "budget-tracker.netlify.app", live: true },
  { url: "dpark-todo.herokuapp.com", live: false },
];

const HOLD_MS = 1500;

export default function VisitingLinksMoment() {
  const [idx, setIdx] = useState(0);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    // Show status badge after short delay on each URL
    const statusTimer = setTimeout(() => setShowStatus(true), 600);
    return () => clearTimeout(statusTimer);
  }, [idx]);

  useEffect(() => {
    const id = setInterval(() => {
      setShowStatus(false);
      setIdx((prev) => (prev + 1) % URLS.length);
    }, HOLD_MS);
    return () => clearInterval(id);
  }, []);

  const current = URLS[idx];

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
        @keyframes vlm-status-in {
          from { opacity: 0; transform: scale(0.8); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes vlm-url-in {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes vlm-spinner {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Label */}
      <p
        style={{
          fontFamily: "var(--mono)",
          fontSize: 11,
          color: "var(--gray-400)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 28,
        }}
      >
        Visiting links
      </p>

      {/* Browser chrome */}
      <div
        style={{
          width: 520,
          maxWidth: "90%",
          borderRadius: 12,
          background: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(0,0,0,0.09)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.05)",
          overflow: "hidden",
        }}
      >
        {/* Window chrome bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "12px 16px 10px",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            background: "rgba(245,245,248,0.8)",
          }}
        >
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57", flexShrink: 0 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e", flexShrink: 0 }} />
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840", flexShrink: 0 }} />

          {/* URL bar */}
          <div
            style={{
              flex: 1,
              marginLeft: 12,
              height: 28,
              borderRadius: 6,
              background: "rgba(255,255,255,0.8)",
              border: "1px solid rgba(0,0,0,0.08)",
              display: "flex",
              alignItems: "center",
              padding: "0 12px",
              gap: 8,
              overflow: "hidden",
            }}
          >
            {/* Spinning loader when no status yet */}
            {!showStatus ? (
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  border: "1.5px solid var(--gray-300)",
                  borderTopColor: "var(--gray-600)",
                  animation: "vlm-spinner 0.7s linear infinite",
                  flexShrink: 0,
                }}
              />
            ) : (
              <span
                style={{
                  fontSize: 11,
                  flexShrink: 0,
                  animation: "vlm-status-in 0.2s ease forwards",
                  color: current.live ? "#22c55e" : "#ef4444",
                  fontWeight: 600,
                }}
              >
                {current.live ? "✓" : "✗"}
              </span>
            )}

            <span
              key={idx}
              style={{
                fontFamily: "var(--mono)",
                fontSize: 12,
                color: "var(--gray-600)",
                animation: "vlm-url-in 0.2s ease forwards",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {current.url}
            </span>
          </div>
        </div>

        {/* Page content area — skeleton */}
        <div style={{ padding: 20, height: 100, display: "flex", flexDirection: "column", gap: 8 }}>
          <div
            style={{
              height: 12,
              borderRadius: 4,
              background: "rgba(0,0,0,0.06)",
              width: current.live ? "72%" : "45%",
              transition: "width 0.4s ease",
            }}
          />
          <div
            style={{
              height: 10,
              borderRadius: 4,
              background: "rgba(0,0,0,0.04)",
              width: current.live ? "55%" : "30%",
              transition: "width 0.4s ease",
            }}
          />
          {!current.live && (
            <div
              style={{
                marginTop: 8,
                fontFamily: "var(--mono)",
                fontSize: 11,
                color: "#ef4444",
                opacity: showStatus ? 0.7 : 0,
                transition: "opacity 0.3s ease",
              }}
            >
              ERR_NAME_NOT_RESOLVED
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 6, marginTop: 24 }}>
        {URLS.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === idx ? 16 : 6,
              height: 6,
              borderRadius: 3,
              background: i === idx ? "var(--black)" : "var(--gray-300)",
              transition: "all 0.3s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
