import {
  CLASSES,
  CLASS_BY_ID,
  CLAN_LEVELS,
  DAILY_POOL,
  DAILY_COUNT,
  WEEKLY_POOL,
  WEEKLY_COUNT,
  MONTHLY_POOL,
  MONTHLY_COUNT,
  type DailyMissionDef,
  FIRST_NAMES,
  ITEM_BY_ID,
  ARMOR_SETS,
  MAX_QUALITY,
  canRollQuality,
  qualityItemId,
  splitItemId,
  type ArmorSet,
  LAST_NAMES,
  MAX_LEVEL,
  MAX_PARTY_SIZE,
  MAX_SKILL_LEVEL,
  RACE_BY_ID,
  RECIPES,
  type Recipe,
  ROLE_MAIN_STAT,
  SKILL_BY_ID,
  ZONES,
  ZONE_BY_ID,
  classSkills,
  CRAFT_MASTERIES,
  BLESSED_BOOST,
  BLESSED_MULT,
  ROLE_SHOT,
  SHOT_BATCH,
  SHOT_BOOST,
  SHOT_GRADES,
  SHOT_SPECS,
  SHOT_TIER_LEVEL,
  SOUL_SPLIT,
  ZONE_ARCHETYPE,
  ZONE_ESSENCE,
  emberId,
  shotId,
  SCROLLS,
  SCROLL_BY_ID,
  type ScrollDef,
  type ScrollKind,
  SYNERGIES,
  crowdingPenalty,
  type SynergyDef,
  type CraftMastery,
  type Grade,
  type ItemId,
  type Passive,
  type Role,
  type ShotKind,
  type SkillCondition,
  type SkillDef,
  type Slot,
  type Stats,
} from "./data";
import {
  ELITE,
  humanoidGearPool,
  zoneMonsters,
  type BestiaryEntry,
  type Encounter,
  type Monster,
  type MonsterFamily,
} from "./monsters";

import {
  BACKFIRE_HP,
  BACKFIRE_MP,
  IMPROVED_POWER,
  IMPROVED_YIELD,
  SCROLL_COOLDOWN,
  imprintOdds,
  readOdds,
  rollOutcome,
  rollOutcomeDetail,
  attemptId,
  type ImprintOutcome,
  type ScrollAttempt,
} from "./scrolls";

import { DEFAULT_CREST, portraitFromSeed, type Crest, type Portrait } from "./identity";
import {
  CASTLE,
  RIVAL_BY_ID,
  RIVALS,
  garrisonPower,
  initialCastle,
  initialRivals,
  resolveClash,
  type CastleState,
  type RivalState,
} from "./rivals";
import { PROFESSION_BY_ID, perkSum, professionFromSeed, type ProfessionId } from "./professions";

export interface SkillState {
  skillId: string;
  /** mastery level 1..100 */
  level: number;
  xp: number;
  /** when the player wants it fired */
  condition: SkillCondition;
  /** order in the tactic list — lower fires first */
  priority: number;
}

export interface Member {
  id: string;
  name: string;
  classId: string;
  level: number;
  xp: number;
  hp: number;
  mp: number;
  gear: ItemId[]; // one per slot: weapon / armor / jewelry
  skills: SkillState[];
  partyId: string | null;
  /** lifetime record */
  mobKills?: number;
  pvpKills?: number;
  pkKills?: number;
  deaths?: number;
  /** artisans only — chosen crafting discipline */
  craftMastery?: CraftMastery | undefined;
  /** a rune engraved on their weapon — overrides the damage type they deal */
  weaponRune?: DamageType | undefined;
  /** whether this champion loads soulshots / spiritshots (default on) */
  shotsOn?: boolean;
  /** the player's own character — cannot be dismissed, cannot be lost forever */
  isLord?: boolean;
  /** earned epithet, e.g. "the Unbroken" */
  title?: string;
  /** face — editable by the player */
  portrait?: Portrait;
  /** day the champion swore in */
  joinedAt?: number;
  /** the life they led before the banner — see professions.ts */
  profession?: ProfessionId;
  /** the marks the world has left on them — scars, deeds, griefs; newest first */
  marks?: Mark[];
  /** sworn to the Ashen Oath (§4.2): steps forward first when death comes, and
   * their fall weighs far more in the Chronicle. Irrevocable. */
  oath?: boolean;
}

/** A remembered event bound to a champion — how the numbers came to read as biography. */
export type MarkKind =
  | "oath" // the day they swore in — the player's own authorship
  | "bond" // forged a shield-bond with a comrade
  | "clutch" // last one standing
  | "survivor" // carried a fallen comrade's memory home
  | "wounded" // dragged out of a fight at a hair's breadth
  | "valor" // carried the fight
  | "slayer" // first of the clan to fell a kind of beast
  | "ascend" // came into their strength
  | "triumph"; // a clan-defining victory

export interface Mark {
  id: string;
  at: number;
  kind: MarkKind;
  /** one line of biography, written in the moment it happened */
  text: string;
  /** the stat or state this mark is bound to, e.g. "CON", "STR", "grief" */
  bound?: string;
  /** where it happened */
  where?: string;
}

const MARKS_CAP = 40;

/** Record a remembered event on a champion. Newest first, capped. */
export function addMark(
  m: Member,
  kind: MarkKind,
  text: string,
  opts?: { bound?: string; where?: string },
): void {
  const entry: Mark = { id: uid(), at: Date.now(), kind, text };
  if (opts?.bound) entry.bound = opts.bound;
  if (opts?.where) entry.where = opts.where;
  m.marks = [entry, ...(m.marks ?? [])].slice(0, MARKS_CAP);
}

/** shared runs survived before two champions are shield-bonded */
export const BOND_AT = 6;

/** canonical key for an unordered pair of champion ids */
export function pairKey(a: string, b: string): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

export function getAffinity(s: GameState, a: string, b: string): number {
  return s.affinity?.[pairKey(a, b)] ?? 0;
}

/** grant affinity to a pair who came back from the field together; returns the new total */
export function bumpAffinity(s: GameState, a: string, b: string, n = 1): number {
  if (a === b) return 0;
  s.affinity ??= {};
  const k = pairKey(a, b);
  const v = (s.affinity[k] ?? 0) + n;
  s.affinity[k] = v;
  return v;
}

/** sever every bond that references a champion who has left the roster */
export function dropAffinity(s: GameState, id: string): void {
  if (!s.affinity) return;
  for (const k of Object.keys(s.affinity)) {
    const [a, b] = k.split(":");
    if (a === id || b === id) delete s.affinity[k];
  }
}

/** a champion's bonds, strongest first */
export function bondsOf(s: GameState, id: string): { id: string; value: number }[] {
  if (!s.affinity) return [];
  const out: { id: string; value: number }[] = [];
  for (const [k, v] of Object.entries(s.affinity)) {
    const [a, b] = k.split(":");
    if (a === id && b) out.push({ id: b, value: v });
    else if (b === id && a) out.push({ id: a, value: v });
  }
  return out.sort((x, y) => y.value - x.value);
}

export interface Party {
  id: string;
  name: string;
  memberIds: string[];
  /** active expedition — farms the zone on a loop until recalled */
  run: { zoneId: string; endsAt: number } | null;
  /** on the march to a zone — set on deploy, cleared to a run on arrival */
  travel?: { zoneId: string; arrivesAt: number } | null;
  /** zone the banner keeps farming; cleared on recall */
  farming?: string | null;
  /** battle stance chosen for this banner's fights (default steady) */
  stance?: Stance;
}

export interface LogEntry {
  id: string;
  at: number;
  text: string;
  tone: "good" | "bad" | "info";
}

export interface DailyMissionState {
  id: string;
  progress: number;
  claimed: boolean;
}

export interface DailyState {
  /** ISO day the board was posted */
  day: string;
  missions: DailyMissionState[];
}

export interface ChronicleEntry {
  id: string;
  at: number;
  title: string;
  text: string;
  kind: "founding" | "triumph" | "loss" | "forge" | "war" | "rise";
}

export interface Fallen {
  id: string;
  name: string;
  classId: string;
  level: number;
  at: number;
  where: string;
  mobKills: number;
  wasLord?: boolean;
  /** fell having sworn the Ashen Oath (§4.2) — an honoured, outsized Deed */
  oath?: boolean | undefined;
}

/** Sworn service under another clan's banner — the alternative to founding your own. */
export interface Allegiance {
  clanId: string;
  clanName: string;
  rank: string;
  joinedAt: number;
}

/** What it takes to be accepted into an established clan. */
export const JOIN_REQ = { rep: 60, stipend: 500 };

export interface GameState {
  clanName: string;
  leaderName: string;
  clanLevel: number;
  reputation: number;
  gold: number;
  members: Member[];
  parties: Party[];
  /** clan warehouse — every drop, craft and reward lands here */
  inventory: Record<ItemId, number>;
  recruits: Member[];
  log: LogEntry[];
  daily?: DailyState;
  weekly?: DailyState;
  monthly?: DailyState;
  /** whether banners burn soulshots / spiritshots while farming (default on) */
  shotsEnabled?: boolean;
  /** whether banners read imprinted scrolls in the field (default on) */
  scrollsEnabled?: boolean;

  /** levels of each hall inside the clan keep */
  keep?: Partial<Record<"barracks" | "infirmary" | "yard" | "vault" | "shrine", number>>;
  /** heraldry — the clan's own face */
  crest?: Crest;
  motto?: string;
  /** the deeds worth remembering */
  chronicle?: ChronicleEntry[];
  /** ids of Deeds the clan has inscribed at the Founders' Monument (Legacy §7.4) */
  inscribed?: string[];
  /** the id of the wearable clan title the leader has chosen to display (§7.5) */
  title?: string | undefined;
  /** the host's carried Ash Debt (§3) — accrued in the fight, cleared only by rest */
  ashDebt?: number;
  /** the Long Night (§5) — rising pressure, and the window while it walks the realm */
  longNight?: { pressure: number; endsAt?: number | undefined; held?: boolean | undefined };
  /** raw Ash (§6.2) — a hot-potato currency that decays if hoarded; refine it or lose it */
  rawAsh?: number;
  /** an outstanding debt to the Gilded Compact's Ledger (§6.3) */
  loan?: { principal: number; owed: number; dueAt: number } | undefined;
  /** a Compact kit-insurance policy in force (§4.3, §6.3) — a covered fall pays out */
  insurance?: { until: number; premium: number } | undefined;
  /** gold escrowed on rivals' heads through the Ledger (§6.3): rivalId → net bounty */
  bounties?: Record<string, number>;
  /** ids of the vassal houses sworn to your banner (§8.1) */
  vassals?: string[];
  /** each sworn house's loyalty 0..100 (§8.1) — fealty wavers and can be lost */
  vassalLoyalty?: Record<string, number>;
  /** the current Season of Ash (§1.3) — each Reckoning begins a new one */
  season?: number;
  /** champions lost for good */
  memorial?: Fallen[];
  rivals?: RivalState[];
  /** if the player swore their company to an existing clan instead of founding one */
  allegiance?: Allegiance | null;
  castle?: CastleState;
  /** free companies: petitions from other party leaders, and scouted prospects */
  companies?: FreeCompany[];
  musterTickAt?: number;
  prospectsAt?: number;
  /** last time the realm advanced (rival growth, castle tax) */
  realmTickAt?: number;
  /** Inspiration — earned by backgrounds in the field, spent to reroll a failed forge */
  inspiration?: number;
  /** every scroll attempt, newest last — imprints at the desk and readings in the field */
  scrollLog?: ScrollAttempt[];
  /** rolling reel of the last spoils pulled off the field, newest first */
  spoils?: SpoilEntry[];
  /** ledger of every System Forge attempt, newest first */
  forgeHistory?: ForgeAttempt[];
  /** everything the clan has ever killed, by monster id */
  bestiary?: Record<string, BestiaryEntry>;
  createdAt: number;
  /** the auth user this save belongs to — guards against cross-account overwrite */
  ownerId?: string | null;
  /** wall-clock of the last local write — arbitrates local vs cloud on sign-in */
  savedAt?: number;
  /** shared danger forges bonds — affinity keyed by a canonical "idA:idB" pair */
  affinity?: Record<string, number>;
  /** wall-clock of this clan's last strike on the World Boss (strike cooldown) */
  bossStrikeAt?: number;
  /** World Boss events whose spoils this clan has already claimed, by event id */
  bossClaims?: Record<string, boolean>;
  /** a shrine blessing that shields champions from death in the boss fight, for a day */
  bossBlessing?: { day: string };
  /** wall-clock each banner last charged the World Boss (per-banner cooldown) */
  bossCommitAt?: Record<string, number>;
  /** the dawn muster — daily login reward and its consecutive-day streak */
  rally?: { lastDay: string; streak: number };
}

/** One System Forge attempt, kept for the forging ledger. */
export interface ForgeAttempt {
  id: string;
  at: number;
  recipeId: string;
  /** the item the pattern calls for */
  result: ItemId;
  /** how many strikes were attempted, and how many held */
  attempts: number;
  successes: number;
  /** units of the result actually produced */
  produced: number;
  /** gold paid to the guild across all strikes */
  goldSpent: number;
  /** published odds at the time of the attempt (0..1) */
  chance: number;
  /** materials consumed across all strikes */
  inputs: { item: ItemId; qty: number }[];
}

/** One stack of loot as it lands, kept for the spoils reel. */
export interface SpoilEntry {
  id: string;
  at: number;
  item: ItemId;
  qty: number;
  rarity: SpoilRarity;
  zone: string;
  party: string;
}

export type SpoilRarity = "common" | "fine" | "rare" | "epic";

const RARITY_BY_GRADE: Record<string, SpoilRarity> = {
  Low: "common",
  NG: "common",
  D: "fine",
  C: "rare",
  B: "rare",
  A: "epic",
  S: "epic",
};

/** How loud a drop should shout when it lands in the warehouse. */
export function spoilRarity(item: ItemId): SpoilRarity {
  const def = ITEM_BY_ID[item];
  if (!def) return "common";
  const base = RARITY_BY_GRADE[def.grade] ?? "common";
  if (def.kind === "gear" && base === "fine") return "rare";
  if (def.kind === "gear" && base === "common") return "fine";
  return base;
}

/** Local calendar day key — the daily board resets on this. */
export function dayKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The dawn-rally reward for a given consecutive-day streak. Every 7th day is a feast. */
export function rallyReward(streak: number): {
  gold: number;
  rep: number;
  inspiration: number;
  milestone: boolean;
} {
  const milestone = streak > 0 && streak % 7 === 0;
  return {
    gold: 80 + streak * 45 + (milestone ? 400 : 0),
    rep: 4 + streak * 2,
    inspiration: milestone ? 2 : streak % 3 === 0 ? 1 : 0,
    milestone,
  };
}

