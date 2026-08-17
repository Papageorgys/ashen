// The Court of the Crownlands — the home realm's feudal ladder (the "rise to the
// crown" pillar). Where the Frontier is the war ABROAD, the Court is politics AT
// HOME: you begin sworn to the King as a minor outpost and climb the vassal
// ladder by answering royal charges (missions), rank by rank, until you take the
// throne of the Crownlands yourself.
//
// Favor is a POLITICAL axis, distinct from clanLevel (raw military power). It is
// earned only by completing the King's charges, and it is the one thread that ties
// every other system — the hunt, the treasury, the frontier war, the world-terrors
// — into a single ladder of ambition.
//
// The charge board and rank read-outs are PURE functions of GameState so the UI
// and the engine never drift (the same discipline as keepEffects / warSpoilsChannels).

import type { GameState } from "./engine";

/** The sovereign you are sworn to — until you unseat them. */
export const THE_KING = "King Aldous of the Ashen Throne";
export const THE_REALM = "the Crownlands";

/* ---------------------------------- Ranks ---------------------------------- */

export interface CourtRank {
  index: number;
  title: string;
  /** what your seat IS at this rank — the outpost that grows into a throne */
  holding: string;
  /** cumulative favor to reach this rank */
  favor: number;
  /** what standing at this rank grants, in words */
  grant: string;
}

/**
 * The feudal ladder of the Crownlands. You start at the bottom — a palisade
 * outpost sworn to the crown — and each rung is bought with royal favor, not gold.
 * The last rung is the throne itself.
 */
export const COURT_RANKS: CourtRank[] = [
  {
    index: 0,
    title: "Sworn Outpost",
    holding: "a palisade outpost on the crown's marches",
    favor: 0,
    grant: "A roof, a banner, and the King's leave to serve.",
  },
  {
    index: 1,
    title: "King's Retainer",
    holding: "a granted holdfast",
    favor: 60,
    grant: "A retainer's pension on every hunt.",
  },
  {
    index: 2,
    title: "Banneret",
    holding: "a walled steading",
    favor: 170,
    grant: "The right to ride under your own device.",
  },
  {
    index: 3,
    title: "Castellan",
    holding: "a royal keep held in trust",
    favor: 340,
    grant: "A castellan's share of the crown roads.",
  },
  {
    index: 4,
    title: "Baron of the Marches",
    holding: "a barony of the marches",
    favor: 600,
    grant: "Landed title, and a baron's levy.",
  },
  {
    index: 5,
    title: "Viscount",
    holding: "a viscounty and its towns",
    favor: 960,
    grant: "A viscount's tithe on all your holdings.",
  },
  {
    index: 6,
    title: "Count Palatine",
    holding: "a county palatine",
    favor: 1450,
    grant: "Palatine rights — you judge your own marches.",
  },
  {
    index: 7,
    title: "Lord Marshal of the Realm",
    holding: "the Marshal's seat beside the throne",
    favor: 2100,
    grant: "The realm's armies answer your word.",
  },
  {
    index: 8,
    title: "Sovereign of the Crownlands",
    holding: "the Ashen Throne itself",
    favor: 3000,
    grant: "The crown is yours. The realm is yours.",
  },
];

export const CROWN_RANK = COURT_RANKS.length - 1;

export function courtRankIndex(standing: number): number {
  let r = 0;
  for (const rank of COURT_RANKS) if (standing >= rank.favor) r = rank.index;
  return r;
}

/**
 * A house's cumulative STANDING at court — the total favor it has ever earned.
 * This drives rank and never falls, so spending favor on a royal boon can never
 * cost you your title. (Old saves that predate the split read their rank off the
 * favor purse until the migration seeds standing.)
 */
export function courtStanding(state: GameState): number {
  return state.court?.standing ?? state.court?.favor ?? 0;
}
export function courtRank(favor: number): CourtRank {
  return COURT_RANKS[courtRankIndex(favor)]!;
}
export function nextCourtRank(favor: number): CourtRank | null {
  const i = courtRankIndex(favor);
  return i >= CROWN_RANK ? null : COURT_RANKS[i + 1]!;
}
/** 0..1 progress from the current rank toward the next (1 at the crown). */
export function courtRankProgress(favor: number): number {
  const cur = courtRank(favor);
  const next = nextCourtRank(favor);
  if (!next) return 1;
  return Math.max(0, Math.min(1, (favor - cur.favor) / (next.favor - cur.favor)));
}

/* -------------------------------- Privileges ------------------------------- */
/**
 * Standing at court pays: each rank grants a small, compounding bonus to the gold
 * and reputation of every hunt — a royal pension that makes the climb tangible.
 * Modest by design; the ladder is the reward, this is the interest on it.
 */
export function courtEffects(state: GameState): {
  rank: number;
  goldMult: number;
  repMult: number;
} {
  const rank = courtRankIndex(courtStanding(state));
  return { rank, goldMult: 1 + rank * 0.02, repMult: 1 + rank * 0.04 };
}

/* --------------------------------- Charges --------------------------------- */

