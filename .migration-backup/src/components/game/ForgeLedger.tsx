import { useMemo, useState } from "react";
import { ITEM_BY_ID } from "@/lib/game/data";
import type { GameState } from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { ItemIcon } from "./ItemIcon";

function when(at: number) {
  const d = new Date(at);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** The guild's ledger: every System Forge attempt, what went in, what came out. */
export function ForgeLedger({ state }: { state: GameState }) {
  const [open, setOpen] = useState(false);
  const rows = state.forgeHistory ?? [];

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.attempts += r.attempts;
        acc.successes += r.successes;
        acc.gold += r.goldSpent;
        return acc;
      },
      { attempts: 0, successes: 0, gold: 0 },
    );
  }, [rows]);

  return (
    <div className="panel-ornate rounded-sm p-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-1 text-left"
      >
        <span className="font-display text-sm text-gold">Forging ledger</span>
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {rows.length === 0
            ? "no attempts yet"
            : `${totals.successes}/${totals.attempts} held · ${totals.gold.toLocaleString()} g spent`}
          {" · "}
          {open ? "hide" : "show"}
        </span>
      </button>

      {open && (
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1">
          {rows.length === 0 && (
            <p className="px-1 py-3 text-center text-xs text-muted-foreground">
              The guild has struck nothing for you yet.
            </p>
          )}
          {rows.map((r) => {
            const def = ITEM_BY_ID[r.result];
            const failed = r.successes === 0;
            return (
              <div
                key={r.id}
                className={cn(
                  "flex items-start gap-2 rounded-sm border px-2 py-1.5",
                  failed ? "border-destructive/40 bg-destructive/5" : "border-gold/25 bg-gold/5",
                )}
              >
                <ItemIcon item={r.result} className="mt-0.5 h-7 w-7 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                    <span className="truncate text-xs text-foreground">
                      {def?.name ?? r.result}
                      {r.produced > 0 && (
                        <span className="text-muted-foreground"> ×{r.produced}</span>
                      )}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {when(r.at)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <span className={failed ? "text-destructive" : "text-gold"}>
                      {r.successes}/{r.attempts} held
                    </span>{" "}
                    at {Math.round(r.chance * 100)}% · {r.goldSpent.toLocaleString()} g
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground/80">
                    Used:{" "}
                    {r.inputs
                      .map((i) => `${ITEM_BY_ID[i.item]?.name ?? i.item} ×${i.qty}`)
                      .join(", ")}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
