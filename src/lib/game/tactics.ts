// Tactics — the BG3 pillar. A discrete, turn-based, player-commanded encounter:
// your champions and a foe pack take turns in initiative order, and on each of
// your champions' turns YOU choose the action — a Strike, a signature ability, or
// a Guard — and its target. Damage flows through the same numbers the rest of the
// game uses (memberPower, damage type vs the foe's family), so a well-forged,
// well-runed, well-levelled champion fights measurably better here too.
//
// This is a "proving": a sparring bout with real stakes in reward but not in
// blood — champions cannot die here, they are only knocked out of the bout — so
// it is a safe, repeatable tactical minigame that rewards good command.

import { CLASS_BY_ID, ROLE_LABEL, type Role } from "./data";
import { ZONES } from "./data";
import {
  memberPower,
  maxHp,
  maxMp,
  mitigation,
  memberStats,
  memberDamageType,
  typeMultVs,
  type Member,
  type DamageType,
} from "./engine";
import { zoneMonsters, type Monster, type MonsterFamily } from "./monsters";
import { traitMods, NO_MODS, type TraitMods } from "./traits";

/* -------------------------------- Abilities -------------------------------- */

export type AbilityShape =
  | "strike" // single foe, cheap basic
  | "heavy" // single foe, big + crit-hungry
  | "aoe" // all foes, reduced
  | "heal" // one ally
  | "heal_all" // whole party
  | "buff_atk" // party deals more for a few rounds
  | "buff_def" // party takes less for a few rounds
  | "debuff" // foes take more for a few rounds
  | "guard"; // self: brace, and recover a little focus

export interface TacAbility {
  id: string;
  name: string;
  shape: AbilityShape;
  mp: number;
  cooldown: number;
  potency: number;
  blurb: string;
}

/** what a shape targets — drives the UI's target picker */
export function abilityTarget(shape: AbilityShape): "foe" | "foes" | "ally" | "allies" | "self" {
  if (shape === "strike" || shape === "heavy") return "foe";
  if (shape === "aoe" || shape === "debuff") return "foes";
  if (shape === "heal") return "ally";
  if (shape === "heal_all" || shape === "buff_atk" || shape === "buff_def") return "allies";
  return "self";
}

const STRIKE: TacAbility = {
  id: "strike",
  name: "Strike",
  shape: "strike",
  mp: 0,
  cooldown: 0,
  potency: 0.9,
  blurb: "A measured blow. Costs no focus.",
};
const GUARD: TacAbility = {
  id: "guard",
  name: "Guard",
  shape: "guard",
  mp: 0,
  cooldown: 0,
  potency: 0,
  blurb: "Brace — halve the next blows against you, and recover focus.",
};

