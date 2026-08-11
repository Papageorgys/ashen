import atlas from "./atlas.html?raw";

/**
 * The War Table's illustrated atlas — a self-contained Lineage 2-style hand-drawn
 * map of the realm and its seven fallen capitals. Rendered in a sandboxed iframe so
 * its canvas/SVG bake stays isolated from the game shell (and SSR-safe: srcDoc is a
 * static string, no window access at module scope on our side).
 */
export function WorldAtlas() {
  return (
    <div className="h-[calc(100dvh-9rem)] w-full overflow-hidden rounded-sm border border-border/60 bg-background">
      <iframe
        title="World Atlas"
        srcDoc={"<!doctype html>\n" + atlas}
        sandbox="allow-scripts"
        className="h-full w-full border-0"
      />
    </div>
  );
}
