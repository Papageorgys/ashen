import { memo, useCallback, useMemo, useState } from "react";
import { LANDMARKS, ZONES, ZONE_POS, ZONE_BY_ID, travelMsTo } from "@/lib/game/data";
import { RIVAL_BY_ID, RIVALS } from "@/lib/game/rivals";
import type { GameState, Party } from "@/lib/game/engine";
import { surgeZones, SURGE_XP_PCT, SURGE_REP_PCT } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { cn } from "@/lib/utils";
import { DRAG_BANNER as DRAG_MIME } from "@/lib/game/dnd";

/** Where a banner piece stands when it is not in the field: the clan keep. */
const HOME = { x: 35, y: 46 };
const HOME_TARGET = "__home";

/** Hand-inked forest clumps (percent coords on the 100x62 plate). */
const TREES = [
  { x: 12, y: 60 },
  { x: 16, y: 66 },
  { x: 20, y: 72 },
  { x: 27, y: 80 },
  { x: 31, y: 74 },
  { x: 34, y: 66 },
  { x: 44, y: 72 },
  { x: 48, y: 78 },
  { x: 52, y: 82 },
  { x: 20, y: 46 },
  { x: 24, y: 40 },
  { x: 36, y: 40 },
  { x: 60, y: 74 },
  { x: 66, y: 78 },
  { x: 72, y: 80 },
  { x: 8, y: 50 },
  { x: 62, y: 46 },
  { x: 56, y: 52 },
  { x: 14, y: 38 },
  { x: 40, y: 86 },
];

/** Mountain ranges: each entry is a ridge line of chevrons. */
const RANGES: { x: number; y: number; n: number; s: number }[] = [
  { x: 62, y: 18, n: 6, s: 1.0 },
  { x: 74, y: 11, n: 5, s: 0.85 },
  { x: 82, y: 42, n: 5, s: 0.9 },
  { x: 46, y: 13, n: 4, s: 0.75 },
  { x: 88, y: 26, n: 4, s: 0.7 },
];

/** Old kingsroads between the settled places (percent coords). */
const ROADS: [number, number, number, number][] = [
  [30, 52, 42, 18],
  [30, 52, 52, 30],
  [52, 30, 68, 68],
  [52, 30, 82, 36],
  [30, 52, 38, 78],
  [68, 68, 88, 52],
];

const COAST =
  "M5 31 C 6 22, 11 15, 19 12 C 24 10, 26 13, 30 12 C 33 11, 33 7, 38 7 C 44 7, 46 11, 51 10 C 55 9, 57 4, 64 5 C 72 6, 74 11, 80 12 C 89 13, 96 19, 95 27 C 94 33, 89 33, 89 37 C 89 42, 94 44, 92 49 C 89 55, 80 57, 73 55 C 67 53, 66 58, 59 59 C 52 60, 49 56, 43 57 C 37 58, 35 61, 29 59 C 22 57, 21 52, 16 50 C 10 47, 4 40, 5 31 Z";

function Ridge({ x, y, n, s }: { x: number; y: number; n: number; s: number }) {
  const yy = y * 0.62;
  return (
    <g className="text-map-ink" stroke="currentColor" strokeWidth={0.18 * s} fill="none">
      {Array.from({ length: n }).map((_, i) => {
        const px = x + i * 2.6 * s - n * 1.3 * s;
        const py = yy + (i % 2 === 0 ? 0 : 0.9 * s);
        const h = (i % 2 === 0 ? 2.6 : 1.9) * s;
        const w = 2.0 * s;
        return (
          <g key={i}>
            <path
              d={`M${px - w} ${py} L${px} ${py - h} L${px + w} ${py}`}
              fill="currentColor"
              fillOpacity="0.06"
            />
            {/* hatching on the shaded flank */}
            <path
              d={`M${px + 0.25} ${py - h + 0.5} L${px + w * 0.75} ${py - 0.2}`}
              strokeWidth={0.1 * s}
            />
            <path
              d={`M${px + 0.6} ${py - h + 1.1} L${px + w * 0.85} ${py - 0.1}`}
              strokeWidth={0.1 * s}
            />
          </g>
        );
      })}
    </g>
  );
}