export type ChargeKind =
  | "hunt" // slay N beasts (cumulative)
  | "patrol" // complete N expeditions (cumulative)
  | "tithe" // deliver N gold to the treasury (a spend)
  | "levy" // hold N realms on the frontier (state)
  | "muster" // field N banners at once (state)
  | "ennoble" // raise your clan to level N (state)
  | "bounty"; // land N world-terror kills (cumulative)

export interface CourtCharge {
  id: string;
  kind: ChargeKind;
  title: string;
  flavor: string;
  /** how much of the objective is required */
  need: number;
  /** baseline snapshot of the tracked metric when the charge was issued
   * (cumulative kinds only; 0 for state / spend kinds) */
  base: number;
  favor: number;
  gold: number;
  rep: number;
}

export interface CourtState {
  /** the spendable purse — earned favor, drawn down on royal boons */
  favor: number;
  /** cumulative favor ever earned — drives rank, never falls (see courtStanding) */
  standing?: number;
  /** how many charges have ever been issued — the deterministic roll seed */
  issued: number;
  charges: CourtCharge[];
  /** court-local durable counters the charges read progress from */
  stats: { kills: number; runs: number; bossKills: number };
  /** true once you have taken the throne */
  crowned?: boolean;
  /** the highest rank the player has been shown — for level-up detection */
  seenRank?: number;
}

export const CHARGE_SLOTS = 3;

/** the metric a cumulative charge measures, read off durable state */
function cumulativeMetric(state: GameState, kind: ChargeKind): number {
  const st = state.court?.stats;
  if (kind === "hunt") return st?.kills ?? 0;
  if (kind === "patrol") return st?.runs ?? 0;
  if (kind === "bounty") return st?.bossKills ?? 0;
  return 0;
}

/** how many banners are fielded (a banner with champions in it) right now */
function bannersFielded(state: GameState): number {
  return (state.parties ?? []).filter((p) => p.memberIds.length > 0).length;
}
/** how many frontier realms the clan holds right now */
function realmsHeld(state: GameState): number {
  return state.warSpoils?.held?.length ?? 0;
}

/** Live progress on a charge: how much is done, how much is needed, and if it's ready. */
export function chargeProgress(
  state: GameState,
  c: CourtCharge,
): { have: number; need: number; ready: boolean } {
  let have: number;
  if (c.kind === "tithe") have = Math.floor(state.gold ?? 0);
  else if (c.kind === "levy") have = realmsHeld(state);
  else if (c.kind === "muster") have = bannersFielded(state);
  else if (c.kind === "ennoble") have = state.clanLevel ?? 0;
  else have = cumulativeMetric(state, c.kind) - c.base; // hunt / patrol / bounty
  have = Math.max(0, Math.min(c.need, have));
  return { have, need: c.need, ready: have >= c.need };
}

