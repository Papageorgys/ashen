import { ECONOMY, FERTILITY, TERRAIN } from "./terrain";
import { holdName, kingdomName, placeName } from "./names";
import { hashSeed, makeFractalNoise, makeRng, rint, rpick, rrange, type Rng } from "./rng";
import type {
  Kingdom,
  Point,
  Province,
  Road,
  River,
  Bridge,
  Settlement,
  SettlementTier,
  TerrainId,
  World,
} from "./types";

const KINGDOM_COLORS = [
  "#c0562f", // rust
  "#3f7cc0", // steel blue
  "#5a9a55", // moss
  "#9a5ab0", // amethyst
  "#c9a13f", // amber
];

type GenOpts = {
  seed?: string | number;
  cols?: number;
  rows?: number;
  width?: number;
  height?: number;
};

const centroid = (poly: Point[]): Point => {
  let x = 0,
    y = 0;
  for (const p of poly) {
    x += p.x;
    y += p.y;
  }
  return { x: x / poly.length, y: y / poly.length };
};

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Generate a complete region: permanent geography + initial political control. */
export function generateWorld(opts: GenOpts = {}): World {
  const width = opts.width ?? 1200;
  const height = opts.height ?? 820;
  const cols = opts.cols ?? 8;
  const rows = opts.rows ?? 6;
  const seedNum = typeof opts.seed === "string" ? hashSeed(opts.seed) : (opts.seed ?? 20260817);
  const r = makeRng(seedNum);

  // --- perturbed lattice: organic, shared province borders ------------------
  const cellW = width / cols;
  const cellH = height / rows;
  const jitterN = makeFractalNoise(seedNum + 7, 2);
  const lattice: Point[][] = [];
  for (let j = 0; j <= rows; j++) {
    lattice[j] = [];
    for (let i = 0; i <= cols; i++) {
      const edge = i === 0 || i === cols || j === 0 || j === rows;
      const jx = edge ? 0 : (jitterN(i / cols, j / rows) - 0.5) * cellW * 0.7;
      const jy = edge ? 0 : (jitterN(i / cols + 3.1, j / rows + 1.7) - 0.5) * cellH * 0.7;
      lattice[j]![i] = { x: i * cellW + jx, y: j * cellH + jy };
    }
  }

  // --- fields ---------------------------------------------------------------
  const elevN = makeFractalNoise(seedNum + 101, 3);
  const moistN = makeFractalNoise(seedNum + 211, 3);

  const idOf = (col: number, row: number) => `p_${col}_${row}`;

  // --- provinces (geography) ------------------------------------------------
  const provinces: Province[] = [];
  const byId = new Map<string, Province>();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const poly = [
        lattice[row]![col]!,
        lattice[row]![col + 1]!,
        lattice[row + 1]![col + 1]!,
        lattice[row + 1]![col]!,
      ];
      const c = centroid(poly);
      const u = c.x / width;
      const v = c.y / height;
      // expand the noise around its midpoint so extremes (peaks, basins) appear
      const expand = (x: number, k: number) => Math.max(0, Math.min(1, (x - 0.5) * k + 0.5));
      const base = elevN(u, v);
      // sea pushes in from the bottom edge → a coastline, some islands off it.
      // land amount is decided on the raw field so terrain variety stays intact.
      const seaBias = Math.max(0, (v - 0.6) / 0.4) * 0.5;
      const terrain: TerrainId =
        base - seaBias < 0.32
          ? "water"
          : classifyTerrain(expand(base, 1.9), expand(moistN(u, v), 1.7));
      const prov: Province = {
        id: idOf(col, row),
        name: placeName(r),
        terrain,
        polygon: poly,
        center: c,
        neighbors: [],
        coastal: false,
        ownerId: null,
        population: 0,
        production: {},
        settlementId: null,
        col,
        row,
      };
      provinces.push(prov);
      byId.set(prov.id, prov);
    }
  }

  // adjacency (shared edges only → the movement graph)
  for (const p of provinces) {
    const n: string[] = [];
    if (p.col > 0) n.push(idOf(p.col - 1, p.row));
    if (p.col < cols - 1) n.push(idOf(p.col + 1, p.row));
    if (p.row > 0) n.push(idOf(p.col, p.row - 1));
    if (p.row < rows - 1) n.push(idOf(p.col, p.row + 1));
    p.neighbors = n;
  }

  // coast + farmland refinement (needs neighbours)
  for (const p of provinces) {
    if (!TERRAIN[p.terrain].land) continue;
    const touchesSea = p.neighbors.some((id) => !TERRAIN[byId.get(id)!.terrain].land);
    p.coastal = touchesSea;
    if (
      p.terrain === "plains" &&
      (touchesSea || moistN(p.center.x / width + 5, p.center.y / height) > 0.5)
    ) {
      if (r() < 0.5) p.terrain = "farmland";
    }
    if (p.terrain === "coast" || (p.coastal && p.terrain === "plains")) {
      // keep as-is; coastal plains stay productive
    }
  }

  // economy + population from geography
  for (const p of provinces) {
    if (!TERRAIN[p.terrain].land) continue;
    p.production = { ...ECONOMY[p.terrain] };
    if (p.coastal) p.production.gold = (p.production.gold ?? 0) + 3; // ports/fishing
    const fert = FERTILITY[p.terrain];
    p.population = Math.round(fert * rrange(r, 0.55, 1.15));
  }

  const landProvinces = provinces.filter((p) => TERRAIN[p.terrain].land);

  // --- rivers: springs in the highlands flow down the seams to the sea ------
  const rivers = traceRivers(provinces, byId, elevN, width, height, r);

  // --- settlements ----------------------------------------------------------
  const settlements: Settlement[] = [];
  assignSettlements(landProvinces, byId, rivers, settlements, r);

  // --- kingdoms + political control -----------------------------------------
  const kingdoms = assignControl(provinces, landProvinces, byId, settlements, r);
  const playerKingdomId = kingdoms.find((k) => k.isPlayer)!.id;

  // --- roads: bind each realm's settlements; bridges where they cross rivers -
  const { roads, bridges } = buildRoads(provinces, byId, settlements, rivers);

  return {
    seed: seedNum,
    width,
    height,
    provinces,
    settlements,
    kingdoms,
    rivers,
    roads,
    bridges,
    playerKingdomId,
  };
}

