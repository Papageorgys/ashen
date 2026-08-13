import { memo } from "react";

/**
 * Hand-drawn atlas motifs — inked mountain ranges and forest clumps — laid over the
 * procedural terrain to give the War Table map its Lineage 2-style illustrated look.
 * Purely decorative (pointer-events-none) and static, so it renders once and never
 * intercepts the interactive zone/banner overlay above it. Map space is 100x62; the
 * design y of each motif is multiplied by 0.62 into that space.
 */

// Relief ranges (same seeds as the terrain bake) — the last three are the eastern wall.
const RANGES = [
  { x: 62, y: 18, r: 11, h: 0.95 },
  { x: 74, y: 11, r: 9, h: 0.85 },
  { x: 82, y: 42, r: 9, h: 0.9 },
  { x: 46, y: 13, r: 8, h: 0.6 },
  { x: 89, y: 22, r: 9, h: 0.9 },
  { x: 55, y: 34, r: 6, h: 0.5 },
  { x: 34, y: 14, r: 7, h: 0.62 },
  { x: 68, y: 46, r: 6, h: 0.55 },
  { x: 94, y: 30, r: 7, h: 1.1 },
  { x: 96, y: 46, r: 7, h: 1.1 },
  { x: 93, y: 58, r: 6, h: 1.0 },
];

// Forest clumps in design coords (x, y); y is scaled by 0.62 into map space.
const TREES: [number, number][] = [
  [12, 60], [16, 66], [20, 72], [31, 74], [34, 66], [44, 72], [52, 82], [24, 40],
  [36, 40], [60, 74], [66, 78], [62, 46], [56, 52], [14, 38], [36, 30], [43, 33],
  [46, 10], [58, 12], [70, 16], [28, 18], [24, 24], [76, 44], [66, 50], [52, 42],
  [40, 48], [32, 52], [48, 58], [62, 58],
];

const my = (y: number) => y * 0.62;

/** A clustered peak glyph — three inked triangles with a shaded flank. */
function Mtn({ cx, cy, s, k }: { cx: number; cy: number; s: number; k: string }) {
  const peaks: [number, number, number][] = [
    [-1.5, 0, 1.15],
    [0, -0.35, 1.8],
    [1.5, 0.12, 1.05],
  ];
  return (
    <g key={k}>
      {peaks.map((p, i) => {
        const px = cx + p[0] * s;
        const base = cy + 0.3 * s;
        const h = p[2] * s;
        const w = 1.02 * s;
        return (
          <g key={i}>
            <path
              d={`M${px - w} ${base} L${px} ${base - h} L${px + w} ${base} Z`}
              fill="#cbb488"
              stroke="#4a3620"
              strokeWidth={0.15 * s}
              strokeLinejoin="round"
            />
            <path
              d={`M${px} ${base - h} L${px + w * 0.5} ${base}`}
              stroke="#4a3620"
              strokeWidth={0.1 * s}
              fill="none"
              opacity={0.5}
            />
          </g>
        );
      })}
    </g>
  );
}

/** A single conifer. */
function Tree({ cx, cy, s }: { cx: number; cy: number; s: number }) {
  return (
    <g>
      <line x1={cx} y1={cy} x2={cx} y2={cy - 1.1 * s} stroke="#5a4326" strokeWidth={0.2 * s} />
      <path
        d={`M${cx - 0.82 * s} ${cy - 0.7 * s} L${cx} ${cy - 2.1 * s} L${cx + 0.82 * s} ${cy - 0.7 * s} Z`}
        fill="#5f7a44"
        stroke="#3a5a2e"
        strokeWidth={0.1}
      />
      <path
        d={`M${cx - 0.6 * s} ${cy - 1.35 * s} L${cx} ${cy - 2.5 * s} L${cx + 0.6 * s} ${cy - 1.35 * s} Z`}
        fill="#6f8a50"
        stroke="#3a5a2e"
        strokeWidth={0.1}
      />
    </g>
  );
}

/** A clump of conifers. */
function Forest({ cx, cy, k }: { cx: number; cy: number; k: string }) {
  const offs: [number, number, number][] = [
    [0, 0, 1],
    [1.6, 0.5, 0.82],
    [-1.5, 0.6, 0.8],
    [0.5, 1.3, 0.68],
  ];
  return (
    <g key={k}>
      {offs.map((o, i) => (
        <Tree key={i} cx={cx + o[0]} cy={cy + o[1]} s={o[2]} />
      ))}
    </g>
  );
}

export const AtlasMotifs = memo(function AtlasMotifs() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 62"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {/* mountain ranges as clustered peaks (including the eastern wall) */}
      {RANGES.flatMap((r) => {
        const n = Math.max(2, Math.round(r.r / 2.2));
        return Array.from({ length: n }).map((_, i) => (
          <Mtn
            key={`m-${r.x}-${r.y}-${i}`}
            k={`m-${r.x}-${r.y}-${i}`}
            cx={r.x + (i - (n - 1) / 2) * 2.7}
            cy={my(r.y) + (i % 2 ? 0.8 : 0)}
            s={0.55 * r.h + 0.5}
          />
        ));
      })}
      {/* forest clumps */}
      {TREES.map((t) => (
        <Forest key={`f-${t[0]}-${t[1]}`} k={`f-${t[0]}-${t[1]}`} cx={t[0]} cy={my(t[1])} />
      ))}
    </svg>
  );
});
