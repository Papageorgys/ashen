import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";
import {
  COURT_RANKS,
  CROWN_RANK,
  THE_KING,
  THE_REALM,
  courtRank,
  courtRankIndex,
  courtStanding,
  nextCourtRank,
  courtRankProgress,
  courtEffects,
  chargeProgress,
  BOONS,
  BOON_IDS,
  canPetition,
  charterSupply,
  musterLaborers,
  type ChargeKind,
} from "@/lib/game/court";
import { throneWord, courtSeason, rivalHouses } from "@/lib/game/living";

const KIND_GLYPH: Record<ChargeKind, string> = {
  hunt: "⚔",
  patrol: "🜁",
  tithe: "⚖",
  levy: "⚑",
  muster: "🛡",
  ennoble: "♜",
  bounty: "☠",
};

const KIND_LABEL: Record<ChargeKind, string> = {
  hunt: "Hunt",
  patrol: "Patrol",
  tithe: "Tithe",
  levy: "Levy",
  muster: "Muster",
  ennoble: "Ennoblement",
  bounty: "Bounty",
};

/**
 * The Court — the home realm's feudal ladder. You are sworn to the King of the
 * Crownlands; answer his charges to earn favor, climb the vassal ranks, and — in
 * the end — take the Ashen Throne for your own house. Mirror of The War abroad.
 */
