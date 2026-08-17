// War Logistics — the dark-ages supply chain that feeds the war. A full loop,
// modelled the way a medieval domain actually worked:
//
//   resource nodes (worked by peasants, driven by morale)
//     → raw materials pile up at the node
//       → a CARAVAN hauls them to the city (slow, and risky under the Long Night)
//         → the city stockpiles the raw
//           → workshops CRAFT raw into finished goods
//             → food · weapons · armour · mounts
//               → shipped to the front as war supply (and the food feeds the
//                 workers, whose morale drives the whole chain — a real loop).
//
// The domain is a pure, deterministic state machine advanced by elapsed time, so
// it ticks whether or not the player is watching, and it is fully testable.

/* --------------------------------- Types ----------------------------------- */

export type Raw = "grain" | "timber" | "iron" | "livestock";
export type Good = "rations" | "weapons" | "armour" | "mounts";
export type NodeType = "farmland" | "woodland" | "mine" | "pasture";
export type Workshop = "mill" | "smithy" | "stable";
export type SmithyFocus = "weapons" | "armour";

export const RAW_LABEL: Record<Raw, string> = {
  grain: "Grain",
  timber: "Timber",
  iron: "Iron",
  livestock: "Livestock",
};
export const RAW_GLYPH: Record<Raw, string> = {
  grain: "🌾",
  timber: "🪵",
  iron: "⛏",
  livestock: "🐄",
};
export const GOOD_LABEL: Record<Good, string> = {
  rations: "Rations",
  weapons: "Weapons",
  armour: "Armour",
  mounts: "Mounts",
};
export const GOOD_GLYPH: Record<Good, string> = {
  rations: "🍞",
  weapons: "⚔",
  armour: "🛡",
  mounts: "🐎",
};

export interface NodeDef {
  type: NodeType;
  raw: Raw;
  label: string;
  glyph: string;
  /** raw units produced per hour at full workers, full morale, level 1 */
  base: number;
  /** cost to raise a new one */
  gold: number;
  timber: number;
}

export const NODE_DEF: Record<NodeType, NodeDef> = {
  farmland: {
    type: "farmland",
    raw: "grain",
    label: "Farmland",
    glyph: "🌾",
    base: 10,
    gold: 300,
    timber: 20,
  },
  woodland: {
    type: "woodland",
    raw: "timber",
    label: "Woodland Camp",
    glyph: "🪵",
    base: 8,
    gold: 250,
    timber: 0,
  },
  mine: {
    type: "mine",
    raw: "iron",
    label: "Iron Mine",
    glyph: "⛏",
    base: 5,
    gold: 500,
    timber: 40,
  },
  pasture: {
    type: "pasture",
    raw: "livestock",
    label: "Pasture",
    glyph: "🐄",
    base: 4,
    gold: 400,
    timber: 30,
  },
};
export const NODE_TYPES = Object.keys(NODE_DEF) as NodeType[];

export interface WorkshopDef {
  id: Workshop;
  label: string;
  glyph: string;
  blurb: string;
}
export const WORKSHOP_DEF: Record<Workshop, WorkshopDef> = {
  mill: { id: "mill", label: "Mill & Granary", glyph: "🍞", blurb: "Grain → Rations." },
  smithy: {
    id: "smithy",
    label: "Smithy",
    glyph: "🛠",
    blurb: "Iron (+timber) → Weapons or Armour.",
  },
  stable: { id: "stable", label: "Stable", glyph: "🐎", blurb: "Livestock (+grain) → Mounts." },
};
export const WORKSHOP_TYPES = Object.keys(WORKSHOP_DEF) as Workshop[];

/** What a finished good is worth when shipped to the front as war supply. */
export const SUPPLY_VALUE: Record<Good, number> = { rations: 1, weapons: 4, armour: 4, mounts: 6 };

export const WORKER_CAP_PER_NODE = 5;
export const NODE_RAW_CAP = 240; // raw rots / overflows past this — haul it out
export const CARAVAN_MS = 18 * 60 * 1000; // a caravan's road time
export const HIRE_COST = 60; // gold per laborer
export const NODE_UPGRADE_MAX = 3;

export interface DomainNode {
  id: string;
  type: NodeType;
  level: number;
  workers: number;
  /** raw piled up at the node, awaiting a caravan */
  raw: number;
}

export interface Caravan {
  id: string;
  raw: Raw;
  qty: number;
  arrivesAt: number;
}

export interface DomainState {
  tickAt: number;
  /** hired laborers (the workforce) */
  workers: number;
  /** 0..100 — fed workers work hard, starving ones do not */
  morale: number;
  nodes: DomainNode[];
  stock: Partial<Record<Raw, number>>;
  goods: Partial<Record<Good, number>>;
  caravans: Caravan[];
  workshops: Partial<Record<Workshop, number>>;
  smithyFocus: SmithyFocus;
}

/* -------------------------------- Helpers ---------------------------------- */

export function assignedWorkers(d: DomainState): number {
  return d.nodes.reduce((n, node) => n + node.workers, 0);
}
export function freeWorkers(d: DomainState): number {
  return Math.max(0, d.workers - assignedWorkers(d));
}
export function nodeLevelMult(level: number): number {
  return 1 + (level - 1) * 0.5;
}
/** A node's raw output per hour, given the domain's morale. */
export function nodeOutputPerHour(node: DomainNode, morale: number): number {
  const def = NODE_DEF[node.type];
  const workerFrac = node.workers / WORKER_CAP_PER_NODE;
  const moraleFrac = 0.4 + (morale / 100) * 0.6;
  return def.base * workerFrac * moraleFrac * nodeLevelMult(node.level);
}
/** Rations the workforce eats per hour. */
export function rationNeedPerHour(d: DomainState): number {
  return d.workers * 0.5;
}
export function wsLevel(d: DomainState, w: Workshop): number {
  return d.workshops[w] ?? 0;
}