/** ISO-ish week key — the weekly board resets on this. */
export function weekKey(d: Date = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Calendar month key — the monthly board resets on this. */
export function monthKey(d: Date = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Deterministic per-period draw so a board is stable for its whole period. */
export function rollBoard(key: string, pool: DailyMissionDef[], count: number): DailyState {
  let seed = 0;
  for (let i = 0; i < key.length; i++) seed = (seed * 31 + key.charCodeAt(i)) >>> 0;
  const bag = [...pool];
  const picked: DailyMissionState[] = [];
  for (let i = 0; i < count && bag.length; i++) {
    seed = (seed * 1103515245 + 12345) >>> 0;
    const [def] = bag.splice(seed % bag.length, 1);
    if (def) picked.push({ id: def.id, progress: 0, claimed: false });
  }
  return { day: key, missions: picked };
}

export const rollDailies = (day: string = dayKey()) => rollBoard(day, DAILY_POOL, DAILY_COUNT);
export const rollWeeklies = (key: string = weekKey()) => rollBoard(key, WEEKLY_POOL, WEEKLY_COUNT);
export const rollMonthlies = (key: string = monthKey()) =>
  rollBoard(key, MONTHLY_POOL, MONTHLY_COUNT);

const uid = () => Math.random().toString(36).slice(2, 10);
const rnd = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]!;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export function xpForLevel(level: number) {
  return Math.round(90 * Math.pow(level, 1.75));
}

/** Skill mastery curve — reaching 100 should be a lifetime's work. */
export function xpForSkillLevel(level: number) {
  return Math.round(12 * Math.pow(level, 2.35));
}

export function skillPotency(s: SkillState) {
  const def = SKILL_BY_ID[s.skillId]!;
  return def.potency * (1 + (s.level - 1) * 0.02);
}

/* ---------------------------- Stats & passives ------------------------------ */

const EMPTY_STATS: Stats = { str: 0, dex: 0, con: 0, int: 0, wit: 0, men: 0 };
const STAT_KEYS = Object.keys(EMPTY_STATS) as (keyof Stats)[];

/** Race block + class modifiers + gear bonuses + slow level growth. */
export function memberStats(m: Member): Stats {
  const cls = CLASS_BY_ID[m.classId]!;
  const race = RACE_BY_ID[cls.race]!;
  const main = ROLE_MAIN_STAT[cls.role];
  const out = { ...race.stats };
  for (const k of STAT_KEYS) out[k] += cls.mods[k] ?? 0;
  for (const g of m.gear) {
    const st = ITEM_BY_ID[g]?.stats;
    if (st) for (const k of STAT_KEYS) out[k] += st[k] ?? 0;
  }
  const sb = setBonus(m).stats;
  for (const k of STAT_KEYS) out[k] += sb[k] ?? 0;
  const prof = m.profession ? PROFESSION_BY_ID[m.profession] : undefined;
  if (prof) for (const k of STAT_KEYS) out[k] += prof.stats[k] ?? 0;
  // levelling nudges the main stat and constitution
  out[main] += Math.floor(m.level * 0.5);
  out.con += Math.floor(m.level * 0.3);
  return out;
}

/** Armour sets the champion is wearing, and how far along each one is. */
export function wornSets(m: Member): { set: ArmorSet; worn: number; complete: boolean }[] {
  const bases = m.gear.map((g) => splitItemId(g).base);
  return ARMOR_SETS.map((set) => {
    const worn = set.pieces.filter((p) => bases.includes(p)).length;
    return { set, worn, complete: worn === set.pieces.length };
  }).filter((x) => x.worn > 0);
}

/** Stat and power bonus from every completed set. */
export function setBonus(m: Member): { power: number; stats: Partial<Stats>; sets: ArmorSet[] } {
  const done = wornSets(m).filter((x) => x.complete);
  const stats: Partial<Stats> = {};
  let power = 0;
  for (const { set } of done) {
    power += set.bonus.power;
    for (const [k, v] of Object.entries(set.bonus.stats) as [keyof Stats, number][]) {
      stats[k] = (stats[k] ?? 0) + v;
    }
  }
  return { power, stats, sets: done.map((d) => d.set) };
}

/** Racial passive + class passive. */
export function memberPassives(m: Member): Passive[] {
  const cls = CLASS_BY_ID[m.classId]!;
  return [RACE_BY_ID[cls.race]!.passive, cls.passive];
}

function passiveSum(m: Member, key: keyof Passive) {
  return memberPassives(m).reduce((s, p) => s + ((p[key] as number | undefined) ?? 0), 0);
}

/** Armour mastery: wearing your trained armour type helps, the wrong type hurts. */
export function armorMastery(m: Member): { worn: string | null; trained: string; mult: number } {
  const cls = CLASS_BY_ID[m.classId]!;
  const worn = m.gear.map((g) => ITEM_BY_ID[g]).find((i) => i?.slot === "armor");
  if (!worn?.armorType) return { worn: null, trained: cls.armor, mult: 1 };
  return {
    worn: worn.armorType,
    trained: cls.armor,
    mult: worn.armorType === cls.armor ? 1.15 : 0.85,
  };
}

export function mitigation(m: Member) {
  const base = passiveSum(m, "mitigation") / 100;
  const arm = armorMastery(m);
  const bonus = arm.worn ? (arm.mult - 1) * 0.5 : 0;
  return Math.min(0.6, Math.max(0, base + bonus));
}

/* --------------------------------- Vitals ---------------------------------- */

const HP_BASE: Record<Role, number> = {
  guardian: 34,
  blade: 28,
  archer: 24,
  arcanist: 18,
  mender: 20,
  chanter: 22,
  artisan: 20,
};
const MP_BASE: Record<Role, number> = {
  guardian: 8,
  blade: 8,
  archer: 10,
  arcanist: 22,
  mender: 22,
  chanter: 20,
  artisan: 10,
};

export function maxHp(m: Member) {
  const cls = CLASS_BY_ID[m.classId]!;
  const st = memberStats(m);
  const base = (HP_BASE[cls.role] + st.con * 0.9) * (1 + m.level * 0.28);
  return Math.max(1, Math.round(base * (1 + passiveSum(m, "hp") / 100)));
}

export function maxMp(m: Member) {
  const cls = CLASS_BY_ID[m.classId]!;
  const st = memberStats(m);
  const base = (MP_BASE[cls.role] + st.men * 0.8 + st.wit * 0.4) * (1 + m.level * 0.24);
  return Math.max(1, Math.round(base * (1 + passiveSum(m, "mp") / 100)));
}

/** Percent of the pool recovered each rest tick. */
export function regenRate(m: Member) {
  return 1 + passiveSum(m, "regen") / 100;
}

export function memberPower(m: Member) {
  const cls = CLASS_BY_ID[m.classId]!;
  const st = memberStats(m);
  const main = st[ROLE_MAIN_STAT[cls.role]];
  const gear = m.gear.reduce((s, g) => s + (ITEM_BY_ID[g]?.power ?? 0), 0);
  const mastery = m.skills.reduce((s, k) => s + (k.level - 1) * 0.4, 0);
  const base =
    (cls.power + main * 0.25) * (1 + m.level * 0.35) + gear + mastery + setBonus(m).power;
  const prof = perkSum([m.profession], "power");
  return Math.round(base * (1 + (passiveSum(m, "power") + prof) / 100) * armorMastery(m).mult);
}

export function memberFind(m: Member) {
  const cls = CLASS_BY_ID[m.classId]!;
  return (
    cls.find + RACE_BY_ID[cls.race]!.luck + passiveSum(m, "find") + perkSum([m.profession], "find")
  );
}

/** Total craft-chance points the clan's passives contribute. */
export function craftPassiveBonus(state: GameState) {
  return state.members.reduce((s, m) => s + passiveSum(m, "craft"), 0);
}

export function slotOf(item: ItemId): Slot | null {
  return ITEM_BY_ID[item]?.slot ?? null;
}

/* --------------------------------- Skills ---------------------------------- */

/** Trainer fee charged for a skill. */
export function skillCost(def: SkillDef) {
  return def.cost;
}

export function learnableSkills(m: Member): SkillDef[] {
  return classSkills(m.classId).filter(
    (s) => s.unlock <= m.level && !m.skills.some((k) => k.skillId === s.id),
  );
}

export function knownSkills(m: Member): { state: SkillState; def: SkillDef }[] {
  return [...m.skills]
    .sort((a, b) => a.priority - b.priority)
    .map((s) => ({ state: s, def: SKILL_BY_ID[s.skillId]! }));
}

function defaultCondition(def: SkillDef): SkillCondition {
  if (def.kind === "heal") return "ally_hp_low";
  if (def.kind === "buff") return "opening";
  if (def.kind === "debuff") return "opening";
  return "always";
}

export function learnSkill(m: Member, skillId: string) {
  m.skills.push({
    skillId,
    level: 1,
    xp: 0,
    condition: defaultCondition(SKILL_BY_ID[skillId]!),
    priority: m.skills.length,
  });
}

/* --------------------------------- Parties --------------------------------- */

export function partyMembers(state: GameState, party: Party) {
  return party.memberIds
    .map((id) => state.members.find((m) => m.id === id))
    .filter(Boolean) as Member[];
}

/** Champions who stand in no banner at all. */
export function unassignedMembers(state: GameState) {
  return state.members.filter((m) => !state.parties.some((p) => p.memberIds.includes(m.id)));
}

/**
 * Picks the champions who would round out a banner best: the roles it is
 * missing come first (a guardian to hold the line, a mender to keep it
 * standing, a chanter to sing it forward), then raw power.
 */
export function suggestFill(state: GameState, party: Party, pool?: Member[]): Member[] {
  const roster = partyMembers(state, party);
  const free = pool ?? unassignedMembers(state);
  const slots = MAX_PARTY_SIZE - roster.length;
  if (slots <= 0) return [];

  const priority: Role[] = [
    "guardian",
    "mender",
    "chanter",
    "arcanist",
    "archer",
    "blade",
    "artisan",
  ];
  const have = new Map<Role, number>();
  for (const m of roster) {
    const r = CLASS_BY_ID[m.classId]!.role;
    have.set(r, (have.get(r) ?? 0) + 1);
  }

  const picked: Member[] = [];
  const rest = [...free].sort((a, b) => memberPower(b) - memberPower(a));
  for (const role of priority) {
    if (picked.length >= slots) break;
    if ((have.get(role) ?? 0) > 0) continue;
    const idx = rest.findIndex((m) => CLASS_BY_ID[m.classId]!.role === role);
    if (idx === -1) continue;
    const [m] = rest.splice(idx, 1);
    picked.push(m!);
    have.set(role, 1);
  }
  // fill the remaining seats with the strongest left, avoiding stacking duplicates
  rest.sort((a, b) => {
    const ra = CLASS_BY_ID[a.classId]!.role;
    const rb = CLASS_BY_ID[b.classId]!.role;
    const dupe = (have.get(ra) ?? 0) - (have.get(rb) ?? 0);
    if (dupe !== 0) return dupe;
    return memberPower(b) - memberPower(a);
  });
  while (picked.length < slots && rest.length) {
    const m = rest.shift()!;
    const r = CLASS_BY_ID[m.classId]!.role;
    have.set(r, (have.get(r) ?? 0) + 1);
    picked.push(m);
  }
  return picked;
}

/** Which synergies a given roster lights up. */
export function synergiesFor(ms: Member[]): SynergyDef[] {
  const ctx = {
    roles: ms.map((m) => CLASS_BY_ID[m.classId]!.role),
    classIds: ms.map((m) => m.classId),
    races: ms.map((m) => CLASS_BY_ID[m.classId]!.race),
    size: ms.length,
  };
  if (ctx.size === 0) return [];
  return SYNERGIES.filter((s) => s.match(ctx));
}

export function partySynergies(state: GameState, party: Party) {
  return synergiesFor(partyMembers(state, party));
}

/** Summed synergy effects, minus duplicate-class crowding. */
export function synergyBonus(ms: Member[]) {
  const out = { power: 0, mitigation: 0, find: 0, xp: 0, gold: 0, upkeep: 0 };
  for (const s of synergiesFor(ms)) {
    for (const k of Object.keys(out) as (keyof typeof out)[]) out[k] += s.bonus[k] ?? 0;
  }
  const profs = ms.map((m) => m.profession);
  out.gold += perkSum(profs, "gold");
  out.xp += perkSum(profs, "xp");
  out.mitigation += perkSum(profs, "mitigation");
  out.upkeep += perkSum(profs, "upkeep");
  out.power -= crowdingPenalty(ms.map((m) => m.classId));
  out.mitigation = Math.max(-25, Math.min(35, out.mitigation));
  out.upkeep = Math.max(-30, Math.min(40, out.upkeep));
  return out;
}

/** How much each shield-bond adds, and the ceiling — so bonds help but never dominate. */
export const BOND_POWER_PER_PAIR = 0.04;
export const BOND_POWER_CAP = 0.2;

/** Shield-bonded pairs (affinity ≥ BOND_AT) both riding in this banner. */
export function bondedPairsInParty(state: GameState, party: Party): number {
  const ids = party.memberIds;
  let n = 0;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (getAffinity(state, ids[i]!, ids[j]!) >= BOND_AT) n++;
    }
  }
  return n;
}

/** The power edge a banner gains from champions who fight beside those they're bonded to. */
export function bondBonus(state: GameState, party: Party): number {
  return Math.min(BOND_POWER_CAP, bondedPairsInParty(state, party) * BOND_POWER_PER_PAIR);
}

export function partyPower(state: GameState, party: Party) {
  const ms = partyMembers(state, party);
  const base = ms.reduce((s, m) => s + memberPower(m), 0);
  const roles = new Set<Role>(ms.map((m) => CLASS_BY_ID[m.classId]!.role));
  let mult = 1;
  if (roles.has("guardian")) mult += 0.12;
  if (roles.has("mender")) mult += 0.12;
  if (roles.has("chanter")) mult += 0.08;
  if (ms.length === MAX_PARTY_SIZE) mult += 0.15;
  mult += synergyBonus(ms).power / 100;
  mult += bondBonus(state, party);
  return Math.round(base * Math.max(0.4, mult));
}

export function maxParties(clanLevel: number, sworn = false) {
  /** Level 0 = no clan of your own: one free company, two if you serve another clan. */
  if (clanLevel < 1) return sworn ? 2 : 1;
  return Math.min(8, clanLevel);
}

/** Can the company be taken in by an established clan yet? */
export function canJoinClan(state: GameState): { ok: boolean; why: string } {
  if (state.clanLevel >= 1) return { ok: false, why: "You already lead a clan of your own." };
  if (state.allegiance) return { ok: false, why: "You already serve a clan." };
  if (state.reputation < JOIN_REQ.rep)
    return { ok: false, why: `They want ${JOIN_REQ.rep} reputation before they will hear you.` };
  return { ok: true, why: "" };
}

/** A clan only exists once it has been founded (level 1+). */
export function hasClan(state: { clanLevel: number }) {
  return state.clanLevel >= 1;
}

export function clanCapacity(clanLevel: number, barracks = 0, sworn = false) {
  return maxParties(clanLevel, sworn) * MAX_PARTY_SIZE + barracks * 3;
}

/* -------------------------------- Clan Keep --------------------------------- */

export type KeepBuildingId = "barracks" | "infirmary" | "yard" | "vault" | "shrine";

export interface KeepBuilding {
  id: KeepBuildingId;
  name: string;
  sigil: string;
  blurb: string;
  /** effect text for one level of this hall */
  perLevel: string;
  maxLevel: number;
  goldBase: number;
  repBase: number;
}

export const KEEP_MAX_LEVEL = 5;

