/**
 * Deterministic, seedable pseudo-randomness for world generation and the
 * simulation. Everything the authoritative sim decides must be reproducible
 * from a seed — no Math.random anywhere in realm code — so the same seed always
 * yields the same world, and a future server can replay it.
 */

/** A small, fast, seedable PRNG (mulberry32). */
export function makeRng(seed: number) {
  let s = seed >>> 0;
  return function next(): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Rng = ReturnType<typeof makeRng>;

/** Hash a string to a 32-bit seed. */
export function hashSeed(str: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** float in [min, max) */
export const rrange = (r: Rng, min: number, max: number) => min + r() * (max - min);
/** integer in [min, max] */
export const rint = (r: Rng, min: number, max: number) => Math.floor(min + r() * (max - min + 1));
/** pick one element */
export const rpick = <T>(r: Rng, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;
/** true with probability p */
export const rchance = (r: Rng, p: number) => r() < p;

/**
 * Smooth value noise on a 2D lattice, seeded. Returns a sampler in [0,1].
 * Used for elevation/moisture fields so terrain forms coherent regions
 * (ranges, basins) rather than salt-and-pepper noise.
 */
export function makeValueNoise(seed: number, gridSize = 8) {
  const rng = makeRng(seed);
  const g = gridSize + 2;
  const lattice: number[] = Array.from({ length: g * g }, () => rng());
  const at = (ix: number, iy: number) => {
    const cx = Math.max(0, Math.min(g - 1, ix));
    const cy = Math.max(0, Math.min(g - 1, iy));
    return lattice[cy * g + cx]!;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  // sample at u,v in [0,1]
  return function sample(u: number, v: number): number {
    const x = u * gridSize;
    const y = v * gridSize;
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = smooth(x - x0);
    const fy = smooth(y - y0);
    const a = at(x0, y0);
    const b = at(x0 + 1, y0);
    const c = at(x0, y0 + 1);
    const d = at(x0 + 1, y0 + 1);
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}

/** Fractal (layered) value noise for richer fields. */
export function makeFractalNoise(seed: number, octaves = 3) {
  const layers = Array.from({ length: octaves }, (_, i) => ({
    noise: makeValueNoise(seed + i * 1013, 4 * (i + 1)),
    amp: 1 / (i + 1),
  }));
  const total = layers.reduce((s, l) => s + l.amp, 0);
  return (u: number, v: number) => layers.reduce((s, l) => s + l.noise(u, v) * l.amp, 0) / total;
}
