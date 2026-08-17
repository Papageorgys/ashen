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

/** The named captains who lead each power — referenced in the war's dispatches so
 * the front has faces, not just colours. */
export const WARLORDS: Record<FactionId, string> = {
  ember: "Marshal Corvane",
  hollow: "The Hollow Cardinal",
  free: "Captain Aldwig",
  pale: "Warden Sisu",
  verdant: "Green Mother Rone",
  gilded: "Factor Beliste",
  sunless: "The Choirmaster",
  crown: "Lord Regent Vale",
  longnight: "the Pale King",
  clan: "your captains",
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
  /** development 0..100 — rises in peace, ravaged by war; scales the realm's spoils */
  dev?: number;
  /** population in thousands — grows by a birth rate set by peace, dev and farmsteads */
  pop?: number;
  /** what has been raised here, by building id */
  builds?: Partial<Record<BuildingId, number>>;
}

/* -------------------------------- Buildings -------------------------------- */

export type BuildingId =
  "farmstead" | "market" | "foundry" | "muster_camp" | "bulwark" | "watchtower";

export interface BuildingDef {
  id: BuildingId;
  label: string;
  glyph: string;
  blurb: string;
  /** war works go up on a contested front; the rest are peacetime development */
  war: boolean;
  max: number;
}

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  farmstead: {
    id: "farmstead",
    label: "Farmstead",
    glyph: "🌾",
    blurb: "Fields and families — the region grows and breeds faster.",
    war: false,
    max: 4,
  },
  market: {
    id: "market",
    label: "Market",
    glyph: "⚖",
    blurb: "Trade roads and counting-houses — the realm develops richer.",
    war: false,
    max: 3,
  },
  foundry: {
    id: "foundry",
    label: "Foundry",
    glyph: "⚒",
    blurb: "Forges and deep mines — steel, coin and steady growth.",
    war: false,
    max: 3,
  },
  muster_camp: {
    id: "muster_camp",
    label: "Muster Camp",
    glyph: "⚑",
    blurb: "Levies drill and re-form — the front recovers its grip faster.",
    war: true,
    max: 3,
  },
  bulwark: {
    id: "bulwark",
    label: "Bulwark",
    glyph: "⛨",
    blurb: "Walls, trenches and stakes — the front is far harder to break.",
    war: true,
    max: 3,
  },
  watchtower: {
    id: "watchtower",
    label: "Watchtower",
    glyph: "👁",
    blurb: "Warded beacons — the Long Night gains far less ground here.",
    war: true,
    max: 2,
  },
};

export const BUILDING_IDS = Object.keys(BUILDINGS) as BuildingId[];

/** Each realm's base fertility — how readily it rises when held in peace. */
export const REALM_FERTILITY: Record<TerritoryId, number> = {
  verdant: 0.55,
  free_holds: 0.45,
  gilded: 0.4,
  ember_court: 0.3,
  pale_wardens: 0.32,
  hollow_covenant: 0.28,
  sunless: 0.24,
  vareth: 0.42,
};

const POP_SEED = 12; // starting population (thousands) of every territory
const DEV_MAX = 100;
const POP_MAX = 600;