export const KEEP_BUILDINGS: KeepBuilding[] = [
  {
    id: "barracks",
    name: "Barracks",
    sigil: "⛺",
    blurb: "Bunks, mess and drill sergeants — room for more sworn under your roof.",
    perLevel: "+3 sworn capacity",
    maxLevel: KEEP_MAX_LEVEL,
    goldBase: 2500,
    repBase: 40,
  },
  {
    id: "infirmary",
    name: "Infirmary",
    sigil: "✚",
    blurb: "Herbs, splints and quiet cots for those dragged home broken.",
    perLevel: "+30% recovery at the keep · cheaper field surgery",
    maxLevel: KEEP_MAX_LEVEL,
    goldBase: 2000,
    repBase: 30,
  },
  {
    id: "yard",
    name: "Training Yard",
    sigil: "⚔",
    blurb: "Pells, straw dummies and a hard-eyed master at arms.",
    perLevel: "resting champions earn passive xp · deeper drill sessions",
    maxLevel: KEEP_MAX_LEVEL,
    goldBase: 3000,
    repBase: 50,
  },
  {
    id: "vault",
    name: "Vault & Forge Wing",
    sigil: "⚒",
    blurb: "Locked coffers and a subsidised forge run by the clan's own smiths.",
    perLevel: "+8% sale price · −10% forge fees",
    maxLevel: KEEP_MAX_LEVEL,
    goldBase: 2800,
    repBase: 45,
  },
  {
    id: "shrine",
    name: "Shrine of Names",
    sigil: "☩",
    blurb: "Where the fallen are read aloud and victories are carved in stone.",
    perLevel: "+10% reputation from expeditions",
    maxLevel: KEEP_MAX_LEVEL,
    goldBase: 2200,
    repBase: 60,
  },
];

export const KEEP_BY_ID: Record<string, KeepBuilding> = Object.fromEntries(
  KEEP_BUILDINGS.map((b) => [b.id, b]),
);

export type KeepState = Partial<Record<KeepBuildingId, number>>;

export function keepLevel(state: GameState, id: KeepBuildingId) {
  return state.keep?.[id] ?? 0;
}

/** Cost of raising a hall from its current level to the next. */
export function keepUpgradeCost(b: KeepBuilding, level: number) {
  const step = level + 1;
  return {
    gold: Math.round(b.goldBase * Math.pow(1.75, level)),
    rep: Math.round(b.repBase * step),
  };
}

export function canUpgradeKeep(state: GameState, id: KeepBuildingId) {
  const b = KEEP_BY_ID[id];
  if (!b) return { ok: false, why: "Unknown hall" };
  const lvl = keepLevel(state, id);
  if (lvl >= b.maxLevel) return { ok: false, why: "Already at its full height" };
  if (lvl >= state.clanLevel) return { ok: false, why: `Needs clan level ${lvl + 1}` };
  const cost = keepUpgradeCost(b, lvl);
  if (state.gold < cost.gold) return { ok: false, why: "Not enough gold" };
  if (state.reputation < cost.rep) return { ok: false, why: "Not enough reputation" };
  return { ok: true, why: "" };
}

/** Every keep effect in one place so UI and engine never drift apart. */
export function keepEffects(state: GameState) {
  const lv = (id: KeepBuildingId) => keepLevel(state, id);
  return {
    capacity: lv("barracks") * 3,
    /** multiplier on resting recovery */
    restMult: 1 + lv("infirmary") * 0.3,
    /** gold per hit point mended by the infirmary's surgeons — floored so a
     * maxed infirmary never trends toward free full heals */
    mendCost: Math.max(2, Math.round(4 - lv("infirmary") * 0.6)),
    /** xp per resting champion per training tick */
    yardXp: lv("yard") * 6,
    /** skill mastery xp granted by one drill session */
    drillXp: lv("yard") * 14,
    drillCost: 400 + lv("yard") * 150,
    sellMult: 1 + lv("vault") * 0.08,
    forgeMult: Math.max(0.3, 1 - lv("vault") * 0.1),
    repMult: 1 + lv("shrine") * 0.1,
  };
}

/** Forge fee for a recipe after the vault's subsidy. */
export function forgeFee(state: GameState, gold: number) {
  return Math.round(gold * keepEffects(state).forgeMult);
}

/** What it costs the infirmary to put every wounded champion back on their feet. */
export function mendBill(state: GameState) {
  const eff = keepEffects(state);
  const busy = new Set(state.parties.filter((p) => p.run).flatMap((p) => p.memberIds));
  const patients = state.members.filter((m) => !busy.has(m.id) && m.hp < maxHp(m));
  const missing = patients.reduce((s, m) => s + (maxHp(m) - m.hp), 0);
  return { patients, gold: Math.round(missing * eff.mendCost) };
}

/* -------------------------------- Home city -------------------------------- */
/**
 * A banner is "in the city" when it holds champions and none of them are on the
 * march or out in the field — i.e. resting at the home haven. The home city's own
 * actions only work while at least one banner stands in the hall.
 */
export function bannersInCity(state: GameState): Party[] {
  return state.parties.filter((p) => p.memberIds.length > 0 && !p.run && !p.travel && !p.farming);
}

/** The champions standing in the hall right now — the target of the city's actions. */
export function cityGarrison(state: GameState): Member[] {
  const ids = new Set(bannersInCity(state).flatMap((p) => p.memberIds));
  return state.members.filter((m) => ids.has(m.id));
}

/** The warded flame restores half of what the garrison is missing, for a humble fee. */
export const FLAME_REST_FRACTION = 0.5;
export function flameRestBill(state: GameState) {
  const wounded = cityGarrison(state).filter((m) => m.hp < maxHp(m) || m.mp < maxMp(m));
  const missing = wounded.reduce((s, m) => s + (maxHp(m) - m.hp), 0);
  return { wounded, gold: Math.round(missing * FLAME_REST_FRACTION * 2) };
}

export function nextClanReq(clanLevel: number) {
  return CLAN_LEVELS.find((c) => c.level === clanLevel + 1) ?? null;
}

export function artisanRank(state: GameState, mastery?: CraftMastery) {
  return state.members
    .filter((m) => CLASS_BY_ID[m.classId]!.role === "artisan")
    .filter((m) => !mastery || m.craftMastery === mastery)
    .reduce((s, m) => s + 1 + Math.floor(m.level / 8), 0);
}

/* -------------------------------- Recruiting -------------------------------- */

export function makeRecruit(clanLevel: number): Member {
  const cls = pick(CLASSES);
  const level = clamp(rnd(clanLevel - 1, clanLevel + 2), 1, MAX_LEVEL);
  const m: Member = {
    id: uid(),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    classId: cls.id,
    level,
    xp: 0,
    hp: 0,
    mp: 0,
    gear: [],
    skills: [],
    partyId: null,
    craftMastery: cls.role === "artisan" ? pick(CRAFT_MASTERIES) : undefined,
    joinedAt: Date.now(),
  };
  m.profession = professionFromSeed(m.id + m.name + Math.random());
  m.portrait = portraitFromSeed(m.id + m.name);

  // recruits arrive knowing their first skill
  const first = classSkills(cls.id)[0]!;
  learnSkill(m, first.id);
  m.hp = maxHp(m);
  m.mp = maxMp(m);
  return m;
}

export function recruitCost(m: Member) {
  const cls = CLASS_BY_ID[m.classId]!;
  return Math.round((120 + cls.power * 22 + m.level * 160) * (cls.role === "artisan" ? 1.4 : 1));
}

export function rollRecruits(clanLevel: number, n = 5) {
  return Array.from({ length: n }, () => makeRecruit(clanLevel));
}

export interface Founding {
  clanName: string;
  motto: string;
  lordName: string;
  classId: string;
  portrait: Portrait;
  crest: Crest;
  profession: ProfessionId;
}

export function chronicle(
  state: GameState,
  kind: ChronicleEntry["kind"],
  title: string,
  text: string,
) {
  state.chronicle = state.chronicle ?? [];
  state.chronicle.unshift({ id: uid(), at: Date.now(), title, text, kind });
  if (state.chronicle.length > 200) state.chronicle.length = 200;
}

/* --------------------------------- Legacy ---------------------------------- *
 * The only victory (Systems Bible §7). Deeds are derived from the permanent
 * record the clan already keeps — the Chronicle, the memorial, and champions'
 * marks — so the Chronicle IS the permanence. Renown is prestige only: it
 * never grants a stat ([CANON] §7.5). Inscription (§7.4) is a separate,
 * player-willed act that carves a Deed into the Monument for a price in gold.
 */

export type DeedClass = "conquest" | "endurance" | "first" | "sacrifice" | "craft" | "infamy";

/** How much an Ashen Oath multiplies the legacy of a fall ([TUNING] §4.2). */
export const OATH_LEGACY_MULT = 2.6;

export interface DeedRecord {
  id: string;
  cls: DeedClass;
  title: string;
  text: string;
  /** Chronicle weight — provisional [TUNING], seeded conservatively (§7.2 L1). */
  weight: number;
  at: number;
}

export const DEED_LABEL: Record<DeedClass, string> = {
  conquest: "Conquest",
  endurance: "Endurance",
  first: "First",
  sacrifice: "Sacrifice",
  craft: "Craft",
  infamy: "Infamy",
};

/** chronicle kind -> deed class + weight (skip the ones the memorial owns). */
const CHRON_DEED: Partial<Record<ChronicleEntry["kind"], { cls: DeedClass; weight: number }>> = {
  founding: { cls: "first", weight: 40 },
  triumph: { cls: "conquest", weight: 90 },
  war: { cls: "conquest", weight: 80 },
  rise: { cls: "endurance", weight: 60 },
  forge: { cls: "craft", weight: 45 },
};

/** The clan's Deeds — the atoms of legacy (§7.2), read from the permanent record. */
export function deedsFromState(state: GameState): DeedRecord[] {
  const out: DeedRecord[] = [];
  for (const c of state.chronicle ?? []) {
    const map = CHRON_DEED[c.kind];
    if (!map) continue;
    out.push({
      id: `chr:${c.id}`,
      cls: map.cls,
      title: c.title,
      text: c.text,
      weight: map.weight,
      at: c.at,
    });
  }
  for (const f of state.memorial ?? []) {
    const base = 60 + Math.round(f.level * 1.5) + (f.wasLord ? 80 : 0);
    // An Oathsworn death is the honoured, outsized Deed the grimdark crowd craves (§4.2).
    const w = f.oath ? Math.round(base * OATH_LEGACY_MULT) : base;
    out.push({
      id: `fallen:${f.id}`,
      cls: "sacrifice",
      title: f.oath
        ? `${f.name} kept the Oath and fell at ${f.where}`
        : `${f.name} fell${f.wasLord ? ", the Lord," : ""} at ${f.where}`,
      text: f.oath
        ? `Oathsworn. A ${classNameOf(f.classId)} of level ${f.level} who swore to fall rather than yield, and did. The Warden-Fallen keep their name.`
        : `A ${classNameOf(f.classId)} of level ${f.level}, ${f.mobKills} foes felled before the end. Their name outlives them.`,
      weight: w,
      at: f.at,
    });
  }
  for (const m of state.members ?? []) {
    for (const mk of m.marks ?? []) {
      if (mk.kind !== "slayer") continue; // first of the clan to fell a kind — a "First"
      out.push({
        id: `mark:${m.id}:${mk.id}`,
        cls: "first",
        title: mk.text,
        text: `${m.name} — ${mk.where ?? "the field"}.`,
        weight: 70,
        at: mk.at,
      });
    }
  }
  return out.sort((a, b) => b.at - a.at);
}

function classNameOf(classId: string): string {
  return CLASS_BY_ID[classId]?.name ?? "champion";
}

/** Cosmetic Renown ranks — prestige, never power ([CANON] §7.5). */
export const RENOWN_RANKS: { at: number; title: string }[] = [
  { at: 0, title: "Unsung" },
  { at: 120, title: "Named" },
  { at: 350, title: "Renowned" },
  { at: 800, title: "Storied" },
  { at: 1600, title: "Legendary" },
  { at: 3200, title: "Immortal" },
];

export function renownScore(deeds: DeedRecord[]): number {
  return deeds.reduce((s, d) => s + d.weight, 0);
}

export function renownRank(score: number): {
  title: string;
  next: { title: string; at: number } | null;
  floor: number;
} {
  let idx = 0;
  for (let i = 0; i < RENOWN_RANKS.length; i++) if (score >= RENOWN_RANKS[i]!.at) idx = i;
  const cur = RENOWN_RANKS[idx]!;
  const next = idx + 1 < RENOWN_RANKS.length ? RENOWN_RANKS[idx + 1]! : null;
  return { title: cur.title, next, floor: cur.at };
}

/**
 * Wearable clan titles (§7.5) — Renown made *visible*. A rank is a number the
 * clan reaches; a title is an honorific the clan *wears*, chosen by the leader
 * and shown beside the clan's name. Titles are earned by Renown thresholds and
 * by specific Deeds, but — like Renown itself — grant no stat. Prestige worn on
 * the sleeve, never power ([CANON] §7.5).
 */
export interface ClanTitle {
  id: string;
  /** the honorific as worn, e.g. "Storied of Aethyr" */
  title: string;
  /** how it is earned — shown in the picker */
  desc: string;
  unlocked: (state: GameState, ctx: { score: number; deeds: DeedRecord[] }) => boolean;
}

export const CLAN_TITLES: ClanTitle[] = [
  {
    id: "named",
    title: "Named of Aethyr",
    desc: "Reach 120 Renown.",
    unlocked: (_s, c) => c.score >= 120,
  },
  {
    id: "renowned",
    title: "the Renowned",
    desc: "Reach 350 Renown.",
    unlocked: (_s, c) => c.score >= 350,
  },
  {
    id: "storied",
    title: "the Storied",
    desc: "Reach 800 Renown.",
    unlocked: (_s, c) => c.score >= 800,
  },
  {
    id: "legendary",
    title: "the Legendary",
    desc: "Reach 1600 Renown.",
    unlocked: (_s, c) => c.score >= 1600,
  },
  {
    id: "immortal",
    title: "the Immortal",
    desc: "Reach 3200 Renown.",
    unlocked: (_s, c) => c.score >= 3200,
  },
  {
    id: "warden_vareth",
    title: "Warden of Vareth",
    desc: "Hold Castle Vareth.",
    unlocked: (s) => s.castle?.holder === "player",
  },
  {
    id: "nightholder",
    title: "Who Held the Long Night",
    desc: "Hold the line through a Long Night.",
    unlocked: (_s, c) =>
      c.deeds.some((d) => d.title.startsWith("Held the line through the Long Night")),
  },
  {
    id: "oathkeeper",
    title: "the Oathkeeper",
    desc: "Have an Oathsworn champion fall in your name.",
    unlocked: (s) => (s.memorial ?? []).some((f) => f.oath),
  },
  {
    id: "housebreaker",
    title: "Breaker of Houses",
    desc: "Rout rival clans 12 times over.",
    unlocked: (s) => (s.rivals ?? []).reduce((n, r) => n + (r.routed ?? 0), 0) >= 12,
  },
];

export const CLAN_TITLE_BY_ID: Record<string, ClanTitle> = Object.fromEntries(
  CLAN_TITLES.map((t) => [t.id, t]),
);

/** Which titles the clan has earned the right to wear, given its record. */
export function earnedTitles(state: GameState): ClanTitle[] {
  const deeds = deedsFromState(state);
  const score = renownScore(deeds);
  const ctx = { score, deeds };
  return CLAN_TITLES.filter((t) => t.unlocked(state, ctx));
}

/** The honorific the clan currently wears, or "" — validated it is still earned. */
export function wornTitle(state: GameState): string {
  if (!state.title) return "";
  const t = CLAN_TITLE_BY_ID[state.title];
  if (!t) return "";
  return t.unlocked(state, {
    deeds: deedsFromState(state),
    score: renownScore(deedsFromState(state)),
  })
    ? t.title
    : "";
}

/** What it costs in gold to carve a Deed into the Monument (§7.4 — being remembered is paid for). */
export function inscribeCost(deed: DeedRecord): number {
  return 40 + deed.weight * 4;
}

