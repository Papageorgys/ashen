import type { Rng } from "./rng";
import { rpick } from "./rng";

/** Deterministic fantasy place/house naming, seeded from the world RNG. */

const PREFIX = [
  "Black",
  "Grey",
  "Ash",
  "Raven",
  "Storm",
  "Iron",
  "Oak",
  "Frost",
  "Red",
  "Gold",
  "Thorn",
  "Wolf",
  "Bright",
  "Dun",
  "Wind",
  "Stone",
  "Hollow",
  "Mire",
  "Elder",
  "Cinder",
];
const SUFFIX_LAND = [
  "water",
  "moor",
  "vale",
  "march",
  "fell",
  "reach",
  "wood",
  "crag",
  "ford",
  "hollow",
  "mere",
  "ridge",
  "downs",
  "hold",
  "field",
  "gate",
  "bourne",
  "haven",
  "shire",
  "fen",
];
const SUFFIX_HOLD = [
  "hold",
  "keep",
  "guard",
  "watch",
  "spire",
  "gate",
  "crown",
  "fort",
  "throne",
  "wall",
];

const HOUSE = [
  "Vael",
  "Aeron",
  "Corvin",
  "Draymar",
  "Edran",
  "Hollis",
  "Karth",
  "Lorne",
  "Merrow",
  "Osric",
  "Perrin",
  "Rhydd",
  "Sable",
  "Tarrow",
  "Ulric",
  "Vorne",
  "Wystan",
  "Ysolde",
];
const HOUSE_SUFFIX = ["", "", "mont", "wick", "gard", "del", "thorne", "mar"];

export function placeName(r: Rng): string {
  return `${rpick(r, PREFIX)}${rpick(r, SUFFIX_LAND)}`;
}

export function holdName(r: Rng): string {
  return `${rpick(r, PREFIX)}${rpick(r, SUFFIX_HOLD)}`;
}

export function kingdomName(r: Rng): string {
  const style = r();
  if (style < 0.5)
    return `The ${rpick(r, ["Kingdom", "Realm", "Dominion", "Crown", "March"])} of ${rpick(r, PREFIX)}${rpick(r, SUFFIX_LAND)}`;
  return `House ${rpick(r, HOUSE)}${rpick(r, HOUSE_SUFFIX)}`;
}
