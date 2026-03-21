"use client";

import { useRef, useEffect } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────

const CYCLE = 4.8;        // seconds per full loop
const NUM_ITEMS = 3;       // simultaneous items in pipeline
const ISO_ANGLE = 0.46;   // radians (~26°) — isometric tilt
const ISO_SCALE_Y = 0.55; // vertical squash for depth illusion

// ─── Easing ───────────────────────────────────────────────────────────────────

const smoothstep = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
};
const easeOut3 = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return 1 - Math.pow(1 - t, 3);
};
const easeInOut = (t: number) => {
  t = Math.max(0, Math.min(1, t));
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

// ─── Isometric transform: world (x, y, z) → screen (sx, sy) ──────────────────
// x = along the belt (left-to-right in world = bottom-left to upper-right on screen)
// y = vertical (up)
// z = depth (toward/away from viewer)

function isoProject(
  wx: number, wy: number, wz: number,
  originX: number, originY: number
): [number, number] {
  const cosA = Math.cos(ISO_ANGLE);
  const sinA = Math.sin(ISO_ANGLE);
  const sx = originX + (wx - wz) * cosA;
  const sy = originY - wy + (wx + wz) * sinA * ISO_SCALE_Y;
  return [sx, sy];
}

// ─── Draw isometric box (generic) ─────────────────────────────────────────────

function drawIsoBox(
  ctx: CanvasRenderingContext2D,
  wx: number, wy: number, wz: number,
  bw: number, bh: number, bd: number,
  topColor: string, leftColor: string, rightColor: string,
  originX: number, originY: number,
  alpha: number = 1
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  // 8 corners of the box in world space
  const corners = [
    [wx, wy, wz],           // 0: front-bottom-left
    [wx + bw, wy, wz],      // 1: front-bottom-right
    [wx + bw, wy, wz + bd], // 2: back-bottom-right
    [wx, wy, wz + bd],      // 3: back-bottom-left
    [wx, wy + bh, wz],      // 4: front-top-left
    [wx + bw, wy + bh, wz], // 5: front-top-right
    [wx + bw, wy + bh, wz + bd], // 6: back-top-right
    [wx, wy + bh, wz + bd], // 7: back-top-left
  ].map(([x, y, z]) => isoProject(x, y, z, originX, originY));

  // Front face (facing the viewer — connects bottom-left, bottom-right, top-right, top-left at wz)
  ctx.beginPath();
  ctx.moveTo(corners[0][0], corners[0][1]);
  ctx.lineTo(corners[1][0], corners[1][1]);
  ctx.lineTo(corners[5][0], corners[5][1]);
  ctx.lineTo(corners[4][0], corners[4][1]);
  ctx.closePath();
  // Slightly darker than the right face to differentiate
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Top face
  ctx.beginPath();
  ctx.moveTo(corners[4][0], corners[4][1]);
  ctx.lineTo(corners[5][0], corners[5][1]);
  ctx.lineTo(corners[6][0], corners[6][1]);
  ctx.lineTo(corners[7][0], corners[7][1]);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.1)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Left face (front-facing)
  ctx.beginPath();
  ctx.moveTo(corners[0][0], corners[0][1]);
  ctx.lineTo(corners[4][0], corners[4][1]);
  ctx.lineTo(corners[7][0], corners[7][1]);
  ctx.lineTo(corners[3][0], corners[3][1]);
  ctx.closePath();
  ctx.fillStyle = leftColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  // Right face
  ctx.beginPath();
  ctx.moveTo(corners[1][0], corners[1][1]);
  ctx.lineTo(corners[5][0], corners[5][1]);
  ctx.lineTo(corners[6][0], corners[6][1]);
  ctx.lineTo(corners[2][0], corners[2][1]);
  ctx.closePath();
  ctx.fillStyle = rightColor;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.08)";
  ctx.lineWidth = 0.5;
  ctx.stroke();

  ctx.restore();
}

// ─── Draw the conveyor belt ───────────────────────────────────────────────────

