import { useState } from "react";
import type { GameState } from "@/lib/game/engine";
import { townshipEffects } from "@/lib/game/township";
import {
  BUILDINGS,
  BUILDING_TYPES,
  buildCost,
  buildMs,
  canBuildType,
  townWorkers,
  maxStaff,
  PREREQ,
  ADJ_BONUS,
  STAFF_BONUS,
  type Plot,
} from "@/lib/game/township";
import { freeWorkers } from "@/lib/game/logistics";
import { HoldfastMap } from "@/components/game/HoldfastMap";
import { GameIcon, type IconName } from "@/components/game/GameIcon";
import type { ClanApi } from "@/hooks/useClanGame";

function mins(ms: number) {
  const m = Math.ceil(ms / 60000);
  return `${m}m`;
}

/** Which crafted icon stands for each building in menus and chips. */
const BUILDING_ICON: Record<string, IconName> = {
  market: "market",
  granary: "supply",
  guildhall: "anvil",
  counting_house: "coin",
  war_shrine: "flame",
  library: "scroll",
  watchtower: "tower",
};

const CHIP_TONE: Record<string, string> = {
  gold: "border-gold/25 bg-gold/[0.05] text-gold",
  violet: "border-[#8878b8]/25 bg-[#8878b8]/[0.06] text-[#c9bbe8]",
  teal: "border-[#3fb0a6]/25 bg-[#3fb0a6]/[0.06] text-[#5fd0c6]",
  green: "border-[#7ea86a]/30 bg-[#7ea86a]/[0.06] text-[#9cc487]",
  ash: "border-white/10 bg-black/30 text-[#e7d7ac]",
  muted: "border-white/10 bg-black/30 text-muted-foreground",
};

