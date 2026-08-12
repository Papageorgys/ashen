import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ATLAS_MAPS,
  ATLAS_TYPE_LABEL,
  ATLAS_ZONE,
  atlasMarker,
  type AtlasLocation,
  type AtlasMap,
  type AtlasMapId,
} from "@/lib/game/atlas";
import { ZONE_BY_ID, travelMsTo } from "@/lib/game/data";
import type { GameState, Party } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

/**
 * RealmAtlas — the four painted maps of Aethyr, made interactive.
 *
 * Each painting is shown as a full image (dropped into /public/maps) with a
 * clickable hotspot layer on top: view a place to read its lore, drill from the
 * continent into a realm, or — in play mode — march a banner and hold ground.
 *
 * If a painting file is missing the map renders a procedural relief plate so the
 * whole thing still works before the art is added.
 */

type Mode = "view" | "play";

const MAP_BASE = `${import.meta.env.BASE_URL}maps/`;

/** dark-relief fallback drawn when a painting file is absent */
function ReliefPlate({ map }: { map: AtlasMap }) {
  const coast =
    map.kind === "continent"
      ? "M5 31 C 6 22, 11 15, 19 12 C 24 10, 26 13, 30 12 C 33 11, 33 7, 38 7 C 44 7, 46 11, 51 10 C 55 9, 57 4, 64 5 C 72 6, 74 11, 80 12 C 89 13, 96 19, 95 27 C 94 33, 89 33, 89 37 C 89 42, 94 44, 92 49 C 89 55, 80 57, 73 55 C 67 53, 66 58, 59 59 C 52 60, 49 56, 43 57 C 37 58, 35 61, 29 59 C 22 57, 21 52, 16 50 C 10 47, 4 40, 5 31 Z"
      : "M5 9 C 20 4, 40 6, 55 5 C 70 4, 87 7, 95 14 C 98 24, 95 39, 96 49 C 94 56, 81 59, 67 57 C 51 59, 37 58, 23 57 C 11 55, 4 48, 4 38 C 3 27, 2 15, 5 9 Z";
  const veins =
    map.id === "ember_court"
      ? [
          "M20 8 C 30 16, 26 24, 34 30 C 42 36, 40 46, 50 52",
          "M74 10 C 70 20, 78 28, 72 38 C 68 46, 74 52, 80 54",
        ]
      : map.id === "hollow_covenant"
        ? [
            "M18 14 C 30 18, 34 26, 30 34 C 26 42, 34 48, 30 54",
            "M62 12 C 58 22, 66 30, 60 40 C 56 48, 64 52, 60 56",
          ]
        : map.id === "free_holds"
          ? ["M46 14 C 48 26, 56 34, 52 46", "M30 40 C 40 44, 44 52, 40 58"]
          : [
              "M40 12 C 42 22, 34 28, 36 36 C 38 46, 30 50, 24 58",
              "M78 16 C 74 26, 80 32, 76 42 C 73 50, 78 54, 84 57",
            ];
  const glow =
    map.id === "ember_court" ? "#ffb066" : map.id === "hollow_covenant" ? "#b9a8e6" : map.hue;

  return (
    <svg
      viewBox="0 0 100 62"
      preserveAspectRatio="none"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`grd-${map.id}`} cx="42%" cy="34%" r="85%">
          <stop offset="0%" stopColor="#221a10" />
          <stop offset="55%" stopColor="#14100a" />
          <stop offset="100%" stopColor="#080604" />
        </radialGradient>
        <radialGradient id={`aura-${map.id}`} cx="42%" cy="34%" r="60%">
          <stop offset="0%" stopColor={map.hue} stopOpacity="0.34" />
          <stop offset="100%" stopColor={map.hue} stopOpacity="0" />
        </radialGradient>
        <clipPath id={`clip-${map.id}`}>
          <path d={coast} />
        </clipPath>
      </defs>
      <rect width="100" height="62" fill={`url(#grd-${map.id})`} />
      <path
        d={coast}
        fill={map.hue}
        fillOpacity="0.1"
        stroke={map.hue}
        strokeOpacity="0.5"
        strokeWidth="0.4"
      />
      <g clipPath={`url(#clip-${map.id})`}>
        <rect width="100" height="62" fill={`url(#aura-${map.id})`} />
        {veins.map((d) => (
          <g key={d}>
            <path
              d={d}
              fill="none"
              stroke={map.hue}
              strokeOpacity="0.28"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <path
              d={d}
              fill="none"
              stroke={glow}
              strokeOpacity="0.9"
              strokeWidth="0.5"
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

function markerShape(type: AtlasLocation["type"]) {
  switch (type) {
    case "stronghold":
      return "rounded-[3px] border-forge-ember text-[#ffcf9a]";
    case "holy":
      return "[clip-path:polygon(50%_0,100%_38%,82%_100%,18%_100%,0_38%)] border-gold";
    case "ruin":
      return "rounded-full border-dashed border-gold";
    case "monument":
      return "rounded-[2px] border-gold";
    case "realm":
      return "rounded-full border-gold";
    default:
      return "rounded-full border-gold";
  }
}

export function RealmAtlas({
  state,
  api,
  now,
  className,
}: {
  /** live game state — when supplied with `api`, play mode deploys real banners */
  state?: GameState;
  api?: ClanApi;
  /** ticking clock so marching/fighting banners show live progress */
  now?: number;
  className?: string;
}) {
  const [currentId, setCurrentId] = useState<AtlasMapId>("aethyr");
  const [mode, setMode] = useState<Mode>("view");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [held, setHeld] = useState<Record<string, boolean>>({});
  const [marching, setMarching] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [artFailed, setArtFailed] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ---- pan & zoom ----
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const moved = useRef(false);
  useEffect(() => {
    zoomRef.current = zoom;
    panRef.current = pan;
  }, [zoom, pan]);

  const clampPan = useCallback((p: { x: number; y: number }, z: number) => {
    const vp = viewportRef.current;
    if (!vp) return p;
    const w = vp.clientWidth;
    const h = vp.clientHeight;
    return {
      x: Math.min(0, Math.max(w * (1 - z), p.x)),
      y: Math.min(0, Math.max(h * (1 - z), p.y)),
    };
  }, []);

  const zoomAt = useCallback(
    (nextZoom: number, cx: number, cy: number) => {
      const z0 = zoomRef.current;
      const nz = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
      const p0 = panRef.current;
      const np = clampPan({ x: cx - (cx - p0.x) * (nz / z0), y: cy - (cy - p0.y) * (nz / z0) }, nz);
      setZoom(nz);
      setPan(np);
    },
    [clampPan],
  );

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // wheel-to-zoom: native non-passive listener so we can preventDefault the page scroll
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const factor = e.deltaY < 0 ? 1.18 : 1 / 1.18;
      zoomAt(zoomRef.current * factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // active pointers, so one finger pans and two fingers pinch-zoom
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    moved.current = false;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      if (a && b) pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: zoomRef.current };
      drag.current = null;
      for (const id of pointers.current.keys()) e.currentTarget.setPointerCapture(id);
    } else {
      drag.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const vp = viewportRef.current;
    // two fingers: pinch-zoom toward their midpoint
    if (pinch.current && pointers.current.size === 2 && vp) {
      const [a, b] = [...pointers.current.values()];
      if (!a || !b) return;
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const rect = vp.getBoundingClientRect();
      moved.current = true;
      zoomAt(
        (pinch.current.zoom * dist) / pinch.current.dist,
        (a.x + b.x) / 2 - rect.left,
        (a.y + b.y) / 2 - rect.top,
      );
      return;
    }
    // one finger / mouse: pan
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (Math.hypot(dx, dy) > 4) {
      moved.current = true;
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    setPan(clampPan({ x: drag.current.px + dx, y: drag.current.py + dy }, zoomRef.current));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 1) {
      const [only] = [...pointers.current.values()];
      if (only) drag.current = { x: only.x, y: only.y, px: panRef.current.x, py: panRef.current.y };
    } else if (pointers.current.size === 0) {
      drag.current = null;
    }
  };
  const onDoubleClick = (e: React.MouseEvent) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    zoomAt(
      zoomRef.current < MAX_ZOOM ? zoomRef.current * 1.8 : 1,
      e.clientX - rect.left,
      e.clientY - rect.top,
    );
  };
  const zoomButton = (dir: 1 | -1) => {
    const vp = viewportRef.current;
    const cx = vp ? vp.clientWidth / 2 : 0;
    const cy = vp ? vp.clientHeight / 2 : 0;
    zoomAt(zoomRef.current * (dir > 0 ? 1.5 : 1 / 1.5), cx, cy);
  };

  // keyboard: arrows pan, +/- zoom, 0 resets
  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = 48;
    const z = zoomRef.current;
    if (e.key === "ArrowUp") setPan((p) => clampPan({ x: p.x, y: p.y + step }, z));
    else if (e.key === "ArrowDown") setPan((p) => clampPan({ x: p.x, y: p.y - step }, z));
    else if (e.key === "ArrowLeft") setPan((p) => clampPan({ x: p.x + step, y: p.y }, z));
    else if (e.key === "ArrowRight") setPan((p) => clampPan({ x: p.x - step, y: p.y }, z));
    else if (e.key === "+" || e.key === "=") zoomButton(1);
    else if (e.key === "-" || e.key === "_") zoomButton(-1);
    else if (e.key === "0") resetView();
    else return;
    e.preventDefault();
  };

  /** live wiring: only when both state and api are handed in by the game */
  const live = !!(api && state);
  const clock = now ?? Date.now();

  const map = ATLAS_MAPS[currentId];
  const selected = useMemo(
    () => map.locations.find((l) => l.id === selectedId) ?? null,
    [map, selectedId],
  );
  const crumbs = map.parent ? [ATLAS_MAPS[map.parent], map] : [map];
  const showArt = map.art && !artFailed[currentId];

  /** the real zone an atlas place deploys to (region play only) */
  const zoneOf = (loc: AtlasLocation) => ZONE_BY_ID[ATLAS_ZONE[loc.id] ?? ""];

  const levelOf = useMemo(() => {
    const m = new Map<string, number>();
    state?.members.forEach((mem) => m.set(mem.id, mem.level));
    return m;
  }, [state?.members]);

  const partyFloor = (p: Party) =>
    p.memberIds.length ? Math.min(...p.memberIds.map((id) => levelOf.get(id) ?? 1)) : 1;

  const currentZoneOf = (p: Party) => p.run?.zoneId ?? p.travel?.zoneId ?? p.farming ?? null;

  /** banners standing on a given zone right now */
  const partiesAt = (zoneId: string | undefined): Party[] =>
    !zoneId || !state ? [] : state.parties.filter((p) => currentZoneOf(p) === zoneId);

  /** rested banners that could march to a zone (have blades, meet its gate) */
  const deployable = (zoneId: string | undefined): Party[] => {
    const zone = zoneId ? ZONE_BY_ID[zoneId] : undefined;
    if (!zone || !state) return [];
    return state.parties.filter(
      (p) =>
        p.memberIds.length > 0 &&
        !p.run &&
        !p.travel &&
        !p.farming &&
        partyFloor(p) >= zone.reqLevel,
    );
  };

  /** live march progress 0..100 for a banner on the map */
  const progressOf = (p: Party): number => {
    if (p.travel) {
      const total = travelMsTo(p.travel.zoneId);
      return Math.min(100, Math.max(0, 100 - ((p.travel.arrivesAt - clock) / total) * 100));
    }
    if (p.run) {
      const dur = ZONE_BY_ID[p.run.zoneId]?.durationMs ?? 1;
      return Math.min(100, Math.max(0, 100 - ((p.run.endsAt - clock) / dur) * 100));
    }
    return 0;
  };

  // the selected place resolved against live state
  const selZone = selected && live ? zoneOf(selected) : undefined;
  const selHere = selZone ? partiesAt(selZone.id) : [];
  const selDeployable = selZone ? deployable(selZone.id) : [];

  function marchLive(zoneId: string, party: Party, name: string) {
    api?.sendParty(party.id, zoneId);
    setStatus(`${party.name} marches on ${name}.`);
  }
  function recallLive(party: Party) {
    api?.recallParty(party.id);
    setStatus(`${party.name} recalled to the clan keep.`);
  }

  function goTo(id: AtlasMapId) {
    // clear any marches from the map we're leaving
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setMarching({});
    setHeld({});
    setSelectedId(null);
    setCurrentId(id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setStatus(`Charting ${ATLAS_MAPS[id].title}…`);
  }

  function march(loc: AtlasLocation) {
    if (held[loc.id] || marching[loc.id]) return;
    setMarching((m) => ({ ...m, [loc.id]: true }));
    setStatus(`The Ashen banner marches on ${loc.name}…`);
    timers.current[loc.id] = setTimeout(() => {
      setMarching((m) => ({ ...m, [loc.id]: false }));
      setHeld((h) => ({ ...h, [loc.id]: true }));
      setStatus(`${loc.name} secured — the banner holds. It will earn until recalled.`);
    }, 2600);
  }

  function recall(loc: AtlasLocation) {
    clearTimeout(timers.current[loc.id]);
    setHeld((h) => {
      const next = { ...h };
      delete next[loc.id];
      return next;
    });
    setStatus(`${loc.name} released — the banner returns to the keep.`);
  }

  const worldTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  const vpEl = viewportRef.current;
  const miniRect = {
    left: (-pan.x / ((vpEl?.clientWidth ?? 1) * zoom)) * 100,
    top: (-pan.y / ((vpEl?.clientHeight ?? 1) * zoom)) * 100,
    size: (1 / zoom) * 100,
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border-2 border-map-ink/50 bg-[#0c0a06] shadow-[0_18px_40px_-24px_oklch(0_0_0/0.9)]",
        className,
      )}
    >
      {/* top bar: breadcrumb + mode toggle */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#17130d] px-3 py-2">
        <nav className="flex flex-1 items-center gap-1.5" aria-label="Atlas location">
          {crumbs.map((m, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={m.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-xs text-muted-foreground">›</span>}
                <button
                  type="button"
                  disabled={last}
                  onClick={() => goTo(m.id)}
                  aria-current={last ? "true" : undefined}
                  className={cn(
                    "font-display text-sm tracking-wide",
                    last ? "text-gold" : "text-muted-foreground hover:text-gold",
                  )}
                >
                  {m.title}
                </button>
              </span>
            );
          })}
        </nav>
        <div
          className="inline-flex overflow-hidden rounded-sm border border-gold/40"
          role="group"
          aria-label="Atlas mode"
        >
          {(["view", "play"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1 font-display text-[11px] uppercase tracking-[0.15em] transition-colors",
                mode === m ? "bg-gold/15 text-gold" : "text-muted-foreground hover:text-gold/80",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className={cn("grid", selected ? "md:grid-cols-[1fr_20rem]" : "grid-cols-1")}>
        {/* the map stage — pan with drag, zoom with wheel / double-click / buttons */}
        <div
          ref={viewportRef}
          role="application"
          tabIndex={0}
          aria-label={`${map.title} map — drag to pan, scroll or pinch to zoom, arrow keys to move, plus and minus to zoom`}
          className={cn(
            "relative h-[clamp(300px,calc(100dvh-16rem),680px)] w-full touch-none select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60",
            zoom > 1 && "cursor-grab active:cursor-grabbing",
          )}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onPointerLeave={onPointerUp}
          onDoubleClick={onDoubleClick}
          onKeyDown={onKeyDown}
        >
          {/* art / relief layer (pans & zooms) */}
          <div className="absolute inset-0 origin-top-left" style={{ transform: worldTransform }}>
            {showArt ? (
              <img
                src={`${MAP_BASE}${map.art}`}
                alt={`${map.title} — atlas painting`}
                className="h-full w-full object-cover"
                onError={() => setArtFailed((a) => ({ ...a, [currentId]: true }))}
              />
            ) : (
              <>
                <ReliefPlate map={map} />
                <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-white/10 bg-black/60 px-2 py-1 text-[9px] uppercase tracking-[0.2em] text-[#8a7a55]">
                  Placeholder relief · add /public/maps/{map.art} for the painting
                </div>
              </>
            )}
          </div>

          {/* vignette + engraved frame */}
          <svg
            viewBox="0 0 100 62"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 h-full w-full"
            aria-hidden="true"
          >
            <defs>
              <radialGradient id="atlas-vig" cx="50%" cy="48%" r="72%">
                <stop offset="58%" stopColor="#000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000" stopOpacity="0.66" />
              </radialGradient>
            </defs>
            <rect width="100" height="62" fill="url(#atlas-vig)" />
            <rect
              x="0.7"
              y="0.7"
              width="98.6"
              height="60.6"
              fill="none"
              stroke="#d8b45a"
              strokeOpacity="0.45"
              strokeWidth="0.3"
            />
          </svg>

          {/* cartouche */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[46%] rounded-sm border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm">
            <h3 className="font-display text-base uppercase tracking-[0.12em] text-gold">
              {map.title}
            </h3>
            <p className="mt-1 text-[11px] italic leading-snug text-muted-foreground">
              {map.subtitle}
            </p>
          </div>

          {/* hotspots (pan & zoom with the art) */}
          <div className="absolute inset-0 origin-top-left" style={{ transform: worldTransform }}>
            {map.locations.map((loc) => {
              const face = atlasMarker(map, loc);
              const isSel = selectedId === loc.id;
              const isRealm = loc.type === "realm";
              // live vs demo occupancy for the play-mode marker dot
              const here = live ? partiesAt(zoneOf(loc)?.id) : [];
              const fighting = live ? here.some((p) => p.run) : held[loc.id];
              const marchingHere = live ? here.some((p) => p.travel && !p.run) : marching[loc.id];
              const showDot = mode === "play" && (fighting || marchingHere);
              return (
                <div
                  key={loc.id}
                  className="group absolute z-[5] -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
                >
                  {isRealm && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-pulse"
                      style={{
                        background: `radial-gradient(circle, ${loc.hue}66 0%, transparent 68%)`,
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (moved.current) return;
                      setSelectedId((s) => (s === loc.id ? null : loc.id));
                    }}
                    aria-label={`${loc.name} — ${ATLAS_TYPE_LABEL[loc.type]}`}
                    className={cn(
                      "grid place-items-center border-[1.5px] font-display font-semibold text-gold shadow-[0_2px_4px_oklch(0_0_0/0.6)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:scale-110",
                      isRealm ? "h-8 w-8 text-sm" : "h-6 w-6 text-[11px]",
                      markerShape(loc.type),
                      "bg-[radial-gradient(circle_at_50%_35%,#2a2114,#0d0a06)]",
                      isSel && "scale-110 ring-2 ring-gold",
                    )}
                  >
                    <span aria-hidden="true">{face}</span>
                  </button>
                  {/* hold / march dot in play mode */}
                  {showDot && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-black",
                        fighting ? "bg-[#7ea86a]" : "bg-gold motion-safe:animate-ping",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "pointer-events-none mt-1 whitespace-nowrap rounded-[2px] bg-black/60 px-1.5 py-px text-center font-display text-[10px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                      (isSel || mode === "view") && "opacity-100",
                    )}
                    style={{ color: "#e7d7ac" }}
                  >
                    {loc.name}
                  </div>
                </div>
              );
            })}
          </div>

          {/* zoom controls */}
          <div className="absolute bottom-2 left-2 z-10 flex flex-col overflow-hidden rounded-sm border border-white/10 bg-black/70">
            <button
              type="button"
              onClick={() => zoomButton(1)}
              aria-label="Zoom in"
              className="h-7 w-7 border-b border-white/10 font-display text-base text-gold transition-colors hover:bg-gold/15"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => zoomButton(-1)}
              aria-label="Zoom out"
              className="h-7 w-7 border-b border-white/10 font-display text-base text-gold transition-colors hover:bg-gold/15"
            >
              −
            </button>
            <button
              type="button"
              onClick={resetView}
              aria-label="Reset view"
              className="h-7 w-7 font-display text-xs text-gold transition-colors hover:bg-gold/15"
            >
              ⤢
            </button>
          </div>

          {/* minimap: the visible window over the whole map, shown when zoomed */}
          {zoom > 1 && (
            <div
              className="pointer-events-none absolute right-2 top-2 z-10 h-[52px] w-[84px] overflow-hidden rounded-sm border border-white/15 bg-black/70"
              aria-hidden="true"
            >
              <div
                className="absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 42% 34%, ${map.hue}66, #0c0a06 72%)`,
                }}
              />
              <div
                className="absolute border border-gold bg-gold/20"
                style={{
                  left: `${miniRect.left}%`,
                  top: `${miniRect.top}%`,
                  width: `${miniRect.size}%`,
                  height: `${miniRect.size}%`,
                }}
              />
            </div>
          )}
        </div>

        {/* codex */}
        {selected && (
          <aside className="relative flex flex-col gap-3 border-t border-white/10 bg-[#191309] p-4 md:border-l md:border-t-0">
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              aria-label="Close"
              className="absolute right-2 top-2 text-muted-foreground hover:text-gold"
            >
              ✕
            </button>
            <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
              {map.title}
            </div>
            <h3 className="font-display text-xl text-gold">{selected.name}</h3>
            <div className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {ATLAS_TYPE_LABEL[selected.type]}
            </div>
            <hr className="border-0 [height:1px] [background:linear-gradient(90deg,var(--gold),transparent)]" />
            <p className="text-sm leading-relaxed" style={{ color: "#e7d7ac" }}>
              {selected.blurb}
            </p>

            {mode === "play" && selected.level != null && (
              <div className="grid grid-cols-3 gap-2">
                {[
                  ["Level", `${selZone ? selZone.reqLevel : selected.level}+`],
                  ["Threat", `${selZone ? selZone.threat : selected.threat}`],
                  [
                    live ? "Banners" : "Hold",
                    live ? `${selHere.length}` : held[selected.id] ? "Yours" : "Open",
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-sm border border-white/10 bg-black/40 p-2 text-center"
                  >
                    <div className="font-display text-base text-gold [font-variant-numeric:tabular-nums]">
                      {value}
                    </div>
                    <div className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* live play: which zone this maps to, banners here, and who can march */}
            {mode === "play" && live && selZone && (
              <div className="flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  Field: <span className="text-gold">{selZone.name}</span>
                  {selZone.kind === "dungeon" ? " · dungeon" : " · experience field"}
                </div>

                {selHere.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    {selHere.map((p) => {
                      const pct = progressOf(p);
                      return (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/40 px-2 py-1.5"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-display text-xs text-gold">{p.name}</div>
                            <div className="mt-0.5 h-[3px] w-full bg-white/10">
                              <span
                                className="block h-full bg-gold motion-safe:transition-[width]"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            {p.travel ? "Marching" : "Fighting"}
                          </span>
                          <button
                            type="button"
                            onClick={() => recallLive(p)}
                            className="shrink-0 rounded-sm border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-gold transition hover:border-gold"
                          >
                            Recall
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selDeployable.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      March a rested banner
                    </div>
                    {selDeployable.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => marchLive(selZone.id, p, selected.name)}
                        className="flex items-center justify-between gap-2 rounded-sm border border-gold bg-gradient-to-b from-gold to-[#c69a3e] px-2.5 py-1.5 font-display text-xs uppercase tracking-[0.1em] text-[#120d05] transition hover:brightness-110"
                      >
                        <span className="truncate">March {p.name}</span>
                        <span className="shrink-0 opacity-70">Lv {partyFloor(p)}+</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  selHere.length === 0 && (
                    <p className="text-[11px] italic text-muted-foreground">
                      No rested banner meets the Lv {selZone.reqLevel} gate — muster or level a
                      warband, then march it from here.
                    </p>
                  )
                )}
              </div>
            )}

            <div className="mt-auto flex flex-col gap-2 pt-2">
              {selected.region && (
                <button
                  type="button"
                  onClick={() => goTo(selected.region!)}
                  className="w-full rounded-sm border border-forge-ember bg-forge-ember/80 py-2 font-display text-sm uppercase tracking-[0.12em] text-[#160d06] transition hover:brightness-110"
                >
                  Enter {selected.name} ▸
                </button>
              )}
              {/* demo march (no live state wired) keeps the standalone prototype usable */}
              {mode === "play" &&
                !live &&
                selected.level != null &&
                !selected.region &&
                (held[selected.id] ? (
                  <button
                    type="button"
                    onClick={() => recall(selected)}
                    className="w-full rounded-sm border border-white/10 bg-[#201a12] py-2 font-display text-sm uppercase tracking-[0.12em] text-gold transition hover:border-gold"
                  >
                    Recall banner
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={marching[selected.id]}
                    onClick={() => march(selected)}
                    className="w-full rounded-sm border border-gold bg-gradient-to-b from-gold to-[#c69a3e] py-2 font-display text-sm uppercase tracking-[0.12em] text-[#120d05] transition hover:brightness-110 disabled:opacity-50"
                  >
                    {marching[selected.id] ? "Marching…" : "March banner here"}
                  </button>
                ))}
            </div>
          </aside>
        )}
      </div>

      {/* status ribbon */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-[#17130d] px-3 py-1.5 text-[11px] text-muted-foreground">
        <span className="flex-1 italic">
          {status ||
            (mode === "play"
              ? live
                ? "Play mode — pick a field and march one of your rested banners; it deploys for real."
                : "Play mode — pick a place and march a banner; hold it to earn."
              : "View mode — click any marked place to read its lore, or enter a realm.")}
        </span>
        <span className="flex flex-wrap gap-3 text-[9px] uppercase tracking-[0.1em]">
          <Legend swatch="rounded-[2px] border-forge-ember" label="Stronghold" />
          <Legend swatch="rounded-full border-gold" label="POI" />
          <Legend swatch="rounded-full border-dashed border-gold" label="Ruin" />
        </span>
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <i className={cn("inline-block h-3 w-3 border-[1.5px]", swatch)} />
      {label}
    </span>
  );
}
