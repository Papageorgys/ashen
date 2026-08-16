// The Frontier — Aethyr's grand-strategy layer (the HOI4 pillar).
//
// The continent is a ring of realm territories around the contested seat of
// Castle Vareth. Each is held by a faction; factions press on the territories
// bordering them, a front line forms where two powers meet, and when the
// pressure on a territory overwhelms its holder the border moves. The whole
// thing advances on a clock whether or not the player is doing anything.
//
// advanceFrontier() is a PURE, deterministic function of (state, now): every
// roll is seeded from the tick index, so it is reproducible and fair, and the
// same routine can later run server-side (a Supabase edge function) to drive one
// shared war for every player. For now it is ticked client-side from realmPulse.

import { REALM_HUE } from "./atlas";

/* --------------------------------- Factions -------------------------------- */

export type FactionId =
  | "ember"
  | "hollow"
  | "free"
  | "pale"
  | "verdant"
  | "gilded"
  | "sunless"
  | "crown"
  | "longnight"
  | "clan";

export interface FactionDef {
  id: FactionId;
  name: string;
  short: string;
  hue: string;
  /** how hard it pushes its neighbours, roughly 0.6 (cautious) .. 1.4 (rapacious) */
  ambition: number;
}

const H = REALM_HUE;

export const FACTIONS: Record<FactionId, FactionDef> = {
  ember: { id: "ember", name: "The Ember Court", short: "Ember", hue: H.ember, ambition: 1.25 },
  hollow: {
    id: "hollow",
    name: "The Hollow Covenant",
    short: "Hollow",
    hue: H.hollow,
    ambition: 1.0,
  },
  free: { id: "free", name: "The Free Holds", short: "Free Holds", hue: H.free, ambition: 0.8 },
  pale: { id: "pale", name: "The Pale Wardens", short: "Pale", hue: H.pale, ambition: 0.75 },
  verdant: {
    id: "verdant",
    name: "The Verdant Reclamation",
    short: "Verdant",
    hue: H.verdant,
    ambition: 0.9,
  },
  gilded: {
    id: "gilded",
    name: "The Gilded Compact",
    short: "Gilded",
    hue: H.gilded,
    ambition: 1.1,
  },
  sunless: {
    id: "sunless",
    name: "The Sunless Choir",
    short: "Sunless",
    hue: H.sunless,
    ambition: 1.15,
  },
  crown: { id: "crown", name: "The Crownless Seat", short: "Crown", hue: "#c9b06a", ambition: 0.5 },
  longnight: {
    id: "longnight",
    name: "The Long Night",
    short: "Long Night",
    hue: "#5b4a7a",
    ambition: 1.5,
  },
  clan: { id: "clan", name: "Your Banner", short: "Yours", hue: "#3fb0a6", ambition: 1.2 },
};

/* -------------------------------- Territories ------------------------------ */

export type TerritoryId =
  | "ember_court"
  | "hollow_covenant"
  | "free_holds"
  | "pale_wardens"
  | "verdant"
  | "gilded"
  | "sunless"
  | "vareth";

export interface TerritoryDef {
  id: TerritoryId;
  name: string;
  /** the faction that holds it when the war begins */
  base: FactionId;
  /** neighbouring territories the front can move between */
  adj: TerritoryId[];
}

/**
 * The eight nodes of the continental war: seven realms in a ring, and Castle
 * Vareth at the centre bordering them all — the prize every faction covets. The
 * ids match the continent's atlas location ids, so the map can tint each realm
 * by whoever holds it with no extra plumbing.
 */
export const TERRITORIES: Record<TerritoryId, TerritoryDef> = {
  vareth: {
    id: "vareth",
    name: "Castle Vareth",
    base: "crown",
    adj: [
      "ember_court",
      "hollow_covenant",
      "free_holds",
      "pale_wardens",
      "verdant",
      "gilded",
      "sunless",
    ],
  },
  free_holds: {
    id: "free_holds",
    name: "The Free Holds",
    base: "free",
    adj: ["pale_wardens", "verdant", "vareth"],
  },
  pale_wardens: {
    id: "pale_wardens",
    name: "The Pale Wardens",
    base: "pale",
    adj: ["free_holds", "ember_court", "vareth"],
  },
  verdant: {
    id: "verdant",
    name: "The Verdant Reclamation",
    base: "verdant",
    adj: ["free_holds", "hollow_covenant", "vareth"],
  },
  hollow_covenant: {
    id: "hollow_covenant",
    name: "The Hollow Covenant",
    base: "hollow",
    adj: ["verdant", "gilded", "vareth"],
  },
  ember_court: {
    id: "ember_court",
    name: "The Ember Court",
    base: "ember",
    adj: ["pale_wardens", "sunless", "vareth"],
  },
  gilded: {
    id: "gilded",
    name: "The Gilded Compact",
    base: "gilded",
    adj: ["hollow_covenant", "sunless", "vareth"],
  },
  sunless: {
    id: "sunless",
    name: "The Sunless Choir",
    base: "sunless",
    adj: ["ember_court", "gilded", "vareth"],
  },
};

