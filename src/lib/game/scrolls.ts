/**
 * Scriptorium — imprinting spells onto vellum.
 *
 * Every scroll is a gamble twice over: once when the scribe binds the spell,
 * and again when someone reads it in the field. WIT governs how cleanly the
 * weave takes hold (success, and the rare improved imprint); MEN governs how
 * violently a failure turns on the caster (a backfire instead of a fizzle).
 *
 * This module is pure maths over plain numbers so it can be shared by the
 * combat resolver and the UI without dragging the engine in.
 */

import { SCROLL_BY_ID, type ScrollDef } from "./data";

export type ImprintOutcome = "improved" | "success" | "fizzle" | "backfire";

/** Reference stat — scribes below this are punished, above it rewarded. */
const STAT_PIVOT = 24;

export interface ScrollOdds {
  improved: number;
  success: number;
  fizzle: number;
  backfire: number;
}

/** Odds of an imprint attempt, given the scribe's WIT / MEN. */
export function imprintOdds(def: ScrollDef, wit: number, men: number): ScrollOdds {
  const witEdge = (wit - STAT_PIVOT) * 0.012;
  const hold = clamp01(def.base + witEdge);
  // an improved imprint is the top slice of a successful weave
  const improved = clamp01(Math.min(hold * 0.4, 0.05 + Math.max(0, wit - STAT_PIVOT) * 0.011));
  const success = Math.max(0, hold - improved);
  const rest = Math.max(0, 1 - hold);
  // MEN keeps a botched weave from turning inward
  const backfireShare = clamp01(0.45 - (men - STAT_PIVOT) * 0.02);
  const backfire = rest * backfireShare;
  return { improved, success, fizzle: rest - backfire, backfire };
}

/** Odds that reading a finished scroll in the field goes right. */
export function readOdds(def: ScrollDef, wit: number, men: number): ScrollOdds {
  const hold = clamp01(0.82 + (wit - STAT_PIVOT) * 0.008 - (def.grade === "C" ? 0.06 : 0));
  const improved = clamp01(0.04 + Math.max(0, wit - STAT_PIVOT) * 0.008);
  const success = Math.max(0, hold - improved);
  const rest = Math.max(0, 1 - hold);
  const backfireShare = clamp01(0.5 - (men - STAT_PIVOT) * 0.02);
  const backfire = rest * backfireShare;
  return { improved, success, fizzle: rest - backfire, backfire };
}

export function rollOutcome(o: ScrollOdds, r = Math.random()): ImprintOutcome {
  if (r < o.improved) return "improved";
  if (r < o.improved + o.success) return "success";
  if (r < o.improved + o.success + o.fizzle) return "fizzle";
  return "backfire";
}

/** An improved imprint yields a second copy; an improved reading hits harder. */
export const IMPROVED_YIELD = 2;
export const IMPROVED_POWER = 1.45;

/** Fraction of the reader's max HP a backfire tears out of them. */
export const BACKFIRE_HP = 0.22;
/** Fraction of max MP a backfire burns away. */
export const BACKFIRE_MP = 0.35;

/** Rounds an attack scroll must wait before another can be read. */
export const SCROLL_COOLDOWN = 3;

export function scrollDef(id: string): ScrollDef | undefined {
  return SCROLL_BY_ID[id];
}

export function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

/* ------------------------------ Outcome ledger ------------------------------ */

/** Which attribute's check decided this roll. */
export type DecidingStat = "wit" | "men";

export interface RollDetail {
  outcome: ImprintOutcome;
  /** the raw 0-1 roll */
  roll: number;
  /** the band boundaries the roll fell into */
  bands: ScrollOdds;
  /** upper edge of the band that caught the roll */
  threshold: number;
  decidedBy: DecidingStat;
  /** value of the deciding attribute at the moment of the roll */
  stat: number;
  pivot: number;
}

/** Roll an outcome and keep the arithmetic so the ledger can explain it. */
export function rollOutcomeDetail(
  o: ScrollOdds,
  wit: number,
  men: number,
  r = Math.random(),
): RollDetail {
  const outcome = rollOutcome(o, r);
  const decidedBy: DecidingStat = outcome === "fizzle" || outcome === "backfire" ? "men" : "wit";
  const threshold =
    outcome === "improved"
      ? o.improved
      : outcome === "success"
        ? o.improved + o.success
        : outcome === "fizzle"
          ? o.improved + o.success + o.fizzle
          : 1;
  return {
    outcome,
    roll: r,
    bands: o,
    threshold,
    decidedBy,
    stat: decidedBy === "wit" ? wit : men,
    pivot: STAT_PIVOT,
  };
}

/** One recorded attempt — imprinting at the desk, or reading vellum in the field. */
export interface ScrollAttempt {
  id: string;
  at: number;
  memberId: string;
  memberName: string;
  scrollId: string;
  scrollName: string;
  phase: "imprint" | "read";
  detail: RollDetail;
  cost: { gold: number; mp: number; inputs: { item: string; qty: number }[] };
  hpBefore: number;
  hpAfter: number;
  maxHp: number;
  mpBefore: number;
  mpAfter: number;
  maxMp: number;
  stockBefore: number;
  stockAfter: number;
  /** short plain reading of what the roll did */
  note: string;
}

export const SCROLL_LOG_CAP = 80;

export const OUTCOME_LABEL: Record<ImprintOutcome, string> = {
  improved: "Improved",
  success: "Bound",
  fizzle: "Ruined",
  backfire: "Backfire",
};

export function attemptId() {
  return `sa_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}
