import { useState } from "react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import { townshipEffects } from "@/lib/game/township";
import {
  BUILDINGS,
  BUILDING_TYPES,
  buildCost,
  buildMs,
  canBuildType,
  plotDistrict,
  townWorkers,
  maxStaff,
  PREREQ,
  ADJ_BONUS,
  STAFF_BONUS,
  type Plot,
} from "@/lib/game/township";
import { freeWorkers } from "@/lib/game/logistics";
import type { ClanApi } from "@/hooks/useClanGame";

function mins(ms: number) {
  const m = Math.ceil(ms / 60000);
  return `${m}m`;
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
            <span className="rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-gold">
              🪙 +{Math.round(eff.goldPerHour)}/hr
            </span>
          )}
          {eff.inspirationPerHour > 0 && (
            <span className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[#c9bbe8]">
              ⟡ +{eff.inspirationPerHour.toFixed(1)}/hr
            </span>
          )}
          {eff.supplyPerHour > 0 && (
            <span className="rounded-sm border border-[#3fb0a6]/25 bg-[#3fb0a6]/[0.06] px-2 py-1 text-[#5fd0c6]">
              📦 +{eff.supplyPerHour.toFixed(1)}/hr · cap +{eff.supplyBonus}
            </span>
          )}
          {eff.huntGoldMult > 1 && (
            <span className="rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-gold">
              hunt gold +{Math.round((eff.huntGoldMult - 1) * 100)}%
            </span>
          )}
          {eff.huntXpMult > 1 && (
            <span className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[#e7d7ac]">
              hunt xp +{Math.round((eff.huntXpMult - 1) * 100)}%
            </span>
          )}
          {eff.buildSpeed < 1 && (
            <span className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[#e7d7ac]">
              build −{Math.round((1 - eff.buildSpeed) * 100)}%
            </span>
          )}
          {eff.raidReduction > 0 && (
            <span className="rounded-sm border border-[#7ea86a]/30 bg-[#7ea86a]/[0.06] px-2 py-1 text-[#9cc487]">
              🗼 raids −{Math.round(eff.raidReduction * 100)}%
            </span>
          )}
          <span className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-muted-foreground">
            🪵 {Math.floor(timber)} timber
          </span>
          <span
            className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-muted-foreground"
            title="Idle Domain laborers you can put to work here (staffing lifts a building's output)."
          >
            👷 {idle} idle · {staffed} at work
          </span>
        </div>
      </section>

      {/* the plot grid */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">The Plots</h3>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {town.plots.map((p, i) => (
            <PlotTile
              key={p.id}
              plot={p}
              district={plotDistrict(town, i)}
              now={now}
              selected={sel === p.id}
              onSelect={() => setSel(sel === p.id ? null : p.id)}
            />
          ))}
        </div>
        <p className="mt-2 text-[10px] leading-snug text-muted-foreground">
          District bonus: a building works {Math.round(ADJ_BONUS * 100)}% harder for each finished
          neighbour — pack them together.
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

function PlotTile({
  plot,
  district,
  now,
  selected,
  onSelect,
}: {
  plot: Plot;
  district: number;
  now: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const def = plot.type ? BUILDINGS[plot.type] : null;
  const con = plot.constructing;
  const total = con ? Math.max(1, con.until - con.startedAt) : 1;
  const pct = con ? Math.max(0, Math.min(1, (now - con.startedAt) / total)) : 0;
  const left = con ? Math.max(0, con.until - now) : 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative flex aspect-square flex-col items-center justify-center gap-0.5 rounded-sm border p-1 text-center transition",
        selected ? "border-gold ring-1 ring-gold/50" : "border-white/10 hover:border-gold/40",
        def ? "bg-[radial-gradient(circle_at_50%_30%,#241a10,#0f0b06)]" : "bg-black/25",
      )}
    >
      {def ? (
        <>
          <span className="text-xl leading-none" aria-hidden="true">
            {def.glyph}
          </span>
          <span className="truncate text-[9px] text-[#e7d7ac]">{def.name}</span>
          <span className="text-[8px] tabular-nums text-gold">
            Lv {plot.level}
            {district > 0 && <span className="ml-0.5 text-[#7ea86a]">+{district * 8}%</span>}
          </span>
          {(plot.workers ?? 0) > 0 && (
            <span className="text-[8px] tabular-nums text-[#9cc487]">
              👷 {plot.workers}/{maxStaff(plot)}
            </span>
          )}
        </>
      ) : (
        <span className="text-[10px] text-muted-foreground">empty</span>
      )}
      {con && (
        <div className="absolute inset-x-1 bottom-1">
          <div className="h-1 overflow-hidden rounded-full bg-black/50">
            <div
              className="h-full bg-forge-ember motion-safe:transition-[width]"
              style={{ width: `${Math.round(pct * 100)}%` }}
            />
          </div>
          <div className="mt-0.5 text-[7px] tabular-nums text-forge-ember">{mins(left)}</div>
        </div>
      )}
    </button>
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
          <span className="text-lg" aria-hidden="true">
            {def.glyph}
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
              className="rounded-sm border border-forge-ember bg-forge-ember/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.1em] text-[#160d06] transition enabled:hover:brightness-110 disabled:opacity-40"
            >
              Upgrade to {toLevel} · {cost.gold.toLocaleString()}g · {cost.timber}🪵 · {mins(time)}
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
            <span className="min-w-[2.5rem] text-center text-xs tabular-nums text-[#9cc487]">
              👷 {plot.workers ?? 0}/{maxStaff(plot)}
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
                <span aria-hidden="true">{def.glyph}</span>
                {def.name}
                {!gate.ok && <span aria-hidden="true">🔒</span>}
              </div>
              <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{def.blurb}</p>
              <div className="mt-1 text-[9px] tabular-nums text-muted-foreground">
                {req && !gate.ok ? (
                  <span className="text-[#d8a24a]">Requires {BUILDINGS[req].name}</span>
                ) : (
                  <>
                    {cost.gold.toLocaleString()}g · {cost.timber}🪵 · {mins(time)}
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