/** Deterministic per-charge RNG so a roll is reproducible from its issue index. */
function chargeRng(seed: number) {
  let s = (Math.imul(seed + 1, 2654435761) ^ 0x9e3779b9) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const MAX_BANNERS = 8;

/**
 * Issue the next royal charge, seeded by how many have come before and scaled to
 * the house's current standing. State-driven charges (levy/muster/ennoble) always
 * demand growth beyond what you already have, so the board never pays favor for
 * standing still; if a growth charge can't be formed (already at the ceiling), it
 * falls through to a hunt.
 */
export function rollCharge(state: GameState, seed: number): CourtCharge {
  const rng = chargeRng(seed);
  const rank = courtRankIndex(courtStanding(state));
  const clanLevel = state.clanLevel ?? 0;
  const favorReward = Math.round(40 + rank * 22 + rng() * 20);

  // weighted pick of a kind
  const pool: ChargeKind[] = [
    "hunt",
    "hunt",
    "patrol",
    "tithe",
    "levy",
    "muster",
    "ennoble",
    "bounty",
  ];
  let kind = pool[Math.floor(rng() * pool.length)] ?? "hunt";

  // growth-gated kinds: demand more than you hold now, or fall through to a hunt
  if (kind === "ennoble" && clanLevel >= 8) kind = "hunt";
  if (kind === "muster" && bannersFielded(state) >= MAX_BANNERS) kind = "hunt";

  const mk = (
    k: ChargeKind,
    title: string,
    flavor: string,
    need: number,
    gold: number,
    rep: number,
    cumulative: boolean,
  ): CourtCharge => ({
    id: `charge_${seed}`,
    kind: k,
    title,
    flavor,
    need: Math.max(1, Math.round(need)),
    base: cumulative ? cumulativeMetric(state, k) : 0,
    favor: favorReward,
    gold: Math.round(gold),
    rep: Math.round(rep),
  });

  switch (kind) {
    case "patrol": {
      const need = 4 + rank * 2 + Math.floor(rng() * 3);
      return mk(
        "patrol",
        "Ride the Crown Circuit",
        `Show the King's peace on the roads — complete ${Math.round(need)} expeditions in his name.`,
        need,
        120 + rank * 90,
        20 + rank * 8,
        true,
      );
    }
    case "tithe": {
      const need = 250 + rank * 320 + Math.floor(rng() * 200);
      return mk(
        "tithe",
        "The Crown's Tithe",
        `The treasury is thin. Deliver ${Math.round(need)} gold to the King's coffers.`,
        need,
        0,
        30 + rank * 12,
        false,
      );
    }
    case "levy": {
      const need = Math.min(7, realmsHeld(state) + 1);
      return mk(
        "levy",
        "Answer the Royal Levy",
        `The frontier bleeds. Hold ${Math.round(need)} realm${need === 1 ? "" : "s"} for the crown at once.`,
        need,
        180 + rank * 130,
        40 + rank * 16,
        false,
      );
    }
    case "muster": {
      const need = Math.min(MAX_BANNERS, bannersFielded(state) + 1 + Math.floor(rng() * 2));
      return mk(
        "muster",
        "Fill the Muster Rolls",
        `The King would see your strength. Field ${Math.round(need)} banners at once.`,
        need,
        150 + rank * 110,
        30 + rank * 12,
        false,
      );
    }
    case "ennoble": {
      const need = Math.min(8, clanLevel + 1);
      return mk(
        "ennoble",
        "Prove Your House",
        `Titles are earned in blood and coin. Raise your clan to level ${Math.round(need)}.`,
        need,
        200 + rank * 150,
        60 + rank * 20,
        false,
      );
    }
    case "bounty": {
      const need = 1 + Math.floor(rank / 3);
      return mk(
        "bounty",
        "The King's Justice",
        `A terror stalks the realm. Land the killing blow on ${Math.round(need)} world-terror${need === 1 ? "" : "s"}.`,
        need,
        260 + rank * 160,
        50 + rank * 18,
        true,
      );
    }
    default: {
      const need = 18 + rank * 14 + Math.floor(rng() * 12);
      return mk(
        "hunt",
        "Cull the King's Marches",
        `Beasts thicken on the crown roads. Put ${Math.round(need)} of them to the sword.`,
        need,
        130 + rank * 95,
        22 + rank * 9,
        true,
      );
    }
  }
}

/** Fresh court for a new game (or a save that predates the court). The charge
 * board is left empty; the caller fills it with `fillCharges` against the real
 * game state (patch() and initialState() both do so). */
export function initialCourt(): CourtState {
  return {
    favor: 0,
    standing: 0,
    issued: 0,
    charges: [],
    stats: { kills: 0, runs: 0, bossKills: 0 },
    crowned: false,
    seenRank: 0,
  };
}

/* --------------------------------- Boons ----------------------------------- */
// What the crown's favor BUYS — the sink that makes standing spendable and ties
// the court back into the war, the roster and the domain it presides over. Each
// boon is gated by rank (you must have risen to earn the King's ear) and scales
// with it, so climbing the ladder widens what the crown will grant.

export type BoonId = "charter" | "healers" | "muster";

export interface BoonDef {
  id: BoonId;
  name: string;
  glyph: string;
  blurb: string;
  /** court rank required to petition for it */
  minRank: number;
  /** favor drawn from the purse */
  cost: number;
}

export const BOONS: Record<BoonId, BoonDef> = {
  charter: {
    id: "charter",
    name: "War Charter",
    glyph: "📜",
    blurb: "The crown funds your war — a charter of supply shipped straight to the front.",
    minRank: 1,
    cost: 45,
  },
  healers: {
    id: "healers",
    name: "Royal Healers",
    glyph: "✚",
    blurb: "The King's own chirurgeons ride out and mend every wound in your ranks.",
    minRank: 2,
    cost: 70,
  },
  muster: {
    id: "muster",
    name: "Muster Writ",
    glyph: "🔨",
    blurb: "A royal writ levies laborers from the crownlands to work your domain.",
    minRank: 3,
    cost: 55,
  },
};

export const BOON_IDS = Object.keys(BOONS) as BoonId[];

/** How much war supply a War Charter ships, given court rank. */
export function charterSupply(rank: number): number {
  return 20 + rank * 8;
}
/** How many laborers a Muster Writ levies, given court rank. */
export function musterLaborers(rank: number): number {
  return 3 + Math.floor(rank / 2);
}

/** Can the house petition for this boon right now? */
export function canPetition(state: GameState, id: BoonId): { ok: boolean; why: string } {
  const def = BOONS[id];
  const rank = courtRankIndex(courtStanding(state));
  if (rank < def.minRank)
    return { ok: false, why: `Rise to ${COURT_RANKS[def.minRank]!.title} to petition for this` };
  if ((state.court?.favor ?? 0) < def.cost) return { ok: false, why: `${def.cost} favor needed` };
  return { ok: true, why: "" };
}

/**
 * Top the charge board back up to CHARGE_SLOTS, issuing new charges seeded by the
 * running `issued` counter. Mutates the court in place; safe to call on load and
 * after every claim.
 */
export function fillCharges(court: CourtState, state: GameState): void {
  let guard = 0;
  while (court.charges.length < CHARGE_SLOTS && guard++ < 20) {
    court.charges.push(rollCharge(state, court.issued));
    court.issued += 1;
  }
}
