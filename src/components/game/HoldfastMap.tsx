import {
  BUILDINGS,
  neighborIdx,
  maxStaff,
  type Plot,
  type TownshipState,
} from "@/lib/game/township";
import { longNightActive, type GameState } from "@/lib/game/engine";

/**
 * The Holdfast — the township as a lit, isometric town rather than a flat grid.
 * Buildings rise as shaded volumes with hip roofs, glowing windows (warm at
 * night), doors, emblems and level pips; a keep presides from behind, torches
 * pool light, embers drift, and roads bind finished neighbours into a district.
 * Empty plots read as buildable plazas. Click a pad to select it.
 *
 * The scene is drawn with a small set of pure string-builders (deterministic,
 * SSR-safe); each plot's markup is wrapped in an interactive <g> so selection
 * and construction stay live, while ambience animates via a scoped <style>.
 */

const HW = 74,
  HH = 37,
  OX = 320,
  OY = 150,
  BW = 48,
  BH = 24;

type Vis = { wall: string; roof: string; accent: string; emblem: string };
const VISUAL: Record<string, Vis> = {
  market: { wall: "#b98a3f", roof: "#9a5326", accent: "#f0c463", emblem: "coin" },
  granary: { wall: "#b59a5e", roof: "#7d6330", accent: "#e6cf86", emblem: "silo" },
  guildhall: { wall: "#9a8a63", roof: "#5f5230", accent: "#d9c290", emblem: "hammer" },
  counting_house: { wall: "#bf9c3e", roof: "#7c5c17", accent: "#f2cf5e", emblem: "coins" },
  war_shrine: { wall: "#a85a3a", roof: "#6f2a18", accent: "#ff7a44", emblem: "flame" },
  library: { wall: "#7a6aa2", roof: "#40356a", accent: "#c3b0f0", emblem: "book" },
  watchtower: { wall: "#7d8a63", roof: "#414d2c", accent: "#a9c487", emblem: "eye" },
};
const fallbackVis: Vis = { wall: "#9a8a63", roof: "#5f5230", accent: "#d9c290", emblem: "coin" };

type Pt = { x: number; y: number };

