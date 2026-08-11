import { CASTLE, RIVALS, garrisonPower, resolveClash } from "@/lib/game/rivals";
import { ZONE_BY_ID, ZONES } from "@/lib/game/data";
import {
  ashenToll,
  clanHostPower,
  longNightActive,
  longNightPressure,
  refineAshValue,
  loanCeiling,
  siegeReady,
  VASSAL_HOUSES,
  vassalPower,
  vassalTithe,
  type GameState,
} from "@/lib/game/engine";
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
    refineAsh: () => void;
    setCastleWindow: (startHour: number | null, hours: number) => void;
    takeLoan: (amount: number) => void;
    repayLoan: () => void;
    swearVassal: (houseId: string) => void;
    releaseVassal: (houseId: string) => void;
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
  const toll = ashenToll(castle);
  const night = longNightActive(state);
  const pressure = longNightPressure(state);

  return (
    <div className="space-y-4">
      {/* ------------------------------ the Long Night ------------------------- */}
      <section
        className={`rounded-sm border p-3 ${
          night ? "border-destructive/60 bg-destructive/10" : "border-border/60"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`font-display text-sm ${night ? "text-destructive" : "text-muted-foreground"}`}
          >
            {night ? "The Long Night is upon the realm" : "The Long Night"}
          </span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {night ? "truce or perish" : `pressure ${Math.round(pressure)}%`}
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-sm border border-border/60 bg-secondary">
          <div
            className={`h-full transition-all ${night ? "bg-destructive animate-pulse" : "bg-sky-400/60"}`}
            style={{ width: `${night ? 100 : pressure}%` }}
          />
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          {night
            ? "The dead walk and the light-fearing things pour out. Rivals press harder — but who holds the line is remembered."
            : "The upper Ash thickens over the season. No one knows the hour it breaks — only that it will."}
        </p>
      </section>

      {/* -------------------------------- raw Ash ------------------------------ */}
      {(state.rawAsh ?? 0) >= 1 && (
        <section className="flex flex-wrap items-center justify-between gap-2 rounded-sm border border-amber-500/40 bg-amber-500/5 p-3">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-widest text-amber-300/90">
              Raw Ash — {Math.round(state.rawAsh ?? 0)}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Raw Ash never settles — a hoard burns off if you sit on it. Refine it into gold before
              it's gone.
            </p>
          </div>
          <Button size="sm" variant="outline" className="h-7 gap-1 px-2" onClick={api.refineAsh}>
            <span className="text-xs">Refine</span>
            <span className="text-[10px] text-muted-foreground">→ {refineAshValue(state)}g</span>
          </Button>
        </section>
      )}

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
                {toll.ramp > 0.02
                  ? `Held ${toll.days.toFixed(1)} days — the Ashenward is ${Math.round(
                      toll.ramp * 100,
                    )}% dimmed. Tithe at ${Math.round(
                      toll.titheFactor * 100,
                    )}%; rivals storm it more often. You cannot hold forever without cost.`
                  : `${CASTLE.taxPerHour.toLocaleString()} gold an hour while the gate holds. Rivals will come for it — and holding too long dims the ward.`}
              </span>
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-border/50 pt-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Vulnerability window
                </span>
                <select
                  className="rounded-sm border border-border/60 bg-background px-1.5 py-1 text-xs"
                  value={castle?.window?.startHour ?? -1}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (v < 0) api.setCastleWindow(null, 4);
                    else api.setCastleWindow(v, castle?.window?.hours ?? 4);
                  }}
                >
                  <option value={-1}>Always open</option>
                  {Array.from({ length: 24 }).map((_, h) => (
                    <option key={h} value={h}>
                      from {h}:00
                    </option>
                  ))}
                </select>
                {castle?.window && (
                  <select
                    className="rounded-sm border border-border/60 bg-background px-1.5 py-1 text-xs"
                    value={castle.window.hours}
                    onChange={(e) =>
                      api.setCastleWindow(castle.window!.startHour, Number(e.target.value))
                    }
                  >
                    {[2, 3, 4, 5, 6, 8].map((h) => (
                      <option key={h} value={h}>
                        for {h}h
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-[11px] text-muted-foreground">
                  {castle?.window
                    ? `Rivals may only storm the seat ${castle.window.startHour}:00–${
                        (castle.window.startHour + castle.window.hours) % 24
                      }:00. Outside it, Vareth is safe.`
                    : "Declare hours and the seat cannot be taken outside them (§2.3)."}
                </span>
              </div>
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

      {/* -------------------------------- the Ledger --------------------------- */}
      <section className="panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg text-gold">The Gilded Compact — Ledger</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            every crown has a price
          </span>
        </div>
        {state.loan ? (
          (() => {
            const overdue = Date.now() >= state.loan.dueAt;
            const days = Math.max(0, (state.loan.dueAt - Date.now()) / 86_400_000);
            return (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0 flex-1 text-xs">
                  <span className={overdue ? "font-display text-destructive" : "font-display text-foreground"}>
                    {state.loan.owed.toLocaleString()} gold owed
                  </span>
                  <span className="text-muted-foreground">
                    {overdue
                      ? " — overdue. The debt compounds and your standing bleeds until it's paid."
                      : ` — due in ${days.toFixed(1)} days.`}
                  </span>
                </div>
                <Button
                  size="sm"
                  onClick={api.repayLoan}
                  disabled={state.gold < state.loan.owed}
                  title={state.gold < state.loan.owed ? `Need ${state.loan.owed} gold` : undefined}
                >
                  Settle the ledger
                </Button>
              </div>
            );
          })()
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 text-xs text-muted-foreground">
              Borrow gold to fund a campaign now, repaid with {Math.round(0.2 * 100)}% interest by
              week's end. Default and the debt compounds. Ceiling {loanCeiling(state).toLocaleString()}g.
            </span>
            {[500, 1000, 2000].filter((a) => a <= loanCeiling(state)).map((a) => (
              <Button key={a} size="sm" variant="outline" onClick={() => api.takeLoan(a)}>
                Borrow {a.toLocaleString()}g
              </Button>
            ))}
          </div>
        )}
      </section>

      {/* -------------------------------- vassals ------------------------------ */}
      <section className="panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-lg text-gold">Vassal houses</h3>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {vassalPower(state) > 0
              ? `+${vassalPower(state).toLocaleString()} defence · +${vassalTithe(state)}g/hr tithe`
              : "sworn to a lord, not a crown"}
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {VASSAL_HOUSES.map((h) => {
            const sworn = (state.vassals ?? []).includes(h.id);
            const canAfford = state.gold >= h.cost;
            const meetsLevel = state.clanLevel >= h.reqLevel;
            return (
              <article
                key={h.id}
                className={`rounded-sm border p-3 ${sworn ? "border-gold/50 bg-gold/5" : "border-border/60"}`}
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-display text-sm text-foreground">{h.name}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {h.power.toLocaleString()} · {h.tithe}g/hr
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{h.blurb}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {sworn ? "sworn to you" : meetsLevel ? `${h.cost.toLocaleString()}g to swear` : `needs clan Lv ${h.reqLevel}`}
                  </span>
                  {sworn ? (
                    <Button size="sm" variant="ghost" onClick={() => api.releaseVassal(h.id)}>
                      Release
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={!meetsLevel || !canAfford}
                      onClick={() => api.swearVassal(h.id)}
                    >
                      Take their oath
                    </Button>
                  )}
                </div>
              </article>
            );
          })}
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
