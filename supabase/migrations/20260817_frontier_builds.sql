-- Development & buildings on the shared frontier (HOI4 phase: build to rise).
-- Adds a separate cooldown timestamp for raising buildings, so committing to a
-- front and raising works are throttled independently. The world-tick edge
-- function enforces the cooldown and upserts with the service-role key.
alter table public.frontier_contests
  add column if not exists built_at timestamptz;