function shade(hex: string, f: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255,
    g = (n >> 8) & 255,
    b = n & 255;
  if (f >= 0) {
    r += (255 - r) * f;
    g += (255 - g) * f;
    b += (255 - b) * f;
  } else {
    r *= 1 + f;
    g *= 1 + f;
    b *= 1 + f;
  }
  const h = (v: number) =>
    Math.round(Math.max(0, Math.min(255, v)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}
function iso(col: number, row: number): Pt {
  return { x: OX + (col - row) * HW, y: OY + (col + row) * HH };
}
const pts = (arr: Pt[]) => arr.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
function facePt(front: Pt, side: Pt, u: number, H: number, v: number): Pt {
  return { x: front.x + (side.x - front.x) * u, y: front.y + (side.y - front.y) * u - H * v };
}

function groundTile(x: number, y: number, parity: boolean, empty: boolean): string {
  const T = { x, y: y - HH },
    R = { x: x + HW, y },
    B = { x, y: y + HH },
    L = { x: x - HW, y };
  const fill = parity ? "#1b140b" : "#160f08";
  let s = `<polygon points="${pts([T, R, B, L])}" fill="${fill}" stroke="#3a2c18" stroke-width="1" stroke-opacity="0.6"/>`;
  if (empty) {
    const i = 0.44;
    const t = { x, y: y - HH * i },
      r = { x: x + HW * i, y },
      b = { x, y: y + HH * i },
      l = { x: x - HW * i, y };
    s += `<polygon points="${pts([t, r, b, l])}" fill="#0f0a05" fill-opacity="0.5" stroke="#6b5330" stroke-width="1.3" stroke-dasharray="4 5" stroke-opacity="0.55"/>`;
    s += `<line x1="${x - 6}" y1="${y}" x2="${x + 6}" y2="${y}" stroke="#7a6338" stroke-width="1.3" stroke-opacity="0.7"/>`;
    s += `<line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 5}" stroke="#7a6338" stroke-width="1.3" stroke-opacity="0.7"/>`;
  }
  return s;
}

function emblem(kind: string, x: number, y: number, c: string): string {
  switch (kind) {
    case "coin":
      return `<circle cx="${x}" cy="${y}" r="6" fill="${c}"/><circle cx="${x}" cy="${y}" r="3" fill="none" stroke="#3a2a0c" stroke-width="1"/>`;
    case "coins":
      return `<ellipse cx="${x}" cy="${y + 3}" rx="6.5" ry="2.4" fill="${c}"/><ellipse cx="${x}" cy="${y}" rx="6.5" ry="2.4" fill="${shade(c, 0.15)}"/><ellipse cx="${x}" cy="${y - 3}" rx="6.5" ry="2.4" fill="${c}"/>`;
    case "silo":
      return `<rect x="${x - 6}" y="${y - 5}" width="3.2" height="11" rx="1.6" fill="${c}"/><rect x="${x - 1.6}" y="${y - 7}" width="3.2" height="13" rx="1.6" fill="${shade(c, 0.1)}"/><rect x="${x + 2.6}" y="${y - 5}" width="3.2" height="11" rx="1.6" fill="${c}"/>`;
    case "hammer":
      return `<rect x="${x - 1.3}" y="${y - 6}" width="2.6" height="12" rx="1" fill="${c}"/><rect x="${x - 6}" y="${y - 6}" width="12" height="4" rx="1.4" fill="${shade(c, 0.12)}"/>`;
    case "flame":
      return `<path d="M ${x} ${y - 8} C ${x + 7} ${y - 1}, ${x + 4} ${y + 7}, ${x} ${y + 7} C ${x - 4} ${y + 7}, ${x - 7} ${y - 1}, ${x} ${y - 8} Z" fill="${c}"/><path d="M ${x} ${y - 2} C ${x + 3} ${y + 1}, ${x + 2} ${y + 6}, ${x} ${y + 6} C ${x - 2} ${y + 6}, ${x - 3} ${y + 1}, ${x} ${y - 2} Z" fill="#ffe0a0"/>`;
    case "book":
      return `<path d="M ${x} ${y - 5} L ${x - 7} ${y - 3} L ${x - 7} ${y + 5} L ${x} ${y + 4} Z" fill="${c}"/><path d="M ${x} ${y - 5} L ${x + 7} ${y - 3} L ${x + 7} ${y + 5} L ${x} ${y + 4} Z" fill="${shade(c, 0.15)}"/><line x1="${x}" y1="${y - 5}" x2="${x}" y2="${y + 4}" stroke="#2a2140" stroke-width="1"/>`;
    case "eye":
      return `<circle cx="${x}" cy="${y}" r="6" fill="none" stroke="${c}" stroke-width="1.6"/><circle cx="${x}" cy="${y}" r="2.2" fill="${c}"/>`;
    default:
      return "";
  }
}

function buildingStr(
  x: number,
  y: number,
  type: string,
  level: number,
  workers: number,
  selected: boolean,
  night: boolean,
): string {
  const d = VISUAL[type] ?? fallbackVis;
  const tower = type === "watchtower";
  const H = (tower ? 44 : 24) + level * 10;
  const rH = tower ? 30 : 18;
  const bw = tower ? 30 : BW;
  const bh = tower ? 15 : BH;

  const B = { x, y: y + bh },
    R = { x: x + bw, y },
    L = { x: x - bw, y };
  const Rt = { x: x + bw, y: y - H },
    Lt = { x: x - bw, y: y - H },
    Bt = { x, y: y + bh - H };
  const A = { x, y: y - H - rH };

  const wallLit = shade(d.wall, 0.05),
    wallShade = shade(d.wall, -0.36);
  const roofLit = shade(d.roof, 0.14),
    roofShade = shade(d.roof, -0.28);

  let s = "";
  s += `<ellipse cx="${x + 16}" cy="${y + 7}" rx="${bw * 1.05}" ry="${bh * 0.9}" fill="#000" opacity="0.34"/>`;
  s += `<polygon points="${pts([B, L, Lt, Bt])}" fill="${wallLit}"/>`;
  s += `<polygon points="${pts([B, R, Rt, Bt])}" fill="${wallShade}"/>`;
  s += `<line x1="${B.x}" y1="${B.y}" x2="${Bt.x}" y2="${Bt.y}" stroke="${shade(d.wall, 0.2)}" stroke-width="1" stroke-opacity="0.5"/>`;

  const winFill = night ? "#ffcf7a" : shade(d.wall, -0.55);
  const rows = Math.min(3, Math.max(1, level - 1));
  const putWin = (front: Pt, side: Pt) => {
    for (let ui = 0; ui < 2; ui++) {
      const u = 0.32 + ui * 0.36;
      for (let vi = 0; vi < rows; vi++) {
        const v = 0.32 + vi * (0.44 / rows);
        const c = facePt(front, side, u, H, v);
        if (night)
          s += `<circle class="hf-win" cx="${c.x}" cy="${c.y}" r="4.5" fill="#ffb04a" opacity="0.45"/>`;
        s += `<rect x="${c.x - 1.6}" y="${c.y - 2.2}" width="3.2" height="4.4" rx="0.6" fill="${winFill}" opacity="${night ? 0.95 : 0.6}"/>`;
      }
    }
  };
  putWin(B, L);
  putWin(B, R);
  const dr = facePt(B, L, 0.5, H, 0.12);
  s += `<path d="M ${dr.x - 3} ${dr.y + 5} L ${dr.x - 3} ${dr.y - 3} Q ${dr.x} ${dr.y - 7} ${dr.x + 3} ${dr.y - 3} L ${dr.x + 3} ${dr.y + 5} Z" fill="${shade(d.wall, -0.62)}"/>`;

  s += `<polyline points="${pts([Lt, Bt, Rt])}" fill="none" stroke="${d.accent}" stroke-width="1.6" stroke-opacity="0.5"/>`;
  s += `<polygon points="${pts([A, Lt, Bt])}" fill="${roofLit}"/>`;
  s += `<polygon points="${pts([A, Rt, Bt])}" fill="${roofShade}"/>`;
  s += `<line x1="${A.x}" y1="${A.y}" x2="${Bt.x}" y2="${Bt.y}" stroke="${shade(d.roof, 0.28)}" stroke-width="1" stroke-opacity="0.6"/>`;
  s += `<circle class="hf-gem" cx="${A.x}" cy="${A.y}" r="7" fill="${d.accent}" opacity="0.22"/><circle cx="${A.x}" cy="${A.y}" r="2.6" fill="${d.accent}"/>`;

  const ep = facePt(B, L, 0.5, H, 0.66);
  s += `<circle cx="${ep.x}" cy="${ep.y}" r="9" fill="#0d0a06" opacity="0.55"/>`;
  s += emblem(d.emblem, ep.x, ep.y, d.accent);

  for (let k = 0; k < level; k++)
    s += `<circle cx="${x - (level - 1) * 4 + k * 8}" cy="${y + bh + 6}" r="2" fill="${d.accent}"/>`;
  const staff = Math.min(workers, maxStaff({ level } as Plot));
  for (let k = 0; k < staff; k++)
    s += `<circle cx="${x - (staff - 1) * 3.5 + k * 7}" cy="${y + bh + 12}" r="1.8" fill="#9cc487"/>`;

  if (selected) {
    const T = { x, y: y - HH },
      Rg = { x: x + HW, y },
      Bg = { x, y: y + HH },
      Lg = { x: x - HW, y };
    const ring = `<polygon class="hf-sel" points="${pts([T, Rg, Bg, Lg])}" fill="none" stroke="#f2d488" stroke-width="2.5"/>`;
    return `${ring}<g transform="translate(0,-7)" filter="url(#hf-lift)">${s}</g>`;
  }
  return s;
}

function constructingStr(x: number, y: number, pct: number): string {
  const bw = BW,
    bh = BH,
    H = 22;
  const B = { x, y: y + bh },
    R = { x: x + bw, y },
    L = { x: x - bw, y };
  const Rt = { x: x + bw, y: y - H },
    Lt = { x: x - bw, y: y - H },
    Bt = { x, y: y + bh - H };
  let s = `<ellipse cx="${x + 16}" cy="${y + 7}" rx="${bw * 1.05}" ry="${bh * 0.9}" fill="#000" opacity="0.3"/>`;
  s += `<polygon points="${pts([B, L, Lt, Bt])}" fill="#2c2013"/>`;
  s += `<polygon points="${pts([B, R, Rt, Bt])}" fill="#1c150b"/>`;
  s += `<line x1="${L.x}" y1="${L.y}" x2="${Lt.x}" y2="${Lt.y - 12}" stroke="#7a6338" stroke-width="1.5"/>`;
  s += `<line x1="${R.x}" y1="${R.y}" x2="${Rt.x}" y2="${Rt.y - 12}" stroke="#7a6338" stroke-width="1.5"/>`;
  s += `<line x1="${B.x}" y1="${B.y - 4}" x2="${Bt.x}" y2="${Bt.y - 16}" stroke="#7a6338" stroke-width="1.5"/>`;
  s += `<line x1="${Lt.x}" y1="${Lt.y - 8}" x2="${Rt.x}" y2="${Rt.y - 8}" stroke="#8a7038" stroke-width="1.4"/>`;
  s += `<circle class="hf-spark" cx="${x - 5}" cy="${y - H + 4}" r="1.5" fill="#ffb055"/><circle class="hf-spark" cx="${x + 9}" cy="${y - H - 1}" r="1.2" fill="#ffd08a"/>`;
  const gy = y + bh + 9;
  s += `<rect x="${x - 32}" y="${gy}" width="64" height="5" rx="2.5" fill="#000" opacity="0.6"/>`;
  s += `<rect x="${x - 32}" y="${gy}" width="${64 * pct}" height="5" rx="2.5" fill="#ff7a2c"/>`;
  return s;
}

function keepStr(x: number, y: number): string {
  const bw = 44,
    bh = 22,
    H = 78,
    rH = 26;
  const B = { x, y: y + bh },
    R = { x: x + bw, y },
    L = { x: x - bw, y };
  const Rt = { x: x + bw, y: y - H },
    Lt = { x: x - bw, y: y - H },
    Bt = { x, y: y + bh - H };
  const A = { x, y: y - H - rH };
  let s = `<polygon points="${pts([B, L, Lt, Bt])}" fill="#4a3f2c"/>`;
  s += `<polygon points="${pts([B, R, Rt, Bt])}" fill="#281f13"/>`;
  for (let vi = 0; vi < 3; vi++) {
    const c = facePt(B, L, 0.5, H, 0.3 + vi * 0.2);
    s += `<circle cx="${c.x}" cy="${c.y}" r="5" fill="#ffb04a" opacity="0.4"/><rect x="${c.x - 2}" y="${c.y - 3}" width="4" height="6" rx="1" fill="#ffcf7a"/>`;
  }
  for (let k = 0; k <= 5; k++) {
    const cl = facePt(Lt, Bt, k / 5, 0, 0),
      cr = facePt(Bt, Rt, k / 5, 0, 0);
    s += `<rect x="${cl.x - 3}" y="${cl.y - 9}" width="5" height="9" fill="#3a3020"/>`;
    s += `<rect x="${cr.x - 2}" y="${cr.y - 9}" width="5" height="9" fill="#241b10"/>`;
  }
  s += `<polygon points="${pts([A, Lt, Bt])}" fill="#6a3420"/>`;
  s += `<polygon points="${pts([A, Rt, Bt])}" fill="#3c1e12"/>`;
  s += `<line x1="${A.x}" y1="${A.y}" x2="${A.x}" y2="${A.y - 26}" stroke="#6b5330" stroke-width="2"/>`;
  s += `<path class="hf-banner" d="M ${A.x} ${A.y - 26} L ${A.x + 20} ${A.y - 21} L ${A.x} ${A.y - 14} Z" fill="#9a2f24"/>`;
  return s;
}

const rc = (i: number) => ({ c: i % 3, r: Math.floor(i / 3) });
const isBuilt = (p: Plot | undefined) => !!p && !!p.type && p.level >= 1;

export function HoldfastMap({
  state,
  town,
  now,
  selected,
  onSelect,
}: {
  state: GameState;
  town: TownshipState;
  now: number;
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  const plots = town.plots;
  const night = longNightActive(state, now);

  // far-to-near paint order
  const order = plots
    .map((_, i) => i)
    .sort((a, b) => {
      const A = rc(a),
        Bx = rc(b);
      return A.c + A.r - (Bx.c + Bx.r);
    });

  // roads between finished orthogonal neighbours
  let roads = "";
  plots.forEach((p, i) => {
    if (!isBuilt(p)) return;
    for (const n of neighborIdx(i, plots.length)) {
      if (n <= i || !isBuilt(plots[n])) continue;
      const a = iso(rc(i).c, rc(i).r),
        b = iso(rc(n).c, rc(n).r);
      roads += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#caa15a" stroke-width="8" stroke-linecap="round" opacity="0.2"/>`;
    }
  });

  // static ground layer (all tiles, painter order)
  let ground = "";
  order.forEach((i) => {
    const { c, r } = rc(i);
    const { x, y } = iso(c, r);
    ground += groundTile(x, y, (c + r) % 2 === 0, !isBuilt(plots[i]) && !plots[i]?.constructing);
  });

  const torch = (tx: number, ty: number) =>
    `<circle cx="${tx}" cy="${ty}" r="60" fill="url(#hf-torch)"/><rect x="${tx - 1.5}" y="${ty - 4}" width="3" height="16" fill="#5a4526"/><circle class="hf-flame" cx="${tx}" cy="${ty - 7}" r="4" fill="#ffce6e"/><circle class="hf-flame" cx="${tx}" cy="${ty - 7}" r="8" fill="#ff9a3c" opacity="0.55"/>`;
  const kp = { x: 320, y: 148 };

  return (
    <svg
      viewBox="0 28 640 366"
      className="block h-auto w-full select-none"
      role="group"
      aria-label="The holdfast — your township"
    >
      <defs>
        <radialGradient id="hf-sky" cx="50%" cy="28%" r="85%">
          <stop offset="0%" stopColor={night ? "#20203c" : "#2a1e12"} />
          <stop offset="55%" stopColor={night ? "#0e0c1c" : "#160e08"} />
          <stop offset="100%" stopColor="#070505" />
        </radialGradient>
        <radialGradient id="hf-torch" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb04a" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#ffb04a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hf-plaza" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#ffcf8a" stopOpacity={night ? 0.05 : 0.09} />
          <stop offset="100%" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="hf-vig" cx="50%" cy="44%" r="70%">
          <stop offset="62%" stopColor="#000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.62" />
        </radialGradient>
        <filter id="hf-lift" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="5" stdDeviation="7" floodColor="#f2d488" floodOpacity="0.55" />
        </filter>
        <style>{HF_STYLE}</style>
      </defs>

      <rect x="0" y="28" width="640" height="366" fill="url(#hf-sky)" />
      <ellipse cx="320" cy="248" rx="250" ry="140" fill="url(#hf-plaza)" />
      <g dangerouslySetInnerHTML={{ __html: keepStr(kp.x, kp.y) }} />
      <g dangerouslySetInnerHTML={{ __html: torch(226, 268) + torch(414, 268) }} />
      {roads && <g dangerouslySetInnerHTML={{ __html: roads }} />}
      <g dangerouslySetInnerHTML={{ __html: ground }} />

      {/* drifting embers */}
      <g className="hf-embers" aria-hidden="true">
        {EMBERS.map((e, k) => (
          <circle
            key={k}
            className="hf-ember"
            cx={e.x}
            cy={e.y}
            r={e.r}
            fill="#ff9a3c"
            style={{ animationDelay: `${e.d}s`, animationDuration: `${e.dur}s` }}
          />
        ))}
      </g>

      {/* interactive plots, painter order */}
      {order.map((i) => {
        const p = plots[i];
        if (!p) return null;
        const { c, r } = rc(i);
        const { x, y } = iso(c, r);
        let inner = "";
        if (isBuilt(p)) {
          inner = buildingStr(x, y, p.type!, p.level, p.workers ?? 0, selected === p.id, night);
        } else if (p.constructing) {
          const { startedAt, until } = p.constructing;
          const pct = Math.max(0, Math.min(1, (now - startedAt) / Math.max(1, until - startedAt)));
          inner = constructingStr(x, y, pct);
        }
        const hit = pts([
          { x, y: y - HH },
          { x: x + HW, y },
          { x, y: y + HH },
          { x: x - HW, y },
        ]);
        const label = isBuilt(p) ? `${BUILDINGS[p.type!].name}, level ${p.level}` : "empty plot";
        return (
          <g
            key={p.id}
            className="hf-plot cursor-pointer"
            role="button"
            aria-label={label}
            onClick={() => onSelect(p.id)}
          >
            {inner && <g dangerouslySetInnerHTML={{ __html: inner }} />}
            <polygon points={hit} fill="transparent" />
          </g>
        );
      })}

      <rect x="0" y="28" width="640" height="366" fill="url(#hf-vig)" pointerEvents="none" />
    </svg>
  );
}

const EMBERS = [
  { x: 232, y: 300, r: 1.4, d: 0, dur: 7 },
  { x: 300, y: 320, r: 1.1, d: 1.6, dur: 8.5 },
  { x: 360, y: 300, r: 1.6, d: 3.1, dur: 6.5 },
  { x: 410, y: 320, r: 1.2, d: 4.4, dur: 9 },
  { x: 270, y: 330, r: 1, d: 2.2, dur: 7.5 },
  { x: 340, y: 340, r: 1.3, d: 5.2, dur: 8 },
];

const HF_STYLE = `
.hf-plot > g:first-child { transition: transform .18s ease, filter .18s ease; }
@media (prefers-reduced-motion: no-preference) {
  .hf-plot:hover > g:first-child { transform: translateY(-4px); filter: brightness(1.12); }
  .hf-flame { animation: hf-flicker 1.6s ease-in-out infinite; transform-origin: center; }
  .hf-gem { animation: hf-pulse 2.8s ease-in-out infinite; }
  .hf-sel { animation: hf-selpulse 1.8s ease-in-out infinite; }
  .hf-win { animation: hf-flicker 3.4s ease-in-out infinite; }
  .hf-spark { animation: hf-spark 1.1s ease-in-out infinite; }
  .hf-banner { animation: hf-sway 4s ease-in-out infinite; transform-origin: left center; }
  .hf-ember { animation-name: hf-rise; animation-timing-function: ease-in; animation-iteration-count: infinite; }
}
@keyframes hf-flicker { 0%,100% { opacity: .55; } 45% { opacity: .95; } 70% { opacity: .7; } }
@keyframes hf-pulse { 0%,100% { opacity: .18; } 50% { opacity: .4; } }
@keyframes hf-selpulse { 0%,100% { stroke-opacity: .55; } 50% { stroke-opacity: 1; } }
@keyframes hf-spark { 0% { opacity: 1; } 100% { opacity: 0; } }
@keyframes hf-sway { 0%,100% { transform: skewY(0deg); } 50% { transform: skewY(-6deg); } }
@keyframes hf-rise { 0% { opacity: 0; transform: translateY(0); } 15% { opacity: .8; } 100% { opacity: 0; transform: translateY(-70px); } }
.hf-sel { stroke-opacity: .9; }
`;
