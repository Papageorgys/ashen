// Ascension — the Ashen Legacy.
//
// The clan's climb has a ceiling (max clan level, the throne, the castle). When
// you reach the pinnacle you may PASS INTO LEGACY: the run resets, but the deeds
// of the house endure as Legacy — permanent, stacking boons that make every
// following run richer, faster and taller. Each ascension is a fresh climb from
// higher ground. This is the spine of the long game (a roguelite meta-loop) and
// it is exactly what the title means: an Ashen Legacy, run upon run.
//
// Pure data + a pure effects fold (the same discipline as court / keep effects),
// so the engine and UI never drift. GameState is a type-only import — no cycle.

import type { GameState } from "./engine";

export type LegacyBoonId =
  | "ancestral_wealth"
  | "blood_memory"
  | "deep_coffers"
  | "fell_hand"
  | "standing_army"
  | "enduring_renown"
  | "head_start"
  | "swift_muster";

export interface LegacyBoonDef {
  id: LegacyBoonId;
  name: string;
  glyph: string;
  blurb: string;
  maxLevel: number;
  /** legacy points to buy the NEXT level from `have` (0-indexed) */
  cost: (have: number) => number;
}

export const LEGACY_BOONS: Record<LegacyBoonId, LegacyBoonDef> = {
  ancestral_wealth: {
    id: "ancestral_wealth",
    name: "Ancestral Wealth",
    glyph: "🪙",
    blurb: "+10% hunt gold, and a fatter war-chest to begin each run, per rank.",
    maxLevel: 6,
    cost: (h) => 2 + h * 2,
  },
  blood_memory: {
    id: "blood_memory",
    name: "Blood Memory",
    glyph: "📜",
    blurb: "+10% experience — your champions remember the fights of past lives.",
    maxLevel: 6,
    cost: (h) => 2 + h * 2,
  },
  deep_coffers: {
    id: "deep_coffers",
    name: "Deep Coffers",
    glyph: "💰",
    blurb: "+8% to find rare drops on every hunt, per rank.",
    maxLevel: 5,
    cost: (h) => 3 + h * 3,
  },
  fell_hand: {
    id: "fell_hand",
    name: "Fell Hand",
    glyph: "⚔",
    blurb: "+6% fighting power to every banner you field, per rank.",
    maxLevel: 5,
    cost: (h) => 3 + h * 3,
  },
  standing_army: {
    id: "standing_army",
    name: "Standing Army",
    glyph: "🚩",
    blurb: "+1 banner slot beyond the old ceiling of eight, per rank.",
    maxLevel: 4,
    cost: (h) => 5 + h * 5,
  },
  enduring_renown: {
    id: "enduring_renown",
    name: "Enduring Renown",
    glyph: "🏆",
    blurb: "+10% reputation — the realm remembers your house, per rank.",
    maxLevel: 5,
    cost: (h) => 2 + h * 2,
  },
  head_start: {
    id: "head_start",
    name: "Head Start",
    glyph: "🏰",
    blurb: "Begin each new run one clan level higher, per rank — skip the early grind.",
    maxLevel: 4,
    cost: (h) => 4 + h * 4,
  },
  swift_muster: {
    id: "swift_muster",
    name: "Swift Muster",
    glyph: "🛡",
    blurb: "Begin each run with one more sworn blade already at your side, per rank.",
    maxLevel: 4,
    cost: (h) => 3 + h * 3,
  },
};

export const LEGACY_BOON_IDS = Object.keys(LEGACY_BOONS) as LegacyBoonId[];

export interface LegacyState {
  /** how many times the house has ascended */
  ascensions: number;
  /** legacy points available to spend */
  points: number;
  /** total points ever earned (for display) */
  earned: number;
  /** purchased boon ranks */
  boons: Partial<Record<LegacyBoonId, number>>;
  /** the high-water mark of the house */
  best: { clanLevel: number; renown: number };
}

export function initialLegacy(): LegacyState {
  return { ascensions: 0, points: 0, earned: 0, boons: {}, best: { clanLevel: 0, renown: 0 } };
}

export function boonLevel(state: GameState, id: LegacyBoonId): number {
  return state.legacy?.boons?.[id] ?? 0;
}

export interface LegacyEffects {
  goldMult: number;
  xpMult: number;
  findMult: number;
  powerMult: number;
  renownMult: number;
  bannerBonus: number;
  startGold: number;
  startClanLevel: number;
  startMembers: number;
}

/** Fold the purchased boons into a single set of permanent multipliers. */
export function legacyEffects(state: GameState): LegacyEffects {
  const lv = (id: LegacyBoonId) => state.legacy?.boons?.[id] ?? 0;
  return {
    goldMult: 1 + lv("ancestral_wealth") * 0.1,
    xpMult: 1 + lv("blood_memory") * 0.1,
    findMult: 1 + lv("deep_coffers") * 0.08,
    powerMult: 1 + lv("fell_hand") * 0.06,
    renownMult: 1 + lv("enduring_renown") * 0.1,
    bannerBonus: lv("standing_army"),
    startGold: lv("ancestral_wealth") * 2500,
    startClanLevel: lv("head_start"),
    startMembers: lv("swift_muster"),
  };
}
