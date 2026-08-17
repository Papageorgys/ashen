import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  Hammer,
  Package,
  Home as HomeIcon,
  UserPlus,
  Handshake,
  Store,
  ScrollText,
  Castle,
  Anvil,
  PenLine,
  Flame,
  Users,
  Crown,
  type LucideIcon,
} from "lucide-react";
import {
  ATLAS_MAPS,
  ATLAS_TYPE_LABEL,
  ATLAS_ZONE,
  atlasMarker,
  HOME_MAP,
  type AtlasLocation,
  type AtlasMap,
  type AtlasMapId,
} from "@/lib/game/atlas";
import { ZONE_BY_ID, travelMsTo } from "@/lib/game/data";
import { RIVALS } from "@/lib/game/rivals";
import { useMapManifest } from "@/lib/game/mapAssets";
import { MapCanvas } from "./MapCanvas";
import {
  zoneCondition,
  conditionRisk,
  longNightActive,
  bannersInCity,
  flameRestBill,
  contestCost,
  supplyCap,
  warbandPower,
  RISK_LABEL,
  type RiskTier,
} from "@/lib/game/engine";
import {
  FACTIONS,
  isContested,
  nightPhase,
  territoryClash,
  TERRITORIES,
  TERRITORY_IDS,
  BUILDINGS,
  BUILDING_IDS,
  canBuild,
  birthRate,
  REALM_FERTILITY,
  type BuildingId,
  type FrontierEvent,
  type FrontierState,
  type TerritoryId,
} from "@/lib/game/frontier";
import {
  courtRank,
  courtStanding,
  nextCourtRank,
  courtRankProgress,
  chargeProgress,
} from "@/lib/game/court";
import { timeOfDay, realmProsperity } from "@/lib/game/living";
import { NODE_DEF, RAW_GLYPH, CARAVAN_MS, type Raw } from "@/lib/game/logistics";
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

/** Risk badge colours for a field's current condition. */
const RISK_COLOR: Record<RiskTier, string> = {
  safe: "#7ea86a",
  steady: "#b8b2a4",
  tense: "#d8a24a",
  perilous: "#d1603a",
};

/**
 * What you can do at your home city — the town's own services, reached by clicking
 * the seat on the map. The map toolbar already carries the Forge and Vault, so
 * those aren't repeated here; these are the rest of the hall's business.
 */
const CITY_ACTIONS: { tool: string; label: string; icon: LucideIcon; hint: string }[] = [
  { tool: "recruit", label: "Recruit", icon: UserPlus, hint: "Swear new blades" },
  { tool: "muster", label: "Muster", icon: Handshake, hint: "Petitions from party leaders" },
  { tool: "market", label: "Market", icon: Store, hint: "Refine shots and trade" },
  { tool: "daily", label: "Contracts", icon: ScrollText, hint: "Daily, weekly and monthly" },
  { tool: "keep", label: "Keep", icon: Castle, hint: "Upgrade your halls" },
  { tool: "sysforge", label: "Town Smithy", icon: Anvil, hint: "Standard-pattern smithing" },
  { tool: "scriptorium", label: "Scrolls", icon: PenLine, hint: "Imprint spells into vellum" },
];

const MAP_BASE = `${import.meta.env.BASE_URL}maps/`;
const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
const FLY_MS = 620;

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

type Transit = { toId: AtlasMapId; kind: "enter" | "exit"; focal?: { x: number; y: number } };

/** the incoming map, animated over the top during a fly-in / fly-out */
function TransitionOverlay({
  transit: t,
  artFailed,
  viewportRef,
  onArtError,
}: {
  transit: Transit;
  artFailed: Record<string, boolean>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  onArtError: (id: AtlasMapId) => void;
}) {
  const tMap = ATLAS_MAPS[t.toId];
  const tArt = tMap.art && !artFailed[t.toId];
  const tManifest = useMapManifest(t.toId);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vp = viewportRef.current;
    const w = vp?.clientWidth ?? 1;
    const h = vp?.clientHeight ?? 1;
    el.style.transition = "none";
    el.style.opacity = "0";
    if (t.kind === "enter") {
      el.style.transformOrigin = "center";
      el.style.transform = "scale(1.12)";
    } else {
      const fx = (t.focal?.x ?? 50) / 100;
      const fy = (t.focal?.y ?? 50) / 100;
      el.style.transformOrigin = "top left";
      el.style.transform = `translate(${w / 2 - fx * w * MAX_ZOOM}px, ${h / 2 - fy * h * MAX_ZOOM}px) scale(${MAX_ZOOM})`;
    }
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        el.style.transition = `opacity ${FLY_MS}ms ease, transform ${FLY_MS}ms cubic-bezier(.4,0,.2,1)`;
        el.style.opacity = "1";
        el.style.transform = t.kind === "enter" ? "scale(1)" : "translate(0px,0px) scale(1)";
      }),
    );
    return () => cancelAnimationFrame(id);
  }, [t, viewportRef]);
  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 z-[8]" aria-hidden="true">
      {tManifest ? (
        <MapCanvas id={t.toId} manifest={tManifest} zoom={1} maxZoom={MAX_ZOOM} />
      ) : tArt ? (
        <img
          src={`${MAP_BASE}${tMap.art}`}
          alt=""
          className="h-full w-full object-cover"
          onError={() => onArtError(t.toId)}
        />
      ) : (
        <ReliefPlate map={tMap} />
      )}
    </div>
  );
}

