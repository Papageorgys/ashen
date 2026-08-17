import { TERRAIN } from "./terrain";
import { generalName } from "./names";
import { makeRng, rint, rrange, type Rng } from "./rng";
import type { Point, World } from "./types";

/**
 * Armies — formations that physically occupy and travel the province graph.
 * They never teleport: a move order becomes a path through adjacent provinces,
 * walked over real time at a speed set by the terrain they cross. Supply and
 * morale ride along and decide battles. Pure/deterministic simulation.
 */

export type UnitType = "spearmen" | "archers" | "swordsmen" | "heavy" | "cavalry" | "knights";

export const UNIT: Record<
  UnitType,
  { name: string; power: number; cav: boolean; missile: boolean }
> = {
  spearmen: { name: "Spearmen", power: 1, cav: false, missile: false },
  archers: { name: "Archers", power: 1.1, cav: false, missile: true },
  swordsmen: { name: "Swordsmen", power: 1.4, cav: false, missile: false },
  heavy: { name: "Heavy Infantry", power: 2, cav: false, missile: false },
  cavalry: { name: "Cavalry", power: 2.2, cav: true, missile: false },
  knights: { name: "Knights", power: 3.4, cav: true, missile: false },
};

export type Composition = Partial<Record<UnitType, number>>;

export interface Commander {
  name: string;
  /** 0..100 skills */
  infantry: number;
  cavalry: number;
  command: number;
}

export interface Army {
  id: string;
  name: string;
  ownerId: string;
  provinceId: string; // province the army currently sits in / departs from
  composition: Composition;
  commander: Commander;
  morale: number; // 0..1
  supply: number; // 0..1
  /** active march: remaining province ids to visit, and progress along the
   *  current leg (0..1). Empty path = stationary. */
  path: string[];
  legProgress: number;
}

export const troopCount = (a: Army): number =>
  Object.values(a.composition).reduce((s, n) => s + (n ?? 0), 0);

function makeCommander(r: Rng): Commander {
  return {
    name: generalName(r),
    infantry: rint(r, 45, 90),
    cavalry: rint(r, 30, 85),
    command: rint(r, 40, 88),
  };
}

/** A host scaled to `size` total troops, in a believable composition. */
function makeComposition(r: Rng, size: number): Composition {
  return {
    spearmen: Math.round(size * rrange(r, 0.3, 0.4)),
    archers: Math.round(size * rrange(r, 0.15, 0.25)),
    swordsmen: Math.round(size * rrange(r, 0.12, 0.2)),
    heavy: Math.round(size * rrange(r, 0.05, 0.1)),
    cavalry: Math.round(size * rrange(r, 0.05, 0.12)),
    knights: Math.round(size * rrange(r, 0.02, 0.06)),
  };
}

/** Seed each realm with a field army at its capital — the player's modest, the
 *  AI's a touch larger — plus the occasional roving host. */
export function spawnStartingArmies(world: World): Army[] {
  const r = makeRng(world.seed ^ 0x51ed270b);
  const armies: Army[] = [];
  for (const k of world.kingdoms) {
    if (!k.capitalProvinceId) continue;
    const size = k.isPlayer ? rint(r, 90, 150) : rint(r, 140, 320);
    armies.push({
      id: `army_${k.id}`,
      name: k.isPlayer ? "Your Host" : `Army of ${k.name.replace(/^(The |House )/, "")}`,
      ownerId: k.id,
      provinceId: k.capitalProvinceId,
      composition: makeComposition(r, size),
      commander: makeCommander(r),
      morale: rrange(r, 0.7, 0.9),
      supply: rrange(r, 0.7, 1),
      path: [],
      legProgress: 0,
    });
  }
  return armies;
}

/** The army's current world position — interpolated along its active leg so it
 *  visibly travels between provinces rather than teleporting. */
