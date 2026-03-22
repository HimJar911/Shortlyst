"use client";

import type { ReactElement } from "react";

// ─── Helper: Text-in-rounded-rect pattern ─────────────────────────────────────
// Reused for many language logos — keeps them visually consistent

const TextBox = ({ text, fontSize = 11 }: { text: string; fontSize?: number }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <text x="12" y="16.5" textAnchor="middle" fontSize={fontSize} fontWeight="700" fontFamily="sans-serif" fill="currentColor">{text}</text>
  </svg>
);

// Text inside a circle
const TextCircle = ({ text, fontSize = 12 }: { text: string; fontSize?: number }) => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    <text x="12" y="16" textAnchor="middle" fontSize={fontSize} fontWeight="700" fontFamily="sans-serif" fill="currentColor">{text}</text>
  </svg>
);

// ─── All Logos ────────────────────────────────────────────────────────────────

export const SkillLogos: Record<string, () => ReactElement> = {

  // ── Existing icons (unchanged) ──────────────────────────────────────────────

  React: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <ellipse cx="12" cy="12" rx="10" ry="4"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>
    </svg>
  ),
  "Node.js": () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L18.36 7.5 12 10.82 5.64 7.5 12 4.18zM5 8.82l6 3.33v6.67l-6-3.33V8.82zm8 10v-6.67l6-3.33v6.67l-6 3.33z"/>
    </svg>
  ),
  TypeScript: () => <TextBox text="TS" />,
  AWS: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M6.5 11.5l1.5-5h1l1.5 5M8.25 9.5h1.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
      <path d="M13 6.5l1.2 5 1.2-3 1.2 3 1.2-5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4 15c2 2 5 3 8 3s6-1 8-3" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round"/>
      <path d="M18.5 16l2-1-1 2" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  PostgreSQL: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="8" rx="7" ry="4"/>
      <path d="M5 8v8c0 2.21 3.13 4 7 4s7-1.79 7-4V8"/>
      <path d="M5 12c0 2.21 3.13 4 7 4s7-1.79 7-4"/>
    </svg>
  ),
  GraphQL: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="12" cy="3" r="1.5"/><circle cx="20" cy="7.5" r="1.5"/><circle cx="20" cy="16.5" r="1.5"/>
      <circle cx="12" cy="21" r="1.5"/><circle cx="4" cy="16.5" r="1.5"/><circle cx="4" cy="7.5" r="1.5"/>
    </svg>
  ),
  Docker: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="2" y="10" width="18" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <rect x="4" y="12" width="3" height="3" rx=".5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <rect x="8.5" y="12" width="3" height="3" rx=".5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <rect x="13" y="12" width="3" height="3" rx=".5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <rect x="8.5" y="7" width="3" height="3" rx=".5" fill="none" stroke="currentColor" strokeWidth="1"/>
      <path d="M21 13c1-1 1-3 0-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  Python: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2c-3 0-5 1.5-5 4v2h6v1H6c-2 0-4 2-4 5s2 5 4 5h2v-3c0-2 1.5-3 3-3h5c2 0 3-1 3-3V6c0-2.5-2-4-5-4h-2z"/>
      <circle cx="9.5" cy="5.5" r="1" fill="currentColor" stroke="none"/>
      <circle cx="14.5" cy="18.5" r="1" fill="currentColor" stroke="none"/>
    </svg>
  ),

  // ── Languages — Text-in-box pattern ─────────────────────────────────────────

  JavaScript: () => <TextBox text="JS" />,
  Java: () => <TextBox text="JV" />,
  "C#": () => <TextBox text="C#" fontSize={10} />,
  CSharp: () => <TextBox text="C#" fontSize={10} />,
  csharp: () => <TextBox text="C#" fontSize={10} />,
  Go: () => <TextBox text="Go" />,
  Kotlin: () => <TextBox text="Kt" />,
  Swift: () => <TextBox text="Sw" />,
  PHP: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <ellipse cx="12" cy="12" rx="10" ry="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="sans-serif" fill="currentColor">PHP</text>
    </svg>
  ),
  Ruby: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,2 20,8 18,20 6,20 4,8" strokeLinejoin="round"/>
      <polyline points="4,8 12,12 20,8" fill="none"/>
      <line x1="12" y1="12" x2="12" y2="20"/>
    </svg>
  ),
  Perl: () => <TextBox text="Pl" />,

  // ── Languages — Unique shapes ───────────────────────────────────────────────

  C: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 7a8 8 0 1 0 0 10" strokeLinecap="round"/>
    </svg>
  ),
  "C++": () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 7a7 7 0 1 0 0 10" strokeLinecap="round" strokeWidth="2"/>
      <line x1="17" y1="12" x2="23" y2="12" strokeLinecap="round"/>
      <line x1="20" y1="9" x2="20" y2="15" strokeLinecap="round"/>
    </svg>
  ),
  CPP: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 7a7 7 0 1 0 0 10" strokeLinecap="round" strokeWidth="2"/>
      <line x1="17" y1="12" x2="23" y2="12" strokeLinecap="round"/>
      <line x1="20" y1="9" x2="20" y2="15" strokeLinecap="round"/>
    </svg>
  ),
  cpp: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 7a7 7 0 1 0 0 10" strokeLinecap="round" strokeWidth="2"/>
      <line x1="17" y1="12" x2="23" y2="12" strokeLinecap="round"/>
      <line x1="20" y1="9" x2="20" y2="15" strokeLinecap="round"/>
    </svg>
  ),
  R: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <text x="12" y="16.5" textAnchor="middle" fontSize="14" fontWeight="700" fontFamily="serif" fill="currentColor">R</text>
    </svg>
  ),
  Rust: () => <TextBox text="Rs" />,

  // ── Web Frameworks ──────────────────────────────────────────────────────────

  "Next.js": () => <TextCircle text="N" fontSize={14} />,
  NextJS: () => <TextCircle text="N" fontSize={14} />,
  Next: () => <TextCircle text="N" fontSize={14} />,

  Vue: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,4 12,21 22,4" strokeLinejoin="round"/>
      <polyline points="6,4 12,14 18,4" strokeLinejoin="round"/>
    </svg>
  ),
  "Vue.js": () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,4 12,21 22,4" strokeLinejoin="round"/>
      <polyline points="6,4 12,14 18,4" strokeLinejoin="round"/>
    </svg>
  ),
  VueJS: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="2,4 12,21 22,4" strokeLinejoin="round"/>
      <polyline points="6,4 12,14 18,4" strokeLinejoin="round"/>
    </svg>
  ),

  Angular: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,2 2,7 4,19 12,23 20,19 22,7" strokeLinejoin="round"/>
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="sans-serif" fill="currentColor">A</text>
    </svg>
  ),
  AngularJS: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,2 2,7 4,19 12,23 20,19 22,7" strokeLinejoin="round"/>
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fontFamily="sans-serif" fill="currentColor">A</text>
    </svg>
  ),

  Svelte: () => <TextCircle text="S" />,

  Express: () => <TextBox text="Ex" />,
  "Express.js": () => <TextBox text="Ex" />,

  Django: () => <TextBox text="Dj" />,

  FastAPI: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <path d="M13 3l-2 10h5l-4 9" fill="currentColor" stroke="none"/>
    </svg>
  ),

  Flask: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M10 2h4v5l4 13H6L10 7V2z" strokeLinejoin="round"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
    </svg>
  ),

  "Spring Boot": () => <TextBox text="SB" />,
  Spring: () => <TextBox text="SB" />,

  "Ruby on Rails": () => <TextBox text="RR" />,
  Rails: () => <TextBox text="RR" />,

  Laravel: () => <TextBox text="Lv" />,

  // ── Cloud & Infrastructure ──────────────────────────────────────────────────

  GCP: () => <TextBox text="GC" />,
  "Google Cloud": () => <TextBox text="GC" />,

  Azure: () => <TextBox text="Az" />,
  "Microsoft Azure": () => <TextBox text="Az" />,

  Terraform: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,2 20.5,6.5 20.5,17.5 12,22 3.5,17.5 3.5,6.5" strokeLinejoin="round"/>
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="sans-serif" fill="currentColor">T</text>
    </svg>
  ),

  Kubernetes: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
      <line x1="12" y1="4" x2="12" y2="10" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="20" strokeLinecap="round"/>
      <line x1="5.1" y1="8" x2="10.3" y2="11" strokeLinecap="round"/>
      <line x1="13.7" y1="13" x2="18.9" y2="16" strokeLinecap="round"/>
      <line x1="5.1" y1="16" x2="10.3" y2="13" strokeLinecap="round"/>
      <line x1="13.7" y1="11" x2="18.9" y2="8" strokeLinecap="round"/>
    </svg>
  ),
  k8s: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
      <line x1="12" y1="4" x2="12" y2="10" strokeLinecap="round"/>
      <line x1="12" y1="14" x2="12" y2="20" strokeLinecap="round"/>
      <line x1="5.1" y1="8" x2="10.3" y2="11" strokeLinecap="round"/>
      <line x1="13.7" y1="13" x2="18.9" y2="16" strokeLinecap="round"/>
      <line x1="5.1" y1="16" x2="10.3" y2="13" strokeLinecap="round"/>
      <line x1="13.7" y1="11" x2="18.9" y2="8" strokeLinecap="round"/>
    </svg>
  ),

  Jenkins: () => <TextBox text="Jk" />,

  // ── Databases ───────────────────────────────────────────────────────────────

  MongoDB: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C10 6 7 8 7 13c0 4 2.5 7 5 9 2.5-2 5-5 5-9 0-5-3-7-5-11z" strokeLinejoin="round"/>
      <line x1="12" y1="10" x2="12" y2="18" strokeLinecap="round"/>
    </svg>
  ),
  Mongo: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2C10 6 7 8 7 13c0 4 2.5 7 5 9 2.5-2 5-5 5-9 0-5-3-7-5-11z" strokeLinejoin="round"/>
      <line x1="12" y1="10" x2="12" y2="18" strokeLinecap="round"/>
    </svg>
  ),

  // MySQL — database drum (same structure as PostgreSQL)
  MySQL: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="7" rx="8" ry="4"/>
      <path d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7"/>
      <path d="M4 12c0 2.21 3.58 4 8 4s8-1.79 8-4"/>
    </svg>
  ),

  SQL: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="7" rx="8" ry="4"/>
      <path d="M4 7v10c0 2.21 3.58 4 8 4s8-1.79 8-4V7"/>
      <path d="M4 12c0 2.21 3.58 4 8 4s8-1.79 8-4"/>
    </svg>
  ),

  Redis: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="12,2 22,8 22,16 12,22 2,16 2,8" strokeLinejoin="round"/>
      <polygon points="12,6 18,9 18,15 12,18 6,15 6,9" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>
    </svg>
  ),

  Firebase: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 20L8 4l4 8-4 3 8 5z" strokeLinejoin="round"/>
      <path d="M8 4l8 10" strokeLinejoin="round"/>
      <path d="M4 17l2 3h12l2-3" strokeLinejoin="round"/>
    </svg>
  ),

  // ── Data & ML ───────────────────────────────────────────────────────────────

  TensorFlow: () => <TextBox text="TF" />,
  PyTorch: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M12 2v8" strokeLinecap="round"/>
      <circle cx="12" cy="15" r="7"/>
      <circle cx="14.5" cy="13" r="1.5" fill="currentColor" stroke="none"/>
    </svg>
  ),
  Pandas: () => <TextBox text="Pd" />,
  NumPy: () => <TextBox text="Np" />,

  // ── Frontend / Styling ──────────────────────────────────────────────────────

  HTML5: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4,4 8,12 4,20" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="20,4 16,12 20,20" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="sans-serif" fill="currentColor">5</text>
    </svg>
  ),
  HTML: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="4,4 8,12 4,20" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="20,4 16,12 20,20" strokeLinecap="round" strokeLinejoin="round"/>
      <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="sans-serif" fill="currentColor">5</text>
    </svg>
  ),

  CSS3: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4c-1 0-1.5.5-1.5 1.5S5 7 5 7s-1.5.5-1.5 1.5S5 10 5 10" strokeLinecap="round"/>
      <path d="M19 4c1 0 1.5.5 1.5 1.5S19 7 19 7s1.5.5 1.5 1.5S19 10 19 10" strokeLinecap="round"/>
      <text x="12" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="sans-serif" fill="currentColor">3</text>
    </svg>
  ),
  CSS: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 4c-1 0-1.5.5-1.5 1.5S5 7 5 7s-1.5.5-1.5 1.5S5 10 5 10" strokeLinecap="round"/>
      <path d="M19 4c1 0 1.5.5 1.5 1.5S19 7 19 7s1.5.5 1.5 1.5S19 10 19 10" strokeLinecap="round"/>
      <text x="12" y="20" textAnchor="middle" fontSize="8" fontWeight="700" fontFamily="sans-serif" fill="currentColor">3</text>
    </svg>
  ),

  Tailwind: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 10c2-4 5-4 7-2s5 2 7-2" strokeLinecap="round"/>
      <path d="M2 16c2-4 5-4 7-2s5 2 7-2" strokeLinecap="round"/>
    </svg>
  ),
  "Tailwind CSS": () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 10c2-4 5-4 7-2s5 2 7-2" strokeLinecap="round"/>
      <path d="M2 16c2-4 5-4 7-2s5 2 7-2" strokeLinecap="round"/>
    </svg>
  ),
  TailwindCSS: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M2 10c2-4 5-4 7-2s5 2 7-2" strokeLinecap="round"/>
      <path d="M2 16c2-4 5-4 7-2s5 2 7-2" strokeLinecap="round"/>
    </svg>
  ),

  Sass: () => <TextCircle text="S" />,
  SCSS: () => <TextCircle text="S" />,

  Bootstrap: () => <TextBox text="B" fontSize={14} />,

  // ── API & Tools ─────────────────────────────────────────────────────────────

  REST: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 9h14" strokeLinecap="round"/>
      <path d="M16 6l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 15H5" strokeLinecap="round"/>
      <path d="M8 12l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  "REST API": () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 9h14" strokeLinecap="round"/>
      <path d="M16 6l3 3-3 3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 15H5" strokeLinecap="round"/>
      <path d="M8 12l-3 3 3 3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),

  Git: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="12" cy="6" r="2"/>
      <path d="M12 8v4" strokeLinecap="round"/>
      <path d="M12 12c0 4-5 4-5 6" strokeLinecap="round"/>
      <path d="M12 12c0 4 5 4 5 6" strokeLinecap="round"/>
    </svg>
  ),
  GitHub: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="7" cy="18" r="2"/>
      <circle cx="17" cy="18" r="2"/>
      <circle cx="12" cy="6" r="2"/>
      <path d="M12 8v4" strokeLinecap="round"/>
      <path d="M12 12c0 4-5 4-5 6" strokeLinecap="round"/>
      <path d="M12 12c0 4 5 4 5 6" strokeLinecap="round"/>
    </svg>
  ),

  Linux: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <text x="12" y="16" textAnchor="middle" fontSize="9" fontWeight="700" fontFamily="sans-serif" fill="currentColor">LX</text>
    </svg>
  ),

  Nginx: () => <TextBox text="NX" />,

  RabbitMQ: () => <TextBox text="RQ" />,

  Kafka: () => <TextBox text="Kf" />,

  ".NET": () => <TextBox text=".N" />,
  DotNet: () => <TextBox text=".N" />,

  // ── Mobile ──────────────────────────────────────────────────────────────────

  Flutter: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polygon points="6,12 14,4 14,10 20,4" strokeLinejoin="round"/>
      <polygon points="6,12 14,20 14,14 20,20" strokeLinejoin="round"/>
    </svg>
  ),

  "React Native": () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="2.5" fill="currentColor" stroke="none"/>
      <ellipse cx="12" cy="12" rx="10" ry="4"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/>
      <ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>
    </svg>
  ),

  // ── Aliases for PostgreSQL ──────────────────────────────────────────────────

  Postgres: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
      <ellipse cx="12" cy="8" rx="7" ry="4"/>
      <path d="M5 8v8c0 2.21 3.13 4 7 4s7-1.79 7-4V8"/>
      <path d="M5 12c0 2.21 3.13 4 7 4s7-1.79 7-4"/>
    </svg>
  ),

  // ── Aliases for Node.js ─────────────────────────────────────────────────────

  Node: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M12 2L3 7v10l9 5 9-5V7l-9-5zm0 2.18L18.36 7.5 12 10.82 5.64 7.5 12 4.18zM5 8.82l6 3.33v6.67l-6-3.33V8.82zm8 10v-6.67l6-3.33v6.67l-6 3.33z"/>
    </svg>
  ),
};

export const DefaultSkillLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <path d="M8 12h8M12 8v8" strokeLinecap="round"/>
  </svg>
);