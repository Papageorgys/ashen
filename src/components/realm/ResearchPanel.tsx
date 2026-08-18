import {
  TECHS,
  TECH_BY_ID,
  isDone,
  canResearch,
  type ResearchBranch,
  type ResearchState,
  type Tech,
} from "@/lib/realm/research";
import { RESOURCE_COLOR, RESOURCE_LABEL } from "@/lib/realm/terrain";
import type { Ledger } from "@/lib/realm/kingdom";
import { GameIcon, type IconName } from "@/components/game/GameIcon";

const BRANCH: Record<ResearchBranch, { name: string; icon: IconName }> = {
  warfare: { name: "Warfare", icon: "swords" },
  fortcraft: { name: "Fortcraft", icon: "tower" },
  logistics: { name: "Logistics", icon: "banner" },
  statecraft: { name: "Statecraft", icon: "scroll" },
};
const ORDER: ResearchBranch[] = ["warfare", "fortcraft", "logistics", "statecraft"];

/**
 * The Research Center — study doctrines that lift the realm for good. One at a
 * time, over days, paid up front. Completed doctrines feed straight into the
 * simulation (stronger units and walls, faster hosts, richer coffers).
 */
export function ResearchPanel({
  research,
  ledger,
  day,
  onStart,
  onClose,
}: {
  research: ResearchState;
  ledger: Ledger;
  day: number;
  onStart: (techId: string) => void;
  onClose: () => void;
}) {
  const cur = research.current;
  const curTech = cur ? TECH_BY_ID[cur.techId] : null;

  const status = (t: Tech) => {
    if (isDone(research, t.id)) return "done";
    if (cur?.techId === t.id) return "researching";
    if (t.requires && !isDone(research, t.requires)) return "locked";
    if (cur) return "busy";
    return canResearch(research, ledger, t) ? "ready" : "poor";
  };

  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[82vh] w-[24rem] flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Doctrines that endure
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Research Center</h3>
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
        {curTech && cur && (
          <div className="rounded-sm border border-gold/25 bg-gold/[0.05] px-2.5 py-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gold">Studying: {curTech.name}</span>
              <span className="tabular-nums text-muted-foreground">
                {Math.max(0, Math.ceil(cur.until - day))}d
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gold/70"
                style={{
                  width: `${Math.min(100, ((day - cur.startedAt) / Math.max(1, cur.until - cur.startedAt)) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}

        {ORDER.map((br) => {
          const techs = TECHS.filter((t) => t.branch === br);
          return (
            <div key={br}>
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                <GameIcon name={BRANCH[br].icon} size={12} className="text-gold" />
                {BRANCH[br].name}
              </div>
              <div className="mt-1.5 space-y-1">
                {techs.map((t) => {
                  const st = status(t);
                  return (
                    <div
                      key={t.id}
                      className="rounded-sm border border-white/10 bg-black/25 p-2.5"
                      style={st === "done" ? { borderColor: "#7ea86a55" } : undefined}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[13px] text-foreground">
                            {st === "done" && (
                              <GameIcon name="spark" size={12} className="text-[#9cc487]" />
                            )}
                            {t.name}
                          </div>
                          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                            {t.blurb}
                          </p>
                        </div>
                        {st === "done" ? (
                          <span className="shrink-0 text-[10px] uppercase text-[#9cc487]">
                            Known
                          </span>
                        ) : st === "researching" ? (
                          <span className="shrink-0 text-[10px] uppercase text-gold">Studying</span>
                        ) : (
                          <button
                            type="button"
                            disabled={st !== "ready"}
                            title={
                              st === "locked"
                                ? `Requires ${TECH_BY_ID[t.requires!]?.name}`
                                : st === "busy"
                                  ? "Another doctrine is being studied"
                                  : st === "poor"
                                    ? "Cannot afford it"
                                    : undefined
                            }
                            onClick={() => onStart(t.id)}
                            className="shrink-0 rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-[10px] text-gold transition enabled:hover:border-gold/60 disabled:opacity-40"
                          >
                            Research
                          </button>
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[9px] tabular-nums text-muted-foreground">
                        {t.gold}g ·{" "}
                        <span style={{ color: RESOURCE_COLOR[t.res] }}>
                          {t.resN} {RESOURCE_LABEL[t.res]}
                        </span>{" "}
                        · {t.days}d
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
