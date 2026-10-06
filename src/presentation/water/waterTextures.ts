import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';

/**
 * The water's small detail, made once at start-up and shared by every water surface. All original and procedural:
 *
 *  - ripples: a tiling field of capillary and short gravity waves (a sum of waves on the tile's own lattice, so it
 *    repeats seamlessly), stored as slopes for the fragment normal;
 *  - foam: bubbly cells with torn lace between them, and fine sparkle, thresholded by how much foam a place has;
 *  - caustics: light traced through a gently waving surface onto a flat floor and counted where it lands, which is
 *    how real caustic webs form; two drifting layers of it light shallow beds.
 */

export interface WaterTextures {
  ripples: THREE.DataTexture;
  foam: THREE.DataTexture;
  caustics: THREE.DataTexture;
}

let shared: WaterTextures | null = null;

function finish(tex: THREE.DataTexture, name: string, mips = true): THREE.DataTexture {
  tex.name = name;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.generateMipmaps = mips;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** A periodic height field on a square tile: waves whose wave vectors lie on the tile lattice, amplitude by spectrum. */
function periodicWaves(count: number, seed: number, minK: number, maxK: number, falloff: number) {
  const rnd = mulberry32(seed);
  const waves: { kx: number; kz: number; amp: number; phase: number }[] = [];
  while (waves.length < count) {
    const kx = Math.round((rnd() * 2 - 1) * maxK), kz = Math.round((rnd() * 2 - 1) * maxK);
    const k = Math.hypot(kx, kz);
    if (k < minK || k > maxK) continue;
    waves.push({ kx, kz, amp: Math.pow(k, -falloff) * (0.6 + 0.4 * rnd()), phase: rnd() * Math.PI * 2 });
  }
  return waves;
}

/** RG: slopes d/dx, d/dz (0.5 = flat); B: height; A: unused. */
function makeRipples(): THREE.DataTexture {
  const n = 256;
  const waves = periodicWaves(72, 1301, 2, 34, 1.15);
  const h = new Float32Array(n * n), sx = new Float32Array(n * n), sz = new Float32Array(n * n);
  let maxSlope = 0, minH = Infinity, maxH = -Infinity;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let y = 0, gx = 0, gz = 0;
    for (const w of waves) {
      const theta = ((w.kx * i + w.kz * j) / n) * Math.PI * 2 + w.phase;
      y += w.amp * Math.sin(theta);
      const d = w.amp * Math.cos(theta) * Math.PI * 2;
      gx += d * w.kx; gz += d * w.kz;
    }
    const id = j * n + i;
    h[id] = y; sx[id] = gx; sz[id] = gz;
    maxSlope = Math.max(maxSlope, Math.abs(gx), Math.abs(gz));
    minH = Math.min(minH, y); maxH = Math.max(maxH, y);
  }
  const data = new Uint8Array(n * n * 4);
  for (let id = 0; id < n * n; id++) {
    data[id * 4] = Math.round((0.5 + 0.5 * sx[id]! / maxSlope) * 255);
    data[id * 4 + 1] = Math.round((0.5 + 0.5 * sz[id]! / maxSlope) * 255);
    data[id * 4 + 2] = Math.round(((h[id]! - minH) / (maxH - minH)) * 255);
    data[id * 4 + 3] = 255;
  }
  return finish(new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType), 'tervain-water-ripples');
}