export function makeLord(f: Founding): Member {
  const lord: Member = {
    id: uid(),
    name: f.lordName,
    classId: f.classId,
    level: 3,
    xp: 0,
    hp: 0,
    mp: 0,
    gear: [],
    skills: [],
    partyId: "p1",
    isLord: true,
    title: "the Unproven",
    portrait: f.portrait,
    profession: f.profession,
    joinedAt: Date.now(),
    craftMastery: CLASS_BY_ID[f.classId]!.role === "artisan" ? CRAFT_MASTERIES[0] : undefined,
  };
  for (const sk of classSkills(f.classId).filter((x) => x.unlock <= 3)) learnSkill(lord, sk.id);
  lord.hp = maxHp(lord);
  lord.mp = maxMp(lord);
  return lord;
}

export function initialState(founding: Founding): GameState {
  const lord = makeLord(founding);
  const state: GameState = {
    clanName: founding.clanName,
    leaderName: founding.lordName,
    motto: founding.motto,
    crest: founding.crest,
    clanLevel: 0,
    reputation: 0,
    gold: 1200,
    members: [lord],
    parties: [
      { id: "p1", name: `${founding.lordName}'s Company`, memberIds: [lord.id], run: null },
    ],
    inventory: {},
    recruits: rollRecruits(1),
    daily: rollDailies(),
    weekly: rollWeeklies(),
    monthly: rollMonthlies(),
    keep: { barracks: 0, infirmary: 0, yard: 0, vault: 0, shrine: 0 },
    chronicle: [],
    memorial: [],
    rivals: initialRivals(),
    castle: initialCastle(),
    realmTickAt: Date.now(),
    companies: [],
    inspiration: 0,
    log: [
      {
        id: uid(),
        at: Date.now(),
        text: `${founding.lordName} takes the road with a single company. ${founding.clanName} is still only a name.`,
        tone: "info",
      },
    ],
    createdAt: Date.now(),
  };
  chronicle(
    state,
    "founding",
    `${founding.lordName} takes the road`,
    `${founding.lordName}, ${CLASS_BY_ID[founding.classId]!.name}, gathers one company and swears to raise a clan under the name ${founding.clanName}. "${founding.motto}"`,
  );
  return state;
}

/* --------------------------------- The Lord -------------------------------- */

export function lordOf(state: GameState) {
  return state.members.find((m) => m.isLord);
}

/** A banner the Lord rides with fights harder and loses fewer people. */
export function ledPersonally(state: GameState, party: Party) {
  const lord = lordOf(state);
  return !!lord && party.memberIds.includes(lord.id);
}

export const LORD_BONUS = { power: 0.12, xp: 0.15, gold: 0.15, deathGuard: 0.5 };

/** Epithets earned by deeds — the clan starts calling you something. */
export function earnedTitle(m: Member, state: GameState): string {
  const kills = m.mobKills ?? 0;
  const pvp = m.pvpKills ?? 0;
  if (state.castle?.holder === "player" && m.isLord) return "Lord of Vareth";
  if (pvp >= 60) return "the Bloodwright";
  if (kills >= 12000) return "the Unending";
  if (kills >= 5000) return "the Unbroken";
  if (kills >= 1500) return "the Tested";
  if (m.level >= MAX_LEVEL) return "the Ascendant";
  if ((m.deaths ?? 0) >= 8) return "the Thrice-Buried";
  return m.isLord ? "the Unproven" : "";
}

/* ------------------------- Death, and how permanent -------------------------- */

/** Odds that falling in this zone is the last thing a champion ever does. */
export function deathRisk(
  state: GameState,
  party: Party,
  zoneKind: "field" | "dungeon",
  reqLevel: number,
  member?: Member,
) {
  const base = zoneKind === "dungeon" ? 0.14 : 0.05;
  const deep = reqLevel >= 45 ? 0.06 : reqLevel >= 30 ? 0.03 : 0;
  const guard = ledPersonally(state, party) ? LORD_BONUS.deathGuard : 1;
  const infirmary = (state.keep?.infirmary ?? 0) * 0.012;
  const background = 1 - Math.min(0.4, perkSum([member?.profession], "deathGuard") / 100);
  return Math.max(0.01, ((base + deep) * guard - infirmary) * background);
}

/* ------------------------------ Rivals & castle ----------------------------- */

function pushLog(state: GameState, text: string, tone: "good" | "bad" | "info") {
  state.log.unshift({ id: uid(), at: Date.now(), text, tone });
  if (state.log.length > 120) state.log.length = 120;
}

export function rivalOfZone(state: GameState, zoneId: string) {
  return state.rivals?.find((r) => r.claims.includes(zoneId));
}

/**
 * Ash Debt (Systems Bible §3) — the One Law with teeth. Power reached for in the
 * fight leaves a debt that does not auto-clear (§3.1); death feeds it (§3.3). It
 * suppresses the host you can bring to a fight — the boss charge and the siege —
 * but never touches ordinary farming (a warrior can still swing; it is the
 * *reach past Vigour* that collects). Cleared only by resting at a warded flame.
 */
export const ASH_DEBT = {
  deathAccrual: 22,
  maxSuppression: 0.4,
  suppressAt: 260,
  restPerPoint: 3,
  // Overdraw (§3.1): reach past Vigour for a burst now — more debt, more danger.
  overdrawDamage: 0.55,
  overdrawDebt: 30,
  overdrawRisk: 1.7,
  // Searing (§3.2): carry too much debt and the Ash burns the host outright.
  searingAt: 150,
  searingRisk: 1.35,
};

/** Past this much carried debt, the host is Searing — every charge is deadlier (§3.2). */
export function isSearing(state: GameState): boolean {
  return (state.ashDebt ?? 0) >= ASH_DEBT.searingAt;
}

/** 0 .. maxSuppression — how much the carried Ash Debt shrinks usable host power. */
export function ashDebtSuppression(state: GameState): number {
  const d = state.ashDebt ?? 0;
  if (d <= 0) return 0;
  return Math.min(ASH_DEBT.maxSuppression, d / ASH_DEBT.suppressAt);
}

/** Gold to pay down the whole debt at a warded flame (§1.1 Muster). */
export function restAtFlameCost(state: GameState): number {
  return Math.round((state.ashDebt ?? 0) * ASH_DEBT.restPerPoint);
}

export function clanHostPower(state: GameState) {
  const raw = state.parties.reduce((sum, p) => sum + partyPower(state, p), 0);
  return Math.round(raw * (1 - ashDebtSuppression(state)));
}

/**
 * The Long Night (Systems Bible §5) — a recurring world event, not a one-time
 * apocalypse. A pressure gauge rises over the season; the exact hour it breaks
 * is hidden (the horror is the uncertainty). When it breaks, the light-fearing
 * things pour out and the realm's rivals press harder — old enemies call bitter
 * truce to survive it. [TUNING].
 */
export const LONG_NIGHT = {
  risePerHour: 6,
  durationMs: 20 * 60_000,
  hostilitySurgePerHour: 8,
};

/**
 * The Long Night's bite while it walks (§5). It must be *felt*, not merely
 * noted in the log: the dead grow bold so the field turns deadlier, but the
 * upper Ash runs thick — spoils come richer and a tide of raw Ash sheds on any
 * banner that braves the dark. Holding the line through it mints a Deed. Clear
 * sky = no multipliers, no tide.
 */
export const LONG_NIGHT_TIDE = {
  deathMult: 1.6, // the dead are bolder in the dark
  spoilMult: 1.35, // the thick Ash makes gold and glory run richer
  ashTide: 9, // raw Ash the swallowed sky sheds per run
};

export interface NightTide {
  deathMult: number;
  spoilMult: number;
  ashTide: number;
}

/** The active tide, or a no-op tide under a clear sky. */
export function longNightTide(state: GameState, now: number = Date.now()): NightTide {
  return longNightActive(state, now)
    ? { ...LONG_NIGHT_TIDE }
    : { deathMult: 1, spoilMult: 1, ashTide: 0 };
}

/**
 * Raw Ash (Systems Bible §6.2) — raw Ash never settles, so it decays if hoarded.
 * It must be spent or refined into a stable store (gold) before it burns off. A
 * hot potato that keeps the economy circulating and punishes dragon-hoarding.
 */
export const RAW_ASH = { decayPerHour: 0.09, refineRate: 2 };

/**
 * The Ledger (Systems Bible §6.3) — the Gilded Compact's power. In the AI-rival
 * model it is a moneylender: borrow gold to fund a campaign now, and owe it back
 * with interest by the weekly settlement. Default, and the debt compounds and
 * bleeds your standing — "every crown has a price."
 */
export const LEDGER = {
  rate: 0.2, // interest on the principal
  termMs: 7 * 86_400_000, // a week to repay (§1.2 weekly settlement)
  maxLoanPerLevel: 400, // borrowing cap scales with clan level
  overdueCompound: 0.06, // per-hour interest once overdue
  overdueRepDrip: 2, // reputation lost per hour once overdue
  // Kit insurance (§4.3, §6.3): a premium buys a term of cover, and a covered
  // fall pays out a fraction of the lost champion's worth — full-loot stings
  // less if you paid the Compact first.
  insureTermMs: 3 * 86_400_000,
  insurePremiumPerLevel: 45,
  insurePayoutPerLevel: 55,
  // Bounties (§6.3): escrow gold on a rival's head; the Compact skims a cut and
  // holds the rest until the mark is broken, then pays out in gold and standing.
  bountyCut: 0.15,
  bountyMin: 150,
  bountyRepPer100: 6,
};

/** The most gold the Compact will advance a clan of this standing. */
export function loanCeiling(state: GameState): number {
  return Math.max(500, state.clanLevel * LEDGER.maxLoanPerLevel);
}

/**
 * The premium the Compact asks to underwrite the host for a term (§6.3). Scaled
 * to the host's actual exposure — the total it would pay out if the whole roster
 * fell — so a large, high-level host can't be insured for a pittance.
 */
export function insurePremium(state: GameState): number {
  const exposure = state.members.reduce((s, m) => s + insurePayout(m.level), 0);
  return Math.max(200, Math.round(exposure * 0.05));
}

/** Is a Compact kit-insurance policy currently in force? */
export function insured(state: GameState, now: number = Date.now()): boolean {
  return !!state.insurance && now < state.insurance.until;
}

/** What the Compact pays out for a covered champion of this level (§4.3). */
export function insurePayout(level: number): number {
  return Math.round(Math.max(1, level) * LEDGER.insurePayoutPerLevel);
}

/** Net gold escrowed on a rival's head, after the Compact's cut. */
export function bountyOn(state: GameState, rivalId: string): number {
  return state.bounties?.[rivalId] ?? 0;
}

/**
 * Feudal vassals (Systems Bible §8.1), AI model. Houses swear fealty to your
 * banner: they tithe up the chain, and turn out for your defence. The engine
 * offers the bargain; it never compels it — fealty is freely given (and can be
 * released). Allegiance is to a lord, not a realm.
 */
export interface VassalHouse {
  id: string;
  name: string;
  blurb: string;
  power: number;
  /** gold tithed up the chain per hour */
  tithe: number;
  /** the gift of gold that secures their oath */
  cost: number;
  reqLevel: number;
}

export const VASSAL_HOUSES: VassalHouse[] = [
  {
    id: "kessel",
    name: "House Kessel",
    blurb: "Fen-folk levies — modest swords, a steady tithe.",
    power: 500,
    tithe: 16,
    cost: 900,
    reqLevel: 3,
  },
  {
    id: "vantar",
    name: "House Vantar",
    blurb: "Border knights who ride for a lord, not a crown.",
    power: 950,
    tithe: 11,
    cost: 1600,
    reqLevel: 4,
  },
  {
    id: "dromm",
    name: "House Dromm",
    blurb: "Grim veterans of the Sunless War — heavy, and proud.",
    power: 1500,
    tithe: 7,
    cost: 2600,
    reqLevel: 6,
  },
  {
    id: "ashfeld",
    name: "House Ashfeld",
    blurb: "Ash-gatherers turned sellsword — they pay their way.",
    power: 700,
    tithe: 22,
    cost: 1400,
    reqLevel: 5,
  },
];

export const VASSAL_BY_ID: Record<string, VassalHouse> = Object.fromEntries(
  VASSAL_HOUSES.map((h) => [h.id, h]),
);

/**
 * Loyalty (§8.1) — fealty is *freely given*, so it can waver. A sworn house's
 * loyalty (0..100) drifts up while you keep faith and hold your seat, and drains
 * when the seat is lost or the host burns with Ash Debt. A wavering house fights
 * at half strength; a house whose loyalty runs out renounces its oath and rides
 * home. The lord can reaffirm the bond with a gift of gold — never compel it.
 */
export const VASSAL = {
  startLoyalty: 60,
  driftUpPerHour: 1.5, // faith kept, the bond steadies
  lostSeatDrainPerHour: 3, // a lord who cannot hold a seat is a poor liege
  searingDrainPerHour: 4, // a host burning with Ash Debt frightens its levies
  renounceAt: 0,
  reaffirmCostFrac: 0.25, // a gift of gold worth this much of the oath-price
};

export function vassalLoyalty(state: GameState, id: string): number {
  const v = state.vassalLoyalty?.[id];
  return Math.max(0, Math.min(100, v ?? VASSAL.startLoyalty));
}

/** What a gift to reaffirm a wavering house's oath costs (§8.1). */
export function reaffirmCost(house: VassalHouse): number {
  return Math.round(house.cost * VASSAL.reaffirmCostFrac);
}

/** Loyalty scales a house's turnout: wavering houses hold back (0.5x..1.0x). */
export function vassalTurnout(loyalty: number): number {
  return 0.5 + 0.5 * (Math.max(0, Math.min(100, loyalty)) / 100);
}

export function swornVassals(state: GameState): VassalHouse[] {
  return (state.vassals ?? []).map((id) => VASSAL_BY_ID[id]).filter((h): h is VassalHouse => !!h);
}
export function vassalPower(state: GameState): number {
  // loyalty-weighted: a wavering house turns out at half strength (§8.1)
  return swornVassals(state).reduce(
    (s, h) => s + Math.round(h.power * vassalTurnout(vassalLoyalty(state, h.id))),
    0,
  );
}
export function vassalTithe(state: GameState): number {
  return swornVassals(state).reduce((s, h) => s + h.tithe, 0);
}

/** Gold you'd get for refining the whole raw-Ash hoard right now. */
export function refineAshValue(state: GameState): number {
  return Math.floor((state.rawAsh ?? 0) * RAW_ASH.refineRate);
}

export function longNightActive(state: GameState, now: number = Date.now()): boolean {
  return !!state.longNight?.endsAt && now < state.longNight.endsAt;
}

/** 0..100 — how close the sky is to being swallowed. */
export function longNightPressure(state: GameState): number {
  return Math.min(100, Math.max(0, state.longNight?.pressure ?? 0));
}

/**
 * Advances the world one step: rivals grow, stake claims, and the castle pays
 * out. Called on a slow timer so the realm keeps moving while you play.
 */
