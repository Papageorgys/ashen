/**
 * Clan and champion identity — heraldry and portraits.
 *
 * None of this touches combat maths. It exists so the roster stops feeling
 * like a spreadsheet: your Lord has a face, your clan has a crest, and both
 * are yours to redraw whenever you like.
 */

export interface Portrait {
  /** optional custom image (data URL or remote link) — overrides the drawing */
  url?: string;
  skin: number;
  hair: number;
  hairColor: number;
  eyes: number;
  brow: number;
  beard: number;
  mark: number;
  bg: number;
}

export const SKIN_TONES = [
  "#f0d0b4", "#e0b48f", "#c9926b", "#a97350", "#845038", "#5f3a2a",
  "#cfd8dc", "#b8c6a8", "#d5c2e0", "#9fb8c8",
  // wider range so two champions of a kind rarely share a face
  "#f6ddc2", "#946b4d", "#6b4a34", "#a9c0b0",
];

export const HAIR_COLORS = [
  "#2b1d16", "#4a2f1d", "#7b4a25", "#b07a3c", "#d9c07a", "#e8e3d4",
  "#9aa5ad", "#5a2230", "#243a5e", "#3d5e40", "#6a3d7a", "#0f0f12",
  // steel, auburn, teal, bronze
  "#8a99a8", "#a33b28", "#2f6f6a", "#7a5a2a",
];

// A champion's backing tint is the single most legible identity cue at roster
// scale. A small pool means same-class champions blur together, so keep it wide
// — every colour dark enough that the woodcut bust still reads on top.
export const BG_COLORS = [
  "#1b1710", "#22181c", "#141c1e", "#1e1b28", "#241f14", "#101312",
  "#101a20", "#1a2410", "#201020", "#241014", "#101824", "#1c1c22",
  "#20180e", "#0e1e1a", "#26121a", "#12161e",
];

export const HAIR_STYLES = 8;
export const EYE_STYLES = 5;
export const BROW_STYLES = 4;
export const BEARD_STYLES = 6;
export const MARK_STYLES = 6;

export function randomPortrait(): Portrait {
  const r = (n: number) => Math.floor(Math.random() * n);
  return {
    skin: r(SKIN_TONES.length),
    hair: r(HAIR_STYLES),
    hairColor: r(HAIR_COLORS.length),
    eyes: r(EYE_STYLES),
    brow: r(BROW_STYLES),
    beard: r(BEARD_STYLES),
    mark: r(MARK_STYLES),
    bg: r(BG_COLORS.length),
  };
}

/** Stable portrait for an NPC so the same champion always wears the same face. */
export function portraitFromSeed(seed: string): Portrait {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const r = (n: number) => Math.floor(next() * n);
  return {
    skin: r(SKIN_TONES.length),
    hair: r(HAIR_STYLES),
    hairColor: r(HAIR_COLORS.length),
    eyes: r(EYE_STYLES),
    brow: r(BROW_STYLES),
    beard: r(BEARD_STYLES),
    mark: r(MARK_STYLES),
    bg: r(BG_COLORS.length),
  };
}

/* ---------------------------------- Crest --------------------------------- */

export type CrestShape = "heater" | "kite" | "round" | "banner";
export type CrestCharge =
  | "wolf"
  | "raven"
  | "tower"
  | "blade"
  | "flame"
  | "star"
  | "serpent"
  | "antlers"
  | "chalice"
  | "hammer";

export interface Crest {
  shape: CrestShape;
  field: string;
  accent: string;
  charge: CrestCharge;
  /** two-tone division of the shield */
  division: "plain" | "perFess" | "perPale" | "perBend" | "chevron";
}

export const CREST_SHAPES: { id: CrestShape; name: string }[] = [
  { id: "heater", name: "Heater" },
  { id: "kite", name: "Kite" },
  { id: "round", name: "Roundel" },
  { id: "banner", name: "Banner" },
];

export const CREST_DIVISIONS: { id: Crest["division"]; name: string }[] = [
  { id: "plain", name: "Plain" },
  { id: "perFess", name: "Per fess" },
  { id: "perPale", name: "Per pale" },
  { id: "perBend", name: "Per bend" },
  { id: "chevron", name: "Chevron" },
];

export const CREST_CHARGES: { id: CrestCharge; name: string }[] = [
  { id: "wolf", name: "Wolf" },
  { id: "raven", name: "Raven" },
  { id: "tower", name: "Tower" },
  { id: "blade", name: "Blade" },
  { id: "flame", name: "Flame" },
  { id: "star", name: "Star" },
  { id: "serpent", name: "Serpent" },
  { id: "antlers", name: "Antlers" },
  { id: "chalice", name: "Chalice" },
  { id: "hammer", name: "Hammer" },
];

export const CREST_FIELDS = [
  "#6b1d1d", "#1d3a6b", "#1d5b3a", "#4a2a6b", "#6b4a1d", "#22252b",
  "#7a1f45", "#0f4a4a",
];

export const CREST_ACCENTS = [
  "#d8b969", "#e6e2d6", "#c9663a", "#8fc7d8", "#b0d89b", "#d89bc7", "#0f0f12",
];

export const DEFAULT_CREST: Crest = {
  shape: "heater",
  field: CREST_FIELDS[0]!,
  accent: CREST_ACCENTS[0]!,
  charge: "wolf",
  division: "plain",
};

export const MOTTOS = [
  "We rise from ash.",
  "No banner falls twice.",
  "Iron remembers.",
  "The night is ours to keep.",
  "Bought in blood, held in gold.",
  "Sworn, and never sold.",
];
