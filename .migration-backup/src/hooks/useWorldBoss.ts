import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchBossContributions,
  strikeBoss,
  postChat,
  type BossContribRow,
} from "@/lib/cloud/sync";
import { bossForDay, type WorldBoss } from "@/lib/game/worldboss";

type Who = { clanName?: string | undefined; leaderName?: string | undefined; crest?: unknown };

export interface WorldBossState {
  boss: WorldBoss;
  board: BossContribRow[];
  total: number;
  remaining: number;
  hpMax: number;
  pct: number;
  defeated: boolean;
  myDamage: number;
  myRank: number | null;
  strike: (damage: number, who: Who) => Promise<boolean>;
}

/** Shared, live World Boss state — the same daily boss and HP for every client. */
export function useWorldBoss(myId?: string | null): WorldBossState {
  const boss = useMemo(() => bossForDay(), []);
  const eventId = boss.eventId;
  const [rows, setRows] = useState<Record<string, BossContribRow>>({});
  const totalRef = useRef(0);

  // Initial history + live updates for this event.
  useEffect(() => {
    let live = true;
    fetchBossContributions(eventId).then((list) => {
      if (!live) return;
      const map: Record<string, BossContribRow> = {};
      for (const r of list) map[r.user_id] = r;
      setRows(map);
    });
    const ch = supabase
      .channel(`world-boss-${eventId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "world_boss_contributions",
          filter: `event_id=eq.${eventId}`,
        },
        (payload) => {
          if (!live) return;
          const r = payload.new as unknown as BossContribRow;
          if (!r || !r.user_id) return;
          setRows((prev) => ({ ...prev, [r.user_id]: r }));
        },
      )
      .subscribe();
    return () => {
      live = false;
      void supabase.removeChannel(ch);
    };
  }, [eventId]);

  const board = useMemo(() => Object.values(rows).sort((a, b) => b.damage - a.damage), [rows]);
  const total = useMemo(() => board.reduce((n, r) => n + (r.damage || 0), 0), [board]);
  totalRef.current = total;
  const hpMax = boss.hpMax;
  const remaining = Math.max(0, hpMax - total);
  const defeated = total >= hpMax;
  const myDamage = (myId && rows[myId]?.damage) || 0;
  const myRank = myId && rows[myId] ? board.findIndex((r) => r.user_id === myId) + 1 : null;

  const strike = useCallback(
    async (damage: number, who: Who): Promise<boolean> => {
      if (!myId) return false;
      const before = totalRef.current;
      const newMine = await strikeBoss(eventId, damage, who);
      if (newMine === null) return false;
      setRows((prev) => ({
        ...prev,
        [myId]: {
          event_id: eventId,
          user_id: myId,
          clan_name: who.clanName ?? "",
          leader_name: who.leaderName ?? "",
          crest: who.crest ?? null,
          damage: newMine,
          updated_at: new Date().toISOString(),
        },
      }));
      // If this blow is the one that fells it, announce across the Veil.
      const priorMine = rows[myId]?.damage ?? 0;
      const after = before - priorMine + newMine;
      if (before < hpMax && after >= hpMax) {
        void postChat(
          myId,
          `⚔ ${who.clanName || who.leaderName || "A clan"} struck the killing blow — ${boss.name} has fallen before the realm!`,
          who,
          { channel: "world" },
        );
      }
      return true;
    },
    [eventId, hpMax, boss.name, myId, rows],
  );

  return {
    boss,
    board,
    total,
    remaining,
    hpMax,
    pct: (remaining / hpMax) * 100,
    defeated,
    myDamage,
    myRank,
    strike,
  };
}
