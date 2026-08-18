import { forceReport, hasSpy, SPY_COST, type Intel } from "@/lib/realm/intel";
import type { Diplomacy, Stance } from "@/lib/realm/diplomacy";
import type { Army } from "@/lib/realm/army";
import type { World } from "@/lib/realm/types";
import { GameIcon } from "@/components/game/GameIcon";

const STANCE_LABEL: Record<Stance, string> = {
  peace: "Peace",
  war: "At War",
  nap: "Pact",
  alliance: "Allied",
};

/**
 * The Spymaster's table — what your agents (and mere rumour) can tell you of
 * each rival. Without a spy the numbers are estimates with a confidence; place
 * one, and the truth comes back.
 */
export function SpymasterPanel({
  world,
  armies,
  intel,
  dip,
  treasury,
  onPlaceSpy,
  onClose,
}: {
  world: World;
  armies: Army[];
  intel: Intel;
  dip: Diplomacy;
  treasury: number;
  onPlaceSpy: (kingdomId: string) => void;
  onClose: () => void;
}) {
  const playerId = world.playerKingdomId;
  const rivals = world.kingdoms.filter((k) => k.id !== playerId);

  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[80vh] w-96 flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            What your agents can learn
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Spymaster</h3>
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

      <div className="stage-scroll flex-1 space-y-2.5 overflow-y-auto p-3">
        {rivals.map((k) => {
          const rep = forceReport(world, armies, intel, dip, playerId, k.id);
          const spied = hasSpy(intel, k.id);
          return (
            <div key={k.id} className="rounded-sm border border-white/10 bg-black/25 p-2.5">
              <div className="flex items-center gap-2">
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-[2px]"
                  style={{ background: k.color }}
                />
                <span className="min-w-0 flex-1 truncate font-display text-base text-gold">
                  {k.name}
                </span>
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  {STANCE_LABEL[rep.stance]}
                </span>
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
                  <div className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                    Estimated host
                  </div>
                  <div className="font-display text-sm tabular-nums text-foreground">
                    {rep.exact ? "" : "~"}
                    {rep.troops.toLocaleString()} men
                  </div>
                </div>
                <div className="rounded-sm border border-white/10 bg-black/25 px-2 py-1.5">
                  <div className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">
                    Known holdings
                  </div>
                  <div className="font-display text-sm tabular-nums text-foreground">
                    {rep.provinces}
                  </div>
                </div>
              </div>

              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                  Confidence
                </span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${rep.confidence}%`,
                      background: rep.confidence > 80 ? "#7ea86a" : "#d8a24a",
                    }}
                  />
                </div>
                <span className="text-[9px] tabular-nums text-muted-foreground">
                  {rep.confidence}%
                </span>
              </div>

              <div className="mt-2">
                {spied ? (
                  <span className="inline-flex items-center gap-1.5 rounded-sm border border-[#7ea86a]/30 bg-[#7ea86a]/[0.06] px-2 py-1 text-[11px] text-[#9cc487]">
                    <GameIcon name="moon" size={12} />A spy sits in their court — you see all they
                    hold.
                  </span>
                ) : (
                  <button
                    type="button"
                    disabled={treasury < SPY_COST}
                    onClick={() => onPlaceSpy(k.id)}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-gold/30 bg-gold/[0.05] px-2.5 py-1 text-[11px] text-gold transition hover:border-gold/60 disabled:opacity-40"
                  >
                    <GameIcon name="moon" size={12} />
                    Place a spy ({SPY_COST}g)
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
