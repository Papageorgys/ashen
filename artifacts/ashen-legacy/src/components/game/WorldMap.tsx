import { useCallback, useMemo, useState } from "react";
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
        className="relative h-[clamp(280px,calc(100dvh-14rem),640px)] w-full bg-[#0c0a06]"
        role={interactive ? "application" : undefined}
        aria-label={interactive ? "War table: deploy banners across Aethyr" : undefined}
      >
        {/* Aethyr painting — the same artwork the RealmAtlas uses, now the war table base */}
        <img
          src={`${import.meta.env.BASE_URL}maps/aethyr.png`}
          alt="The continent of Aethyr"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
        />

        {/* vignette + gold engraved frame over the painting */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 100 62"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <radialGradient id="mapVignette" cx="50%" cy="50%" r="74%">
              <stop offset="58%" stopColor="#000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000" stopOpacity="0.62" />
            </radialGradient>
          </defs>
          <rect x="0" y="0" width="100" height="62" fill="url(#mapVignette)" />
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
            className="text-[#d8b45a]"
          >
            <circle cx="23" cy="23" r="18" fill="none" stroke="currentColor" strokeWidth="0.6" />
            <circle cx="23" cy="23" r="14" fill="none" stroke="currentColor" strokeWidth="0.3" />
            <path d="M23 5 L25.5 23 L23 41 L20.5 23 Z" fill="currentColor" fillOpacity="0.85" />
            <path d="M5 23 L23 20.5 L41 23 L23 25.5 Z" fill="currentColor" fillOpacity="0.35" />
            <text
              x="23"
              y="4.6"
              textAnchor="middle"
              fill="currentColor"
              fontFamily="Georgia, serif"
              fontSize="5"
            >
              N
            </text>
          </svg>
        </div>

        {/* cartouche — bottom-left so it doesn't overlap the activity strip */}
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-sm border border-[#d8b45a]/40 bg-black/60 px-2 py-1 backdrop-blur-sm">
          <div className="font-display text-[11px] uppercase tracking-[0.28em] text-[#e7d7ac]">
            Aethyr
          </div>
          <div className="text-[9px] italic text-[#8a7a55]">
            three centuries after the Ash — drawn for the clan council
          </div>
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
              "flex h-7 w-7 items-center justify-center border border-[#d8b45a]/70 bg-black/70 text-[13px] text-[#e7d7ac] shadow-[0_1px_4px_oklch(0_0_0/0.7)] backdrop-blur-sm motion-safe:transition-transform",
              focusRing,
              (interactive && picked) || onOpenKeep
                ? "cursor-pointer group-hover:scale-110"
                : "cursor-default",
              hover === HOME_TARGET && "scale-125 border-[#d8b45a] bg-primary/40",
            )}
            {...dropProps(null)}
            onClick={() => {
              if (picked) return drop(null);
              onOpenKeep?.();
            }}
          >
            <span aria-hidden="true">♔</span>
          </button>

          <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center font-display text-[9px] uppercase tracking-widest text-[#e7d7ac] [text-shadow:0_1px_3px_oklch(0_0_0/0.9)]">
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
                  "flex h-6 w-6 items-center justify-center rounded-full border text-[10px] shadow-[0_1px_4px_oklch(0_0_0/0.7)] backdrop-blur-sm motion-safe:transition-transform group-hover:scale-110",
                  focusRing,
                  dungeon
                    ? "border-destructive/70 bg-black/70 text-destructive"
                    : "border-[#d8b45a]/70 bg-black/70 text-[#e7d7ac]",
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
                  className="pointer-events-none absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-[#d8b45a]/60"
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
              <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center font-display text-[9px] italic text-[#e7d7ac] [text-shadow:0_1px_3px_oklch(0_0_0/0.9)]">
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
                  "flex h-6 w-6 items-center justify-center border text-[11px] shadow-[0_1px_4px_oklch(0_0_0/0.7)] backdrop-blur-sm motion-safe:transition-transform group-hover:scale-110",
                  focusRing,
                  l.kind === "castle"
                    ? "border-[#d8b45a] bg-black/70 text-[#e7d7ac]"
                    : "rounded-full border-[#d8b45a]/60 bg-black/70 text-[#b09a68]",
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
              <div className="pointer-events-none mt-0.5 whitespace-nowrap text-center font-display text-[9px] uppercase tracking-wider text-[#e7d7ac] [text-shadow:0_1px_3px_oklch(0_0_0/0.9)]">
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
                "relative flex items-center gap-1 whitespace-nowrap border px-1.5 py-0.5 font-display text-[9px] shadow-[0_1px_4px_oklch(0_0_0/0.7)] backdrop-blur-sm motion-safe:transition-transform",
                focusRing,
                traveling
                  ? "border-dashed border-[#d8b45a]/80 bg-black/75 text-[#e7d7ac]"
                  : zoneId
                    ? "border-[#d8b45a] bg-primary/70 text-[#e7d7ac]"
                    : "border-[#d8b45a]/70 bg-black/75 text-[#e7d7ac]",
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
                  className="absolute inset-x-0 bottom-0 h-[2px] bg-white/10"
                >
                  <span
                    className={cn(
                      "block h-full motion-safe:transition-[width] motion-safe:duration-200",
                      traveling ? "bg-[#d8b45a]" : "bg-gold",
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
        <div className="border-t border-white/10 bg-[#17130d] px-3 py-1.5 text-[11px] italic text-muted-foreground">
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
