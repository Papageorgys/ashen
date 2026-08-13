import { useEffect, useMemo, useRef, useState } from "react";
import { ITEM_BY_ID, ZONE_BY_ID } from "@/lib/game/data";
import type { GameState, LogEntry, SpoilEntry } from "@/lib/game/engine";
import { ItemIcon } from "@/components/game/ItemIcon";
import { cn } from "@/lib/utils";

const RARITY_RING: Record<SpoilEntry["rarity"], string> = {
  common: "border-border",
  fine: "border-emerald-400/60",
  rare: "border-sky-400/70 shadow-[0_0_12px_-2px_hsl(200_90%_60%/0.7)]",
  epic: "border-gold shadow-[0_0_16px_-2px_var(--gold,#d4af37)]",
};

const RARITY_TEXT: Record<SpoilEntry["rarity"], string> = {
  common: "text-muted-foreground",
  fine: "text-emerald-300",
  rare: "text-sky-300",
  epic: "text-gold",
};

/** The spoils reel — every stack the banners pull off the field, newest first. */
function SpoilsReel({ spoils }: { spoils: SpoilEntry[] }) {
  if (spoils.length === 0) return null;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
          Spoils
        </h3>
        <span className="text-[10px] text-muted-foreground">last {spoils.length}</span>
      </div>
      <ul className="mt-1.5 flex gap-1.5 overflow-x-auto pb-1">
        {spoils.slice(0, 14).map((sp) => (
          <li
            key={sp.id}
            title={`${ITEM_BY_ID[sp.item]?.name ?? sp.item} ×${sp.qty} — ${sp.zone}`}
            className={cn(
              "relative shrink-0 rounded-sm border bg-secondary/40 p-1 motion-safe:animate-scale-in",
              RARITY_RING[sp.rarity],
            )}
          >
            <ItemIcon item={sp.item} size={28} />
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 rounded-sm bg-background/90 px-0.5 text-[9px] tabular-nums",
                RARITY_TEXT[sp.rarity],
              )}
            >
              {sp.qty}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TONE_MARK: Record<LogEntry["tone"], string> = {
  good: "▲",
  bad: "▼",
  info: "•",
};

function clock(at: number) {
  const d = new Date(at);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(
    d.getSeconds(),
  ).padStart(2, "0")}`;
}

/** Banner-by-banner live status: what it hunts and how far into the run it is. */
function RunRows({ state, now }: { state: GameState; now: number }) {
  const rows = state.parties.filter((p) => p.run || p.farming);
  if (rows.length === 0) {
    return (
      <p className="text-xs italic text-muted-foreground">
        No banner is in the field. Set a piece on the war table.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      {rows.map((p) => {
        const zoneId = p.run?.zoneId ?? p.farming!;
        const zone = ZONE_BY_ID[zoneId];
        const dur = zone?.durationMs ?? 1;
        const remaining = p.run ? Math.max(0, p.run.endsAt - now) : 0;
        const pct = p.run ? Math.min(100, 100 - (remaining / dur) * 100) : 100;
        return (
          <div key={p.id} className="rounded-sm border border-border bg-secondary/30 px-2 py-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-display text-xs">{p.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {p.run ? `${(remaining / 1000).toFixed(0)}s` : "returning"}
              </span>
            </div>
            <div className="truncate text-[10px] text-muted-foreground">
              {zone?.name}
              {p.farming ? " · on loop" : " · last run"}
            </div>
            <div className="mt-1 h-1 w-full overflow-hidden rounded-sm bg-secondary">
              <div
                className="h-full bg-gold motion-safe:transition-[width] motion-safe:duration-200"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ExpeditionFeed({ state, now }: { state: GameState; now: number }) {
  const [filter, setFilter] = useState<"all" | "good" | "bad">("all");
  const seen = useRef<Set<string>>(new Set());
  const [fresh, setFresh] = useState<Set<string>>(new Set());

  const entries = useMemo(
    () => (filter === "all" ? state.log : state.log.filter((l) => l.tone === filter)),
    [state.log, filter],
  );

  // mark newly arrived lines so they can animate in once
  useEffect(() => {
    const added = state.log.filter((l) => !seen.current.has(l.id)).map((l) => l.id);
    if (added.length === 0) return;
    for (const id of added) seen.current.add(id);
    setFresh(new Set(added));
    const t = setTimeout(() => setFresh(new Set()), 700);
    return () => clearTimeout(t);
  }, [state.log]);

  return (
    <aside className="panel h-fit rounded-sm p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm uppercase tracking-widest text-muted-foreground">
          Field Report
        </h2>
        <span className="flex h-1.5 w-1.5 items-center">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              state.parties.some((p) => p.run)
                ? "bg-gold motion-safe:animate-ping"
                : "bg-muted-foreground/40",
            )}
          />
        </span>
      </div>

      <div className="mt-2">
        <RunRows state={state} now={now} />
      </div>

      <SpoilsReel spoils={state.spoils ?? []} />

      <div className="mt-3 flex gap-1">
        {(["all", "good", "bad"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition-colors",
              filter === f
                ? "border-primary/60 bg-primary/15 text-primary"
                : "border-border text-muted-foreground hover:border-primary/40",
            )}
          >
            {f === "all" ? "All" : f === "good" ? "Spoils" : "Losses"}
          </button>
        ))}
      </div>

      <ul
        aria-live="polite"
        className="mt-2 max-h-[26rem] space-y-1.5 overflow-y-auto pr-1"
      >
        {entries.map((l) => (
          <li
            key={l.id}
            className={cn(
              "flex gap-1.5 border-l-2 pl-2 text-xs leading-snug",
              l.tone === "good" && "border-gold/60 text-gold",
              l.tone === "bad" && "border-destructive/60 text-destructive",
              l.tone === "info" && "border-border text-muted-foreground",
              fresh.has(l.id) && "motion-safe:animate-fade-in",
            )}
          >
            <span aria-hidden="true" className="shrink-0 opacity-70">
              {TONE_MARK[l.tone]}
            </span>
            <span className="min-w-0">
              <span className="mr-1 text-[10px] tabular-nums opacity-60">{clock(l.at)}</span>
              {l.text}
            </span>
          </li>
        ))}
        {entries.length === 0 && (
          <li className="text-xs italic text-muted-foreground">Nothing reported yet.</li>
        )}
      </ul>
    </aside>
  );
}
