import { realmSummary } from "./economy";
import { troopCount, type Army } from "./army";
import type { ResourceId, World } from "./types";

/**
 * The kingdom ledger — you rule, you don't only command. Each season the
 * provinces pay taxes and yield resources, the people eat, and the armies draw
 * their upkeep; shortfalls breed unrest. Pure, deterministic accounting the UI
 * and the council read from.
 */
export interface Ledger {
  treasury: number;
  food: number;
  stores: Record<ResourceId, number>;
  unrest: number; // 0..100
  season: number;
}

export interface SeasonReport {
  taxes: number;
  resourceGold: number;
  upkeep: number;
  goldNet: number;
  foodGrown: number;
  foodEaten: number;
  foodNet: number;
  unrestDelta: number;
}

export function seedLedger(world: World, kingdomId: string): Ledger {
  const sum = realmSummary(world, kingdomId);
  return {
    treasury: 200 + sum.provinceCount * 60,
    food: 300 + sum.provinceCount * 40,
    stores: { food: 0, wood: 20, stone: 20, iron: 10, gold: 0, horses: 8 },
    unrest: 12,
    season: 1,
  };
}

const TAX_PER_HEAD = 0.006;
const UPKEEP_GOLD = 0.05; // per soldier per season
const UPKEEP_FOOD = 0.6; // per soldier per season
const EAT_PER_HEAD = 1 / 120;

/** Advance the ledger one season for a kingdom. Mutates + returns the report. */
export function collectSeason(
  ledger: Ledger,
  world: World,
  kingdomId: string,
  armies: Army[],
): SeasonReport {
  const sum = realmSummary(world, kingdomId);
  const soldiers = armies
    .filter((a) => a.ownerId === kingdomId)
    .reduce((s, a) => s + troopCount(a), 0);

  const taxes = Math.round(sum.population * TAX_PER_HEAD);
  const resourceGold = sum.production.gold ?? 0;
  const upkeep = Math.round(soldiers * UPKEEP_GOLD);
  const goldNet = taxes + resourceGold - upkeep;

  const foodGrown = sum.production.food ?? 0;
  const foodEaten = Math.round(sum.population * EAT_PER_HEAD + soldiers * UPKEEP_FOOD);
  const foodNet = foodGrown - foodEaten;

  ledger.treasury = Math.max(0, ledger.treasury + goldNet);
  ledger.food = Math.max(0, ledger.food + foodNet);
  for (const r of ["wood", "stone", "iron", "horses"] as ResourceId[])
    ledger.stores[r] += sum.production[r] ?? 0;

  // shortfalls breed unrest; plenty calms it
  let unrestDelta = 0;
  if (foodNet < 0) unrestDelta += Math.min(12, Math.ceil(-foodNet / 4));
  if (ledger.treasury <= 0) unrestDelta += 4;
  if (unrestDelta === 0) unrestDelta = -3;
  ledger.unrest = Math.max(0, Math.min(100, ledger.unrest + unrestDelta));
  ledger.season += 1;

  return {
    taxes,
    resourceGold,
    upkeep,
    goldNet,
    foodGrown,
    foodEaten,
    foodNet,
    unrestDelta,
  };
}

/** A crude threat read: the strongest rival's total troops vs the player's. */
export function threatLevel(world: World, kingdomId: string, armies: Army[]): number {
  const mine = armies.filter((a) => a.ownerId === kingdomId).reduce((s, a) => s + troopCount(a), 0);
  let strongestFoe = 0;
  for (const k of world.kingdoms) {
    if (k.id === kingdomId) continue;
    const t = armies.filter((a) => a.ownerId === k.id).reduce((s, a) => s + troopCount(a), 0);
    strongestFoe = Math.max(strongestFoe, t);
  }
  return strongestFoe / Math.max(1, mine);
}
