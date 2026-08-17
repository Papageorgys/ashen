/**
 * The authoritative world model for the grand-strategy realm.
 *
 * The physical geography (terrain, rivers, coasts, resource sites) is permanent.
 * Political control (province ownership) is a separate, mutable layer that
 * changes as settlements and provinces change hands — borders are the current
 * sphere of control, never painted onto the land itself.
 *
 * This model is a plain serialisable value: the deterministic simulation owns
 * it, the UI only renders it. It can move server-side unchanged.
 */

export type Point = { x: number; y: number };

export type TerrainId =
  "water" | "coast" | "plains" | "farmland" | "forest" | "hills" | "mountains" | "swamp" | "desert";

export type ResourceId = "food" | "wood" | "stone" | "iron" | "gold" | "horses";

export type SettlementTier = "village" | "town" | "city" | "castle" | "fortress" | "port";

export interface Terrain {
  id: TerrainId;
  name: string;
  /** base map fill (permanent geography layer) */
  fill: string;
  /** movement cost multiplier for armies (1 = open) */
  moveCost: number;
  /** defensive bonus for a defender standing here (0..1 added) */
  defense: number;
  land: boolean;
}

export interface Kingdom {
  id: string;
  name: string;
  /** heraldic colour used for the political-control overlay and borders */
  color: string;
  isPlayer: boolean;
  capitalProvinceId: string | null;
}

export interface Settlement {
  id: string;
  name: string;
  tier: SettlementTier;
  provinceId: string;
  pos: Point;
  /** built fortifications / structures (grows over play) */
  fortLevel: number;
}

export interface Province {
  id: string;
  name: string;
  terrain: TerrainId;
  /** organic border polygon in world coords (the cell) */
  polygon: Point[];
  center: Point;
  /** ids of edge-adjacent provinces — the army-movement graph */
  neighbors: string[];
  coastal: boolean;
  /** current political control; null = unclaimed wilderness */
  ownerId: string | null;
  population: number;
  /** base per-turn resource production, derived from geography + buildings */
  production: Partial<Record<ResourceId, number>>;
  settlementId: string | null;
  /** grid coordinates, for generation/debug */
  col: number;
  row: number;
}

export interface River {
  id: string;
  /** polyline following province seams from highland to sea */
  path: Point[];
}

export interface Road {
  id: string;
  path: Point[];
  fromSettlement: string;
  toSettlement: string;
}

/** a crossing where a road meets a river — a strategic objective */
export interface Bridge {
  id: string;
  pos: Point;
}

export interface World {
  seed: number;
  width: number;
  height: number;
  provinces: Province[];
  settlements: Settlement[];
  kingdoms: Kingdom[];
  rivers: River[];
  roads: Road[];
  bridges: Bridge[];
  playerKingdomId: string;
}
