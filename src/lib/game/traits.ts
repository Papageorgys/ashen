// Traits — the warband's builds. Every seasoned champion may take ONE trait: a
// chosen passive that plugs into the systems the player actually commands. Most
// of a trait's weight lands in the Proving (the tactical layer) — sharpening the
// conditions, formation and momentum mechanics — and a lighter share follows the
// champion into the field, so a hunt reflects who they've become too.
//
// Traits are a build axis distinct from class, skills, craft mastery and runes:
// they don't change what a champion IS, they change how they FIGHT.

import type { Role } from "./data";

export type TraitId =
  | "vanguard"
  | "warden"
  | "berserker"
  | "executioner"
  | "duelist"
  | "elementalist"
  | "zealot"
  | "chirurgeon";

/** The tactical modifiers a trait grants — read by the Proving's combat loop. */
export interface TraitMods {
  /** +crit chance (flat, 0..1) */
  crit?: number;
  /** extra damage vs foes below the bloodied threshold */
  exec?: number;
  /** flat damage multiplier on this champion's blows */
  dmg?: number;
  /** multiplier on this champion's own mitigation */
  mit?: number;
  /** +mitigation while standing in the front line */
  frontMit?: number;
  /** while this champion stands in the front line, the back rank takes less */
  wardBack?: number;
  /** multiplier on the potency of conditions this champion applies */
  condBoost?: number;
  /** extra rounds on conditions this champion applies */
  condRounds?: number;
  /** multiplier on momentum this champion builds */
  momentum?: number;
  /** this champion's heals also strip a condition, and heal for more */
  healCleanse?: boolean;
}

/** The field bonuses a trait grants — applied to a hunt's spoils per champion. */
export interface TraitField {
  gold?: number; // fraction added
  xp?: number;
  find?: number; // flat drop-luck
}

export interface TraitDef {
  id: TraitId;
  name: string;
  blurb: string;
  /** roles that may take it ("any" = all) */
  roles: Role[] | "any";
  /** the champion level at which it can be taken */
  unlock: number;
  tac: TraitMods;
  field: TraitField;
}

export const TRAITS: Record<TraitId, TraitDef> = {
  vanguard: {
    id: "vanguard",
    name: "Vanguard",
    blurb: "Made for the front line — far harder to break while holding it.",
    roles: ["guardian", "blade"],
    unlock: 6,
    tac: { frontMit: 0.14 },
    field: { gold: 0.04 },
  },
  warden: {
    id: "warden",
    name: "Warden",
    blurb: "While they hold the front, the back rank behind them takes 18% less.",
    roles: ["guardian"],
    unlock: 12,
    tac: { wardBack: 0.18, frontMit: 0.06 },
    field: {},
  },
  berserker: {
    id: "berserker",
    name: "Berserker",
    blurb: "Deals 25% more, but guards 12% worse. All teeth, no shield.",
    roles: ["blade"],
    unlock: 10,
    tac: { dmg: 1.25, mit: 0.88 },
    field: { gold: 0.06 },
  },
  executioner: {
    id: "executioner",
    name: "Executioner",
    blurb: "Blows land 40% harder against a bloodied foe (under a third HP).",
    roles: ["blade", "archer"],
    unlock: 10,
    tac: { exec: 0.4 },
    field: { gold: 0.05 },
  },
  duelist: {
    id: "duelist",
    name: "Duelist",
    blurb: "A hunter's eye — +12% to land a critical blow.",
    roles: ["archer", "blade"],
    unlock: 8,
    tac: { crit: 0.12 },
    field: { gold: 0.04 },
  },
  elementalist: {
    id: "elementalist",
    name: "Elementalist",
    blurb: "The marks they leave burn hotter and cling a round longer.",
    roles: ["arcanist"],
    unlock: 8,
    tac: { condBoost: 1.5, condRounds: 1 },
    field: { xp: 0.06 },
  },
  zealot: {
    id: "zealot",
    name: "Zealot",
    blurb: "Fights with fury — builds the Press half again as fast.",
    roles: ["chanter", "blade", "guardian"],
    unlock: 8,
    tac: { momentum: 1.5 },
    field: { xp: 0.08 },
  },
  chirurgeon: {
    id: "chirurgeon",
    name: "Field Chirurgeon",
    blurb: "Their mending also strips a condition and restores 25% more.",
    roles: ["mender"],
    unlock: 8,
    tac: { healCleanse: true },
    field: { gold: 0.03 },
  },
};

export const TRAIT_IDS = Object.keys(TRAITS) as TraitId[];

/** The traits a champion of this role and level may choose (plus "none"). */
export function traitsFor(role: Role, level: number): TraitDef[] {
  return TRAIT_IDS.map((id) => TRAITS[id]).filter(
    (t) => (t.roles === "any" || t.roles.includes(role)) && level >= t.unlock,
  );
}

/** Empty modifiers — the default for foes and untraited champions. */
export const NO_MODS: TraitMods = {};

export function traitMods(id: TraitId | undefined): TraitMods {
  return id ? TRAITS[id].tac : NO_MODS;
}
export function traitField(id: TraitId | undefined): TraitField {
  return id ? TRAITS[id].field : {};
}
