import type { Stats } from "./data";

/**
 * Backgrounds — the life a champion led before they swore to the banner.
 * Inspired by Baldur's Gate 3: every champion carries one, it nudges their
 * stats, grants a standing perk, and its deed earns the clan Inspiration.
 */
export type ProfessionId =
  | "acolyte"
  | "charlatan"
  | "outlaw"
  | "entertainer"
  | "folk_hero"
  | "guild_artisan"
  | "noble"
  | "outlander"
  | "sage"
  | "sailor"
  | "soldier"
  | "urchin";

/** How the deed is earned on an expedition. */
export type DeedTrigger =
  | "clear_dungeon"
  | "clear_field"
  | "survive_rout"
  | "finish_wounded"
  | "big_haul"
  | "outnumbered"
  | "full_party"
  | "high_kills";

export interface ProfessionPerk {
  /** % added to the champion's own power */
  power?: number;
  /** flat find (drop luck) */
  find?: number;
  /** % of party gold */
  gold?: number;
  /** % of party xp */
  xp?: number;
  /** % damage the party shrugs off */
  mitigation?: number;
  /** % off skill MP costs */
  upkeep?: number;
  /** % added to forge success */
  craft?: number;
  /** % less chance of dying for good */
  deathGuard?: number;
}

export interface ProfessionDef {
  id: ProfessionId;
  name: string;
  blurb: string;
  stats: Partial<Stats>;
  perkName: string;
  perkText: string;
  perk: ProfessionPerk;
  deed: DeedTrigger;
  deedText: string;
}

export const PROFESSIONS: ProfessionDef[] = [
  {
    id: "acolyte",
    name: "Acolyte",
    blurb: "Raised in a temple, still whispers the old litanies before a fight.",
    stats: { men: 2, wit: 1 },
    perkName: "Litany",
    perkText: "Skills cost less to sustain and the banner takes less punishment.",
    perk: { upkeep: 6, mitigation: 2 },
    deed: "finish_wounded",
    deedText: "Come home with the banner bloodied but whole.",
  },
  {
    id: "charlatan",
    name: "Charlatan",
    blurb: "Sold three cures for the same plague, in the same street, on the same day.",
    stats: { dex: 2, wit: 1 },
    perkName: "Silver Tongue",
    perkText: "Squeezes more gold out of every haul.",
    perk: { gold: 6, find: 2 },
    deed: "big_haul",
    deedText: "Return from a run carrying four or more kinds of spoil.",
  },
  {
    id: "outlaw",
    name: "Outlaw",
    blurb: "Wanted in two provinces under a name they no longer answer to.",
    stats: { dex: 2, str: 1 },
    perkName: "No Clean Fights",
    perkText: "Hits harder and knows exactly when to run.",
    perk: { power: 5, deathGuard: 10 },
    deed: "survive_rout",
    deedText: "Walk out alive from a run that went wrong.",
  },
  {
    id: "entertainer",
    name: "Entertainer",
    blurb: "Kept a whole tavern laughing while the roof burned.",
    stats: { wit: 2, dex: 1 },
    perkName: "Marching Song",
    perkText: "The banner learns faster with a song to keep step to.",
    perk: { xp: 6, upkeep: 3 },
    deed: "full_party",
    deedText: "Ride out with a full banner of five.",
  },
  {
    id: "folk_hero",
    name: "Folk Hero",
    blurb: "Killed something enormous once. The village still tells it wrong.",
    stats: { con: 2, str: 1 },
    perkName: "They're Watching",
    perkText: "Stands firmer than they should, and refuses to fall.",
    perk: { mitigation: 4, deathGuard: 15 },
    deed: "clear_field",
    deedText: "Clear open ground in the light of day.",
  },
  {
    id: "guild_artisan",
    name: "Guild Artisan",
    blurb: "Signed a masterwork with a mark the guild still recognises.",
    stats: { int: 2, con: 1 },
    perkName: "Guild Mark",
    perkText: "Raises the odds at the forge for the whole clan.",
    perk: { craft: 4, gold: 2 },
    deed: "big_haul",
    deedText: "Return from a run carrying four or more kinds of spoil.",
  },
  {
    id: "noble",
    name: "Noble",
    blurb: "Born to a house that no longer sends letters.",
    stats: { men: 2, int: 1 },
    perkName: "Old Name",
    perkText: "Doors open, and coin follows.",
    perk: { gold: 8, xp: 2 },
    deed: "clear_dungeon",
    deedText: "Take a dungeon and come back with the story.",
  },
  {
    id: "outlander",
    name: "Outlander",
    blurb: "Knows which berries kill and which road never had a name.",
    stats: { con: 2, dex: 1 },
    perkName: "Trailcraft",
    perkText: "Finds what others walk past, and endures the long march.",
    perk: { find: 5, mitigation: 2 },
    deed: "clear_field",
    deedText: "Clear open ground in the light of day.",
  },
  {
    id: "sage",
    name: "Sage",
    blurb: "Read every book in a library that has since burned down.",
    stats: { int: 2, wit: 1 },
    perkName: "Studied",
    perkText: "Turns every fight into a lesson for the banner.",
    perk: { xp: 8, upkeep: 4 },
    deed: "high_kills",
    deedText: "Cut down a great many foes in a single run.",
  },
  {
    id: "sailor",
    name: "Sailor",
    blurb: "Three shipwrecks, three swims, no regrets.",
    stats: { str: 1, dex: 1, con: 1 },
    perkName: "Sea Legs",
    perkText: "Hard to drown, hard to kill, quick to spot salvage.",
    perk: { find: 3, deathGuard: 12 },
    deed: "survive_rout",
    deedText: "Walk out alive from a run that went wrong.",
  },
  {
    id: "soldier",
    name: "Soldier",
    blurb: "Held a line once for nine hours. Doesn't talk about hour eight.",
    stats: { str: 2, con: 1 },
    perkName: "Drilled",
    perkText: "Pure discipline — more damage and a steadier shield wall.",
    perk: { power: 6, mitigation: 3 },
    deed: "clear_dungeon",
    deedText: "Take a dungeon and come back with the story.",
  },
  {
    id: "urchin",
    name: "Urchin",
    blurb: "Grew up small, fast, and one step ahead of the watch.",
    stats: { dex: 2, wit: 1 },
    perkName: "Quick Hands",
    perkText: "Pockets a share nobody counted.",
    perk: { find: 4, gold: 4 },
    deed: "outnumbered",
    deedText: "Win a run with fewer than four still standing.",
  },
];

export const PROFESSION_BY_ID: Record<string, ProfessionDef> = Object.fromEntries(
  PROFESSIONS.map((p) => [p.id, p]),
);

/** Deterministic background for saves made before backgrounds existed. */
export function professionFromSeed(seed: string): ProfessionId {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PROFESSIONS[h % PROFESSIONS.length]!.id;
}

/** Sum a perk field across a set of backgrounds. */
export function perkSum(ids: (ProfessionId | undefined)[], key: keyof ProfessionPerk) {
  return ids.reduce((s, id) => s + (id ? PROFESSION_BY_ID[id]?.perk[key] ?? 0 : 0), 0);
}
