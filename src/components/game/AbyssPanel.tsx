import { cn } from "@/lib/utils";
import type { GameState } from "@/lib/game/engine";
import {
  partyPower,
  abyssDifficulty,
  abyssReward,
  abyssChance,
  abyssalPowerMult,
} from "@/lib/game/engine";
import type { ClanApi } from "@/hooks/useClanGame";

/**
 * The Abyss — the endless descent. Each depth is harder than the last with no
 * floor, and every depth cleared attunes the whole clan to the dark (a permanent
 * lift to fighting power that never stops). It is where the power built by
 * Legacy, Ascendancy and Paragon is spent, and always found wanting one depth on.
 */
export function AbyssPanel({ state, api }: { state: GameState; api: ClanApi }) {
  const depth = state.abyss?.depth ?? 0;
  const next = depth + 1;
  const need = abyssDifficulty(next);
  const reward = abyssReward(next);
  const attune = Math.round((abyssalPowerMult(state) - 1) * 100);
  const banners = state.parties.filter((p) => p.memberIds.length > 0 && !p.run && !p.travel);

  return (
    <div className="space-y-4">
      <section className="panel-ornate rounded-sm p-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              The Abyss — the endless descent
            </div>
            <h2 className="gilded font-display text-2xl">Depth {depth}</h2>
            <p className="mt-0.5 max-w-md text-xs text-muted-foreground">
              Every depth cleared attunes the clan to the dark — a permanent lift to all fighting
              power. The floor only ever gets deeper.
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-2xl tabular-nums text-[#b57edc]">+{attune}%</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              abyssal power
            </div>
          </div>
        </div>
      </section>

      {/* the next floor and its spoils */}
      <section className="panel rounded-sm p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">
            Depth {next} awaits
          </h3>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            demands power {need.toLocaleString()}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
          <span className="rounded-sm border border-gold/25 bg-gold/[0.05] px-2 py-1 text-gold">
            🪙 {reward.gold.toLocaleString()} gold
          </span>
          <span className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[#e7d7ac]">
            ✦ {reward.xp.toLocaleString()} xp each
          </span>
          <span className="rounded-sm border border-white/10 bg-black/30 px-2 py-1 text-[#c9bbe8]">
            ⟡ {reward.inspiration} inspiration
          </span>
          <span className="rounded-sm border border-[#b57edc]/30 bg-[#b57edc]/[0.06] px-2 py-1 text-[#b57edc]">
            +2.5% permanent power
          </span>
        </div>
      </section>

      {/* which banner descends */}
      <section className="panel rounded-sm p-4">
        <h3 className="font-display text-sm uppercase tracking-[0.2em] text-gold">Send a banner</h3>
        <p className="mt-1 text-[11px] text-muted-foreground">
          A banner strong enough clears the floor; too weak and it is thrown back bloodied. Only
          rested banners may descend.
        </p>
        <div className="mt-3 space-y-2">
          {banners.map((p) => {
            const power = partyPower(state, p);
            const chance = Math.round(abyssChance(power, next) * 100);
            const tone = chance >= 70 ? "#7ea86a" : chance >= 40 ? "#d8a24a" : "#d1603a";
            return (
              <div
                key={p.id}
                className="flex items-center justify-between gap-2 rounded-sm border border-border/60 bg-black/20 px-2.5 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-display text-sm text-gold">{p.name}</div>
                  <div className="text-[10px] tabular-nums text-muted-foreground">
                    power {power.toLocaleString()} ·{" "}
                    <span style={{ color: tone }}>{chance}% to clear</span>
                  </div>
                </div>
                <button
                  type="button"
                  data-sfx="deploy"
                  onClick={() => api.descendAbyss(p.id)}
                  className={cn(
                    "shrink-0 rounded-sm border px-3 py-1.5 font-display text-[11px] uppercase tracking-[0.12em] transition",
                    "border-[#7c5cff]/60 bg-[#7c5cff]/15 text-[#c9bbe8] hover:bg-[#7c5cff]/25",
                  )}
                >
                  Descend
                </button>
              </div>
            );
          })}
          {banners.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No rested banner stands ready. Recall one from the field to descend.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
