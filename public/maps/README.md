# Atlas paintings

Drop the four map paintings here, with these exact filenames. The in-game
**Living Atlas** (Map tab) shows each one as a full image with a clickable
hotspot layer on top. Until a file exists, that map falls back to a procedural
relief plate, so the app builds and runs either way.

| File                  | Painting                            |
| --------------------- | ----------------------------------- |
| `aethyr.png`          | Aethyr — the continent (master map) |
| `ember-court.png`     | The Ember Court (region)            |
| `hollow-covenant.png` | The Hollow Covenant (region)        |
| `free-holds.png`      | The Free Holds (region)             |
| `gilded-compact.png`  | The Gilded Compact (region)         |

`.jpg`/`.webp` work too — just update the `art` field for that map in
`src/lib/game/atlas.ts` to match the filename.

Files under `public/` are served at the site root, so `aethyr.png` here is
reachable at `/maps/aethyr.png`.
