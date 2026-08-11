-- World Boss: a shared daily foe every clan chips at together. Each clan's
-- cumulative damage for an event is one row; the boss's remaining HP is
-- HP_max minus the sum of all damage. Public read (the leaderboard + shared
-- HP), own write.
CREATE TABLE public.world_boss_contributions (
  event_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  clan_name TEXT NOT NULL DEFAULT '',
  leader_name TEXT NOT NULL DEFAULT '',
  crest JSONB,
  damage BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE INDEX wbc_event_idx ON public.world_boss_contributions (event_id, damage DESC);

GRANT SELECT ON public.world_boss_contributions TO anon;
GRANT SELECT, INSERT, UPDATE ON public.world_boss_contributions TO authenticated;
GRANT ALL ON public.world_boss_contributions TO service_role;

ALTER TABLE public.world_boss_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "boss contrib public" ON public.world_boss_contributions FOR SELECT USING (true);
CREATE POLICY "boss contrib own insert" ON public.world_boss_contributions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "boss contrib own update" ON public.world_boss_contributions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.world_boss_contributions;

-- Atomic accumulation: a plain upsert would clobber concurrent strikes, so add
-- the delta server-side. Runs as the caller (SECURITY INVOKER), so RLS still
-- guarantees a clan can only ever add to its own row (user_id = auth.uid()).
CREATE OR REPLACE FUNCTION public.strike_world_boss(
  p_event_id TEXT,
  p_damage BIGINT,
  p_clan_name TEXT,
  p_leader_name TEXT,
  p_crest JSONB
) RETURNS BIGINT LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE
  new_total BIGINT;
BEGIN
  INSERT INTO public.world_boss_contributions
    (event_id, user_id, clan_name, leader_name, crest, damage, updated_at)
  VALUES
    (p_event_id, auth.uid(), p_clan_name, p_leader_name, p_crest, GREATEST(0, p_damage), now())
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET damage = public.world_boss_contributions.damage + GREATEST(0, EXCLUDED.damage),
        clan_name = EXCLUDED.clan_name,
        leader_name = EXCLUDED.leader_name,
        crest = EXCLUDED.crest,
        updated_at = now()
  RETURNING damage INTO new_total;
  RETURN new_total;
END;
$$;
GRANT EXECUTE ON FUNCTION public.strike_world_boss(TEXT, BIGINT, TEXT, TEXT, JSONB) TO authenticated;
