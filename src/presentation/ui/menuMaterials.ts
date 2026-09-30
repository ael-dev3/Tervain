import { mulberry32 } from '../../world/noise';
import { clamp01, fbmField, sstep, voronoi } from '../procTex';

/**
 * Surfaces for the menus, generated once at start-up (no image files): the dust and scratches over the whole title
 * screen, the dark oiled leather of the menu panel, its notched bronze frame with a verdigris line, the torn parchment
 * of the forms, and the oxblood leather of a confirmation. The measured Gothic 3 interface (docs/art/gothic3-reference.md)
 * is the reference for what these are made of; the pixels are original.
 *
 * The painters return raw RGBA so they can be checked without a browser; `installMenuMaterials` turns them into data
 * URLs and exposes them to the stylesheet as custom properties.
 */

export interface Pixels {
  w: number;
  h: number;
  data: Uint8ClampedArray;
}

const px = (w: number, h: number): Pixels => ({ w, h, data: new Uint8ClampedArray(w * h * 4) });

function blend(p: Pixels, x: number, y: number, r: number, g: number, b: number, a: number) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || yi < 0 || xi >= p.w || yi >= p.h || a <= 0) return;
  const o = (yi * p.w + xi) * 4;
  const d = p.data;
  const da = d[o + 3]! / 255;
  const oa = a + da * (1 - a);
  if (oa <= 0) return;
  d[o] = (r * a + d[o]! * da * (1 - a)) / oa;
  d[o + 1] = (g * a + d[o + 1]! * da * (1 - a)) / oa;
  d[o + 2] = (b * a + d[o + 2]! * da * (1 - a)) / oa;
  d[o + 3] = oa * 255;
}

/** A soft round speck, wrapping round the edges so the texture tiles. */
function speck(p: Pixels, cx: number, cy: number, rad: number, rgb: [number, number, number], alpha: number) {
  const r = Math.ceil(rad + 1);
  for (let y = -r; y <= r; y++) {
    for (let x = -r; x <= r; x++) {
      const d = Math.hypot(x, y);
      if (d > rad + 0.7) continue;
      const a = alpha * clamp01(rad + 0.7 - d);
      blend(p, (cx + x + p.w) % p.w, (cy + y + p.h) % p.h, rgb[0], rgb[1], rgb[2], a);
    }
  }
}

/** A thin wandering line (a hair, a fibre or a scratch), wrapped. */
function strand(p: Pixels, rng: () => number, x: number, y: number, len: number, ang: number, bend: number, rgb: [number, number, number], alpha: number, width = 0.8) {
  let a = ang;
  for (let s = 0; s < len; s += 0.6) {
    a += (rng() - 0.5) * bend;
    x += Math.cos(a) * 0.6;
    y += Math.sin(a) * 0.6;
    const fade = Math.sin((s / len) * Math.PI);
    speck(p, (x + p.w * 4) % p.w, (y + p.h * 4) % p.h, width * 0.5, rgb, alpha * fade);
  }
}

/** Dark dust, hairs and stains for a multiply layer over the whole screen (alpha is the amount). */
export function paintGrimeDark(n = 512, seed = 71): Pixels {
  const p = px(n, n);
  const rng = mulberry32(seed);
  for (let i = 0; i < 520; i++) speck(p, rng() * n, rng() * n, 0.4 + Math.pow(rng(), 4) * 1.6, [18, 14, 10], 0.2 + rng() * 0.5);
  // Clusters of grit.
  for (let c = 0; c < 18; c++) {
    const cx = rng() * n;
    const cy = rng() * n;
    for (let i = 0; i < 25; i++) speck(p, cx + (rng() - 0.5) * 30, cy + (rng() - 0.5) * 30, 0.4 + rng() * 0.9, [20, 16, 12], 0.3 + rng() * 0.4);
  }
  for (let i = 0; i < 22; i++) strand(p, rng, rng() * n, rng() * n, 20 + rng() * 60, rng() * Math.PI * 2, 0.35, [15, 12, 10], 0.22 + rng() * 0.2);
  // Faint water stains: rings with darker rims.
  for (let i = 0; i < 5; i++) {
    const cx = rng() * n;
    const cy = rng() * n;
    const rad = 20 + rng() * 45;
    for (let a = 0; a < Math.PI * 2; a += 0.02) {
      const rr = rad * (1 + 0.1 * Math.sin(a * 5 + i));
      speck(p, (cx + Math.cos(a) * rr + n) % n, (cy + Math.sin(a) * rr + n) % n, 1.2, [40, 28, 16], 0.05);
    }
  }
  return p;
}