/** each role's two signature tactical abilities, on top of Strike + Guard */
const ROLE_SPECIALS: Record<Role, TacAbility[]> = {
  guardian: [
    {
      id: "bash",
      name: "Shield Bash",
      shape: "heavy",
      mp: 8,
      cooldown: 2,
      potency: 1.35,
      blurb: "A staggering, heavy blow.",
    },
    {
      id: "bulwark",
      name: "Bulwark",
      shape: "buff_def",
      mp: 14,
      cooldown: 3,
      potency: 0.3,
      blurb: "The party takes 30% less for 2 rounds.",
    },
  ],
  blade: [
    {
      id: "cleave",
      name: "Cleave",
      shape: "aoe",
      mp: 12,
      cooldown: 2,
      potency: 0.7,
      blurb: "Strike every foe at once.",
    },
    {
      id: "rush",
      name: "Reckless Rush",
      shape: "heavy",
      mp: 10,
      cooldown: 2,
      potency: 1.6,
      blurb: "A savage, committed strike.",
    },
  ],
  archer: [
    {
      id: "aimed",
      name: "Aimed Shot",
      shape: "heavy",
      mp: 10,
      cooldown: 2,
      potency: 1.5,
      blurb: "A precise, crit-hungry shot.",
    },
    {
      id: "volley",
      name: "Volley",
      shape: "aoe",
      mp: 14,
      cooldown: 3,
      potency: 0.65,
      blurb: "Rain arrows on every foe.",
    },
  ],
  arcanist: [
    {
      id: "bolt",
      name: "Arc Bolt",
      shape: "heavy",
      mp: 10,
      cooldown: 1,
      potency: 1.4,
      blurb: "A bolt of raw element.",
    },
    {
      id: "nova",
      name: "Nova",
      shape: "aoe",
      mp: 18,
      cooldown: 3,
      potency: 0.85,
      blurb: "Blast every foe with your element.",
    },
  ],
  mender: [
    {
      id: "mend",
      name: "Mend",
      shape: "heal",
      mp: 12,
      cooldown: 1,
      potency: 1.15,
      blurb: "Restore a wounded ally.",
    },
    {
      id: "sanctuary",
      name: "Sanctuary",
      shape: "heal_all",
      mp: 20,
      cooldown: 3,
      potency: 0.6,
      blurb: "Heal the whole party.",
    },
  ],
  chanter: [
    {
      id: "warchant",
      name: "War Chant",
      shape: "buff_atk",
      mp: 12,
      cooldown: 3,
      potency: 0.3,
      blurb: "The party deals 30% more for 2 rounds.",
    },
    {
      id: "hex",
      name: "Hex",
      shape: "debuff",
      mp: 10,
      cooldown: 3,
      potency: 0.3,
      blurb: "Foes take 30% more for 2 rounds.",
    },
  ],
  artisan: [
    {
      id: "firepot",
      name: "Firepot",
      shape: "aoe",
      mp: 12,
      cooldown: 2,
      potency: 0.7,
      blurb: "Hurl a bursting pot at all foes.",
    },
    {
      id: "snare",
      name: "Snare",
      shape: "debuff",
      mp: 10,
      cooldown: 3,
      potency: 0.28,
      blurb: "Foes take more damage for 2 rounds.",
    },
  ],
};

export function abilityKit(role: Role): TacAbility[] {
  return [STRIKE, ...(ROLE_SPECIALS[role] ?? []), GUARD];
}

/* ---------------------------------- Units ---------------------------------- */

/* ------------------------------- Conditions -------------------------------- */
/**
 * Elemental damage now leaves a mark the player can see and feel: each damage
 * type imposes its own condition, so which element you bring (weapon runes and
 * class) is a live tactical decision, not just a number. Foes' elements do the
 * same to YOU, so the field is dangerous in kind.
 */
export type CondKind = "burn" | "chill" | "doom" | "sunder";

export interface TacCond {
  kind: CondKind;
  rounds: number;
  /** magnitude — a flat DoT for burn, a fraction for the rest (stacks for sunder) */
  pot: number;
}

export const COND_META: Record<
  CondKind,
  { label: string; glyph: string; from: DamageType; blurb: string }
> = {
  burn: { label: "Burn", glyph: "🔥", from: "fire", blurb: "Searing damage each round." },
  chill: { label: "Chill", glyph: "❄", from: "frost", blurb: "Deals less; slowed." },
  doom: { label: "Doom", glyph: "🕸", from: "shadow", blurb: "Takes more damage." },
  sunder: { label: "Sunder", glyph: "🩸", from: "phys", blurb: "Armour broken — takes more." },
};

/** Which condition an element imposes (holy leaves no lingering mark — it sears). */
const TYPE_COND: Partial<Record<DamageType, CondKind>> = {
  fire: "burn",
  frost: "chill",
  shadow: "doom",
  phys: "sunder",
};

export interface TacUnit {
  id: string;
  side: "ally" | "foe";
  name: string;
  sub: string; // class/family label for the card
  role?: Role;
  family?: MonsterFamily;
  dmgType: DamageType;
  /** the line a unit stands in — front takes the blows, back is shielded */
  rank: "front" | "back";
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  power: number;
  mitigation: number; // 0..0.7 flat damage reduction
  init: number;
  down: boolean;
  guarding: boolean;
  cds: Record<string, number>;
  conds: TacCond[];
  /** the champion's trait passives (empty for foes and the untraited) */
  mods: TraitMods;
  kit: TacAbility[]; // allies only (empty for foes)
}

