import { armyStrength, pathfind, troopCount, type Army } from "./army";
import { TERRAIN } from "./terrain";
import { getRelation, type Diplomacy } from "./diplomacy";
import type { Rng } from "./rng";
import type { World } from "./types";

/**
 * Enemy AI — rival crowns that act on their own, so the world evolves around
 * the player. Each idle host looks to its frontier and marches on the softest
 * worthwhile target: unclaimed holdings to expand into, weak neighbours to
 * prey on. It won't throw itself at a host it cannot beat. Deterministic given
 * the seed.
 */

/** Estimate what defends a province — a standing host plus its walls. */
function defenceOf(world: World, armies: Army[], provinceId: string, excludeOwner: string): number {
  const prov = world.provinces.find((p) => p.id === provinceId)!;
  const foe = armies
    .filter((o) => o.ownerId !== excludeOwner && o.provinceId === provinceId && troopCount(o) > 0)
    .sort((a, b) => troopCount(b) - troopCount(a))[0];
  let def = foe ? armyStrength(foe) : 40; // token garrison
  if (prov.settlementId) def *= 1 + TERRAIN[prov.terrain].defense + 0.15;
  return def;
}

/** Give one kingdom's idle hosts their marching orders for the season. Only
 *  wilderness and provinces of kingdoms this realm is at WAR with are valid
 *  targets — pacts and peace hold the line. */
export function planKingdom(
  world: World,
  armies: Army[],
  kingdomId: string,
  dip: Diplomacy,
  r: Rng,
): void {
  const owned = new Set(world.provinces.filter((p) => p.ownerId === kingdomId).map((p) => p.id));
  const hosts = armies.filter(
    (a) => a.ownerId === kingdomId && a.path.length === 0 && troopCount(a) > 0,
  );

  for (const host of hosts) {
    const myStr = armyStrength(host);
    // candidate targets: frontier provinces we don't hold, near our lands or host
    const candidates = new Set<string>();
    for (const pid of [...owned, host.provinceId]) {
      const p = world.provinces.find((x) => x.id === pid);
      if (!p) continue;
      for (const nid of p.neighbors) {
        const n = world.provinces.find((x) => x.id === nid)!;
        if (!TERRAIN[n.terrain].land) continue;
        if (n.ownerId === kingdomId) continue;
        if (!n.settlementId) continue; // only holdings are worth taking
        // a held province is fair game only if we're at war with its owner
        if (n.ownerId && getRelation(dip, kingdomId, n.ownerId).stance !== "war") continue;
        candidates.add(nid);
      }
    }

    let best: { id: string; score: number } | null = null;
    for (const id of candidates) {
      const prov = world.provinces.find((p) => p.id === id)!;
      const def = defenceOf(world, armies, id, kingdomId);
      if (myStr < def * 1.05) continue; // don't march to certain defeat
      const path = pathfind(world, host.provinceId, id);
      if (path.length === 0) continue;
      const wilderness = prov.ownerId === null;
      let score = (wilderness ? 3 : 2) + (myStr / def) * 0.4 - path.length * 0.35;
      score += r() * 0.6; // a little caprice
      if (!best || score > best.score) best = { id, score };
    }

    if (best && best.score > 0) {
      host.path = pathfind(world, host.provinceId, best.id);
      host.legProgress = 0;
    }
  }
}

/** Plan orders for every AI kingdom this season. */
export function planEnemyKingdoms(world: World, armies: Army[], dip: Diplomacy, r: Rng): void {
  for (const k of world.kingdoms) {
    if (k.isPlayer) continue;
    planKingdom(world, armies, k.id, dip, r);
  }
}
