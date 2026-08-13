# Atlas paintings

Drop the four map paintings here, with these exact filenames. The in-game
**Living Atlas** (Map tab) shows each one as a full image with a clickable
hotspot layer on top. Until a file exists, that map falls back to a procedural
relief plate, so the app builds and runs either way.

| File                      | Painting                            |
| ------------------------- | ----------------------------------- |
| `aethyr.png`              | Aethyr — the continent (master map) |
| `ember-court.png`         | The Ember Court (region)            |
| `hollow-covenant.png`     | The Hollow Covenant (region)        |
| `free-holds.png`          | The Free Holds (region)             |
| `gilded-compact.png`      | The Gilded Compact (region)         |
| `verdant-reclamation.png` | The Verdant Reclamation (region)    |
| `pale-wardens.png`        | The Pale Wardens (region)           |
| `sunless-choir.png`       | The Sunless Choir (region)          |

`.jpg`/`.webp` work too — just update the `art` field for that map in
`src/lib/game/atlas.ts` to match the filename.

Files under `public/` are served at the site root, so `aethyr.png` here is
reachable at `/maps/aethyr.png`.

## Splitting a map into pieces (optional)

A map can be delivered as composited **layers**, stitched **grid slices**, or a
zoom **tile pyramid** instead of one PNG. To opt a map in, add a folder named
after its map id with a `manifest.json`; with no manifest the single
`<mapId>.png` above is used. Put the pieces in that same folder. Precedence when
several are present: **tiles > grid > layers > single**.

Map ids: `aethyr`, `ember_court`, `hollow_covenant`, `free_holds`,
`gilded_compact`, `verdant_reclamation`, `pale_wardens`, `sunless_choir`.

All pieces of a map must describe the same 4:3 image; hotspots stay in percent,
so they keep lining up however the art is assembled.

**Layers** — `public/maps/aethyr/manifest.json`

```json
{
  "layers": [
    { "id": "terrain", "src": "terrain.png" },
    { "id": "labels", "src": "labels.png", "toggle": true },
    { "id": "icons", "src": "icons.png", "toggle": true, "default": false }
  ]
}
```

**Grid slices** (higher resolution) — `{r}`/`{c}` are row/column indices

```json
{ "grid": { "rows": 3, "cols": 3, "pattern": "tile_{r}_{c}.png" } }
```

**Zoom tiles** (sharpens as you zoom) — `{z}`/`{x}`/`{y}` in the pattern

```json
{
  "tiles": {
    "pattern": "{z}/{x}/{y}.png",
    "levels": [
      { "z": 0, "cols": 1, "rows": 1 },
      { "z": 1, "cols": 2, "rows": 2 },
      { "z": 2, "cols": 4, "rows": 3 }
    ]
  }
}
```
