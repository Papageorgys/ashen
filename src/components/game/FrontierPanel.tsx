import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { supplyCap, type GameState } from "@/lib/game/engine";
import {
  FACTIONS,
  TERRITORY_IDS,
  TERRITORIES,
  frontierStandings,
  isContested,
  territoriesOf,
  frontierObjectives,
  nightPhase,
  REALM_BOON,
  type FrontierEvent,
  type FrontierState,
  type TerritoryId,
} from "@/lib/game/frontier";
import { realmProsperity, nightOmen } from "@/lib/game/living";

const KIND_GLYPH: Record<FrontierEvent["kind"], string> = {
  conquest: "⚔",
  siege: "♜",
  nightfall: "☾",
  muster: "⚑",
};

/**
 * The War — the grand-strategy read-out. Who holds what across Aethyr, who holds
 * the seat of Castle Vareth, and the chronicle of the front as it moves. The war
 * advances on its own clock; this is the window onto it.
 */
export function FrontierPanel({
  state,
  frontier,
}: {
  state: GameState;
  frontier?: FrontierState | null;
}) {
  const f = frontier ?? state.frontier;
  const standings = useMemo(() => (f ? frontierStandings(f) : []), [f]);

  if (!f) {
    return (
      <p className="text-sm text-muted-foreground">
        The war for Aethyr has not yet been drawn. Return to the field and it will begin.
      </p>
    );
  }

  const vareth = f.control.vareth;
  const varethHolder = FACTIONS[vareth.owner];

  const clanHeld = territoriesOf(f, "clan");
  const night = nightPhase(f.tick);
  const omen = nightOmen(night.active, night.ticksLeft);
  const objectives = frontierObjectives(f);

  return (
    <div className="space-y-4">
      {/* the Long Night — a shared antagonist all players must repel */}
      {night.active && (
        <section className="rounded-sm border border-[#5b4a7a]/70 bg-[#1a1426] p-4">
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="text-lg text-[#b9a8e6]">
              ☾
            </span>
            <h2 className="font-display text-base text-[#c9bbe8]">The Long Night is abroad</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The dark rises across Aethyr and claws at every border. Commit to the fronts it holds
            and drive it back — before it overruns the realms. It lifts in ~{night.ticksLeft * 20}m.
          </p>
        </section>
      )}

      {/* a forewarning when the dark is near but not yet abroad */}
      {!night.active && omen && (
        <p className="rounded-sm border border-[#5b4a7a]/40 bg-[#140f1e] px-3 py-2 text-[11px] italic leading-snug text-[#b9a8e6]">
          ☾ {omen}
        </p>
      )}

      {/* logistics — supply shipped home by held realms, spent to commit */}
      <section className="rounded-sm border border-[#3fb0a6]/20 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            War Supply
          </span>
          <span className="text-xs tabular-nums text-[#5fd0c6]">
            {Math.floor(state.supply ?? 0)} / {supplyCap(state)}
          </span>
        </div>
        <div className="mt-1 h-[4px] w-full overflow-hidden rounded-full bg-black/40">
          <span
            className="block h-full bg-[#3fb0a6]"
            style={{
              width: `${Math.min(100, ((state.supply ?? 0) / Math.max(1, supplyCap(state))) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">
          {clanHeld.length > 0
            ? "Your realms ship supply home — spend it to commit banners to the front."
            : "Hold realms on the frontier to ship supply home. Committing to a front spends it."}
        </p>
      </section>

      {/* the payoff — per-realm war spoils feeding the clan's hunts */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          Your Banner
        </div>
        {clanHeld.length > 0 ? (
          <div className="mt-2 space-y-1.5">
            <p className="text-sm text-muted-foreground">
              Your banner holds{" "}
              <span className="text-[#5fd0c6]">
                {clanHeld.length} {clanHeld.length === 1 ? "realm" : "realms"}
              </span>
              . Each grants its own boon to every hunt:
            </p>
            {clanHeld.map((id) => {
              const b = REALM_BOON[id as TerritoryId];
              // spoils scale with the realm's development: 0.5x .. 1.5x
              const dev = Math.round(f.control[id as TerritoryId]?.dev ?? 20);
              const mult = 0.5 + Math.max(0, Math.min(100, dev)) / 100;
              const parts = [
                b.gold ? `+${Math.round(b.gold * mult * 100)}% gold` : "",
                b.essence ? `+${Math.round(b.essence * mult * 100)}% essence` : "",
                b.xp ? `+${Math.round(b.xp * mult * 100)}% xp` : "",
                b.find ? `+${Math.round(b.find * mult)} find` : "",
              ].filter(Boolean);
              return (
                <div
                  key={id}
                  className="flex items-center justify-between gap-2 rounded-sm border border-[#3fb0a6]/25 bg-[#3fb0a6]/[0.06] px-2.5 py-1.5"
                >
                  <span className="min-w-0 text-xs">
                    <span className="text-[#5fd0c6]">{b.label}</span>
                    <span className="text-muted-foreground"> — {b.blurb}</span>
                    <span className="mt-0.5 flex items-center gap-1.5">
                      <span className="h-[3px] w-16 overflow-hidden rounded-full bg-black/40">
                        <span className="block h-full bg-[#3fb0a6]" style={{ width: `${dev}%` }} />
                      </span>
                      <span className="text-[9px] tabular-nums text-muted-foreground">
                        dev {dev}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] tabular-nums text-gold">
                    {parts.join(" · ")}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            Your banner holds no ground yet. Commit to a front on the war map to take a realm — each
            one grants a distinct boon to every hunt you make.
          </p>
        )}
      </section>

      {/* war objectives — the collective goals of the whole realm */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          War Objectives
        </h3>
        <div className="mt-3 space-y-1.5">
          {objectives.map((o) => (
            <div key={o.id} className="flex items-start gap-2">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-px grid h-4 w-4 shrink-0 place-items-center rounded-[3px] border text-[9px]",
                  o.done
                    ? "border-[#7ea86a] bg-[#7ea86a]/20 text-[#9fce88]"
                    : "border-white/20 text-transparent",
                )}
              >
                ✓
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className={cn("text-xs", o.done ? "text-[#9fce88]" : "text-foreground")}>
                    {o.label}
                  </span>
                  {o.progress && (
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {o.progress.have}/{o.progress.need}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">{o.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* the prize */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          The Contested Seat
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-full"
            style={{ background: varethHolder.hue }}
          />
          <h2 className="font-display text-xl text-gold">Castle Vareth</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Held by <span style={{ color: varethHolder.hue }}>{varethHolder.name}</span>. Whoever
          holds the seat taxes every road in Aethyr — and every rival remembers it.
        </p>
      </section>

      {/* standings */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          The Powers of Aethyr
        </h3>
        <div className="mt-3 space-y-1.5">
          {standings.map((row) => {
            const total = TERRITORY_IDS.length;
            const pct = Math.round((row.territories / total) * 100);
            return (
              <div key={row.faction} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: row.def.hue }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-xs" style={{ color: row.def.hue }}>
                      {row.def.name}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {row.territories} {row.territories === 1 ? "hold" : "holds"} · pw {row.power}
                    </span>
                  </div>
                  <div className="mt-0.5 h-[3px] w-full overflow-hidden rounded-full bg-black/40">
                    <span
                      className="block h-full motion-safe:transition-[width]"
                      style={{ width: `${pct}%`, background: row.def.hue }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {standings.length === 0 && (
            <p className="text-xs text-muted-foreground">The map lies quiet — for now.</p>
          )}
        </div>
      </section>

      {/* the map of holdings, as a list */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">The Front</h3>
        <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
          {TERRITORY_IDS.map((id) => {
            const cell = f.control[id];
            const owner = FACTIONS[cell.owner];
            const front = isContested(f, id);
            const pros = realmProsperity(cell.dev ?? 20, cell.pop ?? 12);
            return (
              <div
                key={id}
                className="flex items-center justify-between gap-2 rounded-sm border border-border/50 bg-black/20 px-2.5 py-1.5"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: owner.hue }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-xs">{TERRITORIES[id].name}</span>
                    <span className="block text-[10px]" style={{ color: owner.hue }}>
                      {owner.short}
                    </span>
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span
                    className="text-[8px] uppercase tracking-wider"
                    style={{ color: pros.hue }}
                    title={pros.blurb}
                  >
                    {pros.label}
                  </span>
                  {front && (
                    <span className="rounded-[2px] bg-white/10 px-1 text-[8px] uppercase tracking-wider text-white/80">
                      front
                    </span>
                  )}
                  <div className="h-1.5 w-10 overflow-hidden rounded-full bg-black/40" title="Grip">
                    <span
                      className={cn("block h-full", cell.hold < 40 ? "bg-destructive" : "bg-gold")}
                      style={{ width: `${Math.max(0, Math.min(100, cell.hold))}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* the chronicle of the war */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          Dispatches from the Front
        </h3>
        <div className="mt-3 space-y-1.5">
          {f.events.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No border has moved yet. The powers gather their strength.
            </p>
          )}
          {f.events.slice(0, 24).map((e) => (
            <div key={e.id} className="flex items-start gap-2 text-xs">
              <span
                aria-hidden="true"
                className="mt-px shrink-0"
                style={{ color: e.faction ? FACTIONS[e.faction].hue : "#c9b06a" }}
              >
                {KIND_GLYPH[e.kind]}
              </span>
              <span className="text-muted-foreground">{e.text}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