/** Fine pale scratches and lint for a screen layer: the craquelure and wear of an old painted backdrop. */
export function paintGrimeLight(n = 512, seed = 72): Pixels {
  const p = px(n, n);
  const rng = mulberry32(seed);
  // Short fine scratches in every direction (a regular slant would read as rain), and a few longer, fainter ones.
  for (let i = 0; i < 34; i++) {
    const long = rng() < 0.2;
    strand(p, rng, rng() * n, rng() * n, long ? 50 + rng() * 60 : 8 + rng() * 34, rng() * Math.PI * 2, 0.12, [220, 205, 180], long ? 0.06 + rng() * 0.06 : 0.1 + rng() * 0.14, 0.6);
  }
  for (let i = 0; i < 260; i++) speck(p, rng() * n, rng() * n, 0.3 + rng() * 0.8, [230, 215, 190], 0.08 + rng() * 0.2);
  for (let i = 0; i < 10; i++) strand(p, rng, rng() * n, rng() * n, 30 + rng() * 50, rng() * Math.PI * 2, 0.5, [210, 200, 185], 0.12, 0.7);
  return p;
}

/** Dark oiled leather, tileable: pebbled grain, a few creases, scuffed lighter where hands have rubbed it. */
export function paintLeather(n = 256, seed = 81, tint: [number, number, number] = [34, 25, 18]): Pixels {
  const p = px(n, n);
  const grain = fbmField(n, 48, 48, 2, seed);
  const mid = fbmField(n, 10, 10, 3, seed + 1);
  const low = fbmField(n, 3, 3, 3, seed + 2);
  const cr = voronoi(n, 9, seed + 3, 0.95);
  for (let o = 0; o < n * n; o++) {
    const crease = 1 - sstep(0.0, 0.05, cr.f2[o]! - cr.f1[o]!);
    const scuff = sstep(0.55, 0.85, low[o]!) * 0.5 + sstep(0.6, 0.9, mid[o]!) * 0.25;
    let k = 0.86 + grain[o]! * 0.28 + (mid[o]! - 0.5) * 0.18;
    k *= 1 - crease * 0.35;
    const r = tint[0] * k * (1 + scuff * 0.9);
    const g = tint[1] * k * (1 + scuff * 0.75);
    const b = tint[2] * k * (1 + scuff * 0.55);
    p.data[o * 4] = r;
    p.data[o * 4 + 1] = g;
    p.data[o * 4 + 2] = b;
    p.data[o * 4 + 3] = 255;
  }
  return p;
}

/**
 * A 9-slice frame of old cast bronze: an outer rail and an inner rail with a dark channel between, corners stepped in
 * with a notch, the inner edge lined with verdigris. The centre is transparent (the leather shows through).
 * Returns the pixels and the slice width in pixels.
 */
