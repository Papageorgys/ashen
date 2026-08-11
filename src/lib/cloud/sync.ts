import { supabase } from "@/integrations/supabase/client";
import type { GameState } from "@/lib/game/engine";
import { scoreClan } from "@/lib/game/engine";

export type LadderRow = {
  user_id: string;
  clan_name: string;
  leader_name: string;
  motto: string;
  crest: unknown;
  clan_level: number;
  reputation: number;
  members: number;
  full_banners: number;
  score: number;
  holds_castle: boolean;
  updated_at: string;
};

export async function fetchCloudSave(userId: string): Promise<GameState | null> {
  const { data, error } = await supabase
    .from("game_saves")
    .select("state")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return data.state as unknown as GameState;
}

export async function pushCloudSave(userId: string, state: GameState) {
  const score = scoreClan(state);
  await supabase
    .from("game_saves")
    .upsert({ user_id: userId, state: state as never }, { onConflict: "user_id" });
  await supabase.from("ladder").upsert(
    {
      user_id: userId,
      clan_name: state.clanLevel >= 1 ? state.clanName : `${state.leaderName}'s Company`,
      leader_name: state.leaderName,
      motto: state.motto ?? "",
      crest: (state.crest ?? null) as never,
      clan_level: state.clanLevel,
      reputation: Math.round(state.reputation),
      members: state.members.length,
      full_banners: score.fullParties,
      score: Math.round(score.fullParties * 1000 + state.reputation),
      holds_castle: state.castle?.holder === "player",
    },
    { onConflict: "user_id" },
  );
}

export async function fetchLadder(): Promise<LadderRow[]> {
  const { data } = await supabase
    .from("ladder")
    .select("*")
    .order("score", { ascending: false })
    .order("reputation", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as LadderRow[];
}
