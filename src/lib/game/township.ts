// The Township — the civic building sim.
//
// Where the Domain is war-logistics (raw → caravans → workshops → supply) and
// the Keep is your halls, the Township is the TOWN that grows around your seat:
// a grid of plots on which you RAISE buildings over real time — a construction
// queue with progress, not an instant unlock — then upgrade them, each level
// longer and costlier and stronger. Built structures produce passively (gold,
// inspiration, supply) and sharpen the hunt.
//
// Pure, deterministic data + folds (the same discipline as logistics / court /
// legacy). GameState is a type-only import, so no cycle.

import type { GameState } from "./engine";

export type BuildingType =
  "market" | "granary" | "guildhall" | "counting_house" | "war_shrine" | "library" | "watchtower";

export interface BuildingDef {
  type: BuildingType;
  name: string;
  glyph: string;
  blurb: string;
  maxLevel: number;
  /** base gold cost — multiplied by the level being built */
  gold: number;
  /** base timber cost (drawn from the Domain's stock) */
  timber: number;
  /** base build minutes — grows with the level being built */
  minutes: number;
}

export const BUILDINGS: Record<BuildingType, BuildingDef> = {
  market: {
    type: "market",
    name: "Market Hall",
    glyph: "🏪",
    blurb: "Trade fills the coffers — passive gold every hour, growing with its level.",
    maxLevel: 5,
    gold: 600,
    timber: 20,
    minutes: 5,
  },
  granary: {
    type: "granary",
    name: "Granary",
    glyph: "🌾",
    blurb: "Stores against the war — raises your supply cap and ships a little supply each hour.",
    maxLevel: 5,
    gold: 800,
    timber: 30,
    minutes: 6,
  },
  guildhall: {
    type: "guildhall",
    name: "Guild Hall",
    glyph: "⚒",
    blurb: "Master builders — every construction in the township goes up faster.",
    maxLevel: 4,
    gold: 1200,
    timber: 40,
    minutes: 8,
  },
  counting_house: {
    type: "counting_house",
    name: "Counting House",
    glyph: "💰",
    blurb: "Ledgers and levies — a standing bonus to the gold every hunt brings home.",
    maxLevel: 5,
    gold: 1500,
    timber: 25,
    minutes: 8,
  },
  war_shrine: {
    type: "war_shrine",
    name: "War Shrine",
    glyph: "🔥",
    blurb: "The rites of ash — a standing bonus to the experience every hunt earns.",
    maxLevel: 5,
    gold: 1500,
    timber: 25,
    minutes: 8,
  },
  library: {
    type: "library",
    name: "Great Library",
    glyph: "📚",
    blurb: "Kept lore — a steady trickle of inspiration every hour.",
    maxLevel: 5,
    gold: 1000,
    timber: 30,
    minutes: 7,
  },
  watchtower: {
    type: "watchtower",
    name: "Watchtower",
    glyph: "🗼",
    blurb: "Eyes on the roads — cuts the raiders' cut of every caravan the Domain sends.",
    maxLevel: 4,
    gold: 900,
    timber: 45,
    minutes: 7,
  },
};

export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];

/* ------------------------------ Prerequisites ------------------------------ */
/** A building's tech gate — the structure that must already stand to raise it. */
export const PREREQ: Partial<Record<BuildingType, BuildingType>> = {
  guildhall: "market",
  library: "market",
  counting_house: "guildhall",
  war_shrine: "library",
};

/** Can this type be raised on a fresh plot yet (are its prerequisites met)? */
export function canBuildType(
  town: TownshipState | undefined,
  type: BuildingType,
): { ok: boolean; why: string } {
  const req = PREREQ[type];
  if (!req) return { ok: true, why: "" };
  const has = (town?.plots ?? []).some((p) => p.type === req && p.level >= 1);
  if (!has) return { ok: false, why: `Requires a ${BUILDINGS[req].name}` };
  return { ok: true, why: "" };
}

/* -------------------------------- Adjacency -------------------------------- */
export const GRID_COLS = 3;
export const ADJ_BONUS = 0.08; // +8% output per orthogonally-adjacent built plot

/** Orthogonal neighbours of a plot index on the square grid. */
export function neighborIdx(i: number, count = PLOT_COUNT): number[] {
  const rows = Math.ceil(count / GRID_COLS);
  const r = Math.floor(i / GRID_COLS);
  const c = i % GRID_COLS;
  const out: number[] = [];
  if (r > 0) out.push(i - GRID_COLS);
  if (r < rows - 1 && i + GRID_COLS < count) out.push(i + GRID_COLS);
  if (c > 0) out.push(i - 1);
  if (c < GRID_COLS - 1 && i + 1 < count) out.push(i + 1);
  return out;
}

/** How many of a plot's neighbours hold a finished building — the district it sits in. */
export function plotDistrict(town: TownshipState | undefined, i: number): number {
  const plots = town?.plots ?? [];
  return neighborIdx(i, plots.length).filter((n) => {
    const p = plots[n];
    return !!p && !!p.type && p.level >= 1;
  }).length;
}

