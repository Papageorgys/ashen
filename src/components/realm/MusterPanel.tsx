import { UNIT, troopCount, type Army, type UnitType } from "@/lib/realm/army";
import {
  recruitCost,
  canRecruit,
  currentManpower,
  manpowerCap,
  drillCost,
  DRILL_MAX,
  RECRUIT_LOT,
  type Muster,
} from "@/lib/realm/military";
import { RESOURCE_COLOR, RESOURCE_LABEL } from "@/lib/realm/terrain";
import type { Ledger } from "@/lib/realm/kingdom";
import type { World } from "@/lib/realm/types";
import { GameIcon } from "@/components/game/GameIcon";

const ROSTER: UnitType[] = ["spearmen", "archers", "swordsmen", "heavy", "cavalry", "knights"];

/**
 * The Muster — raise and drill your armies. Recruit unit types (they train over
 * days into your garrison), and pay to level a host's veterancy. Every choice
 * spends real gold, resources and manpower.
 */
export function MusterPanel({
  world,
  ledger,
  armies,
  muster,
  day,
  discount = 0,
  onRecruit,
  onDrill,
  onClose,
}: {
  world: World;
  ledger: Ledger;
  armies: Army[];
  muster: Muster;
  day: number;
  discount?: number;
  onRecruit: (t: UnitType) => void;
  onDrill: (armyId: string) => void;
  onClose: () => void;
}) {
  const playerId = world.playerKingdomId;
  const mine = armies.filter((a) => a.ownerId === playerId);
  const cap = manpowerCap(world, playerId);
  const used = currentManpower(muster, armies, playerId);

  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[82vh] w-[24rem] flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Raise and drill your host
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Muster</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-6 w-6 place-items-center rounded-sm border border-white/15 text-muted-foreground transition hover:border-gold/50 hover:text-gold"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="stage-scroll flex-1 space-y-3 overflow-y-auto p-3">
        {/* manpower */}
        <div className="rounded-sm border border-white/10 bg-black/25 px-2.5 py-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            <span>Manpower under arms</span>
            <span className="tabular-nums text-foreground">
              {used.toLocaleString()} / {cap.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(100, (used / Math.max(1, cap)) * 100)}%`,
                background: used > cap * 0.9 ? "#d1603a" : "#7ea86a",
              }}
            />
          </div>
        </div>

        {/* your hosts — drill to level up */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Your hosts
          </div>
          <div className="mt-1.5 space-y-1.5">
            {mine.map((a) => {
              const vet = Math.floor(a.veterancy ?? 0);
              const cost = drillCost(a.veterancy ?? 0);
              const maxed = vet >= DRILL_MAX;
              return (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-gold">{a.name}</div>
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <span className="tabular-nums">{troopCount(a).toLocaleString()} men</span>
                      <span className="text-[#c9b06a]">
                        {"★".repeat(vet)}
                        {"☆".repeat(DRILL_MAX - vet)}
                      </span>
                      <span>+{Math.round((a.veterancy ?? 0) * 10)}%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={maxed || ledger.treasury < cost || troopCount(a) <= 0}
                    onClick={() => onDrill(a.id)}
                    className="shrink-0 rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-[10px] text-gold transition enabled:hover:border-gold/60 disabled:opacity-40"
                  >
                    {maxed ? "Elite" : `Drill · ${cost}g`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* recruit */}
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Recruit ({RECRUIT_LOT} at a time)
          </div>
          <div className="mt-1.5 space-y-1">
            {ROSTER.map((t) => {
              const cost = recruitCost(t, RECRUIT_LOT, discount);
              const check = canRecruit(ledger, muster, world, armies, playerId, t, RECRUIT_LOT, discount);
              return (
                <div
                  key={t}
                  className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/25 px-2 py-1.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-foreground">{UNIT[t].name}</div>
                    <div className="flex items-center gap-1 text-[10px] tabular-nums text-muted-foreground">
                      {cost.gold}g ·{" "}
                      <span style={{ color: RESOURCE_COLOR[cost.res] }}>
                        {cost.resN} {RESOURCE_LABEL[cost.res]}
                      </span>{" "}
                      · pow {UNIT[t].power}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!check.ok}
                    title={
                      check.reason === "manpower"
                        ? "Not enough people to raise them"
                        : check.reason === "gold"
                          ? "Not enough gold"
                          : check.reason === "resource"
                            ? `Not enough ${RESOURCE_LABEL[cost.res]}`
                            : undefined
                    }
                    onClick={() => onRecruit(t)}
                    className="shrink-0 rounded-sm border border-forge-ember/50 bg-forge-ember/[0.12] px-2.5 py-1 text-[10px] uppercase tracking-wide text-[#e7b892] transition enabled:hover:border-forge-ember disabled:opacity-40"
                  >
                    Recruit
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* training queue */}
        {muster.queue.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              In training
            </div>
            <div className="mt-1.5 space-y-1">
              {muster.queue.map((o, i) => {
                const pct = Math.max(
                  0,
                  Math.min(1, (day - o.startedAt) / Math.max(1, o.until - o.startedAt)),
                );
                return (
                  <div
                    key={i}
                    className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-foreground">
                        {o.count} {UNIT[o.type].name}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.max(0, Math.ceil(o.until - day))}d
                      </span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full bg-forge-ember"
                        style={{ width: `${pct * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
