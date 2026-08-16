import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import {
  FACTIONS,
  TERRITORY_IDS,
  TERRITORIES,
  frontierStandings,
  isContested,
  type FrontierEvent,
} from "@/lib/game/frontier";

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
export function FrontierPanel({ state }: { state: GameState }) {
  const f = state.frontier;
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

  return (
    <div className="space-y-4">
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
