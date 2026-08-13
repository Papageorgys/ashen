# Engraved Champion Portraits

Replace the flat vector faces with inked, woodcut-style busts on parchment — hatched shading, heavy line weight, and a gilded frame. Race shapes the head; class shapes the armour and headgear.

## What changes visually

- **Engraved treatment**: warm parchment ground, cross-hatch shading under the jaw, cheek and brow, ink outlines of varying weight, and a subtle aged-paper grain. No flat pastel fills.
- **Frame**: thin double rule with corner ticks; the Lord keeps a gold frame, ordinary champions get a muted brass one, and fallen champions render desaturated.
- **Race silhouette** (drawn from the champion's race, not random):
  - Hyunan — balanced human head, plain ears
  - Sylvani — narrow face, long swept ears
  - Nocturi — sharp jaw, pale skin range, dark sclera and a shadow halo
  - Grakhar — broad heavy jaw, tusks, brow ridge
  - Durgan — short wide head, thick braided beard by default
  - Kaemari — fine features, feathered crest and a hint of wing over one shoulder
- **Class gear** on the shoulders and head, chosen by the class's armour type and role:
  - heavy → pauldrons and a nasal helm or open great helm (guardian)
  - light → studded leather harness, hood or circlet (blade, archer, rogue types)
  - robe → layered cowl and stole, hood up for arcanists, halo rule for menders
  - artisan → apron straps, tool strap across the chest
  - Small role emblem etched at the collar (blade, bow, sigil, chalice, hammer).
- **Existing customisation is kept**: hair style/colour, brows, eyes, beard, marking and background sliders all still apply, re-drawn in the engraved style. Race and class features are layered underneath so the editor never contradicts who the champion is.

## Where it shows

Member cards, the champion dossier header and Portrait tab, the Scriptorium caster list, and the Muster Hall roster — all use the same component, so they update together.

## Technical notes

- `src/components/game/Portrait.tsx` is rewritten: new `Face` renderer with layered groups (ground → hatching → shoulders/armour → head → hair → features → marks → frame). Hatching via an SVG `<pattern>`, grain via a low-opacity `feTurbulence` filter, both with ids keyed per instance to avoid collisions.
- `Portrait` gains optional `raceId` and `classId` props. Every call site already has the member in hand and passes them; when omitted the component falls back to the current neutral human bust so nothing breaks.
- Race/class feature tables live in `src/lib/game/identity.ts` next to the existing palettes (skin ranges per race, headgear + shoulder kind per armour type/role). No changes to `Portrait` data shape, so saved portraits and `portraitFromSeed` keep working.
- `PortraitEditor.tsx` receives the same race/class props so the preview matches the card.
- Purely presentational: no engine, stat, or persistence changes.

## Out of scope

- No AI-painted portrait image set — these stay procedural and editable.
- No new editor sliders beyond what exists today.
