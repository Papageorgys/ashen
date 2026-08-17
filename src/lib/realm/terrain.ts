import type { ResourceId, Terrain, TerrainId } from "./types";

/**
 * Terrain — the permanent geography. Each type carries its gameplay weight:
 * how fast armies cross it, how well a defender holds it, and (via ECONOMY)
 * what the land produces. Geography directly drives movement, warfare and
 * economy, exactly as the design demands.
 */
export const TERRAIN: Record<TerrainId, Terrain> = {
  water: { id: "water", name: "Sea", fill: "#2b4a63", moveCost: Infinity, defense: 0, land: false },
  coast: { id: "coast", name: "Coast", fill: "#6f7f5a", moveCost: 1.1, defense: 0.05, land: true },
  plains: { id: "plains", name: "Plains", fill: "#8a8a4a", moveCost: 1, defense: 0, land: true },
  farmland: {
    id: "farmland",
    name: "Farmland",
    fill: "#a6923f",
    moveCost: 1,
    defense: 0,
    land: true,
  },
  forest: {
    id: "forest",
    name: "Forest",
    fill: "#3f5b34",
    moveCost: 1.6,
    defense: 0.2,
    land: true,
  },
  hills: { id: "hills", name: "Hills", fill: "#7d6a42", moveCost: 1.4, defense: 0.25, land: true },
  mountains: {
    id: "mountains",
    name: "Mountains",
    fill: "#6a5f52",
    moveCost: 2.6,
    defense: 0.45,
    land: true,
  },
  swamp: { id: "swamp", name: "Swamp", fill: "#4c5340", moveCost: 2, defense: 0.1, land: true },
  desert: {
    id: "desert",
    name: "Desert",
    fill: "#b8a05e",
    moveCost: 1.5,
    defense: 0.05,
    land: true,
  },
};

/**
 * Base resource yield per terrain — the economic geography. A mountain realm is
 * rich in iron and stone but starves for grain; a plain feeds armies and breeds
 * horses. This asymmetry is what makes trade and conquest matter.
 */
export const ECONOMY: Record<TerrainId, Partial<Record<ResourceId, number>>> = {
  water: {},
  coast: { food: 6, gold: 5, wood: 2 },
  plains: { food: 9, horses: 4, gold: 2 },
  farmland: { food: 14, gold: 3, horses: 2 },
  forest: { wood: 12, food: 3 },
  hills: { stone: 8, iron: 6, gold: 2 },
  mountains: { iron: 10, stone: 9, gold: 4, food: 0 },
  swamp: { wood: 3, iron: 2 },
  desert: { stone: 4, gold: 3 },
};

/** Rough carrying capacity (starting population seed) by terrain. */
export const FERTILITY: Record<TerrainId, number> = {
  water: 0,
  coast: 900,
  plains: 1100,
  farmland: 1600,
  forest: 600,
  hills: 500,
  mountains: 300,
  swamp: 350,
  desert: 250,
};

export const RESOURCE_LABEL: Record<ResourceId, string> = {
  food: "Grain",
  wood: "Timber",
  stone: "Stone",
  iron: "Iron",
  gold: "Gold",
  horses: "Horses",
};

export const RESOURCE_COLOR: Record<ResourceId, string> = {
  food: "#d8b24a",
  wood: "#7a9a55",
  stone: "#9aa0a6",
  iron: "#b0b6c0",
  gold: "#e7c65a",
  horses: "#c08a5a",
};

export const RESOURCE_ORDER: ResourceId[] = ["food", "wood", "stone", "iron", "gold", "horses"];
