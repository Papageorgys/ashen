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

export interface TacUnit {
  id: string;
  side: "ally" | "foe";
  name: string;
  sub: string; // class/family label for the card
  role?: Role;
  family?: MonsterFamily;
  dmgType: DamageType;
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
  tierId: string;
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
      kit: [],
    });
  }
  return foes;
}

function allyUnit(m: Member): TacUnit {
  const role = CLASS_BY_ID[m.classId]?.role ?? "blade";
  const st = memberStats(m);
  return {
    id: `ally_${m.id}`,
    side: "ally",
    name: m.name,
    sub: ROLE_LABEL[role],
    role,
    dmgType: memberDamageType(m),
    hp: maxHp(m),
    maxHp: maxHp(m),
    mp: maxMp(m),
    maxMp: maxMp(m),
    power: memberPower(m),
    mitigation: Math.min(0.7, mitigation(m)),
    init: st.dex + m.level + rng(0, 10),
    down: false,
    guarding: false,
    cds: {},
    kit: abilityKit(role),
  };
}

/** Open a proving with these champions against a fresh, party-scaled pack. */
export function startEncounter(members: Member[], tierId: string): TacState {
  const tier = tierById(tierId);
  const allies = members.map(allyUnit);
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
    units: s.units.map((u) => ({ ...u, cds: { ...u.cds }, kit: u.kit })),
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

function critRoll(base: number, heavy: boolean): { dmg: number; crit: boolean } {
  const chance = (heavy ? 0.25 : 0.12) + 0;
  const crit = rand() < chance;
  const mult = crit ? 1.9 + rand() * 0.4 : 1;
  return { dmg: base * mult * (0.9 + rand() * 0.2), crit };
}

/** Apply a raw hit to a foe, accounting for the party's damage-up and the foe's
 * vulnerability and family resistance. Returns damage dealt. */
function hitFoe(s: TacState, foe: TacUnit, attacker: TacUnit, potency: number, heavy: boolean) {
  const typeMult = foe.family ? typeMultVs(attacker.dmgType, foe.family) : 1;
  const base = attacker.power * potency * (1 + s.allyAtk.pct) * (1 + s.foeVuln.pct) * typeMult;
  const { dmg, crit } = critRoll(base, heavy);
  const final = Math.max(1, Math.round(dmg * (1 - foe.mitigation)));
  foe.hp -= final;
  if (foe.hp <= 0) {
    foe.hp = 0;
    foe.down = true;
  }
  return { final, crit, downed: foe.down };
}

/** A foe strikes an ally, reduced by that ally's mitigation, the party's
 * defence buff, and whether they are guarding. */
function hitAlly(s: TacState, ally: TacUnit, foe: TacUnit) {
  const heavy = rand() < 0.18;
  const { dmg } = critRoll(foe.power * (heavy ? 1.4 : 1), heavy);
  const guardCut = ally.guarding ? 0.5 : 0;
  const reduce = Math.min(0.85, ally.mitigation + s.allyDef.pct + guardCut);
  const final = Math.max(1, Math.round(dmg * (1 - reduce)));
  ally.hp -= final;
  if (ally.hp <= 0) {
    ally.hp = 0;
    ally.down = true;
  }
  return { final, heavy, downed: ally.down };
}

/** A foe's whole turn, driven by simple AI: focus the weakest standing ally. */
function foeTurn(s: TacState, foe: TacUnit) {
  const targets = livingAllies(s);
  if (targets.length === 0) return;
  // weight toward the lowest-HP ally, but not always
  targets.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  const target = rand() < 0.7 ? targets[0]! : targets[Math.floor(rand() * targets.length)]!;
  const r = hitAlly(s, target, foe);
  pushLog(
    s,
    `${foe.name} hits ${target.name} for ${r.final}${r.heavy ? " (heavy)" : ""}${r.downed ? " — down!" : ""}.`,
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

  actor.mp -= ability.mp;
  if (ability.cooldown > 0) actor.cds[ability.id] = ability.cooldown + 1; // +1: ticked down at round end

  const foes = livingFoes(s);
  const allies = livingAllies(s);
  switch (ability.shape) {
    case "strike":
    case "heavy": {
      const foe = (action.targetId && unitOf(s, action.targetId)) || foes[0];
      if (foe && !foe.down && foe.side === "foe") {
        const r = hitFoe(s, foe, actor, ability.potency, ability.shape === "heavy");
        pushLog(
          s,
          `${actor.name} ${ability.name} → ${foe.name}: ${r.final}${r.crit ? " crit!" : ""}${r.downed ? " — slain!" : ""}.`,
        );
      }
      break;
    }
    case "aoe": {
      let text = `${actor.name} ${ability.name} hits all foes:`;
      for (const foe of foes) {
        const r = hitFoe(s, foe, actor, ability.potency, false);
        text += ` ${foe.name} ${r.final}${r.downed ? "†" : ""};`;
      }
      pushLog(s, text);
      break;
    }
    case "heal": {
      const ally = (action.targetId && unitOf(s, action.targetId)) || allies[0];
      if (ally && ally.side === "ally") {
        const amt = Math.round(actor.power * ability.potency * 0.7);
        ally.hp = Math.min(ally.maxHp, ally.hp + amt);
        pushLog(s, `${actor.name} ${ability.name} restores ${ally.name} by ${amt}.`);
      }
      break;
    }
    case "heal_all": {
      const amt = Math.round(actor.power * ability.potency * 0.7);
      for (const ally of allies) ally.hp = Math.min(ally.maxHp, ally.hp + amt);
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
}

/** What a bout pays. A loss still teaches — a fraction is granted for the effort. */
export function tacticalReward(s: TacState, members: Member[]): TacReward {
  const tier = tierById(s.tierId);
  const foeHp = s.units.filter((u) => u.side === "foe").reduce((n, u) => n + u.maxHp, 0);
  const avgLevel = Math.round(
    members.reduce((n, m) => n + m.level, 0) / Math.max(1, members.length),
  );
  const won = s.phase === "won";
  const base = foeHp * 0.16 * tier.mult;
  const frac = won ? 1 : 0.2;
  return {
    won,
    gold: Math.round(base * frac),
    rep: Math.round((6 + avgLevel * 0.8) * tier.mult * frac),
    xp: Math.round((40 + avgLevel * avgLevel * 0.6) * tier.mult * frac),
    favor: won ? tier.favor : 0,
  };
}