export interface TacTimed {
  pct: number;
  rounds: number;
}

export interface TacState {
  round: number;
  order: string[]; // unit ids in initiative order
  turnIdx: number;
  units: TacUnit[];
  log: string[];
  phase: "choose" | "won" | "lost";
  // party-wide, rounds-limited effects
  allyAtk: TacTimed;
  allyDef: TacTimed;
  foeVuln: TacTimed;
  /** the press of battle — fills as you land blows; at full, the next attack is
   * a free, empowered Onslaught */
  momentum: number;
  tierId: string;
}

export const MOMENTUM_MAX = 100;

/** Default formation for a role — the shield wall up front, the fragile behind. */
export function defaultRank(role: Role): "front" | "back" {
  return role === "guardian" || role === "blade" ? "front" : "back";
}

/* -------------------------------- Cond helpers ----------------------------- */

function condOf(u: TacUnit, kind: CondKind): TacCond | undefined {
  return u.conds.find((c) => c.kind === kind);
}
/** total extra damage a unit takes from its conditions (doom + sunder). */
function vulnFrom(u: TacUnit): number {
  return (condOf(u, "doom")?.pot ?? 0) + (condOf(u, "sunder")?.pot ?? 0);
}
/** how much a chilled unit's own blows are weakened. */
function chillCut(u: TacUnit): number {
  return condOf(u, "chill")?.pot ?? 0;
}

/** Lay an element's condition on a target (refreshing, or stacking sunder). The
 * striker's trait may deepen the mark (Elementalist) — boost scales potency,
 * roundsBonus extends it. */
function applyType(
  target: TacUnit,
  dmgType: DamageType,
  power: number,
  boost = 1,
  roundsBonus = 0,
): CondKind | null {
  const kind = TYPE_COND[dmgType];
  if (!kind) return null;
  const existing = condOf(target, kind);
  const r = (base: number) => base + roundsBonus;
  if (kind === "burn") {
    const pot = Math.max(1, Math.round(power * 0.22 * boost));
    if (existing) {
      existing.rounds = r(2);
      existing.pot = Math.max(existing.pot, pot);
    } else target.conds.push({ kind, rounds: r(2), pot });
  } else if (kind === "sunder") {
    if (existing) {
      existing.rounds = r(3);
      existing.pot = Math.min(0.4, existing.pot + 0.1 * boost);
    } else target.conds.push({ kind, rounds: r(3), pot: 0.1 * boost });
  } else if (kind === "chill") {
    if (existing) existing.rounds = r(2);
    else target.conds.push({ kind, rounds: r(2), pot: 0.3 * boost });
  } else {
    // doom
    if (existing) existing.rounds = r(2);
    else target.conds.push({ kind, rounds: r(2), pot: 0.15 * boost });
  }
  return kind;
}

const FAMILY_DMG: Partial<Record<MonsterFamily, DamageType>> = {
  undead: "shadow",
  demon: "fire",
  dragonkin: "fire",
  spirit: "frost",
  construct: "phys",
  beast: "phys",
  insect: "phys",
  plant: "frost",
  humanoid: "phys",
};

/* --------------------------------- Tiers ----------------------------------- */

export interface TacTier {
  id: string;
  name: string;
  blurb: string;
  /** total foe HP as a multiple of the party's total power */
  foeK: number;
  /** foe damage as a fraction of the party's total HP, spread across ~5 rounds */
  foeHit: number;
  /** reward scaling */
  mult: number;
  favor: number;
}

export const TAC_TIERS: TacTier[] = [
  {
    id: "skirmish",
    name: "Skirmish",
    blurb: "A friendly bout to keep the edge sharp.",
    foeK: 3.0,
    foeHit: 0.5,
    mult: 1,
    favor: 18,
  },
  {
    id: "proving",
    name: "The Proving",
    blurb: "A true test before the court's watchers.",
    foeK: 4.2,
    foeHit: 0.64,
    mult: 1.9,
    favor: 42,
  },
  {
    id: "gauntlet",
    name: "The Gauntlet",
    blurb: "Only the hardened banners walk it out.",
    foeK: 5.4,
    foeHit: 0.78,
    mult: 3.1,
    favor: 80,
  },
];