export function armyPos(world: World, a: Army): Point {
  const from = world.provinces.find((p) => p.id === a.provinceId)!.center;
  if (a.path.length === 0) return from;
  const to = world.provinces.find((p) => p.id === a.path[0])!.center;
  return {
    x: from.x + (to.x - from.x) * a.legProgress,
    y: from.y + (to.y - from.y) * a.legProgress,
  };
}

/** Raw fighting strength before terrain — troops weighted by type, commander
 * and morale/supply. */
export function armyStrength(a: Army): number {
  let base = 0;
  let cav = 0;
  for (const [t, n] of Object.entries(a.composition) as [UnitType, number][]) {
    base += UNIT[t].power * n;
    if (UNIT[t].cav) cav += n;
  }
  const cmd = 0.7 + (a.commander.command / 100) * 0.6;
  const cavBonus = 1 + (cav / Math.max(1, troopCount(a))) * (a.commander.cavalry / 100) * 0.4;
  return base * cmd * cavBonus * (0.4 + a.morale * 0.6) * (0.6 + a.supply * 0.4);
}

/** Cost to enter a province, in days, for one unit of "leg". Roads between two
 *  settled provinces speed the march; rough terrain slows it. */
function edgeCost(world: World, fromId: string, toId: string): number {
  const to = world.provinces.find((p) => p.id === toId)!;
  let cost = TERRAIN[to.terrain].moveCost;
  const hasRoad = world.roads.some(
    (r) =>
      (r.fromSettlement.includes(fromId) && r.toSettlement.includes(toId)) ||
      (r.fromSettlement.includes(toId) && r.toSettlement.includes(fromId)),
  );
  if (hasRoad) cost *= 0.6;
  return cost;
}

/** Dijkstra over the land province graph → the shortest march path (inclusive
 *  of the destination, exclusive of the start). Empty if unreachable. */
export function pathfind(world: World, fromId: string, toId: string): string[] {
  if (fromId === toId) return [];
  const byId = new Map(world.provinces.map((p) => [p.id, p]));
  const dist = new Map<string, number>([[fromId, 0]]);
  const prev = new Map<string, string>();
  const visited = new Set<string>();
  while (visited.size < byId.size) {
    let cur: string | null = null;
    let best = Infinity;
    for (const [id, d] of dist)
      if (!visited.has(id) && d < best) {
        best = d;
        cur = id;
      }
    if (cur === null) break;
    visited.add(cur);
    if (cur === toId) break;
    const p = byId.get(cur)!;
    for (const nid of p.neighbors) {
      const n = byId.get(nid)!;
      if (!TERRAIN[n.terrain].land) continue;
      const nd = best + edgeCost(world, cur, nid);
      if (nd < (dist.get(nid) ?? Infinity)) {
        dist.set(nid, nd);
        prev.set(nid, cur);
      }
    }
  }
  if (!prev.has(toId) && toId !== fromId) return [];
  const path: string[] = [];
  let step: string | undefined = toId;
  while (step && step !== fromId) {
    path.unshift(step);
    step = prev.get(step);
  }
  return step === fromId ? path : [];
}

/** Advance a marching army by dt days. Returns the province it entered this
 *  tick (for arrival/interception checks), or null. Mutates the army. */
export function advanceArmy(world: World, a: Army, days: number): string | null {
  if (a.path.length === 0) return null;
  let entered: string | null = null;
  let remaining = days;
  while (remaining > 0 && a.path.length > 0) {
    const nextId = a.path[0]!;
    const legDays = edgeCost(world, a.provinceId, nextId) * 2.2; // days to cross a leg
    const need = (1 - a.legProgress) * legDays;
    if (remaining >= need) {
      remaining -= need;
      a.provinceId = nextId;
      a.path.shift();
      a.legProgress = 0;
      a.supply = Math.max(0, a.supply - 0.02);
      entered = nextId;
    } else {
      a.legProgress += remaining / legDays;
      remaining = 0;
    }
  }
  return entered;
}
