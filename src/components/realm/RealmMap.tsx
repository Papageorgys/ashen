import { useMemo, useRef, useState } from "react";
import { TERRAIN } from "@/lib/realm/terrain";
import { makeRng } from "@/lib/realm/rng";
import { armyPos, troopCount, type Army } from "@/lib/realm/army";
import type { Point, Province, Settlement, World } from "@/lib/realm/types";
import { AtlasAtmosphere } from "@/components/game/AtlasAtmosphere";

/**
 * RealmMap — the world IS the game. An illustrated, zoomable region: permanent
 * geography (terrain, rivers, coasts) drawn as one continuous land, with the
 * mutable political-control layer (owner tints + kingdom borders) laid over it.
 * Pan and zoom to move between strategic scales; click a province to select it.
 *
 * Pure/deterministic draw (SSR-safe): terrain motifs are seeded from province
 * ids, so the map renders identically on server and client.
 */

const smooth = (pts: Point[]): string => {
  if (pts.length < 2) return "";
  let d = `M ${pts[0]!.x.toFixed(1)} ${pts[0]!.y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const m = { x: (pts[i]!.x + pts[i + 1]!.x) / 2, y: (pts[i]!.y + pts[i + 1]!.y) / 2 };
    d += ` Q ${pts[i]!.x.toFixed(1)} ${pts[i]!.y.toFixed(1)} ${m.x.toFixed(1)} ${m.y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1]!;
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
};

const polyD = (poly: Point[]) =>
  `M ${poly.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ")} Z`;

/** deterministic terrain decoration inside a province */
function motifs(p: Province): string {
  if (!TERRAIN[p.terrain].land) return "";
  const r = makeRng((p.col + 1) * 73856093 + (p.row + 1) * 19349663);
  const cx = p.center.x;
  const cy = p.center.y;
  const spots = Array.from({ length: 5 }, () => ({
    x: cx + (r() - 0.5) * 74,
    y: cy + (r() - 0.5) * 52,
  }));
  let s = "";
  const t = p.terrain;
  if (t === "mountains" || t === "hills") {
    const h = t === "mountains" ? 15 : 9;
    for (const q of spots.slice(0, t === "mountains" ? 4 : 3)) {
      s += `<path d="M ${q.x - h} ${q.y + h * 0.6} L ${q.x} ${q.y - h} L ${q.x + h} ${q.y + h * 0.6} Z" fill="#2c261d" fill-opacity="0.5"/>`;
      s += `<path d="M ${q.x} ${q.y - h} L ${q.x + h} ${q.y + h * 0.6} L ${q.x + h * 0.35} ${q.y + h * 0.6} Z" fill="#000" fill-opacity="0.22"/>`;
      if (t === "mountains")
        s += `<path d="M ${q.x - 3.5} ${q.y - 2.5} L ${q.x} ${q.y - h} L ${q.x + 3.5} ${q.y - 2.5} Z" fill="#e8e2d4" fill-opacity="0.7"/>`;
    }
  } else if (t === "forest") {
    for (const q of spots) {
      s += `<path d="M ${q.x} ${q.y - 8} L ${q.x + 5} ${q.y + 4} L ${q.x - 5} ${q.y + 4} Z" fill="#233a1e" fill-opacity="0.6"/>`;
      s += `<rect x="${q.x - 1}" y="${q.y + 3}" width="2" height="3" fill="#3a2a18" fill-opacity="0.6"/>`;
    }
  } else if (t === "swamp") {
    for (const q of spots) {
      s += `<path d="M ${q.x} ${q.y + 5} Q ${q.x - 2} ${q.y - 3} ${q.x - 3} ${q.y - 6} M ${q.x} ${q.y + 5} Q ${q.x + 2} ${q.y - 3} ${q.x + 3} ${q.y - 6}" stroke="#2c3324" stroke-width="1.2" fill="none" stroke-opacity="0.6"/>`;
    }
  } else if (t === "desert") {
    for (const q of spots.slice(0, 3)) {
      s += `<path d="M ${q.x - 10} ${q.y} Q ${q.x} ${q.y - 5} ${q.x + 10} ${q.y}" stroke="#8a763f" stroke-width="1.3" fill="none" stroke-opacity="0.6"/>`;
    }
  } else if (t === "farmland") {
    for (let i = 0; i < 3; i++)
      s += `<line x1="${cx - 18 + i * 6}" y1="${cy - 10}" x2="${cx - 22 + i * 6}" y2="${cy + 10}" stroke="#7a6320" stroke-width="1" stroke-opacity="0.4"/>`;
  } else if (t === "plains" || t === "coast") {
    for (const q of spots.slice(0, 2))
      s += `<path d="M ${q.x - 6} ${q.y} q 3 -3 6 0 q 3 -3 6 0" stroke="#6f6a34" stroke-width="1" fill="none" stroke-opacity="0.4"/>`;
  }
  return s;
}