export interface Plot {
  id: string;
  type?: BuildingType;
  /** 0 = empty ground; ≥1 = built to this level */
  level: number;
  /** laborers (drawn from the Domain's pool) staffing this building */
  workers?: number;
  /** an in-progress raise/upgrade — completes when now ≥ until */
  constructing?: { startedAt: number; until: number; toLevel: number };
}

/** Each laborer staffing a building lifts its output by this much. */
export const STAFF_BONUS = 0.15;
/** A building can be staffed up to its level. */
export function maxStaff(plot: Plot): number {
  return plot.level;
}
/** Total laborers assigned across the whole township. */
export function townWorkers(town: TownshipState | undefined): number {
  return (town?.plots ?? []).reduce((n, p) => n + (p.workers ?? 0), 0);
}

export interface TownshipState {
  tickAt: number;
  plots: Plot[];
}

export const PLOT_COUNT = 9;

export function initialTownship(now: number): TownshipState {
  return {
    tickAt: now,
    plots: Array.from({ length: PLOT_COUNT }, (_, i) => ({ id: `plot_${i}`, level: 0 })),
  };
}

/** Cost and time to raise a building to `toLevel` (level 1 = first build). */
export function buildCost(type: BuildingType, toLevel: number): { gold: number; timber: number } {
  const def = BUILDINGS[type];
  return { gold: def.gold * toLevel, timber: def.timber * toLevel };
}
export function buildMs(type: BuildingType, toLevel: number, buildSpeed = 1): number {
  const def = BUILDINGS[type];
  return Math.round((def.minutes + (toLevel - 1) * 2) * 60_000 * buildSpeed);
}

export interface TownshipEffects {
  goldPerHour: number;
  inspirationPerHour: number;
  supplyPerHour: number;
  supplyBonus: number; // added to the supply cap
  huntGoldMult: number;
  huntXpMult: number;
  /** construction time multiplier (<1 = faster) from Guild Halls */
  buildSpeed: number;
  /** fraction the Watchtowers cut off caravan-raid losses (0..0.8) */
  raidReduction: number;
}

/** Fold the township's BUILT structures into their standing effects. */
export function townshipEffectsOf(town: TownshipState | undefined): TownshipEffects {
  const eff: TownshipEffects = {
    goldPerHour: 0,
    inspirationPerHour: 0,
    supplyPerHour: 0,
    supplyBonus: 0,
    huntGoldMult: 1,
    huntXpMult: 1,
    buildSpeed: 1,
    raidReduction: 0,
  };
  if (!town) return eff;
  let guild = 0;
  town.plots.forEach((p, i) => {
    if (!p.type || p.level < 1) return;
    const L = p.level;
    // a building packed among neighbours works its district harder
    const m = 1 + ADJ_BONUS * plotDistrict(town, i);
    // and every laborer assigned lifts its output on top of that
    const s = 1 + (p.workers ?? 0) * STAFF_BONUS;
    const g = m * s;
    switch (p.type) {
      case "market":
        eff.goldPerHour += 40 * L * g;
        break;
      case "granary":
        eff.supplyBonus += 18 * L * m; // the cap is structural, not worked
        eff.supplyPerHour += 0.6 * L * g;
        break;
      case "guildhall":
        guild += L; // build-speed is global, not district-boosted
        break;
      case "counting_house":
        eff.huntGoldMult += 0.04 * L * g;
        break;
      case "war_shrine":
        eff.huntXpMult += 0.04 * L * g;
        break;
      case "library":
        eff.inspirationPerHour += 0.5 * L * g;
        break;
      case "watchtower":
        eff.raidReduction += 0.12 * L * s; // staffed watchtowers see further
        break;
    }
  });
  eff.buildSpeed = Math.max(0.4, 1 - guild * 0.08); // each guild-hall level: -8% build time
  eff.raidReduction = Math.min(0.8, eff.raidReduction);
  return eff;
}

/** GameState-level accessor for the effects. */
export function townshipEffects(state: GameState): TownshipEffects {
  return townshipEffectsOf(state.township);
}

/**
 * Advance construction to `now`: any raise whose timer has elapsed completes.
 * Returns the new township plus the hourly production it earned over `hours`
 * (applied by the caller — realmPulse — to gold / inspiration / supply).
 * Pure: mutates nothing the caller passed.
 */
export function advanceTownship(
  town: TownshipState,
  now: number,
  hours: number,
): { town: TownshipState; gold: number; inspiration: number; supply: number } {
  const plots = town.plots.map((p) => {
    if (p.constructing && now >= p.constructing.until) {
      const { constructing: _done, ...rest } = p;
      return { ...rest, level: p.constructing.toLevel };
    }
    return p;
  });
  const next: TownshipState = { tickAt: now, plots };
  const eff = townshipEffectsOf(next);
  return {
    town: next,
    gold: eff.goldPerHour * hours,
    inspiration: eff.inspirationPerHour * hours,
    supply: eff.supplyPerHour * hours,
  };
}
