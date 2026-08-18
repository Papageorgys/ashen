import { armyStrength, troopCount, type Army } from "./army";
import { makeRng, type Rng } from "./rng";
import type { World } from "./types";

/**
 * Diplomacy — rival crowns are rulers you can treat with, not only fight. The
 * SIMULATION decides whether a proposal is acceptable from real game data
 * (opinion, relative strength, the current stance); the response prose is
 * generated from that verdict, never the reverse. Stance gates the AI's
 * aggression: peace and pacts actually protect you.
 */

export type Stance = "peace" | "war" | "nap" | "alliance";
export type DiploAction = "peace" | "nap" | "alliance" | "tribute" | "threaten" | "declare_war";

export interface Relation {
  opinion: number; // -100..100, how they regard you
  stance: Stance;
}

export type Diplomacy = Record<string, Relation>;

const key = (a: string, b: string) => [a, b].sort().join("|");

export function getRelation(dip: Diplomacy, a: string, b: string): Relation {
  return dip[key(a, b)] ?? { opinion: 0, stance: "peace" };
}
function setRelation(dip: Diplomacy, a: string, b: string, r: Partial<Relation>) {
  const cur = getRelation(dip, a, b);
  dip[key(a, b)] = { ...cur, ...r };
}
export function adjustOpinion(dip: Diplomacy, a: string, b: string, delta: number) {
  const cur = getRelation(dip, a, b);
  setRelation(dip, a, b, { opinion: Math.max(-100, Math.min(100, cur.opinion + delta)) });
}

/** A kingdom's deterministic temperament — how readily it makes war. */
export function temperament(
  world: World,
  kingdomId: string,
): { aggression: number; honor: number } {
  const r = makeRng(world.seed ^ hash(kingdomId));
  return { aggression: r(), honor: r() };
}

export function makeDiplomacy(world: World): Diplomacy {
  const dip: Diplomacy = {};
  const r = makeRng(world.seed ^ 0xd1907ace);
  const ks = world.kingdoms;
  for (let i = 0; i < ks.length; i++) {
    for (let j = i + 1; j < ks.length; j++) {
      const a = ks[i]!;
      const b = ks[j]!;
      // the player starts at a wary peace with everyone; AI rivals may already feud
      const playerPair = a.isPlayer || b.isPlayer;
      const opinion = playerPair ? Math.round((r() - 0.5) * 30) : Math.round((r() - 0.5) * 80);
      const stance: Stance = !playerPair && opinion < -25 ? "war" : "peace";
      dip[key(a.id, b.id)] = { opinion, stance };
    }
  }
  return dip;
}

const totalStrength = (armies: Army[], kid: string) =>
  armies.filter((a) => a.ownerId === kid).reduce((s, a) => s + armyStrength(a), 0) || 1;

export interface ProposalResult {
  accepted: boolean;
  response: string;
}

/** The AI ruler `to` weighs an action from `from`. Verdict from data, then prose. */
export function evaluateProposal(
  dip: Diplomacy,
  world: World,
  armies: Army[],
  from: string,
  to: string,
  action: DiploAction,
  r: Rng,
): ProposalResult {
  const rel = getRelation(dip, from, to);
  const kName = (id: string) => world.kingdoms.find((k) => k.id === id)?.name ?? "the realm";
  const myStr = totalStrength(armies, from);
  const theirStr = totalStrength(armies, to);
  const ratio = myStr / theirStr; // >1 means the proposer is stronger
  const temp = temperament(world, to);

  const yes = (s: string) => ({ accepted: true, response: s });
  const no = (s: string) => ({ accepted: false, response: s });

  switch (action) {
    case "declare_war":
      setRelation(dip, from, to, { stance: "war", opinion: Math.min(rel.opinion - 40, -20) });
      return yes(`So be it. ${kName(to)} will meet your banners in the field.`);
    case "threaten":
      if (ratio > 1.3) {
        adjustOpinion(dip, from, to, -12);
        return yes(`We hear you. ${kName(to)} has no wish to be your enemy — for now.`);
      }
      adjustOpinion(dip, from, to, -22);
      if (temp.aggression > 0.6) setRelation(dip, from, to, { stance: "war" });
      return no(`You forget yourself. ${kName(to)} does not bend to threats.`);
    case "tribute":
      adjustOpinion(dip, from, to, 18);
      return yes(`${kName(to)} accepts your gift, and remembers it kindly.`);
    case "peace":
      if (rel.stance !== "war") return no(`We are not at war. There is nothing to settle.`);
      if (theirStr < myStr * 0.85 || rel.opinion > -30 || r() < 0.3) {
        setRelation(dip, from, to, { stance: "peace" });
        adjustOpinion(dip, from, to, 12);
        return yes(`Enough blood has been spilt. ${kName(to)} will lay down its swords.`);
      }
      return no(`Peace? We have not yet begun to make you pay. The war goes on.`);
    case "nap":
      if (rel.stance === "war")
        return no(`Sign a pact while our armies bleed? Sue for peace first.`);
      if (rel.opinion > -15 || r() < 0.4) {
        setRelation(dip, from, to, { stance: "nap" });
        adjustOpinion(dip, from, to, 6);
        return yes(`A sensible arrangement. ${kName(to)} will not cross your borders.`);
      }
      return no(`${kName(to)} sees no gain in binding its hands to yours.`);
    case "alliance": {
      const commonThreat = world.kingdoms.some(
        (k) =>
          k.id !== from && k.id !== to && totalStrength(armies, k.id) > (myStr + theirStr) * 0.6,
      );
      if (rel.opinion > 30 && (commonThreat || theirStr < myStr * 0.8 || temp.honor > 0.6)) {
        setRelation(dip, from, to, { stance: "alliance", opinion: rel.opinion + 15 });
        return yes(
          commonThreat
            ? `We share an enemy, and now a cause. ${kName(to)} is your ally.`
            : `Your friendship is proven. ${kName(to)} will stand with you.`,
        );
      }
      return no(`An alliance is a heavy oath. ${kName(to)} is not yet ready to swear it.`);
    }
  }
}

/** Each season: opinions drift, and an aggressive rival may declare war. */
export function diplomacyTick(dip: Diplomacy, world: World, armies: Army[], r: Rng) {
  for (const k of world.kingdoms) {
    if (k.isPlayer) continue;
    for (const other of world.kingdoms) {
      if (other.id === k.id) continue;
      const rel = getRelation(dip, k.id, other.id);
      if (rel.stance === "alliance" || rel.stance === "nap") continue;
      // bordering rivals grate on one another; distant ones cool toward neutral
      const borders = world.provinces.some(
        (p) =>
          p.ownerId === k.id &&
          p.neighbors.some((n) => world.provinces.find((x) => x.id === n)?.ownerId === other.id),
      );
      adjustOpinion(dip, k.id, other.id, borders ? -3 : rel.opinion > 0 ? -1 : 1);
      const temp = temperament(world, k.id);
      const strong = totalStrength(armies, k.id) > totalStrength(armies, other.id) * 1.25;
      if (
        rel.stance === "peace" &&
        rel.opinion < -35 &&
        strong &&
        temp.aggression > 0.55 &&
        r() < temp.aggression * 0.5
      ) {
        setRelation(dip, k.id, other.id, { stance: "war" });
      }
    }
  }
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
