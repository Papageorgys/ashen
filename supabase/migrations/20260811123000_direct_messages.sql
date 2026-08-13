-- Soulthread: private one-to-one whispers between two souls. Unlike the public
-- channels, only the two parties may read a thread.
CREATE TABLE public.direct_messages (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  sender_clan_name TEXT NOT NULL DEFAULT '',
  sender_leader_name TEXT NOT NULL DEFAULT '',
  crest JSONB,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX dm_pair_idx ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX dm_recipient_idx ON public.direct_messages (recipient_id, created_at DESC);

GRANT SELECT, INSERT ON public.direct_messages TO authenticated;
GRANT ALL ON public.direct_messages TO service_role;

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;
-- Read a thread only if you are one of the two parties.
CREATE POLICY "dm read own" ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
-- Send only as yourself, and never to yourself.
CREATE POLICY "dm send own" ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND recipient_id <> sender_id);

-- Realtime delivers each insert only to subscribers the RLS SELECT policy allows,
-- so a whisper reaches exactly its sender and recipient with no client-side filter.
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
