/**
 * AtlasAtmosphere — a light, cinematic overlay for the war-table map: warm
 * torch-glow pooling in from the frame corners and a soft top wash, so the map
 * reads as a firelit table rather than a flat image. Purely decorative
 * (`pointer-events-none`), sits above the art and below the interactive
 * hotspots. Static SVG gradients — SSR-safe, no motion.
 *
 * The torches stay warm at all hours; the map paints its own Long-Night cool
 * tint on a layer above this one, so this only supplies the firelight beneath.
 */
export function AtlasAtmosphere() {
  return (
    <svg
      viewBox="0 0 100 62"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 z-[7] h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="atm-corner" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffb04a" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ffb04a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="atm-top" cx="50%" cy="0%" r="75%">
          <stop offset="0%" stopColor="#ffcf8a" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="62" fill="url(#atm-top)" />
      <ellipse cx="0" cy="0" rx="34" ry="26" fill="url(#atm-corner)" />
      <ellipse cx="100" cy="0" rx="34" ry="26" fill="url(#atm-corner)" />
      <ellipse cx="0" cy="62" rx="30" ry="24" fill="url(#atm-corner)" />
      <ellipse cx="100" cy="62" rx="30" ry="24" fill="url(#atm-corner)" />
    </svg>
  );
}
