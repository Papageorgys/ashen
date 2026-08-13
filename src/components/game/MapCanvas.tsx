import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  mapAssetUrl,
  type MapGridDef,
  type MapLayerDef,
  type MapManifest,
  type MapTilesDef,
} from "@/lib/game/mapAssets";

/**
 * Renders a map's base art from its manifest — as a zoom-tile pyramid, stitched
 * grid slices, composited layers, or a single image. The result fills its parent
 * (absolute inset-0) so the RealmAtlas can pan/zoom it and lay hotspots on top.
 *
 * Precedence: tiles > grid > layers > single.
 */
export function MapCanvas({
  id,
  manifest,
  zoom,
  maxZoom,
  interactive = false,
}: {
  id: string;
  manifest: MapManifest;
  zoom: number;
  maxZoom: number;
  interactive?: boolean;
}) {
  if (manifest.tiles)
    return <TileBase id={id} tiles={manifest.tiles} zoom={zoom} maxZoom={maxZoom} />;
  if (manifest.grid) return <GridBase id={id} grid={manifest.grid} />;
  if (manifest.layers?.length)
    return <LayerBase id={id} layers={manifest.layers} interactive={interactive} />;
  return (
    <img
      src={mapAssetUrl(id, manifest.single ?? `${id}.png`)}
      alt=""
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

function GridBase({ id, grid }: { id: string; grid: MapGridDef }) {
  const cells = [];
  for (let r = 0; r < grid.rows; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const file = grid.pattern.replace("{r}", String(r)).replace("{c}", String(c));
      cells.push(
        <img
          key={`${r}-${c}`}
          src={mapAssetUrl(id, file)}
          alt=""
          className="absolute object-cover"
          style={{
            left: `${(c / grid.cols) * 100}%`,
            top: `${(r / grid.rows) * 100}%`,
            width: `${100 / grid.cols}%`,
            height: `${100 / grid.rows}%`,
          }}
        />,
      );
    }
  }
  return <div className="absolute inset-0">{cells}</div>;
}

function LayerBase({
  id,
  layers,
  interactive,
}: {
  id: string;
  layers: MapLayerDef[];
  interactive: boolean;
}) {
  const [hidden, setHidden] = useState<Record<string, boolean>>(() => {
    const h: Record<string, boolean> = {};
    layers.forEach((l) => {
      if (l.default === false) h[l.id] = true;
    });
    return h;
  });
  const toggleable = layers.filter((l) => l.toggle);
  return (
    <div className="absolute inset-0">
      {layers.map((l) =>
        hidden[l.id] ? null : (
          <img
            key={l.id}
            src={mapAssetUrl(id, l.src)}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            style={
              l.blend ? { mixBlendMode: l.blend as React.CSSProperties["mixBlendMode"] } : undefined
            }
          />
        ),
      )}
      {interactive && toggleable.length > 0 && (
        <div className="pointer-events-auto absolute right-2 top-2 z-10 flex max-w-[60%] flex-wrap justify-end gap-1">
          {toggleable.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setHidden((h) => ({ ...h, [l.id]: !h[l.id] }))}
              className={cn(
                "rounded-sm border bg-black/60 px-1.5 py-0.5 font-display text-[9px] uppercase tracking-wider transition-colors",
                hidden[l.id]
                  ? "border-white/15 text-muted-foreground hover:text-gold/80"
                  : "border-gold/50 text-gold",
              )}
            >
              {l.id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TileBase({
  id,
  tiles,
  zoom,
  maxZoom,
}: {
  id: string;
  tiles: MapTilesDef;
  zoom: number;
  maxZoom: number;
}) {
  // choose a level from the current zoom, coarsest (fewest tiles) first
  const level = useMemo(() => {
    const levels = [...tiles.levels].sort((a, b) => a.cols * a.rows - b.cols * b.rows);
    if (levels.length === 0) return null;
    const span = Math.max(1, maxZoom - 1);
    const idx = Math.min(
      levels.length - 1,
      Math.max(0, Math.round(((zoom - 1) / span) * (levels.length - 1))),
    );
    return levels[idx] ?? levels[levels.length - 1];
  }, [tiles.levels, zoom, maxZoom]);

  if (!level) return null;
  const imgs = [];
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const file = tiles.pattern
        .replace("{z}", String(level.z))
        .replace("{x}", String(x))
        .replace("{y}", String(y));
      imgs.push(
        <img
          key={`${x}-${y}`}
          src={mapAssetUrl(id, file)}
          alt=""
          className="absolute object-cover"
          style={{
            left: `${(x / level.cols) * 100}%`,
            top: `${(y / level.rows) * 100}%`,
            width: `${100 / level.cols}%`,
            height: `${100 / level.rows}%`,
          }}
        />,
      );
    }
  }
  return <div className="absolute inset-0">{imgs}</div>;
}
