import { makeRng, rint, rpick, type Rng } from "./rng";
import { adjustOpinion, type Diplomacy } from "./diplomacy";
import { record, yearOf, type AnnalEntry } from "./annals";
import type { World } from "./types";

/**
 * Rulers and succession — persistent characters at the head of every crown.
 * They age, and in time they die and an heir takes the throne, carrying new
 * traits and new grudges. So the world turns over generations, not just
 * seasons, and its history accrues real names.
 */

const GIVEN = [
  "Aldous",
  "Baldric",
  "Cedric",
  "Deric",
  "Emeric",
  "Gerold",
  "Halric",
  "Ivo",
  "Joren",
  "Aldreda",
  "Beatrix",
  "Cerys",
  "Elga",
  "Isolde",
  "Maude",
  "Rowena",
  "Sable",
  "Ysold",
];
const HOUSE_TRAITS = [
  { name: "Ambitious", agg: 0.2, honor: 0 },
  { name: "Cautious", agg: -0.2, honor: 0.05 },
  { name: "Cruel", agg: 0.15, honor: -0.2 },
  { name: "Just", agg: -0.05, honor: 0.25 },
  { name: "Bold", agg: 0.2, honor: 0.05 },
  { name: "Craven", agg: -0.25, honor: -0.1 },
  { name: "Pious", agg: -0.05, honor: 0.2 },
  { name: "Cunning", agg: 0.05, honor: -0.1 },
  { name: "Wrathful", agg: 0.25, honor: -0.05 },
  { name: "Patient", agg: -0.15, honor: 0.1 },
];

export interface Ruler {
  name: string;
  title: string;
  age: number;
  traits: string[];
  ordinal: number;
  house: string;
  since: number;
}

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

function makeRuler(r: Rng, house: string, ordinal: number, day: number): Ruler {
  const traits = [rpick(r, HOUSE_TRAITS), rpick(r, HOUSE_TRAITS)]
    .map((t) => t.name)
    .filter((v, i, a) => a.indexOf(v) === i);
  return {
    name: rpick(r, GIVEN),
    title: r() < 0.5 ? "King" : "Queen",
    age: rint(r, 24, 52),
    traits,
    ordinal,
    house,
    since: Math.floor(day),
  };
}

export function makeRulers(world: World): Record<string, Ruler> {
  const out: Record<string, Ruler> = {};
  for (const k of world.kingdoms) {
    const r = makeRng(world.seed ^ hash(k.id) ^ 0x0d7a11);
    const house =
      k.name
        .replace(/^(The |House )/, "")
        .split(" ")
        .pop() ?? "Ashen";
    out[k.id] = makeRuler(r, house, 1, 0);
  }
  return out;
}

/** The ruler's bearing — feeds diplomacy and AI aggression when wired in. */
export function rulerTemperament(ruler: Ruler): { aggression: number; honor: number } {
  let aggression = 0.5;
  let honor = 0.5;
  for (const t of ruler.traits) {
    const def = HOUSE_TRAITS.find((h) => h.name === t);
    if (def) {
      aggression += def.agg;
      honor += def.honor;
    }
  }
  return {
    aggression: Math.max(0, Math.min(1, aggression)),
    honor: Math.max(0, Math.min(1, honor)),
  };
}

export const rulerStyle = (ruler: Ruler) =>
  `${ruler.title} ${ruler.name} ${ROMAN[Math.min(ROMAN.length - 1, ruler.ordinal - 1)]}`;

/** A year passes: every ruler ages, and the old may die and be succeeded. The
 *  new monarch brings shifted attitudes to their neighbours. */
export function advanceYear(
  rulers: Record<string, Ruler>,
  world: World,
  dip: Diplomacy,
  annals: AnnalEntry[],
  day: number,
  r: Rng,
): void {
  for (const k of world.kingdoms) {
    const ruler = rulers[k.id];
    if (!ruler) continue;
    ruler.age += 1;
    // death grows likelier with age; a hard cap by ~80
    const risk = ruler.age < 55 ? 0.02 : ruler.age < 70 ? 0.09 : 0.25;
    if (r() < risk) {
      const heir = makeRuler(r, ruler.house, ruler.ordinal + 1, day);
      heir.age = rint(r, 18, 40);
      rulers[k.id] = heir;
      record(
        annals,
        day,
        "succession",
        `${rulerStyle(ruler)} of ${k.name} is dead; ${rulerStyle(heir)} takes the throne.`,
      );
      // a new monarch, new grudges: nudge relations toward every neighbour
      for (const other of world.kingdoms) {
        if (other.id === k.id) continue;
        adjustOpinion(dip, k.id, other.id, Math.round((r() - 0.5) * 24));
      }
    }
  }
  void yearOf;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
