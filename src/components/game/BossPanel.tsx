import { useState } from "react";
import { Swords, Crown, Skull } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClanCrest } from "@/components/game/ClanCrest";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";
import { clanHostPower, type GameState } from "@/lib/game/engine";
import { STRIKE_COOLDOWN_MS, strikeDamage } from "@/lib/game/worldboss";
import type { ClanApi } from "@/hooks/useClanGame";
import type { WorldBossState } from "@/hooks/useWorldBoss";

const fmt = (n: number) => Math.round(n).toLocaleString();

function resetInMs(eventId: string, now: number): number {
  const dayEnd = Date.parse(`${eventId.slice(5)}T00:00:00Z`) + 86_400_000;
  return Math.max(0, dayEnd - now);
}

function countdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export function BossPanel({
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
  const dmg = strikeDamage(clanHostPower(state));
  const cooldownLeft = Math.max(0, STRIKE_COOLDOWN_MS - (now - (state.bossStrikeAt ?? 0)));
  const onCooldown = cooldownLeft > 0;
  const claimed = !!state.bossClaims?.[boss.boss.eventId];

  const rally = async () => {
    if (busy || onCooldown || boss.defeated || !myId) return;
    setBusy(true);
    const ok = await boss.strike(dmg, who);
    if (ok) api.markBossStrike();
    setBusy(false);
  };

  const claim = () => {
    if (!boss.defeated || claimed || boss.myDamage <= 0) return;
    const share = boss.total > 0 ? boss.myDamage / boss.total : 0;
    api.claimBossReward(
      boss.boss.eventId,
      boss.boss.name,
      boss.boss.level,
      share,
      boss.myRank ?? 999,
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Skull className="h-5 w-5 text-destructive" aria-hidden />
          <h2 className="gilded font-display text-lg">World Boss</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          One foe stalks the realm each day. Every clan strikes the same beast — fell it together
          before dawn.
        </p>
      </div>

      <div className="panel-ornate space-y-3 rounded-sm p-4">
        <div className="flex items-baseline justify-between gap-2">
          <div>
            <div className="font-display text-xl text-gold">{boss.boss.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {boss.boss.family} · Level {boss.boss.level}
            </div>
          </div>
          <div className="text-right text-[10px] uppercase tracking-widest text-muted-foreground">
            {boss.defeated ? "slain" : `dawn in ${countdown(resetInMs(boss.boss.eventId, now))}`}
          </div>
        </div>
        <p className="text-xs italic text-muted-foreground">{boss.boss.blurb}</p>

        {/* HP bar */}
        <div className="space-y-1">
          <div className="h-3 w-full overflow-hidden rounded-sm border border-destructive/40 bg-secondary">
            <div
              className="h-full bg-destructive transition-all"
              style={{ width: `${boss.pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>
              {boss.defeated ? "Vanquished" : `${fmt(boss.remaining)} / ${fmt(boss.hpMax)} HP`}
            </span>
            <span>{boss.board.length} clans in the fight</span>
          </div>
        </div>

        {/* actions */}
        {boss.defeated ? (
          <div className="flex items-center gap-2">
            <span className="flex-1 text-sm text-grade-c">
              The realm has felled {boss.boss.name}.
            </span>
            {boss.myDamage > 0 && (
              <Button size="sm" onClick={claim} disabled={claimed}>
                {claimed ? "Spoils claimed" : "Claim spoils"}
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={rally}
              disabled={busy || onCooldown || !myId}
              className="gap-1"
            >
              <Swords className="h-4 w-4" aria-hidden />
              {onCooldown
                ? `Rally in ${Math.ceil(cooldownLeft / 1000)}s`
                : `Rally the host (${fmt(dmg)} dmg)`}
            </Button>
            <span className="text-[11px] text-muted-foreground">
              Your strike: {fmt(dmg)} · your total: {fmt(boss.myDamage)}
              {boss.myRank ? ` · rank #${boss.myRank}` : ""}
            </span>
          </div>
        )}
      </div>

      {/* leaderboard */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Champions of the hunt
        </div>
        {boss.board.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No blows landed yet. Be the first to strike.
          </p>
        ) : (
          boss.board.slice(0, 12).map((r, i) => {
            const mine = r.user_id === myId;
            const share = boss.total > 0 ? (r.damage / boss.total) * 100 : 0;
            return (
              <div
                key={r.user_id}
                className={`flex items-center gap-2 rounded-sm px-2 py-1 ${mine ? "bg-gold/10" : ""}`}
              >
                <span className="w-5 shrink-0 text-center text-[11px] text-muted-foreground">
                  {i === 0 ? (
                    <Crown className="mx-auto h-3.5 w-3.5 text-gold" aria-hidden />
                  ) : (
                    i + 1
                  )}
                </span>
                <ClanCrest
                  crest={(r.crest as Crest) ?? DEFAULT_CREST}
                  className="h-6 w-6 shrink-0"
                />
                <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                  {r.clan_name || r.leader_name || "A clan"}
                </span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {fmt(r.damage)} · {share.toFixed(0)}%
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
