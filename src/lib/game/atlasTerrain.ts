/**
 * Illustrated terrain bake for the War Table map — a Lineage 2-style hand-drawn
 * atlas rendered procedurally onto a canvas: hillshaded relief, cast shadows, an
 * aged-vellum palette, a south-west sea gulf and an impassable eastern mountain
 * wall. Ported from the standalone atlas prototype and adapted to draw behind the
 * game's live zone/banner overlay (same 100x62 map space, so markers line up).
 *
 * The bake is deterministic and expensive (~1s), so the result is cached at module
 * scope and reused across mounts. It is only ever called from the browser (inside a
 * useEffect), never during SSR.
 */

export type MapPoint = { x: number; y: number };
type Col = [number, number, number];

// Logical map is 100 wide x 62 tall (the SVG plate's viewBox). We bake at S px/unit.
const S = 8;
const MW = 100;
const MH = 62;
const W = MW * S; // 800
const H = MH * S; // 496

// Open sea: a south-west gulf carved out of a continent that otherwise fills the frame.
const SEA_PATH =
  "M0 36 C 8 40, 14 44, 13 50 C 12 56, 26 55, 30 60 C 34 63, 44 63, 46 63 L 0 63 Z";
// Offshore isles [cx, cy, rx, ry] in logical (62-tall) space.
const ISLES: [number, number, number, number][] = [
  [10, 54.6, 4.2, 3.2],
  [7, 49.6, 3.0, 2.4],
];

// Relief ranges: [center x (0..100 design), center y (0..100 design), radius, height].
// The last three are the impassable wall of peaks along the eastern edge.
const RANGES = [
  { x: 62, y: 18, r: 11, h: 0.95 },
  { x: 74, y: 11, r: 9, h: 0.85 },
  { x: 82, y: 42, r: 9, h: 0.9 },
  { x: 46, y: 13, r: 8, h: 0.6 },
  { x: 89, y: 22, r: 9, h: 0.9 },
  { x: 55, y: 34, r: 6, h: 0.5 },
  { x: 34, y: 14, r: 7, h: 0.62 },
  { x: 68, y: 46, r: 6, h: 0.55 },
  { x: 94, y: 30, r: 7, h: 1.1 },
  { x: 96, y: 46, r: 7, h: 1.1 },
  { x: 93, y: 58, r: 6, h: 1.0 },
];

function hash(x: number, y: number): number {
  let n = (x | 0) * 374761393 + (y | 0) * 668265263;
  n = (n ^ (n >> 13)) * 1274126177;
  return ((n ^ (n >> 16)) >>> 0) / 4294967295;
}
function vnoise(x: number, y: number): number {
  const xi = Math.floor(x),
    yi = Math.floor(y),
    xf = x - xi,
    yf = y - yi;
  const u = xf * xf * (3 - 2 * xf),
    v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi),
    b = hash(xi + 1, yi),
    c = hash(xi, yi + 1),
    d = hash(xi + 1, yi + 1);
  return a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v;
}
function fbm(x: number, y: number): number {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let o = 0; o < 4; o++) {
    s += a * vnoise(x * f, y * f);
    f *= 2;
    a *= 0.5;
  }
  return s;
}
// ridged noise -> sharp mountain ridgelines
function ridged(x: number, y: number): number {
  let s = 0,
    a = 0.5,
    f = 1;
  for (let o = 0; o < 5; o++) {
    let n = vnoise(x * f, y * f);
    n = 1 - Math.abs(2 * n - 1);
    s += a * n * n;
    f *= 2;
    a *= 0.5;
  }
  return s;
}
function elev(mx: number, my: number): number {
  // domain warp — bends the noise so landforms look eroded, not gridded
  const wx = (fbm(mx / 26 + 5, my / 26) - 0.5) * 7,
    wy = (fbm(mx / 26, my / 26 + 5) - 0.5) * 7;
  const x = mx + wx,
    y = my + wy;
  const base = fbm(x / 22, y / 15) * 0.55;
  let mtn = 0;
  for (const r of RANGES) {
    const dx = mx - r.x,
      dy = my - r.y * 0.62;
    mtn += r.h * Math.exp(-(dx * dx + dy * dy) / (r.r * r.r));
  }
  const mask = Math.min(1, mtn * 1.3 + Math.max(0, base - 0.42) * 1.6);
  return base + mtn * 0.72 + ridged(x / 5.5, y / 5.5) * 0.6 * mask;
}