function clamp(lo: number, hi: number, v: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

function bcount(cell: TerritoryState, id: BuildingId): number {
  return cell.builds?.[id] ?? 0;
}

/** The per-tick birth rate of a territory — the heart of "how fast a region rises". */
export function birthRate(cell: TerritoryState, fertility: number, peaceful: boolean): number {
  if (!peaceful) return -0.006; // war and the dark thin the living
  const dev = cell.dev ?? 0;
  return 0.004 + fertility * 0.012 + (dev / DEV_MAX) * 0.004 + bcount(cell, "farmstead") * 0.003;
}

/** Can the clan raise this building here right now? Gated by the territory's status. */
export function canBuild(
  state: FrontierState,
  id: TerritoryId,
  building: BuildingId,
): { ok: boolean; why: string } {
  const cell = state.control[id];
  if (!cell || cell.owner !== "clan")
    return { ok: false, why: "Your banner must hold this ground" };
  const def = BUILDINGS[building];
  if (bcount(cell, building) >= def.max)
    return { ok: false, why: "Already built to its limit here" };
  const front = isContested(state, id);
  if (def.war && !front) return { ok: false, why: "War works go up only on a contested front" };
  if (!def.war) {
    if (front) return { ok: false, why: "Too near the front — secure the border first" };
    if (state.tick - cell.since < 6)
      return { ok: false, why: "Hold it in peace a while longer first" };
  }
  return { ok: true, why: "" };
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

/* ------------------------------- Long Night -------------------------------- */
/**
 * The Long Night is a scheduled, SHARED antagonist: on a fixed cadence of the war
 * clock the dark rises for a spell, the longnight faction surges, and it claws at
 * every border. Because it's derived from the tick, every player faces the same
 * Night at the same time — a realm-wide event to repel together.
 */
export const NIGHT_CYCLE = 144; // ticks between nightfalls (~2 days)
export const NIGHT_LENGTH = 20; // ticks the dark holds (~7 hours)

export function isLongNight(tick: number): boolean {
  return tick % NIGHT_CYCLE >= NIGHT_CYCLE - NIGHT_LENGTH;
}
/** Ticks until the Night falls (or lifts, if it's already abroad). */
export function nightPhase(tick: number): { active: boolean; ticksLeft: number } {
  const into = tick % NIGHT_CYCLE;
  const start = NIGHT_CYCLE - NIGHT_LENGTH;
  return into >= start
    ? { active: true, ticksLeft: NIGHT_CYCLE - into }
    : { active: false, ticksLeft: start - into };
}

/* -------------------------------- Realm boons ------------------------------ */
/**
 * Each realm the clan holds grants a DISTINCT boon to every hunt — so which
 * realms you take is a real strategic choice, not just a count. Values are the
 * fraction added to that channel per realm held (find is a flat drop-luck bonus).
 */
export const REALM_BOON: Record<
  TerritoryId,
  { label: string; blurb: string; gold?: number; xp?: number; essence?: number; find?: number }
> = {
  gilded: { label: "The Compact's Ledgers", blurb: "Gold flows through every hunt.", gold: 0.14 },
  ember_court: { label: "Ember Tithes", blurb: "Coin, wrung from the ash.", gold: 0.1 },
  verdant: { label: "Verdant Groves", blurb: "Essence runs thick from the green.", essence: 0.16 },
  sunless: { label: "Sunless Rites", blurb: "The dark gives up its essence.", essence: 0.12 },
  hollow_covenant: { label: "Hollow Relics", blurb: "Rarer spoils rise to the surface.", find: 7 },
  free_holds: {
    label: "Free-Hold Drills",
    blurb: "Banners learn faster in free country.",
    xp: 0.14,
  },
  pale_wardens: { label: "Warden Discipline", blurb: "Hard lessons, well kept.", xp: 0.1 },
  vareth: {
    label: "The Seat of Vareth",
    blurb: "The crown's own tithe on all Aethyr.",
    gold: 0.08,
    xp: 0.08,
    essence: 0.08,
  },
};

export function initialFrontier(now: number): FrontierState {
  const control = {} as Record<TerritoryId, TerritoryState>;
  for (const id of TERRITORY_IDS) {
    control[id] = {
      owner: TERRITORIES[id].base,
      hold: HOLD_FULL,
      since: 0,
      dev: 20,
      pop: POP_SEED,
      builds: {},
    };
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
    // the Night is scheduled on the war clock, shared by everyone (opts can force it)
    const night = opts.longNight === true || isLongNight(state.tick);

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
    if (night) {
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
      // the Long Night presses every border realm from beyond the map — warded
      // beacons on your ground turn much of it aside
      if (night) {
        const ward = holder === "clan" ? Math.min(0.7, bcount(cell, "watchtower") * 0.3) : 0;
        const nf = perT("longnight") * FACTIONS.longnight.ambition * 0.6 * (1 - ward);
        if (holder !== "longnight" && (!best || nf > best.force))
          best = { f: "longnight", force: nf };
      }

      if (best) {
        // home ground is defended far more stubbornly than occupied land; your
        // war works (bulwarks, muster camps) fortify a front you hold
        const warWorks =
          holder === "clan" ? bcount(cell, "bulwark") * 9 + bcount(cell, "muster_camp") * 5 : 0;
        const defence = 22 + perT(holder) * 0.5 + (atHome ? 18 : 0) + warWorks;
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

      // 4. development & population — a realm rises when it is held in peace and
      //    is ground down by war and the dark. This is "how fast a region rises":
      //    fertility, its own development, farmsteads and its people all compound.
      const secure = cell.hold > 55 && !isContested(state, id);
      const peaceful = cell.owner !== "longnight" && !night && secure;
      const fertility = REALM_FERTILITY[id];
      const devWorks =
        bcount(cell, "market") * 0.06 +
        bcount(cell, "foundry") * 0.05 +
        bcount(cell, "farmstead") * 0.03;
      const rise = peaceful
        ? 0.12 + fertility * 0.5 + devWorks + ((cell.pop ?? POP_SEED) / POP_MAX) * 0.2
        : cell.owner === "longnight" || night
          ? -0.7
          : -0.16;
      cell.dev = clamp(0, DEV_MAX, (cell.dev ?? 20) + rise);
      cell.pop = clamp(
        1,
        POP_MAX,
        (cell.pop ?? POP_SEED) * (1 + birthRate(cell, fertility, peaceful)),
      );
    }

    // ambient: on the live tick, a contested front crackles with a skirmish even
    // when no border moves — so the war chronicle is never silent
    if (step === steps - 1) {
      const fronts = TERRITORY_IDS.filter(
        (id) => state.control[id].owner !== "longnight" && isContested(state, id),
      );
      if (fronts.length && rng() < 0.55) {
        const id = fronts[Math.floor(rng() * fronts.length)]!;
        const cell = state.control[id];
        let foe: FactionId = cell.owner;
        for (const nb of TERRITORIES[id].adj) {
          const o = state.control[nb].owner;
          if (o !== cell.owner) {
            foe = o;
            break;
          }
        }
        if (foe !== cell.owner) {
          pushEvent(
            state,
            {
              kind: "siege",
              text: `${WARLORDS[foe]} of ${FACTIONS[foe].short} probes ${FACTIONS[cell.owner].short}'s line at ${TERRITORIES[id].name}. The front holds — for now.`,
              territory: id,
              faction: foe,
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

/**
 * Raise a building on a territory the clan holds — a shared world action, applied
 * server-side (and optimistically client-side). Returns a new state; a no-op if
 * the build isn't allowed by the territory's current status.
 */
export function applyBuild(
  prev: FrontierState,
  id: TerritoryId,
  building: BuildingId,
  now: number,
): FrontierState {
  const gate = canBuild(prev, id, building);
  if (!gate.ok) return prev;
  const state: FrontierState = {
    tick: prev.tick,
    updatedAt: prev.updatedAt,
    control: Object.fromEntries(TERRITORY_IDS.map((t) => [t, { ...prev.control[t] }])) as Record<
      TerritoryId,
      TerritoryState
    >,
    power: { ...prev.power },
    events: [...prev.events],
  };
  const cell = state.control[id];
  cell.builds = { ...(cell.builds ?? {}) };
  cell.builds[building] = (cell.builds[building] ?? 0) + 1;
  const def = BUILDINGS[building];
  pushEvent(
    state,
    {
      kind: "muster",
      text: `Your banner raises a ${def.label} in ${TERRITORIES[id].name}.`,
      territory: id,
      faction: "clan",
    },
    now,
  );
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

/* -------------------------------- Objectives ------------------------------- */

export interface WarObjective {
  id: string;
  label: string;
  desc: string;
  done: boolean;
  progress?: { have: number; need: number };
}

/** Collective goals of the war, read live off the frontier — shared by all players. */
export function frontierObjectives(state: FrontierState): WarObjective[] {
  const clan = territoriesOf(state, "clan").length;
  const nightHeld = TERRITORY_IDS.filter((id) => state.control[id].owner === "longnight");
  const night = isLongNight(state.tick);
  const objs: WarObjective[] = [
    {
      id: "seat",
      label: "Seize the Seat",
      desc: "Take Castle Vareth for the banners.",
      done: state.control.vareth.owner === "clan",
    },
    {
      id: "ascend",
      label: "Ascendancy",
      desc: "Hold three realms at once.",
      done: clan >= 3,
      progress: { have: clan, need: 3 },
    },
  ];
  if (night || nightHeld.length > 0) {
    objs.push({
      id: "repel",
      label: "Repel the Long Night",
      desc: "Drive the dark from every realm.",
      done: nightHeld.length === 0,
      progress: { have: TERRITORY_IDS.length - nightHeld.length, need: TERRITORY_IDS.length },
    });
  }
  return objs;
}