function add<T extends string>(rec: Partial<Record<T, number>>, key: T, n: number) {
  rec[key] = Math.max(0, (rec[key] ?? 0) + n);
}

/* -------------------------------- The tick --------------------------------- */

/**
 * Advance the domain to `now`: deliver caravans, work the nodes, feed the
 * workforce (and move morale), then run the workshops. Pure — returns a new
 * state, mutating nothing the caller passed.
 */
export function advanceDomain(
  prev: DomainState,
  now: number,
  opts: { longNight?: boolean } = {},
): DomainState {
  let hours = (now - prev.tickAt) / 3_600_000;
  if (hours <= 0.0001) return prev;
  if (hours > 12) hours = 12; // cap a long catch-up

  const d: DomainState = {
    ...prev,
    nodes: prev.nodes.map((n) => ({ ...n })),
    stock: { ...prev.stock },
    goods: { ...prev.goods },
    caravans: prev.caravans.map((c) => ({ ...c })),
    workshops: { ...prev.workshops },
  };
  const night = !!opts.longNight;

  // 1. caravans that have arrived unload into the city (raiders skim the road,
  //    worse when the Long Night is abroad)
  const risk = night ? 0.3 : 0.06;
  d.caravans = d.caravans.filter((c) => {
    if (c.arrivesAt > now) return true;
    add(d.stock, c.raw, Math.round(c.qty * (1 - risk)));
    return false;
  });

  // 2. the nodes are worked — raw piles up at each (until it overflows)
  for (const node of d.nodes) {
    const out = nodeOutputPerHour(node, d.morale) * hours;
    node.raw = Math.min(NODE_RAW_CAP, node.raw + out);
  }

  // 3. feed the workforce, and move morale accordingly
  const need = rationNeedPerHour(d) * hours;
  const have = d.goods.rations ?? 0;
  if (need <= 0) {
    d.morale = Math.min(100, d.morale + 2 * hours);
  } else if (have >= need) {
    d.goods.rations = have - need;
    d.morale = Math.min(100, d.morale + 5 * hours);
  } else {
    d.goods.rations = 0;
    const starved = 1 - have / need;
    d.morale = Math.max(0, d.morale - 12 * hours * starved);
  }
  if (night) d.morale = Math.max(0, d.morale - 3 * hours);

  // 4. the workshops craft raw into finished goods (only what inputs allow)
  const mill = wsLevel(d, "mill");
  if (mill > 0) {
    const g = Math.min(d.stock.grain ?? 0, 6 * mill * hours);
    if (g > 0) {
      add(d.stock, "grain", -g);
      add(d.goods, "rations", g * 1.1);
    }
  }
  const smithy = wsLevel(d, "smithy");
  if (smithy > 0) {
    const cap = 2 * smithy * hours;
    if (d.smithyFocus === "weapons") {
      const n = Math.min(cap, (d.stock.iron ?? 0) / 3);
      if (n > 0) {
        add(d.stock, "iron", -3 * n);
        add(d.goods, "weapons", n);
      }
    } else {
      const n = Math.min(cap, (d.stock.iron ?? 0) / 2, d.stock.timber ?? 0);
      if (n > 0) {
        add(d.stock, "iron", -2 * n);
        add(d.stock, "timber", -n);
        add(d.goods, "armour", n);
      }
    }
  }
  const stable = wsLevel(d, "stable");
  if (stable > 0) {
    const n = Math.min(
      1.5 * stable * hours,
      (d.stock.livestock ?? 0) / 2,
      (d.stock.grain ?? 0) / 3,
    );
    if (n > 0) {
      add(d.stock, "livestock", -2 * n);
      add(d.stock, "grain", -3 * n);
      add(d.goods, "mounts", n);
    }
  }

  d.tickAt = now;
  return d;
}

/** A fresh domain — a modest holdfast to bootstrap the supply chain. */
export function initialDomain(now: number): DomainState {
  return {
    tickAt: now,
    workers: 4,
    morale: 60,
    nodes: [
      { id: "n_farm", type: "farmland", level: 1, workers: 2, raw: 0 },
      { id: "n_wood", type: "woodland", level: 1, workers: 2, raw: 0 },
    ],
    stock: { timber: 30 },
    goods: { rations: 24 },
    caravans: [],
    workshops: { mill: 1 },
    smithyFocus: "weapons",
  };
}

/** Total war supply a full shipment of the current goods would yield. */
export function shipmentValue(d: DomainState): number {
  return (Object.keys(d.goods) as Good[]).reduce(
    (n, g) => n + Math.floor(d.goods[g] ?? 0) * SUPPLY_VALUE[g],
    0,
  );
}

/** A short read on where the domain is heading, for the UI. */
export function moraleTrend(d: DomainState): "well-fed" | "fed" | "hungry" | "starving" {
  const ratio = (d.goods.rations ?? 0) / Math.max(1, rationNeedPerHour(d));
  if (ratio >= 3) return "well-fed";
  if (ratio >= 1) return "fed";
  if (ratio > 0) return "hungry";
  return "starving";
}
