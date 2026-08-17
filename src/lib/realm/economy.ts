import type { ResourceId, World } from "./types";

/** Aggregate a kingdom's holdings: provinces, people, and total production. */
export function realmSummary(world: World, kingdomId: string) {
  const held = world.provinces.filter((p) => p.ownerId === kingdomId);
  const population = held.reduce((s, p) => s + p.population, 0);
  const production: Partial<Record<ResourceId, number>> = {};
  for (const p of held) {
    for (const [k, v] of Object.entries(p.production) as [ResourceId, number][]) {
      production[k] = (production[k] ?? 0) + v;
    }
  }
  const settlements = held.filter((p) => p.settlementId).length;
  return { held, provinceCount: held.length, population, production, settlements };
}

/** Net food balance: farmland/plains feed the realm; every soul eats. */
export function foodBalance(world: World, kingdomId: string) {
  const { population, production } = realmSummary(world, kingdomId);
  const grown = production.food ?? 0;
  const eaten = Math.round(population / 120); // people per unit of grain/turn
  return { grown, eaten, net: grown - eaten };
}
