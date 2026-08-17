import { useState } from "react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import { CLASS_BY_ID, ROLE_LABEL, type Role } from "@/lib/game/data";
import { TRAITS, traitsFor, type TraitDef } from "@/lib/game/traits";

/**
 * The Warband — where champions take their trait: a chosen build passive that
 * plugs into the Proving's combat (conditions, formation, momentum) and follows
 * them into the field. One trait each; theirs to change as they season.
 */
export function WarbandPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const [open, setOpen] = useState<string | null>(null);
  const roster = [...state.members].sort((a, b) => b.level - a.level);

  return (
    <div className="space-y-3">
      <section className="panel-ornate rounded-sm p-4">
        <h2 className="font-display text-lg text-gold">The Warband</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Every seasoned champion may take one <span className="text-gold">trait</span> — a passive
          that shapes how they fight. Most of its weight lands in the Proving; a lighter share
          follows them into the field. Traits open as a champion levels.
        </p>
      </section>

      <div className="space-y-2">
        {roster.map((m) => {
          const role = (CLASS_BY_ID[m.classId]?.role ?? "blade") as Role;
          const available = traitsFor(role, m.level);
          const cur = m.trait ? TRAITS[m.trait] : null;
          const isOpen = open === m.id;
          return (
            <div key={m.id} className="panel rounded-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate font-display text-sm text-gold">
                    {m.name}
                    {m.title ? <span className="text-gold/70"> {m.title}</span> : null}
                  </div>
                  <div className="text-[11px] capitalize text-muted-foreground">
                    {ROLE_LABEL[role]} · Lv {m.level}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {cur ? (
                    <span className="rounded-sm border border-gold/40 bg-gold/10 px-2 py-0.5 text-[11px] text-gold">
                      {cur.name}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">No trait</span>
                  )}
                  {available.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : m.id)}
                      className="rounded-sm border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-gold transition hover:border-gold"
                    >
                      {isOpen ? "Close" : "Choose"}
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">Unlocks with levels</span>
                  )}
                </div>
              </div>

              {cur && !isOpen && (
                <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{cur.blurb}</p>
              )}

              {isOpen && (
                <div className="mt-2 space-y-1.5">
                  {available.map((t) => (
                    <TraitRow
                      key={t.id}
                      def={t}
                      chosen={m.trait === t.id}
                      onPick={() => {
                        api.setTrait(m.id, m.trait === t.id ? null : t.id);
                        setOpen(null);
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {roster.length === 0 && (
          <p className="text-xs text-muted-foreground">No champions sworn yet.</p>
        )}
      </div>
    </div>
  );
}

function TraitRow({ def, chosen, onPick }: { def: TraitDef; chosen: boolean; onPick: () => void }) {
  const field = [
    def.field.gold ? `+${Math.round(def.field.gold * 100)}% gold` : "",
    def.field.xp ? `+${Math.round(def.field.xp * 100)}% xp` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        "flex w-full items-start gap-2 rounded-sm border p-2 text-left transition",
        chosen ? "border-gold bg-gold/10" : "border-border/60 bg-black/20 hover:border-gold/50",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px]",
          chosen ? "border-gold bg-gold/20 text-gold" : "border-white/20 text-transparent",
        )}
      >
        ✓
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-display text-xs text-gold">{def.name}</span>
          {field && <span className="shrink-0 text-[9px] tabular-nums text-gold/70">{field}</span>}
        </div>
        <p className="text-[11px] leading-snug text-muted-foreground">{def.blurb}</p>
      </div>
    </button>
  );
}
