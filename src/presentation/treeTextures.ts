import * as THREE from 'three';
import { mulberry32 } from '../world/noise';
import { clamp01, fbmField, mixc, pnoise, rnd, sstep, voronoi, type RGB } from './procTex';

/**
 * Textures for the trees, all generated: leaf and needle cards (alpha-cut, with the transparent texels carrying leaf colour
 * so mipmaps never grow dark fringes), crown silhouettes for distant trees, and tileable bark with a normal map.
 * A card holds a whole twig of individual leaves, and each tree is many cards, so leaves read as leaves up close and as a
 * mass from afar.
 */

export type LeafKind = 'oak' | 'birch' | 'willow' | 'needle' | 'sprig' | 'crown' | 'conifer';
export type BarkKind = 'oak' | 'pine' | 'birch' | 'dead';

const cache = new Map<string, THREE.Texture>();

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d', { willReadFrequently: true })!];
}

/** Combine a colour picture and a mask into one RGBA texture, keeping the colour under fully transparent texels. */
function cardTexture(w: number, h: number, paint: (colour: CanvasRenderingContext2D, mask: CanvasRenderingContext2D) => void, bleed: string): THREE.CanvasTexture {
  const [, cctx] = makeCanvas(w, h);
  const [, mctx] = makeCanvas(w, h);
  cctx.fillStyle = bleed;
  cctx.fillRect(0, 0, w, h);
  mctx.fillStyle = '#000';
  mctx.fillRect(0, 0, w, h);
  paint(cctx, mctx);
  const col = cctx.getImageData(0, 0, w, h);
  const mask = mctx.getImageData(0, 0, w, h);
  for (let i = 0; i < w * h; i++) col.data[i * 4 + 3] = mask.data[i * 4]!;
  const [oc, octx] = makeCanvas(w, h);
  octx.putImageData(col, 0, 0);
  const tex = new THREE.CanvasTexture(oc);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.premultiplyAlpha = false;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}

