import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CRAFT_MASTERIES,
  CRAFT_MASTERY_LABEL,
  GRADE_CLASS,
  ITEM_BY_ID,
  RECIPES,
  SLOT_LABEL,
} from "@/lib/game/data";
import {
  canSystemForge,
  slotOf,
  systemForgeChance,
  systemForgeFee,
  type GameState,
} from "@/lib/game/engine";
import { cn } from "@/lib/utils";
import { ItemTooltip } from "./ItemTooltip";
import { ItemIcon } from "./ItemIcon";
import { ForgeLedger } from "./ForgeLedger";
import type { ClanApi } from "@/hooks/useClanGame";

type Mastery = (typeof CRAFT_MASTERIES)[number];

export function SystemForgePanel({ state, api }: { state: GameState; api: ClanApi }) {
  const [tab, setTab] = useState<Mastery>("mats");
  const [selected, setSelected] = useState<string | null>(null);
  const list = useMemo(() => RECIPES.filter((r) => r.mastery === tab), [tab]);
  const recipe = useMemo(
    () => list.find((r) => r.id === selected) ?? list[0],
    [list, selected],
  );

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg text-gold">System Forge</h2>
          <p className="max-w-2xl text-xs text-muted-foreground">
            The town's public smithy. No artisan of your own is needed — the guild works to
            pattern, so every success comes out a <span className="text-foreground">standard</span>{" "}
            piece, never quality-graded. The fee is heavier and the rate is published and fixed.
          </p>
        </div>
        <div className="rounded-sm border border-gold/40 bg-gold/5 px-2 py-1 text-[10px] uppercase tracking-widest text-gold">
          Standard results only
        </div>
      </header>

      <div className="flex flex-wrap gap-1.5">
        {CRAFT_MASTERIES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => {
              setTab(m);
              setSelected(null);
            }}
            className={cn(
              "rounded-sm border px-3 py-1 text-[10px] uppercase tracking-widest transition",
              tab === m
                ? "border-gold/70 bg-gold/10 text-gold"
                : "border-border/60 text-muted-foreground hover:border-gold/40",
            )}
          >
            {CRAFT_MASTERY_LABEL[m]}
          </button>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="panel-ornate max-h-[26rem] space-y-1 overflow-y-auto rounded-sm p-2">
          {list.map((r) => {
            const def = ITEM_BY_ID[r.result];
            const ok = canSystemForge(state, r.id).ok;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelected(r.id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm border px-2 py-1.5 text-left transition",
                  recipe?.id === r.id
                    ? "border-gold/70 bg-gold/10"
                    : "border-border/50 hover:border-gold/40",
                  !ok && "opacity-60",
                )}
              >
                <ItemIcon item={r.result} size={28} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block truncate text-sm", GRADE_CLASS[def?.grade ?? "NG"])}>
                    {def?.name ?? r.result}
                    {r.qty && r.qty > 1 ? ` ×${r.qty}` : ""}
                  </span>
                  <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                    {slotOf(r.result) ? SLOT_LABEL[slotOf(r.result)!] : "Material"} ·{" "}
                    {Math.round(systemForgeChance(state, r.id) * 100)}%
                  </span>
                </span>
                <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                  {systemForgeFee(state, r.id).toLocaleString()} g
                </span>
              </button>
            );
          })}
        </div>

        {recipe && (
          <aside className="panel-ornate space-y-3 self-start rounded-sm p-3">
            <div className="flex items-center gap-2">
              <ItemTooltip item={recipe.result}>
                <span className="inline-flex">
                  <ItemIcon item={recipe.result} size={44} />
                </span>
              </ItemTooltip>
              <div className="min-w-0">
                <div
                  className={cn(
                    "truncate font-display text-sm",
                    GRADE_CLASS[ITEM_BY_ID[recipe.result]?.grade ?? "NG"],
                  )}
                >
                  {ITEM_BY_ID[recipe.result]?.name}
                </div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Standard pattern · quality 0
                </div>
              </div>
            </div>

            <ul className="space-y-1">
              {recipe.inputs.map((i) => {
                const have = state.inventory[i.item] ?? 0;
                return (
                  <li key={i.item} className="flex items-center gap-2 text-xs">
                    <ItemTooltip item={i.item}>
                      <span className="inline-flex">
                        <ItemIcon item={i.item} size={22} />
                      </span>
                    </ItemTooltip>
                    <span className="min-w-0 flex-1 truncate">{ITEM_BY_ID[i.item]?.name}</span>
                    <span
                      className={cn(
                        "tabular-nums",
                        have >= i.qty ? "text-muted-foreground" : "text-destructive",
                      )}
                    >
                      {have}/{i.qty}
                    </span>
                  </li>
                );
              })}
            </ul>

            <dl className="grid grid-cols-2 gap-1 text-[11px]">
              <dt className="text-muted-foreground">Success rate</dt>
              <dd className="text-right tabular-nums text-foreground">
                {Math.round(systemForgeChance(state, recipe.id) * 100)}%
              </dd>
              <dt className="text-muted-foreground">Guild fee</dt>
              <dd className="text-right tabular-nums text-foreground">
                {systemForgeFee(state, recipe.id).toLocaleString()} g
              </dd>
              <dt className="text-muted-foreground">Result</dt>
              <dd className="text-right text-foreground">Standard, always</dd>
            </dl>

            {(() => {
              const check = canSystemForge(state, recipe.id);
              return (
                <div className="space-y-1.5">
                  <Button
                    className="w-full"
                    disabled={!check.ok}
                    onClick={() => api.systemForge(recipe.id, 1)}
                  >
                    Forge
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    disabled={!check.ok}
                    onClick={() => api.systemForge(recipe.id, 5)}
                  >
                    Forge ×5
                  </Button>
                  {!check.ok && (
                    <p className="text-center text-[11px] text-destructive">{check.why}</p>
                  )}
                </div>
              );
            })()}
          </aside>
        )}
      </div>

      <ForgeLedger state={state} />
    </section>
  );
}

