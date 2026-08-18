import { advanceArmy, troopCount, type Army, type Composition, type UnitType } from "./army";
import { resolveBattle, type BattleResult, type Tactic } from "./battle";
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

/** A battle awaiting the player's tactical decision before it is resolved. */
export interface PendingBattle {
  armyId: string;
  provinceId: string;
  from: string;
  siege: boolean;
  defenderId: string | null;
}

/** Would `army` fight on entering `entered`, and if so is it a siege? */
function battleAt(state: RealmState, army: Army, entered: string) {
  const prov = state.world.provinces.find((p) => p.id === entered)!;
  const foe = state.armies
    .filter((o) => o.ownerId !== army.ownerId && o.provinceId === entered && troopCount(o) > 0)
    .sort((a, b) => troopCount(b) - troopCount(a))[0];
  if (foe) return { fight: true, foe, siege: !!prov.settlementId };
  if (prov.ownerId !== army.ownerId && prov.settlementId)
    return { fight: true, foe: null, siege: true };
  return { fight: false, foe: null, siege: false };
}

/** Resolve one army's battle on entering a province, with a chosen tactic.
 *  Mutates state (losses, capture); returns the event. */
export function fight(
  state: RealmState,
  army: Army,
  entered: string,
  tactic: Tactic = "balanced",
): BattleEvent | null {
  const { world } = state;
  const kName = (id: string) => world.kingdoms.find((k) => k.id === id)?.name ?? "wilderness";
  const prov = world.provinces.find((p) => p.id === entered)!;
  const { foe } = battleAt(state, army, entered);

  const seed = world.seed ^ hash(army.id) ^ Math.floor(state.day);
  const fortLevel = prov.settlementId
    ? (world.settlements.find((s) => s.id === prov.settlementId)?.fortLevel ?? 0)
    : 0;
  const res = resolveBattle(army, foe ?? null, prov, seed, tactic, fortLevel);
  applyLosses(army, res.attackerLosses);
  army.path = [];
  let defenderName: string;
  let defenderKingdomId: string | null;
  if (foe) {
    applyLosses(foe, res.defenderLosses);
    defenderName = kName(foe.ownerId);
    defenderKingdomId = foe.ownerId;
  } else {
    defenderName = prov.ownerId ? kName(prov.ownerId) : "the garrison";
    defenderKingdomId = prov.ownerId;
  }
  let captured = false;
  if (res.victor === "attacker") {
    army.veterancy = Math.min(6, (army.veterancy ?? 0) + 0.34); // blooded in victory
    if (prov.ownerId !== army.ownerId && prov.settlementId) {
      prov.ownerId = army.ownerId;
      captured = true;
    }
  } else if (foe) {
    foe.veterancy = Math.min(6, (foe.veterancy ?? 0) + 0.34); // the defender earns it too
  }
  return {
    ...res,
    day: Math.floor(state.day),
    provinceName: prov.name,
    attackerName: kName(army.ownerId),
    defenderName,
    attackerKingdomId: army.ownerId,
    defenderKingdomId,
    captured,
  };
}

/** Resolve a deferred player battle once the tactic is chosen. */
export function resolvePending(
  state: RealmState,
  pending: PendingBattle,
  tactic: Tactic,
): BattleEvent | null {
  const army = state.armies.find((a) => a.id === pending.armyId);
  if (!army || troopCount(army) <= 0) return null;
  const ev = fight(state, army, pending.provinceId, tactic);
  state.armies = state.armies.filter((a) => troopCount(a) > 0 || a.id.startsWith("garrison_"));
  return ev;
}

/** Pull a marching army back to where it came from (chose to withdraw). */
export function withdrawArmy(state: RealmState, pending: PendingBattle) {
  const army = state.armies.find((a) => a.id === pending.armyId);
  if (army) {
    army.provinceId = pending.from;
    army.path = [];
    army.legProgress = 0;
    army.morale = Math.max(0.15, army.morale - 0.08);
  }
}

/** Advance the whole realm by `days`. Mutates state; returns battles fought,
 *  plus any player-initiated battle deferred for a tactical decision. */
export function tickRealm(
  state: RealmState,
  days: number,
  opts?: { playerId?: string },
): { events: BattleEvent[]; pending: PendingBattle | null } {
  const { world } = state;
  const events: BattleEvent[] = [];
  const playerId = opts?.playerId;

  state.day += days;

  for (const army of state.armies) {
    if (troopCount(army) <= 0 || army.path.length === 0) continue;
    const from = army.provinceId;
    const entered = advanceArmy(world, army, days);
    if (!entered) continue;
    const { fight: willFight, siege, foe } = battleAt(state, army, entered);
    if (!willFight) continue;
    // a battle the player leads waits on their command
    if (playerId && army.ownerId === playerId) {
      army.path = [];
      return {
        events,
        pending: { armyId: army.id, provinceId: entered, from, siege, defenderId: foe?.id ?? null },
      };
    }
    const ev = fight(state, army, entered);
    if (ev) events.push(ev);
  }

  // clear out annihilated hosts
  state.armies = state.armies.filter((a) => troopCount(a) > 0 || a.id.startsWith("garrison_"));
  return { events, pending: null };
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