export function paintBronzeFrame(size = 120, slice = 38, seed = 91): { pixels: Pixels; slice: number } {
  const p = px(size, size);
  const noise = fbmField(size, 12, 12, 3, seed);
  const pit = fbmField(size, 40, 40, 2, seed + 1);
  const rng = mulberry32(seed + 2);
  const notch = 11;
  // The frame's outline at inset t: a rectangle with a square notch stepped into each corner. A rail is the band between
  // two such outlines, so it follows the notch.
  const inN = (x: number, y: number, t: number) => {
    const dx = Math.min(x, size - 1 - x);
    const dy = Math.min(y, size - 1 - y);
    return dx >= t && dy >= t && !(dx < t + notch && dy < t + notch);
  };
  const onRail = (x: number, y: number, t: number, w: number) => inN(x, y, t) && !inN(x, y, t + w);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = y * size + x;
      const outer = onRail(x, y, 2, 6);
      const inner = onRail(x, y, 12, 3);
      const verd = onRail(x, y, 15, 1);
      const channel = !outer && !inner && onRail(x, y, 8, 4);
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      if (outer || inner) {
        // Bronze: warm, uneven, pitted, darker in the pits and brighter on the worn crown of each rail.
        const n = noise[o]!;
        const pits = sstep(0.62, 0.8, pit[o]!);
        const crown = outer ? 1 - Math.abs(((Math.min(x, size - 1 - x, y, size - 1 - y) - 2) / 6) * 2 - 1) : 0.6;
        const k = (0.55 + n * 0.55 + crown * 0.35) * (1 - pits * 0.55);
        r = 150 * k;
        g = 112 * k;
        b = 62 * k;
        // Tarnish creeping in green-brown.
        const tarnish = sstep(0.55, 0.8, n) * 0.35;
        r = r * (1 - tarnish) + 60 * tarnish;
        g = g * (1 - tarnish) + 78 * tarnish;
        b = b * (1 - tarnish) + 62 * tarnish;
        a = 255;
      } else if (verd) {
        const k = 0.7 + noise[o]! * 0.5;
        r = 44 * k;
        g = 84 * k;
        b = 76 * k;
        a = 220;
      } else if (channel) {
        r = 10;
        g = 8;
        b = 6;
        a = 235;
      }
      p.data[o * 4] = r;
      p.data[o * 4 + 1] = g;
      p.data[o * 4 + 2] = b;
      p.data[o * 4 + 3] = a;
    }
  }
  // A few nicks and dents knocked out of the outer rail.
  for (let i = 0; i < 10; i++) {
    const t = rng();
    const side = Math.floor(rng() * 4);
    const along = slice + t * (size - 2 * slice);
    const x = side === 0 ? along : side === 1 ? along : side === 2 ? 3 + rng() * 4 : size - 4 - rng() * 4;
    const y = side === 0 ? 3 + rng() * 4 : side === 1 ? size - 4 - rng() * 4 : along;
    speck(p, x, y, 0.8 + rng() * 1.2, [30, 22, 14], 0.8);
  }
  return { pixels: p, slice };
}

/**
 * Aged parchment as a 9-slice: fibrous, foxed, stained, darker toward its torn edge. The edge alpha is torn (deckled),
 * so the sheet has no straight border. `slice` is the margin that holds the torn edge.
 */
