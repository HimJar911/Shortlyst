"use client";

import { useState, useEffect, useRef, ComponentType } from "react";

interface VisualRotatorProps {
  moments: ComponentType[];
  intervalMs?: number;
  fadeDurationMs?: number;
}

/**
 * Cycles through an array of moment components with a clean fade transition.
 *
 * Approach: single-slot, three-step sequence each rotation:
 *   1. Fade out current component (opacity 1 → 0, over halfFade ms)
 *   2. Swap to next component while opacity is 0 (invisible, no flash)
 *   3. Fade new component in (opacity 0 → 1, over halfFade ms)
 *
 * Two separate timeouts for steps 2 and 3 give React time to commit the
 * component swap before the CSS transition back to opacity:1 fires.
 * This avoids the unreliable double-rAF pattern with concurrent rendering.
 */
export default function VisualRotator({
  moments,
  intervalMs = 8000,
  fadeDurationMs = 800,
}: VisualRotatorProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const idxRef = useRef(0);
  const halfFade = Math.floor(fadeDurationMs / 2); // 400ms each way

  useEffect(() => {
    let swapTimer: ReturnType<typeof setTimeout>;
    let showTimer: ReturnType<typeof setTimeout>;

    const id = setInterval(() => {
      // 1. Begin fade-out
      setVisible(false);

      // 2. Swap component while invisible (after fade-out finishes)
      swapTimer = setTimeout(() => {
        const next = (idxRef.current + 1) % moments.length;
        idxRef.current = next;
        setCurrentIdx(next);
      }, halfFade + 50); // +50ms buffer after opacity:0 is applied

      // 3. Fade new component in
      //    +50ms after the swap so React has committed the new component
      //    at opacity:0 before we trigger the 0→1 CSS transition
      showTimer = setTimeout(() => {
        setVisible(true);
      }, halfFade + 100);
    }, intervalMs);

    return () => {
      clearInterval(id);
      clearTimeout(swapTimer);
      clearTimeout(showTimer);
    };
  }, [moments.length, intervalMs, halfFade]);

  const CurrentMoment = moments[currentIdx];

  return (
    <div
      style={{
        width: "100%",
        height: 340,
        borderRadius: 16,
        overflow: "hidden",
        opacity: visible ? 1 : 0,
        transition: `opacity ${halfFade}ms ease-in-out`,
      }}
    >
      <CurrentMoment />
    </div>
  );
}
