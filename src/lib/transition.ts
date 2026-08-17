// Screen transitions — the ashen curtain.
//
// A single mounted host (Curtain.tsx) draws a full-screen wipe on request. Any
// code can summon it — `summonCurtain({ label: "Entering the Ember Court" })` —
// without threading context through the tree; the host binds itself here, the
// same lightweight-singleton pattern the sound engine uses.

export interface CurtainOptions {
  /** a line held on the curtain at its darkest (e.g. a destination) */
  label?: string;
  /** a glyph above the label */
  sigil?: string;
  /** override the hold duration (ms) the curtain sits fully drawn */
  holdMs?: number;
}

type Handler = (o: CurtainOptions) => void;

let handler: Handler | null = null;

/** Called by the mounted Curtain host to receive summons. */
export function bindCurtain(h: Handler | null) {
  handler = h;
}

/** Draw the curtain across the screen and lift it. No-op if no host is mounted. */
export function summonCurtain(o: CurtainOptions = {}) {
  handler?.(o);
}