export function tierById(id: string): TacTier {
  return TAC_TIERS.find((t) => t.id === id) ?? TAC_TIERS[0]!;
}

/* ------------------------------ Encounter setup ---------------------------- */

function rand() {
  return Math.random();
}
function rng(a: number, b: number) {
  return a + Math.random() * (b - a);
}

/** Build a foe pack scaled to the party so the bout is always a real fight. */
function makeFoes(members: Member[], tier: TacTier): TacUnit[] {
  const partyPower = members.reduce((s, m) => s + memberPower(m), 0);
  const partyHp = members.reduce((s, m) => s + maxHp(m), 0);
  const avgLevel = Math.round(
    members.reduce((s, m) => s + m.level, 0) / Math.max(1, members.length),
  );
  const foeCount = Math.max(2, Math.min(5, members.length + (tier.id === "gauntlet" ? 1 : 0)));

  // a flavour pool: the toughest zone the party could already field into
  const zone =
    [...ZONES]
      .filter((z) => z.reqLevel <= avgLevel + 2)
      .sort((a, b) => b.reqLevel - a.reqLevel)[0] ?? ZONES[0]!;
  const pool: Monster[] = zoneMonsters(zone.id);

  const totalHp = partyPower * tier.foeK;
  const perRound = (partyHp * tier.foeHit) / 5;
  const foes: TacUnit[] = [];
  for (let i = 0; i < foeCount; i++) {
    const mon = pool.length ? pool[Math.floor(rand() * pool.length)]! : null;
    const family: MonsterFamily = mon?.family ?? "beast";
    const elite = i === 0 && tier.id !== "skirmish";
    const hp = Math.round((totalHp / foeCount) * (elite ? 1.5 : 1));
    const power = Math.round((perRound / foeCount) * (elite ? 1.25 : 1));
    foes.push({
      id: `foe_${i}`,
      side: "foe",
      name: (elite ? "Dire " : "") + (mon?.name ?? "Marauder"),
      sub: family,
      family,
      dmgType: FAMILY_DMG[family] ?? "phys",
      // roughly the first half of the pack forms the front line
      rank: i < Math.ceil(foeCount / 2) ? "front" : "back",
      hp,
      maxHp: hp,
      mp: 0,
      maxMp: 0,
      power,
      mitigation: 0.05,
      init: avgLevel + rng(0, 12),
      down: false,
      guarding: false,
      cds: {},
      conds: [],
      mods: NO_MODS,
      kit: [],
    });
  }
  return foes;
}

function allyUnit(
  m: Member,
  rank: "front" | "back",
  bond: { power: number; mit: number },
): TacUnit {
  const role = CLASS_BY_ID[m.classId]?.role ?? "blade";
  const st = memberStats(m);
  const mods = traitMods(m.trait);
  // bake the always-on mitigation modifiers of the trait into the unit
  let mit = Math.min(0.7, mitigation(m));
  if (mods.mit) mit *= mods.mit; // berserker guards worse
  if (rank === "front" && mods.frontMit) mit += mods.frontMit; // vanguard/warden dig in
  mit += bond.mit; // fighting beside sworn friends (or worse, beside a rival)
  const bondTag = bond.power > 0.001 ? " · bonded" : bond.power < -0.001 ? " · rivalry" : "";
  return {
    id: `ally_${m.id}`,
    side: "ally",
    name: m.name,
    sub: ROLE_LABEL[role] + bondTag,
    role,
    dmgType: memberDamageType(m),
    rank,
    hp: maxHp(m),
    maxHp: maxHp(m),
    mp: maxMp(m),
    maxMp: maxMp(m),
    // bonds lend strength on the field; rivalries sap it
    power: Math.round(memberPower(m) * (1 + bond.power)),
    mitigation: Math.min(0.85, Math.max(0, mit)),
    init: st.dex + m.level + rng(0, 10),
    down: false,
    guarding: false,
    cds: {},
    conds: [],
    mods,
    kit: abilityKit(role),
  };
}

