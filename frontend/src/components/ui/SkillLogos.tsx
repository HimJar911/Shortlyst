"use client";

import type { ReactElement } from "react";

export const SkillLogos: Record<string, () => ReactElement> = {
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
  TypeScript: () => (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="2" y="2" width="20" height="20" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <text x="12" y="16.5" textAnchor="middle" fontSize="11" fontWeight="700" fontFamily="sans-serif" fill="currentColor">TS</text>
    </svg>
  ),
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
};

export const DefaultSkillLogo = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="3" y="3" width="18" height="18" rx="3"/>
    <path d="M8 12h8M12 8v8" strokeLinecap="round"/>
  </svg>
);
