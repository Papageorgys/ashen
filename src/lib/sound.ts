// The realm's voice — a tiny synthesized SFX engine.
//
// Every cue is generated on the fly with the Web Audio API (oscillators +
// gain envelopes), so there are no audio files to ship, nothing to preload,
// and nothing that can fail the strict CSP. The AudioContext is created lazily
// and only ever resumed inside a real user gesture (browsers refuse to start
// audio otherwise), so importing this module is free and SSR-safe.
//
// The player is in control: a persisted mute flag and master volume, read from
// localStorage, gate everything. When muted, cues are no-ops.

export type Cue =
  | "click" // the ubiquitous UI tick — any button / link
  | "soft" // a quieter tick for secondary / list interactions
  | "open" // a screen slides open
  | "close" // a screen closes
  | "confirm" // an action is taken / committed
  | "deploy" // banners march — a low horn swell
  | "coin" // gold changes hands
  | "forge" // the anvil rings
  | "levelup" // a triumphant flourish
  | "error" // a request is refused
  | "page"; // turning to a new view

const LS_KEY = "ashen.sound.v1";
const MASTER = 0.32; // keep the whole thing gentle — SFX, not a soundtrack

interface Prefs {
  muted: boolean;
  volume: number; // 0..1, scales MASTER
}

function loadPrefs(): Prefs {
  if (typeof window === "undefined") return { muted: false, volume: 1 };
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Prefs>;
      return { muted: !!p.muted, volume: typeof p.volume === "number" ? p.volume : 1 };
    }
  } catch {
    /* ignore malformed prefs */
  }
  return { muted: false, volume: 1 };
}

let prefs = loadPrefs();
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
const listeners = new Set<(p: Prefs) => void>();

function savePrefs() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(prefs));
  } catch {
    /* storage may be unavailable — fine */
  }
  for (const fn of listeners) fn(prefs);
  if (master && ctx) master.gain.setTargetAtTime(gain(), ctx.currentTime, 0.01);
}

function gain(): number {
  return prefs.muted ? 0 : MASTER * Math.max(0, Math.min(1, prefs.volume));
}

/** Bring the audio graph up. Safe to call repeatedly; only the first does work. */
function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = gain();
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

interface ToneOpts {
  freq: number;
  to?: number; // glide the pitch to this frequency across the note
  type?: OscillatorType;
  dur?: number;
  peak?: number; // 0..1 relative loudness of this partial
  attack?: number;
  delay?: number;
}

/** Schedule one shaped oscillator note on the shared graph. */
function tone(o: ToneOpts) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime + (o.delay ?? 0);
  const dur = o.dur ?? 0.12;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = o.type ?? "triangle";
  osc.frequency.setValueAtTime(o.freq, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + dur);
  const peak = Math.max(0.0001, o.peak ?? 0.6);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + (o.attack ?? 0.006));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** A little filtered-noise burst — for metallic / percussive cues. */
function noise(dur: number, peak: number, hp = 1200) {
  if (!ctx || !master) return;
  const t0 = ctx.currentTime;
  const frames = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, frames, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "highpass";
  filter.frequency.value = hp;
  const g = ctx.createGain();
  g.gain.setValueAtTime(peak, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + dur + 0.02);
}

/** The synthesized voice of each cue. */
const CUES: Record<Cue, () => void> = {
  click: () => tone({ freq: 660, to: 520, type: "triangle", dur: 0.05, peak: 0.28 }),
  soft: () => tone({ freq: 420, to: 360, type: "sine", dur: 0.045, peak: 0.16 }),
  open: () => {
    tone({ freq: 300, to: 560, type: "sine", dur: 0.16, peak: 0.3 });
    tone({ freq: 600, to: 900, type: "triangle", dur: 0.12, peak: 0.14, delay: 0.02 });
  },
  close: () => {
    tone({ freq: 520, to: 280, type: "sine", dur: 0.14, peak: 0.26 });
  },
  confirm: () => {
    tone({ freq: 523, type: "triangle", dur: 0.1, peak: 0.26 });
    tone({ freq: 784, type: "triangle", dur: 0.14, peak: 0.24, delay: 0.07 });
  },
  deploy: () => {
    tone({ freq: 180, to: 240, type: "sawtooth", dur: 0.34, peak: 0.22 });
    tone({ freq: 90, to: 120, type: "sine", dur: 0.34, peak: 0.28 });
  },
  coin: () => {
    tone({ freq: 1760, type: "triangle", dur: 0.08, peak: 0.18 });
    tone({ freq: 2637, type: "triangle", dur: 0.1, peak: 0.14, delay: 0.05 });
  },
  forge: () => {
    noise(0.09, 0.28, 1800);
    tone({ freq: 220, to: 140, type: "square", dur: 0.12, peak: 0.14 });
  },
  levelup: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, type: "triangle", dur: 0.22, peak: 0.24, delay: i * 0.08 }),
    );
  },
  error: () => {
    tone({ freq: 200, to: 140, type: "sawtooth", dur: 0.22, peak: 0.22 });
  },
  page: () => {
    noise(0.12, 0.14, 2200);
    tone({ freq: 480, to: 620, type: "sine", dur: 0.1, peak: 0.12 });
  },
};

/** Play a cue. Silently a no-op when muted, unsupported, or before first gesture. */
export function playCue(cue: Cue) {
  if (prefs.muted) return;
  const c = ensureContext();
  if (!c || c.state !== "running") return; // not yet unlocked by a gesture
  CUES[cue]?.();
}

/** Prime the audio graph from within a user gesture (first pointer/key event). */
export function unlockAudio() {
  ensureContext();
}

export function isMuted(): boolean {
  return prefs.muted;
}
export function getVolume(): number {
  return prefs.volume;
}
export function setMuted(muted: boolean) {
  prefs = { ...prefs, muted };
  savePrefs();
  if (!muted) ensureContext();
}
export function toggleMuted(): boolean {
  setMuted(!prefs.muted);
  return prefs.muted;
}
export function setVolume(volume: number) {
  prefs = { ...prefs, volume: Math.max(0, Math.min(1, volume)) };
  savePrefs();
}

/** Subscribe to preference changes (for a toggle's live state). Returns an unsubscribe. */
export function subscribeSound(fn: (p: Prefs) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
