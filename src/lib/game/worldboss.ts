/**
 * The World Boss — a shared daily foe every clan in the realm chips at together.
 *
 * There is no game server, so the schedule is deterministic: every client hashes
 * the same UTC day key to the same boss, and the shared HP is simply HP_max minus
 * the sum of all clans' recorded damage. See supabase/migrations/*world_boss.sql.
 */
import { MONSTERS, FAMILY_LABEL, type Monster } from "./monsters";

/** How long a clan must wait between strikes — short enough to feel active in a session. */
export const STRIKE_COOLDOWN_MS = 45_000;

/** The elite (named) monsters make the rotating boss roster, weakest first. */
const ELITES: Monster[] = MONSTERS.filter((m) => m.elite).sort((a, b) => a.level - b.level);

/** A UTC calendar day, so every clan on earth agrees on today's boss. */
export function utcDayKey(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export interface WorldBoss {
  eventId: string;
  monster: Monster;
  name: string;
  family: string;
  level: number;
  blurb: string;
  hpMax: number;
}

/** Total hit points scale with the boss's tier. Tuned to be beatable in a day. */
export function bossHpMax(level: number): number {
  return 12000 + level * 1800;
}

/** Today's boss, identical for every client. */
export function bossForDay(dayKey: string = utcDayKey()): WorldBoss {
  const m = ELITES[hashStr(dayKey) % ELITES.length]!;
  return {
    eventId: `boss-${dayKey}`,
    monster: m,
    name: m.name,
    family: FAMILY_LABEL[m.family],
    level: m.level,
    blurb: m.blurb,
    hpMax: bossHpMax(m.level),
  };
}

/** Damage a clan deals per strike, from its host power. Floored so the weak still bite. */
export function strikeDamage(hostPower: number): number {
  return Math.max(60, Math.round(hostPower / 6));
}

/** Spoils for a clan that helped fell the boss, by its share of the damage and rank. */
export function bossSpoils(
  level: number,
  damageShare: number,
  rank: number,
): { gold: number; reputation: number; inspiration: number } {
  const rankBonus = rank === 1 ? 1.5 : rank <= 3 ? 1.25 : rank <= 10 ? 1.1 : 1;
  const base = level * (0.5 + Math.min(1, damageShare) * 3.5) * rankBonus;
  return {
    gold: Math.round(60 + base * 18),
    reputation: Math.round(4 + base * 1.4),
    inspiration: 1 + (rank <= 3 ? 1 : 0),
  };
}
