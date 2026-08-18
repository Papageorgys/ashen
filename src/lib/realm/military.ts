import { troopCount, type Army, type UnitType } from "./army";
import { realmSummary } from "./economy";
import type { Ledger } from "./kingdom";
import type { ResourceId, World } from "./types";

/**
 * The Muster — raising and training troops. Recruit a unit type and it drills
 * over real days before joining your home garrison; every soldier is a person,
 * so a realm can field only a fraction of its people. Armies also grow in
 * veterancy, by winning battles or by paying to drill them. All authoritative,
 * all interactive.
 */

export const RECRUIT_LOT = 10;

/** Per-soldier cost and training time of each unit type. */
const COST: Record<UnitType, { gold: number; res: ResourceId; resN: number; days: number }> = {
  spearmen: { gold: 6, res: "food", resN: 1, days: 30 },
  archers: { gold: 9, res: "wood", resN: 1, days: 40 },
  swordsmen: { gold: 13, res: "iron", resN: 1, days: 55 },
  heavy: { gold: 22, res: "iron", resN: 2, days: 75 },
  cavalry: { gold: 26, res: "horses", resN: 1, days: 75 },
  knights: { gold: 48, res: "horses", resN: 2, days: 110 },
};

export function recruitCost(type: UnitType, lot = RECRUIT_LOT, discount = 0) {
  const c = COST[type];
  return {
    gold: Math.round(c.gold * lot * (1 - discount)),
    res: c.res,
    resN: c.resN * lot,
    days: c.days,
  };
}

export interface TrainingOrder {
  type: UnitType;
  count: number;
  startedAt: number;
  until: number;
}

export interface Muster {
  garrisonId: string;
  queue: TrainingOrder[];
}

export function makeMuster(playerId: string): Muster {
  return { garrisonId: `garrison_${playerId}`, queue: [] };
}

/** The most soldiers a realm can keep under arms — a share of its people, plus
 *  a standing core. Conquer more provinces and the cap rises with them. */
export function manpowerCap(world: World, playerId: string): number {
  return Math.floor(realmSummary(world, playerId).population * 0.25) + 60;
}

/** Troops already fielded or in training. */
export function currentManpower(muster: Muster, armies: Army[], playerId: string): number {
  const fielded = armies
    .filter((a) => a.ownerId === playerId)
    .reduce((s, a) => s + troopCount(a), 0);
  const queued = muster.queue.reduce((s, o) => s + o.count, 0);
  return fielded + queued;
}

export interface RecruitCheck {
  ok: boolean;
  reason?: "gold" | "resource" | "manpower";
}

export function canRecruit(
  ledger: Ledger,
  muster: Muster,
  world: World,
  armies: Army[],
  playerId: string,
  type: UnitType,
  lot = RECRUIT_LOT,
  discount = 0,
): RecruitCheck {
  const cost = recruitCost(type, lot, discount);
  if (ledger.treasury < cost.gold) return { ok: false, reason: "gold" };
  if ((ledger.stores[cost.res] ?? 0) < cost.resN) return { ok: false, reason: "resource" };
  if (currentManpower(muster, armies, playerId) + lot > manpowerCap(world, playerId))
    return { ok: false, reason: "manpower" };
  return { ok: true };
}

/** Queue a lot of recruits if the realm can pay and man it. */
export function recruit(
  ledger: Ledger,
  muster: Muster,
  world: World,
  armies: Army[],
  playerId: string,
  type: UnitType,
  day: number,
  lot = RECRUIT_LOT,
  discount = 0,
): boolean {
  if (!canRecruit(ledger, muster, world, armies, playerId, type, lot, discount).ok) return false;
  const cost = recruitCost(type, lot, discount);
  ledger.treasury -= cost.gold;
  ledger.stores[cost.res] -= cost.resN;
  muster.queue.push({
    type,
    count: lot,
    startedAt: Math.floor(day),
    until: Math.floor(day) + cost.days,
  });
  return true;
}

/** Move finished training into the home garrison. */
export function tickMuster(muster: Muster, armies: Army[], day: number): void {
  if (muster.queue.length === 0) return;
  const garrison = armies.find((a) => a.id === muster.garrisonId);
  if (!garrison) return;
  const remaining: TrainingOrder[] = [];
  for (const o of muster.queue) {
    if (day >= o.until)
      garrison.composition[o.type] = (garrison.composition[o.type] ?? 0) + o.count;
    else remaining.push(o);
  }
  muster.queue = remaining;
}

export const DRILL_MAX = 5;
export const drillCost = (vet: number) => Math.round(90 + Math.floor(vet) * 80);

/** Pay to raise an army's veterancy one rank. */
export function drill(ledger: Ledger, army: Army): boolean {
  const v = Math.floor(army.veterancy ?? 0);
  if (v >= DRILL_MAX) return false;
  const cost = drillCost(army.veterancy ?? 0);
  if (ledger.treasury < cost) return false;
  ledger.treasury -= cost;
  army.veterancy = v + 1;
  return true;
}