/**
 * Open a proving with these champions against a fresh, party-scaled pack.
 * `formation` maps a member id to a chosen line; anyone unlisted takes the
 * default for their role.
 */
export function startEncounter(
  members: Member[],
  tierId: string,
  formation?: Record<string, "front" | "back">,
  bondMods?: Record<string, { power: number; mit: number }>,
): TacState {
  const tier = tierById(tierId);
  const allies = members.map((m) =>
    allyUnit(
      m,
      formation?.[m.id] ?? defaultRank(CLASS_BY_ID[m.classId]?.role ?? "blade"),
      bondMods?.[m.id] ?? { power: 0, mit: 0 },
    ),
  );
  const foes = makeFoes(members, tier);
  const units = [...allies, ...foes];
  const order = [...units].sort((a, b) => b.init - a.init).map((u) => u.id);
  const state: TacState = {
    round: 1,
    order,
    turnIdx: 0,
    units,
    log: ["The bout begins."],
    phase: "choose",
    allyAtk: { pct: 0, rounds: 0 },
    allyDef: { pct: 0, rounds: 0 },
    foeVuln: { pct: 0, rounds: 0 },
    momentum: 0,
    tierId: tier.id,
  };
  // advance through any foes who act before the first champion
  return run(clone(state));
}

/* --------------------------------- Engine ---------------------------------- */

function clone(s: TacState): TacState {
  return {
    ...s,
    order: [...s.order],
    units: s.units.map((u) => ({
      ...u,
      cds: { ...u.cds },
      conds: u.conds.map((c) => ({ ...c })),
      kit: u.kit,
    })),
    log: [...s.log],
    allyAtk: { ...s.allyAtk },
    allyDef: { ...s.allyDef },
    foeVuln: { ...s.foeVuln },
  };
}

function unitOf(s: TacState, id: string): TacUnit | undefined {
  return s.units.find((u) => u.id === id);
}
export function currentUnit(s: TacState): TacUnit | undefined {
  return unitOf(s, s.order[s.turnIdx] ?? "");
}
export function livingFoes(s: TacState): TacUnit[] {
  return s.units.filter((u) => u.side === "foe" && !u.down);
}
export function livingAllies(s: TacState): TacUnit[] {
  return s.units.filter((u) => u.side === "ally" && !u.down);
}
/** Standing units of a side in the front line (empty if the line has fallen). */
function frontLine(s: TacState, side: "ally" | "foe"): TacUnit[] {
  return s.units.filter((u) => u.side === side && !u.down && u.rank === "front");
}
/** Is this back-rank unit still covered by a standing front line? */
export function isCovered(s: TacState, u: TacUnit): boolean {
  return u.rank === "back" && frontLine(s, u.side).length > 0;
}

function pushLog(s: TacState, text: string) {
  s.log.unshift(text);
  if (s.log.length > 40) s.log.length = 40;
}

function checkOver(s: TacState): boolean {
  if (livingFoes(s).length === 0) {
    s.phase = "won";
    pushLog(s, "The field is yours. The bout is won.");
    return true;
  }
  if (livingAllies(s).length === 0) {
    s.phase = "lost";
    pushLog(s, "Your banner is beaten from the field.");
    return true;
  }
  return false;
}

function endRound(s: TacState) {
  for (const u of s.units) {
    u.guarding = false;
    for (const k of Object.keys(u.cds)) if (u.cds[k]! > 0) u.cds[k]! -= 1;
    if (u.side === "ally" && !u.down) u.mp = Math.min(u.maxMp, u.mp + Math.round(u.maxMp * 0.06));
    if (!u.down) {
      // burn bites at the turn of the round
      const burn = condOf(u, "burn");
      if (burn) {
        u.hp -= burn.pot;
        if (u.hp <= 0) {
          u.hp = 0;
          u.down = true;
          pushLog(s, `${u.name} succumbs to the flames.`);
        }
      }
      // conditions wane
      for (const c of u.conds) c.rounds -= 1;
      u.conds = u.conds.filter((c) => c.rounds > 0);
    }
  }
  for (const t of [s.allyAtk, s.allyDef, s.foeVuln]) {
    if (t.rounds > 0) {
      t.rounds -= 1;
      if (t.rounds === 0) t.pct = 0;
    }
  }
}

