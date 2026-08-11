import { memo, useEffect, useRef } from "react";
import { ZONE_POS, HOME_POS, LANDMARKS } from "@/lib/game/data";
import { bakeAtlasTerrain, type MapPoint } from "@/lib/game/atlasTerrain";

/** Every marker the game draws — zones, landmarks, the keep — gets land stamped
 * under it so none floats in the sea gulf. */
const LAND_STAMPS: MapPoint[] = [
  HOME_POS,
  ...Object.values(ZONE_POS),
  ...LANDMARKS.map((l) => l.pos),
];

/**
 * The illustrated terrain plate behind the War Table map. A single procedural
 * canvas bake (hillshaded relief, sea, mountains) stretched to fill the map,
 * sharing the 100x62 space with the interactive zone/banner overlay above it.
 * The bake runs once on the client (useEffect), never during SSR.
 */
export const AtlasTerrain = memo(function AtlasTerrain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (cv) bakeAtlasTerrain(cv, LAND_STAMPS);
  }, []);
  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 h-full w-full"
      style={{ imageRendering: "auto" }}
    />
  );
});
