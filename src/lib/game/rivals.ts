/**
 * The realm beyond your keep — rival clans that claim hunting grounds, and a
 * castle worth bleeding for. This is where the stakes live.
 */

export interface RivalDef {
  id: string;
  name: string;
  banner: string;
  blurb: string;
  /** how fast they grow while unchecked */
  ambition: number;
  color: string;
}

export const RIVALS: RivalDef[] = [
  {
    id: "graves",
    name: "Order of the Pale Grave",
    banner: "A white skull on black",
    blurb: "Grave-robbers turned mercenaries. They claim the dungeons and tax anyone who enters.",
    ambition: 1.15,
    color: "#c9c4b8",
  },
  {
    id: "crimson",
    name: "Crimson Tithe",
    banner: "A red hand, open",
    blurb: "They do not hunt monsters. They hunt clans that have finished hunting monsters.",
    ambition: 1.3,
    color: "#b2402f",
  },
  {
    id: "emberwatch",
    name: "Emberwatch Company",
    banner: "A burning tower",
    blurb: "Disciplined, well-funded, and convinced the castle is theirs by right.",
    ambition: 1.0,
    color: "#d89a3a",
  },
];

export const RIVAL_BY_ID = Object.fromEntries(RIVALS.map((r) => [r.id, r])) as Record<
  string,
  RivalDef
>;

export interface RivalState {
  id: string;
  power: number;
  /** zones this clan currently taxes */
  claims: string[];
  /** 0-100 — how badly they want you dead */
  hostility: number;
  /** clashes you have won against them */
  routed: number;
}

export const CASTLE = {
  id: "ravenhold",
  name: "Ravenhold Keep",
  blurb:
    "A black-stone fortress over the trade road. Whoever holds it taxes every caravan in the realm.",
  /** clan level before the heralds will even accept your declaration */
  reqClanLevel: 4,
  /** gold per real-time hour while you hold it */
  taxPerHour: 900,
};

export interface CastleState {
  /** null = held by the crown's garrison; otherwise a rival id, or "player" */
  holder: string | null;
  sinceAt: number;
  /** unclaimed tax gold accrued */
  purse: number;
  lastTickAt: number;
  /** timestamp the next rival assault lands (only while you hold it) */
  nextAssaultAt: number;
}

export function initialRivals(): RivalState[] {
  return RIVALS.map((r, i) => ({
    id: r.id,
    power: 240 + i * 120,
    claims: [],
    hostility: 10 + i * 8,
    routed: 0,
  }));
}

export function initialCastle(): CastleState {
  return {
    holder: "emberwatch",
    sinceAt: Date.now(),
    purse: 0,
    lastTickAt: Date.now(),
    nextAssaultAt: 0,
  };
}

export function garrisonPower(castle: CastleState, rivals: RivalState[]) {
  if (!castle.holder || castle.holder === "player") return 900;
  const r = rivals.find((x) => x.id === castle.holder);
  return Math.round((r?.power ?? 600) * 1.35 + 300);
}

/**
 * Resolves a clash of two hosts. Deliberately swingy — a slim advantage is not
 * a promise, and marching under-strength gets people killed.
 */
export function resolveClash(attack: number, defend: number) {
  const roll = 0.75 + Math.random() * 0.5;
  const score = (attack * roll) / Math.max(1, defend);
  const win = score >= 1;
  // margin drives casualties: a bloodbath either way if it was close
  const margin = Math.abs(score - 1);
  const casualtyRisk = Math.min(0.55, win ? 0.1 + (0.2 - Math.min(0.2, margin)) : 0.3 + margin * 0.3);
  return { win, score, casualtyRisk };
}
