import { getRelation, type Diplomacy } from "./diplomacy";
import type { Rng } from "./rng";
import type { Ledger } from "./kingdom";
import type { ResourceId, World } from "./types";

/**
 * The dynamic market — resources have a price that moves with supply and
 * demand. War drives demand for iron, horses and grain and disrupts the trade
 * that would ease it, so prices climb; peace lets them settle. A realm poor in
 * land can grow rich on trade alone. Prices are set by the simulation from
 * world state; the player only buys and sells at them.
 */

export type Tradeable = Exclude<ResourceId, "gold">;
export const TRADEABLES: Tradeable[] = ["food", "wood", "stone", "iron", "horses"];

const BASE_PRICE: Record<Tradeable, number> = {
  food: 5,
  wood: 6,
  stone: 8,
  iron: 14,
  horses: 20,
};
// how sharply war moves each good's price
const WAR_SENS: Record<Tradeable, number> = {
  food: 0.5,
  wood: 0.2,
  stone: 0.3,
  iron: 1.1,
  horses: 0.8,
};

export interface MarketState {
  prices: Record<Tradeable, number>;
  history: Record<Tradeable, number[]>;
}

export function makeMarket(): MarketState {
  return {
    prices: { ...BASE_PRICE },
    history: {
      food: [BASE_PRICE.food],
      wood: [BASE_PRICE.wood],
      stone: [BASE_PRICE.stone],
      iron: [BASE_PRICE.iron],
      horses: [BASE_PRICE.horses],
    },
  };
}

/** Fraction of kingdom-pairs currently at war — the market's fear gauge. */
export function warShare(world: World, dip: Diplomacy): number {
  const ks = world.kingdoms;
  let pairs = 0;
  let atWar = 0;
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      pairs++;
      if (getRelation(dip, ks[i]!.id, ks[j]!.id).stance === "war") atWar++;
    }
  }
  return pairs ? atWar / pairs : 0;
}

/** Move prices toward the target set by war and a little seasonal caprice. */
export function updateMarket(market: MarketState, world: World, dip: Diplomacy, r: Rng): void {
  const w = warShare(world, dip);
  for (const t of TRADEABLES) {
    const target = BASE_PRICE[t] * (1 + WAR_SENS[t] * w * 1.6) * (0.9 + r() * 0.2);
    const price = market.prices[t] + (target - market.prices[t]) * 0.5;
    market.prices[t] = Math.max(1, Math.round(price));
    const hist = market.history[t];
    hist.push(market.prices[t]);
    if (hist.length > 16) hist.shift();
  }
}

export const buyPrice = (m: MarketState, t: Tradeable) => Math.ceil(m.prices[t] * 1.08);
export const sellPrice = (m: MarketState, t: Tradeable) => Math.floor(m.prices[t] * 0.92);

/** Price direction over the last few turns: -1 down, 0 flat, +1 up. */
export function trend(m: MarketState, t: Tradeable): -1 | 0 | 1 {
  const h = m.history[t];
  if (h.length < 2) return 0;
  const prev = h[h.length - 2]!;
  const now = h[h.length - 1]!;
  return now > prev ? 1 : now < prev ? -1 : 0;
}

/** Buy `qty` of a good into the realm's stores. Returns true if affordable. */
export function buy(ledger: Ledger, m: MarketState, t: Tradeable, qty: number): boolean {
  const cost = buyPrice(m, t) * qty;
  if (ledger.treasury < cost) return false;
  ledger.treasury -= cost;
  ledger.stores[t] = (ledger.stores[t] ?? 0) + qty;
  return true;
}

/** Sell `qty` from stores for gold. Returns true if the stock was there. */
export function sell(ledger: Ledger, m: MarketState, t: Tradeable, qty: number): boolean {
  if ((ledger.stores[t] ?? 0) < qty) return false;
  ledger.stores[t] -= qty;
  ledger.treasury += sellPrice(m, t) * qty;
  return true;
}