export function RealmAtlas({
  state,
  api,
  now,
  className,
  onOpenTool,
  navSlot,
  frontier: frontierProp,
  onContest,
  onBuild,
}: {
  /** live game state — when supplied with `api`, play mode deploys real banners */
  state?: GameState;
  api?: ClanApi;
  /** ticking clock so marching/fighting banners show live progress */
  now?: number;
  className?: string;
  /** jump straight to a tool panel (Forge, Warehouse) from the map's own toolbar */
  onOpenTool?: (tab: string) => void;
  /** the game menu, rendered into the map's own top bar (a burger, in practice) */
  navSlot?: React.ReactNode;
  /** the shared, server-ticked war — falls back to the local per-save sim */
  frontier?: FrontierState | null;
  /** commit the clan to a front in the shared war */
  onContest?: (
    territory: TerritoryId,
    power: number,
    clanName: string,
  ) => Promise<{ ok: boolean; contested: boolean; cooldownMs: number }>;
  /** raise a building on a realm the clan holds (status-gated) */
  onBuild?: (
    territory: TerritoryId,
    building: BuildingId,
    clanName: string,
  ) => Promise<{ ok: boolean; built: boolean; reason?: string | undefined }>;
}) {
  const frontier = frontierProp ?? state?.frontier ?? null;
  const frontierStale = !frontierProp && !!frontier; // rendering the cached last-known war
  const [contestMsg, setContestMsg] = useState<string | null>(null);
  const [contesting, setContesting] = useState(false);
  const [buildMsg, setBuildMsg] = useState<string | null>(null);
  const [building, setBuilding] = useState<BuildingId | null>(null);
  const [currentId, setCurrentId] = useState<AtlasMapId>(HOME_MAP);
  // the war table (live: state + api wired) opens ready to command; the standalone
  // atlas opens in view mode for browsing lore
  const [mode, setMode] = useState<Mode>(() => (api && state ? "play" : "view"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [held, setHeld] = useState<Record<string, boolean>>({});
  const [marching, setMarching] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [artFailed, setArtFailed] = useState<Record<string, boolean>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ---- pan & zoom ----
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

  // ---- google-maps-style level transitions (fly into / out of a realm) ----
  const [flying, setFlying] = useState(false);
  const [transit, setTransit] = useState<Transit | null>(null);
  const currentIdRef = useRef(currentId);
  useEffect(() => {
    currentIdRef.current = currentId;
  }, [currentId]);
  const animating = useRef(false);
  const requestZoomRef = useRef<(factor: number, cx: number, cy: number) => void>(() => {});

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
      requestZoomRef.current(factor, e.clientX - rect.left, e.clientY - rect.top);
    };
    vp.addEventListener("wheel", onWheel, { passive: false });
    return () => vp.removeEventListener("wheel", onWheel);
  }, []);

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
      const target = (pinch.current.zoom * dist) / pinch.current.dist;
      requestZoomRef.current(
        target / zoomRef.current,
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
    if (!vp || animating.current) return;
    const rect = vp.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    // double-clicking a realm on the continent flies straight in
    const cur = ATLAS_MAPS[currentIdRef.current];
    if (cur.kind === "continent") {
      const realm = realmNearFocal(cx, cy);
      if (realm?.region) return enterRegion(realm);
    }
    zoomAt(zoomRef.current < MAX_ZOOM ? zoomRef.current * 1.8 : 1, cx, cy);
  };
  const zoomButton = (dir: 1 | -1) => {
    const vp = viewportRef.current;
    const cx = vp ? vp.clientWidth / 2 : 0;
    const cy = vp ? vp.clientHeight / 2 : 0;
    requestZoomRef.current(dir > 0 ? 1.5 : 1 / 1.5, cx, cy);
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
  // is the Long Night abroad on the map we're looking at? (the shared war's
  // night on the continent; the local realm's Long Night at home)
  const nightAbroad =
    ATLAS_MAPS[currentId].kind === "continent"
      ? !!frontier && nightPhase(frontier.tick).active
      : !!state && longNightActive(state, clock);

  const map = ATLAS_MAPS[currentId];
  const selected = useMemo(
    () => map.locations.find((l) => l.id === selectedId) ?? null,
    [map, selectedId],
  );
  const crumbs = map.parent ? [ATLAS_MAPS[map.parent], map] : [map];
  const showArt = map.art && !artFailed[currentId];
  // optional layered/grid/tiled manifest; null → single-image fallback
  const manifest = useMapManifest(currentId);

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

  function marchLive(zoneId: string, party: Party, name: string, locId?: string) {
    api?.sendParty(party.id, zoneId, locId);
    setStatus(`${party.name} marches on ${name}.`);
  }
  function recallLive(party: Party) {
    api?.recallParty(party.id);
    setStatus(`${party.name} recalled to the clan keep.`);
  }

  /** swap the visible map and reset the view — called at the end of a fly */
  function commitMap(id: AtlasMapId) {
    Object.values(timers.current).forEach(clearTimeout);
    timers.current = {};
    setMarching({});
    setHeld({});
    setSelectedId(null);
    setCurrentId(id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  /** the continent realm whose marker is nearest a viewport point (or null) */
  function realmNearFocal(cx: number, cy: number): AtlasLocation | null {
    const vp = viewportRef.current;
    if (!vp) return null;
    const z = zoomRef.current;
    const p = panRef.current;
    const mx = ((cx - p.x) / (vp.clientWidth * z)) * 100;
    const my = ((cy - p.y) / (vp.clientHeight * z)) * 100;
    let best: AtlasLocation | null = null;
    let bestD = Infinity;
    for (const loc of ATLAS_MAPS.aethyr.locations) {
      if (!loc.region) continue;
      const d = Math.hypot(loc.x - mx, loc.y - my);
      if (d < bestD) {
        bestD = d;
        best = loc;
      }
    }
    return bestD <= 30 ? best : null;
  }

  /** fly the continent down into a realm's detailed map */
  function enterRegion(realm: AtlasLocation) {
    if (animating.current || !realm.region) return;
    animating.current = true;
    setSelectedId(null);
    setFlying(true);
    const vp = viewportRef.current;
    if (vp) {
      const w = vp.clientWidth;
      const h = vp.clientHeight;
      setZoom(MAX_ZOOM);
      setPan(
        clampPan(
          { x: w / 2 - (realm.x / 100) * w * MAX_ZOOM, y: h / 2 - (realm.y / 100) * h * MAX_ZOOM },
          MAX_ZOOM,
        ),
      );
    }
    setTransit({ toId: realm.region, kind: "enter" });
    setStatus(`Entering ${realm.name}…`);
    window.setTimeout(() => {
      commitMap(realm.region!);
      setTransit(null);
      setFlying(false);
      animating.current = false;
    }, FLY_MS);
  }

  /** fly a region back up to the continent, framed on the realm we came from */
  function exitToParent() {
    if (animating.current) return;
    const cur = ATLAS_MAPS[currentIdRef.current];
    const parentId = cur.parent;
    if (!parentId) return;
    animating.current = true;
    setSelectedId(null);
    setFlying(false);
    const parentLoc = ATLAS_MAPS[parentId].locations.find((l) => l.region === cur.id);
    setTransit({
      toId: parentId,
      kind: "exit",
      focal: parentLoc ? { x: parentLoc.x, y: parentLoc.y } : { x: 50, y: 50 },
    });
    setStatus(`Returning to ${ATLAS_MAPS[parentId].title}…`);
    window.setTimeout(() => {
      commitMap(parentId);
      setTransit(null);
      animating.current = false;
    }, FLY_MS);
  }

  /** central zoom router: extremes fly between levels, otherwise plain zoom */
  function requestZoom(factor: number, cx: number, cy: number) {
    if (animating.current) return;
    const z = zoomRef.current;
    const cur = ATLAS_MAPS[currentIdRef.current];
    if (factor > 1 && cur.kind === "continent" && z >= MAX_ZOOM - 0.02) {
      const realm = realmNearFocal(cx, cy);
      if (realm?.region) return enterRegion(realm);
    }
    if (factor < 1 && cur.parent && z <= MIN_ZOOM + 0.02) {
      return exitToParent();
    }
    zoomAt(z * factor, cx, cy);
  }
  requestZoomRef.current = requestZoom;

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

  // who currently holds Castle Vareth, for its codex entry
  const castleHolder = state?.castle?.holder;
  const varethHolder =
    castleHolder === "player"
      ? (state?.clanName ?? "your clan")
      : !castleHolder || castleHolder === "crown"
        ? "the crown's garrison"
        : (RIVALS.find((r) => r.id === castleHolder)?.name ?? "a rival house");

  const worldTransform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  const vpEl = viewportRef.current;
  const miniRect = {
    left: (-pan.x / ((vpEl?.clientWidth ?? 1) * zoom)) * 100,
    top: (-pan.y / ((vpEl?.clientHeight ?? 1) * zoom)) * 100,
    size: (1 / zoom) * 100,
  };

  // deployed banners standing on the current map, stacked when they share a spot
  const fieldBanners = (() => {
    // Group banners by the exact point they sit on, so many banners mustered at
    // one place (the home seat especially) read as a single "N banners" marker
    // instead of a column of flags fanned all across the map.
    const groups = new Map<
      string,
      {
        x: number;
        y: number;
        parties: {
          name: string;
          fighting: boolean;
          traveling: boolean;
          resting: boolean;
          pct: number;
        }[];
      }
    >();
    // A banner is drawn at the exact atlas point it was marched from, so it shows
    // only where it's actually hunting — never on some other map that happens to
    // paint the same game zone at a different point. Banners at rest (and older
    // orders with no recorded point) muster at the home seat.
    const map = ATLAS_MAPS[currentId];
    const homeLoc = map.locations.find((l) => l.home);
    for (const p of state?.parties ?? []) {
      if (p.memberIds.length === 0) continue; // an empty banner isn't a host
      const deployed = !!currentZoneOf(p);
      let pos: { x: number; y: number } | null = null;
      let resting = false;
      if (deployed) {
        if (p.atlasLoc) {
          const loc = map.locations.find((l) => l.id === p.atlasLoc);
          if (loc) pos = { x: loc.x, y: loc.y };
          // else: marched from a point on another map — it's shown there, not here
        } else if (homeLoc) {
          // an order with no recorded point (older save) musters at the seat
          pos = { x: homeLoc.x, y: homeLoc.y };
        }
      } else if (homeLoc) {
        // not deployed — it stands in the hall, shown at the home seat
        pos = { x: homeLoc.x, y: homeLoc.y };
        resting = true;
      }
      if (!pos) continue;
      const key = `${pos.x},${pos.y}`;
      let g = groups.get(key);
      if (!g) {
        g = { x: pos.x, y: pos.y, parties: [] };
        groups.set(key, g);
      }
      g.parties.push({
        name: p.name,
        fighting: !!p.run,
        traveling: !!p.travel && !p.run,
        resting,
        pct: progressOf(p),
      });
    }
    return [...groups.values()];
  })();

  // the strategic overlay — everything in motion, drawn on the map itself:
  // the war's front lines and battles, banners on the march, and the domain's
  // caravans hauling raw to the city.
  const strategic = (() => {
    const map = ATLAS_MAPS[currentId];
    const home = map.locations.find((l) => l.home);
    const fronts: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    const clashes: { x: number; y: number; key: string }[] = [];

    // continental war: a line along every border where two powers meet, with a
    // clash of arms burning at the midpoint
    if (map.kind === "continent" && frontier) {
      const locOf = (id: string) => map.locations.find((l) => l.id === id);
      for (const id of TERRITORY_IDS) {
        const a = locOf(id);
        if (!a) continue;
        const ownerA = frontier.control[id]?.owner;
        for (const nb of TERRITORIES[id].adj) {
          if (id >= nb) continue; // draw each border once
          const ownerB = frontier.control[nb]?.owner;
          if (!ownerB || ownerB === ownerA) continue; // not a front
          const b = locOf(nb);
          if (!b) continue;
          fronts.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, key: `${id}-${nb}` });
          clashes.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, key: `${id}-${nb}` });
        }
      }
    }

    // the domain's caravan network, drawn around the home seat on the home map
    const routes: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    const nodes: { x: number; y: number; glyph: string; key: string }[] = [];
    const caravans: { x: number; y: number; glyph: string; key: string }[] = [];
    const raids: { x: number; y: number; lost: number; key: string }[] = [];
    const RAW_OFFSET: Record<Raw, [number, number]> = {
      grain: [-16, -11],
      timber: [16, -11],
      iron: [-16, 12],
      livestock: [16, 12],
    };
    if (currentId === HOME_MAP && home && state?.domain) {
      const anchor = (raw: Raw) => ({
        x: home.x + RAW_OFFSET[raw][0],
        y: home.y + RAW_OFFSET[raw][1],
      });
      const haveRaw = new Set<Raw>(state.domain.nodes.map((n) => NODE_DEF[n.type].raw));
      for (const raw of haveRaw) {
        const an = anchor(raw);
        routes.push({ x1: an.x, y1: an.y, x2: home.x, y2: home.y, key: raw });
        nodes.push({ x: an.x, y: an.y, glyph: RAW_GLYPH[raw], key: raw });
      }
      for (const c of state.domain.caravans) {
        const an = anchor(c.raw);
        const p = Math.max(0, Math.min(1, 1 - (c.arrivesAt - clock) / CARAVAN_MS));
        caravans.push({
          x: an.x + (home.x - an.x) * p,
          y: an.y + (home.y - an.y) * p,
          glyph: RAW_GLYPH[c.raw],
          key: c.id,
        });
      }
      // a raid flashes on the road for a few seconds after it happens
      for (const r of state.domain.raids ?? []) {
        if (clock - r.at > 12000 || clock < r.at) continue;
        const an = anchor(r.raw);
        raids.push({
          x: (an.x + home.x) / 2,
          y: (an.y + home.y) / 2,
          lost: r.lost,
          key: `${r.raw}-${r.at}`,
        });
      }
    }

    // banners on the march: a line from the home seat to where they are bound
    const marches: { x1: number; y1: number; x2: number; y2: number; key: string }[] = [];
    if (home) {
      for (const p of state?.parties ?? []) {
        if (!p.travel || p.run || !p.atlasLoc) continue;
        const loc = map.locations.find((l) => l.id === p.atlasLoc);
        if (loc) marches.push({ x1: home.x, y1: home.y, x2: loc.x, y2: loc.y, key: p.id });
      }
    }

    // news from the front: the freshest realm-bound events pinned where they
    // happened, so a conquest or a siege announces itself on the map
    const alerts: {
      x: number;
      y: number;
      glyph: string;
      tone: string;
      text: string;
      rank: number;
      key: string;
    }[] = [];
    if (map.kind === "continent" && frontier) {
      const GLYPH: Record<FrontierEvent["kind"], string> = {
        conquest: "🏴",
        siege: "⚔",
        nightfall: "🌑",
        muster: "🚩",
      };
      const TONE: Record<FrontierEvent["kind"], string> = {
        conquest: "#d1603a",
        siege: "#d8a24a",
        nightfall: "#7c5cff",
        muster: "#5fd0c6",
      };
      let rank = 0;
      for (const ev of frontier.events) {
        if (!ev.territory) continue;
        const loc = map.locations.find((l) => l.id === ev.territory);
        if (!loc) continue;
        alerts.push({
          x: loc.x,
          y: loc.y,
          glyph: GLYPH[ev.kind],
          tone: TONE[ev.kind],
          text: ev.text,
          rank,
          key: ev.id,
        });
        if (++rank >= 3) break; // only the freshest few, so the map stays legible
      }
    }

    return { fronts, clashes, routes, nodes, caravans, raids, marches, alerts };
  })();

  return (
    <div
      className={cn(
        "overflow-hidden rounded-sm border-2 border-map-ink/50 bg-[#0c0a06] shadow-[0_18px_40px_-24px_oklch(0_0_0/0.9)]",
        className,
      )}
    >
      {/* top bar: menu + breadcrumb + mode toggle */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-[#17130d] px-3 py-2">
        {navSlot}
        <nav className="flex flex-1 items-center gap-1.5" aria-label="Atlas location">
          {crumbs.map((m, i) => {
            const last = i === crumbs.length - 1;
            return (
              <span key={m.id} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-xs text-muted-foreground">›</span>}
                <button
                  type="button"
                  disabled={last}
                  onClick={() => exitToParent()}
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
        {/* quick tools — reach the forge and vault without leaving the map */}
        {onOpenTool && (
          <div
            className="inline-flex overflow-hidden rounded-sm border border-white/10"
            role="group"
            aria-label="Map tools"
          >
            <button
              type="button"
              onClick={() => onOpenTool("forge")}
              aria-label="Open the Forge"
              title="Forge — craft, sharpen and engrave"
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold/15"
            >
              <Hammer className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Forge</span>
            </button>
            <button
              type="button"
              onClick={() => onOpenTool("warehouse")}
              aria-label="Open the Warehouse"
              title="Warehouse — every drop your clan holds"
              className="flex items-center gap-1 border-l border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.12em] text-gold transition-colors hover:bg-gold/15"
            >
              <Package className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden sm:inline">Vault</span>
            </button>
          </div>
        )}
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
        <div
          className="inline-flex overflow-hidden rounded-sm border border-white/10"
          role="group"
          aria-label="Zoom"
        >
          <button
            type="button"
            onClick={() => {
              resetView();
              if (currentId !== HOME_MAP) setCurrentId(HOME_MAP);
            }}
            aria-label="Home haven"
            title="Home — back to Greenhaven"
            className="border-r border-white/10 px-2 py-1 text-gold transition-colors hover:bg-gold/15"
          >
            <HomeIcon className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => zoomButton(-1)}
            aria-label="Zoom out"
            className="px-2 py-1 font-display text-sm text-gold transition-colors hover:bg-gold/15"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            aria-label="Reset view"
            className="border-x border-white/10 px-2 py-1 font-display text-xs text-gold transition-colors hover:bg-gold/15"
          >
            ⤢
          </button>
          <button
            type="button"
            onClick={() => zoomButton(1)}
            aria-label="Zoom in"
            className="px-2 py-1 font-display text-sm text-gold transition-colors hover:bg-gold/15"
          >
            +
          </button>
        </div>
      </div>

      <div className={cn("grid", selected ? "md:grid-cols-[1fr_20rem]" : "grid-cols-1")}>
        {/* the map stage — pan with drag, zoom with wheel / double-click / buttons */}
        <div
          ref={viewportRef}
          role="application"
          tabIndex={0}
          aria-label={`${map.title} map — drag to pan, scroll or pinch to zoom, arrow keys to move, plus and minus to zoom`}
          style={{
            aspectRatio: `${map.aspect ?? 4 / 3}`,
            // keep the map's ratio (so the percent hotspots stay aligned) but cap
            // its HEIGHT to the viewport so it never dominates the page and needs
            // scrolling — the width follows the ratio and the map is centered
            width: `min(100%, calc(62dvh * ${map.aspect ?? 4 / 3}))`,
          }}
          className={cn(
            // centered; height fits the screen, width follows the map's own ratio
            "relative mx-auto max-w-full touch-none select-none overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/60",
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
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: worldTransform,
              transition: flying ? `transform ${FLY_MS}ms cubic-bezier(.4,0,.2,1)` : "none",
            }}
          >
            {manifest ? (
              <MapCanvas
                id={currentId}
                manifest={manifest}
                zoom={zoom}
                maxZoom={MAX_ZOOM}
                interactive
              />
            ) : showArt ? (
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

          {/* the Long Night, abroad — a creeping dark drawn over the whole map */}
          {nightAbroad && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-[9] motion-safe:animate-pulse"
              style={{
                background: "radial-gradient(120% 90% at 50% 30%, transparent 38%, #0b0616cc 100%)",
              }}
            >
              <div className="absolute left-1/2 top-2 -translate-x-1/2 whitespace-nowrap rounded-sm border border-[#5b4a7a]/70 bg-[#140f1e]/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.2em] text-[#b9a8e6]">
                ☾ The Long Night is abroad
              </div>
            </div>
          )}

          {/* cartouche — only over the relief plate; the paintings carry their own */}
          {!showArt && (
            <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[46%] rounded-sm border border-white/10 bg-black/70 px-3 py-2 backdrop-blur-sm">
              <h3 className="font-display text-base uppercase tracking-[0.12em] text-gold">
                {map.title}
              </h3>
              <p className="mt-1 text-[11px] italic leading-snug text-muted-foreground">
                {map.subtitle}
              </p>
            </div>
          )}

          {/* hotspots (pan & zoom with the art) */}
          <div
            className="absolute inset-0 origin-top-left"
            style={{
              transform: worldTransform,
              transition: flying ? `transform ${FLY_MS}ms cubic-bezier(.4,0,.2,1)` : "none",
              pointerEvents: transit ? "none" : undefined,
            }}
          >
            {/* strategic lines — front lines, caravan routes, and marches */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              {strategic.routes.map((r) => (
                <line
                  key={`route-${r.key}`}
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke="#5fd0c6"
                  strokeOpacity="0.3"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {strategic.marches.map((m) => (
                <line
                  key={`march-${m.key}`}
                  x1={m.x1}
                  y1={m.y1}
                  x2={m.x2}
                  y2={m.y2}
                  stroke="#d8b45a"
                  strokeOpacity="0.5"
                  strokeWidth="1"
                  strokeDasharray="1.5 2.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {strategic.fronts.map((f) => (
                <line
                  key={`front-${f.key}`}
                  x1={f.x1}
                  y1={f.y1}
                  x2={f.x2}
                  y2={f.y2}
                  stroke="#d1603a"
                  strokeOpacity="0.5"
                  strokeWidth="1.5"
                  strokeDasharray="3 2"
                  vectorEffect="non-scaling-stroke"
                  className="motion-safe:animate-pulse"
                />
              ))}
            </svg>

            {map.locations.map((loc) => {
              const face = atlasMarker(map, loc);
              const isSel = selectedId === loc.id;
              const isRealm = loc.type === "realm";
              const isHome = !!loc.home;
              // the continental war: tint each territory by whoever holds it now
              const terr =
                map.kind === "continent" && frontier && loc.id in TERRITORIES
                  ? frontier.control[loc.id as TerritoryId]
                  : null;
              const terrHue = terr ? FACTIONS[terr.owner].hue : null;
              const terrContested =
                terr && frontier ? isContested(frontier, loc.id as TerritoryId) : false;
              const terrMine = terr?.owner === "clan";
              // fog of war on the continent: a realm is known if you hold it, it
              // borders land you hold, you've scouted it, or it's your seat.
              // Everything else lies shrouded until a banner rides out to it.
              const known =
                !terr ||
                map.kind !== "continent" ||
                isHome ||
                terrMine ||
                (state?.discovered?.includes(loc.id) ?? false) ||
                TERRITORIES[loc.id as TerritoryId].adj.some(
                  (a) => frontier?.control[a as TerritoryId]?.owner === "clan",
                );
              const shrouded = !known;
              const terrDev = terr ? Math.round(terr.dev ?? 20) : 0;
              const terrBuilds = terr?.builds
                ? Object.values(terr.builds).reduce((s, n) => s + (n ?? 0), 0)
                : 0;
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
                  {/* the shroud: an unscouted realm reads only as fog until a
                      banner rides out to it */}
                  {shrouded && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        background:
                          "radial-gradient(circle, #0a0810ee 0%, #0a081099 45%, transparent 72%)",
                      }}
                    />
                  )}
                  {/* frontier: a standing aura in the holder's colour, once known */}
                  {!shrouded && terrHue && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        background: `radial-gradient(circle, ${terrHue}55 0%, transparent 70%)`,
                      }}
                    />
                  )}
                  {!shrouded && terrContested && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-white/45 motion-safe:animate-pulse"
                    />
                  )}
                  {/* grip ring — a realm's hold on itself: firm gold when secure,
                      thin and red and unsettled when the border is buckling */}
                  {!shrouded && terr && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full",
                        terr.hold < 40
                          ? "ring-2 ring-destructive/70 motion-safe:animate-pulse"
                          : terr.hold < 75
                            ? "ring-1 ring-gold/50"
                            : "ring-1 ring-gold/80",
                      )}
                      title={`Grip ${Math.round(terr.hold)}`}
                    />
                  )}
                  {isRealm && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute left-1/2 top-1/2 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100",
                        isSel && "opacity-100",
                      )}
                      style={{
                        background: `radial-gradient(circle, ${loc.hue}66 0%, transparent 68%)`,
                      }}
                    />
                  )}
                  {isHome && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-gold/50 motion-safe:animate-pulse"
                      style={{
                        background: "radial-gradient(circle, #e7d7ac55 0%, transparent 70%)",
                      }}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (moved.current) return;
                      if (shrouded) {
                        api?.discover(loc.id); // scouting lifts the shroud
                        setSelectedId(loc.id);
                        return;
                      }
                      setSelectedId((s) => (s === loc.id ? null : loc.id));
                    }}
                    aria-label={
                      shrouded
                        ? "Unscouted realm — ride out to reveal it"
                        : `${loc.name} — ${ATLAS_TYPE_LABEL[loc.type]}`
                    }
                    className={cn(
                      "grid place-items-center border font-display font-semibold shadow-[0_1px_3px_oklch(0_0_0/0.7)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group-hover:scale-125",
                      isRealm ? "h-5 w-5 text-[11px]" : "h-4 w-4 text-[9px]",
                      markerShape(loc.type),
                      shrouded
                        ? "border-white/15 bg-[radial-gradient(circle_at_50%_35%,#171320,#0a0810)] text-white/35"
                        : "text-gold bg-[radial-gradient(circle_at_50%_35%,#2a2114,#0d0a06)]",
                      isSel && "scale-110 ring-2 ring-gold",
                    )}
                  >
                    <span aria-hidden="true">{shrouded ? "?" : face}</span>
                  </button>
                  {/* home haven badge — every player starts here */}
                  {isHome && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-1 -top-1 grid h-3 w-3 place-items-center rounded-full border border-black bg-gold text-[7px] leading-none text-black"
                      title="Home haven"
                    >
                      ⌂
                    </span>
                  )}
                  {/* the King's court at your seat — rank, and a call when charges wait */}
                  {isHome &&
                    state?.court &&
                    (() => {
                      const favor = Math.floor(state.court.favor);
                      const rankTitle = courtRank(courtStanding(state)).title;
                      const ready = state.court.charges.filter(
                        (c) => chargeProgress(state, c).ready,
                      ).length;
                      return (
                        <span
                          aria-hidden="true"
                          className={cn(
                            "pointer-events-none absolute -right-1 -top-1 flex items-center gap-0.5 rounded-[2px] border bg-black/80 px-1 py-px font-display text-[8px] leading-none text-gold",
                            ready > 0
                              ? "border-forge-ember motion-safe:animate-pulse"
                              : "border-gold/70",
                          )}
                          title={`Court: ${rankTitle} · ${favor} favor${ready ? ` · ${ready} charge${ready === 1 ? "" : "s"} ready` : ""}`}
                        >
                          ♔{ready > 0 && <span className="text-forge-ember">{ready}</span>}
                        </span>
                      );
                    })()}
                  {/* hold / march dot in play mode */}
                  {showDot && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border border-black",
                        fighting ? "bg-[#7ea86a]" : "bg-gold motion-safe:animate-ping",
                      )}
                    />
                  )}
                  <div
                    className={cn(
                      "pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-[2px] bg-black/75 px-1.5 py-px text-center font-display text-[10px] opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100",
                      (isSel || isHome) && "opacity-100",
                    )}
                    style={{ color: shrouded ? "#8a86a0" : "#e7d7ac" }}
                  >
                    {shrouded ? "Unscouted" : isHome ? `${loc.name} · Home` : loc.name}
                  </div>
                  {/* clan-held realms wear their development at a glance */}
                  {terrMine && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -left-1 -top-1 flex items-center gap-0.5 rounded-[2px] border border-[#3fb0a6]/70 bg-black/80 px-1 py-px font-display text-[8px] leading-none text-[#5fd0c6]"
                      title={`Development ${terrDev}/100 · ${terrBuilds} built`}
                    >
                      ⬢{terrDev}
                      {terrBuilds > 0 && <span className="text-gold">·{terrBuilds}</span>}
                    </span>
                  )}
                </div>
              );
            })}

            {/* banners in the field — one marker per point, counting any stack */}
            {fieldBanners.map((g) => {
              const many = g.parties.length > 1;
              const fighting = g.parties.some((p) => p.fighting);
              const traveling = !fighting && g.parties.some((p) => p.traveling);
              const allResting = g.parties.every((p) => p.resting);
              const glyph = fighting ? "⚑" : traveling ? "➹" : allResting ? "⌂" : "⚑";
              const single = many ? null : g.parties[0]!;
              return (
                <div
                  key={`${g.x},${g.y}`}
                  className="pointer-events-none absolute z-[6] -translate-x-1/2 -translate-y-full"
                  style={{ left: `${g.x}%`, top: `${g.y}%` }}
                >
                  {/* counter-scale by 1/zoom so the label keeps a constant on-screen
                      size instead of blowing up as the map is zoomed in */}
                  <div
                    style={{
                      transform: `scale(${1 / Math.max(1, zoom)})`,
                      transformOrigin: "bottom center",
                    }}
                  >
                    <div
                      className={cn(
                        "flex items-center gap-1 whitespace-nowrap rounded-[2px] border bg-[#241a0e] px-1 py-0.5 font-display text-[9px] text-gold shadow-[0_2px_4px_oklch(0_0_0/0.6)]",
                        allResting ? "border-gold/40 opacity-90" : "border-gold",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(fighting && "motion-safe:animate-pulse")}
                      >
                        {glyph}
                      </span>
                      {many ? `${g.parties.length} banners` : single!.name}
                    </div>
                    {single && (single.fighting || single.traveling) && (
                      <div className="mt-0.5 h-[2px] w-full bg-black/40">
                        <span
                          className="block h-full bg-gold motion-safe:transition-[width]"
                          style={{ width: `${single.pct}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* battles — a clash of arms burns on every contested border, and
                flares when the Long Night falls on the war */}
            {strategic.clashes.map((c) => (
              <div
                key={`clash-${c.key}`}
                aria-hidden="true"
                className="pointer-events-none absolute z-[6] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                <div style={{ transform: `scale(${1 / Math.max(1, zoom)})` }}>
                  <span
                    className={cn(
                      "grid place-items-center rounded-full border bg-black/70 motion-safe:animate-pulse",
                      nightAbroad
                        ? "h-5 w-5 border-[#ff8a5c] text-[11px] text-[#ffb08a] shadow-[0_0_10px_#ff8a5c99]"
                        : "h-4 w-4 border-[#d1603a]/70 text-[9px] text-[#ff8a5c] shadow-[0_0_6px_oklch(0_0_0/0.7)]",
                    )}
                  >
                    ⚔
                  </span>
                </div>
              </div>
            ))}

            {/* road raids — a red flash where a caravan was skimmed */}
            {strategic.raids.map((r) => (
              <div
                key={`raid-${r.key}`}
                aria-hidden="true"
                className="pointer-events-none absolute z-[7] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${r.x}%`, top: `${r.y}%` }}
              >
                <div style={{ transform: `scale(${1 / Math.max(1, zoom)})` }}>
                  <span className="flex items-center gap-0.5 whitespace-nowrap rounded-[2px] border border-destructive bg-black/80 px-1 py-px font-display text-[8px] leading-none text-destructive motion-safe:animate-pulse">
                    ✷ raided −{Math.round(r.lost)}
                  </span>
                </div>
              </div>
            ))}

            {/* the domain's supply network — node anchors around the seat */}
            {strategic.nodes.map((n) => (
              <div
                key={`node-${n.key}`}
                aria-hidden="true"
                className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${n.x}%`, top: `${n.y}%` }}
                title={n.key}
              >
                <div style={{ transform: `scale(${1 / Math.max(1, zoom)})` }}>
                  <span className="grid h-4 w-4 place-items-center rounded-[3px] border border-[#3fb0a6]/50 bg-black/60 text-[9px] opacity-80">
                    {n.glyph}
                  </span>
                </div>
              </div>
            ))}

            {/* caravans hauling raw to the city, moving along their routes */}
            {strategic.caravans.map((c) => (
              <div
                key={`car-${c.key}`}
                aria-hidden="true"
                className="pointer-events-none absolute z-[6] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${c.x}%`, top: `${c.y}%` }}
              >
                <div style={{ transform: `scale(${1 / Math.max(1, zoom)})` }}>
                  <span className="grid h-4 w-4 place-items-center rounded-full border border-[#5fd0c6]/70 bg-[#0e1a18] text-[9px] shadow-[0_1px_3px_oklch(0_0_0/0.7)]">
                    {c.glyph}
                  </span>
                </div>
              </div>
            ))}

            {/* news pins — the freshest happenings announce themselves on the map */}
            {strategic.alerts.map((a) => (
              <div
                key={`alert-${a.key}`}
                aria-hidden="true"
                className="pointer-events-none absolute z-[8] -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${a.x}%`, top: `${a.y}%` }}
              >
                <div style={{ transform: `scale(${1 / Math.max(1, zoom)})` }}>
                  <span
                    className={cn(
                      "flex -translate-y-5 items-center gap-1 whitespace-nowrap rounded-[3px] border bg-black/85 px-1.5 py-0.5 font-display text-[8px] leading-none",
                      a.rank === 0 && "motion-safe:animate-pulse",
                    )}
                    style={{ borderColor: a.tone, color: a.tone, opacity: 1 - a.rank * 0.28 }}
                  >
                    <span className="text-[10px]">{a.glyph}</span>
                    {a.text}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* fly-in / fly-out overlay: cross-fades the incoming map over the top */}
          {transit && (
            <TransitionOverlay
              transit={transit}
              artFailed={artFailed}
              viewportRef={viewportRef}
              onArtError={(id) => setArtFailed((a) => ({ ...a, [id]: true }))}
            />
          )}

          {/* minimap: the visible window over the whole map, shown when zoomed */}
          {zoom > 1 && (
            <div
              className="pointer-events-none absolute right-2 top-2 z-10 h-[63px] w-[84px] overflow-hidden rounded-sm border border-white/15 bg-black/70"
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

        {/* codex — capped to the map's height and scrolled internally, so a long
            read-out (clash, build orders) never stretches the page past the map */}
        {selected && (
          <aside className="stage-scroll relative flex max-h-[62dvh] flex-col gap-3 overflow-y-auto border-t border-white/10 bg-[#191309] p-4 md:border-l md:border-t-0">
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

            {/* the continental war: who holds this ground, and a chance to take it */}
            {map.kind === "continent" &&
              frontier &&
              selected.id in TERRITORIES &&
              (() => {
                const cell = frontier.control[selected.id as TerritoryId];
                const holder = FACTIONS[cell.owner];
                const mine = cell.owner === "clan";
                // the real levy the clan can throw at this front — gear and
                // mastery lift it, wounds and absent champions sap it, bonds
                // steady it, feuds fracture it (not a bare headcount)
                const warband = state ? warbandPower(state) : null;
                const power = warband?.power ?? 1;
                const cost = contestCost(power); // scales with the levy committed
                const supply = Math.floor(state?.supply ?? 0);
                const canSupply = supply >= cost;
                const commit = async () => {
                  if (!onContest || !state || contesting) return;
                  if (!canSupply) {
                    setContestMsg(
                      `Not enough supply — ${cost} needed. Hold realms to ship more home.`,
                    );
                    return;
                  }
                  setContesting(true);
                  setContestMsg(null);
                  const r = await onContest(selected.id as TerritoryId, power, state.clanName);
                  setContesting(false);
                  if (!r.ok) setContestMsg("The front could not be reached.");
                  else if (r.cooldownMs > 0)
                    setContestMsg(
                      `Your banners are still regrouping — ${Math.ceil(r.cooldownMs / 60000)}m.`,
                    );
                  else {
                    api?.spendSupply(cost);
                    setContestMsg("Your banners throw themselves at the line.");
                  }
                };
                const front = isContested(frontier, selected.id as TerritoryId);
                const dev = Math.round(cell.dev ?? 20);
                const pop = Math.round(cell.pop ?? 12);
                const fertility = REALM_FERTILITY[selected.id as TerritoryId];
                // the realm's live standing, mirroring the sim's own read
                const secure = cell.hold > 55 && !front;
                const peaceful = cell.owner !== "longnight" && secure;
                const rise = peaceful
                  ? Math.round(birthRate(cell, fertility, true) * 1000) / 10
                  : 0;
                const status = front
                  ? { label: "Contested front", tone: "#d1603a" }
                  : mine
                    ? secure
                      ? { label: "Held & at peace", tone: "#7ea86a" }
                      : { label: "Newly taken", tone: "#d8a24a" }
                    : { label: "Rival ground", tone: holder.hue };
                const raise = async (b: BuildingId) => {
                  if (!onBuild || !state || building) return;
                  setBuilding(b);
                  setBuildMsg(null);
                  const r = await onBuild(selected.id as TerritoryId, b, state.clanName);
                  setBuilding(null);
                  if (!r.ok) setBuildMsg("The work could not be ordered.");
                  else if (!r.built) setBuildMsg(r.reason || "That work can't be raised here yet.");
                  else setBuildMsg(`${BUILDINGS[b].label} raised. The realm answers.`);
                };
                return (
                  <div className="flex flex-col gap-2.5 rounded-sm border border-white/10 bg-black/30 p-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 rounded-full"
                          style={{ background: holder.hue }}
                        />
                        Held by <span style={{ color: holder.hue }}>{holder.name}</span>
                      </span>
                      <span
                        className="rounded-[2px] px-1.5 py-px text-[8px] font-semibold uppercase tracking-[0.1em] text-black"
                        style={{ background: status.tone }}
                      >
                        {status.label}
                      </span>
                    </div>

                    {/* the realm's condition: grip, development, people, rise */}
                    <div className="grid grid-cols-2 gap-1.5">
                      <Stat label="Grip" value={`${Math.round(cell.hold)}`} />
                      <Stat label="Development" value={`${dev}/100`} bar={dev / 100} />
                      <Stat label="People" value={`${pop}k`} />
                      <Stat
                        label="Rise / tick"
                        value={peaceful ? `+${rise}%` : mine ? "stalled" : "—"}
                        tone={peaceful ? "#7ea86a" : "#b8b2a4"}
                      />
                    </div>

                    {/* the clash on the ground — who is pushing this realm and how hard */}
                    {(() => {
                      const clash = territoryClash(frontier, selected.id as TerritoryId);
                      if (!clash.attacker || clash.pressure <= 0.02) return null;
                      const trendTone =
                        clash.trend === "falling"
                          ? "#d1603a"
                          : clash.trend === "slipping"
                            ? "#d8a24a"
                            : "#7ea86a";
                      const trendWord =
                        clash.trend === "falling"
                          ? "line breaking"
                          : clash.trend === "slipping"
                            ? "line slipping"
                            : "line holding";
                      return (
                        <div className="flex flex-col gap-1 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <span
                                aria-hidden="true"
                                className="inline-block h-1.5 w-1.5 rounded-full"
                                style={{ background: FACTIONS[clash.attacker].hue }}
                              />
                              {clash.attackerName} presses
                            </span>
                            <span
                              className="font-semibold uppercase tracking-[0.08em]"
                              style={{ color: trendTone }}
                            >
                              {trendWord}
                            </span>
                          </div>
                          <div className="h-1 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round(clash.pressure * 100)}%`,
                                background: `linear-gradient(90deg, ${trendTone}88, ${trendTone})`,
                              }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[9px] tabular-nums text-muted-foreground">
                            <span>foe {Math.round(clash.attackerForce)}</span>
                            <span>defence {Math.round(clash.defence)}</span>
                          </div>
                        </div>
                      );
                    })()}

                    {mine && !peaceful && (
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        {front
                          ? "A realm on the front cannot grow — secure the border and the people will return."
                          : "Newly taken — hold it and the region begins to rise."}
                      </p>
                    )}

                    {onContest && live && !mine && (
                      <>
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>War supply</span>
                          <span
                            className={cn(
                              "tabular-nums",
                              canSupply ? "text-[#5fd0c6]" : "text-destructive",
                            )}
                          >
                            {supply}/{state ? supplyCap(state) : 0} · costs {cost}
                          </span>
                        </div>

                        {/* the levy you'd send — the real warband, so the commit
                            number reads as who actually rides, not a headcount */}
                        {warband && (
                          <div className="flex flex-col gap-1 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-muted-foreground">Your levy</span>
                              <span className="font-semibold tabular-nums text-gold">
                                strength {power}/40
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[9px] tabular-nums text-muted-foreground">
                              <span>{warband.fielded} ride</span>
                              {warband.wounded > 0 && (
                                <span className="text-destructive">{warband.wounded} wounded</span>
                              )}
                              {warband.away > 0 && (
                                <span className="text-[#d8a24a]">{warband.away} away hunting</span>
                              )}
                              {warband.bondPairs > 0 && (
                                <span className="text-[#7ea86a]">
                                  {warband.bondPairs} shield-bond
                                  {warband.bondPairs === 1 ? "" : "s"}
                                </span>
                              )}
                              {warband.rivalPairs > 0 && (
                                <span className="text-destructive">
                                  {warband.rivalPairs} feud{warband.rivalPairs === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                            {warband.away > 0 && (
                              <p className="text-[9px] leading-snug text-muted-foreground/80">
                                Champions on the hunt can&apos;t be levied — recall a banner to ride
                                with full strength.
                              </p>
                            )}
                          </div>
                        )}

                        <button
                          type="button"
                          data-sfx="deploy"
                          disabled={contesting || !canSupply}
                          onClick={commit}
                          className="rounded-sm border border-forge-ember bg-forge-ember/80 py-1.5 font-display text-[11px] uppercase tracking-[0.14em] text-[#160d06] transition enabled:hover:brightness-110 disabled:opacity-40"
                        >
                          {contesting
                            ? "Committing…"
                            : !canSupply
                              ? "Not enough supply"
                              : `Commit to the front · +${power}`}
                        </button>
                        {contestMsg && (
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            {contestMsg}
                          </p>
                        )}
                      </>
                    )}

                    {/* build orders — what you can raise depends on the realm's status:
                        war works on a contested front, development on a peaceful hold */}
                    {onBuild && live && mine && (
                      <div className="flex flex-col gap-1.5">
                        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {front ? "Fortify the front" : "Develop the realm"}
                        </div>
                        <div className="grid grid-cols-1 gap-1.5">
                          {BUILDING_IDS.filter((b) => BUILDINGS[b].war === front).map((b) => {
                            const def = BUILDINGS[b];
                            const have = cell.builds?.[b] ?? 0;
                            const gate = canBuild(frontier, selected.id as TerritoryId, b);
                            const busy = building === b;
                            return (
                              <button
                                key={b}
                                type="button"
                                disabled={!gate.ok || !!building}
                                onClick={() => raise(b)}
                                title={gate.ok ? def.blurb : gate.why}
                                className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/40 px-2 py-1.5 text-left transition enabled:hover:border-gold/60 enabled:hover:bg-gold/10 disabled:opacity-40"
                              >
                                <span aria-hidden="true" className="text-sm leading-none">
                                  {def.glyph}
                                </span>
                                <span className="min-w-0 flex-1">
                                  <span className="flex items-baseline justify-between gap-2">
                                    <span className="font-display text-xs text-gold">
                                      {def.label}
                                    </span>
                                    <span className="shrink-0 text-[9px] tabular-nums text-muted-foreground">
                                      {have}/{def.max}
                                    </span>
                                  </span>
                                  <span className="block truncate text-[9px] text-muted-foreground">
                                    {busy ? "Raising…" : def.blurb}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                        {buildMsg && (
                          <p className="text-[10px] leading-snug text-muted-foreground">
                            {buildMsg}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* home city — its own actions, live only while a banner stands in the hall */}
            {selected.home &&
              onOpenTool &&
              (() => {
                const inCity = state ? bannersInCity(state) : [];
                const atHome = inCity.length > 0;
                const bill = state ? flameRestBill(state) : { wounded: [], gold: 0 };
                const canPayRest =
                  !!state && atHome && bill.wounded.length > 0 && state.gold >= bill.gold;
                // your feudal standing at the King's court, shown at your own seat
                const court = state?.court;
                const standing = state ? courtStanding(state) : 0;
                const cRank = courtRank(standing);
                const cNext = nextCourtRank(standing);
                const cToNext = courtRankProgress(standing);
                const cReady =
                  state && court
                    ? court.charges.filter((c) => chargeProgress(state, c).ready).length
                    : 0;
                const tod = timeOfDay(clock);
                const terrs = frontier ? Object.values(frontier.control) : [];
                const avgDev = terrs.length
                  ? terrs.reduce((n, c) => n + (c.dev ?? 20), 0) / terrs.length
                  : 20;
                const avgPop = terrs.length
                  ? terrs.reduce((n, c) => n + (c.pop ?? 12), 0) / terrs.length
                  : 12;
                const pros = realmProsperity(avgDev, avgPop);
                return (
                  <div className="flex flex-col gap-2">
                    {/* state of the realm — the hour of the day and how Aethyr fares */}
                    <div className="flex items-center justify-between gap-2 rounded-sm border border-white/10 bg-black/30 px-2.5 py-1.5 text-[10px]">
                      <span className="text-muted-foreground">
                        {tod.glyph} Aethyr rests in {tod.label}
                      </span>
                      <span style={{ color: pros.hue }} title={pros.blurb}>
                        The realm is {pros.label}
                      </span>
                    </div>

                    {/* the feudal court — your standing and the crown's charges, in-world */}
                    <button
                      type="button"
                      onClick={() => onOpenTool("court")}
                      className="flex flex-col gap-1.5 rounded-sm border border-gold/25 bg-gold/[0.05] p-2.5 text-left transition hover:border-gold/60 hover:bg-gold/10"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5">
                          <Crown className="h-3.5 w-3.5 text-gold" aria-hidden />
                          <span className="font-display text-xs text-gold">{cRank.title}</span>
                        </span>
                        {cReady > 0 ? (
                          <span className="rounded-[2px] bg-forge-ember px-1.5 py-px text-[9px] font-semibold uppercase tracking-[0.1em] text-[#160d06]">
                            {cReady} charge{cReady === 1 ? "" : "s"} ready
                          </span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                            {Math.floor(court?.favor ?? 0)} favor
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-[3px] flex-1 overflow-hidden rounded-full bg-black/40">
                          <span
                            className="block h-full bg-gradient-to-r from-[#c69a3e] to-gold"
                            style={{ width: `${Math.round(cToNext * 100)}%` }}
                          />
                        </div>
                        <span className="shrink-0 text-[9px] text-muted-foreground">
                          {cNext ? `▸ ${cNext.title}` : "Sovereign"}
                        </span>
                      </div>
                    </button>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                        Your home haven
                      </span>
                      <span
                        className={cn(
                          "rounded-[2px] px-1.5 py-px text-[9px] uppercase tracking-[0.1em]",
                          atHome ? "bg-[#7ea86a] text-black" : "bg-black/50 text-muted-foreground",
                        )}
                      >
                        {atHome ? `${inCity.length} in the hall` : "hall empty"}
                      </span>
                    </div>

                    {!atHome && (
                      <p className="rounded-sm border border-white/10 bg-black/30 px-2 py-1.5 text-[10px] leading-snug text-muted-foreground">
                        No banner stands in the hall. Recall one home to rest, muster and hold
                        court.
                      </p>
                    )}

                    {/* in-world actions on the city itself */}
                    {api && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          disabled={!canPayRest}
                          onClick={() => api.restAtFlameHeal()}
                          title={
                            atHome
                              ? bill.wounded.length
                                ? `Restore the wounded by half — ${bill.gold} gold`
                                : "The garrison is hale"
                              : "No banner in the hall"
                          }
                          className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/40 px-2.5 py-2 text-left transition enabled:hover:border-gold/60 enabled:hover:bg-gold/10 disabled:opacity-40"
                        >
                          <Flame className="h-4 w-4 shrink-0 text-forge-ember" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate font-display text-xs text-gold">
                              Rest at the flame
                            </span>
                            <span className="block truncate text-[9px] text-muted-foreground">
                              {atHome && bill.wounded.length
                                ? `${bill.wounded.length} wounded · ${bill.gold}g`
                                : "Heal the garrison"}
                            </span>
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={!atHome}
                          onClick={() => api.musterMilitia()}
                          title={atHome ? "Fill the hall's empty seats" : "No banner in the hall"}
                          className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/40 px-2.5 py-2 text-left transition enabled:hover:border-gold/60 enabled:hover:bg-gold/10 disabled:opacity-40"
                        >
                          <Users className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                          <span className="min-w-0">
                            <span className="block truncate font-display text-xs text-gold">
                              Muster the militia
                            </span>
                            <span className="block truncate text-[9px] text-muted-foreground">
                              Fill empty seats
                            </span>
                          </span>
                        </button>
                      </div>
                    )}

                    {/* the hall's business — reachable only while a banner is home */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {CITY_ACTIONS.map((a) => {
                        const Icon = a.icon;
                        return (
                          <button
                            key={a.tool}
                            type="button"
                            disabled={!atHome}
                            onClick={() => onOpenTool(a.tool)}
                            title={atHome ? a.hint : "No banner in the hall"}
                            className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/40 px-2.5 py-2 text-left transition enabled:hover:border-gold/60 enabled:hover:bg-gold/10 disabled:opacity-40"
                          >
                            <Icon className="h-4 w-4 shrink-0 text-gold" aria-hidden />
                            <span className="min-w-0">
                              <span className="block truncate font-display text-xs text-gold">
                                {a.label}
                              </span>
                              <span className="block truncate text-[9px] text-muted-foreground">
                                {a.hint}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

            {mode === "play" && selected.level != null && !selected.home && (
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

                {/* the weather over this field right now — where and when to hunt */}
                {(() => {
                  const c = zoneCondition(
                    selZone.id,
                    clock,
                    state ? longNightActive(state, clock) : false,
                  );
                  const risk = conditionRisk(c);
                  return (
                    <div className="flex items-start gap-2 rounded-sm border border-white/10 bg-black/30 px-2 py-1.5">
                      <span aria-hidden="true" className="text-sm leading-none text-gold">
                        {c.glyph}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-[11px] text-gold">{c.name}</span>
                          <span
                            className="rounded-[2px] px-1 py-px text-[8px] font-semibold uppercase tracking-[0.1em] text-black"
                            style={{ background: RISK_COLOR[risk] }}
                          >
                            {RISK_LABEL[risk]}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                          {c.blurb}
                        </p>
                      </div>
                    </div>
                  );
                })()}

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
                        onClick={() => marchLive(selZone.id, p, selected.name, selected.id)}
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
                  onClick={() => enterRegion(selected)}
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

      {/* war-state ticker — the whole front, read at a glance (continent only) */}
      {frontier && ATLAS_MAPS[currentId].kind === "continent" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/10 bg-[#140f1e] px-3 py-1 text-[10px] text-[#c9b06a]">
          <span aria-hidden="true">⚔</span>
          <span>
            {strategic.fronts.length} front{strategic.fronts.length === 1 ? "" : "s"} ablaze
          </span>
          <span>
            · Seat of Vareth held by{" "}
            <span style={{ color: FACTIONS[frontier.control.vareth.owner].hue }}>
              {FACTIONS[frontier.control.vareth.owner].short}
            </span>
          </span>
          {nightAbroad && <span className="text-[#b9a8e6]">· ☾ the Long Night rides</span>}
          {frontierStale && (
            <span
              className="text-[#d8a24a]"
              title="The shared war is out of reach — showing its last-known state"
            >
              · ⚠ out of reach (last known)
            </span>
          )}
        </div>
      )}

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
        <span className="flex flex-wrap items-center gap-3 text-[9px] uppercase tracking-[0.1em]">
          <Legend swatch="rounded-[2px] border-forge-ember" label="Stronghold" />
          <Legend swatch="rounded-full border-gold" label="POI" />
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span aria-hidden="true" className="text-[#ff8a5c]">
              ⚔
            </span>
            Front
          </span>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <span aria-hidden="true" className="text-[#5fd0c6]">
              ●
            </span>
            Caravan
          </span>
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  bar,
  tone,
}: {
  label: string;
  value: string;
  bar?: number;
  tone?: string;
}) {
  return (
    <div className="rounded-sm border border-white/10 bg-black/40 px-2 py-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="text-[8px] uppercase tracking-[0.14em] text-muted-foreground">
          {label}
        </span>
        <span
          className="font-display text-xs tabular-nums text-gold"
          style={tone ? { color: tone } : undefined}
        >
          {value}
        </span>
      </div>
      {bar != null && (
        <div className="mt-1 h-[3px] w-full overflow-hidden rounded-full bg-white/10">
          <span
            className="block h-full bg-gold motion-safe:transition-[width]"
            style={{ width: `${Math.max(0, Math.min(100, bar * 100))}%` }}
          />
        </div>
      )}
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
