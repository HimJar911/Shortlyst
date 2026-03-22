"use client";

import { useState, useRef, useLayoutEffect, forwardRef } from "react";
import { SkillLogos, DefaultSkillLogo } from "./SkillLogos";
import StatusBadge from "./StatusBadge";
import type { Skill } from "@/types";

const TooltipCard = forwardRef<HTMLDivElement, { skill: Skill }>(function TooltipCard({ skill }, _ref) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ left: "50%", transform: "translateX(-50%)" });
  const [arrowLeft, setArrowLeft] = useState("50%");

  useLayoutEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.left < 4) {
      const shift = 4 - rect.left;
      setOffset({ left: `calc(50% + ${shift}px)`, transform: "translateX(-50%)" });
      setArrowLeft(`calc(50% - ${shift}px)`);
    } else if (rect.right > window.innerWidth - 4) {
      const shift = rect.right - window.innerWidth + 4;
      setOffset({ left: `calc(50% - ${shift}px)`, transform: "translateX(-50%)" });
      setArrowLeft(`calc(50% + ${shift}px)`);
    }
  }, []);

  return (
    <div ref={innerRef} style={{
      position: "absolute", top: "calc(100% + 8px)", left: offset.left, transform: offset.transform,
      padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 300, lineHeight: 1.5,
      width: 260, zIndex: 10, fontFamily: "var(--sans)",
      background: "rgba(23,23,23,0.9)", color: "#fff",
      backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <StatusBadge status={skill.status} size="xs" dark />
      </div>
      {skill.detail}
      <div style={{
        position: "absolute", top: -4, left: arrowLeft, transform: "translateX(-50%) rotate(45deg)",
        width: 8, height: 8, background: "rgba(23,23,23,0.9)",
      }} />
    </div>
  );
});

export default function SkillBadge({ skill }: { skill: Skill }) {
  const [hovered, setHovered] = useState(false);
  const LogoComponent = SkillLogos[skill.name] || DefaultSkillLogo;
  const isConfirmed = skill.status === "confirmed";
  const isFlagged = skill.status === "flagged";

  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} style={{ position: "relative" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8,
        transition: "all 0.2s", cursor: "default",
        background: isConfirmed ? "rgba(10,10,10,0.85)" : isFlagged ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.4)",
        color: isConfirmed ? "#fff" : isFlagged ? "var(--black)" : "var(--gray-500)",
        border: isFlagged ? "1.5px solid rgba(0,0,0,0.2)" : "1px solid rgba(255,255,255,0.5)",
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.03)",
        transform: hovered ? "translateY(-1px)" : "none",
      }}>
        <span style={{ display: "flex", alignItems: "center", opacity: skill.status === "unverified" ? 0.5 : 1 }}>
          <LogoComponent />
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, fontFamily: "var(--sans)" }}>{skill.name}</span>
        {isFlagged && <span style={{ fontSize: 12 }}>⚠</span>}
      </div>
      {hovered && (
        <TooltipCard skill={skill} />
      )}
    </div>
  );
}