export function realmPulse(state: GameState) {
  const now = Date.now();
  const last = state.realmTickAt ?? now;
  const hours = (now - last) / 3_600_000;
  if (now - last < 45_000) return;
  state.realmTickAt = now;
  state.rivals = state.rivals ?? initialRivals();
  state.castle = state.castle ?? initialCastle();

  const openZones = ZONES.filter((z) => z.reqLevel <= 52).map((z) => z.id);

  // The Long Night (§5): pressure rises, then breaks over the realm for a window.
  const ln = state.longNight ?? { pressure: 0 };
  if (ln.endsAt && now >= ln.endsAt) {
    ln.endsAt = undefined;
    pushLog(
      state,
      "The Long Night lifts. The sun returns, grey and cold, and the truce with it.",
      "info",
    );
  }
  if (!ln.endsAt) {
    ln.pressure = Math.min(100, (ln.pressure ?? 0) + LONG_NIGHT.risePerHour * hours);
    if (ln.pressure >= 100) {
      ln.pressure = 0;
      ln.endsAt = now + LONG_NIGHT.durationMs;
      ln.held = false;
      pushLog(
        state,
        "The upper Ash thickens and swallows the sun — the Long Night is upon the realm.",
        "bad",
      );
      chronicle(
        state,
        "war",
        "The Long Night breaks",
        "The dead grow restless and the light-fearing things pour out. Old enemies call bitter truce to outlast it — and remember who held the line.",
      );
    }
  }
  state.longNight = ln;
  const nightSurge = ln.endsAt ? LONG_NIGHT.hostilitySurgePerHour * hours : 0;

  // Raw Ash never settles — a hoarded pile burns off over time (§6.2).
  if ((state.rawAsh ?? 0) > 0 && hours > 0) {
    const kept = (state.rawAsh ?? 0) * Math.pow(1 - RAW_ASH.decayPerHour, hours);
    state.rawAsh = kept < 0.5 ? 0 : kept;
  }

  // The Ledger comes due (§6.3): an overdue Compact debt compounds and bleeds standing.
  if (state.loan && hours > 0 && now >= state.loan.dueAt) {
    state.loan.owed = Math.round(state.loan.owed * Math.pow(1 + LEDGER.overdueCompound, hours));
    state.reputation = Math.max(0, Math.round(state.reputation - LEDGER.overdueRepDrip * hours));
  }

  // Vassals tithe up the chain (§8.1) — into the castle purse if you hold a seat, else your coffers.
  if (hours > 0) {
    const tithe = Math.round(vassalTithe(state) * hours);
    if (tithe > 0) {
      if (state.castle?.holder === "player") state.castle.purse += tithe;
      else state.gold += tithe;
    }
  }

  // Loyalty drifts (§8.1): faith kept steadies the bond; a lost seat or a searing
  // host frightens the levies. A house whose loyalty runs out renounces its oath.
  if (hours > 0 && (state.vassals?.length ?? 0) > 0) {
    state.vassalLoyalty = state.vassalLoyalty ?? {};
    const seatHeld = state.castle?.holder === "player";
    const seatLost =
      !!state.castle && state.castle.holder !== "player" && state.castle.holder !== "crown";
    const searing = isSearing(state);
    let drift = VASSAL.driftUpPerHour;
    if (seatLost) drift -= VASSAL.lostSeatDrainPerHour;
    if (searing) drift -= VASSAL.searingDrainPerHour;
    if (seatHeld) drift += 0.5; // a lord who holds his seat keeps his oaths
    for (const id of [...(state.vassals ?? [])]) {
      const cur = state.vassalLoyalty[id] ?? VASSAL.startLoyalty;
      const next = Math.max(0, Math.min(100, cur + drift * hours));
      state.vassalLoyalty[id] = next;
      if (next <= VASSAL.renounceAt) {
        state.vassals = (state.vassals ?? []).filter((x) => x !== id);
        delete state.vassalLoyalty[id];
        const h = VASSAL_BY_ID[id];
        pushLog(
          state,
          `${h?.name ?? "A sworn house"} has renounced its oath and ridden home. Fealty kept no faith.`,
          "bad",
        );
      }
    }
  }

  for (const r of state.rivals) {
    const def = RIVAL_BY_ID[r.id]!;
    r.power = Math.round(r.power * (1 + 0.012 * def.ambition));
    r.hostility = Math.min(
      100,
      r.hostility + (state.clanLevel > 3 ? 1.5 : 0.6) * def.ambition + nightSurge,
    );
    if (r.claims.length < 3 && Math.random() < 0.35) {
      const taken = new Set(state.rivals.flatMap((x) => x.claims));
      const free = openZones.filter((z) => !taken.has(z));
      if (free.length) {
        const z = free[Math.floor(Math.random() * free.length)]!;
        r.claims.push(z);
        const zone = ZONE_BY_ID[z];
        pushLog(
          state,
          `${def.name} has claimed ${zone?.name}. Their tax collectors are already there.`,
          "bad",
        );
      }
    }
  }

  // castle purse — the Ashen Toll shrinks the tithe and dims the ward the longer
  // the seat is held unchallenged (§2.4).
  if (state.castle.holder === "player" && hours > 0) {
    const toll = ashenToll(state.castle, now);
    state.castle.purse += Math.round(CASTLE.taxPerHour * hours * toll.titheFactor);
    if (
      state.castle.nextAssaultAt &&
      now >= state.castle.nextAssaultAt &&
      !castleVulnerable(state.castle, now)
    ) {
      // outside the declared Vulnerability Window — the seat is safe (§2.3)
      state.castle.nextAssaultAt = now + 10 * 60_000;
    } else if (state.castle.nextAssaultAt && now >= state.castle.nextAssaultAt) {
      const attacker =
        state.rivals.slice().sort((a, b) => b.hostility - a.hostility)[0] ?? state.rivals[0]!;
      // vassals turn out for the defence (§8.1)
      const res = resolveClash(
        attacker.power * 1.1 * toll.wardMult,
        clanHostPower(state) + 400 + vassalPower(state),
      );
      // a dimmed ward is stormed more often
      state.castle.nextAssaultAt = now + Math.round((20 - 8 * toll.ramp) * 60_000);
      if (res.win) {
        state.castle.holder = attacker.id;
        state.castle.sinceAt = now;
        state.castle.purse = 0;
        pushLog(
          state,
          `${RIVAL_BY_ID[attacker.id]!.name} has stormed Vareth. The keep is lost.`,
          "bad",
        );
        chronicle(
          state,
          "loss",
          "Vareth falls",
          `${RIVAL_BY_ID[attacker.id]!.name} broke the gate at dawn. The banners came down without ceremony.`,
        );
      } else {
        attacker.power = Math.round(attacker.power * 0.85);
        state.reputation += 40;
        pushLog(
          state,
          `${RIVAL_BY_ID[attacker.id]!.name} broke against the walls of Vareth.`,
          "good",
        );
      }
    }
  }
}

/**
 * The Ashen Toll (Systems Bible §2.4) — the anti-turtle valve. A seat held too
 * long, unchallenged, accrues Ash Debt of its own: the tithe shrinks and the
 * Ashenward dims (assaults hit harder). The One Law applies to castles as it
 * does to casters — permanence is bought with escalating debt, never for free.
 */
export const ASHEN_TOLL = { graceDays: 2, fullDays: 12, titheDrain: 0.6, wardWeaken: 0.35 };

export function ashenToll(
  castle: CastleState | undefined,
  now: number = Date.now(),
): { held: boolean; days: number; ramp: number; titheFactor: number; wardMult: number } {
  if (!castle || castle.holder !== "player" || !castle.sinceAt)
    return { held: false, days: 0, ramp: 0, titheFactor: 1, wardMult: 1 };
  const days = (now - castle.sinceAt) / 86_400_000;
  const { graceDays, fullDays, titheDrain, wardWeaken } = ASHEN_TOLL;
  const ramp = Math.min(1, Math.max(0, (days - graceDays) / (fullDays - graceDays)));
  return {
    held: true,
    days,
    ramp,
    titheFactor: 1 - titheDrain * ramp,
    wardMult: 1 + wardWeaken * ramp,
  };
}

/**
 * The Vulnerability Window (Systems Bible §2.3) — the 4 a.m. problem, solved.
 * A held seat can only be stormed during the hours its holder declares; outside
 * the window it is safe. (AI-rival model: rivals wait for the opening.)
 */
export function castleVulnerable(
  castle: CastleState | undefined,
  now: number = Date.now(),
): boolean {
  if (!castle?.window) return true;
  const h = new Date(now).getHours();
  const { startHour, hours } = castle.window;
  const end = startHour + hours;
  return end <= 24 ? h >= startHour && h < end : h >= startHour || h < end - 24;
}

export function siegeReady(state: GameState) {
  if (state.clanLevel < CASTLE.reqClanLevel)
    return { ok: false, why: `Requires clan level ${CASTLE.reqClanLevel}` };
  if (state.castle?.holder === "player") return { ok: false, why: "You already hold Vareth" };
  const idle = state.parties.some((p) => !p.run && p.memberIds.length > 0);
  if (!idle) return { ok: false, why: "Every banner is in the field — recall one" };
  return { ok: true, why: "" };
}

/* ------------------------------ Shot economy -------------------------------- */

/** Highest shot grade a member is trained to fire at full effect. */
export function memberShotTier(m: Member): Grade {
  let best: Grade = "Low";
  for (const g of SHOT_GRADES) if (m.level >= SHOT_TIER_LEVEL[g]) best = g;
  return best;
}

export function memberShotKind(m: Member): ShotKind {
  return ROLE_SHOT[CLASS_BY_ID[m.classId]!.role];
}

/** Picks the best shot in the warehouse this member can fire, with its boost. */
export function pickShot(
  m: Member,
  counts: Record<string, number>,
): { item: ItemId; boost: number } | null {
  const kind = memberShotKind(m);
  const tierIdx = SHOT_GRADES.indexOf(memberShotTier(m));
  for (let i = tierIdx; i >= 0; i--) {
    const g = SHOT_GRADES[i]!;
    for (const blessed of [true, false]) {
      const id = shotId(kind, g, blessed);
      if ((counts[id] ?? 0) > 0) {
        const scale = (i + 1) / (tierIdx + 1);
        return { item: id, boost: (blessed ? BLESSED_BOOST : SHOT_BOOST) * scale };
      }
    }
  }
  return null;
}

/** Market refining cost for one batch of SHOT_BATCH shots. */
export function shotBatchCost(grade: Grade, blessed: boolean) {
  const spec = SHOT_SPECS[grade];
  const mult = blessed ? BLESSED_MULT : 1;
  return { embers: spec.embers * mult, fee: spec.fee * mult, qty: SHOT_BATCH };
}

export function canRefine(
  state: GameState,
  kind: ShotKind,
  grade: Grade,
  blessed: boolean,
  batches = 1,
) {
  const c = shotBatchCost(grade, blessed);
  const need = c.embers * batches;
  const have = state.inventory[emberId(kind)] ?? 0;
  if (have < need)
    return { ok: false, why: `Needs ${need} ${kind === "soul" ? "souls" : "spirits"}` };
  if (state.gold < c.fee * batches) return { ok: false, why: "Not enough gold for the market fee" };
  return { ok: true, why: "" };
}

/* --------------------------------- Combat ---------------------------------- */

export interface RunResult {
  success: boolean;
  gold: number;
  rep: number;
  xp: number;
  kills: number;
  loot: { item: ItemId; qty: number }[];
  /** shots burned during the run, by item id */
  shotsUsed: Record<string, number>;
  /** backgrounds whose deed was fulfilled — each one earns the clan Inspiration */
  /** scrolls read during the run, by item id */
  scrollsUsed: Record<string, number>;
  /** what the vellum did — one line per scroll read */
  scrollNotes: string[];
  /** full per-reading record: the roll, the check and what it cost the reader */
  scrollAttempts: ScrollAttempt[];
  deeds: { memberId: string; profession: ProfessionId; text: string }[];
  /** memberId -> skillId -> uses */
  skillUses: Record<string, Record<string, number>>;
  /** memberId -> {hp, mp} after the fight */
  vitals: Record<string, { hp: number; mp: number }>;
  /** members who actually fought (they were standing when the banner marched) */
  participants: string[];
  /** members who fell during this run */
  fallen: string[];
  /** memberId -> record gained this run */
  record: Record<string, { mobKills: number; pvpKills: number; pkKills: number }>;
  /** who carried the fight */
  mvp?: { memberId: string; name: string; damage: number } | undefined;
  /** the single biggest blow landed */
  bigHit?: { name: string; skill: string; damage: number; crit: boolean } | undefined;
  /** headline beats worth reading out loud */
  highlights?:
    { text: string; kind: "crit" | "clutch" | "flawless" | "rout" | "rare" }[] | undefined;
  /** letter grade for the run, S down to C */
  rating?: "S" | "A" | "B" | "C" | undefined;
  /** what the banner actually fought out there */
  encounters?: Encounter[];
  /** the weather the field was under, if anything but Calm */
  condition?: { id: ZoneConditionId; name: string; glyph: string } | undefined;

  text: string;
}

function conditionMet(
  cond: SkillCondition,
  ctx: { round: number; selfPct: number; lowestAllyPct: number; enemyPct: number; mpPct: number },
) {
  switch (cond) {
    case "always":
      return true;
    case "never":
      return false;
    case "opening":
      return ctx.round === 0;
    case "self_hp_low":
      return ctx.selfPct < 0.5;
    case "ally_hp_low":
      return ctx.lowestAllyPct < 0.6;
    case "enemy_hp_low":
      return ctx.enemyPct < 0.4;
    case "mp_high":
      return ctx.mpPct > 0.5;
  }
}

export interface DeedContext {
  success: boolean;
  zoneKind: "field" | "dungeon";
  standing: number;
  partySize: number;
  lootKinds: number;
  kills: number;
}

/** Which champions lived out their background this run. */
export function earnedDeeds(ms: Member[], ctx: DeedContext) {
  const out: { memberId: string; profession: ProfessionId; text: string }[] = [];
  for (const m of ms) {
    const def = m.profession ? PROFESSION_BY_ID[m.profession] : undefined;
    if (!def) continue;
    let hit = false;
    switch (def.deed) {
      case "clear_dungeon":
        hit = ctx.success && ctx.zoneKind === "dungeon";
        break;
      case "clear_field":
        hit = ctx.success && ctx.zoneKind === "field";
        break;
      case "survive_rout":
        hit = !ctx.success && ctx.standing > 0;
        break;
      case "finish_wounded":
        hit = ctx.success && ctx.standing === ctx.partySize && ctx.partySize > 1;
        break;
      case "big_haul":
        hit = ctx.success && ctx.lootKinds >= 4;
        break;
      case "outnumbered":
        hit = ctx.success && ctx.standing > 0 && ctx.standing < 4;
        break;
      case "full_party":
        hit = ctx.partySize >= MAX_PARTY_SIZE;
        break;
      case "high_kills":
        hit = ctx.kills >= 40;
        break;
    }
    if (hit) out.push({ memberId: m.id, profession: def.id, text: def.deedText });
  }
  return out;
}

/* ------------------------- Hourly high-activity surge ------------------------ */

export const SURGE_HOUR_MS = 3_600_000;
/** Small, deliberately modest boosts — a nudge on where to hunt, not a jackpot. */
export const SURGE_XP_PCT = 8;
export const SURGE_REP_PCT = 6;
const SURGE_COUNT = 3;

function hourSeed(now: number) {
  let h = Math.floor(now / SURGE_HOUR_MS) * 2654435761;
  h ^= h >>> 13;
  h = (h * 1274126177) >>> 0;
  return h >>> 0;
}

/** The zones running hot this hour. Deterministic, so every client agrees. */
export function surgeZones(now = Date.now()): string[] {
  const pool = ZONES.map((z) => z.id);
  let seed = hourSeed(now) || 1;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const picks: string[] = [];
  const rest = [...pool];
  while (picks.length < Math.min(SURGE_COUNT, rest.length)) {
    const i = Math.floor(rand() * rest.length);
    picks.push(rest.splice(i, 1)[0]!);
  }
  return picks;
}

export function isSurging(zoneId: string, now = Date.now()) {
  return surgeZones(now).includes(zoneId);
}

/** ms left in the current hour of high activity. */
export function surgeEndsIn(now = Date.now()) {
  return SURGE_HOUR_MS - (now % SURGE_HOUR_MS);
}

