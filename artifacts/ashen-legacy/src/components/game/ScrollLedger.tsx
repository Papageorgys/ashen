import { useMemo, useState } from "react";
import { ITEM_BY_ID } from "@/lib/game/data";
import type { GameState } from "@/lib/game/engine";
import {
  OUTCOME_LABEL,
  pct,
  type ImprintOutcome,
  type ScrollAttempt,
} from "@/lib/game/scrolls";
import { ItemIcon } from "./ItemIcon";

const TONE: Record<ImprintOutcome, string> = {
  improved: "border-gold/70 text-gold",
  success: "border-emerald-700/70 text-emerald-500",
  fizzle: "border-border/70 text-muted-foreground",
  backfire: "border-destructive/70 text-destructive",
};

const FILTERS: { key: "all" | ImprintOutcome; label: string }[] = [
  { key: "all", label: "All" },
  { key: "improved", label: "Improved" },
  { key: "success", label: "Bound" },
  { key: "fizzle", label: "Ruined" },
  { key: "backfire", label: "Backfire" },
];

const STAT_LABEL = { wit: "WIT", men: "MEN" } as const;

function clock(at: number) {
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function why(a: ScrollAttempt) {
  const d = a.detail;
  const stat = STAT_LABEL[d.decidedBy];
  const edge = d.stat - d.pivot;
  const side = edge === 0 ? "at the pivot" : edge > 0 ? `${edge} above the pivot` : `${Math.abs(edge)} below the pivot`;
  const band =
    d.outcome === "improved"
      ? `rolled ${d.roll.toFixed(3)} inside the improved band (under ${d.threshold.toFixed(3)})`
      : d.outcome === "success"
        ? `rolled ${d.roll.toFixed(3)} inside the bound band (under ${d.threshold.toFixed(3)})`
        : d.outcome === "fizzle"
          ? `rolled ${d.roll.toFixed(3)} — past the weave at ${(d.bands.improved + d.bands.success).toFixed(3)}, but ${stat} kept it outward (under ${d.threshold.toFixed(3)})`
          : `rolled ${d.roll.toFixed(3)} — past every safe band, so the failure turned inward`;
  return `${stat} check: ${d.stat} (${side}) · ${band}`;
}

function Row({ a }: { a: ScrollAttempt }) {
  const [open, setOpen] = useState(a.detail.outcome === "backfire");
  const d = a.detail;
  const hpLost = a.hpBefore - a.hpAfter;
  const mpLost = a.mpBefore - a.mpAfter;

  return (
    <div className={`rounded-sm border bg-background/40 p-2 ${TONE[d.outcome]}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left"
      >
        <ItemIcon item={a.scrollId} size={24} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-foreground">
            {a.memberName} · {a.scrollName}
          </span>
          <span className="block text-[10px] uppercase tracking-widest text-muted-foreground">
            {a.phase === "imprint" ? "Imprint" : "Field reading"} · {clock(a.at)}
          </span>
        </span>
        <span className="shrink-0 text-[10px] uppercase tracking-widest">
          {OUTCOME_LABEL[d.outcome]}
        </span>
      </button>

      {open ? (
        <div className="mt-2 space-y-1.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
          <p className="italic text-foreground/80">{a.note}</p>
          <p>{why(a)}</p>
          <p>
            Bands — improved {pct(d.bands.improved)} · bound {pct(d.bands.success)} · ruined{" "}
            {pct(d.bands.fizzle)} · backfire {pct(d.bands.backfire)}
          </p>
          <p>
            Paid:{" "}
            {[
              a.cost.gold ? `${a.cost.gold}g` : null,
              a.cost.mp ? `${a.cost.mp} MP` : null,
              ...a.cost.inputs.map(
                (i) => `${ITEM_BY_ID[i.item]?.name ?? i.item} ×${i.qty}`,
              ),
            ]
              .filter(Boolean)
              .join(" · ") || "nothing"}
          </p>
          <p>
            HP {a.hpBefore}/{a.maxHp} → {a.hpAfter}/{a.maxHp} (
            {Math.round((a.hpAfter / Math.max(1, a.maxHp)) * 100)}%
            {hpLost > 0 ? `, −${Math.round(hpLost)}` : ""}) · MP {a.mpBefore}/{a.maxMp} →{" "}
            {a.mpAfter}/{a.maxMp} (
            {Math.round((a.mpAfter / Math.max(1, a.maxMp)) * 100)}%
            {mpLost > 0 ? `, −${Math.round(mpLost)}` : ""})
          </p>
          <p>
            {a.scrollName} in the warehouse: {a.stockBefore} → {a.stockAfter}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export function ScrollLedger({
  state,
  memberId,
  limit = 24,
}: {
  state: GameState;
  /** scope the ledger to a single champion */
  memberId?: string;
  limit?: number;
}) {
  const [filter, setFilter] = useState<"all" | ImprintOutcome>("all");
  const [scribe, setScribe] = useState<string>("all");

  const all = useMemo(() => {
    const rows = [...(state.scrollLog ?? [])].reverse();
    return memberId ? rows.filter((r) => r.memberId === memberId) : rows;
  }, [state.scrollLog, memberId]);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of all) map.set(r.memberId, r.memberName);
    return [...map.entries()];
  }, [all]);

  const rows = all
    .filter((r) => filter === "all" || r.detail.outcome === filter)
    .filter((r) => scribe === "all" || r.memberId === scribe)
    .slice(0, limit);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-widest transition ${
              filter === f.key
                ? "border-gold/70 bg-gold/10 text-gold"
                : "border-border/60 text-muted-foreground hover:border-gold/40"
            }`}
          >
            {f.label}
          </button>
        ))}
        {!memberId && names.length > 1 ? (
          <select
            value={scribe}
            onChange={(e) => setScribe(e.target.value)}
            aria-label="Filter by champion"
            className="ml-auto rounded-sm border border-border/60 bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
          >
            <option value="all">Every champion</option>
            {names.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No attempts recorded yet — imprint a scroll or send a banner out carrying vellum.
        </p>
      ) : (
        <div className="grid gap-1.5">
          {rows.map((a) => (
            <Row key={a.id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}
