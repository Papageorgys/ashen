import { memo } from "react";
import { FALLEN_CAPITALS } from "@/lib/game/realms";

/**
 * The seven fallen capitals — decorative points of interest on the War Table map.
 * Each is drawn as a broad ruined keep with a torn banner, under a faint realm name
 * and a captioned capital name. Purely lore/atmosphere (pointer-events-none), laid
 * over the terrain and below the interactive zone/banner overlay. Map space 100x62.
 */

const my = (y: number) => y * 0.62;

/** A broad ruined keep with a torn banner. */
function CapitalRuin({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g stroke="#4a2a1a" strokeWidth={0.16} strokeLinejoin="round" fill="#c7ad82">
      <path
        d={`M${cx - 2.3} ${cy} L${cx - 2.3} ${cy - 2.7} L${cx - 1.9} ${cy - 2.3} L${cx - 1.5} ${cy - 3.0} L${cx - 1.1} ${cy - 2.4} L${cx - 1.1} ${cy} Z`}
      />
      <path
        d={`M${cx + 0.5} ${cy} L${cx + 0.5} ${cy - 3.3} L${cx + 1.0} ${cy - 2.8} L${cx + 1.4} ${cy - 3.7} L${cx + 1.8} ${cy - 2.9} L${cx + 2.3} ${cy - 3.2} L${cx + 2.3} ${cy} Z`}
      />
      <path
        d={`M${cx - 1.1} ${cy} L${cx - 1.1} ${cy - 1.5} L${cx - 0.5} ${cy - 1.2} L${cx - 0.1} ${cy - 1.6} L${cx + 0.5} ${cy - 1.3} L${cx + 0.5} ${cy} Z`}
      />
      <line x1={cx - 2.7} y1={cy} x2={cx + 2.7} y2={cy} stroke="#4a2a1a" strokeWidth={0.2} />
      <line
        x1={cx + 1.4}
        y1={cy - 3.7}
        x2={cx + 2.3}
        y2={cy - 5.6}
        stroke="#4a2a1a"
        strokeWidth={0.18}
      />
      <path
        d={`M${cx + 2.3} ${cy - 5.6} l 1.5 0.3 l -0.5 0.6 l 0.5 0.5 l -1.7 0.2 z`}
        fill="#8a2f22"
        stroke="#5a1e12"
        strokeWidth={0.12}
      />
    </g>
  );
}

export const AtlasCapitals = memo(function AtlasCapitals() {
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 62"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      {FALLEN_CAPITALS.map((r) => {
        const cx = r.x;
        const cy = my(r.y);
        return (
          <g key={r.id}>
            <text
              x={cx}
              y={cy - 4.8}
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize={2.9}
              fill={`rgb(${r.color[0]},${r.color[1]},${r.color[2]})`}
              opacity={0.4}
              letterSpacing={0.4}
              fontWeight={700}
            >
              {r.race.toUpperCase()}
            </text>
            <CapitalRuin cx={cx} cy={cy} />
            <text
              x={cx}
              y={cy + 3.1}
              textAnchor="middle"
              fontFamily="Georgia, serif"
              fontSize={2.0}
              fill="#5c1f13"
              fontWeight={600}
              paintOrder="stroke"
              stroke="#efe0c2"
              strokeWidth={0.55}
            >
              {r.capital} †
            </text>
          </g>
        );
      })}
    </svg>
  );
});