const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`;

/** A single leaf as a closed shape with a midrib. `serr` adds saw-tooth edges; `lobes` wavy lobes. */
function leaf(c: CanvasRenderingContext2D, m: CanvasRenderingContext2D, x: number, y: number, ang: number, len: number, wid: number, fill: string, rib: string, o: { serr?: number; lobes?: number; taper?: number } = {}) {
  const pts: [number, number][] = [];
  const N = 22;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    // half outline from base (t=0) to tip (t=1)
    const w = Math.sin(Math.PI * Math.pow(t, o.taper ?? 0.8)) * wid * 0.5;
    const lobe = o.lobes ? 1 + 0.22 * Math.sin(t * Math.PI * o.lobes) : 1;
    const serr = o.serr ? 1 + 0.07 * (i % 2 ? 1 : -1) * Math.sin(Math.PI * t) : 1;
    pts.push([t * len, w * lobe * serr]);
  }
  const tr = (px: number, py: number): [number, number] => [x + px * Math.cos(ang) - py * Math.sin(ang), y + px * Math.sin(ang) + py * Math.cos(ang)];
  for (const ctx of [c, m]) {
    ctx.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const [px, py] = tr(pts[i]![0], pts[i]![1]);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    for (let i = pts.length - 1; i >= 0; i--) {
      const [px, py] = tr(pts[i]![0], -pts[i]![1]);
      ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = ctx === m ? '#fff' : fill;
    ctx.fill();
  }
  c.strokeStyle = rib;
  c.lineWidth = Math.max(1, len * 0.03);
  c.beginPath();
  const [x0, y0] = tr(0, 0);
  const [x1, y1] = tr(len * 0.92, 0);
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

function twig(c: CanvasRenderingContext2D, m: CanvasRenderingContext2D, pts: [number, number][], w: number, col: string) {
  for (const ctx of [c, m]) {
    ctx.strokeStyle = ctx === m ? '#fff' : col;
    ctx.lineCap = 'round';
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i]![0], pts[i]![1]);
    ctx.stroke();
  }
}

/** A leafy twig running up the card. */
function leafyTwig(kind: 'oak' | 'birch' | 'willow', seed: number): THREE.CanvasTexture {
  const S = 512;
  const cfg = {
    oak: { hue: 101, sat: 34, lit: 37, n: 34, len: 136, wid: 84, lobes: 5, serr: 0, taper: 0.9 },
    birch: { hue: 91, sat: 37, lit: 39, n: 42, len: 96, wid: 72, lobes: 0, serr: 1, taper: 0.7 },
    willow: { hue: 96, sat: 34, lit: 36, n: 44, len: 150, wid: 30, lobes: 0, serr: 0, taper: 0.8 },
  }[kind];
  return cardTexture(
    S,
    S,
    (c, m) => {
      const rnd = mulberry32(seed);
      const stem: [number, number][] = [];
      for (let i = 0; i <= 8; i++) stem.push([S * (0.5 + Math.sin(i * 0.7 + seed) * 0.06), S * (0.98 - i * 0.115)]);
      twig(c, m, stem, 7, '#3a2e22');
      for (let i = 0; i < cfg.n; i++) {
        const t = 0.06 + (i / cfg.n) * 0.9;
        const p = stem[Math.min(8, Math.floor(t * 8.4))]!;
        const side = i % 2 ? 1 : -1;
        const a = -Math.PI / 2 + side * (0.55 + rnd() * 0.75);
        const sc = 1.05 - t * 0.45;
        const px = p[0] + (rnd() - 0.5) * 14;
        const py = p[1] + (rnd() - 0.5) * 14;
        twig(c, m, [[p[0], p[1]], [px + Math.cos(a) * 14, py + Math.sin(a) * 14]], 3, '#3a2e22');
        leaf(c, m, px + Math.cos(a) * 14, py + Math.sin(a) * 14, a, cfg.len * sc * (0.8 + rnd() * 0.4), cfg.wid * sc * (0.85 + rnd() * 0.3), hsl(cfg.hue + (rnd() - 0.5) * 22, cfg.sat + rnd() * 14, cfg.lit + (rnd() - 0.5) * 10), hsl(cfg.hue + 10, cfg.sat, cfg.lit + 14), { lobes: cfg.lobes, serr: cfg.serr, taper: cfg.taper });
      }
      // terminal leaf
      leaf(c, m, stem[8]![0], stem[8]![1], -Math.PI / 2, cfg.len * 0.7, cfg.wid * 0.7, hsl(cfg.hue + 6, cfg.sat + 8, cfg.lit + 6), hsl(cfg.hue + 10, cfg.sat, cfg.lit + 14), { lobes: cfg.lobes, serr: cfg.serr, taper: cfg.taper });
    },
    hsl(cfg.hue, cfg.sat, cfg.lit),
  );
}

/** A radial burst of long needles (pine): one card per branch tip. */
function needleTuft(seed: number): THREE.CanvasTexture {
  const S = 512;
  return cardTexture(
    S,
    S,
    (c, m) => {
      const rnd = mulberry32(seed);
      for (const ctx of [c, m]) ctx.lineCap = 'round';
      for (let i = 0; i < 280; i++) {
        const a = rnd() * Math.PI * 2;
        const l = S * (0.3 + rnd() * 0.2);
        const cx = S / 2 + (rnd() - 0.5) * 18;
        const cy = S / 2 + (rnd() - 0.5) * 18;
        const bend = (rnd() - 0.5) * 0.3;
        const col = hsl(126 + (rnd() - 0.5) * 26, 27 + rnd() * 12, 28 + rnd() * 16);
        for (const ctx of [c, m]) {
          ctx.strokeStyle = ctx === m ? '#fff' : col;
          ctx.lineWidth = 6.5;
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.quadraticCurveTo(cx + Math.cos(a + bend) * l * 0.5, cy + Math.sin(a + bend) * l * 0.5, cx + Math.cos(a + bend * 2.2) * l, cy + Math.sin(a + bend * 2.2) * l);
          ctx.stroke();
        }
      }
      for (const ctx of [c, m]) {
        ctx.fillStyle = ctx === m ? '#fff' : '#3a2e22';
        ctx.beginPath();
        ctx.arc(S / 2, S / 2, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    hsl(112, 28, 24),
  );
}

/** A fir sprig: a twig along the card with needles fanning off both sides. */
function firSprig(seed: number): THREE.CanvasTexture {
  const W = 512;
  const H = 256;
  return cardTexture(
    W,
    H,
    (c, m) => {
      const rnd = mulberry32(seed);
      twig(c, m, [[6, H / 2], [W * 0.5, H / 2 + 4], [W - 8, H / 2]], 6, '#3a2e22');
      for (let i = 0; i < 230; i++) {
        const t = rnd();
        const x = 14 + t * (W - 40);
        const side = rnd() < 0.5 ? -1 : 1;
        const l = (1 - t * 0.55) * (70 + rnd() * 60);
        const a = side * (0.55 + rnd() * 0.55);
        const y = H / 2 + (x < W / 2 ? 0 : 3);
        const col = hsl(140 + (rnd() - 0.5) * 24, 24 + rnd() * 12, 20 + rnd() * 14);
        for (const ctx of [c, m]) {
          ctx.strokeStyle = ctx === m ? '#fff' : col;
          ctx.lineWidth = 5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x + Math.cos(a) * l * 0.35 + l * 0.32, y + Math.sin(a) * l);
          ctx.stroke();
        }
      }
    },
    hsl(140, 24, 22),
  );
}

/** A dense cluster of small leaves, for distant broadleaf crowns and for shrubs. */
function crownBlob(seed: number): THREE.CanvasTexture {
  const S = 512;
  return cardTexture(
    S,
    S,
    (c, m) => {
      const rnd = mulberry32(seed);
      for (let i = 0; i < 520; i++) {
        const a = rnd() * Math.PI * 2;
        const r = Math.sqrt(rnd()) * S * 0.44;
        // Noisy, lobed outline: fewer leaves near the rim.
        const rim = S * 0.44 * (0.8 + 0.2 * Math.sin(a * 5 + seed) + 0.1 * Math.sin(a * 11));
        if (r > rim) continue;
        const x = S / 2 + Math.cos(a) * r;
        const y = S / 2 + Math.sin(a) * r * 0.86;
        const shade = 1 - (r / rim) * 0.25;
        leaf(c, m, x, y, rnd() * Math.PI * 2, 34 + rnd() * 22, 22 + rnd() * 12, hsl(102 + (rnd() - 0.5) * 24, 32 + rnd() * 12, (31 + rnd() * 14) * shade), hsl(100, 30, 40), { lobes: 3 });
      }
    },
    hsl(102, 34, 32),
  );
}

/** A conifer silhouette with drooping tiers, for distant firs and pines. */
function coniferSilhouette(seed: number): THREE.CanvasTexture {
  const W = 256;
  const H = 512;
  return cardTexture(
    W,
    H,
    (c, m) => {
      const rnd = mulberry32(seed);
      const tiers = 9;
      for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1);
        const y = H * (0.04 + t * 0.84);
        const w = W * (0.12 + t * 0.4) * (0.9 + rnd() * 0.2);
        const hgt = H * 0.17;
        const jag: number[] = [];
        for (let k = 0; k <= 8; k++) jag.push((k % 2 ? 9 : -3) + (rnd() - 0.5) * 8);
        const lum = 27 + rnd() * 10 - t * 3;
        for (const ctx of [c, m]) {
          ctx.fillStyle = ctx === m ? '#fff' : hsl(135 + (rnd() - 0.5) * 10, 26, lum);
          ctx.beginPath();
          ctx.moveTo(W / 2, y);
          for (let k = 8; k >= 0; k--) ctx.lineTo(W / 2 - w * (k / 8) * 1.05, y + hgt + jag[8 - k]!);
          for (let k = 1; k <= 8; k++) ctx.lineTo(W / 2 + w * (k / 8) * 1.05, y + hgt + jag[k]!);
          ctx.closePath();
          ctx.fill();
        }
      }
      for (const ctx of [c, m]) {
        ctx.fillStyle = ctx === m ? '#fff' : '#3a2e22';
        ctx.fillRect(W / 2 - 5, H * 0.86, 10, H * 0.14);
      }
    },
    hsl(135, 26, 22),
  );
}

export function leafTexture(kind: LeafKind): THREE.Texture {
  let t = cache.get(kind);
  if (t) return t;
  switch (kind) {
    case 'oak':
      t = leafyTwig('oak', 3);
      break;
    case 'birch':
      t = leafyTwig('birch', 5);
      break;
    case 'willow':
      t = leafyTwig('willow', 7);
      break;
    case 'needle':
      t = needleTuft(11);
      break;
    case 'sprig':
      t = firSprig(13);
      break;
    case 'crown':
      t = crownBlob(17);
      break;
    case 'conifer':
      t = coniferSilhouette(19);
      break;
  }
  cache.set(kind, t);
  return t;
}

export interface BarkTextures {
  map: THREE.DataTexture;
  normal: THREE.DataTexture;
  /** R: original bark relief; G: dry plate / recessed crack roughness. Linear data. */
  surface: THREE.DataTexture;
}

function heightToNormal(h: Float32Array, n: number, k: number): Uint8Array {
  const out = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) {
    const jm = (j - 1 + n) % n;
    const jp = (j + 1) % n;
    for (let i = 0; i < n; i++) {
      const im = (i - 1 + n) % n;
      const ip = (i + 1) % n;
      const dx = (h[j * n + im]! - h[j * n + ip]!) * k;
      const dy = (h[jm * n + i]! - h[jp * n + i]!) * k;
      const l = Math.hypot(dx, dy, 1);
      const o = (j * n + i) * 4;
      out[o] = Math.round((dx / l * 0.5 + 0.5) * 255);
      out[o + 1] = Math.round((dy / l * 0.5 + 0.5) * 255);
      out[o + 2] = Math.round((1 / l * 0.5 + 0.5) * 255);
      out[o + 3] = 255;
    }
  }
  return out;
}

const barkCache = new Map<string, BarkTextures>();

/** Tileable bark (u around the trunk, v along it). Albedo is grey-brown and dark; the tree tints it with vertex colour. */
export function barkTextures(kind: BarkKind, n = 256): BarkTextures {
  const key = `${kind}:${n}`;
  const hit = barkCache.get(key);
  if (hit) return hit;
  const h = new Float32Array(n * n);
  const rgb = new Float32Array(n * n * 3);
  const warp = fbmField(n, 4, 6, 3, 201);
  // The close detail tile contains new, finer grain rather than a larger interpolation
  // of the old 256px texture. Both resolutions are deterministic and periodic.
  const fine = fbmField(n, n >= 512 ? 128 : 40, n >= 512 ? 84 : 40, 3, 202);
  const low = fbmField(n, 3, 5, 3, 203);
  const plates = kind === 'pine' ? voronoi(n, 5, 204, 0.9, 3) : null;
  for (let j = 0; j < n; j++) {
    const v = j / n;
    for (let i = 0; i < n; i++) {
      const u = i / n;
      const o = j * n + i;
      const w = (warp[o]! - 0.5) * 0.11;
      let ht: number;
      let base: RGB;
      if (kind === 'oak') {
        // Deep vertical furrows with cross-cracks.
        const f = 1 - Math.abs(pnoise((u + w) % 1, v, 11, 2, 205) * 2 - 1);
        const cross = pnoise(u, v, 22, 15, 206);
        ht = sstep(0.15, 0.95, f) * 0.8 + cross * 0.15 + fine[o]! * 0.1;
        base = mixc([0.1, 0.085, 0.07], [0.31, 0.27, 0.22], ht);
        const moss = sstep(0.61, 0.86, low[o]!) * (0.5 + fine[o]! * 0.5);
        base = mixc(base, [0.16, 0.22, 0.12], moss * 0.5);
      } else if (kind === 'pine') {
        const p = plates!;
        const edge = sstep(0.02, 0.22, p.f2[o]! - p.f1[o]!);
        const split = 1 - sstep(0.015, 0.065, Math.abs(pnoise(u + w, v, 34, 11, 214) - 0.5));
        const grain = pnoise(u + w * 0.2, v, 110, 9, 215);
        ht = edge * 0.64 + p.id[o]! * 0.18 + fine[o]! * 0.14 + grain * 0.04 - split * edge * 0.19;
        // Weathered silver-brown plates; the fine cracks have warm exposed wood beneath.
        base = mixc([0.16, 0.13, 0.105], [0.52, 0.43, 0.34], ht * (0.77 + p.id[o]! * 0.23));
        base = mixc(base, [0.20, 0.15, 0.105], split * edge * 0.20);
      } else if (kind === 'birch') {
        const band = sstep(0.62, 0.8, pnoise(u, v, 3, 34, 207)) * (0.5 + 0.5 * pnoise(u, v, 8, 3, 208));
        ht = 0.5 + fine[o]! * 0.1 - band * 0.5;
        base = mixc([0.55, 0.53, 0.48], [0.07, 0.065, 0.06], band);
        const pt = 1 - low[o]!;
        base = [base[0] * (0.85 + pt * 0.25), base[1] * (0.85 + pt * 0.25), base[2] * (0.85 + pt * 0.25)];
      } else {
        // Dead wood: weathered silver-grey grain with splits.
        const f = pnoise(u, v, 30, 3, 209) * 0.6 + pnoise(u, v, 9, 2, 210) * 0.4;
        const split = 1 - sstep(0.02, 0.08, Math.abs(pnoise(u, v, 4, 2, 211) - 0.5));
        ht = f * 0.7 - split * 0.5 + fine[o]! * 0.1;
        base = mixc([0.18, 0.165, 0.145], [0.5, 0.47, 0.42], clamp01(ht + 0.2));
      }
      const sp = rnd(o, 220);
      const g = 0.86 + fine[o]! * 0.28 + (sp > 0.99 ? 0.25 : 0);
      h[o] = clamp01(ht);
      rgb[o * 3] = base[0] * g;
      rgb[o * 3 + 1] = base[1] * g;
      rgb[o * 3 + 2] = base[2] * g;
    }
  }
  const alb = new Uint8Array(n * n * 4);
  const surface = new Uint8Array(n * n * 4);
  for (let o = 0; o < n * n; o++) {
    alb[o * 4] = Math.round(clamp01(rgb[o * 3]!) * 255);
    alb[o * 4 + 1] = Math.round(clamp01(rgb[o * 3 + 1]!) * 255);
    alb[o * 4 + 2] = Math.round(clamp01(rgb[o * 3 + 2]!) * 255);
    alb[o * 4 + 3] = 255;
    surface[o * 4] = Math.round(h[o]! * 255);
    surface[o * 4 + 1] = Math.round((0.78 + (1 - h[o]!) * 0.20) * 255);
    surface[o * 4 + 2] = 0;
    surface[o * 4 + 3] = 255;
  }
  const mk = (data: Uint8Array, srgb: boolean) => {
    const t = new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = 16;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  const res = { map: mk(alb, true), normal: mk(heightToNormal(h, n, (kind === 'birch' ? 3 : 9) * n / 256), false), surface: mk(surface, false) };
  barkCache.set(key, res);
  return res;
}

/** Free everything cached here (called when the world is torn down). */
export function disposeTreeTextures() {
  for (const t of cache.values()) t.dispose();
  cache.clear();
  for (const b of barkCache.values()) {
    b.map.dispose();
    b.normal.dispose();
    b.surface.dispose();
  }
  barkCache.clear();
}
