// Seasons — the recurring reward track.
//
// The realm already turns in Seasons of Ash (the Reckoning perturbs the map and
// begins the next). This layers a SEASON PASS over that cadence: a track of
// rewards earned by playing through the season — a fresh reason to push every
// season, and a standing to compare on the ladder. When the season turns, the
// track resets and a new one begins; only the permanent progression (the
// Legacy) carries over. Pure data + helpers (GameState is a type-only import).

import type { GameState } from "./engine";

/** Nominal season length — display only; the Reckoning is what actually turns it. */
export const SEASON_LENGTH_MS = 14 * 24 * 60 * 60 * 1000;

export interface SeasonReward {
  gold?: number;
  inspiration?: number;
  legacy?: number;
}

export interface SeasonTier {
  points: number;
  label: string;
  reward: SeasonReward;
}

/** The season track — escalating thresholds, escalating spoils. */
export const SEASON_TIERS: SeasonTier[] = [
  { points: 100, label: "Purse of Ash", reward: { gold: 6000 } },
  { points: 300, label: "Kindling", reward: { inspiration: 5 } },
  { points: 650, label: "War-Chest", reward: { gold: 24000 } },
  { points: 1100, label: "Ashen Sigil", reward: { legacy: 3 } },
  { points: 1700, label: "Deep Coffer", reward: { gold: 70000, inspiration: 8 } },
  { points: 2500, label: "Legacy Cache", reward: { legacy: 6 } },
  { points: 3600, label: "Crown of the Season", reward: { legacy: 10, inspiration: 15 } },
];

export interface SeasonPass {
  /** which Season of Ash this track belongs to */
  season: number;
  /** points earned this season */
  points: number;
  /** tier indices already claimed */
  claimed: number[];
}

export function initialSeasonPass(season: number): SeasonPass {
  return { season, points: 0, claimed: [] };
}

/** Where the pass stands — the tier reached, the next one, and progress toward it. */
export function seasonProgress(points: number): {
  tier: number;
  next: SeasonTier | null;
  into: number;
} {
  let tier = 0;
  for (let i = 0; i < SEASON_TIERS.length; i++) if (points >= SEASON_TIERS[i]!.points) tier = i + 1;
  const next = SEASON_TIERS[tier] ?? null;
  const floor = tier > 0 ? SEASON_TIERS[tier - 1]!.points : 0;
  const into = next ? Math.max(0, Math.min(1, (points - floor) / (next.points - floor))) : 1;
  return { tier, next, into };
}

/** The season this save is on (defaults to 1). */
export function seasonOf(state: GameState): number {
  return state.season ?? 1;
}