function drawBelt(
  ctx: CanvasRenderingContext2D,
  originX: number, originY: number,
  t: number
) {
  const beltLen = 440;
  const beltW = 72;
  const beltH = 8;
  const startX = -beltLen / 2;

  // Belt base
  drawIsoBox(ctx, startX, -beltH, -beltW / 2, beltLen, beltH, beltW,
    "#2a2a2e", "#1e1e22", "#222226", originX, originY);

  // Belt surface (dark rubber)
  drawIsoBox(ctx, startX, 0, -beltW / 2 + 4, beltLen, 2, beltW - 8,
    "#3a3a40", "#2e2e34", "#323238", originX, originY);

  // Rolling line marks on belt surface
  const gap = 28;
  const scroll = (t * 50) % gap;
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < beltLen / gap + 2; i++) {
    const markX = startX + i * gap + scroll;
    if (markX < startX || markX > startX + beltLen) continue;
    const [s1x, s1y] = isoProject(markX, 2.5, -beltW / 2 + 8, originX, originY);
    const [s2x, s2y] = isoProject(markX, 2.5, beltW / 2 - 8, originX, originY);
    ctx.beginPath();
    ctx.moveTo(s1x, s1y);
    ctx.lineTo(s2x, s2y);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.restore();

  // Side rails
  const railH = 8;
  drawIsoBox(ctx, startX, 0, -beltW / 2 - 2, beltLen, railH, 3,
    "#444448", "#38383c", "#3c3c40", originX, originY);
  drawIsoBox(ctx, startX, 0, beltW / 2 - 1, beltLen, railH, 3,
    "#444448", "#38383c", "#3c3c40", originX, originY);

  // Support legs
  const legPositions = [-120, -40, 40, 120];
  legPositions.forEach(lx => {
    drawIsoBox(ctx, lx - 4, -30, -beltW / 2 + 6, 8, 30, 6,
      "#1a1a1e", "#141418", "#161618", originX, originY);
    drawIsoBox(ctx, lx - 4, -30, beltW / 2 - 12, 8, 30, 6,
      "#1a1a1e", "#141418", "#161618", originX, originY);
  });
}

// ─── Draw the machine ─────────────────────────────────────────────────────────