export function CourtPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const court = state.court;
  const favor = Math.floor(court?.favor ?? 0); // the spendable purse
  const standing = Math.floor(courtStanding(state)); // cumulative — drives rank
  const rank = courtRank(standing);
  const rankIndex = courtRankIndex(standing);
  const next = nextCourtRank(standing);
  const toNext = courtRankProgress(standing);
  const eff = courtEffects(state);
  const crowned = !!court?.crowned || rankIndex >= CROWN_RANK;

  const charges = useMemo(() => court?.charges ?? [], [court?.charges]);

  const now = Date.now();
  const dayIdx = Math.floor(now / 86400000);
  const weekIdx = Math.floor(now / (7 * 86400000));
  const word = throneWord(dayIdx);
  const season = courtSeason(weekIdx);
  const houses = useMemo(() => rivalHouses(dayIdx, standing), [dayIdx, standing]);
  // where your house stands among the King's vassals (by cumulative standing)
  const ranking = useMemo(
    () =>
      [...houses, { name: "Your House", favor: standing, scheme: "" }]
        .sort((a, b) => b.favor - a.favor)
        .findIndex((h) => h.name === "Your House") + 1,
    [houses, standing],
  );

  return (
    <div className="space-y-4">
      {/* the sovereign and your standing before them */}
      <section className="panel-ornate rounded-sm p-4">
        <div className="text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
          {crowned ? "The Ashen Throne" : `Sworn to ${THE_KING}`}
        </div>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <h2 className="font-display text-xl text-gold">{rank.title}</h2>
          <span className="shrink-0 text-[11px] tabular-nums text-gold">
            {favor} favor <span className="text-muted-foreground">to spend</span>
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Your house holds <span className="text-[#e7d7ac]">{rank.holding}</span>.{" "}
          {crowned ? `${THE_REALM} answer to your word now.` : rank.grant}
        </p>

        {/* the climb to the next rung */}
        {next ? (
          <div className="mt-3">
            <div className="flex items-baseline justify-between text-[11px] text-muted-foreground">
              <span>
                Next: <span className="text-gold">{next.title}</span>
              </span>
              <span className="tabular-nums">
                {standing}/{next.favor}
              </span>
            </div>
            <div className="mt-1 h-[5px] w-full overflow-hidden rounded-full bg-black/40">
              <span
                className="block h-full bg-gradient-to-r from-[#c69a3e] to-gold motion-safe:transition-[width]"
                style={{ width: `${Math.round(toNext * 100)}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-sm border border-gold/40 bg-gold/[0.06] px-3 py-2 text-xs text-gold">
            You sit the throne of {THE_REALM}. There is no higher seat to climb to.
          </div>
        )}

        {/* the pension standing pays */}
        {rankIndex > 0 && (
          <p className="mt-2 text-[11px] tabular-nums text-muted-foreground">
            Court pension:{" "}
            <span className="text-gold">+{Math.round((eff.goldMult - 1) * 100)}% gold</span> ·{" "}
            <span className="text-gold">+{Math.round((eff.repMult - 1) * 100)}% reputation</span> on
            every hunt.
          </p>
        )}
      </section>

      {/* royal boons — what the crown's favor BUYS: the sink that ties standing
          back into the war, the roster and the domain */}
      <section className="panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
            Petition the Crown
          </h3>
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {favor} favor to spend
          </span>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Spend the favor you&apos;ve earned — your standing at court is untouched by it.
        </p>
        <div className="mt-3 space-y-2">
          {BOON_IDS.map((id) => {
            const def = BOONS[id];
            const gate = canPetition(state, id);
            const locked = rankIndex < def.minRank;
            const effect =
              id === "charter"
                ? `+${charterSupply(rankIndex)} war supply`
                : id === "healers"
                  ? "mends every wound"
                  : `+${musterLaborers(rankIndex)} domain laborers`;
            return (
              <div
                key={id}
                className={cn(
                  "rounded-sm border p-2.5",
                  locked
                    ? "border-border/40 bg-black/10 opacity-60"
                    : "border-border/60 bg-black/20",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border border-white/10 bg-black/40 text-sm"
                  >
                    {def.glyph}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-sm text-gold">{def.name}</span>
                      <span className="shrink-0 text-[10px] tabular-nums text-gold">
                        {def.cost} favor
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {def.blurb}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] tabular-nums text-[#7ea86a]">{effect}</span>
                  <button
                    type="button"
                    disabled={!gate.ok}
                    onClick={() => api.petitionBoon(id)}
                    title={gate.ok ? def.blurb : gate.why}
                    className="rounded-sm border border-gold/50 bg-gold/[0.08] px-3 py-1 font-display text-[11px] uppercase tracking-[0.12em] text-gold transition enabled:hover:bg-gold/20 disabled:opacity-40"
                  >
                    {locked ? `${COURT_RANKS[def.minRank]!.title}` : "Petition"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* the living court — the word from the throne and the season's mood */}
      <section className="rounded-sm border border-gold/20 bg-black/30 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Word from the Throne
          </span>
          <span
            className="rounded-[2px] px-1.5 py-px text-[9px] uppercase tracking-[0.08em]"
            style={{
              background: season.favorMult >= 1 ? "#7ea86a" : "#d1603a",
              color: "#160d06",
            }}
            title={`${season.blurb} (favor ×${season.favorMult})`}
          >
            {season.name}
          </span>
        </div>
        <p className="mt-1 text-xs italic leading-snug text-[#e7d7ac]">“{word}”</p>
        <p className="mt-1 text-[10px] text-muted-foreground">{season.blurb}</p>
      </section>

      {/* the King's charges — the missions you answer to rise */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          {crowned ? "Royal Campaigns" : "The King's Charges"}
        </h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {crowned
            ? "The realm's work, set by your own hand. Answer them for favor and coin."
            : "Answer these to earn the crown's favor. Progress is tallied as you play."}
        </p>
        <div className="mt-3 space-y-2">
          {charges.map((c) => {
            const prog = chargeProgress(state, c);
            const pct = Math.round((prog.have / prog.need) * 100);
            const reward = [
              `+${c.favor} favor`,
              c.gold ? `${c.gold}g` : "",
              c.rep ? `${c.rep} rep` : "",
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <div
                key={c.id}
                className={cn(
                  "rounded-sm border p-2.5",
                  prog.ready ? "border-gold/60 bg-gold/[0.06]" : "border-border/60 bg-black/20",
                )}
              >
                <div className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-[3px] border border-white/10 bg-black/40 text-sm text-gold"
                  >
                    {KIND_GLYPH[c.kind]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-display text-sm text-gold">{c.title}</span>
                      <span className="shrink-0 text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
                        {KIND_LABEL[c.kind]}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                      {c.flavor}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <div className="h-[4px] flex-1 overflow-hidden rounded-full bg-black/40">
                    <span
                      className={cn("block h-full", prog.ready ? "bg-gold" : "bg-[#6f8f6a]")}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                    {prog.have}/{prog.need}
                  </span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-[10px] tabular-nums text-gold">{reward}</span>
                  <button
                    type="button"
                    disabled={!prog.ready}
                    onClick={() => api.claimCharge(c.id)}
                    className="rounded-sm border border-forge-ember bg-forge-ember/80 px-3 py-1 font-display text-[11px] uppercase tracking-[0.12em] text-[#160d06] transition enabled:hover:brightness-110 disabled:opacity-40"
                  >
                    {c.kind === "tithe" && prog.ready ? `Pay ${c.need}g` : "Answer"}
                  </button>
                </div>
              </div>
            );
          })}
          {charges.length === 0 && (
            <p className="text-xs text-muted-foreground">
              The King has no charge for you at this hour.
            </p>
          )}
        </div>
      </section>

      {/* the rival houses climbing beside you — a living court of schemers */}
      <section className="panel rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
            Rival Houses
          </h3>
          <span className="text-[10px] text-muted-foreground">
            Your house stands <span className="text-gold">#{ranking}</span> at court
          </span>
        </div>
        <div className="mt-3 space-y-1.5">
          {houses
            .slice()
            .sort((a, b) => b.favor - a.favor)
            .map((h) => (
              <div
                key={h.name}
                className="flex items-center justify-between gap-2 rounded-sm border border-border/50 bg-black/20 px-2.5 py-1.5"
              >
                <span className="min-w-0 text-xs">
                  <span className="text-[#e7d7ac]">{h.name}</span>
                  <span className="text-muted-foreground"> — {h.scheme}</span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-[10px] tabular-nums",
                    h.favor > favor ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {h.favor}
                </span>
              </div>
            ))}
        </div>
      </section>

      {/* the whole vassal ladder, so the climb is legible */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
          The Vassal Ladder
        </h3>
        <div className="mt-3 space-y-1">
          {COURT_RANKS.map((r) => {
            const reached = rankIndex >= r.index;
            const current = rankIndex === r.index;
            return (
              <div
                key={r.index}
                className={cn(
                  "flex items-center gap-2 rounded-sm px-2 py-1.5",
                  current && "border border-gold/50 bg-gold/[0.06]",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[9px]",
                    reached
                      ? "border-gold bg-gold/20 text-gold"
                      : "border-white/15 text-transparent",
                  )}
                >
                  {r.index === CROWN_RANK ? "♔" : "✓"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      className={cn(
                        "truncate text-xs",
                        current
                          ? "text-gold"
                          : reached
                            ? "text-[#e7d7ac]"
                            : "text-muted-foreground",
                      )}
                    >
                      {r.title}
                    </span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {r.favor}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
