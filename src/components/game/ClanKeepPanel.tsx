import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  KEEP_BUILDINGS,
  canUpgradeKeep,
  keepEffects,
  keepLevel,
  keepUpgradeCost,
  maxHp,
  mendBill,
  clanCapacity,
  type GameState,
} from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

/**
 * The clan keep: the home square on the war table, given real functions.
 * Five halls, each raised with gold and reputation, each paying out a
 * concrete effect the rest of the engine reads.
 */
export function ClanKeepPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const eff = keepEffects(state);
  const bill = mendBill(state);
  const busy = new Set(state.parties.filter((p) => p.run).flatMap((p) => p.memberIds));
  const resting = state.members.filter((m) => !busy.has(m.id));
  const wounded = resting.filter((m) => m.hp < maxHp(m)).length;

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg">Clan Keep</h2>
        <p className="text-xs text-muted-foreground">
          Home square of the war table. Raise its halls to feed every banner you send out —
          {" "}
          {resting.length} champion(s) are resting here right now.
        </p>
      </header>

      {/* standing effects */}
      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Sworn capacity" value={`${state.members.length}/${clanCapacity(state.clanLevel, keepLevel(state, "barracks"))}`} />
        <Stat label="Rest recovery" value={`×${eff.restMult.toFixed(2)}`} />
        <Stat label="Sale price" value={`×${eff.sellMult.toFixed(2)}`} />
        <Stat label="Forge fees" value={`×${eff.forgeMult.toFixed(2)}`} />
        <Stat label="Reputation" value={`×${eff.repMult.toFixed(2)}`} />
      </div>

      {/* keep actions */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="panel rounded-sm p-3">
          <div className="font-display text-sm">Field surgery</div>
          <p className="mt-1 text-xs text-muted-foreground">
            The infirmary patches every resting champion to full at once.
            {wounded > 0
              ? ` ${wounded} wounded · ${bill.gold.toLocaleString()} gold.`
              : " Nobody needs tending."}
          </p>
          <Button
            size="sm"
            className="mt-2"
            disabled={keepLevel(state, "infirmary") < 1 || wounded === 0 || state.gold < bill.gold}
            onClick={() => api.tendWounded()}
          >
            {keepLevel(state, "infirmary") < 1 ? "Infirmary required" : "Tend the wounded"}
          </Button>
        </div>

        <div className="panel rounded-sm p-3">
          <div className="font-display text-sm">Drill session</div>
          <p className="mt-1 text-xs text-muted-foreground">
            Every resting champion pushes their skills on the pells: +{eff.drillXp || 0} mastery xp
            per skill for {eff.drillCost.toLocaleString()} gold.
          </p>
          <Button
            size="sm"
            className="mt-2"
            disabled={!eff.drillXp || state.gold < eff.drillCost}
            onClick={() => api.drill()}
          >
            {eff.drillXp ? "Call the drill" : "Training Yard required"}
          </Button>
        </div>
      </div>

      {/* halls */}
      <div className="grid gap-3 md:grid-cols-2">
        {KEEP_BUILDINGS.map((b) => {
          const lvl = keepLevel(state, b.id);
          const cost = keepUpgradeCost(b, lvl);
          const check = canUpgradeKeep(state, b.id);
          const maxed = lvl >= b.maxLevel;
          return (
            <div key={b.id} className="panel rounded-sm p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2">
                  <span aria-hidden="true" className="text-lg text-gold">
                    {b.sigil}
                  </span>
                  <div>
                    <div className="font-display text-sm">{b.name}</div>
                    <p className="text-xs text-muted-foreground">{b.blurb}</p>
                  </div>
                </div>
                <span className="whitespace-nowrap rounded-sm border border-gold/50 px-1.5 py-0.5 text-[10px] text-gold">
                  Lv {lvl}/{b.maxLevel}
                </span>
              </div>

              <div className="mt-2 flex gap-1" aria-hidden="true">
                {Array.from({ length: b.maxLevel }, (_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 flex-1 rounded-sm",
                      i < lvl ? "bg-gold" : "bg-muted",
                    )}
                  />
                ))}
              </div>

              <p className="mt-2 text-[11px] text-muted-foreground">
                Per level: <span className="text-foreground">{b.perLevel}</span>
              </p>

              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground">
                  {maxed
                    ? "Raised to its full height."
                    : `${cost.gold.toLocaleString()} gold · ${cost.rep} reputation`}
                </span>
                <Button
                  size="sm"
                  variant={check.ok ? "default" : "secondary"}
                  disabled={!check.ok}
                  title={check.ok ? undefined : check.why}
                  onClick={() => api.upgradeKeep(b.id)}
                >
                  {maxed ? "Complete" : `Raise to ${lvl + 1}`}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="panel rounded-sm px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-gold">{value}</div>
    </div>
  );
}
