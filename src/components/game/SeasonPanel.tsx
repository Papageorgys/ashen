import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import { deedsFromState, renownScore } from "@/lib/game/engine";
import { SEASON_TIERS, seasonProgress, seasonOf, type SeasonReward } from "@/lib/game/season";

function rewardText(r: SeasonReward): string {
  const parts: string[] = [];
  if (r.gold) parts.push(`${r.gold.toLocaleString()} gold`);
  if (r.inspiration) parts.push(`${r.inspiration} inspiration`);
  if (r.legacy) parts.push(`${r.legacy} legacy`);
  return parts.join(" · ");
}

/**
 * The Season — the recurring reward track laid over the realm's Seasons of Ash.
 * Earn season points by fighting through the season, claim the track's tiers,
 * and — when you're ready — declare the Reckoning to turn the season and begin a
 * fresh one (the rivals return stronger; only your Legacy carries over).
 */
export function SeasonPanel({
  state,
  api,
}: {
  state: GameState;
  api: {
    claimSeasonTier: (i: number) => void;
    declareReckoning: () => void;
  };
}) {
  const season = seasonOf(state);
  const pass = state.seasonPass;
  const points = pass?.points ?? 0;
  const claimed = new Set(pass?.claimed ?? []);
  const prog = seasonProgress(points);
  const renown = renownScore(deedsFromState(state));

  return (
    <div className="space-y-4">
      <section className="panel-ornate rounded-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              The endless war
            </div>
            <h2 className="gilded font-display text-2xl">Season of Ash {season}</h2>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              Fight through the season to score its track. Your standing this season:{" "}
              <span className="text-gold">{renown.toLocaleString()} renown</span>.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl tabular-nums text-[#e7c65a]">
              {points.toLocaleString()}
            </div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              season points
            </div>
          </div>
        </div>

        {/* progress toward the next tier */}
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-sm border border-border/60 bg-secondary">
            <div
              className="h-full bg-gold/70 transition-all"
              style={{ width: `${Math.round(prog.into * 100)}%` }}
            />
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {prog.next
              ? `${(prog.next.points - points).toLocaleString()} points to ${prog.next.label}`
              : "The whole track is earned — the season is yours."}
          </p>
        </div>
      </section>

      {/* the reward track */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">Season Track</h3>
        <div className="mt-3 space-y-2">
          {SEASON_TIERS.map((tier, i) => {
            const done = claimed.has(i);
            const ready = points >= tier.points && !done;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 rounded-sm border p-2.5",
                  done
                    ? "border-gold/40 bg-gold/[0.05]"
                    : ready
                      ? "border-[#7ea86a]/50 bg-[#7ea86a]/[0.06]"
                      : "border-border/60 bg-black/20 opacity-80",
                )}
              >
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 bg-black/40 font-display text-[11px] tabular-nums text-gold">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-display text-sm text-gold">{tier.label}</span>
                    <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground">
                      {tier.points.toLocaleString()} pts
                    </span>
                  </div>
                  <div className="text-[11px] text-[#7ea86a]">{rewardText(tier.reward)}</div>
                </div>
                <button
                  type="button"
                  disabled={!ready}
                  onClick={() => api.claimSeasonTier(i)}
                  className={cn(
                    "shrink-0 rounded-sm border px-3 py-1 text-[11px] uppercase tracking-[0.1em] transition disabled:opacity-40",
                    "border-gold/50 bg-gold/10 text-gold enabled:hover:bg-gold/20",
                  )}
                >
                  {done ? "Claimed" : "Claim"}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* turn the season */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">The Reckoning</h3>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          Declare the Reckoning to tally this season into the Chronicle and begin Season{" "}
          {season + 1}. The map is perturbed and the rivals return stronger — but everything you
          earned endures. The season track begins anew.
        </p>
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Declare the Reckoning and begin Season ${season + 1}?`))
              api.declareReckoning();
          }}
          className="mt-3 w-full rounded-sm border border-forge-ember bg-forge-ember/80 py-2 font-display text-xs uppercase tracking-[0.14em] text-[#160d06] transition hover:brightness-110"
        >
          Declare the Reckoning · begin Season {season + 1}
        </button>
      </section>
    </div>
  );
}