/** Classify a land province (water is decided separately, before this). */
function classifyTerrain(elev: number, moist: number): TerrainId {
  if (elev > 0.74) return "mountains";
  if (elev > 0.58) return "hills";
  if (moist > 0.6) return elev < 0.42 ? "swamp" : "forest";
  if (moist < 0.32) return elev < 0.48 ? "desert" : "plains";
  return moist > 0.48 ? "forest" : "plains";
}

function traceRivers(
  provinces: Province[],
  byId: Map<string, Province>,
  elevN: (u: number, v: number) => number,
  width: number,
  height: number,
  r: Rng,
): River[] {
  const rivers: River[] = [];
  const elevAt = (p: Province) => elevN(p.center.x / width, p.center.y / height);
  const springs = provinces
    .filter((p) => p.terrain === "mountains" || p.terrain === "hills")
    .sort((a, b) => elevAt(b) - elevAt(a))
    .slice(0, 10);
  let made = 0;
  for (const spring of springs) {
    if (made >= 4) break;
    if (r() < 0.4) continue;
    const path: Point[] = [spring.center];
    let cur = spring;
    const seen = new Set<string>([cur.id]);
    for (let step = 0; step < 12; step++) {
      const lowers = cur.neighbors
        .map((id) => byId.get(id)!)
        .filter((n) => !seen.has(n.id))
        .sort((a, b) => elevAt(a) - elevAt(b));
      const nxt = lowers[0];
      if (!nxt) break;
      path.push(mid(cur.center, nxt.center));
      seen.add(nxt.id);
      if (!TERRAIN[nxt.terrain].land) {
        path.push(nxt.center);
        break;
      }
      cur = nxt;
    }
    if (path.length >= 3) {
      rivers.push({ id: `r_${made}`, path });
      made++;
    }
  }
  return rivers;
}

function assignSettlements(
  land: Province[],
  byId: Map<string, Province>,
  rivers: River[],
  out: Settlement[],
  r: Rng,
) {
  // strategic value: guards a pass/crossing/coast, or holds many people
  const nearRiver = (p: Province) =>
    rivers.some((rv) => rv.path.some((pt) => dist(pt, p.center) < 120));
  const scored = land
    .map((p) => {
      let s = p.population / 400;
      if (p.terrain === "mountains" || p.terrain === "hills") s += 3;
      if (nearRiver(p)) s += 2.5;
      if (p.coastal) s += 1.5;
      return { p, s };
    })
    .sort((a, b) => b.s - a.s);

  const castleCount = Math.min(11, Math.max(8, Math.round(land.length * 0.28)));
  scored.forEach(({ p }, i) => {
    let tier: SettlementTier;
    if (i < castleCount) tier = p.terrain === "mountains" ? "fortress" : "castle";
    else if (p.coastal && r() < 0.5) tier = "port";
    else if (p.population > 1300) tier = "city";
    else if (p.population > 800) tier = "town";
    else tier = "village";
    const isHold = tier === "castle" || tier === "fortress";
    const jitter = { x: rrange(r, -18, 18), y: rrange(r, -14, 14) };
    const st: Settlement = {
      id: `s_${p.id}`,
      name: isHold ? holdName(r) : placeName(r),
      tier,
      provinceId: p.id,
      pos: { x: p.center.x + jitter.x, y: p.center.y + jitter.y },
      fortLevel:
        tier === "fortress"
          ? 3
          : tier === "castle"
            ? 2
            : tier === "town" || tier === "city"
              ? 1
              : 0,
    };
    out.push(st);
    byId.get(p.id)!.settlementId = st.id;
  });
}

