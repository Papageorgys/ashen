-- The shared living war for Aethyr (the HOI4 layer). One row holds the whole
-- frontier; the world-tick edge function advances it server-side, and every
-- client reads it. No client writes — only the service role (edge function).
create table if not exists public.world_state (
  id text primary key default 'aethyr',
  tick bigint not null default 0,
  updated_at timestamptz not null default now(),
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.world_state enable row level security;

-- Public read for everyone signed in or not; the war is common knowledge.
drop policy if exists "world_state read" on public.world_state;
create policy "world_state read"
  on public.world_state
  for select
  to authenticated, anon
  using (true);

-- No insert/update/delete policies: regular clients cannot mutate the war.
-- The world-tick edge function writes with the service-role key (bypasses RLS).

-- Let clients subscribe to live changes over Realtime.
alter publication supabase_realtime add table public.world_state;
