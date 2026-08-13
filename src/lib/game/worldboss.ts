/**
 * The World Boss — a shared daily foe every clan in the realm chips at together.
 *
 * There is no game server, so the schedule is deterministic: every client hashes
 * the same UTC day key to the same boss, and the shared HP is simply HP_max minus
 * the sum of all clans' recorded damage. See supabase/migrations/*world_boss.sql.
 */
import { MONSTERS, FAMILY_LABEL, humanoidGearPool, type Monster } from "./monsters";
import type { ItemId } from "./data";

/** How long a clan must wait between strikes — short enough to feel active in a session. */
export const STRIKE_COOLDOWN_MS = 45_000;

/** A committed banner must regroup this long before it can charge the boss again. */
export const COMMIT_COOLDOWN_MS = 60_000;

/** Chance one champion of a committed banner falls for good — unless the clan is blessed. */
export const COMMIT_DEATH_RISK = 0.08;

/** What a shrine blessing (no deaths in the fight today) costs in gold. */
export function blessingCost(clanLevel: number): number {
  return 600 + clanLevel * 120;
}

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

/** The signature material a boss of this tier hoards, for its loot table. */
function bossMaterials(level: number): ItemId[] {
  if (level >= 45) return ["abyss_crystal", "dragon_sinew"];
  if (level >= 30) return ["ember_core", "spirit_ore"];
  if (level >= 15) return ["spirit_ore", "moon_silk"];
  return ["iron_shard", "coarse_hide"];
}

/** Everything a boss of this tier can drop — gear themed to its level plus its hoard. */
export function bossLootTable(level: number): ItemId[] {
  return [...humanoidGearPool(level).items, ...bossMaterials(level)];
}

/** Roll a clan's actual drops on the kill — more picks for a bigger share and higher rank. */
export function rollBossLoot(
  level: number,
  damageShare: number,
  rank: number,
): { item: ItemId; qty: number }[] {
  const pool = bossLootTable(level);
  const gear = humanoidGearPool(level).items;
  const picks = 1 + (rank <= 3 ? 1 : 0) + (damageShare > 0.25 ? 1 : 0);
  const out: Record<string, number> = {};
  for (let i = 0; i < picks; i++) {
    const item = pool[Math.floor(Math.random() * pool.length)]!;
    // gear comes as a single piece; hoarded materials come in small stacks
    const qty = gear.includes(item) ? 1 : 1 + Math.floor(Math.random() * 3);
    out[item] = (out[item] ?? 0) + qty;
  }
  return Object.entries(out).map(([item, qty]) => ({ item: item as ItemId, qty }));
}
