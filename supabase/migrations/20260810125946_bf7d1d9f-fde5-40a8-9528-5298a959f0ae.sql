CREATE TABLE public.game_saves (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  state JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.game_saves TO authenticated;
GRANT ALL ON public.game_saves TO service_role;
ALTER TABLE public.game_saves ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own save" ON public.game_saves FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.ladder (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  clan_name TEXT NOT NULL DEFAULT '',
  leader_name TEXT NOT NULL DEFAULT '',
  motto TEXT NOT NULL DEFAULT '',
  crest JSONB,
  clan_level INT NOT NULL DEFAULT 0,
  reputation INT NOT NULL DEFAULT 0,
  members INT NOT NULL DEFAULT 0,
  full_banners INT NOT NULL DEFAULT 0,
  score INT NOT NULL DEFAULT 0,
  holds_castle BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ladder TO authenticated;
GRANT SELECT ON public.ladder TO anon;
GRANT ALL ON public.ladder TO service_role;
ALTER TABLE public.ladder ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ladder is public" ON public.ladder FOR SELECT USING (true);
CREATE POLICY "own ladder row insert" ON public.ladder FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ladder row update" ON public.ladder FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own ladder row delete" ON public.ladder FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.touch_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;
CREATE TRIGGER game_saves_touch BEFORE UPDATE ON public.game_saves FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER ladder_touch BEFORE UPDATE ON public.ladder FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();