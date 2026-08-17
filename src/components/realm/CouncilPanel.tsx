import { advise, ROLE_META, type Advisor, type CouncilContext } from "@/lib/realm/council";
import { Portrait } from "@/components/game/Portrait";
import { GameIcon } from "@/components/game/GameIcon";

const ROLE_ICON: Record<string, Parameters<typeof GameIcon>[0]["name"]> = {
  marshal: "swords",
  chancellor: "scroll",
  treasurer: "coin",
  spymaster: "moon",
  steward: "supply",
};

/**
 * The Royal Council — your persistent advisors. Each reads the same realm and
 * counsels through their own role and temperament. Whom you trust is the game.
 */
export function CouncilPanel({
  council,
  ctx,
  onClose,
}: {
  council: Advisor[];
  ctx: CouncilContext;
  onClose: () => void;
}) {
  return (
    <aside className="panel-ornate pointer-events-auto flex max-h-[80vh] w-96 flex-col rounded-sm backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-forge-frame/40 px-4 py-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            They serve — for now
          </div>
          <h3 className="gilded font-display text-xl leading-tight">The Royal Council</h3>
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
        {council.map((a) => {
          const meta = ROLE_META[a.role];
          return (
            <div key={a.id} className="rounded-sm border border-white/10 bg-black/25 p-2.5">
              <div className="flex items-start gap-2.5">
                <Portrait
                  data={a.portrait}
                  classId={meta.classId}
                  className="h-14 w-14 shrink-0 rounded-sm border border-forge-frame/40"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <GameIcon
                      name={ROLE_ICON[a.role] ?? "banner"}
                      size={13}
                      className="text-gold"
                    />
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {meta.title}
                    </span>
                    <span className="ml-auto text-[9px] capitalize text-[#b9a8e6]">
                      {a.personality}
                    </span>
                  </div>
                  <div className="font-display text-base text-gold leading-tight">{a.name}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-[9px] uppercase tracking-wide text-muted-foreground">
                      Loyalty
                    </span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/40">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${a.loyalty}%`,
                          background:
                            a.loyalty > 60 ? "#7ea86a" : a.loyalty > 35 ? "#d8a24a" : "#d1603a",
                        }}
                      />
                    </div>
                    <span className="text-[9px] tabular-nums text-muted-foreground">
                      {a.loyalty}
                    </span>
                  </div>
                </div>
              </div>
              <p className="mt-2 border-l-2 border-gold/40 pl-2.5 text-[12px] italic leading-snug text-[#e7d7ac]">
                “{advise(a, ctx)}”
              </p>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
