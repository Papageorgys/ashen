CREATE TABLE public.chat_messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  clan_name TEXT NOT NULL DEFAULT '',
  leader_name TEXT NOT NULL DEFAULT '',
  crest JSONB,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_created_at_idx ON public.chat_messages (created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.chat_messages TO authenticated;
GRANT SELECT ON public.chat_messages TO anon;
GRANT ALL ON public.chat_messages TO service_role;

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat is public" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "own message insert" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own message delete" ON public.chat_messages FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Required so Postgres-changes stream reaches subscribed clients.
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
