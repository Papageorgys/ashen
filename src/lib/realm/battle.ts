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

/** Resolve a field battle or an assault on a held province. `defender` may be
 *  null (an undefended settlement → a quick storm). */
export function resolveBattle(
  attacker: Army,
  defender: Army | null,
  province: Province,
  seed: number,
): BattleResult {
  const r = makeRng(seed ^ 0x9e3779b1);
  const terrainDef = TERRAIN[province.terrain].defense;
  const fort = province.settlementId ? 0.15 : 0;
  const siege = !!province.settlementId && (defender ? true : true) && terrainDef >= 0;

  const atk = armyStrength(attacker) * (0.9 + r() * 0.2);
  const defBase = defender ? armyStrength(defender) : troopCount(attacker) * 0.12; // token garrison
  const def = defBase * (1 + terrainDef + fort) * (0.9 + r() * 0.2);

  const total = atk + def;
  const attackerWins = atk >= def;
  // loss ratio: the loser bleeds more; strength gap widens the gap
  const gap = Math.abs(atk - def) / total; // 0..1
  const atkTroops = troopCount(attacker);
  const defTroops = defender ? troopCount(defender) : Math.round(atkTroops * 0.15);

  let attackerLosses: number;
  let defenderLosses: number;
  if (attackerWins) {
    attackerLosses = Math.round(atkTroops * (0.08 + (1 - gap) * 0.22));
    defenderLosses = Math.round(defTroops * (0.35 + gap * 0.5));
  } else {
    attackerLosses = Math.round(atkTroops * (0.35 + gap * 0.5));
    defenderLosses = Math.round(defTroops * (0.08 + (1 - gap) * 0.22));
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
