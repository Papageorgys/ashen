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

/** The plane a voice speaks on: the Veil (all souls) or the Near Reaches (a region). */
export type ChatChannel = "world" | "near";

export type ChatMessageRow = {
  id: string;
  user_id: string;
  clan_name: string;
  leader_name: string;
  crest: unknown;
  body: string;
  channel: string;
  region: string | null;
  created_at: string;
};

/** Recent messages on a channel (a region for "near"), oldest first for display. */
export async function fetchChat(opts: {
  channel: ChatChannel;
  region?: string | null;
  limit?: number;
}): Promise<ChatMessageRow[]> {
  let q = supabase.from("chat_messages").select("*").eq("channel", opts.channel);
  if (opts.channel === "near" && opts.region) q = q.eq("region", opts.region);
  const { data } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 60);
  return ((data ?? []) as unknown as ChatMessageRow[]).reverse();
}

/** Speak on a channel. `userId` must equal the signed-in user (enforced by RLS). */
export async function postChat(
  userId: string,
  body: string,
  who: { clanName?: string | undefined; leaderName?: string | undefined; crest?: unknown },
  opts: { channel: ChatChannel; region?: string | null },
): Promise<ChatMessageRow | null> {
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed) return null;
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      user_id: userId,
      clan_name: who.clanName ?? "",
      leader_name: who.leaderName ?? "",
      crest: (who.crest ?? null) as never,
      body: trimmed,
      channel: opts.channel,
      region: opts.channel === "near" ? (opts.region ?? null) : null,
    })
    .select()
    .single();
  if (error || !data) return null;
  return data as unknown as ChatMessageRow;
}

export type DirectMessageRow = {
  id: string;
  sender_id: string;
  recipient_id: string;
  sender_clan_name: string;
  sender_leader_name: string;
  crest: unknown;
  body: string;
  created_at: string;
};

/** The whisper thread between the signed-in soul and one other, oldest-first. */
export async function fetchDMThread(
  myId: string,
  otherId: string,
  limit = 60,
): Promise<DirectMessageRow[]> {
  const { data } = await supabase
    .from("direct_messages")
    .select("*")
    .or(
      `and(sender_id.eq.${myId},recipient_id.eq.${otherId}),and(sender_id.eq.${otherId},recipient_id.eq.${myId})`,
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return ((data ?? []) as unknown as DirectMessageRow[]).reverse();
}

/** Send a whisper. `senderId` must equal the signed-in user (enforced by RLS). */
export async function postDM(
  senderId: string,
  recipientId: string,
  body: string,
  who: { clanName?: string | undefined; leaderName?: string | undefined; crest?: unknown },
): Promise<DirectMessageRow | null> {
  const trimmed = body.trim().slice(0, 500);
  if (!trimmed || senderId === recipientId) return null;
  const { data, error } = await supabase
    .from("direct_messages")
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      sender_clan_name: who.clanName ?? "",
      sender_leader_name: who.leaderName ?? "",
      crest: (who.crest ?? null) as never,
      body: trimmed,
    })
    .select()
    .single();
  if (error || !data) return null;
  return data as unknown as DirectMessageRow;
}

export type BossContribRow = {
  event_id: string;
  user_id: string;
  clan_name: string;
  leader_name: string;
  crest: unknown;
  damage: number;
  updated_at: string;
};

/** Every clan's damage on a boss event, highest first (shared HP + leaderboard). */
export async function fetchBossContributions(eventId: string): Promise<BossContribRow[]> {
  const { data } = await supabase
    .from("world_boss_contributions")
    .select("*")
    .eq("event_id", eventId)
    .order("damage", { ascending: false });
  return (data ?? []) as unknown as BossContribRow[];
}

/** Land a strike on the boss; returns this clan's new cumulative damage, or null. */
export async function strikeBoss(
  eventId: string,
  damage: number,
  who: { clanName?: string | undefined; leaderName?: string | undefined; crest?: unknown },
): Promise<number | null> {
  const { data, error } = await supabase.rpc("strike_world_boss", {
    p_event_id: eventId,
    p_damage: Math.max(0, Math.round(damage)),
    p_clan_name: who.clanName ?? "",
    p_leader_name: who.leaderName ?? "",
    p_crest: (who.crest ?? null) as never,
  });
  if (error) return null;
  return typeof data === "number" ? data : null;
}
