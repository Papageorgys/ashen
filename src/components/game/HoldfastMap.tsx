import { cn } from "@/lib/utils";
import {
  BUILDINGS,
  neighborIdx,
  maxStaff,
  type Plot,
  type TownshipState,
} from "@/lib/game/township";

/**
 * The Holdfast — the township drawn as a walled town rather than a bare grid.
 * The nine plots sit as pads inside a palisade, a keep brooding at the back and
 * a gate at the front. Roads thread between finished neighbours so a district
 * reads at a glance; a plot under construction shows a burning progress bar.
 * Click a pad to select it (the panel's actions act on the selection).
 */

const VW = 340;
const VH = 320;
const COLS = 3;
// pad centres — a courtyard grid inside the walls
const CX = [80, 170, 260];
const CY = [116, 186, 256];
const PAD_W = 78;
const PAD_H = 60;

function center(i: number): { x: number; y: number } {
  return { x: CX[i % COLS] ?? 170, y: CY[Math.floor(i / COLS)] ?? 186 };
}

export function HoldfastMap({
  town,
  now,
  selected,
  onSelect,
}: {
  town: TownshipState;
  now: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const plots = town.plots;
  const isBuilt = (p: Plot | undefined) => !!p && !!p.type && p.level >= 1;

  // roads: one segment per orthogonal pair of finished neighbours (dedup by i<n)
  const roads: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  plots.forEach((p, i) => {
    if (!isBuilt(p)) return;
    for (const n of neighborIdx(i, plots.length)) {
      if (n <= i) continue;
      if (!isBuilt(plots[n])) continue;
      const a = center(i);
      const b = center(n);
      roads.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  });

  return (
    <svg
      viewBox={`0 0 ${VW} ${VH}`}
      className="stage-scroll block h-auto w-full select-none"
      role="group"
      aria-label="The holdfast — your township"
    >
      <defs>
        <radialGradient id="hf-ground" cx="50%" cy="38%" r="75%">
          <stop offset="0%" stopColor="#241a10" />
          <stop offset="100%" stopColor="#0c0906" />
        </radialGradient>
        <linearGradient id="hf-pad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c150d" />
          <stop offset="100%" stopColor="#0f0b06" />
        </linearGradient>
        <linearGradient id="hf-pad-lit" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#31240f" />
          <stop offset="100%" stopColor="#160f07" />
        </linearGradient>
      </defs>

      {/* the ground within the walls */}
      <rect x="0" y="0" width={VW} height={VH} fill="url(#hf-ground)" rx="8" />

      {/* palisade wall + corner towers + gate */}
      <rect
        x="14"
        y="14"
        width={VW - 28}
        height={VH - 28}
        rx="10"
        fill="none"
        stroke="#5a4526"
        strokeWidth="4"
        opacity="0.7"
      />
      {[
        [14, 14],
        [VW - 14, 14],
        [14, VH - 14],
        [VW - 14, VH - 14],
      ].map(([x, y], k) => (
        <rect
          key={k}
          x={(x ?? 0) - 9}
          y={(y ?? 0) - 9}
          width="18"
          height="18"
          rx="3"
          fill="#1a130b"
          stroke="#6b5330"
          strokeWidth="2"
        />
      ))}
      {/* gate at the front */}
      <rect
        x={VW / 2 - 22}
        y={VH - 20}
        width="44"
        height="12"
        rx="2"
        fill="#0c0906"
        stroke="#6b5330"
        strokeWidth="2"
      />
      <text x={VW / 2} y={VH - 24} textAnchor="middle" className="fill-[#7a6338]" fontSize="9">
        ⚑ gate ⚑
      </text>

      {/* the keep, brooding behind the courtyard */}
      <g opacity="0.9">
        <text x={VW / 2} y="44" textAnchor="middle" fontSize="30" aria-hidden="true">
          🏰
        </text>
        <text x={VW / 2} y="62" textAnchor="middle" className="fill-[#8a7040]" fontSize="8">
          YOUR SEAT
        </text>
      </g>

      {/* roads binding a district together */}
      {roads.map((r, k) => (
        <line
          key={k}
          x1={r.x1}
          y1={r.y1}
          x2={r.x2}
          y2={r.y2}
          stroke="#7ea86a"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.35"
        />
      ))}

      {/* the plots */}
      {plots.map((p, i) => (
        <HoldfastPlot
          key={p.id}
          plot={p}
          pos={center(i)}
          now={now}
          selected={selected === p.id}
          onSelect={() => onSelect(p.id)}
        />
      ))}
    </svg>
  );
}

function HoldfastPlot({
  plot,
  pos,
  now,
  selected,
  onSelect,
}: {
  plot: Plot;
  pos: { x: number; y: number };
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const def = plot.type ? BUILDINGS[plot.type] : null;
  const built = !!def && plot.level >= 1;
  const con = plot.constructing;
  const total = con ? Math.max(1, con.until - con.startedAt) : 1;
  const pct = con ? Math.max(0, Math.min(1, (now - con.startedAt) / total)) : 0;
  const x = pos.x - PAD_W / 2;
  const y = pos.y - PAD_H / 2;
  const staff = plot.workers ?? 0;

  return (
    <g
      className="cursor-pointer"
      onClick={onSelect}
      role="button"
      aria-label={def ? `${def.name}, level ${plot.level}` : "empty plot"}
    >
      <rect
        x={x}
        y={y}
        width={PAD_W}
        height={PAD_H}
        rx="6"
        fill={built ? "url(#hf-pad-lit)" : "url(#hf-pad)"}
        stroke={selected ? "#e8c874" : built ? "#6b5330" : "#3a2e1c"}
        strokeWidth={selected ? "2.5" : "1.5"}
        className={cn("transition", selected && "drop-shadow-[0_0_6px_rgba(232,200,116,0.5)]")}
      />
      {built ? (
        <>
          <text x={pos.x} y={pos.y - 4} textAnchor="middle" fontSize="22" aria-hidden="true">
            {def.glyph}
          </text>
          <text
            x={pos.x}
            y={pos.y + 15}
            textAnchor="middle"
            className="fill-[#e7d7ac]"
            fontSize="8.5"
          >
            {def.name}
          </text>
          <text x={x + 7} y={y + 13} className="fill-gold" fontSize="8.5">
            Lv{plot.level}
          </text>
          {/* worker pips along the base */}
          {staff > 0 &&
            Array.from({ length: Math.min(staff, maxStaff(plot)) }).map((_, k) => (
              <circle
                key={k}
                cx={x + PAD_W - 9 - k * 7}
                cy={y + PAD_H - 8}
                r="2.5"
                className="fill-[#9cc487]"
              />
            ))}
        </>
      ) : con ? (
        <text x={pos.x} y={pos.y + 4} textAnchor="middle" fontSize="18" aria-hidden="true">
          🚧
        </text>
      ) : (
        <text
          x={pos.x}
          y={pos.y + 3}
          textAnchor="middle"
          className="fill-muted-foreground"
          fontSize="9"
        >
          empty
        </text>
      )}
      {/* construction progress — a burning bar across the pad's foot */}
      {con && (
        <>
          <rect
            x={x + 6}
            y={y + PAD_H - 6}
            width={PAD_W - 12}
            height="3"
            rx="1.5"
            fill="#000"
            opacity="0.5"
          />
          <rect
            x={x + 6}
            y={y + PAD_H - 6}
            width={(PAD_W - 12) * pct}
            height="3"
            rx="1.5"
            className="fill-forge-ember motion-safe:transition-[width]"
          />
        </>
      )}
    </g>
  );
}