export function paintParchment(size = 512, slice = 56, seed = 101, tone: [number, number, number] = [206, 188, 150]): { pixels: Pixels; slice: number } {
  const p = px(size, size);
  // The middle of a 9-slice repeats on its own, so its fibre is generated with that period (size - 2 * slice).
  const inner = size - 2 * slice;
  const fibIn = fbmField(inner, 5, 50, 3, seed);
  const midIn = fbmField(inner, 12, 12, 3, seed + 2);
  const lowIn = fbmField(inner, 3, 3, 4, seed + 1);
  const tearIn = fbmField(inner, 24, 24, 3, seed + 3);
  const fib = new Float32Array(size * size);
  const mid = new Float32Array(size * size);
  const low = new Float32Array(size * size);
  const tear = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const q = (((y - slice) % inner) + inner) % inner * inner + ((((x - slice) % inner) + inner) % inner);
      const o = y * size + x;
      fib[o] = fibIn[q]!;
      mid[o] = midIn[q]!;
      low[o] = lowIn[q]!;
      tear[o] = tearIn[q]!;
    }
  }
  const rng = mulberry32(seed + 4);
  const edgeW = slice * 0.55;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = y * size + x;
      const d = Math.min(x, y, size - 1 - x, size - 1 - y);
      // Torn edge: the sheet ends at a noisy line inside the margin.
      const edgeLine = edgeW * (0.35 + 0.65 * tear[o]!);
      const inside = d > edgeLine;
      if (!inside) continue;
      // Only fine fibre in the tiled middle; broad stains and browning live in the margin (the stylesheet adds large
      // variation across the whole sheet), so a big form never shows a repeating grid.
      const margin = 1 - sstep(slice * 0.55, slice * 0.95, d);
      const age = 1 - sstep(edgeLine, slice * 0.95, d);
      const k = 0.93 + (fib[o]! - 0.5) * 0.08 + (mid[o]! - 0.5) * 0.05 * margin;
      const stain = sstep(0.62, 0.85, low[o]!) * 0.22 * margin;
      let r = tone[0] * k * (1 - stain * 0.6);
      let g = tone[1] * k * (1 - stain * 0.75);
      let b = tone[2] * k * (1 - stain * 0.95);
      // Browned toward the edge, burnt at the very rim.
      r *= 1 - age * 0.3;
      g *= 1 - age * 0.42;
      b *= 1 - age * 0.6;
      const rim = 1 - sstep(edgeLine, edgeLine + 3, d);
      r = r * (1 - rim * 0.55);
      g = g * (1 - rim * 0.62);
      b = b * (1 - rim * 0.7);
      p.data[o * 4] = r;
      p.data[o * 4 + 1] = g;
      p.data[o * 4 + 2] = b;
      p.data[o * 4 + 3] = 255 * clamp01((d - edgeLine) * 1.5);
    }
  }
  // Foxing: small brown spots.
  for (let i = 0; i < 40; i++) {
    const x = slice * 0.6 + rng() * (size - slice * 1.2);
    const y = slice * 0.6 + rng() * (size - slice * 1.2);
    const o = (Math.floor(y) * size + Math.floor(x)) * 4;
    if (p.data[o + 3]! < 200) continue;
    const rad = 0.6 + Math.pow(rng(), 2) * 3.5;
    const rr = Math.ceil(rad);
    for (let yy = -rr; yy <= rr; yy++) {
      for (let xx = -rr; xx <= rr; xx++) {
        const dd = Math.hypot(xx, yy);
        if (dd > rad) continue;
        const q = ((Math.floor(y) + yy) * size + Math.floor(x) + xx) * 4;
        if (q < 0 || q >= p.data.length || p.data[q + 3]! < 200) continue;
        const a = 0.35 * (1 - dd / rad);
        p.data[q] = p.data[q]! * (1 - a) + 120 * a;
        p.data[q + 1] = p.data[q + 1]! * (1 - a) + 78 * a;
        p.data[q + 2] = p.data[q + 2]! * (1 - a) + 40 * a;
      }
    }
  }
  return { pixels: p, slice };
}

/* ------------------------------------------------------------ browser installation ------------------------------------------------------------ */

function dataUrl(p: Pixels): string | null {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = p.w;
  c.height = p.h;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(p.w, p.h);
  img.data.set(p.data);
  ctx.putImageData(img, 0, 0);
  try {
    return c.toDataURL('image/png');
  } catch {
    return null;
  }
}

let installed = false;

/**
 * Generate the menu surfaces and expose them to CSS as custom properties on `root`. Also adds the hidden SVG filter
 * that roughens the menu lettering. Safe to call more than once; does nothing without a DOM.
 */
export function installMenuMaterials(root?: HTMLElement) {
  if (installed || typeof document === 'undefined') return;
  const el = root ?? document.documentElement;
  const set = (name: string, url: string | null) => {
    if (url) el.style.setProperty(name, `url("${url}")`);
  };
  set('--tv-grime-dark', dataUrl(paintGrimeDark()));
  set('--tv-grime-light', dataUrl(paintGrimeLight()));
  set('--tv-leather', dataUrl(paintLeather()));
  set('--tv-oxblood', dataUrl(paintLeather(256, 83, [66, 20, 16])));
  const frame = paintBronzeFrame();
  set('--tv-bronze-frame', dataUrl(frame.pixels));
  el.style.setProperty('--tv-bronze-slice', String(frame.slice));
  const parchment = paintParchment();
  set('--tv-parchment', dataUrl(parchment.pixels));
  el.style.setProperty('--tv-parchment-slice', String(parchment.slice));
  // Ink that has bled a little into the fibres: a very small displacement of each letter's edge.
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.setAttribute('width', '0');
  svg.setAttribute('height', '0');
  svg.style.position = 'absolute';
  svg.innerHTML = `
    <filter id="tv-rough-ink" x="-5%" y="-10%" width="110%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="n"/>
      <feDisplacementMap in="SourceGraphic" in2="n" scale="1.3" xChannelSelector="R" yChannelSelector="G"/>
    </filter>`;
  document.body.appendChild(svg);
  // Forms switch to parchment only once the surfaces exist (the plain paper style remains the fallback).
  document.body.classList.add('tv-materials');
  installed = true;
}
