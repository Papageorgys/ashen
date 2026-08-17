# world-tick

Server-authoritative tick for Aethyr's shared war (the HOI4 layer).

- Reads the single `public.world_state` row, advances the frontier by however much
  real time has passed (`advanceFrontier`, 20-minute ticks), writes it back with
  the service-role key, and returns the current state.
- With a `{ contest: { territory, power, clanName } }` body it also lets a signed-in
  player commit their banners to a front — grinding the holder toward the shared
  "clan" faction, capped and enforced by a 15-minute per-user cooldown tracked in
  `public.frontier_contests` (user id taken from the JWT `sub`).
- With a `{ build: { territory, building, clanName } }` body it raises a building on a
  clan-held realm — status-gated by `canBuild` (war works on a contested front;
  development on a peaceful, long-held realm), on its own 15-minute per-user cooldown
  (`frontier_contests.built_at`). Territories carry `dev` (0..100 development), `pop`
  (population in thousands, grown by a birth rate from peace, fertility, dev and
  farmsteads) and `builds`; a realm rises when held in peace and is ravaged by war and
  the Long Night. Development scales the per-realm war spoils the clan earns.
- The simulation is a **copy of `src/lib/game/frontier.ts`** — edge functions
  can't import app source. Keep the two in sync when tuning the war. The sim is
  PURE and deterministic in `(state, now)`, so concurrent invocations converge and
  no locking is needed.
- Deployed to the `Ashen` Supabase project (`lrnfmqkwtyesxsyqmhhp`) via the
  Supabase MCP `deploy_edge_function`. `verify_jwt` is on — signed-in clients
  invoke it via `supabase.functions.invoke("world-tick")`; the client hook
  `src/hooks/useFrontier.ts` calls it on load, on a 5-minute interval, and
  subscribes to `world_state` Realtime for everyone else's ticks.
- If the call fails (offline / not signed in), the client falls back to the
  per-save local sim ticked from `realmPulse`, so the game never depends on the
  shared world being reachable.
- A `pg_cron` job (`world-tick-heartbeat`, migration
  `supabase/migrations/20260817_world_tick_heartbeat.sql`) invokes this function
  every 5 minutes via `pg_net` with the public anon key, so the shared war advances
  on its own clock even with zero players online. The anon JWT carries no `sub`, so
  the heartbeat only ticks the sim — it can never contest or build for anyone.

The live function body is the source of truth (redeploy with `deploy_edge_function`
to change it). This directory documents it; the migration lives in
`supabase/migrations/20260816_world_state_frontier.sql`.