function drawMachine(
  ctx: CanvasRenderingContext2D,
  originX: number, originY: number,
  t: number
) {
  const mx = -25; // world x center of machine
  const mw = 72;
  const mh = 85;
  const md = 66;
  const pulse = 0.5 + 0.5 * Math.sin(t * 4);

  // Machine body
  drawIsoBox(ctx, mx, 0, -md / 2, mw, mh, md,
    "#18181c", "#111114", "#141418", originX, originY);

  // Top cap
  drawIsoBox(ctx, mx - 4, mh, -md / 2 - 4, mw + 8, 6, md + 8,
    "#222228", "#1a1a1e", "#1e1e22", originX, originY);

  // Chimney
  drawIsoBox(ctx, mx + mw / 2 - 8, mh + 6, -8, 16, 18, 16,
    "#1a1a1e", "#141418", "#161618", originX, originY);

  // Chimney glow
  const glowAlpha = 0.5 + pulse * 0.5;
  ctx.save();
  const [gx, gy] = isoProject(mx + mw / 2, mh + 24, 0, originX, originY);
  ctx.shadowColor = `rgba(245,158,11,${glowAlpha})`;
  ctx.shadowBlur = 12 + pulse * 8;
  ctx.fillStyle = `rgba(245,158,11,${glowAlpha})`;
  ctx.beginPath();
  ctx.ellipse(gx, gy - 2, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Processing window (glowing amber panel on the right face)
  const winW = mw * 0.5;
  const winH = mh * 0.35;
  const winY = mh * 0.3;
  ctx.save();
  // Project 4 corners of the window on the right face of the machine
  const w0 = isoProject(mx + mw, winY, -md / 2 + 8, originX, originY);
  const w1 = isoProject(mx + mw, winY, md / 2 - 8, originX, originY);
  const w2 = isoProject(mx + mw, winY + winH, md / 2 - 8, originX, originY);
  const w3 = isoProject(mx + mw, winY + winH, -md / 2 + 8, originX, originY);

  ctx.shadowColor = `rgba(245,158,11,${0.4 + pulse * 0.5})`;
  ctx.shadowBlur = 16 + pulse * 12;
  ctx.beginPath();
  ctx.moveTo(w0[0], w0[1]);
  ctx.lineTo(w1[0], w1[1]);
  ctx.lineTo(w2[0], w2[1]);
  ctx.lineTo(w3[0], w3[1]);
  ctx.closePath();
  ctx.fillStyle = `rgba(245,158,11,${0.6 + pulse * 0.3})`;
  ctx.fill();
  ctx.restore();

  // Left face window (input side glow)
  ctx.save();
  const lw0 = isoProject(mx, winY, -md / 2 + 10, originX, originY);
  const lw1 = isoProject(mx, winY, md / 2 - 10, originX, originY);
  const lw2 = isoProject(mx, winY + winH, md / 2 - 10, originX, originY);
  const lw3 = isoProject(mx, winY + winH, -md / 2 + 10, originX, originY);

  ctx.shadowColor = `rgba(245,158,11,${0.2 + pulse * 0.3})`;
  ctx.shadowBlur = 10 + pulse * 8;
  ctx.beginPath();
  ctx.moveTo(lw0[0], lw0[1]);
  ctx.lineTo(lw1[0], lw1[1]);
  ctx.lineTo(lw2[0], lw2[1]);
  ctx.lineTo(lw3[0], lw3[1]);
  ctx.closePath();
  ctx.fillStyle = `rgba(245,158,11,${0.35 + pulse * 0.2})`;
  ctx.fill();
  ctx.restore();

  // Indicator lights on top
  for (let i = 0; i < 3; i++) {
    const [lx, ly] = isoProject(mx + 12 + i * 12, mh + 7, -md / 2 - 2, originX, originY);
    ctx.save();
    ctx.shadowColor = "rgba(74,222,128,0.8)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Draw paper stack (no box, just stacked papers) ──────────────────────────

function drawPaperStack(
  ctx: CanvasRenderingContext2D,
  wx: number,
  originX: number, originY: number,
  alpha: number
) {
  if (alpha <= 0) return;

  const pw = 48;  // paper width
  const pd = 36;  // paper depth
  const numSheets = 41;
  const sheetH = 1.12;   // thickness of each sheet
  const baseY = 3;       // sit on belt surface

  ctx.save();
  ctx.globalAlpha = alpha;

  // Shadow underneath the stack on the belt
  ctx.save();
  ctx.globalAlpha = alpha * 0.12;
  const s0 = isoProject(wx - pw / 2 - 1, 2.5, -pd / 2 - 1, originX, originY);
  const s1 = isoProject(wx + pw / 2 + 1, 2.5, -pd / 2 - 1, originX, originY);
  const s2 = isoProject(wx + pw / 2 + 1, 2.5, pd / 2 + 1, originX, originY);
  const s3 = isoProject(wx - pw / 2 - 1, 2.5, pd / 2 + 1, originX, originY);
  ctx.beginPath();
  ctx.moveTo(s0[0], s0[1]);
  ctx.lineTo(s1[0], s1[1]);
  ctx.lineTo(s2[0], s2[1]);
  ctx.lineTo(s3[0], s3[1]);
  ctx.closePath();
  ctx.fillStyle = "#000";
  ctx.fill();
  ctx.restore();

  for (let i = 0; i < numSheets; i++) {
    const py = baseY + i * sheetH;
    // Slight natural offsets — small and stable
    const offsetX = (i % 2 === 0 ? 0.8 : -0.8) + (i % 3 === 0 ? 0.4 : -0.3);
    const offsetZ = (i % 2 === 0 ? -0.6 : 0.6) + (i % 3 === 1 ? 0.3 : -0.2);

    // Alternate very slightly between warm-white and cool-white
    const isWarm = i % 2 === 0;
    const topC = isWarm ? "#f8f6f0" : "#f5f3ed";
    const leftC = isWarm ? "#eae7e0" : "#e6e3dc";
    const rightC = isWarm ? "#f0ede6" : "#ece9e2";

    drawIsoBox(
      ctx,
      wx - pw / 2 + offsetX,
      py,
      -pd / 2 + offsetZ,
      pw, sheetH, pd,
      topC, leftC, rightC,
      originX, originY,
      alpha
    );
  }

  ctx.restore();
}

// ─── Draw diamond ─────────────────────────────────────────────────────────────

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  wx: number,
  originX: number, originY: number,
  alpha: number,
  t: number,
  index: number
) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  const bounce = Math.sin(t * 5 + index * 2.5) * 5;
  const wy = 22 + bounce;
  const sparkle = 0.5 + 0.5 * Math.sin(t * 7 + index * 2.3);
  const rot = t * 1.2 + index * 1.8;

  // Diamond center in screen space
  const [cx, cy] = isoProject(wx, wy, 0, originX, originY);
  const size = 17;

  // Glow
  ctx.shadowColor = `rgba(147,197,253,${0.5 + sparkle * 0.4})`;
  ctx.shadowBlur = 12 + sparkle * 10;

  // Rotated diamond shape
  ctx.translate(cx, cy);
  ctx.rotate(rot * 0.3);

  // Main diamond body
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.6, 0);
  ctx.closePath();

  const grad = ctx.createLinearGradient(-size, -size, size, size);
  grad.addColorStop(0, "#c7d8f5");
  grad.addColorStop(0.4, "#7db3f7");
  grad.addColorStop(1, "#3b82f6");
  ctx.fillStyle = grad;
  ctx.fill();

  // Top-left facet highlight
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(-size * 0.6, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(219,234,254,0.5)";
  ctx.fill();

  // Top-right facet
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(0, 0);
  ctx.closePath();
  ctx.fillStyle = "rgba(191,219,254,0.3)";
  ctx.fill();

  // Border
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * 0.6, 0);
  ctx.closePath();
  ctx.strokeStyle = "rgba(147,197,253,0.5)";
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // Sparkle
  if (sparkle > 0.65) {
    const sa = (sparkle - 0.65) / 0.35;
    ctx.globalAlpha = alpha * sa;
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(-size * 0.2, -size * 0.5, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ─── Main draw frame ──────────────────────────────────────────────────────────

function drawFrame(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  t: number
) {
  ctx.clearRect(0, 0, W, H);

  // Origin point — where world (0,0,0) maps to on screen
  // Slightly left-of-center and below middle so belt runs bottom-left to upper-right
  const originX = W * 0.5;
  const originY = H * 0.68;

  const beltHalf = 220; // half the belt length in world units
  const machineX = -25; // machine sits slightly left of center in world

  // Draw back-to-front for proper layering:

  // 1. Belt (base layer)
  drawBelt(ctx, originX, originY, t);

  // 2. Paper stacks approaching machine (coming from the left in world space)
  for (let i = 0; i < NUM_ITEMS; i++) {
    const localT = ((t / CYCLE + i / NUM_ITEMS) % 1);
    if (localT < 0.5) {
      const progress = localT / 0.5;
      const eased = easeInOut(progress);
      const startX = -beltHalf + 30;
      const endX = machineX - 42;
      const x = startX + eased * (endX - startX);
      let opacity = 1;
      if (progress > 0.85) opacity = 1 - smoothstep((progress - 0.85) / 0.15);
      drawPaperStack(ctx, x, originX, originY, opacity);
    }
  }

  // 3. Machine (occludes stacks entering)
  drawMachine(ctx, originX, originY, t);

  // 4. Diamonds exiting machine (going to the right in world space)
  for (let i = 0; i < NUM_ITEMS; i++) {
    const localT = ((t / CYCLE + i / NUM_ITEMS) % 1);
    if (localT >= 0.5) {
      const progress = (localT - 0.5) / 0.5;
      const eased = easeOut3(progress);
      const startX = machineX + 55;
      const endX = beltHalf - 30;
      const x = startX + eased * (endX - startX);
      let opacity = 1;
      if (progress < 0.1) opacity = smoothstep(progress / 0.1);
      if (progress > 0.85) opacity = 1 - smoothstep((progress - 0.85) / 0.15);
      drawDiamond(ctx, x, originX, originY, opacity, t, i);
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResumesToDiamonds({ height = 420 }: { height?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let startTime: number | null = null;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const loop = (ts: number) => {
      if (!startTime) startTime = ts;
      const t = (ts - startTime) / 1000;
      const W = canvas.getBoundingClientRect().width;
      const H = canvas.getBoundingClientRect().height;
      if (W > 0 && H > 0) drawFrame(ctx, W, H, t);
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: "100%",
        height,
        display: "block",
        borderRadius: 16,
      }}
    />
  );
}
