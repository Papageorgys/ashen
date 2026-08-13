// Map assets: a per-map manifest lets a single painting be delivered as
// composited layers, stitched grid slices, or a zoom-tile pyramid — while the
// RealmAtlas keeps positioning hotspots in plain percentages.
//
// Drop a manifest at /public/maps/<mapId>/manifest.json to opt a map in. With
// no manifest, the atlas falls back to the single /public/maps/<mapId>.png.
//
// Precedence when several are present: tiles > grid > layers > single.

import { useEffect, useState } from "react";

const BASE = `${import.meta.env.BASE_URL}maps/`;

/** A full-map image layer, composited bottom→top; may be toggled off in-app. */
export interface MapLayerDef {
  id: string;
  src: string;
  /** show a toggle chip for this layer */
  toggle?: boolean;
  /** start hidden when false (default: shown) */
  default?: boolean;
  /** CSS mix-blend-mode for the layer */
  blend?: string;
}

/** One painting cut into rows×cols equal slices; `pattern` uses {r} and {c}. */
export interface MapGridDef {
  rows: number;
  cols: number;
  pattern: string;
}

/** One zoom level of a tile pyramid: a cols×rows grid of tiles. */
export interface MapTileLevel {
  z: number;
  cols: number;
  rows: number;
}

/** A tile pyramid; `pattern` uses {z}, {x}, {y}. Sharper levels load as you zoom. */
export interface MapTilesDef {
  pattern: string;
  levels: MapTileLevel[];
}

export interface MapManifest {
  /** native pixel size of the source art (informational) */
  width?: number;
  height?: number;
  /** single-image base; defaults to <mapId>.png under the map folder */
  single?: string;
  layers?: MapLayerDef[];
  grid?: MapGridDef;
  tiles?: MapTilesDef;
}

/** Absolute URL for a file inside a map's asset folder. */
export function mapAssetUrl(id: string, file: string): string {
  return `${BASE}${id}/${file}`;
}

/**
 * Load a map's manifest, or null if it has none (→ single-PNG fallback).
 * Returns null while loading too, so callers should keep their fallback ready.
 */
export function useMapManifest(id: string): MapManifest | null {
  const [manifest, setManifest] = useState<MapManifest | null>(null);
  useEffect(() => {
    let live = true;
    setManifest(null);
    fetch(`${BASE}${id}/manifest.json`, { cache: "force-cache" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: MapManifest | null) => {
        if (live) setManifest(j ?? null);
      })
      .catch(() => {
        if (live) setManifest(null);
      });
    return () => {
      live = false;
    };
  }, [id]);
  return manifest;
}