export const TERRITORY_IDS = Object.keys(TERRITORIES) as TerritoryId[];

/* ---------------------------------- State ---------------------------------- */

export interface FrontierEvent {
  id: string;
  at: number;
  tick: number;
  kind: "conquest" | "siege" | "nightfall" | "muster";
  text: string;
  territory?: TerritoryId;
  faction?: FactionId;
}

export interface TerritoryState {
  owner: FactionId;
  /** how firmly the holder is dug in, 0..100 — pressure grinds this down */
  hold: number;
  /** the tick the current holder took it */
  since: number;
}

export interface FrontierState {
  /** monotonic tick counter — the sim clock */
  tick: number;
  /** wall-clock of the last advance, so we know how many ticks to run */
  updatedAt: number;
  control: Record<TerritoryId, TerritoryState>;
  /** each faction's marshalled strength */
  power: Partial<Record<FactionId, number>>;
  /** war chronicle, newest first */
  events: FrontierEvent[];
}

/** One tick of the war is this much real time. */
export const FRONTIER_TICK_MS = 20 * 60 * 1000; // 20 minutes
/** Never fast-forward more than this many ticks in one catch-up (~2.7 days). */
const MAX_CATCHUP = 200;
const HOLD_FULL = 100;

export function initialFrontier(now: number): FrontierState {
  const control = {} as Record<TerritoryId, TerritoryState>;
  for (const id of TERRITORY_IDS) {
    control[id] = { owner: TERRITORIES[id].base, hold: HOLD_FULL, since: 0 };
  }
  const power: Partial<Record<FactionId, number>> = {};
  for (const f of Object.values(FACTIONS)) {
    if (f.id === "clan") continue;
    power[f.id] = f.id === "crown" ? 45 : 100;
  }
  return { tick: 0, updatedAt: now, control, power, events: [] };
}