function settlementMark(s: Settlement, color: string, showLabel: boolean): string {
  const { x, y } = s.pos;
  const owned = color !== "#8a8374";
  let m = `<ellipse cx="${x}" cy="${y + 4}" rx="10" ry="4" fill="#000" opacity="0.3"/>`;
  const banner = (bx: number, by: number) =>
    `<line x1="${bx}" y1="${by}" x2="${bx}" y2="${by - 13}" stroke="#3a2c18" stroke-width="1.4"/><path d="M ${bx} ${by - 13} L ${bx + 9} ${by - 10.5} L ${bx} ${by - 8} Z" fill="${color}"/>`;
  switch (s.tier) {
    case "fortress":
    case "castle": {
      const w = s.tier === "fortress" ? 9 : 7;
      m += `<rect x="${x - w}" y="${y - 6}" width="${w * 2}" height="12" fill="#5b5346"/><rect x="${x - w}" y="${y - 6}" width="${w * 2}" height="12" fill="none" stroke="#2a251d" stroke-width="1"/>`;
      for (let i = 0; i <= 3; i++)
        m += `<rect x="${x - w + i * ((w * 2) / 3) - 1.5}" y="${y - 9}" width="3" height="3.5" fill="#5b5346"/>`;
      m += `<rect x="${x - 2.2}" y="${y - 3}" width="4.4" height="6" fill="#241f18"/>`;
      m += banner(x + w - 1, y - 6);
      break;
    }
    case "port":
      m += `<path d="M ${x - 6} ${y + 3} L ${x - 5} ${y - 5} L ${x + 5} ${y - 5} L ${x + 6} ${y + 3} Z" fill="#6a5a44"/><path d="M ${x - 8} ${y + 3} h 16" stroke="#4a3f2c" stroke-width="2"/><circle cx="${x}" cy="${y - 2}" r="2" fill="none" stroke="#d8c48a" stroke-width="1.2"/>`;
      break;
    case "city":
    case "town": {
      const big = s.tier === "city";
      m += `<path d="M ${x - 8} ${y + 4} L ${x - 8} ${y - 3} L ${x - 3} ${y - 7} L ${x + 2} ${y - 3} L ${x + 2} ${y + 4} Z" fill="#6a5f4c"/>`;
      m += `<path d="M ${x + 1} ${y + 4} L ${x + 1} ${y - 5} L ${x + 5} ${y - 8} L ${x + 9} ${y - 5} L ${x + 9} ${y + 4} Z" fill="#5a5042"/>`;
      if (big) m += banner(x + 5, y - 8);
      break;
    }
    default: // village
      m += `<path d="M ${x - 5} ${y + 3} L ${x - 5} ${y - 2} L ${x} ${y - 6} L ${x + 5} ${y - 2} L ${x + 5} ${y + 3} Z" fill="#5f5240"/><rect x="${x - 1.4}" y="${y - 1}" width="2.8" height="4" fill="#2a2118"/>`;
  }
  if (owned)
    m += `<circle cx="${x}" cy="${y}" r="15" fill="none" stroke="${color}" stroke-width="1" stroke-opacity="0.25"/>`;
  if (showLabel)
    m += `<text x="${x}" y="${y + 18}" text-anchor="middle" font-family="Cinzel, Georgia, serif" font-size="9" fill="#e7d7ac" fill-opacity="0.85" style="paint-order:stroke;stroke:#0c0a06;stroke-width:2.5px">${s.name}</text>`;
  return m;
}

