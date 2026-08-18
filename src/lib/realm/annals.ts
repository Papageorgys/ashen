/**
 * The Annals — the realm's persistent memory. Great deeds are written down as
 * they happen and never forgotten: conquests, wars declared, the rise and fall
 * of rulers. Years later the world can still name the Battle of Greywater. A
 * plain, serialisable log that grows with play.
 */

export type AnnalKind = "conquest" | "war" | "peace" | "succession" | "founding";

export interface AnnalEntry {
  year: number;
  day: number;
  kind: AnnalKind;
  text: string;
}

export function makeAnnals(day: number): AnnalEntry[] {
  return [
    { year: yearOf(day), day: Math.floor(day), kind: "founding", text: "Your reign begins." },
  ];
}

export const yearOf = (day: number) => 1 + Math.floor(day / 360);

/** Append an entry, keeping the annals bounded to the most recent chapters. */
export function record(annals: AnnalEntry[], day: number, kind: AnnalKind, text: string) {
  annals.push({ year: yearOf(day), day: Math.floor(day), kind, text });
  if (annals.length > 200) annals.shift();
}
