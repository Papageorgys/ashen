import { Button } from "@/components/ui/button";
import { ITEM_BY_ID, GRADE_CLASS, SLOT_LABEL, splitItemId, type Grade, type ItemDef } from "@/lib/game/data";
import type { GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { ItemTooltip } from "./ItemTooltip";
import { ItemIcon } from "./ItemIcon";
import { DRAG_ITEM } from "@/lib/game/dnd";

const GRADES: Grade[] = ["Low", "NG", "D", "C"];

export function WarehousePanel({ state, api }: { state: GameState; api: ClanApi }) {
  const held = Object.entries(state.inventory)
    .filter(([, qty]) => (qty ?? 0) > 0)
    .map(([id]) => ITEM_BY_ID[id])
    .filter((i): i is ItemDef => !!i);
  const worth = held.reduce((s, i) => s + i.value * (state.inventory[i.id] ?? 0), 0);

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg">Clan Warehouse</h2>
        <p className="text-xs text-muted-foreground">
          Every drop, quest reward and forged piece is stored here for the whole clan. Total stock
          worth {worth.toLocaleString()}g. Drag any gear piece onto a champion to equip it.
        </p>
      </header>

      {held.length === 0 && (
        <p className="text-xs text-muted-foreground">The warehouse is bare. Send a banner out.</p>
      )}

      {GRADES.map((g) => {
        const rows = held.filter((i) => i.grade === g);
        if (rows.length === 0) return null;
        return (
          <div key={g}>
            <h3 className="font-display text-sm text-muted-foreground">{g} grade</h3>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {rows.map((i) => (
                <div
                  key={i.id}
                  draggable={i.kind === "gear"}
                  onDragStart={(e) => {
                    if (i.kind !== "gear") return;
                    e.dataTransfer.setData(DRAG_ITEM, i.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  title={i.kind === "gear" ? "Drag onto a champion to equip" : undefined}
                  className={
                    "panel flex items-center justify-between gap-3 rounded-sm px-3 py-2" +
                    (i.kind === "gear" ? " cursor-grab active:cursor-grabbing" : "")
                  }
                >

                  <ItemTooltip item={i.id} className="flex min-w-0 items-center gap-2">
                    <ItemIcon item={i.id} size={34} />
                    <span className="min-w-0">
                      <span className={GRADE_CLASS[i.grade]}>{i.name}</span>
                      {splitItemId(i.id).quality > 0 && (
                        <span className="ml-1 text-[10px] uppercase tracking-widest text-grade-a">quality</span>
                      )}
                      <span className="ml-2 text-xs text-muted-foreground">
                        ×{state.inventory[i.id]} ·{" "}
                        {i.kind === "gear"
                          ? SLOT_LABEL[i.slot ?? "weapon"]
                          : i.kind === "shot"
                            ? "Consumable"
                            : "Material"}
                      </span>
                    </span>
                  </ItemTooltip>
                  <Button size="sm" variant="ghost" onClick={() => api.sell(i.id)}>
                    Sell {ITEM_BY_ID[i.id]?.value}g
                  </Button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
