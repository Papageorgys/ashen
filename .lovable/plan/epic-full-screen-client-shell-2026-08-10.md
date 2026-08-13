# Epic Full-Screen Client Shell

Turn the current page-in-a-box layout into an immersive, edge-to-edge game client that fills the viewport, with atmosphere, depth and moments of awe — no change to game rules or balance.

## What changes for you

- The game fills the whole screen. No centered max-width column, no page scroll — the app becomes a fixed-height client: banner rail on the left, main stage in the middle, live feed docked right, each scrolling on its own.
- An atmospheric backdrop behind everything: deep ember-lit vignette, faint parchment grain, slow drifting embers and a subtle torchlight glow that never distracts from the panels.
- A real title bar instead of a thin auth strip: clan crest, clan name and motto in Cinzel, gold/reputation/banner counters as engraved readouts, and the sign-in/out control tucked to the right.
- Panels get weight: layered borders with gold corner filigree, inset shadows, and headers that read like carved plaques rather than plain text.
- Tab switching becomes a soft cross-fade and rise instead of a hard swap; the icon rail highlights with a gold glow and animated active marker.
- Moments of awe: a full-screen gilded flourish when you found a clan, level a banner or take Ravenhold; gold/reputation counters roll up instead of jumping; loot and level-up events pulse in the feed.
- The Founding screen becomes a full-bleed cinematic: darkened hero backdrop, oversized title, the three steps as a lit path.
- Mobile keeps working: rail collapses to a bottom icon bar, feed becomes a pull-up drawer.

## Technical approach

- `src/styles.css`: add ambience tokens (`--glow-gold`, `--shadow-deep`, `--gradient-ember`, `--texture-grain`), `@utility` classes for `panel-ornate`, `plaque`, `ambient-stage`, and keyframes for ember drift, glow pulse, and panel rise. All values as oklch tokens — no hardcoded colors.
- New `src/components/game/AmbientStage.tsx`: fixed-position backdrop (layered radial gradients, SVG grain, CSS-animated ember particles) rendered behind the app shell, `pointer-events-none`, honoring `prefers-reduced-motion`.
- New `src/components/game/ClientShell.tsx`: `h-dvh grid grid-rows-[auto_minmax(0,1fr)]` shell with `grid-cols-[6rem_minmax(0,1fr)_20rem]` body; each region `min-h-0 overflow-y-auto`. Replaces the `max-w-7xl` wrapper in `src/routes/index.tsx`.
- New `src/components/game/TitleBar.tsx`: crest + clan identity + resource readouts + auth control, using existing `ClanHeader` data; `ClanHeader` is slimmed to avoid duplication.
- New `src/components/game/Flourish.tsx`: portal-based full-screen celebration overlay driven by a small event queue; triggered from existing state transitions observed in `src/routes/index.tsx` (clan level, banner count, castle ownership) via `useEffect` diffing — no engine changes.
- New `src/components/game/Counter.tsx`: `requestAnimationFrame` tween for numeric readouts.
- `src/routes/index.tsx`: swap layout wrappers, keep `Tabs`/`TabsContent` values and all existing panels untouched; add `data-[state=active]:animate-fade-in` to content.
- Responsive: rail becomes bottom bar under `lg`, feed moves into a Sheet drawer; per the responsive rules, header rows use `grid-cols-[minmax(0,1fr)_auto]` with `min-w-0` / `shrink-0` / `truncate`.
- Verification: Playwright screenshots at 1280x1800 and mobile width to confirm no page-level scrollbar, no clipped panels, and readable contrast.

No game logic, engine, or backend files are modified.
