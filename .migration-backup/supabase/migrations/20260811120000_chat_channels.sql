-- Multi-channel chat: a message now belongs to a channel ("world" = The Veil,
-- "near" = The Near Reaches) and, for near, a named realm region.
ALTER TABLE public.chat_messages ADD COLUMN channel text NOT NULL DEFAULT 'world';
ALTER TABLE public.chat_messages ADD COLUMN region text;
ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_channel_chk CHECK (channel IN ('world', 'near'));
CREATE INDEX chat_messages_channel_region_idx
  ON public.chat_messages (channel, region, created_at DESC);
