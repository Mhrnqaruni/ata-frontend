import React, { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * "How marking works" — the sign-in page's story, drawn as one straight line in the style of the Moby Argus
 * "How scoring works" loop (one SVG drawn once + one requestAnimationFrame loop that writes only what changed).
 *
 * The story is the backend's real rule (app/services/assessment_service.py, finalize_question):
 *   a teacher's handwritten answer sheets go in → MySmartTeach marks every answer THREE times with the same AI
 *   model, in parallel → if at least two marks agree (within 0.1) the answer is AI graded; if no two agree it
 *   waits as "Pending Review" → the teacher reviews ("Teacher Graded") → each student gets personalised feedback.
 * The loop shows the two clear cases: paper A (8 · 8 · 8 → AI graded) and paper B (8 · 5 · 7 → teacher review).
 * It is an illustration: nothing is fetched, no real marks are shown.
 *
 * Pauses: the Pause button (remembered in localStorage "mst.journey.paused"), reduced motion (starts paused on
 * a still frame that tells the whole story), less than 25 % visible, or a hidden tab.
 */

const LOOP = 16_000;
const REST = 13_200; // the still frame: paper B under review, the AI-graded path already shown
const PAUSE_KEY = "mst.journey.paused";
const MARKS = [[8, 8, 8], [8, 5, 7]];
const OFFSET = [0, 5_500]; // paper B runs the same beats 5.5 s later
const LIVE = [[3_100, 8_500], [8_600, 15_600]];

const CAPTIONS = [
  [0, "A teacher's handwritten answer sheets go in."],
  [3_000, "AI marks each answer three times."],
  [5_800, "The marks agree, so it's AI\u00a0graded."],
  [7_500, "Every student gets personalised feedback."],
  [8_700, "AI marks each answer three times."],
  [11_300, "They don't agree, so a teacher reviews."],
  [13_900, "Reviewed, then sent as personalised feedback."],
  [15_600, ""],
];
const STILL_CAPTION = ["Each answer is marked three times by\u00a0AI.", "If at least two marks agree, it's AI\u00a0graded; if not, a teacher reviews."];

/* ── geometry: two layouts, every path a line or a cubic, sampled once (no layout reads per frame) ── */

const L = (x, y) => ({ t: "L", to: [x, y] });
const C = (x1, y1, x2, y2, x, y) => ({ t: "C", c1: [x1, y1], c2: [x2, y2], to: [x, y] });
const toD = (start, segs) => `M ${start[0]} ${start[1]} ` + segs.map((s) => (s.t === "L" ? `L ${s.to[0]} ${s.to[1]}` : `C ${s.c1[0]} ${s.c1[1]}, ${s.c2[0]} ${s.c2[1]}, ${s.to[0]} ${s.to[1]}`)).join(" ");

function route(start, segs) {
  const pts = [{ x: start[0], y: start[1], l: 0 }];
  let p = start;
  let len = 0;
  const push = (x, y) => {
    const last = pts[pts.length - 1];
    len += Math.hypot(x - last.x, y - last.y);
    pts.push({ x, y, l: len });
  };
  for (const s of segs) {
    if (s.t === "L") push(s.to[0], s.to[1]);
    else
      for (let i = 1; i <= 24; i += 1) {
        const u = i / 24;
        const q = 1 - u;
        push(
          q * q * q * p[0] + 3 * q * q * u * s.c1[0] + 3 * q * u * u * s.c2[0] + u * u * u * s.to[0],
          q * q * q * p[1] + 3 * q * q * u * s.c1[1] + 3 * q * u * u * s.c2[1] + u * u * u * s.to[1],
        );
      }
    p = s.to;
  }
  const at = (d) => {
    const dist = Math.max(0, Math.min(d, len));
    let i = 1;
    while (i < pts.length - 1 && pts[i].l < dist) i += 1;
    const a = pts[i - 1];
    const b = pts[i];
    const f = b.l === a.l ? 0 : (dist - a.l) / (b.l - a.l);
    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
  };
  return { d: toD(start, segs), len, at };
}

// Every trail is drawn on EXACTLY the same segments as its grey line (same start, same control points), and runs
// to the station's edge; the moving sheet stops `dock` units short so it never covers an icon.
const R = 20;
function lineOf(start, segs) {
  return { start, segs };
}

function horizontal() {
  const cy = 100;
  const gates = [0, 1, 2].map((k) => ({ x: 270, y: cy - 44 + k * 32, w: 140, h: 24 }));
  const gm = (g) => g.y + g.h / 2;
  const teacher = { x: 32, y: cy };
  const tile = { x: 182, y: cy, s: 48 };
  const fan = [244, cy];
  const merge = [434, cy];
  const ring = { x: 498, y: cy, r: 30 };
  const fork = [554, cy];
  const graded = { x: 620, y: 42 };
  const review = { x: 620, y: 158 };
  const feedback = { x: 752, y: cy };
  const student = { x: 866, y: cy };
  const laneSegs = (g) => [C(fan[0] + 12, cy, g.x - 14, gm(g), g.x - 4, gm(g)), L(g.x, gm(g))];
  const outSegs = (g) => [C(g.x + g.w + 14, gm(g), merge[0] - 12, cy, merge[0], cy), L(ring.x - ring.r, cy)];
  const branchCurve = (s) => C(fork[0] + 26, cy, fork[0] + 26, s.y, s.x - 32, s.y);
  const midCurve = (s) => C(s.x + R + 22, s.y, feedback.x - 50, cy, feedback.x - 28, cy);
  const lines = {
    bundle: lineOf([106, cy], [L(tile.x - tile.s / 2, cy)]),
    emerge: lineOf([tile.x + tile.s / 2, cy], [L(fan[0], cy)]),
    lanes: gates.map((g) => lineOf(fan, laneSegs(g))),
    chips: gates.map((g) => lineOf([g.x + g.w, gm(g)], outSegs(g))),
    up: lineOf([ring.x + ring.r, cy], [L(fork[0], cy), branchCurve(graded), L(graded.x - R, graded.y)]),
    down: lineOf([ring.x + ring.r, cy], [L(fork[0], cy), branchCurve(review), L(review.x - R, review.y)]),
    upMid: lineOf([graded.x + R, graded.y], [midCurve(graded), L(feedback.x - R, cy)]),
    downMid: lineOf([review.x + R, review.y], [midCurve(review), L(feedback.x - R, cy)]),
    end: lineOf([feedback.x + R, cy], [L(student.x - R, cy)]),
  };
  return {
    kind: "h",
    vx: -24,
    w: 928,
    h: 216,
    teacher,
    bundle: { x: 106, y: cy },
    tile,
    gates,
    ring,
    fork,
    graded,
    review,
    feedback,
    student,
    pile: [[62, 56, -12], [88, 34, 6], [114, 54, 10], [138, 30, -5], [102, 14, 4]],
    stackDir: [-1, -1],
    lines,
    base: [
      toD([teacher.x, cy], [L(tile.x, cy)]),
      toD([tile.x, cy], [L(fan[0], cy)]),
      ...gates.map((g) => toD(fan, laneSegs(g)) + ` L ${g.x + g.w} ${gm(g)} ` + toD([g.x + g.w, gm(g)], outSegs(g)).slice(toD([g.x + g.w, gm(g)], []).length)),
      toD(merge, [L(fork[0], cy)]),
      toD(fork, [branchCurve(graded), L(graded.x, graded.y)]),
      toD(fork, [branchCurve(review), L(review.x, review.y)]),
      toD([graded.x, graded.y], [L(graded.x + R, graded.y), midCurve(graded), L(feedback.x, cy)]),
      toD([review.x, review.y], [L(review.x + R, review.y), midCurve(review), L(feedback.x, cy)]),
      toD([feedback.x, cy], [L(student.x, cy)]),
    ],
    labels: [
      { text: "Teacher", x: teacher.x, y: cy + 38, a: "middle" },
      { text: "MySmartTeach", x: tile.x, y: cy + 46, a: "middle", strong: true },
      { text: "Marked 3 times", x: 270 + 70, y: cy + 62, a: "middle" },
      { text: "Student", x: student.x, y: cy + 38, a: "middle" },
      { text: "AI graded", x: graded.x, y: graded.y - 28, a: "middle", id: "graded" },
    ],
    feedbackLabel: [{ text: "Personalised", x: feedback.x, y: cy + 47 }, { text: "feedback", x: feedback.x, y: cy + 63 }],
    summary: { up: toD(fork, [branchCurve(graded), L(graded.x - R, graded.y)]), down: toD(fork, [branchCurve(review), L(review.x - R, review.y)]) },
    feedbackAnchor: "middle",
    reviewLabel: { x: review.x, y: review.y + 43, a: "middle" },
    ringLabel: { x: ring.x, y: cy + ring.r + 18, a: "middle" },
    gateText: true,
  };
}

function vertical() {
  const cx = 180;
  const gates = [0, 1, 2].map((k) => ({ x: 12 + k * 120, y: 226, w: 96, h: 28 }));
  const gc = (g) => g.x + g.w / 2;
  const teacher = { x: cx, y: 30 };
  const tile = { x: cx, y: 160, s: 48 };
  const fan = [cx, 206];
  const merge = [cx, 290];
  const ring = { x: cx, y: 336, r: 28 };
  const fork = [cx, 390];
  const graded = { x: 72, y: 446 };
  const review = { x: 288, y: 446 };
  const feedback = { x: cx, y: 536 };
  const student = { x: cx, y: 610 };
  const laneSegs = (g) => [C(cx, fan[1] + 10, gc(g), g.y - 12, gc(g), g.y - 4), L(gc(g), g.y)];
  const outSegs = (g) => [C(gc(g), g.y + g.h + 12, cx, merge[1] - 12, cx, merge[1]), L(cx, ring.y - ring.r)];
  const branchCurve = (s) => C(cx, fork[1] + 26, s.x, s.y - 50, s.x, s.y - 30);
  // the outcomes leave SIDEWAYS, toward the centre, so their labels below stay clear of every line
  const side = (s) => (s.x < cx ? 1 : -1);
  const midCurve = (s) => C(cx - side(s) * 8, s.y, cx, s.y + 30, cx, feedback.y - R - 12);
  const lines = {
    bundle: lineOf([cx, 96], [L(cx, tile.y - tile.s / 2)]),
    emerge: lineOf([cx, tile.y + tile.s / 2], [L(cx, fan[1])]),
    lanes: gates.map((g) => lineOf(fan, laneSegs(g))),
    chips: gates.map((g) => lineOf([gc(g), g.y + g.h], outSegs(g))),
    up: lineOf([cx, ring.y + ring.r], [L(cx, fork[1]), branchCurve(graded), L(graded.x, graded.y - R)]),
    down: lineOf([cx, ring.y + ring.r], [L(cx, fork[1]), branchCurve(review), L(review.x, review.y - R)]),
    upMid: lineOf([graded.x + R, graded.y], [midCurve(graded), L(cx, feedback.y - R)]),
    downMid: lineOf([review.x - R, review.y], [midCurve(review), L(cx, feedback.y - R)]),
    end: lineOf([cx, feedback.y + R], [L(cx, student.y - R)]),
  };
  return {
    kind: "v",
    vx: 0,
    w: 360,
    h: 640,
    teacher,
    bundle: { x: cx, y: 96 },
    tile,
    gates,
    ring,
    fork,
    graded,
    review,
    feedback,
    student,
    pile: [[116, 62, -12], [246, 64, 8], [104, 108, -6], [258, 110, 10], [140, 128, 4]],
    stackDir: [-1, -1],
    lines,
    base: [
      toD([cx, teacher.y], [L(cx, tile.y)]),
      toD([cx, tile.y], [L(cx, fan[1])]),
      ...gates.map((g) => toD(fan, laneSegs(g)) + ` L ${gc(g)} ${g.y + g.h} ` + toD([gc(g), g.y + g.h], outSegs(g)).slice(toD([gc(g), g.y + g.h], []).length)),
      toD(merge, [L(cx, fork[1])]),
      toD(fork, [branchCurve(graded), L(graded.x, graded.y)]),
      toD(fork, [branchCurve(review), L(review.x, review.y)]),
      toD([graded.x, graded.y], [L(graded.x + R, graded.y), midCurve(graded), L(cx, feedback.y)]),
      toD([review.x, review.y], [L(review.x - R, review.y), midCurve(review), L(cx, feedback.y)]),
      toD([cx, feedback.y], [L(cx, student.y)]),
    ],
    labels: [
      { text: "Teacher", x: cx + 34, y: 35, a: "start" },
      { text: "MySmartTeach", x: cx + 40, y: 165, a: "start", strong: true },
      { text: "Marked 3 times", x: 22, y: 200, a: "start" },
      { text: "Student", x: cx + 34, y: student.y + 5, a: "start" },
      { text: "AI graded", x: graded.x, y: graded.y + 38, a: "middle", id: "graded" },
    ],
    feedbackLabel: [{ text: "Personalised", x: cx + 34, y: feedback.y - 3 }, { text: "feedback", x: cx + 34, y: feedback.y + 13 }],
    feedbackAnchor: "start",
    reviewLabel: { x: review.x, y: review.y + 38, a: "middle" },
    ringLabel: { x: cx + ring.r + 14, y: ring.y + 5, a: "start" },
    summary: { up: toD(fork, [branchCurve(graded), L(graded.x, graded.y - R)]), down: toD(fork, [branchCurve(review), L(review.x, review.y - R)]) },
    gateText: false,
  };
}


function tall() {
  const cx = 260;
  const gates = [0, 1, 2].map((k) => ({ x: 20 + k * 170, y: 220, w: 140, h: 34 }));
  const gc = (g) => g.x + g.w / 2;
  const teacher = { x: cx, y: 32 };
  const tile = { x: cx, y: 142, s: 52 };
  const fan = [cx, 190];
  const merge = [cx, 296];
  const ring = { x: cx, y: 342, r: 32 };
  const fork = [cx, 396];
  const graded = { x: 130, y: 450 };
  const review = { x: 390, y: 450 };
  const feedback = { x: cx, y: 534 };
  const student = { x: cx, y: 606 };
  const laneSegs = (g) => [C(cx, fan[1] + 12, gc(g), g.y - 14, gc(g), g.y - 4), L(gc(g), g.y)];
  const outSegs = (g) => [C(gc(g), g.y + g.h + 14, cx, merge[1] - 14, cx, merge[1]), L(cx, ring.y - ring.r)];
  const branchCurve = (s) => C(cx, fork[1] + 28, s.x, s.y - 54, s.x, s.y - 32);
  const side = (s) => (s.x < cx ? 1 : -1);
  const midCurve = (s) => C(cx - side(s) * 8, s.y, cx, s.y + 32, cx, feedback.y - R - 12);
  const lines = {
    bundle: lineOf([cx, 80], [L(cx, tile.y - tile.s / 2)]),
    emerge: lineOf([cx, tile.y + tile.s / 2], [L(cx, fan[1])]),
    lanes: gates.map((g) => lineOf(fan, laneSegs(g))),
    chips: gates.map((g) => lineOf([gc(g), g.y + g.h], outSegs(g))),
    up: lineOf([cx, ring.y + ring.r], [L(cx, fork[1]), branchCurve(graded), L(graded.x, graded.y - R)]),
    down: lineOf([cx, ring.y + ring.r], [L(cx, fork[1]), branchCurve(review), L(review.x, review.y - R)]),
    upMid: lineOf([graded.x + R, graded.y], [midCurve(graded), L(cx, feedback.y - R)]),
    downMid: lineOf([review.x - R, review.y], [midCurve(review), L(cx, feedback.y - R)]),
    end: lineOf([cx, feedback.y + R], [L(cx, student.y - R)]),
  };
  return {
    kind: "t",
    vx: 0,
    w: 520,
    h: 630,
    teacher,
    bundle: { x: cx, y: 80 },
    tile,
    gates,
    ring,
    fork,
    graded,
    review,
    feedback,
    student,
    pile: [[200, 56, -12], [318, 62, 8], [186, 100, -6], [334, 104, 10], [226, 116, 4]],
    stackDir: [-1, -1],
    lines,
    base: [
      toD([cx, teacher.y], [L(cx, tile.y)]),
      toD([cx, tile.y], [L(cx, fan[1])]),
      ...gates.map((g) => toD(fan, laneSegs(g)) + ` L ${gc(g)} ${g.y + g.h} ` + toD([gc(g), g.y + g.h], outSegs(g)).slice(toD([gc(g), g.y + g.h], []).length)),
      toD(merge, [L(cx, fork[1])]),
      toD(fork, [branchCurve(graded), L(graded.x, graded.y)]),
      toD(fork, [branchCurve(review), L(review.x, review.y)]),
      toD([graded.x, graded.y], [L(graded.x + R, graded.y), midCurve(graded), L(cx, feedback.y)]),
      toD([review.x, review.y], [L(review.x - R, review.y), midCurve(review), L(cx, feedback.y)]),
      toD([cx, feedback.y], [L(cx, student.y)]),
    ],
    labels: [
      { text: "Teacher", x: cx + 34, y: teacher.y + 5, a: "start" },
      { text: "MySmartTeach", x: cx + 42, y: tile.y + 6, a: "start", strong: true },
      { text: "Marked 3 times", x: 20, y: gates[0].y - 22, a: "start" },
      { text: "Student", x: cx + 34, y: student.y + 5, a: "start" },
      { text: "AI graded", x: graded.x, y: graded.y + 40, a: "middle", id: "graded" },
    ],
    feedbackLabel: [{ text: "Personalised", x: cx + 34, y: feedback.y - 3 }, { text: "feedback", x: cx + 34, y: feedback.y + 13 }],
    feedbackAnchor: "start",
    reviewLabel: { x: review.x, y: review.y + 40, a: "middle" },
    ringLabel: { x: cx + ring.r + 14, y: ring.y + 5, a: "start" },
    summary: { up: toD(fork, [branchCurve(graded), L(graded.x, graded.y - R)]), down: toD(fork, [branchCurve(review), L(review.x, review.y - R)]) },
    gateText: true,
  };
}

function withRoutes(g) {
  const r = (l) => route(l.start, l.segs);
  const { lines } = g;
  return { ...g, routes: { bundle: r(lines.bundle), emerge: r(lines.emerge), lanes: lines.lanes.map(r), chips: lines.chips.map(r), up: r(lines.up), down: r(lines.down), upMid: r(lines.upMid), downMid: r(lines.downMid), end: r(lines.end) } };
}
const LAYOUTS = { h: withRoutes(horizontal()), v: withRoutes(vertical()), t: withRoutes(tall()) };

/* ── easing ── */
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const pulse = (t, a, d) => (t < a || t > a + d ? 0 : Math.sin(((t - a) / d) * Math.PI));
const r2 = (v) => Math.round(v * 100) / 100;

/* ── icons: lucide paths (24×24) ── */
const ICONS = {
  teacher: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  graded: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M9 15l2 2 4-4",
  review: "M11.5 15H7a4 4 0 0 0-4 4v2 M21.378 16.626a1 1 0 0 0-3.004-3.004l-4.01 4.012a2 2 0 0 0-.506.854l-.837 2.87a.5.5 0 0 0 .62.62l2.87-.837a2 2 0 0 0 .854-.506z M14 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
  feedback: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z M13 8H7 M17 12H7",
  student: "M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z M22 10v6 M6 12.5V16a6 3 0 0 0 12 0v-3.5",
};
const STAR = "M12 1.5C12.9 8.2 15.8 11.1 22.5 12C15.8 12.9 12.9 15.8 12 22.5C11.1 15.8 8.2 12.9 1.5 12C8.2 11.1 11.1 8.2 12 1.5Z";

function Station({ at, icon, id }) {
  return (
    <g className="gl-station" data-gl={`st-${id}`}>
      <circle cx={at.x} cy={at.y} r={20} />
      <path className="gl-icon" d={ICONS[icon]} data-gl={`ic-${id}`} transform={`translate(${at.x - 9} ${at.y - 9}) scale(0.75)`} />
    </g>
  );
}

/** A handwritten answer sheet (drawn at the origin; the engine moves it). */
function Sheet({ name, badge = false, glow = false, className = "" }) {
  return (
    <g className={`gl-sheet ${className}`} data-gl={name} style={{ opacity: 0 }}>
      {glow ? <circle className="gl-sheet-glow" r={20} /> : null}
      <rect className="gl-sheet-shadow" height={26} rx={2.5} width={20} x={-8.5} y={-11.5} />
      <rect className="gl-sheet-paper" height={26} rx={2.5} width={20} x={-10} y={-13} />
      <rect className="gl-sheet-head" data-gl={`${name}-head`} height={5} rx={1.5} width={20} x={-10} y={-13} />
      <path className="gl-sheet-pen" d="M -6 -3.5 q 1.5 -2 3 0 t 3 0 t 3 0 t 3 0 M -6 2 q 1.5 -2 3 0 t 3 0 t 3 0 M -6 7.5 q 1.5 -2 3 0 t 3 0 t 3 0 t 3 0" />
      {badge ? (
        <g className="gl-badge" data-gl={`${name}-badge`} transform="translate(10 -13)">
          <circle r={6.5} />
          <path className="gl-badge-tick" d="M -3 0.2 L -0.8 2.4 L 3.2 -1.8" />
          <text className="gl-badge-q" textAnchor="middle" y={3.4}>?</text>
        </g>
      ) : null}
    </g>
  );
}

export default function GradingLine({ tallFrom = 0 } = {}) {
  const box = useRef(null);
  const svg = useRef(null);
  const [kind, setKind] = useState("h");
  const [paused, setPaused] = useState(() => {
    if (typeof window === "undefined") return true;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
    try {
      return localStorage.getItem(PAUSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!media) return undefined;
    const change = () => media.matches && setPaused(true);
    media.addEventListener?.("change", change);
    return () => media.removeEventListener?.("change", change);
  }, []);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      setKind(tallFrom && window.innerWidth >= tallFrom && w >= 380 ? "t" : w >= 720 ? "h" : "v");
    };
    measure();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [tallFrom]);
  const toggle = () =>
    setPaused((value) => {
      const next = !value;
      try {
        localStorage.setItem(PAUSE_KEY, next ? "1" : "0");
      } catch {
        /* private window */
      }
      return next;
    });

  const g = LAYOUTS[kind];
  useLine(svg, g, paused);

  const arc = (from, to) => {
    const { x, y, r } = g.ring;
    const a = (from * Math.PI) / 180;
    const b = (to * Math.PI) / 180;
    return `M ${r2(x + r * Math.cos(a))} ${r2(y + r * Math.sin(a))} A ${r} ${r} 0 0 1 ${r2(x + r * Math.cos(b))} ${r2(y + r * Math.sin(b))}`;
  };
  // three equal parts of a ¾ ring that opens at the bottom (the Moby gauge), 6° gaps: one part per marking
  const SEGS = [0, 1, 2].map((k) => [135 + k * 90 + 3, 135 + (k + 1) * 90 - 3]);

  return (
    <div className="gl" data-kind={kind} data-still={paused ? "true" : "false"} ref={box}>
      <div className="gl-top">
        <button aria-label={paused ? "Play animation" : "Pause animation"} className="gl-play" onClick={toggle} title={paused ? "Play" : "Pause"} type="button">
          {paused ? (
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z" /></svg>
          ) : (
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M7 4.5h3.5v15H7zM13.5 4.5H17v15h-3.5z" /></svg>
          )}
        </button>
        <span className="gl-title">How marking works</span>
        <span className="gl-tag">Illustration</span>
      </div>
      <svg
        aria-label="Illustration: a teacher's handwritten answer sheets go into MySmartTeach; every answer is marked three times by AI; if at least two marks agree it is AI graded, otherwise it waits for the teacher to review; every student then gets personalised feedback."
        className="gl-svg"
        ref={svg}
        role="img"
        viewBox={`${g.vx} 0 ${g.w} ${g.h}`}
      >
        <defs>
          <radialGradient id="gl-glow">
            <stop offset="0" stopColor="var(--gl-accent)" stopOpacity="0.42" />
            <stop offset="1" stopColor="var(--gl-accent)" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gl-tile-glow">
            <stop offset="0" stopColor="var(--gl-accent)" stopOpacity="0.55" />
            <stop offset="1" stopColor="var(--gl-accent)" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="gl-ai-edge" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--ai-a)" />
            <stop offset="1" stopColor="var(--ai-b)" />
          </linearGradient>
          <linearGradient id="gl-ai-fill" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="var(--ai-a)" stopOpacity="var(--ai-fill-a)" />
            <stop offset="1" stopColor="var(--ai-b)" stopOpacity="var(--ai-fill-a)" />
          </linearGradient>
          <linearGradient data-gl="shine" gradientUnits="userSpaceOnUse" id="gl-shine" x1="-46" x2="0" y1="0" y2="0">
            <stop offset="0" stopColor="#6f9bff" stopOpacity="0" />
            <stop offset="0.3" stopColor="#7fa6ff" stopOpacity="0.45" />
            <stop offset="0.5" stopColor="#ffffff" stopOpacity="0.7" />
            <stop offset="0.7" stopColor="#b48cff" stopOpacity="0.45" />
            <stop offset="1" stopColor="#a77bff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="gl-star" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="#bfe3ff" />
            <stop offset="0.45" stopColor="#4c86ff" />
            <stop offset="1" stopColor="#2a3fc9" />
          </linearGradient>
        </defs>

        {/* the lines, then the trails that light behind the moving sheets */}
        <g aria-hidden="true">
          {g.base.map((d, i) => <path className="gl-line" d={d} key={i} />)}
          <g className="gl-summary">
            <path className="gl-trail is-ok" d={g.summary.up} />
            <path className="gl-trail is-ok" d={g.routes.upMid.d} />
            <path className="gl-trail is-warn" d={g.summary.down} />
            <path className="gl-trail is-ok" d={g.routes.end.d} />
          </g>
          {["bundle", "emerge", "lane0", "lane1", "lane2", "chip0", "chip1", "chip2", "up", "upMid", "down", "downMid", "end"].map((name) => (
            <path className="gl-trail" data-gl={`tr-${name}`} key={name} />
          ))}
        </g>

        {/* the moving things — drawn BEFORE the stations so they pass behind them */}
        <g aria-hidden="true">
          {g.pile.map((_, i) => <Sheet key={i} name={`pile${i}`} />)}
          <g className="gl-clip" data-gl="clip" style={{ opacity: 0 }}>
            <rect height={8} rx={2} width={26} x={-15} y={-6} />
          </g>
          {[0, 1, 2].map((k) => <Sheet className="is-copy" key={k} name={`copy${k}`} />)}
          {[0, 1, 2].map((k) => (
            <g className="gl-chip" data-gl={`chip${k}`} key={k} style={{ opacity: 0 }}>
              <circle className="gl-chip-glow" r={11} />
              <circle className="gl-chip-core" r={4.5} />
            </g>
          ))}
          <Sheet badge glow name="sheet" />
          <g className="gl-ghost" transform={g.kind === "h" ? `translate(${g.student.x - 34} ${g.student.y})` : `translate(${g.student.x} ${g.student.y - 34})`}>
            <rect className="gl-sheet-paper" height={26} rx={2.5} width={20} x={-10} y={-13} />
            <rect className="gl-sheet-head is-on" height={5} rx={1.5} width={20} x={-10} y={-13} />
            <path className="gl-sheet-pen" d="M -6 -3.5 q 1.5 -2 3 0 t 3 0 t 3 0 t 3 0 M -6 2 q 1.5 -2 3 0 t 3 0 t 3 0 M -6 7.5 q 1.5 -2 3 0 t 3 0 t 3 0 t 3 0" />
            <circle className="gl-ghost-badge" cx={10} cy={-13} r={6.5} />
            <path className="gl-ghost-tick" d="M 7 -12.8 L 9.2 -10.6 L 13.2 -14.8" />
          </g>
        </g>

        {/* the stations */}
        <g aria-hidden="true">
          <circle className="gl-ping" cx={g.teacher.x} cy={g.teacher.y} data-gl="ping" r={20} />
          <Station at={g.teacher} icon="teacher" id="teacher" />

          <g className="gl-tile" data-gl="tile">
            <circle className="gl-tile-glow" cx={g.tile.x} cy={g.tile.y} fill="url(#gl-tile-glow)" r={46} />
            <circle className="gl-tile-wave" cx={g.tile.x} cy={g.tile.y} data-gl="wave" r={30} />
            <rect className="gl-tile-box" height={g.tile.s} rx={14} width={g.tile.s} x={g.tile.x - g.tile.s / 2} y={g.tile.y - g.tile.s / 2} />
            <path d={STAR} fill="url(#gl-star)" transform={`translate(${g.tile.x - 15} ${g.tile.y - 15}) scale(1.25)`} />
          </g>

          {g.gates.map((gate, k) => (
            <g className="gl-gate" data-gl={`gate${k}`} key={k}>
              <rect className="gl-gate-under" height={gate.h} rx={gate.h / 2} width={gate.w} x={gate.x} y={gate.y} />
              <rect className="gl-gate-box" height={gate.h} rx={gate.h / 2} width={gate.w} x={gate.x} y={gate.y} />
              <rect className="gl-gate-shine" data-gl={`shine${k}`} fill="url(#gl-shine)" height={gate.h} rx={gate.h / 2} width={gate.w} x={gate.x} y={gate.y} />
              <path className="gl-gate-star" d={STAR} transform={`translate(${gate.x + 10} ${gate.y + gate.h / 2 - 6}) scale(0.5)`} />
              <text className="gl-gate-name" x={gate.x + 28} y={gate.y + gate.h / 2 + 4.5}>{g.gateText ? `Marking ${k + 1}` : k + 1}</text>
              <text className="gl-gate-mark" data-gl={`mark${k}`} textAnchor="end" x={gate.x + gate.w - 12} y={gate.y + gate.h / 2 + 4.5}>–</text>
            </g>
          ))}

          <g className="gl-ring" data-gl="ring">
            {SEGS.map(([a, b], k) => (
              <g key={k}>
                <path className="gl-seg-bg" d={arc(a, b)} />
                <path className="gl-seg" d={arc(a, b)} data-gl={`seg${k}`} pathLength={100} />
              </g>
            ))}
            <circle className="gl-ring-core" cx={g.ring.x} cy={g.ring.y} r={g.ring.r - 5} />
            <text className="gl-ring-value" data-gl="ringvalue" textAnchor="middle" x={g.ring.x} y={g.ring.y + 6}>–</text>
          </g>
          <circle className="gl-fork" cx={g.fork[0]} cy={g.fork[1]} r={3} />

          <circle className="gl-ping is-ok" cx={g.graded.x} cy={g.graded.y} data-gl="gradedring" r={20} />
          <Station at={g.graded} icon="graded" id="graded" />
          <circle className="gl-scan" cx={g.review.x} cy={g.review.y} data-gl="scan" r={25} />
          <Station at={g.review} icon="review" id="review" />
          <circle className="gl-ping" cx={g.feedback.x} cy={g.feedback.y} data-gl="feedbackring" r={20} />
          <Station at={g.feedback} icon="feedback" id="feedback" />
          <circle className="gl-ping" cx={g.student.x} cy={g.student.y} data-gl="studentring" r={20} />
          <Station at={g.student} icon="student" id="student" />

          {g.labels.map((label) => (
            <text className={`gl-label${label.strong ? " is-strong" : ""}`} data-gl={label.id ? `lb-${label.id}` : undefined} key={label.text} textAnchor={label.a} x={label.x} y={label.y}>{label.text}</text>
          ))}
          {g.feedbackLabel.map((line) => (
            <text className="gl-label" data-gl={`lb-feedback-${line.text}`} key={line.text} textAnchor={g.feedbackAnchor} x={line.x} y={line.y}>{line.text}</text>
          ))}
          <text className="gl-label" data-gl="lb-review" textAnchor={g.reviewLabel.a} x={g.reviewLabel.x} y={g.reviewLabel.y}>Teacher review</text>
          <text className="gl-label" data-gl="lb-ring" textAnchor={g.ringLabel.a} x={g.ringLabel.x} y={g.ringLabel.y}>Agreement</text>
        </g>
      </svg>
      <p aria-hidden="true" className="gl-caption">
        {CAPTIONS.filter(([, text]) => text).map(([at, text]) => <span data-gl-cap={at} key={at}>{text}</span>)}
        <span className="gl-caption-still">{STILL_CAPTION.map((line) => <span className="gl-caption-line" key={line}>{line}</span>)}</span>
      </p>
    </div>
  );
}