/** Advance the turn pointer to the next living unit, rolling the round over. */
function nextTurn(s: TacState) {
  let guard = 0;
  do {
    s.turnIdx += 1;
    if (s.turnIdx >= s.order.length) {
      s.turnIdx = 0;
      s.round += 1;
      endRound(s);
    }
  } while (currentUnit(s)?.down && guard++ < s.order.length * 2);
}

function critRoll(base: number, heavy: boolean, critBonus = 0): { dmg: number; crit: boolean } {
  const chance = (heavy ? 0.25 : 0.12) + critBonus;
  const crit = rand() < chance;
  const mult = crit ? 1.9 + rand() * 0.4 : 1;
  return { dmg: base * mult * (0.9 + rand() * 0.2), crit };
}

/** Apply a champion's hit to a foe: party buffs, the foe's own vulnerability and
 * family resistance, cover from its front line, then the element's aftermath —
 * a lingering condition, holy's sear, or shadow's leech back to the striker. */
function hitFoe(
  s: TacState,
  foe: TacUnit,
  attacker: TacUnit,
  potency: number,
  heavy: boolean,
  single: boolean,
) {
  const m = attacker.mods;
  const typeMult = foe.family ? typeMultVs(attacker.dmgType, foe.family) : 1;
  // Executioner falls heavier on a bloodied foe
  const execMult = m.exec && foe.hp / foe.maxHp < 0.35 ? 1 + m.exec : 1;
  const base =
    attacker.power *
    potency *
    (m.dmg ?? 1) *
    execMult *
    (1 + s.allyAtk.pct) *
    (1 + s.foeVuln.pct + vulnFrom(foe)) *
    typeMult;
  const { dmg, crit } = critRoll(base, heavy, m.crit ?? 0);
  // a back-rank foe is harder to reach by a single blow while its line stands
  const cover = single && isCovered(s, foe) ? 0.4 : 0;
  const mit = Math.max(0, foe.mitigation - (condOf(foe, "sunder")?.pot ?? 0)) + cover;
  const final = Math.max(1, Math.round(dmg * (1 - mit)));
  foe.hp -= final;
  let leech = 0;
  if (attacker.dmgType === "shadow") {
    leech = Math.round(final * 0.3);
    attacker.hp = Math.min(attacker.maxHp, attacker.hp + leech);
  }
  if (attacker.dmgType === "holy") {
    // a sear: mend the most wounded champion for a share of the blow
    const hurt = livingAllies(s).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (hurt) hurt.hp = Math.min(hurt.maxHp, hurt.hp + Math.round(final * 0.25));
  }
  const cond = applyType(
    foe,
    attacker.dmgType,
    attacker.power * potency,
    m.condBoost ?? 1,
    m.condRounds ?? 0,
  );
  if (foe.hp <= 0) {
    foe.hp = 0;
    foe.down = true;
  }
  return { final, crit, downed: foe.down, cond, leech, covered: cover > 0 };
}

/** A foe strikes an ally: mitigation, party defence, guard, and the foe's own
 * chill weakening its blow — then the foe's element marks the champion in turn. */
function hitAlly(s: TacState, ally: TacUnit, foe: TacUnit) {
  const heavy = rand() < 0.18;
  const chill = 1 - chillCut(foe);
  const { dmg } = critRoll(foe.power * (heavy ? 1.4 : 1) * chill, heavy);
  const guardCut = ally.guarding ? 0.5 : 0;
  // a Warden holding the front shields the back rank behind them
  let ward = 0;
  if (ally.rank === "back")
    for (const u of livingAllies(s))
      if (u.rank === "front" && u.mods.wardBack) ward = Math.max(ward, u.mods.wardBack);
  const reduce = Math.min(0.85, ally.mitigation + s.allyDef.pct + guardCut + ward - vulnFrom(ally));
  const final = Math.max(1, Math.round(dmg * (1 - Math.max(0, reduce))));
  ally.hp -= final;
  const cond = applyType(ally, foe.dmgType, foe.power);
  if (ally.hp <= 0) {
    ally.hp = 0;
    ally.down = true;
  }
  return { final, heavy, downed: ally.down, cond };
}

