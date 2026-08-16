-- Per-player cooldown + tally for committing banners to the war (HOI4 phase 3).
-- The world-tick edge function enforces the cooldown and applies the push with
-- the service role; clients may read their own row to show the cooldown.
create table if not exists public.frontier_contests (
  user_id uuid primary key references auth.users(id),
  last_at timestamptz not null default now(),
  pushes integer not null default 0,
  clan_name text not null default ''
);

alter table public.frontier_contests enable row level security;

drop policy if exists "frontier_contests read own" on public.frontier_contests;
create policy "frontier_contests read own"
  on public.frontier_contests
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No client writes; the edge function upserts with the service-role key.
