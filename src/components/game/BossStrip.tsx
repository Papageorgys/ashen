import { useState } from "react";
import { Swords, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clanHostPower, type GameState } from "@/lib/game/engine";
import { STRIKE_COOLDOWN_MS, strikeDamage } from "@/lib/game/worldboss";
import type { ClanApi } from "@/hooks/useClanGame";
import type { WorldBossState } from "@/hooks/useWorldBoss";

/** A slim, always-visible band under the title bar — the realm's shared boss + a quick strike. */
export function BossStrip({
  boss,
  state,
  api,
  now,
  myId,
}: {
  boss: WorldBossState;
  state: GameState;
  api: ClanApi;
  now: number;
  myId?: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const who = { clanName: state.clanName, leaderName: state.leaderName, crest: state.crest };
  const cooldownLeft = Math.max(0, STRIKE_COOLDOWN_MS - (now - (state.bossStrikeAt ?? 0)));
  const onCooldown = cooldownLeft > 0;

  const rally = async () => {
    if (busy || onCooldown || boss.defeated || !myId) return;
    setBusy(true);
    const ok = await boss.strike(strikeDamage(clanHostPower(state)), who);
    if (ok) api.markBossStrike();
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-3 border-b border-destructive/30 bg-destructive/5 px-3 py-1.5">
      <Skull className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="shrink-0 truncate text-xs font-display text-gold">{boss.boss.name}</span>
        <div className="hidden h-2 min-w-0 flex-1 overflow-hidden rounded-sm border border-destructive/30 bg-secondary sm:block">
          <div className="h-full bg-destructive transition-all" style={{ width: `${boss.pct}%` }} />
        </div>
        <span className="shrink-0 text-[10px] uppercase tracking-widest text-muted-foreground">
          {boss.defeated ? "slain" : `${Math.round(boss.pct)}%`}
        </span>
      </div>
      {boss.defeated ? (
        <span className="shrink-0 text-[11px] text-grade-c">Felled — claim in the Warfront</span>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={rally}
          disabled={busy || onCooldown || !myId}
          className="h-7 shrink-0 gap-1 px-2"
        >
          <Swords className="h-3.5 w-3.5" aria-hidden />
          <span className="text-xs">
            {onCooldown ? `${Math.ceil(cooldownLeft / 1000)}s` : "Rally"}
          </span>
        </Button>
      )}
    </div>
  );
}
