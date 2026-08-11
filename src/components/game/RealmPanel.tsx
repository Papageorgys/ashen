import { CASTLE, RIVALS, garrisonPower, resolveClash } from "@/lib/game/rivals";
import { ZONE_BY_ID, ZONES } from "@/lib/game/data";
import { clanHostPower, siegeReady, type GameState } from "@/lib/game/engine";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export function RealmPanel({
  state,
  api,
}: {
  state: GameState;
  api: {
    contestRival: (rivalId: string, zoneId: string) => void;
    besiegeCastle: () => void;
    collectTax: () => void;
  };
}) {
  const host = clanHostPower(state);
  const rivals = state.rivals ?? [];
  const castle = state.castle;
  const gate = siegeReady(state);
  const holder = castle?.holder;
  const holderName =
    holder === "player"
      ? state.clanName
      : RIVALS.find((r) => r.id === holder)?.name ?? "the crown's garrison";
  const defense = castle ? garrisonPower(castle, rivals) : 0;

  return (
    <div className="space-y-4">
      {/* ------------------------------- the castle ---------------------------- */}
      <section className="panel rounded-sm p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-xl text-gold">{CASTLE.name}</h2>
            <p className="mt-1 max-w-xl text-xs text-muted-foreground">{CASTLE.blurb}</p>
          </div>
          <div className="text-right text-xs">
            <div className="text-muted-foreground">Held by</div>
            <div className={holder === "player" ? "font-display text-gold" : "font-display text-foreground"}>
              {holderName}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Stat label="Your host" value={host.toLocaleString()} />
          <Stat label="Garrison" value={defense.toLocaleString()} />
          <Stat
            label="Tax purse"
            value={holder === "player" ? `${Math.round(castle?.purse ?? 0).toLocaleString()} gold` : "—"}
          />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {holder === "player" ? (
            <>
              <Button size="sm" onClick={api.collectTax} disabled={(castle?.purse ?? 0) < 1}>
                Collect road tax
              </Button>
              <span className="text-xs text-muted-foreground">
                {CASTLE.taxPerHour.toLocaleString()} gold an hour while the gate holds. Rivals will
                come for it.
              </span>
            </>
          ) : (
            <>
              <Button size="sm" onClick={api.besiegeCastle} disabled={!gate.ok}>
                Declare a siege
              </Button>
              <span className="text-xs text-muted-foreground">
                {gate.ok
                  ? `Odds read ${(host / Math.max(1, defense)).toFixed(2)} to one. People will die either way.`
                  : gate.why}
              </span>
            </>
          )}
        </div>
      </section>

      {/* -------------------------------- rivals ------------------------------- */}
      <section className="space-y-3">
        <h3 className="font-display text-lg text-gold">Rival clans</h3>
        {rivals.map((r) => {
          const def = RIVALS.find((x) => x.id === r.id)!;
          const odds = host / Math.max(1, r.power);
          return (
            <article key={r.id} className="panel rounded-sm p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ background: def.color }}
                      aria-hidden
                    />
                    <span className="font-display text-sm text-foreground">{def.name}</span>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {def.banner}
                    </span>
                  </div>
                  <p className="mt-1 max-w-lg text-xs text-muted-foreground">{def.blurb}</p>
                </div>
                <div className="text-right text-xs">
                  <div className="text-muted-foreground">Strength</div>
                  <div className="font-display text-foreground">{r.power.toLocaleString()}</div>
                  <div className="text-muted-foreground">routed {r.routed}×</div>
                </div>
              </div>

              <div className="mt-2 space-y-1">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
                  <span>Hostility</span>
                  <span>{Math.round(r.hostility)}%</span>
                </div>
                <Progress value={r.hostility} className="h-1.5" />
              </div>

              {r.claims.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.claims.map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => api.contestRival(r.id, z)}
                      className="rounded-sm border border-border/60 px-2 py-1 text-xs transition hover:border-gold/60 hover:text-gold"
                      title={`March on ${ZONE_BY_ID[z]?.name} — odds ${odds.toFixed(2)} to one`}
                    >
                      Contest {ZONE_BY_ID[z]?.name ?? z}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  They hold no ground right now. That will not last.
                </p>
              )}
            </article>
          );
        })}
      </section>

      <p className="text-xs text-muted-foreground">
        Contested grounds pay better and kill more. {ZONES.length} hunting grounds exist in the
        realm; every one of them can be claimed while you are not looking.
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border/60 px-3 py-2">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-foreground">{value}</div>
    </div>
  );
}
