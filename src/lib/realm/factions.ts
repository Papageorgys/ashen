import { warShare } from "./market";
import { foodBalance, realmSummary } from "./economy";
import { getRelation, type Diplomacy } from "./diplomacy";
import { record, type AnnalEntry } from "./annals";
import type { Rng } from "./rng";
import type { Ledger, TaxRate } from "./kingdom";
import type { World } from "./types";

/**
 * Internal politics — you do not rule unopposed. Three estates weigh every
 * choice differently: the Nobles crave war and glory, the Commons want low
 * taxes and full granaries, the Merchants want peace and open roads. Please
 * one and you may spite another; let an estate's favour collapse and the realm
 * rises against you.
 */

export type FactionId = "nobles" | "commons" | "merchants";

export interface Factions {
  nobles: number; // 0..100 approval
  commons: number;
  merchants: number;
}

export const FACTION_META: Record<FactionId, { name: string; wants: string }> = {
  nobles: { name: "The Nobles", wants: "war, glory, and their privileges" },
  commons: { name: "The Commons", wants: "low taxes and full granaries" },
  merchants: { name: "The Merchants", wants: "peace and open trade roads" },
};

export function makeFactions(): Factions {
  return { nobles: 60, commons: 60, merchants: 60 };
}

const clamp = (v: number) => Math.max(0, Math.min(100, v));

/** Each season the estates judge how the realm is run, and shift their favour. */
export function updateFactions(
  factions: Factions,
  world: World,
  dip: Diplomacy,
  ledger: Ledger,
  playerId: string,
  tax: TaxRate,
): void {
  const food = foodBalance(world, playerId);
  const war = warShare(world, dip);
  const atWar = world.kingdoms.some(
    (k) => k.id !== playerId && getRelation(dip, playerId, k.id).stance === "war",
  );

  // the commons: taxes and bread
  factions.commons = clamp(
    factions.commons +
      (tax === "low" ? 4 : tax === "high" ? -6 : -1) +
      (food.net >= 0 ? 2 : -4) +
      (ledger.unrest > 45 ? -3 : 0),
  );
  // the nobles: they hunger for war and chafe in idle peace
  factions.nobles = clamp(
    factions.nobles + (atWar ? 3 : -2) + (tax === "high" ? -2 : 0) + (ledger.unrest > 45 ? -2 : 0),
  );
  // the merchants: peace and coin
  factions.merchants = clamp(
    factions.merchants + (war > 0.25 ? -4 : 3) + (ledger.treasury > 500 ? 2 : -1),
  );
}

export const rebellionRisk = (f: Factions): number => {
  const min = Math.min(f.nobles, f.commons, f.merchants);
  return min >= 30 ? 0 : (30 - min) / 30; // 0..1
};

/**
 * If an estate's favour has collapsed, a province may throw off the crown.
 * The least-defended holding you own (never your seat) secedes to independence;
 * the grievance is spent in the rising. Returns true if a revolt happened.
 */
export function checkRebellion(
  factions: Factions,
  world: World,
  ledger: Ledger,
  annals: AnnalEntry[],
  playerId: string,
  day: number,
  r: Rng,
): boolean {
  const risk = rebellionRisk(factions);
  if (risk <= 0 || r() > risk * 0.5) return false;

  const capital = world.kingdoms.find((k) => k.id === playerId)?.capitalProvinceId;
  const holdings = world.provinces.filter(
    (p) => p.ownerId === playerId && p.id !== capital && p.settlementId,
  );
  if (holdings.length === 0) return false;
  // the softest holding rises first
  holdings.sort((a, b) => {
    const fa = world.settlements.find((s) => s.id === a.settlementId)?.fortLevel ?? 0;
    const fb = world.settlements.find((s) => s.id === b.settlementId)?.fortLevel ?? 0;
    return fa - fb;
  });
  const lost = holdings[0]!;
  lost.ownerId = null;
  ledger.unrest = clamp(ledger.unrest + 12);
  // the estate that broke recovers a little now its anger is spent
  const min = Math.min(factions.nobles, factions.commons, factions.merchants);
  if (factions.commons === min) factions.commons = clamp(factions.commons + 20);
  else if (factions.nobles === min) factions.nobles = clamp(factions.nobles + 20);
  else factions.merchants = clamp(factions.merchants + 20);
  record(annals, day, "war", `${lost.name} rises in revolt and throws off your crown.`);
  return true;
}
