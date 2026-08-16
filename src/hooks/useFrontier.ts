import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FrontierState, TerritoryId } from "@/lib/game/frontier";

/**
 * Advance and read Aethyr's ONE shared war, and let the player commit to a front.
 * world-tick is server-authoritative: it steps the frontier by however much real
 * time has passed and returns the current state; with a `contest` body it also
 * grinds a territory toward the player's banner (cooldown-enforced server-side).
 * Everything is best-effort — if the call fails the caller falls back to the
 * per-save local sim, so the game never depends on the shared world.
 */
type TickResult = (FrontierState & { contested?: boolean; cooldownMs?: number }) | null;

async function invokeTick(body?: unknown): Promise<TickResult> {
  try {
    const { data, error } = await supabase.functions.invoke("world-tick", body ? { body } : {});
    const st = data as TickResult;
    if (!error && st && st.control) return st;
  } catch {
    /* best-effort */
  }
  return null;
}

const REFRESH_MS = 5 * 60 * 1000;

export interface ContestResult {
  ok: boolean;
  contested: boolean;
  cooldownMs: number;
}

export function useFrontier(enabled: boolean): {
  frontier: FrontierState | null;
  contest: (territory: TerritoryId, power: number, clanName: string) => Promise<ContestResult>;
} {
  const [frontier, setFrontier] = useState<FrontierState | null>(null);
  const liveRef = useRef(true);

  useEffect(() => {
    if (!enabled) return;
    liveRef.current = true;
    const pull = () =>
      void invokeTick().then((f) => {
        if (liveRef.current && f) setFrontier(f);
      });

    pull();
    const iv = setInterval(pull, REFRESH_MS);
    const ch = supabase
      .channel("world-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "world_state", filter: "id=eq.aethyr" },
        (payload) => {
          if (!liveRef.current) return;
          const st = (payload.new as { state?: FrontierState } | null)?.state;
          if (st && st.control) setFrontier(st);
        },
      )
      .subscribe();

    return () => {
      liveRef.current = false;
      clearInterval(iv);
      void supabase.removeChannel(ch);
    };
  }, [enabled]);

  const contest = useCallback<
    (territory: TerritoryId, power: number, clanName: string) => Promise<ContestResult>
  >(async (territory, power, clanName) => {
    const st = await invokeTick({ contest: { territory, power, clanName } });
    if (st) {
      setFrontier(st);
      return { ok: true, contested: !!st.contested, cooldownMs: st.cooldownMs ?? 0 };
    }
    return { ok: false, contested: false, cooldownMs: 0 };
  }, []);

  return { frontier, contest };
}