/* ── the engine ── */
function useLine(svgRef, g, paused) {
  useEffect(() => {
    const root = svgRef.current;
    if (!root) return undefined;
    const stage = root.parentElement;
    const q = (name) => root.querySelector(`[data-gl="${name}"]`);
    const el = {
      ping: q("ping"),
      pile: g.pile.map((_, i) => q(`pile${i}`)),
      clip: q("clip"),
      tile: q("tile"),
      wave: q("wave"),
      copies: [0, 1, 2].map((k) => q(`copy${k}`)),
      chips: [0, 1, 2].map((k) => q(`chip${k}`)),
      sheet: q("sheet"),
      head: q("sheet-head"),
      badge: q("sheet-badge"),
      gates: [0, 1, 2].map((k) => q(`gate${k}`)),
      shine: q("shine"),
      shines: [0, 1, 2].map((k) => q(`shine${k}`)),
      marks: [0, 1, 2].map((k) => q(`mark${k}`)),
      segs: [0, 1, 2].map((k) => q(`seg${k}`)),
      ring: q("ring"),
      ringValue: q("ringvalue"),
      ringLabel: q("lb-ring"),
      reviewLabel: q("lb-review"),
      gradedRing: q("gradedring"),
      studentRing: q("studentring"),
      feedbackRing: q("feedbackring"),
      scan: q("scan"),
      reviewIcon: q("ic-review"),
      st: Object.fromEntries(["teacher", "graded", "review", "feedback", "student"].map((id) => [id, q(`st-${id}`)])),
      tr: Object.fromEntries(["bundle", "emerge", "lane0", "lane1", "lane2", "chip0", "chip1", "chip2", "up", "upMid", "down", "downMid", "end"].map((n) => [n, q(`tr-${n}`)])),
      caps: Array.from(stage?.querySelectorAll("[data-gl-cap]") ?? []),
    };
    const R = g.routes;
    const DOCK = 14;
    const trailRoute = { bundle: R.bundle, emerge: R.emerge, lane0: R.lanes[0], lane1: R.lanes[1], lane2: R.lanes[2], chip0: R.chips[0], chip1: R.chips[1], chip2: R.chips[2], up: R.up, upMid: R.upMid, down: R.down, downMid: R.downMid, end: R.end };
    Object.entries(el.tr).forEach(([n, p]) => p && p.setAttribute("d", trailRoute[n].d));
    const gx = g.gates.map((gt) => gt.x);
    const sweepFrom = Math.min(...gx) - 80;
    const sweepTo = Math.max(...g.gates.map((gt) => gt.x + gt.w)) + 80;

    // write only what changed (parts at rest stop invalidating style every frame)
    const written = new WeakMap();
    const changed = (t, k, v) => {
      let m = written.get(t);
      if (!m) written.set(t, (m = new Map()));
      if (m.get(k) === v) return false;
      m.set(k, v);
      return true;
    };
    const setA = (t, n, v) => t && changed(t, `@${n}`, v) && t.setAttribute(n, v);
    const setS = (t, p, v) => t && changed(t, p, v) && t.style.setProperty(p, v);
    const flag = (t, n, on) => t && changed(t, `.${n}`, on ? "1" : "0") && t.classList.toggle(n, on);
    const text = (t, v) => t && changed(t, "#text", v) && (t.textContent = v);
    const place = (t, p, s = 1, rot = 0, alpha = 1) => {
      setA(t, "transform", `translate(${r2(p.x)} ${r2(p.y)})${s !== 1 ? ` scale(${r2(s)})` : ""}${rot ? ` rotate(${r2(rot)})` : ""}`);
      setS(t, "opacity", String(r2(alpha)));
    };
    const trail = (name, dist, on, tone = "") => {
      const p = el.tr[name];
      setS(p, "stroke-dasharray", `${r2(dist)} 9999`);
      setS(p, "opacity", on && dist > 0 ? "0.9" : "0");
      flag(p, "is-ok", tone === "ok");
      flag(p, "is-warn", tone === "warn");
    };

    function draw(t, still = false) {
      /* ── the intro: the pile becomes one bundle and goes into MySmartTeach ── */
      const intro = t < 3_070;
      if (el.ping) {
        const pp = seg(t, 0, 420);
        setA(el.ping, "r", String(r2(20 * (1 + 0.6 * pp))));
        setS(el.ping, "opacity", pp > 0 && pp < 1 ? String(r2(0.5 * (1 - pp))) : "0");
      }
      flag(el.st.teacher, "is-active", t < 1_400);
      const stackAt = (i) => {
        const k = Math.min(i, 2);
        return { x: g.bundle.x + g.stackDir[0] * 3 * k, y: g.bundle.y + g.stackDir[1] * 3 * k };
      };
      const travel = seg(t, 2_150, 2_750);
      const bundlePos = R.bundle.at(ease(travel) * (R.bundle.len - 16));
      const sink = seg(t, 2_750, 3_070);
      g.pile.forEach(([px, py, rot], i) => {
        const node = el.pile[i];
        if (!intro) return setS(node, "opacity", "0");
        const fly = seg(t, 120 + i * 150, 720 + i * 150);
        const gather = seg(t, 1_450 + i * 60, 1_870 + i * 60);
        const from = g.teacher;
        let p;
        let r = rot;
        if (gather <= 0) {
          const e = easeOut(fly);
          const lift = Math.sin(fly * Math.PI) * (g.kind === "h" ? -18 : 14);
          const float = t > 1_320 ? 2 * Math.sin(((t - 1_320) / 260) * Math.PI + i) : 0;
          p = { x: from.x + (px - from.x) * e, y: from.y + (py - from.y) * e + lift + float };
          r = rot * e;
        } else {
          const e = ease(gather);
          const s = stackAt(i);
          p = { x: px + (s.x - px) * e, y: py + (s.y - py) * e };
          r = rot * (1 - e);
        }
        if (travel > 0) {
          const s = stackAt(i);
          p = { x: bundlePos.x + (s.x - g.bundle.x), y: bundlePos.y + (s.y - g.bundle.y) };
          r = 0;
        }
        const alpha = fly <= 0 ? 0 : (1 - sink) * clamp01(fly * 4);
        place(node, p, (0.6 + 0.4 * easeOut(fly)) * (1 - 0.4 * sink), r, alpha);
      });
      const clip = seg(t, 1_950, 2_110);
      if (intro && clip > 0) place(el.clip, { x: bundlePos.x - 3, y: bundlePos.y - 3 }, 0.6 + 0.4 * easeOut(clip), 0, 1 - sink);
      else setS(el.clip, "opacity", "0");
      trail("bundle", ease(travel) * R.bundle.len, intro && travel > 0);
      // the tile wakes when the bundle goes in, and stays lit while sheets are marked
      flag(el.tile, "is-lit", t >= 2_900 && t < 15_600);
      const wp = seg(t, 2_900, 3_700);
      setA(el.wave, "r", String(r2(30 + 22 * easeOut(wp))));
      setS(el.wave, "opacity", wp > 0 && wp < 1 ? String(r2(0.6 * (1 - wp))) : "0");

      /* ── the two papers ── */
      const which = t < LIVE[1][0] ? 0 : 1;
      const o = OFFSET[which];
      const u = t - o; // paper-A time
      const live = t >= LIVE[which][0] && t < LIVE[which][1];
      const marks = MARKS[which];
      const agreed = which === 0;
      const tone = agreed ? "ok" : "warn";

      // the sheet grows out of MySmartTeach
      const emerge = seg(u, 3_100, 3_400);
      if (live && u < 3_400) place(el.sheet, R.emerge.at(easeOut(emerge) * R.emerge.len), 0.6 + 0.4 * easeOut(emerge), 0, clamp01(emerge * 3));
      const docked = (r, p) => r.at(p * (r.len - DOCK));
      trail("emerge", (u >= 3_400 ? 1 : easeOut(emerge)) * R.emerge.len, live && emerge > 0);

      // three copies travel the three lanes together, into the three markings
      const lanes = seg(u, 3_400, 4_050);
      const into = seg(u, 4_050, 4_250);
      el.copies.forEach((copy, k) => {
        const r = R.lanes[k];
        trail(`lane${k}`, live ? ease(lanes) * r.len : 0, live && lanes > 0);
        if (!live || lanes <= 0 || into >= 1) setS(copy, "opacity", "0");
        else place(copy, r.at(ease(lanes) * r.len), 0.85 * (1 - 0.4 * into), 0, 1 - into);
      });

      // marking: the gate lights, a pen line sweeps, the mark appears (one per gate, 120 ms apart)
      el.gates.forEach((gate, k) => {
        const open = live && u >= 4_050;
        flag(gate, "is-open", open);
        setS(el.shines[k], "opacity", open && u >= 4_100 && u < 4_960 ? "1" : "0");
        const shown = live && u >= 4_700 + k * 120;
        text(el.marks[k], shown ? `${marks[k]}/10` : "–");
        flag(el.marks[k], "is-set", shown);
        flag(gate, "is-ok", live && u >= 5_800 && agreed);
        flag(gate, "is-warn", live && u >= 5_800 && !agreed);
      });

      // the AI shine: one soft band sweeps across all three markings together, twice, while they mark
      if (live && u >= 4_100 && u < 4_960) {
        const sp = ((u - 4_100) % 430) / 430;
        setA(el.shine, "gradientTransform", `translate(${r2(sweepFrom + (sweepTo - sweepFrom) * ease(sp))} 0)`);
      }

      // the marks fly into the ring; each fills its own part, neutral, as it lands
      el.chips.forEach((chip, k) => {
        const r = R.chips[k];
        const f = seg(u, 5_000 + k * 120, 5_480 + k * 120);
        if (!live || f <= 0 || f >= 1) setS(chip, "opacity", "0");
        else place(chip, r.at(ease(f) * r.len), 1, 0, f > 0.85 ? (1 - f) / 0.15 : 1);
        trail(`chip${k}`, ease(f) * r.len, live && f > 0);
        const fill = seg(u, 5_480 + k * 120, 5_720 + k * 120);
        setS(el.segs[k], "stroke-dashoffset", String(r2(100 * (1 - (live ? easeOut(fill) : 0)))));
      });
      // the verdict: all three parts switch together, in one step, with a stamp pulse
      const decided = live && u >= 5_800;
      flag(el.ring, "is-ok", decided && agreed);
      flag(el.ring, "is-warn", decided && !agreed);
      const stamp = pulse(u, 5_800, 260);
      el.segs.forEach((s) => setS(s, "stroke-width", String(r2(6 + 2.5 * stamp))));
      text(el.ringValue, decided ? (agreed ? "8/10" : "?") : "–");
      text(el.ringLabel, decided ? (agreed ? "Agreed" : "Not agreed") : "Agreement");
      flag(el.ringLabel, "is-ok", decided && agreed);
      flag(el.ringLabel, "is-warn", decided && !agreed);

      // the sheet leaves the ring with its badge: up to AI graded, or down to Pending review
      const branch = agreed ? R.up : R.down;
      const mid = agreed ? R.upMid : R.downMid;
      const station = agreed ? g.graded : g.review;
      const go = seg(u, 6_000, 6_900);
      const reviewed = !agreed && t >= 13_900 && live;
      const reviewing = !agreed && live && t >= 12_500 && t < 13_900;
      const pending = !agreed && live && t >= 12_400;
      // B waits for the teacher: its walk to Feedback starts 14,000 instead of 6,900+5,500
      const midFrom = agreed ? 6_900 : 14_000 - o;
      const midTo = agreed ? 7_500 : 14_600 - o;
      const endFrom = agreed ? 7_600 : 14_700 - o;
      const endTo = agreed ? 8_270 : 15_370 - o;
      const m = seg(u, midFrom, midTo);
      const e = seg(u, endFrom, endTo);
      const sinkEnd = seg(u, endTo, endTo + 150);
      if (live && u >= 3_400) {
        let p = null;
        let a = 1;
        let s = 1;
        if (u >= 6_000 && u < midFrom) p = docked(branch, ease(go));
        else if (u >= midFrom && u < endFrom) p = docked(mid, ease(m));
        else if (u >= endFrom) {
          p = R.end.at(ease(e) * (R.end.len - DOCK) + sinkEnd * (DOCK - 4));
          s = 1 - 0.4 * sinkEnd;
          a = 1 - sinkEnd;
        }
        if (u >= 6_000 && u < 6_150) a = seg(u, 6_000, 6_150);
        if (p) place(el.sheet, p, s, 0, a);
        else setS(el.sheet, "opacity", "0");
      } else if (!(live && u < 3_400)) setS(el.sheet, "opacity", "0");
      flag(el.badge, "is-ok", agreed || reviewed);
      flag(el.badge, "is-warn", !agreed && !reviewed);
      setS(el.badge, "opacity", live && u >= 6_000 ? "1" : "0");
      flag(el.head, "is-on", live && u >= midTo);
      trail(agreed ? "up" : "down", ease(go) * branch.len, live && go > 0, tone);
      trail(agreed ? "down" : "up", 0, false);
      trail(agreed ? "upMid" : "downMid", ease(m) * mid.len, live && m > 0, "ok");
      trail(agreed ? "downMid" : "upMid", 0, false);
      trail("end", ease(e) * R.end.len, live && e > 0, "ok");

      // the stations
      flag(el.st.graded, "is-ok", agreed && live && u >= 6_850);
      if (el.gradedRing) {
        const rp = agreed && live ? seg(u, 6_850, 7_450) : 0;
        setA(el.gradedRing, "r", String(r2(20 * (1 + 0.5 * rp))));
        setS(el.gradedRing, "opacity", rp > 0 && rp < 1 ? String(r2(0.55 * (1 - rp))) : "0");
      }
      flag(el.st.review, "is-warn", pending && !reviewed);
      flag(el.st.review, "is-ok", reviewed);
      setA(el.st.review?.querySelector("circle"), "stroke-width", String(r2(1.25 + (pending ? 0.5 + 2 * pulse(t, 12_400, 260) : 0))));
      text(el.reviewLabel, reviewed ? "Teacher graded" : pending ? "Pending review" : "Teacher review");
      flag(el.reviewLabel, "is-warn", pending && !reviewed);
      flag(el.reviewLabel, "is-ok", reviewed);
      setS(el.scan, "opacity", reviewing ? "1" : "0");
      if (reviewing) setA(el.scan, "transform", `rotate(${r2((((t - 12_500) / 1_400) * 360) % 360)} ${station.x} ${station.y})`);
      setS(el.reviewIcon, "opacity", reviewing ? String(r2(0.55 + 0.45 * Math.abs(Math.sin(((t - 12_500) / 300) * Math.PI)))) : "");
      // personalised feedback: the station lights in the accent, a ring goes out, the sheet's header turns accent
      const atFeedback = live && u >= midTo - 80; // stays lit, like AI graded / Teacher graded, until the paper resets
      flag(el.st.feedback, "is-lit", atFeedback);
      if (el.feedbackRing) {
        const fp = live ? seg(u, midTo - 80, midTo + 520) : 0;
        setA(el.feedbackRing, "r", String(r2(20 * (1 + 0.5 * fp))));
        setS(el.feedbackRing, "opacity", fp > 0 && fp < 1 ? String(r2(0.55 * (1 - fp))) : "0");
      }
      flag(el.st.student, "is-active", live && u >= endTo - 150);
      if (el.studentRing) {
        const sp = live ? seg(u, endTo, endTo + 600) : 0;
        setA(el.studentRing, "r", String(r2(20 * (1 + 0.5 * sp))));
        setS(el.studentRing, "opacity", sp > 0 && sp < 1 ? String(r2(0.55 * (1 - sp))) : "0");
      }

      // the still frame (paused / reduced motion) is a summary: both outcomes, so the ring and the marks stay neutral
      if (still) {
        el.gates.forEach((gate, k) => {
          flag(gate, "is-ok", false);
          flag(gate, "is-warn", false);
          flag(gate, "is-open", false);
          text(el.marks[k], "–");
          flag(el.marks[k], "is-set", false);
          setS(el.shines[k], "opacity", "0");
        });
        flag(el.ring, "is-ok", false);
        flag(el.ring, "is-warn", false);
        el.segs.forEach((sg) => setS(sg, "stroke-dashoffset", "100"));
        text(el.ringValue, "–");
        text(el.ringLabel, "Agreement");
        flag(el.ringLabel, "is-ok", false);
        flag(el.ringLabel, "is-warn", false);
        flag(el.st.graded, "is-ok", true);
        flag(el.st.feedback, "is-lit", true);
        ["lane0", "lane1", "lane2", "chip0", "chip1", "chip2", "up", "upMid", "down", "downMid", "end", "emerge"].forEach((n) => setS(el.tr[n], "opacity", "0"));
      }

      // the narration follows what is moving
      let current = 0;
      for (const [at] of CAPTIONS) if (t >= at) current = at;
      el.caps.forEach((cap) => flag(cap, "is-on", Number(cap.dataset.glCap) === current));
    }

    const canAnimate = typeof requestAnimationFrame !== "undefined" && typeof root.getBBox === "function";
    stage?.setAttribute("data-still", paused || !canAnimate ? "true" : "false");
    if (paused || !canAnimate) {
      draw(REST, true);
      return undefined;
    }
    let raf = 0;
    let visible = true;
    let pageVisible = document.visibilityState !== "hidden";
    let clock = 0;
    let lastNow = 0;
    const running = () => visible && pageVisible;
    function frame(now) {
      if (lastNow) clock = (clock + Math.min(now - lastNow, 64)) % LOOP;
      lastNow = now;
      draw(clock);
      raf = running() ? requestAnimationFrame(frame) : 0;
    }
    const wake = () => {
      if (running() && !raf) {
        lastNow = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    let io;
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver((entries) => {
        visible = entries.some((entry) => entry.intersectionRatio >= 0.25);
        wake();
      }, { threshold: [0, 0.25, 0.5] });
      io.observe(root);
    }
    const onVisibility = () => {
      pageVisible = document.visibilityState !== "hidden";
      wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    draw(0);
    raf = requestAnimationFrame(frame);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io?.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [svgRef, g, paused]);
}