function Grove({ x, y }: { x: number; y: number }) {
  const yy = y * 0.62;
  return (
    <g className="text-map-forest" fill="currentColor" fillOpacity="0.5">
      <circle cx={x} cy={yy} r="0.75" />
      <circle cx={x + 1.2} cy={yy + 0.5} r="0.6" />
      <circle cx={x - 1.1} cy={yy + 0.55} r="0.55" />
      <circle cx={x + 0.2} cy={yy + 1.1} r="0.5" />
    </g>
  );
}

/** The inked plate never changes — keep it out of every game tick's re-render. */
const MapPlate = memo(function MapPlate() {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox="0 0 100 62"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="foxing">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" result="n" />
          <feColorMatrix in="n" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.16" />
          </feComponentTransfer>
        </filter>
        <radialGradient id="agedEdge" cx="50%" cy="50%" r="72%">
          <stop offset="55%" stopColor="var(--map-parchment)" stopOpacity="0" />
          <stop offset="100%" stopColor="var(--map-parchment-dark)" stopOpacity="0.95" />
        </radialGradient>
        <pattern id="seaHatch" width="2" height="1.6" patternUnits="userSpaceOnUse">
          <path
            d="M0 1.3 H2"
            stroke="var(--map-sea)"
            strokeWidth="0.12"
            strokeOpacity="0.55"
            fill="none"
          />
        </pattern>
        <clipPath id="landClip">
          <path d={COAST} />
        </clipPath>
      </defs>

      {/* parchment + sea hatching */}
      <rect x="0" y="0" width="100" height="62" fill="var(--map-parchment)" />
      <rect x="0" y="0" width="100" height="62" fill="url(#seaHatch)" />

      {/* coastal fringe: repeated offset outlines like an engraved chart */}
      {[0.9, 1.9, 3.0].map((o, i) => (
        <path
          key={o}
          d={COAST}
          fill="none"
          stroke="var(--map-sea)"
          strokeOpacity={0.42 - i * 0.11}
          strokeWidth={0.22}
          transform={`translate(${50 - 50 * (1 + o / 100)} ${31 - 31 * (1 + o / 100)}) scale(${1 + o / 100})`}
        />
      ))}

      {/* landmass */}
      <path
        d={COAST}
        fill="var(--map-land)"
        fillOpacity="0.85"
        stroke="var(--map-ink)"
        strokeWidth="0.35"
      />

      <g clipPath="url(#landClip)">
        {/* rivers */}
        <path
          d="M40 12 C 42 22, 34 28, 36 36 C 38 46, 30 50, 24 58"
          fill="none"
          stroke="var(--map-sea)"
          strokeWidth="0.4"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        <path
          d="M78 16 C 74 26, 80 32, 76 42 C 73 50, 78 54, 84 57"
          fill="none"
          stroke="var(--map-sea)"
          strokeWidth="0.32"
          strokeLinecap="round"
          strokeOpacity="0.8"
        />

        {/* kingsroads */}
        {ROADS.map(([x1, y1, x2, y2]) => (
          <line
            key={`${x1}-${y1}-${x2}-${y2}`}
            x1={x1}
            y1={y1 * 0.62}
            x2={x2}
            y2={y2 * 0.62}
            stroke="var(--map-road)"
            strokeOpacity="0.6"
            strokeWidth="0.22"
            strokeDasharray="1.1 1.0"
          />
        ))}

        {TREES.map((t) => (
          <Grove key={`t${t.x}-${t.y}`} {...t} />
        ))}
        {RANGES.map((r) => (
          <Ridge key={`r${r.x}-${r.y}`} {...r} />
        ))}
      </g>

      {/* foxing + aged edges */}
      <rect x="0" y="0" width="100" height="62" filter="url(#foxing)" opacity="0.5" />
      <rect x="0" y="0" width="100" height="62" fill="url(#agedEdge)" />

      {/* engraved frame */}
      <rect
        x="1"
        y="0.8"
        width="98"
        height="60.4"
        fill="none"
        stroke="var(--map-ink)"
        strokeOpacity="0.6"
        strokeWidth="0.35"
      />
      <rect
        x="2"
        y="1.8"
        width="96"
        height="58.4"
        fill="none"
        stroke="var(--map-ink)"
        strokeOpacity="0.35"
        strokeWidth="0.15"
      />
    </svg>
  );
});

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-map-parchment";