/** Deterministic per-tick RNG so a war unfolds the same for everyone who watches it. */
function tickRng(tick: number, salt: number) {
  let s = (Math.imul(tick + 1, 2654435761) ^ Math.imul(salt + 1, 40503)) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** How much of the map a faction holds — its territory count feeds its power growth. */
export function territoriesOf(state: FrontierState, faction: FactionId): TerritoryId[] {
  return TERRITORY_IDS.filter((id) => state.control[id].owner === faction);
}

function pushEvent(
  state: FrontierState,
  e: Omit<FrontierEvent, "id" | "at" | "tick">,
  now: number,
) {
  state.events.unshift({
    id: `fe_${state.tick}_${state.events.length}`,
    at: now,
    tick: state.tick,
    ...e,
  });
  if (state.events.length > 60) state.events.length = 60;
}

/**
 * Advance the war to `now`. Pure: returns a new state, mutating nothing the
 * caller passed. `longNight` lets the Long Night surge across the map while it
 * walks; pass whether it is currently abroad.
 */
export function advanceFrontier(
  prev: FrontierState,
  now: number,
  opts: { longNight?: boolean } = {},
): FrontierState {
  // deep-ish clone (state is small and plain)
  const state: FrontierState = {
    tick: prev.tick,
    updatedAt: prev.updatedAt,
    control: Object.fromEntries(TERRITORY_IDS.map((id) => [id, { ...prev.control[id] }])) as Record<
      TerritoryId,
      TerritoryState
    >,
    power: { ...prev.power },
    events: [...prev.events],
  };

  let steps = Math.floor((now - state.updatedAt) / FRONTIER_TICK_MS);
  if (steps <= 0) return prev;
  if (steps > MAX_CATCHUP) steps = MAX_CATCHUP;

  for (let step = 0; step < steps; step++) {
    state.tick += 1;
    const rng = tickRng(state.tick, 0);

    // 1. powers grow slowly with how much of the continent they hold (soft-capped
    //    so no one runs away with it)
    const held: Partial<Record<FactionId, number>> = {};
    for (const f of Object.keys(state.power) as FactionId[]) {
      const owned = territoriesOf(state, f).length;
      held[f] = owned;
      state.power[f] = Math.min(
        260,
        (state.power[f] ?? 0) * (1 + 0.0025 * FACTIONS[f].ambition) + owned * 0.5,
      );
    }

    // 2. the Long Night, while abroad, marshals and claws at the edges
    if (opts.longNight) {
      state.power.longnight = Math.min(500, (state.power.longnight ?? 100) + 6);
    } else {
      // recedes when the sun returns
      state.power.longnight = Math.max(55, (state.power.longnight ?? 100) - 3);
    }

    // per-territory strength: an empire spread over many holds defends each front
    // thinly, so it overextends and can be pushed back — the key to a live war
    const perT = (f: FactionId) => (state.power[f] ?? 0) / Math.max(1, held[f] ?? 0);

    // 3. each territory takes pressure from the strongest hostile neighbour
    for (const id of TERRITORY_IDS) {
      const cell = state.control[id];
      const holder = cell.owner;
      const atHome = holder === TERRITORIES[id].base;

      // the fiercest adjacent attacker
      let best: { f: FactionId; force: number } | null = null;
      for (const nb of TERRITORIES[id].adj) {
        const att = state.control[nb].owner;
        if (att === holder) continue;
        const force = perT(att) * FACTIONS[att].ambition;
        if (!best || force > best.force) best = { f: att, force };
      }
      // the Long Night presses every border realm from beyond the map
      if (opts.longNight) {
        const nf = perT("longnight") * FACTIONS.longnight.ambition * 0.6;
        if (holder !== "longnight" && (!best || nf > best.force))
          best = { f: "longnight", force: nf };
      }

      if (best) {
        // home ground is defended far more stubbornly than occupied land
        const defence = 22 + perT(holder) * 0.5 + (atHome ? 18 : 0);
        const bite = Math.max(0, best.force - defence) * 0.16 * (0.7 + rng() * 0.6);
        cell.hold -= bite;
      } else {
        cell.hold = Math.min(HOLD_FULL, cell.hold + 3); // quiet border, dig in
      }
      // unrest: occupied land is never wholly at peace, and slips from its holder
      if (!atHome) cell.hold -= 1.6;
      if (cell.hold > HOLD_FULL) cell.hold = HOLD_FULL;

      if (cell.hold <= 0) {
        // the border moves — to the attacker, or (isolated unrest) back to its rightful holder
        const from = cell.owner;
        const winner: FactionId = best ? best.f : TERRITORIES[id].base;
        cell.owner = winner;
        cell.hold = 32 + rng() * 22; // takes the ground but isn't yet secure
        cell.since = state.tick;
        const fromName = FACTIONS[from].short;
        const toName = FACTIONS[winner].name;
        if (id === "vareth") {
          pushEvent(
            state,
            {
              kind: "siege",
              text: `${toName} storms Castle Vareth, wresting the seat from ${fromName}.`,
              territory: id,
              faction: winner,
            },
            now,
          );
        } else if (winner === "longnight") {
          pushEvent(
            state,
            {
              kind: "nightfall",
              text: `The Long Night overruns ${TERRITORIES[id].name}. The living flee before it.`,
              territory: id,
              faction: winner,
            },
            now,
          );
        } else if (!best) {
          pushEvent(
            state,
            {
              kind: "muster",
              text: `${TERRITORIES[id].name} throws off ${fromName} and raises its own banners again.`,
              territory: id,
              faction: winner,
            },
            now,
          );
        } else {
          pushEvent(
            state,
            {
              kind: "conquest",
              text: `${toName} drives ${fromName} out of ${TERRITORIES[id].name}.`,
              territory: id,
              faction: winner,
            },
            now,
          );
        }
      }
    }
  }

  state.updatedAt = state.updatedAt + steps * FRONTIER_TICK_MS;
  return state;
}

/* --------------------------------- Helpers --------------------------------- */

/** Standings: each faction's territory count and power, most land first. */
export function frontierStandings(state: FrontierState) {
  const rows = (Object.keys(FACTIONS) as FactionId[])
    .filter((f) => f !== "clan")
    .map((f) => ({
      faction: f,
      def: FACTIONS[f],
      territories: territoriesOf(state, f).length,
      power: Math.round(state.power[f] ?? 0),
    }))
    .filter((r) => r.territories > 0 || r.faction === "longnight");
  rows.sort((a, b) => b.territories - a.territories || b.power - a.power);
  return rows;
}

/** Is a territory a front line — does it border a rival holding? */
export function isContested(state: FrontierState, id: TerritoryId): boolean {
  const holder = state.control[id].owner;
  return TERRITORIES[id].adj.some((nb) => state.control[nb].owner !== holder);
}
