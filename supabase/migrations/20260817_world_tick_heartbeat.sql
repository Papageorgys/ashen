-- Make the shared war autonomous: advance the frontier on its own clock so it
-- lives even with zero players online (the HOI4 "living frontier" premise, and
-- so development / population growth keeps ticking while everyone is away).
--
-- The world-tick edge function is PURE and deterministic and a cheap no-op when
-- no full 20-minute tick has elapsed, so a 5-minute heartbeat is safe and light.
-- It is invoked with the (public) anon key, which carries no `sub`, so the
-- heartbeat only advances the sim — it can never contest or build for anyone.
create extension if not exists pg_cron;

select cron.schedule(
  'world-tick-heartbeat',
  '*/5 * * * *',
  $job$
  select net.http_post(
    url := 'https://lrnfmqkwtyesxsyqmhhp.supabase.co/functions/v1/world-tick',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxybmZtcWt3dHllc3hzeXFtaGhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY0MjkxODMsImV4cCI6MjEwMjAwNTE4M30.Q7hu46N0dPJQWnG9uSfBKNKKKC758pWUWgZPsOC3xIg'
    ),
    body := '{}'::jsonb
  );
  $job$
);