function assignControl(
  provinces: Province[],
  land: Province[],
  byId: Map<string, Province>,
  settlements: Settlement[],
  r: Rng,
): Kingdom[] {
  const stById = new Map(settlements.map((s) => [s.id, s]));
  // capital candidates: cities/fortresses/castles, spread across the map
  const capitals = land
    .filter((p) => {
      const s = p.settlementId ? stById.get(p.settlementId) : null;
      return s && (s.tier === "city" || s.tier === "fortress" || s.tier === "castle");
    })
    .sort((a, b) => b.population - a.population);

  // choose 3 AI seeds far apart + 1 player seed
  const seeds: Province[] = [];
  const far = (p: Province) => seeds.every((s) => dist(s.center, p.center) > 300);
  for (const c of capitals) {
    if (seeds.length >= 4) break;
    if (far(c)) seeds.push(c);
  }
  while (seeds.length < 4 && capitals.length) seeds.push(rpick(r, capitals));

  const kingdoms: Kingdom[] = [];
  // player = the seed nearest the map's lower-left (their small home corner)
  const playerSeed = seeds
    .slice()
    .sort((a, b) => a.center.x + (820 - a.center.y) - (b.center.x + (820 - b.center.y)))[0]!;

  seeds.forEach((seed, i) => {
    const isPlayer = seed === playerSeed;
    kingdoms.push({
      id: `k_${i}`,
      name: isPlayer ? "Your House" : kingdomName(r),
      color: KINGDOM_COLORS[i % KINGDOM_COLORS.length]!,
      isPlayer,
      capitalProvinceId: seed.id,
    });
  });
  const kingdomOfSeed = new Map(seeds.map((s, i) => [s.id, kingdoms[i]!.id]));

  // multi-source BFS: each land province joins its nearest capital by hops
  const ownerHops = new Map<string, { owner: string; hops: number }>();
  const queue: { id: string; owner: string; hops: number }[] = [];
  for (const seed of seeds) {
    ownerHops.set(seed.id, { owner: kingdomOfSeed.get(seed.id)!, hops: 0 });
    queue.push({ id: seed.id, owner: kingdomOfSeed.get(seed.id)!, hops: 0 });
  }
  while (queue.length) {
    const cur = queue.shift()!;
    const p = byId.get(cur.id)!;
    for (const nid of p.neighbors) {
      const n = byId.get(nid)!;
      if (!TERRAIN[n.terrain].land) continue;
      if (ownerHops.has(nid)) continue;
      ownerHops.set(nid, { owner: cur.owner, hops: cur.hops + 1 });
      queue.push({ id: nid, owner: cur.owner, hops: cur.hops + 1 });
    }
  }

  const playerId = kingdoms.find((k) => k.isPlayer)!.id;
  for (const p of land) {
    const rec = ownerHops.get(p.id);
    if (!rec) continue;
    // the player begins small: only their capital + immediate holdings
    if (rec.owner === playerId) {
      p.ownerId = rec.hops <= 1 ? playerId : null;
    } else {
      // AI realms don't blanket the map — distant marches stay wilderness
      p.ownerId = rec.hops <= 3 ? rec.owner : null;
    }
  }
  // guarantee the player holds a couple of villages beyond the seat
  const playerSeats = land.filter((p) => p.ownerId === playerId);
  const capital = byId.get(playerSeed.id)!;
  const nbLand = capital.neighbors
    .map((id) => byId.get(id)!)
    .filter((n) => TERRAIN[n.terrain].land);
  for (const n of nbLand.slice(0, 3)) if (!n.ownerId) n.ownerId = playerId;
  void playerSeats;

  return kingdoms;
}

function segInt(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-6) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}

function buildRoads(
  provinces: Province[],
  byId: Map<string, Province>,
  settlements: Settlement[],
  rivers: River[],
): { roads: Road[]; bridges: Bridge[] } {
  const roads: Road[] = [];
  const bridges: Bridge[] = [];
  const stByProv = new Map(settlements.map((s) => [s.provinceId, s]));
  const seen = new Set<string>();
  // connect adjacent provinces that both hold settlements (roads follow the land)
  for (const p of provinces) {
    const a = stByProv.get(p.id);
    if (!a) continue;
    for (const nid of p.neighbors) {
      const key = [p.id, nid].sort().join("|");
      if (seen.has(key)) continue;
      const b = stByProv.get(nid);
      if (!b) continue;
      seen.add(key);
      const path = [a.pos, mid(a.pos, b.pos), b.pos];
      roads.push({ id: `road_${key}`, path, fromSettlement: a.id, toSettlement: b.id });
      // bridge where the road crosses a river
      for (const rv of rivers) {
        for (let i = 0; i < rv.path.length - 1; i++) {
          const hit = segInt(a.pos, b.pos, rv.path[i]!, rv.path[i + 1]!);
          if (hit) {
            bridges.push({ id: `bridge_${key}_${i}`, pos: hit });
            break;
          }
        }
      }
    }
  }
  return { roads, bridges };
}
