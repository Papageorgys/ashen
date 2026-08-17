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
  "market" | "granary" | "guildhall" | "counting_house" | "war_shrine" | "library";

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
};

export const BUILDING_TYPES = Object.keys(BUILDINGS) as BuildingType[];

export interface Plot {
  id: string;
  type?: BuildingType;
  /** 0 = empty ground; ≥1 = built to this level */
  level: number;
  /** an in-progress raise/upgrade — completes when now ≥ until */
  constructing?: { startedAt: number; until: number; toLevel: number };
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
  };
  if (!town) return eff;
  let guild = 0;
  for (const p of town.plots) {
    if (!p.type || p.level < 1) continue;
    const L = p.level;
    switch (p.type) {
      case "market":
        eff.goldPerHour += 40 * L;
        break;
      case "granary":
        eff.supplyBonus += 18 * L;
        eff.supplyPerHour += 0.6 * L;
        break;
      case "guildhall":
        guild += L;
        break;
      case "counting_house":
        eff.huntGoldMult += 0.04 * L;
        break;
      case "war_shrine":
        eff.huntXpMult += 0.04 * L;
        break;
      case "library":
        eff.inspirationPerHour += 0.5 * L;
        break;
    }
  }
  eff.buildSpeed = Math.max(0.4, 1 - guild * 0.08); // each guild-hall level: -8% build time
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