export function WorldMap({
  state,
  api,
  now,
  onOpenKeep,
  className,
}: {
  state: GameState;
  api?: ClanApi;
  /** ticking clock so marching banners can show live run progress */
  now?: number;
  /** opens the clan keep halls when the home square is clicked with no banner lifted */
  onOpenKeep?: (() => void) | undefined;
  className?: string;
}) {
  const [picked, setPicked] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const interactive = !!api;

  /** rotating "hour of high activity" — recomputed as the clock ticks */
  const hourKey = Math.floor((now ?? Date.now()) / 3_600_000);
  const surging = useMemo(() => surgeZones(hourKey * 3_600_000), [hourKey]);
  const surgeLeft = useMemo(() => {
    const ms = 3_600_000 - ((now ?? Date.now()) % 3_600_000);
    const m = Math.floor(ms / 60000);
    return m >= 1 ? `${m}m` : "<1m";
  }, [now]);

  const levelOf = useMemo(() => {
    const map = new Map(state.members.map((m) => [m.id, m.level] as const));
    return map;
  }, [state.members]);

  const pickedParty = useMemo(
    () => state.parties.find((p) => p.id === picked) ?? null,
    [state.parties, picked],
  );

  /** lowest level in the banner — the gate for entering a hunting ground */
  const partyFloor = useCallback(
    (party: Party) => {
      const levels = party.memberIds.map((id) => levelOf.get(id) ?? 1);
      return levels.length ? Math.min(...levels) : 1;
    },
    [levelOf],
  );

  const canDeploy = useCallback(
    (party: Party | null, zoneId: string) => {
      if (!party) return true;
      if (party.memberIds.length === 0) return false;
      const zone = ZONE_BY_ID[zoneId];
      return !!zone && partyFloor(party) >= zone.reqLevel;
    },
    [partyFloor],
  );

  const clock = now ?? Date.now();

  const parties = state.parties.map((p) => {
    // On the march: interpolate the banner along the road from the keep.
    if (p.travel) {
      const dest = ZONE_POS[p.travel.zoneId] ?? HOME;
      const total = travelMsTo(p.travel.zoneId);
      const t = Math.min(1, Math.max(0, 1 - (p.travel.arrivesAt - clock) / total));
      const pos = { x: HOME.x + (dest.x - HOME.x) * t, y: HOME.y + (dest.y - HOME.y) * t };
      return {
        party: p,
        zoneId: p.travel.zoneId,
        pos,
        pct: t * 100,
        fighting: false,
        traveling: true,
      };
    }
    const zoneId = p.run?.zoneId ?? p.farming ?? null;
    const pos = zoneId ? (ZONE_POS[zoneId] ?? HOME) : HOME;
    const dur = zoneId ? (ZONE_BY_ID[zoneId]?.durationMs ?? 1) : 1;
    const pct = p.run ? Math.min(100, Math.max(0, 100 - ((p.run.endsAt - clock) / dur) * 100)) : 0;
    return { party: p, zoneId, pos, pct, fighting: !!p.run, traveling: false };
  });

  /** how many banners are hunting each zone right now — drives the marker pulse */
  const busyZones = new Set(parties.filter((p) => p.fighting && p.zoneId).map((p) => p.zoneId!));

  const drop = useCallback(
    (target: string | null, partyId?: string) => {
      if (!api) return;
      const id = partyId ?? picked;
      if (!id) return;
      const party = state.parties.find((p) => p.id === id);
      setPicked(null);
      setHover(null);
      if (!party) return;

      const deployed = !!(party.run || party.farming);
      if (target === null) {
        if (deployed) {
          api.recallParty(party.id);
          setStatus(`${party.name} recalled to the clan keep.`);
        } else {
          setStatus(`${party.name} is already resting at the keep.`);
        }
        return;
      }
      if (deployed) {
        api.recallParty(party.id);
        setStatus(`${party.name} recalled — set it down again to march elsewhere.`);
        return;
      }
      if (!canDeploy(party, target)) {
        const zone = ZONE_BY_ID[target];
        setStatus(
          party.memberIds.length === 0
            ? `${party.name} has no champions to march.`
            : `${party.name} is too green for ${zone?.name} (Lv ${zone?.reqLevel}+).`,
        );
        return;
      }
      api.sendParty(party.id, target);
      setStatus(`${party.name} marches on ${ZONE_BY_ID[target]?.name}.`);
    },
    [api, picked, state.parties, canDeploy],
  );

  const dropProps = (target: string | null) => {
    if (!interactive) return {};
    const key = target ?? HOME_TARGET;
    return {
      onDragOver: (e: React.DragEvent) => {
        if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move" as const;
        setHover(key);
      },
      onDragLeave: () => setHover((h) => (h === key ? null : h)),
      onDrop: (e: React.DragEvent) => {
        e.preventDefault();
        drop(target, e.dataTransfer.getData(DRAG_MIME) || undefined);
      },
      onClick: () => {
        if (picked) drop(target);
      },
    };
  };

  const targetState = (zoneId: string | null) => {
    if (!picked) return "idle" as const;
    if (zoneId === null) return "ok" as const;
    return canDeploy(pickedParty, zoneId) ? ("ok" as const) : ("blocked" as const);
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-sm border-2 border-map-ink/50 shadow-[0_18px_40px_-24px_oklch(0_0_0/0.9)]",
        className,
      )}
    >
      <div
        className="relative h-[clamp(280px,calc(100dvh-14rem),640px)] w-full bg-map-parchment"
        role={interactive ? "application" : undefined}
        aria-label={interactive ? "War table: deploy banners across the Ashen Realm" : undefined}
      >
        <MapPlate />

        {/* hour of high activity */}
        <div className="pointer-events-none absolute left-2 top-2 z-20 max-w-[70%] rounded-sm border border-gold/50 bg-card/85 px-2 py-1 shadow-sm">
          <div className="font-display text-[10px] uppercase tracking-widest text-gold">
            Hour of high activity · {surgeLeft} left
          </div>
          <div className="text-[10px] text-muted-foreground">
            {surging
              .map((id) => ZONE_BY_ID[id]?.name)
              .filter(Boolean)
              .join(" · ")}{" "}
            — +{SURGE_XP_PCT}% xp, +{SURGE_REP_PCT}% reputation
          </div>
        </div>

        {/* compass rose */}
        <div className="pointer-events-none absolute bottom-3 right-3 opacity-70">
          <svg
            width="58"
            height="58"
            viewBox="0 0 46 46"
            aria-hidden="true"
            focusable="false"
            className="text-map-ink"
          >
            <circle cx="23" cy="23" r="18" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="23" cy="23" r="14" fill="none" stroke="currentColor" strokeWidth="0.3" />
            <path d="M23 5 L25.5 23 L23 41 L20.5 23 Z" fill="currentColor" fillOpacity="0.85" />
            <path d="M5 23 L23 20.5 L41 23 L23 25.5 Z" fill="currentColor" fillOpacity="0.35" />
            <text
              x="23"
              y="4.6"
              textAnchor="middle"
              className="fill-map-ink font-display"
              fontSize="5"
            >
              N
            </text>
          </svg>
        </div>

        {/* cartouche */}
        <div className="pointer-events-none absolute left-3 top-3 border border-map-ink/50 bg-map-parchment/70 px-2 py-1">
          <div className="font-display text-[11px] uppercase tracking-[0.28em] text-map-ink">
            The Ashen Realm
          </div>
          <div className="text-[9px] italic text-map-ink-soft">drawn for the clan council</div>
        </div>

        {/* the clan keep: home square for resting banners */}
        <div
          className="group absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${HOME.x}%`, top: `${HOME.y}%` }}
        >
          <button
            type="button"
            disabled={!interactive && !onOpenKeep}
            aria-label={
              picked
                ? "Recall the chosen banner to the clan keep"
                : onOpenKeep
                  ? "Clan Keep — open its halls"
                  : "Clan Keep"
            }
            className={cn(
              "flex h-7 w-7 items-center justify-center border border-map-ink/70 bg-map-parchment text-[13px] text-map-ink motion-safe:transition-transform",
              focusRing,
              (interactive && picked) || onOpenKeep
                ? "cursor-pointer group-hover:scale-110"
                : "cursor-default",
              hover === HOME_TARGET && "scale-125 border-map-ink bg-primary/40",
            )}
            {...dropProps(null)}
            onClick={() => {
              if (picked) return drop(null);
              onOpenKeep?.();
            }}
          >
            <span aria-hidden="true">♔</span>
          </button>

          <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center font-display text-[9px] uppercase tracking-widest text-map-ink">
            Clan Keep
          </div>
        </div>

        {/* zones */}
        {ZONES.map((z) => {
          const pos = ZONE_POS[z.id];
          if (!pos) return null;
          const dungeon = z.kind === "dungeon";
          const ts = targetState(z.id);
          const tipId = `zone-tip-${z.id}`;
          const busy = busyZones.has(z.id);
          const hot = surging.includes(z.id);
          const claimant = state.rivals?.find((r) => r.claims.includes(z.id));
          const claimDef = claimant ? RIVAL_BY_ID[claimant.id] : undefined;
          return (
            <div
              key={z.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              {busy && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full motion-safe:animate-ping",
                    dungeon ? "bg-destructive/40" : "bg-gold/40",
                  )}
                />
              )}
              <button
                type="button"

                aria-describedby={tipId}
                aria-label={`${z.name} — ${dungeon ? "dungeon" : "experience field"}, level ${z.reqLevel} and up${
                  picked
                    ? ts === "ok"
                      ? ", available for the chosen banner"
                      : ", too dangerous for the chosen banner"
                    : ""
                }`}
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] motion-safe:transition-transform group-hover:scale-110",
                  focusRing,
                  dungeon
                    ? "border-destructive/70 bg-map-parchment text-destructive"
                    : "border-map-ink/70 bg-map-parchment text-map-ink",
                  ts === "ok" && "ring-1 ring-primary/60",
                  ts === "blocked" && "opacity-45",
                  hover === z.id &&
                    ts !== "blocked" &&
                    "scale-125 border-2 border-primary bg-primary/40",
                  hover === z.id && ts === "blocked" && "scale-110 border-2 border-destructive",
                )}
                {...dropProps(z.id)}
              >
                <span aria-hidden="true">{dungeon ? "▲" : "✦"}</span>
              </button>
              {hot && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -left-1.5 -top-1.5 font-display text-[10px] text-gold motion-safe:animate-pulse"
                >
                  ★
                </span>
              )}
              {claimDef && (
                <span
                  aria-hidden="true"
                  title={`Claimed by ${claimDef.name}`}
                  className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-map-ink/60"
                  style={{ background: claimDef.color }}
                />
              )}
              <div
                id={tipId}
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-44 -translate-x-1/2 rounded-sm border border-border bg-card p-2 text-left shadow-lg group-hover:block group-focus-within:block"
              >
                <div className="font-display text-xs text-gold">{z.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {dungeon ? "Dungeon" : "Experience field"} · Lv {z.reqLevel}+ · threat {z.threat}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{z.blurb}</p>
                {hot && (
                  <p className="mt-1 text-[11px] text-gold">
                    High activity this hour: +{SURGE_XP_PCT}% experience, +{SURGE_REP_PCT}%
                    reputation.
                  </p>
                )}
                {claimDef && (
                  <p className="mt-1 text-[11px] text-destructive">
                    Claimed by {claimDef.name} — richer pickings, and their collectors are armed.
                  </p>
                )}
              </div>
              <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center font-display text-[9px] italic text-map-ink-soft">
                {z.name}
              </div>
            </div>
          );
        })}

        {/* towns & castles */}
        {LANDMARKS.map((l) => {
          const tipId = `landmark-tip-${l.id}`;
          return (
            <div
              key={l.id}
              className="group absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${l.pos.x}%`, top: `${l.pos.y}%` }}
            >
              <span
                tabIndex={0}
                role="img"
                aria-label={`${l.name}, ${l.kind === "castle" ? "castle" : "town"}`}
                aria-describedby={tipId}
                className={cn(
                  "flex h-6 w-6 items-center justify-center border text-[11px] motion-safe:transition-transform group-hover:scale-110",
                  focusRing,
                  l.kind === "castle"
                    ? "border-map-ink bg-map-parchment text-map-ink"
                    : "rounded-full border-map-ink/60 bg-map-parchment text-map-ink-soft",
                )}
              >
                <span aria-hidden="true">{l.kind === "castle" ? "♜" : "⌂"}</span>
              </span>
              <div
                id={tipId}
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-full z-30 mt-1 hidden w-44 -translate-x-1/2 rounded-sm border border-border bg-card p-2 text-left shadow-lg group-hover:block group-focus-within:block"
              >
                <div className="font-display text-xs text-gold">{l.name}</div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {l.kind === "castle" ? "Castle" : "Town"}
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{l.blurb}</p>
                {l.id === "ravenhold" && (
                  <p className="mt-1 text-[11px] text-gold">
                    Held by{" "}
                    {state.castle?.holder === "player"
                      ? state.clanName
                      : (RIVALS.find((r) => r.id === state.castle?.holder)?.name ??
                        "the crown's garrison")}
                    .
                  </p>
                )}
              </div>
              <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center font-display text-[9px] uppercase tracking-wider text-map-ink">
                {l.name}
              </div>
            </div>
          );
        })}

        {/* banner pieces — they march to their destination rather than jumping */}
        {parties.map(({ party, zoneId, pos, pct, fighting, traveling }, i) => (
          <div
            key={party.id}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2 motion-safe:transition-[left,top] motion-safe:duration-700 motion-safe:ease-out"
            style={{
              left: `${pos.x + (i % 3) * 3}%`,
              top: `${pos.y - 7 - Math.floor(i / 3) * 5}%`,
            }}
          >
            <button
              type="button"
              draggable={interactive}
              aria-pressed={picked === party.id}
              aria-label={
                zoneId
                  ? `${party.name}, deployed to ${ZONE_BY_ID[zoneId]?.name}. ${interactive ? "Activate to lift this banner." : ""}`
                  : `${party.name}, mustered at the clan keep. ${interactive ? "Activate to lift this banner." : ""}`
              }
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_MIME, party.id);
                e.dataTransfer.effectAllowed = "move";
                setPicked(party.id);
              }}
              onDragEnd={() => {
                setPicked(null);
                setHover(null);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (!interactive) return;
                setPicked((p) => (p === party.id ? null : party.id));
                setStatus(
                  picked === party.id
                    ? "Banner set back down."
                    : `${party.name} lifted — choose a destination.`,
                );
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape" && picked) {
                  setPicked(null);
                  setStatus("Banner set back down.");
                }
              }}
              className={cn(
                "relative flex items-center gap-1 whitespace-nowrap border px-1.5 py-0.5 font-display text-[9px] shadow-sm motion-safe:transition-transform",
                focusRing,
                traveling
                  ? "border-dashed border-map-ink/80 bg-map-parchment/90 text-map-ink"
                  : zoneId
                    ? "border-map-ink bg-primary/70 text-map-ink"
                    : "border-map-ink/70 bg-map-parchment text-map-ink",
                interactive && "cursor-grab active:cursor-grabbing hover:scale-110",
                picked === party.id && "scale-110 ring-2 ring-primary",
              )}
            >
              <span aria-hidden="true" className={cn(fighting && "motion-safe:animate-pulse")}>
                {traveling ? "➹" : "⚑"}
              </span>{" "}
              {party.name}
              {(fighting || traveling) && (
                <span
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-map-ink/20"
                >
                  <span
                    className={cn(
                      "block h-full motion-safe:transition-[width] motion-safe:duration-200",
                      traveling ? "bg-map-road" : "bg-gold",
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </span>
              )}
            </button>
          </div>
        ))}
      </div>

      {interactive && (
        <div className="border-t border-map-ink/40 bg-map-parchment px-3 py-1.5 text-[11px] italic text-map-ink-soft">
          <p aria-live="polite" className="min-h-[1.1em]">
            {status ||
              (picked
                ? "Now set the piece down: choose a field, a dungeon, or the keep to recall."
                : "Drag a banner piece onto a hunting ground to march it — or back to the keep to recall it.")}
          </p>
        </div>
      )}
    </div>
  );
}
