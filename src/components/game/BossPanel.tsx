import { useState } from "react";
import { Swords, Crown, Skull, HandHeart, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClanCrest } from "@/components/game/ClanCrest";
import { DEFAULT_CREST, type Crest } from "@/lib/game/identity";
import { partyPower, spoilRarity, dayKey, type GameState, type Party } from "@/lib/game/engine";
import { bossLootTable, blessingCost, COMMIT_COOLDOWN_MS } from "@/lib/game/worldboss";
import { ITEM_BY_ID } from "@/lib/game/data";
import type { ClanApi } from "@/hooks/useClanGame";
import type { WorldBossState } from "@/hooks/useWorldBoss";

const fmt = (n: number) => Math.round(n).toLocaleString();

const RARITY_CLASS: Record<string, string> = {
  common: "text-muted-foreground",
  fine: "text-grade-c",
  rare: "text-grade-b",
  epic: "text-grade-a",
};

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
  const [busy, setBusy] = useState<string | null>(null);
  const who = { clanName: state.clanName, leaderName: state.leaderName, crest: state.crest };
  const claimed = !!state.bossClaims?.[boss.boss.eventId];
  const blessed = state.bossBlessing?.day === dayKey();
  const cost = blessingCost(state.clanLevel);
  const banners = state.parties.filter((p) => p.memberIds.length > 0);

  const cooldownLeft = (p: Party) =>
    Math.max(0, COMMIT_COOLDOWN_MS - (now - (state.bossCommitAt?.[p.id] ?? 0)));

  const commit = async (p: Party) => {
    if (busy || boss.defeated || p.memberIds.length === 0 || cooldownLeft(p) > 0) return;
    setBusy(p.id);
    const ok = await boss.strike(partyPower(state, p), who);
    if (ok) api.commitBanner(p.id);
    setBusy(null);
  };

  const commitAll = async () => {
    for (const p of banners) {
      if (cooldownLeft(p) === 0 && !boss.defeated) await commit(p);
    }
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

  const drops = bossLootTable(boss.boss.level);
  const anyReady = banners.some((p) => cooldownLeft(p) === 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <Skull className="h-5 w-5 text-destructive" aria-hidden />
          <h2 className="gilded font-display text-lg">World Boss</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          One foe stalks the realm each day. Commit your banners — they break off farming to charge
          it — and fell it together before dawn.
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
      </div>

      {/* blessing */}
      {!boss.defeated && (
        <div
          className={`flex flex-wrap items-center gap-2 rounded-sm border p-3 ${
            blessed ? "border-grade-c/50 bg-grade-c/5" : "border-border/60"
          }`}
        >
          <HandHeart
            className={`h-4 w-4 shrink-0 ${blessed ? "text-grade-c" : "text-muted-foreground"}`}
            aria-hidden
          />
          <span className="min-w-0 flex-1 text-xs text-muted-foreground">
            {blessed
              ? "Blessing of the shrine holds — no champion will fall in the fight today."
              : "Champions can die charging the boss. Pray for a shrine blessing to shield them today."}
          </span>
          {!blessed && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1"
              disabled={state.gold < cost}
              onClick={() => api.prayForBlessing()}
            >
              <HandHeart className="h-3.5 w-3.5" aria-hidden />
              Pray ({fmt(cost)}g)
            </Button>
          )}
        </div>
      )}

      {/* muster the banners */}
      {!boss.defeated && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Commit your banners
            </div>
            <Button size="sm" variant="outline" disabled={!anyReady || !!busy} onClick={commitAll}>
              Send all ready
            </Button>
          </div>
          {banners.length === 0 ? (
            <p className="text-xs text-muted-foreground">No banners with champions to send.</p>
          ) : (
            banners.map((p) => {
              const cd = cooldownLeft(p);
              const pow = partyPower(state, p);
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 rounded-sm border border-border/50 px-2 py-1.5"
                >
                  <Swords className="h-3.5 w-3.5 shrink-0 text-gold" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-foreground">
                    {p.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{fmt(pow)} dmg</span>
                  <Button
                    size="sm"
                    className="h-7 shrink-0"
                    disabled={cd > 0 || !!busy || !myId}
                    onClick={() => commit(p)}
                  >
                    {cd > 0 ? `${Math.ceil(cd / 1000)}s` : "Charge"}
                  </Button>
                </div>
              );
            })
          )}
          <p className="text-[10px] text-muted-foreground">
            {blessed
              ? "Your host is warded — charge freely."
              : "Each charge risks one champion's life. The Lord never falls here."}
          </p>
        </div>
      )}

      {/* felled + claim */}
      {boss.defeated && (
        <div className="flex items-center gap-2 rounded-sm border border-grade-c/40 bg-grade-c/5 p-3">
          <span className="flex-1 text-sm text-grade-c">
            The realm has felled {boss.boss.name}.
          </span>
          {boss.myDamage > 0 && (
            <Button size="sm" onClick={claim} disabled={claimed}>
              {claimed ? "Spoils claimed" : "Claim spoils"}
            </Button>
          )}
        </div>
      )}

      {/* drop table */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
          <Gift className="h-3.5 w-3.5" aria-hidden /> The beast's hoard
        </div>
        <div className="flex flex-wrap gap-1">
          {drops.map((id) => {
            const item = ITEM_BY_ID[id];
            const rarity = spoilRarity(id);
            return (
              <span
                key={id}
                title={item?.desc ?? ""}
                className={`rounded-sm border border-border/50 px-1.5 py-0.5 text-[10px] ${RARITY_CLASS[rarity] ?? "text-muted-foreground"}`}
              >
                {item?.name ?? id}
              </span>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Felling the boss drops a share of the hoard, more for a bigger part in the kill.
        </p>
      </div>

      {/* leaderboard */}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
          Champions of the hunt
        </div>
        {boss.board.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No blows landed yet. Be the first to charge.
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
