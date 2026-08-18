import { advanceArmy, troopCount, type Army, type Composition, type UnitType } from "./army";
import { resolveBattle, type BattleResult } from "./battle";
import { TERRAIN } from "./terrain";
import type { World } from "./types";

/**
 * The realm tick — the authoritative real-time loop. It advances marching
 * armies across the province graph and, when a host enters contested ground,
 * resolves the battle and transfers control. Everything here is simulation;
 * it emits structured events the UI narrates. Deterministic given the seed.
 */

export interface RealmState {
  world: World;
  armies: Army[];
  day: number;
}

export interface BattleEvent extends BattleResult {
  day: number;
  provinceName: string;
  attackerName: string;
  defenderName: string;
  attackerKingdomId: string;
  defenderKingdomId: string | null;
  captured: boolean;
}

/** Remove `n` troops from a host, spread across its unit types. */
function applyLosses(a: Army, n: number) {
  const total = troopCount(a);
  if (total <= 0) return;
  const frac = Math.min(1, n / total);
  const comp: Composition = {};
  for (const [t, c] of Object.entries(a.composition) as [UnitType, number][]) {
    comp[t] = Math.max(0, Math.round((c ?? 0) * (1 - frac)));
  }
  a.composition = comp;
  a.morale = Math.max(0.15, a.morale - frac * 0.5);
}

/** Advance the whole realm by `days`. Mutates state; returns battles fought. */
export function tickRealm(state: RealmState, days: number): BattleEvent[] {
  const { world } = state;
  const events: BattleEvent[] = [];
  const provName = (id: string) => world.provinces.find((p) => p.id === id)?.name ?? id;
  const kName = (id: string) => world.kingdoms.find((k) => k.id === id)?.name ?? "wilderness";

  state.day += days;

  for (const army of state.armies) {
    if (troopCount(army) <= 0 || army.path.length === 0) continue;
    const entered = advanceArmy(world, army, days);
    if (!entered) continue;
    const prov = world.provinces.find((p) => p.id === entered)!;

    // 1) an enemy host standing here → a field battle
    const foe = state.armies
      .filter((o) => o.ownerId !== army.ownerId && o.provinceId === entered && troopCount(o) > 0)
      .sort((a, b) => troopCount(b) - troopCount(a))[0];

    let res: BattleResult | null = null;
    let defenderName = "the garrison";
    let defenderKingdomId: string | null = null;
    let captured = false;
    if (foe) {
      res = resolveBattle(army, foe, prov, world.seed ^ hash(army.id) ^ Math.floor(state.day));
      applyLosses(army, res.attackerLosses);
      applyLosses(foe, res.defenderLosses);
      defenderName = kName(foe.ownerId);
      defenderKingdomId = foe.ownerId;
      army.path = []; // a clash halts the march
      if (res.victor === "attacker" && prov.ownerId !== army.ownerId && prov.settlementId) {
        prov.ownerId = army.ownerId;
        captured = true;
      }
    } else if (prov.ownerId !== army.ownerId && prov.settlementId) {
      // 2) an undefended enemy/wilderness holding → an assault
      res = resolveBattle(army, null, prov, world.seed ^ hash(army.id) ^ Math.floor(state.day));
      applyLosses(army, res.attackerLosses);
      defenderName = prov.ownerId ? kName(prov.ownerId) : "the garrison";
      defenderKingdomId = prov.ownerId;
      if (res.victor === "attacker") {
        prov.ownerId = army.ownerId;
        army.path = [];
        captured = true;
      }
    }

    if (res) {
      events.push({
        ...res,
        day: Math.floor(state.day),
        provinceName: provName(entered),
        attackerName: kName(army.ownerId),
        defenderName,
        attackerKingdomId: army.ownerId,
        defenderKingdomId,
        captured,
      });
    }
  }

  // clear out annihilated hosts
  state.armies = state.armies.filter((a) => troopCount(a) > 0);
  return events;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Is this province a legal march target for the army (reachable land)? */
export function canMarch(world: World, provinceId: string): boolean {
  const p = world.provinces.find((x) => x.id === provinceId);
  return !!p && TERRAIN[p.terrain].land;
}