/** A foe's whole turn: it must break the shield wall — it strikes the front line
 * first, and only reaches the back rank once the front has fallen. */
function foeTurn(s: TacState, foe: TacUnit) {
  const front = frontLine(s, "ally");
  const targets = front.length ? front : livingAllies(s);
  if (targets.length === 0) return;
  targets.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const target = rand() < 0.7 ? targets[0]! : targets[Math.floor(rand() * targets.length)]!;
  const r = hitAlly(s, target, foe);
  const mark = r.cond ? ` · ${COND_META[r.cond].label}` : "";
  pushLog(
    s,
    `${foe.name} hits ${target.name} for ${r.final}${r.heavy ? " (heavy)" : ""}${mark}${r.downed ? " — down!" : ""}.`,
  );
}

/** Run the machine until it is a living champion's turn, or the bout ends. */
function run(s: TacState): TacState {
  let guard = 0;
  while (guard++ < 500) {
    if (checkOver(s)) return s;
    const u = currentUnit(s);
    if (!u || u.down) {
      nextTurn(s);
      continue;
    }
    if (u.side === "foe") {
      foeTurn(s, u);
      if (checkOver(s)) return s;
      nextTurn(s);
      continue;
    }
    // a living champion — hand control to the player
    s.phase = "choose";
    return s;
  }
  return s;
}

export interface TacAction {
  abilityId: string;
  /** target unit id, for single-target abilities */
  targetId?: string;
}

/**
 * Resolve the active champion's chosen action, then run foes until it is another
 * champion's turn (or the bout ends). Pure: returns a new state.
 */