/* ---------------------------- Zone conditions ----------------------------- */
/*
 * Weather over the hunting grounds. Every zone sits under a condition that
 * rotates each "watch" (a few hours), deterministic from the zone and the clock
 * so every client agrees. Conditions carry real trade-offs — a rich haul usually
 * means a deadlier field — so *where and when* a banner hunts actually matters,
 * now that essence feeds sharpening and runes as well as shots. The Long Night
 * brings its own condition to the map while it walks.
 */
export type ZoneConditionId = "calm" | "emberfall" | "feral" | "bountiful" | "barren" | "nightgrip";

export type RiskTier = "safe" | "steady" | "tense" | "perilous";

export interface ZoneCondition {
  id: ZoneConditionId;
  name: string;
  glyph: string;
  blurb: string;
  /** reward/risk multipliers — 1 means no change */
  gold: number;
  xp: number;
  essence: number;
  drop: number;
  /** the risk lever — scales the blows the field lands on the banner */
  enemyHit: number;
}

export const ZONE_CONDITIONS: Record<ZoneConditionId, ZoneCondition> = {
  calm: {
    id: "calm",
    name: "Calm",
    glyph: "○",
    blurb: "Still ground. Nothing for or against you — hunt as you like.",
    gold: 1,
    xp: 1,
    essence: 1,
    drop: 1,
    enemyHit: 1,
  },
  emberfall: {
    id: "emberfall",
    name: "Emberfall",
    glyph: "✷",
    blurb: "The slain burn hot — essence pours off the field, and they die angrier for it.",
    gold: 1,
    xp: 1,
    essence: 1.6,
    drop: 1,
    enemyHit: 1.08,
  },
  feral: {
    id: "feral",
    name: "Feral",
    glyph: "✸",
    blurb: "The pack is roused — richer spoils and coin, but the field hits back hard.",
    gold: 1.35,
    xp: 1.1,
    essence: 1,
    drop: 1.25,
    enemyHit: 1.25,
  },
  bountiful: {
    id: "bountiful",
    name: "Bountiful",
    glyph: "❧",
    blurb:
      "Rich veins and heavy pelts — materials fall thick, and the ground is no more dangerous.",
    gold: 1,
    xp: 1,
    essence: 1.2,
    drop: 1.5,
    enemyHit: 1,
  },
  barren: {
    id: "barren",
    name: "Barren",
    glyph: "◍",
    blurb: "Thin herds and quiet ruins — little to take, but a safe place to blood a green banner.",
    gold: 0.8,
    xp: 1,
    essence: 0.7,
    drop: 0.8,
    enemyHit: 0.82,
  },
  nightgrip: {
    id: "nightgrip",
    name: "Long Night's Grip",
    glyph: "☾",
    blurb: "The dark walks this ground — deadliest of all, but it gives up essence and rare finds.",
    gold: 1.2,
    xp: 1.15,
    essence: 1.4,
    drop: 1.2,
    enemyHit: 1.35,
  },
};

/** A watch — how long a condition holds over a zone before the weather turns. */
export const CONDITION_WATCH_MS = 3 * 3_600_000;

function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * The condition holding over a zone right now. Deterministic per zone per watch,
 * weighted toward Calm so a real condition means something; the Long Night's Grip
 * only appears while the Long Night is abroad.
 */
export function zoneCondition(
  zoneId: string,
  now: number = Date.now(),
  longNight = false,
): ZoneCondition {
  let seed = (strHash(zoneId) ^ Math.imul(Math.floor(now / CONDITION_WATCH_MS), 2654435761)) >>> 0;
  seed = seed || 1;
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  const roll = seed / 4294967296;

  const pool: [ZoneConditionId, number][] = [
    ["calm", 40],
    ["emberfall", 15],
    ["feral", 12],
    ["bountiful", 15],
    ["barren", 10],
  ];
  if (longNight) pool.push(["nightgrip", 26]);

  const total = pool.reduce((s, [, w]) => s + w, 0);
  let r = roll * total;
  for (const [id, w] of pool) {
    if ((r -= w) <= 0) return ZONE_CONDITIONS[id];
  }
  return ZONE_CONDITIONS.calm;
}

/** The danger a condition adds to a field, for the risk badge. */
export function conditionRisk(c: ZoneCondition): RiskTier {
  if (c.enemyHit >= 1.25) return "perilous";
  if (c.enemyHit >= 1.05) return "tense";
  if (c.enemyHit <= 0.9) return "safe";
  return "steady";
}

export const RISK_LABEL: Record<RiskTier, string> = {
  safe: "Safe",
  steady: "Steady",
  tense: "Tense",
  perilous: "Perilous",
};

/* ------------------------------ Combat model ------------------------------ */

/** The five ways a blow can bite. Physical is neutral; the rest are typed. */
export type DamageType = "phys" | "fire" | "frost" | "shadow" | "holy";

export const DAMAGE_LABEL: Record<DamageType, string> = {
  phys: "Physical",
  fire: "Fire",
  frost: "Frost",
  shadow: "Shadow",
  holy: "Holy",
};

/** How a banner squares up: trade blows, hold the line, or throw everything in. */
export type Stance = "aggressive" | "steady" | "defensive";

export const STANCE_LABEL: Record<Stance, string> = {
  aggressive: "Aggressive",
  steady: "Steady",
  defensive: "Defensive",
};

export const STANCE_BLURB: Record<Stance, string> = {
  aggressive: "Hit harder and kill faster — but take heavier blows.",
  steady: "A balanced line. No edge, no exposure.",
  defensive: "Soak the hits and guard the wounded — the kill comes slower.",
};

const STANCE_MOD: Record<Stance, { dmg: number; incoming: number }> = {
  aggressive: { dmg: 1.18, incoming: 1.22 },
  steady: { dmg: 1, incoming: 1 },
  defensive: { dmg: 0.88, incoming: 0.8 },
};

/** Each kin's weaknesses and resistances — the whole reason damage type matters. */
const FAMILY_COMBAT: Record<MonsterFamily, { weak: DamageType[]; resist: DamageType[] }> = {
  humanoid: { weak: [], resist: [] },
  beast: { weak: ["fire"], resist: ["frost"] },
  undead: { weak: ["holy", "fire"], resist: ["shadow", "frost"] },
  demon: { weak: ["holy"], resist: ["fire", "shadow"] },
  dragonkin: { weak: ["frost"], resist: ["fire", "phys"] },
  construct: { weak: ["fire"], resist: ["phys", "shadow"] },
  insect: { weak: ["fire", "frost"], resist: ["shadow"] },
  spirit: { weak: ["holy"], resist: ["phys"] },
  plant: { weak: ["fire"], resist: ["frost", "phys"] },
};

/** Effectiveness of a damage type against a kin: 1.5 weak, 0.6 resist, else 1. */
export function typeMultVs(type: DamageType, family: MonsterFamily): number {
  const fc = FAMILY_COMBAT[family];
  if (fc.weak.includes(type)) return 1.5;
  if (fc.resist.includes(type)) return 0.6;
  return 1;
}

/** The four engravable weapon runes, each forcing a damage type on the wielder. */
export type RuneType = Exclude<DamageType, "phys">;
export const RUNE_TYPES: RuneType[] = ["fire", "frost", "shadow", "holy"];
export const RUNE_ITEM: Record<RuneType, ItemId> = {
  fire: "rune_fire",
  frost: "rune_frost",
  shadow: "rune_shadow",
  holy: "rune_holy",
};

/** The rune type an item id represents, or null if it isn't a rune. */
export function runeItemType(item: ItemId): RuneType | null {
  const hit = (Object.entries(RUNE_ITEM) as [RuneType, ItemId][]).find(([, id]) => id === item);
  return hit ? hit[0] : null;
}

/** Can this champion take a weapon rune, and is the given one in the vault? */
export function canSocketRune(state: GameState, memberId: string, type: RuneType) {
  const m = state.members.find((x) => x.id === memberId);
  if (!m) return { ok: false, why: "No such champion" };
  if (!m.gear.some((g) => slotOf(g) === "weapon"))
    return { ok: false, why: "Needs a weapon to engrave" };
  if ((state.inventory[RUNE_ITEM[type]] ?? 0) < 1)
    return { ok: false, why: "No such rune in the vault" };
  return { ok: true, why: "" };
}

/** The damage type a champion deals — a weapon rune overrides all; casters vary by their people. */
export function memberDamageType(m: Member): DamageType {
  if (m.weaponRune) return m.weaponRune;
  const cls = CLASS_BY_ID[m.classId]!;
  if (cls.role === "mender" || cls.role === "chanter") return "holy";
  if (cls.role === "arcanist") {
    switch (cls.race) {
      case "grakhar":
        return "fire";
      case "nocturi":
      case "kaemari":
        return "shadow";
      case "sylvani":
      case "durgan":
        return "frost";
      default:
        return "fire";
    }
  }
  return "phys";
}

/** Elite twists that turn a boss slot into a puzzle rather than a bigger bar. */
export type EliteAffix = "armored" | "frenzied" | "warded";

export const AFFIX_LABEL: Record<EliteAffix, string> = {
  armored: "Armored",
  frenzied: "Frenzied",
  warded: "Warded",
};

export const AFFIX_BLURB: Record<EliteAffix, string> = {
  armored: "Thick plate — soaks a quarter of every blow, and carries more health.",
  frenzied: "Grows deadlier every round it lives. End it fast.",
  warded: "A ward halves all damage until a critical strike shatters it.",
};

/** The damage types a party brings to bear, for pre-fight planning. */
export function partyDamageTypes(members: Member[]): DamageType[] {
  const seen = new Set<DamageType>();
  for (const m of members) if (m.hp > 0) seen.add(memberDamageType(m));
  return [...seen];
}

/** The kin that hunt a zone and their shared weaknesses/resistances, for hints. */
export function zoneThreatProfile(zoneId: string): {
  families: MonsterFamily[];
  weak: DamageType[];
  resist: DamageType[];
} {
  const fams = [...new Set(zoneMonsters(zoneId).map((m) => m.family))];
  const weakCount: Partial<Record<DamageType, number>> = {};
  const resistCount: Partial<Record<DamageType, number>> = {};
  for (const f of fams) {
    for (const t of FAMILY_COMBAT[f].weak) weakCount[t] = (weakCount[t] ?? 0) + 1;
    for (const t of FAMILY_COMBAT[f].resist) resistCount[t] = (resistCount[t] ?? 0) + 1;
  }
  const half = Math.max(1, Math.ceil(fams.length / 2));
  const weak = (Object.keys(weakCount) as DamageType[]).filter((t) => (weakCount[t] ?? 0) >= half);
  const resist = (Object.keys(resistCount) as DamageType[]).filter(
    (t) => (resistCount[t] ?? 0) >= half,
  );
  return { families: fams, weak, resist };
}

