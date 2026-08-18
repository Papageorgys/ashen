import { makeRng } from "./rng";
import { TERRAIN } from "./terrain";
import { armyStrength, troopCount, UNIT, type Army, type UnitType } from "./army";
import type { Province } from "./types";

/**
 * Battle resolution — the simulation decides the outcome from troops,
 * commander, morale, supply, terrain and fortification; it emits a STRUCTURED
 * result. Narrative (the report prose) is generated separately from this data,
 * never the other way round. Deterministic given the same inputs + seed.
 */

export interface BattleResult {
  attackerId: string;
  defenderId: string | null;
  provinceId: string;
  victor: "attacker" | "defender";
  attackerTroops: number;
  defenderTroops: number;
  attackerLosses: number;
  defenderLosses: number;
  /** a structured seed for the AI/report layer to dramatise */
  notable: { kind: string; unit?: UnitType; count?: number };
  siege: boolean;
}

/** How the attacker fights — the player's tactical call before a battle. */
export type Tactic = "balanced" | "aggressive" | "defensive" | "flank" | "cavalry";

/** Tactic → (attack multiplier, own-loss multiplier, enemy-loss multiplier). */
function tacticMods(tactic: Tactic, attacker: Army, r: () => number) {
  switch (tactic) {
    case "aggressive":
      return { atk: 1.18, ownLoss: 1.35, foeLoss: 1.15 };
    case "defensive":
      return { atk: 0.9, ownLoss: 0.6, foeLoss: 0.85 };
    case "flank": {
      const worked = r() < 0.5;
      return worked
        ? { atk: 1.45, ownLoss: 0.8, foeLoss: 1.3 }
        : { atk: 0.72, ownLoss: 1.3, foeLoss: 0.9 };
    }
    case "cavalry": {
      const total = troopCount(attacker) || 1;
      let cav = 0;
      for (const [t, n] of Object.entries(attacker.composition) as [UnitType, number][])
        if (UNIT[t].cav) cav += n ?? 0;
      const frac = cav / total;
      return { atk: 1 + frac * 1.1, ownLoss: 1 + frac * 0.3, foeLoss: 1 + frac * 0.5 };
    }
    default:
      return { atk: 1, ownLoss: 1, foeLoss: 1 };
  }
}

/** Resolve a field battle or an assault on a held province. `defender` may be
 *  null (an undefended settlement → a quick storm). `tactic` is the attacker's
 *  chosen approach. */
export function resolveBattle(
  attacker: Army,
  defender: Army | null,
  province: Province,
  seed: number,
  tactic: Tactic = "balanced",
  fortLevel = 0,
  opts?: {
    wallBonus?: number;
    atkMods?: Partial<Record<UnitType, number>>;
    defMods?: Partial<Record<UnitType, number>>;
  },
): BattleResult {
  const r = makeRng(seed ^ 0x9e3779b1);
  const terrainDef = TERRAIN[province.terrain].defense;
  // walls matter: a bare holding gives a little, a strong fortress a great deal
  const fort = province.settlementId ? 0.08 + fortLevel * 0.11 + (opts?.wallBonus ?? 0) : 0;
  const siege = !!province.settlementId && (defender ? true : true) && terrainDef >= 0;
  const mod = tacticMods(tactic, attacker, r);

  const atk = armyStrength(attacker, opts?.atkMods) * (0.9 + r() * 0.2) * mod.atk;
  // an undefended holding still has a garrison, and stronger walls hold more men
  const garrison = province.settlementId ? 30 + fortLevel * 55 : troopCount(attacker) * 0.12;
  const defBase = defender ? armyStrength(defender, opts?.defMods) : garrison;
  const def = defBase * (1 + terrainDef + fort) * (0.9 + r() * 0.2);

  const total = atk + def;
  const attackerWins = atk >= def;
  // loss ratio: the loser bleeds more; strength gap widens the gap
  const gap = Math.abs(atk - def) / total; // 0..1
  const atkTroops = troopCount(attacker);
  const defTroops = defender
    ? troopCount(defender)
    : province.settlementId
      ? Math.round(20 + fortLevel * 30)
      : Math.round(atkTroops * 0.15);

  let attackerLosses: number;
  let defenderLosses: number;
  if (attackerWins) {
    attackerLosses = Math.round(atkTroops * (0.08 + (1 - gap) * 0.22) * mod.ownLoss);
    defenderLosses = Math.round(defTroops * (0.35 + gap * 0.5) * mod.foeLoss);
  } else {
    attackerLosses = Math.round(atkTroops * (0.35 + gap * 0.5) * mod.ownLoss);
    defenderLosses = Math.round(defTroops * (0.08 + (1 - gap) * 0.22) * mod.foeLoss);
  }
  attackerLosses = Math.min(attackerLosses, atkTroops);
  defenderLosses = Math.min(defenderLosses, defTroops);

  // a notable event — the biggest present unit does something worth a chronicle
  const pool = (attackerWins ? attacker : (defender ?? attacker)).composition;
  let bigUnit: UnitType = "spearmen";
  let bigN = 0;
  for (const [t, n] of Object.entries(pool) as [UnitType, number][])
    if ((n ?? 0) > bigN) {
      bigN = n ?? 0;
      bigUnit = t;
    }
  const NOTABLES = siege
    ? ["walls_breached", "gate_stormed", "sortie_repelled", "ladders_thrown_back"]
    : ["held_the_line", "flank_collapsed", "cavalry_charge", "rout", "last_stand"];
  const notable = {
    kind: NOTABLES[Math.floor(r() * NOTABLES.length)]!,
    unit: bigUnit,
    count: Math.max(1, Math.round(bigN * (0.1 + r() * 0.2))),
  };

  return {
    attackerId: attacker.id,
    defenderId: defender?.id ?? null,
    provinceId: province.id,
    victor: attackerWins ? "attacker" : "defender",
    attackerTroops: atkTroops,
    defenderTroops: defTroops,
    attackerLosses,
    defenderLosses,
    notable,
    siege,
  };
}

const NOTABLE_PROSE: Record<string, (u: string, n: number) => string> = {
  walls_breached: (u, n) => `${n} ${u} poured through the breach as the wall came down.`,
  gate_stormed: (u, n) => `${n} ${u} stormed the gatehouse and threw it open from within.`,
  sortie_repelled: (u) =>
    `A desperate sortie of the garrison's ${u} was cut down before the ditch.`,
  ladders_thrown_back: (u) => `The defenders' ${u} hurled the scaling ladders back three times.`,
  held_the_line: (u, n) => `${n} ${u} held the centre when the line began to buckle.`,
  flank_collapsed: (u) => `The enemy's ${u} broke and the whole flank folded with them.`,
  cavalry_charge: (u, n) => `${n} ${u} timed their charge and shattered the reserve.`,
  rout: (u) => `Once the ${u} turned to run, the rout could not be stopped.`,
  last_stand: (u, n) => `${n} ${u} made a last stand around the banner and bought the retreat.`,
};

/** Turn the structured result into a chronicle line. (A stand-in for the AI
 *  narration layer — same contract: it reads the numbers, it does not invent
 *  them.) */
export function battleProse(res: BattleResult): string {
  const f = NOTABLE_PROSE[res.notable.kind];
  const unitName = res.notable.unit ? UNIT[res.notable.unit].name.toLowerCase() : "soldiers";
  return f ? f(unitName, res.notable.count ?? 0) : "";
}