/** R: bubbly foam cells; G: torn lace and streaks; B: fine sparkle; A: a smooth coverage noise for breaking up edges. */
function makeFoam(): THREE.DataTexture {
  const n = 512;
  const rnd = mulberry32(2207);
  // Worley points on a periodic grid of cells (two scales).
  const grid = (cells: number) => {
    const pts: [number, number][] = [];
    for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) pts.push([(i + 0.15 + rnd() * 0.7) / cells, (j + 0.15 + rnd() * 0.7) / cells]);
    return { cells, pts };
  };
  const big = grid(14), small = grid(38);
  const worley = (g: { cells: number; pts: [number, number][] }, u: number, v: number) => {
    const ci = Math.floor(u * g.cells), cj = Math.floor(v * g.cells);
    let f1 = Infinity, f2 = Infinity;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      const ii = (ci + di + g.cells) % g.cells, jj = (cj + dj + g.cells) % g.cells;
      const p = g.pts[jj * g.cells + ii]!;
      // Wrap the feature point into this neighbourhood.
      const px = p[0] + Math.floor((ci + di) / g.cells) * 1, pz = p[1] + Math.floor((cj + dj) / g.cells) * 1;
      const d = Math.hypot((px - u) * g.cells, (pz - v) * g.cells);
      if (d < f1) { f2 = f1; f1 = d; } else if (d < f2) f2 = d;
    }
    return [f1, f2] as const;
  };
  const lace = periodicWaves(40, 3307, 3, 40, 0.9);
  const cover = periodicWaves(18, 3313, 1, 7, 1.4);
  const data = new Uint8Array(n * n * 4);
  const laceVals = new Float32Array(n * n), coverVals = new Float32Array(n * n);
  let lMin = Infinity, lMax = -Infinity, cMin = Infinity, cMax = -Infinity;
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let l = 0, c = 0;
    for (const w of lace) l += w.amp * Math.sin(((w.kx * i + w.kz * j) / n) * Math.PI * 2 + w.phase);
    for (const w of cover) c += w.amp * Math.sin(((w.kx * i + w.kz * j) / n) * Math.PI * 2 + w.phase);
    laceVals[j * n + i] = l; coverVals[j * n + i] = c;
    lMin = Math.min(lMin, l); lMax = Math.max(lMax, l); cMin = Math.min(cMin, c); cMax = Math.max(cMax, c);
  }
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u = (i + 0.5) / n, v = (j + 0.5) / n;
    const [b1, b2] = worley(big, u, v);
    const [s1, s2] = worley(small, u, v);
    // Bubbles: bright rims where two cells meet, filled centres fading out.
    const rim = 1 - Math.min(1, (b2 - b1) * 3.2);
    const fine = 1 - Math.min(1, (s2 - s1) * 2.6);
    const bubbles = Math.min(1, rim * 0.75 + fine * 0.45 + Math.max(0, 0.35 - b1) * 0.8);
    const l = (laceVals[j * n + i]! - lMin) / (lMax - lMin);
    // Lace: narrow ridges of the turbulence, torn by the small cells.
    const ridge = Math.pow(1 - Math.abs(l * 2 - 1), 3) * (0.55 + 0.45 * fine);
    const sparkle = s1 < 0.14 ? 1 - s1 / 0.14 : 0;
    const id = (j * n + i) * 4;
    data[id] = Math.round(bubbles * 255);
    data[id + 1] = Math.round(Math.min(1, ridge) * 255);
    data[id + 2] = Math.round(sparkle * 255);
    data[id + 3] = Math.round(((coverVals[j * n + i]! - cMin) / (cMax - cMin)) * 255);
  }
  return finish(new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType), 'tervain-water-foam');
}

/** Single channel (R): caustic light, by photon counting through a periodic surface. */
function makeCaustics(): THREE.DataTexture {
  const n = 256;
  const waves = periodicWaves(9, 4409, 1, 5, 1.2);
  const counts = new Float32Array(n * n);
  const photons = 4;
  const depth = 0.9 * n;
  for (let j = 0; j < n * photons; j++) for (let i = 0; i < n * photons; i++) {
    const x = (i + 0.5) / photons, z = (j + 0.5) / photons;
    let gx = 0, gz = 0;
    for (const w of waves) {
      const d = w.amp * Math.cos(((w.kx * x + w.kz * z) / n) * Math.PI * 2 + w.phase) * Math.PI * 2 / n;
      gx += d * w.kx; gz += d * w.kz;
    }
    // Snell's law, small angles: light leaves the surface bent by a quarter of the slope (water's 1.33).
    const lx = x - gx * depth * 0.25 * 3, lz = z - gz * depth * 0.25 * 3;
    const ix = ((Math.floor(lx) % n) + n) % n, iz = ((Math.floor(lz) % n) + n) % n;
    counts[iz * n + ix]! += 1;
  }
  // Soften by one texel, then normalise so the mean is mid-grey and the web is bright.
  const blur = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    let s = 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) s += counts[((j + dj + n) % n) * n + ((i + di + n) % n)]! * (di === 0 && dj === 0 ? 4 : di === 0 || dj === 0 ? 2 : 1);
    blur[j * n + i] = s / 16;
  }
  const mean = photons * photons;
  const data = new Uint8Array(n * n * 4);
  for (let id = 0; id < n * n; id++) {
    const v = Math.min(1, Math.max(0, (blur[id]! / mean - 0.55) / 2.6));
    data[id * 4] = data[id * 4 + 1] = data[id * 4 + 2] = Math.round(Math.pow(v, 0.8) * 255);
    data[id * 4 + 3] = 255;
  }
  return finish(new THREE.DataTexture(data, n, n, THREE.RGBAFormat, THREE.UnsignedByteType), 'tervain-water-caustics');
}

/** The shared textures; created on first use and kept for the life of the page. */
export function waterTextures(): WaterTextures {
  if (!shared) shared = { ripples: makeRipples(), foam: makeFoam(), caustics: makeCaustics() };
  return shared;
}