export function resolveRun(state: GameState, party: Party, zoneId: string): RunResult {
  const zone = ZONES.find((z) => z.id === zoneId)!;
  const surging = isSurging(zone.id);
  const cond = zoneCondition(zone.id, Date.now(), longNightActive(state));
  const condOut =
    cond.id === "calm" ? undefined : { id: cond.id, name: cond.name, glyph: cond.glyph };
  const ms = partyMembers(state, party);
  const power = partyPower(state, party);
  const syn = synergyBonus(ms);

  const fighters = ms
    .filter((m) => m.hp > 0)
    .map((m) => ({
      m,
      hp: m.hp,
      maxHp: maxHp(m),
      mp: m.mp,
      maxMp: maxMp(m),
      atkBuff: 0,
      defBuff: 0,
      cd: {} as Record<string, number>,
    }));

  const skillUses: Record<string, Record<string, number>> = {};
  const bump = (mid: string, sid: string) => {
    skillUses[mid] = skillUses[mid] ?? {};
    skillUses[mid]![sid] = (skillUses[mid]![sid] ?? 0) + 1;
  };

  // shots are drawn straight from the warehouse, one per attack
  const shotStock: Record<string, number> = { ...state.inventory };
  const shotsUsed: Record<string, number> = {};
  const shotsOn = state.shotsEnabled !== false;
  const fireShot = (m: Member) => {
    if (!shotsOn || m.shotsOn === false) return 0;
    const pick = pickShot(m, shotStock);
    if (!pick) return 0;
    shotStock[pick.item] = (shotStock[pick.item] ?? 0) - 1;
    shotsUsed[pick.item] = (shotsUsed[pick.item] ?? 0) + 1;
    return pick.boost;
  };

  const mpCost = (mp: number) => Math.max(1, Math.round(mp * (1 - syn.upkeep / 100)));

  /* scrolls — the banner's own vellum, readable by anyone standing */
  const scrollStock: Record<string, number> = { ...state.inventory };
  const scrollsUsed: Record<string, number> = {};
  const scrollNotes: string[] = [];
  const scrollAttempts: ScrollAttempt[] = [];
  const scrollsOn = state.scrollsEnabled !== false;
  let scrollCd = 0;

  type Fighter = (typeof fighters)[number];

  const bestScroll = (kind: ScrollKind): ScrollDef | null => {
    let best: ScrollDef | null = null;
    for (const def of SCROLLS) {
      if (def.kind !== kind) continue;
      if ((scrollStock[def.id] ?? 0) <= 0) continue;
      if (!best || def.power > best.power) best = def;
    }
    return best;
  };

  /** One member unrolls a scroll. WIT decides if it holds, MEN how it bites back. */
  const readScroll = (def: ScrollDef, reader: Fighter, alive: Fighter[]) => {
    const stockBefore = scrollStock[def.id] ?? 0;
    scrollStock[def.id] = stockBefore - 1;
    scrollsUsed[def.id] = (scrollsUsed[def.id] ?? 0) + 1;
    const st = memberStats(reader.m);
    const hpBefore = reader.hp;
    const mpBefore = reader.mp;
    const detail = rollOutcomeDetail(readOdds(def, st.wit, st.men), st.wit, st.men);
    const outcome: ImprintOutcome = detail.outcome;
    let note = "";

    if (outcome === "fizzle") {
      note = `${reader.m.name} read ${def.name} — the ink guttered out.`;
    } else if (outcome === "backfire") {
      reader.hp = Math.max(0, reader.hp - reader.maxHp * BACKFIRE_HP);
      reader.mp = Math.max(0, reader.mp - reader.maxMp * BACKFIRE_MP);
      note = `${def.name} turned on ${reader.m.name} — the weave broke inward.`;
    } else {
      const mult = outcome === "improved" ? IMPROVED_POWER : 1;
      if (def.kind === "attack") {
        dealDamage(
          reader,
          memberPower(reader.m) * def.power * mult,
          memberDamageType(reader.m),
          def.name,
        );
      } else {
        for (const a of alive) {
          a.atkBuff = Math.min(1.6, a.atkBuff + def.power * mult);
          a.defBuff = Math.min(0.7, a.defBuff + def.power * mult * 0.7);
        }
      }
      note =
        outcome === "improved"
          ? `${reader.m.name} read ${def.name} perfectly — the spell surged.`
          : `${reader.m.name} read ${def.name}.`;
    }

    scrollNotes.push(note);
    scrollAttempts.push({
      id: attemptId(),
      at: Date.now(),
      memberId: reader.m.id,
      memberName: reader.m.name,
      scrollId: def.id,
      scrollName: def.name,
      phase: "read",
      detail,
      cost: { gold: 0, mp: 0, inputs: [{ item: def.id, qty: 1 }] },
      hpBefore: Math.round(hpBefore),
      hpAfter: Math.round(reader.hp),
      maxHp: Math.round(reader.maxHp),
      mpBefore: Math.round(mpBefore),
      mpAfter: Math.round(reader.mp),
      maxMp: Math.round(reader.maxMp),
      stockBefore,
      stockAfter: stockBefore - 1,
      note,
    });
  };

  /* the ledger of violence — who hit what, and how hard */
  const damageBy: Record<string, number> = {};
  let bigHit: { name: string; skill: string; damage: number; crit: boolean } | null = null;
  let critCount = 0;

  /* ---- the encounter: a real pack, each with its own health ---- */
  const stance: Stance = party.stance ?? "steady";
  const sMod = STANCE_MOD[stance];

  const roster = zoneMonsters(zone.id);
  const commons = roster.filter((m) => !m.elite);
  const elites = roster.filter((m) => m.elite);
  const eliteChance = zone.kind === "dungeon" ? ELITE.chanceDungeon : ELITE.chanceField;
  const pickWeighted = (pool: Monster[]) => {
    if (!pool.length) return undefined;
    const total = pool.reduce((s, m) => s + m.weight, 0);
    let r = Math.random() * total;
    for (const m of pool) {
      r -= m.weight;
      if (r <= 0) return m;
    }
    return pool[pool.length - 1];
  };

  const packSize = Math.min(6, Math.max(3, Math.round(zone.rounds / 3)));
  const hasElite = elites.length > 0 && Math.random() < eliteChance;
  const totalHp = zone.threat * 12 * (hasElite ? ELITE.threatMult : 1);
  const AFFIXES: EliteAffix[] = ["armored", "frenzied", "warded"];

  type Foe = {
    mon: Monster;
    hp: number;
    maxHp: number;
    affix?: EliteAffix | undefined;
    wardUp: boolean;
    frenzy: number;
  };
  const foes: Foe[] = [];
  const shareSum = hasElite ? packSize - 1 + 2.2 : packSize; // commons weight 1, elite 2.2
  for (let i = 0; i < packSize; i++) {
    const eliteSlot = hasElite && i === 0;
    const mon = eliteSlot
      ? (pickWeighted(elites) ?? pickWeighted(commons))
      : (pickWeighted(commons) ?? pickWeighted(elites));
    if (!mon) continue;
    let hp = (totalHp / Math.max(1, shareSum)) * (eliteSlot ? 2.2 : 1);
    let affix: EliteAffix | undefined;
    if (eliteSlot) {
      affix = AFFIXES[Math.floor(Math.random() * AFFIXES.length)];
      if (affix === "armored") hp *= 1.4;
    }
    foes.push({ mon, hp, maxHp: hp, affix, wardUp: affix === "warded", frenzy: 0 });
  }
  const met: Monster[] = [];
  for (const foe of foes) if (!met.some((m) => m.id === foe.mon.id)) met.push(foe.mon);
  const eliteMet = foes.some((f) => f.affix || f.mon.elite);
  const humanoidMet = foes.some((f) => f.mon.family === "humanoid");
  const affixMet = foes.find((f) => f.affix)?.affix;

  let enemyDebuff = 0;
  let findBonus = 0;
  let kills = 0;

  const aliveFoes = () => foes.filter((f) => f.hp > 0);
  const enemyPctNow = () => aliveFoes().reduce((s, f) => s + f.hp, 0) / Math.max(1, totalHp);
  const pickTarget = (): Foe | undefined => {
    const a = aliveFoes();
    if (!a.length) return undefined;
    if (stance === "aggressive") return a.reduce((x, y) => (x.hp <= y.hp ? x : y)); // finish the weak
    if (stance === "defensive") {
      const threat = a.find((f) => f.affix || f.mon.elite);
      return threat ?? a.reduce((x, y) => (x.hp >= y.hp ? x : y)); // break the biggest first
    }
    return a[0]; // steady: front to back
  };

  /** Book a champion's blow (crit + MVP), then bite the pack by type, spilling over. */
  function dealDamage(f: Fighter, amount: number, type: DamageType, skill: string) {
    const st = memberStats(f.m);
    const critChance = Math.min(0.42, 0.06 + st.dex * 0.004 + st.wit * 0.002);
    const crit = Math.random() < critChance;
    let dealt = crit ? amount * (1.9 + Math.random() * 0.5) : amount;
    if (crit) critCount += 1;
    damageBy[f.m.id] = (damageBy[f.m.id] ?? 0) + dealt;
    if (!bigHit || dealt > bigHit.damage) {
      bigHit = { name: f.m.name, skill, damage: Math.round(dealt), crit };
    }
    let guard = 0;
    while (dealt > 0 && guard++ < packSize + 2) {
      const t = pickTarget();
      if (!t) break;
      let mult = typeMultVs(type, t.mon.family);
      if (t.affix === "armored") mult *= 0.75;
      if (t.wardUp) {
        mult *= 0.5;
        if (crit) t.wardUp = false; // a critical shatters the ward
      }
      const applied = dealt * mult;
      if (applied >= t.hp) {
        dealt -= t.hp / mult; // spend the raw damage that finished it
        t.hp = 0;
        kills += t.affix || t.mon.elite ? 1 : rnd(4, 9); // a common slot is a knot of foes
      } else {
        t.hp -= applied;
        dealt = 0;
      }
    }
  }

  for (let round = 0; round < zone.rounds && aliveFoes().length > 0; round++) {
    const alive = fighters.filter((f) => f.hp > 0);
    if (alive.length === 0) break;
    const lowestAllyPct = Math.min(...alive.map((f) => f.hp / f.maxHp));

    // vellum first: the steadiest head in the banner unrolls what it carries
    if (scrollsOn) {
      const reader = alive.reduce((a, b) => (memberStats(a.m).wit >= memberStats(b.m).wit ? a : b));
      if (round === 0) {
        const buff = bestScroll("buff");
        if (buff) readScroll(buff, reader, alive);
      }
      if (scrollCd <= 0) {
        const atk = bestScroll("attack");
        if (atk && aliveFoes().length > 0) {
          readScroll(atk, reader, alive);
          scrollCd = SCROLL_COOLDOWN;
        }
      } else {
        scrollCd -= 1;
      }
    }

    for (const f of alive) {
      for (const k of Object.keys(f.cd)) f.cd[k] = Math.max(0, (f.cd[k] ?? 0) - 1);

      const ctx = {
        round,
        selfPct: f.hp / f.maxHp,
        lowestAllyPct,
        enemyPct: enemyPctNow(),
        mpPct: f.mp / f.maxMp,
      };

      const tactic = knownSkills(f.m).find(({ state: s, def }) => {
        if ((f.cd[def.id] ?? 0) > 0) return false;
        if (f.mp < mpCost(def.mp)) return false;
        return conditionMet(s.condition, ctx);
      });

      const base = memberPower(f.m) * (1 + f.atkBuff) * (1 + enemyDebuff) * sMod.dmg;
      const dtype = memberDamageType(f.m);

      if (!tactic) {
        // plain weapon swing, no MP
        dealDamage(f, base * 0.55 * (1 + fireShot(f.m)), dtype, "a plain swing");
        continue;
      }

      const { state: s, def } = tactic;
      f.mp -= mpCost(def.mp);
      f.cd[def.id] = def.cooldown;
      bump(f.m.id, def.id);
      const pot = skillPotency(s);

      if (def.kind === "attack") {
        dealDamage(f, base * pot * (1 + fireShot(f.m)), dtype, def.name);
      } else if (def.kind === "heal") {
        const target = alive.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b));
        target.hp = Math.min(target.maxHp, target.hp + base * pot * 0.6);
      } else if (def.kind === "buff") {
        if (CLASS_BY_ID[f.m.classId]!.role === "artisan") findBonus += pot * 10;
        for (const a of alive) {
          a.atkBuff = Math.min(1.2, a.atkBuff + pot * 0.5);
          a.defBuff = Math.min(0.6, a.defBuff + pot * 0.4);
        }
      } else {
        enemyDebuff = Math.min(0.8, enemyDebuff + pot);
      }
    }

    // the pack strikes back — the fewer foes left, the fewer blows land (focus fire pays)
    const standingFoes = aliveFoes();
    for (const foe of standingFoes) if (foe.affix === "frenzied") foe.frenzy += 0.12;
    const frenzy = standingFoes.reduce((s, f) => s + (f.affix === "frenzied" ? f.frenzy : 0), 0);
    const incoming =
      zone.enemyHit *
      cond.enemyHit *
      (1 + round * 0.05) *
      sMod.incoming *
      (standingFoes.length / packSize) *
      (1 + frenzy);
    const targets = fighters.filter((f) => f.hp > 0);
    for (const f of targets) {
      const role = CLASS_BY_ID[f.m.classId]!.role;
      const share = role === "guardian" ? 1.6 : 1;
      const taken =
        ((incoming * share) / Math.max(1, targets.length)) *
        (1 - f.defBuff) *
        (1 - mitigation(f.m)) *
        (1 - syn.mitigation / 100);
      f.hp = Math.max(0, f.hp - taken);
    }
  }

  const survivors = fighters.filter((f) => f.hp > 0).length;
  const success = aliveFoes().length === 0 && survivors > 0;

  /* split the body count across what was actually met — elites come one at a time */
  const encounters: Encounter[] = [];
  if (met.length) {
    const counted = success ? kills : Math.round(kills * 0.5);
    const eliteKills = met.filter((m) => m.elite).length;
    const commonSlots = met.filter((m) => !m.elite);
    let left = Math.max(0, counted - eliteKills);
    met.forEach((m) => {
      if (m.elite) {
        encounters.push({ monsterId: m.id, kills: success ? 1 : 0, elite: true });
        return;
      }
      const isLast = commonSlots[commonSlots.length - 1]?.id === m.id;
      const n = isLast ? left : Math.round(left / Math.max(1, commonSlots.length));
      left = Math.max(0, left - n);
      encounters.push({ monsterId: m.id, kills: n, elite: false });
    });
  }

  const vitals: Record<string, { hp: number; mp: number }> = {};
  for (const f of fighters) {
    vitals[f.m.id] = { hp: Math.max(0, Math.round(f.hp)), mp: Math.max(0, Math.round(f.mp)) };
  }
  const participants = fighters.map((f) => f.m.id);
  // Identify the fallen by id, not name — two champions can share a rolled name,
  // and death/marks/affinity must attribute to the right person.
  const fallen = fighters.filter((f) => f.hp <= 0).map((f) => f.m.id);
  const fallenNames = fighters.filter((f) => f.hp <= 0).map((f) => f.m.name);

  // contested ground — rival clans hunt the same zones
  const record: Record<string, { mobKills: number; pvpKills: number; pkKills: number }> = {};
  const standing = fighters.filter((f) => f.hp > 0);
  const share = Math.max(1, standing.length);
  for (const f of fighters) {
    record[f.m.id] = { mobKills: 0, pvpKills: 0, pkKills: 0 };
  }
  for (const f of standing) {
    record[f.m.id]!.mobKills = Math.round(kills / share);
  }
  if (standing.length && Math.random() < 0.28) {
    const w = standing[Math.floor(Math.random() * standing.length)]!;
    record[w.m.id]!.pvpKills += rnd(1, 3);
    if (Math.random() < 0.18) record[w.m.id]!.pkKills += 1;
  }

  const find = ms.reduce((s, m) => s + memberFind(m), 0) + findBonus + syn.find;
  const fallenNote = fallen.length
    ? ` ${fallenNames.join(", ")} fell and will be carried home.`
    : "";

  /* the story of the fight, told in beats */
  const mvpEntry = Object.entries(damageBy).sort((a, b) => b[1] - a[1])[0];
  const mvp = mvpEntry
    ? {
        memberId: mvpEntry[0],
        name: fighters.find((f) => f.m.id === mvpEntry[0])?.m.name ?? "Unknown",
        damage: Math.round(mvpEntry[1]),
      }
    : undefined;

  const highlights: { text: string; kind: "crit" | "clutch" | "flawless" | "rout" | "rare" }[] = [];
  const untouched = fighters.filter((f) => f.hp >= f.maxHp * 0.95).length;
  if (bigHit && (bigHit as { crit: boolean }).crit) {
    const b = bigHit as { name: string; skill: string; damage: number };
    highlights.push({
      text: `${b.name} landed a critical ${b.skill} for ${b.damage.toLocaleString()} damage.`,
      kind: "crit",
    });
  }
  if (success && survivors === 1 && fighters.length > 1) {
    highlights.push({
      text: `${fighters.find((f) => f.hp > 0)!.m.name} finished the fight alone, last one standing.`,
      kind: "clutch",
    });
  }
  if (success && fallen.length === 0 && untouched === fighters.length && fighters.length > 1) {
    highlights.push({ text: `Not a scratch on the banner — a flawless sweep.`, kind: "flawless" });
  }
  if (success && critCount >= 5) {
    highlights.push({
      text: `${critCount} critical strikes tore through ${zone.name}.`,
      kind: "rout",
    });
  }

  const rating: "S" | "A" | "B" | "C" = !success
    ? "C"
    : fallen.length === 0 && untouched >= Math.ceil(fighters.length / 2)
      ? "S"
      : fallen.length === 0
        ? "A"
        : survivors > 1
          ? "B"
          : "C";

  if (!success) {
    const gold = Math.round(rnd(zone.gold[0], zone.gold[1]) * 0.18);
    return {
      deeds: earnedDeeds(ms, {
        success: false,
        zoneKind: zone.kind,
        standing: survivors,
        partySize: ms.length,
        lootKinds: 0,
        kills: Math.round(kills * 0.5),
      }),
      success: false,
      gold,
      rep: 0,
      xp: Math.round(zone.xp * 0.25),
      kills: Math.round(kills * 0.5),
      loot: [],
      shotsUsed,
      scrollsUsed,
      scrollNotes,
      scrollAttempts,
      skillUses,
      vitals,
      participants,
      fallen,
      record,
      mvp,
      bigHit: bigHit ?? undefined,
      highlights,
      rating,
      encounters,
      condition: condOut,
      text: `${party.name} was driven out of ${zone.name}, salvaging ${gold} gold.${condOut ? ` The field lay under ${condOut.name}.` : ""}${fallenNote}`,
    };
  }

  const ratio = power / zone.threat;
  const scale = Math.min(1.6, 0.7 + ratio * 0.4);
  const gold = Math.round(
    rnd(zone.gold[0], zone.gold[1]) *
      scale *
      (1 + syn.gold / 100) *
      cond.gold *
      (eliteMet ? ELITE.goldMult : 1),
  );
  const loot: { item: ItemId; qty: number }[] = [];
  const eliteBonus = eliteMet ? ELITE.dropBonus : 0;
  for (const d of zone.drops) {
    const chance = Math.min(0.97, d.chance * cond.drop + find * 0.01 + eliteBonus);
    if (Math.random() < chance) {
      loot.push({ item: d.item, qty: rnd(d.qty[0], d.qty[1]) + Math.floor(find / 14) });
    }
  }

  // gear only ever comes off tool-using kin — beasts and bones carry nothing to wear
  if (humanoidMet) {
    const pool = humanoidGearPool(zone.reqLevel);
    const gearChance = Math.min(0.6, pool.chance + find * 0.004 + (eliteMet ? 0.05 : 0));
    if (Math.random() < gearChance) {
      const drop = pool.items[Math.floor(Math.random() * pool.items.length)]!;
      loot.push({ item: drop, qty: 1 });
      const taken = met.find((m) => m.family === "humanoid");
      highlights.push({
        text: `${ITEM_BY_ID[drop]?.name ?? drop} was stripped off ${taken?.name ?? "a fallen humanoid"}.`,
        kind: "rare",
      });
    }
  }

  if (eliteMet) {
    const el = foes.find((f) => f.affix || f.mon.elite)?.mon;
    if (el) {
      const tag = affixMet ? ` (${AFFIX_LABEL[affixMet]})` : "";
      highlights.push({ text: `${el.name}${tag} was brought down — an elite kill.`, kind: "rout" });
    }
  }

  // soul / spirit essence — split by what the zone's inhabitants are made of
  const band = ZONE_ESSENCE[zone.id];
  if (band) {
    const total = Math.round(rnd(band[0], band[1]) * cond.essence);
    const soulShare = SOUL_SPLIT[ZONE_ARCHETYPE[zone.id] ?? "mixed"];
    const souls = Math.round(total * soulShare);
    const spirits = total - souls;
    if (souls > 0) loot.push({ item: emberId("soul"), qty: souls });
    if (spirits > 0) loot.push({ item: emberId("spirit"), qty: spirits });
  }

  for (const l of loot) {
    const r = spoilRarity(l.item);
    if (r === "rare" || r === "epic") {
      highlights.push({
        text: `${ITEM_BY_ID[l.item]?.name ?? l.item} x${l.qty} dropped — ${r === "epic" ? "a find of legend" : "a rare find"}.`,
        kind: "rare",
      });
    }
  }

  return {
    deeds: earnedDeeds(ms, {
      success: true,
      zoneKind: zone.kind,
      standing: survivors,
      partySize: ms.length,
      lootKinds: loot.length,
      kills,
    }),
    success: true,
    gold,
    rep: Math.round(zone.rep * (1 + (surging ? SURGE_REP_PCT / 100 : 0))),
    xp: Math.round(
      zone.xp *
        (1 + syn.xp / 100) *
        (1 + (surging ? SURGE_XP_PCT / 100 : 0)) *
        cond.xp *
        (eliteMet ? ELITE.xpMult : 1),
    ),
    kills,
    loot,
    shotsUsed,
    scrollsUsed,
    scrollNotes,
    scrollAttempts,
    skillUses,
    vitals,
    participants,
    fallen,
    record,
    mvp,
    bigHit: bigHit ?? undefined,
    highlights,
    rating,
    encounters,
    condition: condOut,

    text: `${party.name} cleared ${zone.name}: +${gold} gold, +${Math.round(zone.rep * (1 + (surging ? SURGE_REP_PCT / 100 : 0)))} reputation, ${kills} slain.${surging ? " High activity bonus applied." : ""}${condOut ? ` The field lay under ${condOut.name}.` : ""}${fallenNote}`,
  };
}