function mix(a: Col, b: Col, t: number): Col {
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

let cached: ImageData | null = null;

/** Bake the terrain into `canvas` (sized to W x H). Cached after the first run. */
export function bakeAtlasTerrain(canvas: HTMLCanvasElement, landStamps: MapPoint[]): void {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  if (cached) {
    ctx.putImageData(cached, 0, 0);
    return;
  }

  // land mask: a continent filling the frame, less the SW sea gulf, plus offshore
  // isles — and land stamped under every game marker so none floats in the gulf.
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = W;
  maskCanvas.height = H;
  const mctx = maskCanvas.getContext("2d");
  if (!mctx) return;
  mctx.setTransform(S, 0, 0, S, 0, 0);
  mctx.fillStyle = "#fff";
  mctx.fillRect(0, 0, MW, MH);
  mctx.globalCompositeOperation = "destination-out";
  mctx.fill(new Path2D(SEA_PATH));
  mctx.globalCompositeOperation = "source-over";
  mctx.fillStyle = "#fff";
  for (const o of ISLES) {
    mctx.beginPath();
    mctx.ellipse(o[0], o[1], o[2], o[3], 0, 0, Math.PI * 2);
    mctx.fill();
  }
  for (const p of landStamps) {
    mctx.beginPath();
    mctx.ellipse(p.x, p.y * 0.62, 6, 4.2, 0, 0, Math.PI * 2);
    mctx.fill();
  }
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  const landAlpha = mctx.getImageData(0, 0, W, H).data;
  const land = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) land[i] = (landAlpha[i * 4 + 3] ?? 0) >= 40 ? 1 : 0;

  // sea shallowness (blurred land mask): high near shore, low in deep water
  const sc = document.createElement("canvas");
  sc.width = W;
  sc.height = H;
  const sx = sc.getContext("2d");
  if (!sx) return;
  sx.filter = `blur(${S * 3.2}px)`;
  sx.drawImage(maskCanvas, 0, 0);
  sx.filter = "none";
  const sdat = sx.getImageData(0, 0, W, H).data;
  const shallow = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) shallow[i] = (sdat[i * 4 + 3] ?? 0) / 255;

  // elevation field
  const Ef = new Float32Array(W * H);
  let eMin = Infinity,
    eMax = -Infinity;
  for (let py = 0; py < H; py++)
    for (let px = 0; px < W; px++) {
      const e = elev(px / S, py / S);
      Ef[py * W + px] = e;
      if (land[py * W + px]) {
        if (e < eMin) eMin = e;
        if (e > eMax) eMax = e;
      }
    }
  const eR = eMax - eMin || 1;

  // cast-shadow pass — a north-west sun, horizon propagation along the light.
  const shf = new Float32Array(W * H),
    carry = new Float32Array(W * H);
  const DROP = 0.022;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const efi = Ef[i] ?? 0;
      let c = x > 0 && y > 0 ? (carry[i - W - 1] ?? 0) - DROP : efi;
      if (c < efi) c = efi;
      carry[i] = c;
      const over = c - efi;
      shf[i] = over > 0.002 ? Math.max(0.88, 1 - Math.min(0.12, over * 1.0)) : 1;
    }
  }

  // warm, muted "old vellum" palette
  const SAND: Col = [222, 208, 168],
    DRY: Col = [212, 197, 157],
    STEPPE: Col = [200, 187, 146],
    LUSH: Col = [172, 172, 133],
    VALLEY: Col = [190, 185, 143],
    ROCK: Col = [190, 171, 137],
    HIROCK: Col = [171, 153, 124],
    SNOW: Col = [224, 218, 203];
  const PAPER: Col = [222, 208, 173],
    SHORE: Col = [230, 220, 186],
    SEA_SHALLOW: Col = [150, 176, 171],
    SEA_DEEP: Col = [98, 130, 136];
  const LX = -0.72,
    LY = -0.72,
    SHK = 0.72;

  const img = ctx.createImageData(W, H);
  const buf = img.data;
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const i = py * W + px,
        o = i * 4;
      if (!land[i]) {
        // open sea
        const scol = mix(SEA_DEEP, SEA_SHALLOW, Math.min(1, (shallow[i] ?? 0) * 1.3));
        const wv = 1 + (fbm((px / S) * 0.9 + 13, (py / S) * 0.9) - 0.5) * 0.06;
        buf[o] = scol[0] * wv;
        buf[o + 1] = scol[1] * wv;
        buf[o + 2] = scol[2] * wv;
        buf[o + 3] = 255;
        continue;
      }
      const e = Ef[i] ?? 0,
        nE = (e - eMin) / eR;
      const xl = Ef[i - 1] ?? e,
        xr = Ef[i + 1] ?? e,
        yt = Ef[i - W] ?? e,
        yb = Ef[i + W] ?? e;
      let sh = 1 + ((xr - xl) * LX + (yb - yt) * LY) * SHK;
      sh = sh < 0.84 ? 0.84 : sh > 1.14 ? 1.14 : sh;
      const moist = Math.min(1, fbm((px / S) / 14 + 40, (py / S) / 14) * 0.7 + (1 - nE) * 0.2);
      let c: Col;
      if (nE < 0.42) c = mix(mix(SAND, DRY, Math.min(1, nE / 0.42)), LUSH, moist);
      else if (nE < 0.72) c = mix(mix(STEPPE, VALLEY, moist * 0.5), ROCK, (nE - 0.42) / 0.3);
      else {
        c = mix(ROCK, HIROCK, (nE - 0.72) / 0.28);
        if (nE > 0.9) c = mix(c, SNOW, (nE - 0.9) / 0.1);
      }
      c = mix(c, PAPER, 0.48); // wash strongly toward aged vellum
      // brighten the shoreline where land meets sea
      if (
        (px > 0 && !land[i - 1]) ||
        (px < W - 1 && !land[i + 1]) ||
        (py > 0 && !land[i - W]) ||
        (py < H - 1 && !land[i + W])
      )
        c = mix(c, SHORE, 0.5);
      const lap = xl + xr + yt + yb - 4 * e;
      const ao = lap > 0 ? 1 - Math.min(0.07, lap * 1.4) : 1;
      const det = 1 + (fbm((px / S) * 1.1 + 7, (py / S) * 1.1) - 0.5) * 0.05;
      const s2 = sh * (shf[i] ?? 1) * ao * det;
      buf[o] = c[0] * s2;
      buf[o + 1] = c[1] * s2;
      buf[o + 2] = c[2] * s2;
      buf[o + 3] = 255;
    }
  }
  cached = img;
  ctx.putImageData(img, 0, 0);
}
