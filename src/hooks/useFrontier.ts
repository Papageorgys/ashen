import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FrontierState } from "@/lib/game/frontier";

/**
 * Advance and read Aethyr's ONE shared war. The world-tick edge function is
 * server-authoritative: it steps the frontier by however much real time has
 * passed and returns the current state. Everything is best-effort — if the call
 * fails (offline, not signed in) the caller falls back to the per-save local sim,
 * so the game never depends on the shared world being reachable.
 */
async function tickWorld(): Promise<FrontierState | null> {
  try {
    const { data, error } = await supabase.functions.invoke("world-tick");
    const st = data as FrontierState | null;
    if (!error && st && st.control) return st;
  } catch {
    /* best-effort */
  }
  return null;
}

/** How often we nudge the war forward ourselves, in case no one else is watching. */
const REFRESH_MS = 5 * 60 * 1000;

export function useFrontier(enabled: boolean): FrontierState | null {
  const [frontier, setFrontier] = useState<FrontierState | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let live = true;
    const pull = () =>
      void tickWorld().then((f) => {
        if (live && f) setFrontier(f);
      });

    pull();
    const iv = setInterval(pull, REFRESH_MS);

    // live: when anyone's tick moves the border, everyone sees it at once
    const ch = supabase
      .channel("world-state")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "world_state", filter: "id=eq.aethyr" },
        (payload) => {
          if (!live) return;
          const st = (payload.new as { state?: FrontierState } | null)?.state;
          if (st && st.control) setFrontier(st);
        },
      )
      .subscribe();

    return () => {
      live = false;
      clearInterval(iv);
      void supabase.removeChannel(ch);
    };
  }, [enabled]);

  return frontier;
}