/** A small stat chip: a crafted icon + value, tinted as one unit. */
function Chip({
  tone,
  icon,
  title,
  children,
}: {
  tone: keyof typeof CHIP_TONE | string;
  icon: IconName;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded-sm border px-2 py-1 ${CHIP_TONE[tone] ?? CHIP_TONE["muted"]}`}
    >
      <GameIcon name={icon} size={13} />
      {children}
    </span>
  );
}

/**
 * The Township — the civic building sim. A grid of plots on which you raise and
 * upgrade buildings over real time (a construction queue with progress), each
 * paying passive gold, inspiration or supply, or sharpening the hunt.
 */
export function TownshipPanel({
  state,
  api,
  now,
}: {
  state: GameState;
  api: ClanApi;
  now: number;
}) {
  const town = state.township;
  const [sel, setSel] = useState<string | null>(null);
  const eff = townshipEffects(state);
  const timber = state.domain?.stock.timber ?? 0;

  if (!town)
    return <p className="text-sm text-muted-foreground">The township has not been laid.</p>;

  const plot = town.plots.find((p) => p.id === sel) ?? null;
  const built = town.plots.filter((p) => p.level > 0).length;
  const staffed = townWorkers(town);
  const idle = Math.max(0, (state.domain ? freeWorkers(state.domain) : 0) - staffed);

  return (
    <div className="space-y-4">
      {/* the town at a glance */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              The town around your seat
            </div>
            <h2 className="gilded font-display text-2xl">The Township</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {built}/{town.plots.length} plots raised. Buildings cost gold and Domain timber, and
              go up over time.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
          {eff.goldPerHour > 0 && (
            <Chip tone="gold" icon="coin">
              +{Math.round(eff.goldPerHour)}/hr
            </Chip>
          )}
          {eff.inspirationPerHour > 0 && (
            <Chip tone="violet" icon="spark">
              +{eff.inspirationPerHour.toFixed(1)}/hr
            </Chip>
          )}
          {eff.supplyPerHour > 0 && (
            <Chip tone="teal" icon="supply">
              +{eff.supplyPerHour.toFixed(1)}/hr · cap +{eff.supplyBonus}
            </Chip>
          )}
          {eff.huntGoldMult > 1 && (
            <Chip tone="gold" icon="coin">
              hunt gold +{Math.round((eff.huntGoldMult - 1) * 100)}%
            </Chip>
          )}
          {eff.huntXpMult > 1 && (
            <Chip tone="ash" icon="flame">
              hunt xp +{Math.round((eff.huntXpMult - 1) * 100)}%
            </Chip>
          )}
          {eff.buildSpeed < 1 && (
            <Chip tone="ash" icon="anvil">
              build −{Math.round((1 - eff.buildSpeed) * 100)}%
            </Chip>
          )}
          {eff.raidReduction > 0 && (
            <Chip tone="green" icon="tower">
              raids −{Math.round(eff.raidReduction * 100)}%
            </Chip>
          )}
          <Chip tone="muted" icon="timber">
            {Math.floor(timber)} timber
          </Chip>
          <Chip
            tone="muted"
            icon="worker"
            title="Idle Domain laborers you can put to work here (staffing lifts a building's output)."
          >
            {idle} idle · {staffed} at work
          </Chip>
        </div>
      </section>

      {/* the holdfast — the town drawn as a walled map */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">The Holdfast</h3>
        <div className="mt-3">
          <HoldfastMap
            state={state}
            town={town}
            now={now}
            selected={sel}
            onSelect={(id) => setSel(sel === id ? null : id)}
          />
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          Roads bind finished neighbours into a district: a building works{" "}
          {Math.round(ADJ_BONUS * 100)}% harder for each one it borders — pack them together.
        </p>
      </section>

      {/* the selected plot's actions */}
      {plot && (
        <section className="panel rounded-sm p-4">
          <PlotActions plot={plot} state={state} api={api} timber={timber} idle={idle} now={now} />
        </section>
      )}
    </div>
  );
}

function PlotActions({
  plot,
  state,
  api,
  timber,
  idle,
  now,
}: {
  plot: Plot;
  state: GameState;
  api: ClanApi;
  timber: number;
  idle: number;
  now: number;
}) {
  const buildSpeed = townshipEffects(state).buildSpeed;
  if (plot.constructing) {
    const left = Math.max(0, plot.constructing.until - now);
    return (
      <div className="text-xs text-muted-foreground">
        <span className="text-gold">{plot.type ? BUILDINGS[plot.type].name : "The works"}</span> is
        under construction — ready in ~{mins(left)}.
      </div>
    );
  }

  // a built plot: upgrade or raze
  if (plot.type && plot.level > 0) {
    const def = BUILDINGS[plot.type];
    const maxed = plot.level >= def.maxLevel;
    const toLevel = plot.level + 1;
    const cost = buildCost(plot.type, toLevel);
    const time = buildMs(plot.type, toLevel, buildSpeed);
    const afford = state.gold >= cost.gold && timber >= cost.timber;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-sm border border-gold/25 bg-gold/[0.05] text-gold">
            <GameIcon name={BUILDING_ICON[plot.type] ?? "home"} size={20} />
          </span>
          <div>
            <div className="font-display text-sm text-gold">
              {def.name} · Level {plot.level}
            </div>
            <p className="text-[11px] text-muted-foreground">{def.blurb}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {!maxed && (
            <button
              type="button"
              disabled={!afford}
              onClick={() => plot.type && api.buildTownship(plot.id, plot.type)}
              className="inline-flex items-center gap-1 rounded-sm border border-forge-ember bg-forge-ember/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[#160d06] transition enabled:hover:brightness-110 disabled:opacity-40"
            >
              Upgrade to {toLevel} · {cost.gold.toLocaleString()}g · {cost.timber}
              <GameIcon name="timber" size={12} /> · {mins(time)}
            </button>
          )}
          {maxed && (
            <span className="rounded-sm border border-gold/40 bg-gold/[0.05] px-3 py-1.5 text-[11px] text-gold">
              Built to its limit
            </span>
          )}
          <button
            type="button"
            onClick={() => api.razeTownship(plot.id)}
            className="rounded-sm border border-destructive/50 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-destructive transition hover:bg-destructive/10"
          >
            Raze
          </button>
        </div>
        {/* staffing — borrow idle Domain laborers to lift this building's output */}
        <div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-2">
          <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Laborers
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              data-sfx="off"
              disabled={(plot.workers ?? 0) <= 0}
              onClick={() => api.staffTownship(plot.id, -1)}
              className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-sm text-muted-foreground transition enabled:hover:border-gold/50 disabled:opacity-30"
              aria-label="Recall a laborer"
            >
              −
            </button>
            <span className="inline-flex min-w-[2.5rem] items-center justify-center gap-1 text-xs tabular-nums text-[#9cc487]">
              <GameIcon name="worker" size={12} />
              {plot.workers ?? 0}/{maxStaff(plot)}
            </span>
            <button
              type="button"
              data-sfx="deploy"
              disabled={idle <= 0 || (plot.workers ?? 0) >= maxStaff(plot)}
              onClick={() => api.staffTownship(plot.id, 1)}
              className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-sm text-gold transition enabled:hover:border-gold/50 disabled:opacity-30"
              aria-label="Assign a laborer"
            >
              +
            </button>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {idle} idle · each laborer +{Math.round(STAFF_BONUS * 100)}% output
          </span>
        </div>
      </div>
    );
  }

  // an empty plot: choose what to raise
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Raise a building here
      </div>
      <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
        {BUILDING_TYPES.map((t) => {
          const def = BUILDINGS[t];
          const cost = buildCost(t, 1);
          const time = buildMs(t, 1, buildSpeed);
          const gate = canBuildType(state.township, t);
          const afford = state.gold >= cost.gold && timber >= cost.timber;
          const req = PREREQ[t];
          return (
            <button
              key={t}
              type="button"
              disabled={!afford || !gate.ok}
              onClick={() => api.buildTownship(plot.id, t)}
              title={gate.ok ? def.blurb : gate.why}
              className="rounded-sm border border-white/10 bg-black/20 p-2 text-left transition enabled:hover:border-gold/60 disabled:opacity-40"
            >
              <div className="flex items-center gap-1.5 text-sm text-gold">
                <GameIcon name={BUILDING_ICON[t] ?? "home"} size={16} />
                {def.name}
                {!gate.ok && <GameIcon name="lock" size={12} className="text-muted-foreground" />}
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{def.blurb}</p>
              <div className="mt-1 flex items-center gap-1 text-[9px] tabular-nums text-muted-foreground">
                {req && !gate.ok ? (
                  <span className="text-[#d8a24a]">Requires {BUILDINGS[req].name}</span>
                ) : (
                  <>
                    {cost.gold.toLocaleString()}g · {cost.timber}
                    <GameIcon name="timber" size={11} /> · {mins(time)}
                  </>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
