import { generateWorld } from "./worldgen";
import { spawnStartingArmies, type Army } from "./army";
import { seedLedger, type Ledger } from "./kingdom";
import { makeCouncil, type Advisor } from "./council";
import { makeDiplomacy, type Diplomacy } from "./diplomacy";
import type { RealmState } from "./sim";

/**
 * Save-game persistence. The world's geometry is fully deterministic from its
 * seed, so a save need only carry the seed and the MUTABLE layer — province
 * control, hosts, the ledger, diplomacy, the clock. On load the world is
 * regenerated and the mutations are laid back over it. Compact and exact.
 *
 * localStorage for now (single-player); the same shape lifts to a server row
 * unchanged when the game goes authoritative-backend / multiplayer.
 */

const KEY = "ashen.realm.save.v1";

export interface RealmWorld {
  state: RealmState;
  ledger: Ledger;
  council: Advisor[];
  dip: Diplomacy;
  gen: number;
}

interface SaveData {
  v: 1;
  gen: number;
  day: number;
  ledger: Ledger;
  dip: Diplomacy;
  armies: Army[];
  ownership: (string | null)[];
}

/** Build a fresh realm for a given generation (seed = aethyr-<gen>). */
export function freshRealm(gen: number): RealmWorld {
  const world = generateWorld({ seed: `aethyr-${gen}` });
  return {
    state: { world, armies: spawnStartingArmies(world), day: 0 },
    ledger: seedLedger(world, world.playerKingdomId),
    council: makeCouncil(world),
    dip: makeDiplomacy(world),
    gen,
  };
}

function serialize(rw: RealmWorld): SaveData {
  return {
    v: 1,
    gen: rw.gen,
    day: rw.state.day,
    ledger: rw.ledger,
    dip: rw.dip,
    armies: rw.state.armies,
    ownership: rw.state.world.provinces.map((p) => p.ownerId),
  };
}

export function saveRealm(rw: RealmWorld): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(serialize(rw)));
  } catch {
    /* storage full or unavailable — a lost autosave is not fatal */
  }
}

/** Load and rehydrate a saved realm, or null if none / incompatible. */
export function loadRealm(): RealmWorld | null {
  if (typeof window === "undefined") return null;
  let data: SaveData | null = null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    data = JSON.parse(raw) as SaveData;
  } catch {
    return null;
  }
  if (!data || data.v !== 1) return null;

  const world = generateWorld({ seed: `aethyr-${data.gen}` });
  if (data.ownership.length !== world.provinces.length) return null; // schema drift
  world.provinces.forEach((p, i) => {
    p.ownerId = data!.ownership[i] ?? null;
  });
  return {
    state: { world, armies: data.armies, day: data.day },
    ledger: data.ledger,
    council: makeCouncil(world),
    dip: data.dip,
    gen: data.gen,
  };
}

export function clearRealm(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function hasSave(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return !!window.localStorage.getItem(KEY);
  } catch {
    return false;
  }
}