export function RealmMap({
  world,
  selectedId,
  onSelect,
  armies = [],
  selectedArmyId = null,
  onSelectArmy,
  fog,
  className,
}: {
  world: World;
  selectedId: string | null;
  onSelect: (id: string) => void;
  armies?: Army[];
  selectedArmyId?: string | null;
  onSelectArmy?: (id: string) => void;
  fog?: {
    visible: Set<string>;
    seen: Set<string>;
    lastOwner: Record<string, string | null>;
    spied: Set<string>;
  };
  className?: string;
}) {
  const { width, height } = world;
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const drag = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const moved = useRef(false);
  const kingdomColor = useMemo(
    () => new Map(world.kingdoms.map((k) => [k.id, k.color])),
    [world.kingdoms],
  );
  const provById = useMemo(() => new Map(world.provinces.map((p) => [p.id, p])), [world.provinces]);

  // what the player perceives owns a province: the truth where they can see,
  // last-known where they've been, unknown (undefined) where fog still lies
  const perceivedOwner = (id: string): string | null | undefined => {
    const p = provById.get(id);
    if (!p) return undefined;
    if (!fog) return p.ownerId;
    if (fog.visible.has(id)) return p.ownerId;
    if (fog.seen.has(id)) return fog.lastOwner[id] ?? null;
    return undefined;
  };

  // static geography — depends only on the world, so it survives every tick
  const geo = useMemo(() => {
    let terrainFill = "";
    let motifLayer = "";
    let coast = "";
    let internal = "";
    for (const p of world.provinces.filter((x) => TERRAIN[x.terrain].land)) {
      terrainFill += `<path d="${polyD(p.polygon)}" fill="${TERRAIN[p.terrain].fill}"/>`;
      motifLayer += motifs(p);
    }
    const done = new Set<string>();
    for (const p of world.provinces) {
      for (const nid of p.neighbors) {
        const key = [p.id, nid].sort().join("|");
        if (done.has(key)) continue;
        done.add(key);
        const n = provById.get(nid)!;
        const shared = p.polygon.filter((v) => n.polygon.includes(v));
        if (shared.length < 2) continue;
        const seg = `M ${shared[0]!.x.toFixed(1)} ${shared[0]!.y.toFixed(1)} L ${shared[1]!.x.toFixed(1)} ${shared[1]!.y.toFixed(1)}`;
        const pLand = TERRAIN[p.terrain].land;
        const nLand = TERRAIN[n.terrain].land;
        if (pLand !== nLand) coast += `<path d="${seg}"/>`;
        else if (pLand) internal += `<path d="${seg}"/>`;
      }
    }
    const rivers = world.rivers.map((rv) => `<path d="${smooth(rv.path)}"/>`).join("");
    const roads = world.roads.map((rd) => `<path d="${smooth(rd.path)}"/>`).join("");
    const bridges = world.bridges
      .map(
        (b) =>
          `<rect x="${b.pos.x - 4}" y="${b.pos.y - 2.5}" width="8" height="5" rx="1" fill="#7a6338" stroke="#2a2015" stroke-width="0.8"/>`,
      )
      .join("");
    return { terrainFill, motifLayer, coast, internal, rivers, roads, bridges };
  }, [world, provById]);

  // political control + fog — recomputed as visibility changes
  const political = useMemo(() => {
    let tint = "";
    let realmBorder = "";
    let fogLayer = "";
    for (const p of world.provinces) {
      if (!TERRAIN[p.terrain].land) continue;
      const owner = perceivedOwner(p.id);
      if (owner) {
        const c = kingdomColor.get(owner) ?? "#8a8374";
        tint += `<path d="${polyD(p.polygon)}" fill="${c}" fill-opacity="0.16"/>`;
      }
      if (fog) {
        if (!fog.visible.has(p.id) && !fog.seen.has(p.id))
          fogLayer += `<path d="${polyD(p.polygon)}" fill="#05060a" fill-opacity="0.62"/>`;
        else if (!fog.visible.has(p.id))
          fogLayer += `<path d="${polyD(p.polygon)}" fill="#0a0c14" fill-opacity="0.3"/>`;
      }
    }
    const done = new Set<string>();
    for (const p of world.provinces) {
      const po = perceivedOwner(p.id);
      for (const nid of p.neighbors) {
        const key = [p.id, nid].sort().join("|");
        if (done.has(key)) continue;
        done.add(key);
        const n = provById.get(nid)!;
        if (!TERRAIN[p.terrain].land || !TERRAIN[n.terrain].land) continue;
        const no = perceivedOwner(nid);
        // a realm border is only drawn where the player can perceive both sides
        if (po === undefined || no === undefined || po === no || (!po && !no)) continue;
        const shared = p.polygon.filter((v) => n.polygon.includes(v));
        if (shared.length < 2) continue;
        const seg = `M ${shared[0]!.x.toFixed(1)} ${shared[0]!.y.toFixed(1)} L ${shared[1]!.x.toFixed(1)} ${shared[1]!.y.toFixed(1)}`;
        const c = kingdomColor.get((po ?? no)!) ?? "#b8a06a";
        realmBorder += `<path d="${seg}" stroke="${c}"/>`;
      }
    }
    return { tint, realmBorder, fogLayer };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world, provById, kingdomColor, fog]);

  const layers = { ...geo, ...political };

  const settleMarks = useMemo(() => {
    const showLabel = view.k > 1.35;
    return world.settlements
      .map((s) => {
        const owner = perceivedOwner(s.provinceId);
        const c = owner ? (kingdomColor.get(owner) ?? "#8a8374") : "#8a8374";
        return settlementMark(s, c, showLabel);
      })
      .join("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [world.settlements, provById, kingdomColor, view.k, fog]);

  const clamp = (v: { x: number; y: number; k: number }) => {
    const k = Math.max(1, Math.min(4, v.k));
    const maxX = width * (k - 1);
    const maxY = height * (k - 1);
    return { k, x: Math.max(-maxX, Math.min(0, v.x)), y: Math.max(-maxY, Math.min(0, v.y)) };
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const py = ((e.clientY - rect.top) / rect.height) * height;
    setView((v) => {
      const k = Math.max(1, Math.min(4, v.k * (e.deltaY < 0 ? 1.15 : 0.87)));
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return clamp({ k, x: px - wx * k, y: py - wy * k });
    });
  };

  const selected = selectedId ? provById.get(selectedId) : null;

  return (
    <div className={`relative overflow-hidden rounded-sm ${className ?? ""}`}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="block h-full w-full touch-none select-none"
        style={{ background: TERRAIN.water.fill, cursor: drag.current ? "grabbing" : "grab" }}
        onWheel={onWheel}
        onPointerDown={(e) => {
          (e.target as Element).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
          moved.current = false;
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const dx = ((e.clientX - drag.current.x) / rect.width) * width;
          const dy = ((e.clientY - drag.current.y) / rect.height) * height;
          if (Math.abs(e.clientX - drag.current.x) + Math.abs(e.clientY - drag.current.y) > 4)
            moved.current = true;
          setView((v) => clamp({ ...v, x: drag.current!.vx + dx, y: drag.current!.vy + dy }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerLeave={() => (drag.current = null)}
        role="group"
        aria-label="The realm map"
      >
        <defs>
          <radialGradient id="rm-sea" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#33566f" />
            <stop offset="100%" stopColor="#1f3547" />
          </radialGradient>
        </defs>
        <g transform={`translate(${view.x} ${view.y}) scale(${view.k})`}>
          {/* sea */}
          <rect x="0" y="0" width={width} height={height} fill="url(#rm-sea)" />
          {/* permanent geography */}
          <g dangerouslySetInnerHTML={{ __html: layers.terrainFill }} />
          <g dangerouslySetInnerHTML={{ __html: layers.motifLayer }} />
          {/* political control tint */}
          <g dangerouslySetInnerHTML={{ __html: layers.tint }} />
          {/* borders */}
          <g
            stroke="#5a7a8a"
            strokeWidth={1.6}
            strokeOpacity={0.7}
            fill="none"
            dangerouslySetInnerHTML={{ __html: layers.coast }}
          />
          <g
            stroke="#0c0a06"
            strokeWidth={0.6}
            strokeOpacity={0.3}
            fill="none"
            dangerouslySetInnerHTML={{ __html: layers.internal }}
          />
          <g
            strokeWidth={2.6}
            strokeOpacity={0.9}
            strokeLinecap="round"
            fill="none"
            dangerouslySetInnerHTML={{ __html: layers.realmBorder }}
          />
          {/* rivers + roads + bridges */}
          <g
            stroke="#3f7fa0"
            strokeWidth={2.4}
            strokeOpacity={0.8}
            fill="none"
            strokeLinecap="round"
            dangerouslySetInnerHTML={{ __html: layers.rivers }}
          />
          <g
            stroke="#b89a5a"
            strokeWidth={1.4}
            strokeOpacity={0.55}
            strokeDasharray="4 3"
            fill="none"
            dangerouslySetInnerHTML={{ __html: layers.roads }}
          />
          <g dangerouslySetInnerHTML={{ __html: layers.bridges }} />
          {/* selection */}
          {selected && (
            <path
              d={polyD(selected.polygon)}
              fill="none"
              stroke="#f2d488"
              strokeWidth={3}
              strokeOpacity={0.95}
            />
          )}
          {/* click targets */}
          {world.provinces.map((p) =>
            TERRAIN[p.terrain].land ? (
              <path
                key={p.id}
                d={polyD(p.polygon)}
                fill="transparent"
                className="cursor-pointer"
                onClick={() => {
                  if (!moved.current) onSelect(p.id);
                }}
              />
            ) : null,
          )}
          {/* settlements on top */}
          <g dangerouslySetInnerHTML={{ __html: settleMarks }} />

          {/* fog of war — shroud over ground the player cannot see */}
          {fog && <g dangerouslySetInnerHTML={{ __html: layers.fogLayer }} />}

          {/* march path of the selected army */}
          {selectedArmyId &&
            (() => {
              const a = armies.find((x) => x.id === selectedArmyId);
              if (!a || a.path.length === 0) return null;
              const pts = [armyPos(world, a), ...a.path.map((id) => provById.get(id)!.center)];
              return (
                <path
                  d={smooth(pts)}
                  fill="none"
                  stroke="#f2d488"
                  strokeWidth={2.4}
                  strokeOpacity={0.85}
                  strokeDasharray="7 5"
                  strokeLinecap="round"
                />
              );
            })()}

          {/* armies — formations physically on the map, only where seen */}
          {armies.map((a) => {
            const isPlayer = a.ownerId === world.playerKingdomId;
            // hide enemy hosts standing in fog
            if (fog && !isPlayer && !fog.visible.has(a.provinceId)) return null;
            const pos = armyPos(world, a);
            const color = kingdomColor.get(a.ownerId) ?? "#b8a06a";
            const sel = a.id === selectedArmyId;
            const n = troopCount(a);
            // fuzz enemy numbers unless a spy sits in their court
            const spied = !fog || isPlayer || fog.spied.has(a.ownerId);
            const shown = spied ? n : Math.max(50, Math.round(n / 50) * 50);
            const label =
              (spied ? "" : "~") +
              (shown >= 1000 ? `${(shown / 1000).toFixed(1)}k` : String(shown));
            return (
              <g
                key={a.id}
                transform={`translate(${pos.x} ${pos.y})`}
                className={onSelectArmy ? "cursor-pointer" : undefined}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!moved.current) onSelectArmy?.(a.id);
                }}
              >
                <ellipse cx={0} cy={7} rx={13} ry={4} fill="#000" opacity={0.32} />
                {sel && <circle r={17} fill="none" stroke="#f2d488" strokeWidth={2} />}
                <path d="M -8 -13 L 4 -13 L 1 -9 L 4 -5 L -8 -5 Z" fill={color} />
                <rect x={-9} y={-13} width={2} height={20} fill="#2a2015" />
                <rect
                  x={-11}
                  y={-4}
                  width={22}
                  height={13}
                  rx={2.5}
                  fill="#211b12"
                  stroke={color}
                  strokeWidth={1.5}
                />
                <text
                  x={0}
                  y={5.5}
                  textAnchor="middle"
                  fontFamily="Cinzel, Georgia, serif"
                  fontSize={9}
                  fill="#f0e4c4"
                >
                  {label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
      <AtlasAtmosphere />
    </div>
  );
}
