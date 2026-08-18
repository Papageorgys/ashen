import { armyStrength, troopCount, type Army } from "./army";
import { getRelation, type Diplomacy, type Stance } from "./diplomacy";
import { makeRng, type Rng } from "./rng";
import { TERRAIN } from "./terrain";
import type { World } from "./types";

/**
 * Fog of war + espionage. The player does not see the whole world truthfully:
 * they see the land (geography is permanent and known) but political control
 * and hosts only where they hold ground, scout the borders, or have placed a
 * spy. Intelligence carries a confidence — and unspied numbers are only an
 * estimate. A spy network buys the truth, at a price and a risk.
 */

export type VisLevel = "visible" | "known" | "shrouded";

export interface Intel {
  seen: Set<string>; // provinces ever laid eyes on
  lastOwner: Record<string, string | null>; // last-known control of seen provinces
  spies: Record<string, { since: number }>; // rival kingdomId -> our spy there
}

export function makeIntel(): Intel {
  return { seen: new Set(), lastOwner: {}, spies: {} };
}

export const hasSpy = (intel: Intel, kingdomId: string) => !!intel.spies[kingdomId];

/** Provinces the player can currently see: their own, the ground they border,
 *  wherever a host of theirs stands, and every province of a spied realm. */
export function computeVisible(
  world: World,
  armies: Army[],
  intel: Intel,
  playerId: string,
): Set<string> {
  const vis = new Set<string>();
  const reveal = (id: string) => {
    const p = world.provinces.find((x) => x.id === id);
    if (!p || !TERRAIN[p.terrain].land) return;
    vis.add(id);
  };
  for (const p of world.provinces) {
    if (p.ownerId === playerId) {
      reveal(p.id);
      for (const n of p.neighbors) reveal(n);
    }
    if (p.ownerId && hasSpy(intel, p.ownerId)) reveal(p.id);
  }
  for (const a of armies) {
    if (a.ownerId !== playerId) continue;
    reveal(a.provinceId);
    const p = world.provinces.find((x) => x.id === a.provinceId);
    p?.neighbors.forEach(reveal);
  }
  return vis;
}

/** Fold the currently-visible ground into the player's memory. */
export function rememberVisible(world: World, intel: Intel, visible: Set<string>) {
  for (const id of visible) {
    intel.seen.add(id);
    const p = world.provinces.find((x) => x.id === id);
    if (p) intel.lastOwner[id] = p.ownerId;
  }
}

export function visLevel(intel: Intel, visible: Set<string>, id: string): VisLevel {
  if (visible.has(id)) return "visible";
  if (intel.seen.has(id)) return "known";
  return "shrouded";
}

/** A rival's host, as the player perceives it — exact if spied, else a fuzzed
 *  estimate with a confidence. */
export interface ForceReport {
  kingdomId: string;
  kingdomName: string;
  spied: boolean;
  confidence: number; // 0..100
  troops: number; // reported figure (may be fuzzed)
  exact: boolean;
  provinces: number; // visible/known holdings
  stance: Stance;
}

export function forceReport(
  world: World,
  armies: Army[],
  intel: Intel,
  dip: Diplomacy,
  playerId: string,
  kingdomId: string,
): ForceReport {
  const k = world.kingdoms.find((x) => x.id === kingdomId)!;
  const realTroops = armies
    .filter((a) => a.ownerId === kingdomId)
    .reduce((s, a) => s + troopCount(a), 0);
  const spied = hasSpy(intel, kingdomId);
  const provinces = world.provinces.filter(
    (p) => p.ownerId === kingdomId || intel.lastOwner[p.id] === kingdomId,
  ).length;
  const stance = getRelation(dip, playerId, kingdomId).stance;

  if (spied) {
    return {
      kingdomId,
      kingdomName: k.name,
      spied: true,
      confidence: 92,
      troops: realTroops,
      exact: true,
      provinces,
      stance,
    };
  }
  // no spy: a rumour. Fuzz the figure and lower the confidence.
  const r = makeRng((world.seed ^ hash(kingdomId)) >>> 0);
  const err = (r() - 0.5) * 0.5; // ±25%
  const fuzz = Math.max(0, Math.round((realTroops * (1 + err)) / 50) * 50);
  return {
    kingdomId,
    kingdomName: k.name,
    spied: false,
    confidence: 40 + Math.round(r() * 22),
    troops: fuzz,
    exact: false,
    provinces,
    stance,
  };
}

export const SPY_COST = 80;

/** Place a spy in a rival court. */
export function placeSpy(intel: Intel, kingdomId: string, day: number) {
  intel.spies[kingdomId] = { since: Math.floor(day) };
}

/** Each season, a spy may be uncovered — losing the eyes and souring relations. */
export function spyTick(intel: Intel, world: World, dip: Diplomacy, playerId: string, r: Rng) {
  for (const kid of Object.keys(intel.spies)) {
    if (r() < 0.12) {
      delete intel.spies[kid];
      const cur = getRelation(dip, playerId, kid);
      dip[[playerId, kid].sort().join("|")] = {
        ...cur,
        opinion: Math.max(-100, cur.opinion - 20),
      };
    }
  }
  void world;
}

function hash(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