/* --------------------------------- Crafting -------------------------------- */

export function recipeById(_state: GameState, id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}

/** Guild-trained backgrounds raise the odds at the forge, up to a ceiling. */
export function guildCraftBonus(state: GameState) {
  return Math.min(
    12,
    perkSum(
      state.members.map((m) => m.profession),
      "craft",
    ),
  );
}

export function craftChance(state: GameState, recipeId: string) {
  const r = recipeById(state, recipeId)!;
  // only artisans who chose this discipline count towards the recipe
  const specialists = artisanRank(state, r.mastery);
  const generalists = Math.max(0, artisanRank(state) - specialists);
  const over = Math.max(0, specialists - r.artisans);
  const chance =
    r.chance * (specialists >= r.artisans ? 1 : 0.5) +
    over * 0.05 +
    generalists * 0.01 +
    craftPassiveBonus(state) / 100 +
    guildCraftBonus(state) / 100;
  return Math.min(0.95, Math.max(0.05, chance));
}

/**
 * Chance that a forged piece climbs one more quality step. Mastery is what
 * pushes it: specialists beyond the recipe requirement, plus clan craft
 * passives. Twenty steps in a row is meant to be near-mythical.
 */
export function qualityStepChance(state: GameState, recipeId: string) {
  const r = recipeById(state, recipeId)!;
  const def = ITEM_BY_ID[r.result];
  if (!canRollQuality(def)) return 0;
  const specialists = artisanRank(state, r.mastery);
  const over = Math.max(0, specialists - r.artisans);
  const chance = 0.16 + over * 0.035 + craftPassiveBonus(state) / 400;
  return Math.min(0.6, chance);
}

/** Expected quality of a craft at the given per-step chance. */
export function expectedQuality(step: number) {
  if (step <= 0) return 0;
  let e = 0;
  for (let q = 1; q <= MAX_QUALITY; q++) e += Math.pow(step, q);
  return e;
}

export function rollQuality(step: number) {
  if (step <= 0) return 0;
  let q = 0;
  while (q < MAX_QUALITY && Math.random() < step) q++;
  return q;
}

export function canCraft(state: GameState, recipeId: string) {
  const r = recipeById(state, recipeId)!;
  if (state.gold < forgeFee(state, r.gold)) return { ok: false, why: "Not enough gold" };
  if (artisanRank(state, r.mastery) < r.artisans)
    return { ok: false, why: `Needs ${r.mastery} artisans of rank ${r.artisans}` };
  for (const i of r.inputs) {
    if ((state.inventory[i.item] ?? 0) < i.qty) return { ok: false, why: "Missing materials" };
  }
  return { ok: true, why: "" };
}

/* ------------------------------- Sharpening -------------------------------- */
/**
 * Post-craft enhancement. Takes a quality-graded piece and gambles to push its
 * edge one step higher, burning farmed essence and a forge fee each strike. Up to
 * a safe threshold a failed strike only bounces; past it the temper cracks and the
 * piece grinds back a step — unless a warding sigil (bought with the strike) holds
 * the edge. It reuses the #qN quality model, so a sharpened piece is simply a
 * higher-quality instance sitting in the vault, ready to equip.
 */
export const SHARPEN_SAFE = 3; // at or below this, a failure can't downgrade
export const SHARPEN_MAX = MAX_QUALITY; // shares the forged-quality ceiling (20)

/** Which essence a piece drinks when sharpened — cold work for robes and jewels. */
export function sharpenEmber(item: ItemId): ShotKind {
  const def = ITEM_BY_ID[item];
  return def?.slot === "jewelry" || def?.armorType === "robe" ? "spirit" : "soul";
}

/** Success chance of the next strike, given the piece's current quality. */
export function sharpenChance(q: number) {
  if (q < SHARPEN_SAFE) return 1; // the first steps are guaranteed
  const t = (q - SHARPEN_SAFE) / (SHARPEN_MAX - SHARPEN_SAFE);
  return Math.max(0.2, 0.9 - 0.7 * t); // 0.9 at the threshold, easing toward 0.2
}

/** Essence + gold a single strike burns to attempt q → q+1. */
export function sharpenCost(item: ItemId, q: number) {
  const def = ITEM_BY_ID[item];
  const base = def?.value ?? 40;
  return {
    ember: 3 + q * 2,
    gold: Math.round(base * 0.15 * (1 + q * 0.35)),
    kind: sharpenEmber(item),
  };
}

/** Extra gold to ward a strike so a failure won't grind the edge back. */
export function sharpenWardCost(item: ItemId, q: number) {
  return Math.round(sharpenCost(item, q).gold * 1.5);
}

export function canSharpen(state: GameState, item: ItemId, ward = false) {
  const def = ITEM_BY_ID[item];
  if (!def || !canRollQuality(def)) return { ok: false, why: "That piece cannot be sharpened" };
  if ((state.inventory[item] ?? 0) < 1) return { ok: false, why: "None in the vault" };
  const { quality } = splitItemId(item);
  if (quality >= SHARPEN_MAX) return { ok: false, why: "Already at the finest edge" };
  const c = sharpenCost(item, quality);
  const gold = c.gold + (ward ? sharpenWardCost(item, quality) : 0);
  if (state.gold < gold) return { ok: false, why: "Not enough gold" };
  if ((state.inventory[emberId(c.kind)] ?? 0) < c.ember)
    return { ok: false, why: `Needs ${c.ember} ${c.kind} essence` };
  return { ok: true, why: "" };
}

/* ------------------------------ System Forge ------------------------------- */
/**
 * The System Forge is the town's public smithy. Anyone may use it — no artisan
 * of your own is needed — but the guild takes a heavier fee and the smiths work
 * to pattern: a success is ALWAYS a standard piece, quality 0, never better.
 * Artisan crafting stays the only road to quality-graded work.
 */

/** Guild surcharge over the artisan fee for using the public forge. */
export const SYSTEM_FORGE_FEE_MULT = 1.4;

export function systemForgeFee(state: GameState, recipeId: string) {
  const r = recipeById(state, recipeId);
  if (!r) return 0;
  return Math.round(forgeFee(state, r.gold) * SYSTEM_FORGE_FEE_MULT);
}

/**
 * A fixed, published rate per recipe — the whole point of the system forge is
 * that it is predictable. Nothing your clan does moves this number.
 */
export function systemForgeChance(state: GameState, recipeId: string) {
  const r = recipeById(state, recipeId);
  if (!r) return 0;
  return Math.min(0.95, Math.max(0.2, Math.round(r.chance * 100) / 100));
}

export function canSystemForge(state: GameState, recipeId: string) {
  const r = recipeById(state, recipeId);
  if (!r) return { ok: false, why: "No such recipe" };
  if (state.gold < systemForgeFee(state, recipeId)) return { ok: false, why: "Not enough gold" };
  for (const i of r.inputs) {
    if ((state.inventory[i.item] ?? 0) < i.qty) return { ok: false, why: "Missing materials" };
  }
  return { ok: true, why: "" };
}

/* -------------------------------- Scriptorium ------------------------------- */

/** Who can sit at the writing desk — anyone standing, out of the field. */
export function scribes(state: GameState): Member[] {
  return state.members
    .filter((m) => m.partyId === null || !state.parties.find((p) => p.id === m.partyId)?.run)
    .sort((a, b) => memberStats(b).wit - memberStats(a).wit);
}

/** The odds this particular champion has of binding this particular spell. */
export function scribeOdds(m: Member, def: ScrollDef) {
  const st = memberStats(m);
  return imprintOdds(def, st.wit, st.men);
}

export function canImprint(state: GameState, memberId: string, scrollId: string) {
  const def = SCROLL_BY_ID[scrollId];
  const m = state.members.find((x) => x.id === memberId);
  if (!def || !m) return { ok: false, why: "No such spell" };
  const party = m.partyId ? state.parties.find((p) => p.id === m.partyId) : null;
  if (party?.run) return { ok: false, why: `${m.name} is in the field` };
  if (m.level < def.reqLevel) return { ok: false, why: `Needs level ${def.reqLevel}` };
  if (m.mp < def.mp) return { ok: false, why: "Not enough MP to bind the weave" };
  if (m.hp <= 1) return { ok: false, why: `${m.name} is in no state to write` };
  if (state.gold < def.gold) return { ok: false, why: "Not enough gold for vellum and ink" };
  for (const i of def.inputs) {
    if ((state.inventory[i.item] ?? 0) < i.qty) return { ok: false, why: "Missing materials" };
  }
  return { ok: true, why: "" };
}

export { SCROLLS, SCROLL_BY_ID, type ScrollDef, type ScrollKind };

export function scoreClan(state: GameState) {
  const full = state.parties.filter((p) => p.memberIds.length === MAX_PARTY_SIZE).length;
  return { fullParties: full, totalParties: state.parties.length, members: state.members.length };
}

export { uid, rnd, clamp, MAX_LEVEL, MAX_SKILL_LEVEL };

/* ------------------------- Muster hall: free companies ---------------------- */

/**
 * Other party leaders roaming the realm. They either petition to join your
 * banner (they came to you) or can be courted with a signing purse (you go to
 * them). Either way the clan leader sees every blade: class, level and power.
 */
export interface FreeCompany {
  id: string;
  name: string;
  leaderName: string;
  pitch: string;
  /** "petition" = they asked you; "prospect" = scouted, must be invited */
  kind: "petition" | "prospect";
  members: Member[];
  /** signing purse in gold */
  ask: number;
  /** reputation they expect the clan to already have */
  repAsk: number;
  createdAt: number;
  expiresAt: number;
}

const COMPANY_NAMES = [
  "Hollow Lantern",
  "Broken Oar",
  "Salt & Ash",
  "Grey Pilgrims",
  "Thornwake",
  "Last Coin",
  "Iron Vigil",
  "Nine Crows",
  "Emberless",
  "Quiet Hounds",
  "Rain of Larks",
  "Sundered Vow",
];

const COMPANY_PITCHES = [
  "We have hunted well enough to eat, and badly enough to want a wall behind us.",
  "Our old clan broke at the dungeon mouth. We would rather not break twice.",
  "Five blades, no banner. Give us a crest and we will earn it.",
  "We hear your name in the taverns. We would like it on our shields.",
  "Coin is fine. A grave that someone visits is finer.",
  "We are tired of paying rivals for ground we cleared ourselves.",
];

export function companyPower(c: FreeCompany) {
  return c.members.reduce((s, m) => s + memberPower(m), 0);
}

export function makeFreeCompany(clanLevel: number, kind: FreeCompany["kind"]): FreeCompany {
  const size = rnd(2, MAX_PARTY_SIZE);
  const base = Math.max(1, clanLevel);
  const members = Array.from({ length: size }, () => makeRecruit(base + rnd(0, 3)));
  const leader = members[0]!;
  const ask = Math.round(
    members.reduce((s, m) => s + recruitCost(m), 0) * (kind === "prospect" ? 0.85 : 0.45),
  );
  const now = Date.now();
  return {
    id: uid(),
    name: `The ${pick(COMPANY_NAMES)}`,
    leaderName: leader.name,
    pitch: pick(COMPANY_PITCHES),
    kind,
    members,
    ask,
    repAsk: kind === "prospect" ? rnd(0, 40) + clanLevel * 8 : rnd(0, 15),
    createdAt: now,
    expiresAt: now + (kind === "petition" ? 30 : 45) * 60_000,
  };
}

export function rollProspects(clanLevel: number, n = 3): FreeCompany[] {
  return Array.from({ length: n }, () => makeFreeCompany(clanLevel, "prospect"));
}

export function prospectCost(clanLevel: number) {
  return 200 * Math.max(1, clanLevel);
}

/** Petitions trickle in on the realm tick — a clan with a name draws people. */
export function musterPulse(state: GameState) {
  const now = Date.now();
  state.companies = (state.companies ?? []).filter((c) => c.expiresAt > now);
  if (!hasClan(state) && !state.allegiance) return;

  const last = state.musterTickAt ?? 0;
  if (now - last < 60_000) return;
  state.musterTickAt = now;

  const petitions = state.companies.filter((c) => c.kind === "petition").length;
  if (petitions >= 4) return;
  const chance = Math.min(0.6, 0.08 + state.reputation / 2500 + state.clanLevel * 0.03);
  if (Math.random() > chance) return;

  const c = makeFreeCompany(Math.max(1, state.clanLevel), "petition");
  state.companies.push(c);
  pushLog(
    state,
    `${c.leaderName} of ${c.name} petitions to fight under your crest — ${c.members.length} blade(s).`,
    "info",
  );
}

export function canAcceptCompany(state: GameState, c: FreeCompany): { ok: boolean; why: string } {
  if (!hasClan(state) && !state.allegiance)
    return { ok: false, why: "Found a clan (or swear an oath) before taking others in." };
  const cap = clanCapacity(state.clanLevel, keepLevel(state, "barracks"), !!state.allegiance);
  if (state.members.length + c.members.length > cap)
    return { ok: false, why: `Not enough room — ${cap - state.members.length} place(s) left` };
  if (state.reputation < c.repAsk)
    return { ok: false, why: `They want a clan of ${c.repAsk} reputation` };
  if (state.gold < c.ask) return { ok: false, why: "Not enough gold for the signing purse" };
  return { ok: true, why: "" };
}