export function applyAction(prev: TacState, action: TacAction): TacState {
  if (prev.phase !== "choose") return prev;
  const s = clone(prev);
  const actor = currentUnit(s);
  if (!actor || actor.side !== "ally" || actor.down) return prev;
  const ability = actor.kit.find((a) => a.id === action.abilityId);
  if (!ability) return prev;
  if ((actor.cds[ability.id] ?? 0) > 0 || actor.mp < ability.mp) return prev;

  const damaging =
    ability.shape === "strike" || ability.shape === "heavy" || ability.shape === "aoe";
  // a full press unleashes an Onslaught: the next attack is free and empowered
  const onslaught = damaging && s.momentum >= MOMENTUM_MAX;
  const pot = ability.potency * (onslaught ? 1.5 : 1);

  if (!onslaught) actor.mp -= ability.mp;
  if (ability.cooldown > 0) actor.cds[ability.id] = ability.cooldown + 1; // +1: ticked down at round end
  if (onslaught) pushLog(s, `${actor.name} unleashes an Onslaught!`);

  const foes = livingFoes(s);
  const allies = livingAllies(s);
  let gained = 0;
  let kills = 0;
  switch (ability.shape) {
    case "strike":
    case "heavy": {
      const foe = (action.targetId && unitOf(s, action.targetId)) || foes[0];
      if (foe && !foe.down && foe.side === "foe") {
        const r = hitFoe(s, foe, actor, pot, ability.shape === "heavy", true);
        if (r.downed) kills++;
        gained += ability.shape === "heavy" ? 22 : 18;
        if (r.crit) gained += 8;
        const mark = r.cond ? ` · ${COND_META[r.cond].label}` : "";
        pushLog(
          s,
          `${actor.name} ${ability.name} → ${foe.name}: ${r.final}${r.crit ? " crit!" : ""}${r.covered ? " (covered)" : ""}${mark}${r.downed ? " — slain!" : ""}.`,
        );
      }
      break;
    }
    case "aoe": {
      let text = `${actor.name} ${ability.name} hits all foes:`;
      for (const foe of foes) {
        const r = hitFoe(s, foe, actor, pot, false, false);
        if (r.downed) kills++;
        gained += 6;
        text += ` ${foe.name} ${r.final}${r.downed ? "†" : ""};`;
      }
      gained += 10;
      pushLog(s, text);
      break;
    }
    case "heal": {
      const ally = (action.targetId && unitOf(s, action.targetId)) || allies[0];
      if (ally && ally.side === "ally") {
        const amt = Math.round(
          actor.power * ability.potency * 0.7 * (actor.mods.healCleanse ? 1.25 : 1),
        );
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        let cleaned = "";
        if (actor.mods.healCleanse && ally.conds.length) {
          const c = ally.conds.shift();
          if (c) cleaned = ` · cleansed ${COND_META[c.kind].label}`;
        }
        pushLog(s, `${actor.name} ${ability.name} restores ${ally.name} by ${amt}${cleaned}.`);
      }
      break;
    }
    case "heal_all": {
      const amt = Math.round(
        actor.power * ability.potency * 0.7 * (actor.mods.healCleanse ? 1.25 : 1),
      );
      for (const ally of allies) {
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        if (actor.mods.healCleanse && ally.conds.length) ally.conds.shift();
      }
      pushLog(s, `${actor.name} ${ability.name} heals the party by ${amt}.`);
      break;
    }
    case "buff_atk":
      s.allyAtk = { pct: ability.potency, rounds: 2 };
      pushLog(s, `${actor.name} ${ability.name} — the party's blows land harder.`);
      break;
    case "buff_def":
      s.allyDef = { pct: ability.potency, rounds: 2 };
      pushLog(s, `${actor.name} ${ability.name} — the party braces as one.`);
      break;
    case "debuff":
      s.foeVuln = { pct: ability.potency, rounds: 2 };
      pushLog(s, `${actor.name} ${ability.name} — the foe is left open.`);
      break;
    case "guard":
      actor.guarding = true;
      actor.mp = Math.min(actor.maxMp, actor.mp + Math.round(actor.maxMp * 0.2));
      pushLog(s, `${actor.name} guards, and gathers focus.`);
      break;
  }

  // momentum: an Onslaught spends the whole press; otherwise pressing builds it
  // (a Zealot builds it faster)
  if (onslaught) s.momentum = 0;
  s.momentum = Math.min(
    MOMENTUM_MAX,
    s.momentum + (gained + kills * 25) * (actor.mods.momentum ?? 1),
  );

  if (checkOver(s)) return s;
  nextTurn(s);
  return run(s);
}

/* --------------------------------- Rewards --------------------------------- */

export interface TacReward {
  gold: number;
  rep: number;
  xp: number; // per participating champion
  favor: number;
  won: boolean;
  blooded: boolean;
}

/** How much richer a Blooded bout pays for its real stakes. */
export const BLOODED_MULT = 1.5;

/** What a bout pays. A loss still teaches — a fraction is granted for the effort.
 * A Blooded bout pays half again as much for the risk of lasting wounds. */
export function tacticalReward(s: TacState, members: Member[], blooded = false): TacReward {
  const tier = tierById(s.tierId);
  const foeHp = s.units.filter((u) => u.side === "foe").reduce((n, u) => n + u.maxHp, 0);
  const avgLevel = Math.round(
    members.reduce((n, m) => n + m.level, 0) / Math.max(1, members.length),
  );
  const won = s.phase === "won";
  const stakes = blooded ? BLOODED_MULT : 1;
  const base = foeHp * 0.16 * tier.mult * stakes;
  const frac = won ? 1 : 0.2;
  return {
    won,
    blooded,
    gold: Math.round(base * frac),
    rep: Math.round((6 + avgLevel * 0.8) * tier.mult * stakes * frac),
    xp: Math.round((40 + avgLevel * avgLevel * 0.6) * tier.mult * stakes * frac),
    favor: won ? Math.round(tier.favor * stakes) : 0,
  };
}

/** The champions (by member id) left down at the bout's end — they take wounds
 * in a Blooded proving. */
export function downedMemberIds(s: TacState): string[] {
  return s.units.filter((u) => u.side === "ally" && u.down).map((u) => u.id.replace(/^ally_/, ""));
}
