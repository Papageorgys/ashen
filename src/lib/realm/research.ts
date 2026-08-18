import type { UnitType } from "./army";
import type { Ledger } from "./kingdom";
import type { ResourceId } from "./types";

/**
 * The Research Center — doctrines the crown studies over time to lift the realm
 * for good. Each pays gold + a resource and takes days; when it completes its
 * effect is permanent. Effects are read by the simulation (unit power, wall
 * strength, march speed, tax, recruit cost) — the study only unlocks them.
 */

export type ResearchBranch = "warfare" | "fortcraft" | "logistics" | "statecraft";

export interface TechEffect {
  power?: Partial<Record<UnitType, number>>; // added to a unit's power multiplier
  wall?: number; // added siege-defence for your holdings
  move?: number; // fraction faster army movement (0.2 = 20%)
  tax?: number; // fraction more tax revenue
  recruit?: number; // fraction off recruit cost
}

export interface Tech {
  id: string;
  name: string;
  branch: ResearchBranch;
  blurb: string;
  gold: number;
  res: ResourceId;
  resN: number;
  days: number;
  requires?: string;
  effect: TechEffect;
}

export const TECHS: Tech[] = [
  {
    id: "drillmasters",
    name: "Drillmasters",
    branch: "warfare",
    blurb: "Hardened spear- and swordsmen. +25% foot power.",
    gold: 220,
    res: "iron",
    resN: 20,
    days: 120,
    effect: { power: { spearmen: 0.25, swordsmen: 0.25 } },
  },
  {
    id: "fletchers",
    name: "Master Fletchers",
    branch: "warfare",
    blurb: "Deadlier archery. +35% archer power.",
    gold: 200,
    res: "wood",
    resN: 30,
    days: 110,
    effect: { power: { archers: 0.35 } },
  },
  {
    id: "harness",
    name: "Heavy Harness",
    branch: "warfare",
    blurb: "Full plate for the front rank. +30% heavy power.",
    gold: 320,
    res: "iron",
    resN: 35,
    days: 150,
    requires: "drillmasters",
    effect: { power: { heavy: 0.3 } },
  },
  {
    id: "lance",
    name: "Stirrup & Lance",
    branch: "warfare",
    blurb: "The couched charge. +30% cavalry and knight power.",
    gold: 360,
    res: "horses",
    resN: 20,
    days: 160,
    effect: { power: { cavalry: 0.3, knights: 0.3 } },
  },
  {
    id: "masonry",
    name: "Stone Masonry",
    branch: "fortcraft",
    blurb: "Thicker walls. Your holdings defend far better.",
    gold: 240,
    res: "stone",
    resN: 40,
    days: 130,
    effect: { wall: 0.18 },
  },
  {
    id: "forced_march",
    name: "Forced March",
    branch: "logistics",
    blurb: "Your hosts cross ground 25% faster.",
    gold: 180,
    res: "food",
    resN: 30,
    days: 100,
    effect: { move: 0.25 },
  },
  {
    id: "mint",
    name: "The Royal Mint",
    branch: "statecraft",
    blurb: "Coin better struck and counted. +20% tax revenue.",
    gold: 260,
    res: "stone",
    resN: 20,
    days: 120,
    effect: { tax: 0.2 },
  },
  {
    id: "charters",
    name: "Guild Charters",
    branch: "statecraft",
    blurb: "The guilds ease the muster. −15% recruit cost.",
    gold: 220,
    res: "wood",
    resN: 25,
    days: 120,
    requires: "mint",
    effect: { recruit: 0.15 },
  },
];

export const TECH_BY_ID: Record<string, Tech> = Object.fromEntries(TECHS.map((t) => [t.id, t]));

export interface ResearchState {
  completed: string[];
  current: { techId: string; startedAt: number; until: number } | null;
}

export function makeResearch(): ResearchState {
  return { completed: [], current: null };
}

export function isDone(rs: ResearchState, id: string): boolean {
  return rs.completed.includes(id);
}

export function canResearch(rs: ResearchState, ledger: Ledger, tech: Tech): boolean {
  if (rs.current || isDone(rs, tech.id)) return false;
  if (tech.requires && !isDone(rs, tech.requires)) return false;
  return ledger.treasury >= tech.gold && (ledger.stores[tech.res] ?? 0) >= tech.resN;
}

/** Begin studying a doctrine, paying its cost up front. */
export function startResearch(
  rs: ResearchState,
  ledger: Ledger,
  techId: string,
  day: number,
): boolean {
  const tech = TECH_BY_ID[techId];
  if (!tech || !canResearch(rs, ledger, tech)) return false;
  ledger.treasury -= tech.gold;
  ledger.stores[tech.res] -= tech.resN;
  rs.current = { techId, startedAt: Math.floor(day), until: Math.floor(day) + tech.days };
  return true;
}

/** Complete a doctrine whose study has run its course. */
export function tickResearch(rs: ResearchState, day: number): string | null {
  if (rs.current && day >= rs.current.until) {
    const id = rs.current.techId;
    rs.completed.push(id);
    rs.current = null;
    return id;
  }
  return null;
}

export interface ResearchBonuses {
  powerMods: Partial<Record<UnitType, number>>;
  wall: number;
  move: number;
  tax: number;
  recruit: number;
}

/** Fold every completed doctrine into one set of live bonuses. */
export function researchBonuses(rs: ResearchState): ResearchBonuses {
  const b: ResearchBonuses = { powerMods: {}, wall: 0, move: 0, tax: 0, recruit: 0 };
  for (const id of rs.completed) {
    const e = TECH_BY_ID[id]?.effect;
    if (!e) continue;
    if (e.power)
      for (const [u, v] of Object.entries(e.power) as [UnitType, number][])
        b.powerMods[u] = (b.powerMods[u] ?? 1) + v;
    if (e.wall) b.wall += e.wall;
    if (e.move) b.move += e.move;
    if (e.tax) b.tax += e.tax;
    if (e.recruit) b.recruit += e.recruit;
  }
  return b;
}
