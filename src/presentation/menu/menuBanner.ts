import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';
import { createWindCloth, type WindCloth } from '../menuWind';

/**
 * The one Hegemony standard at the vigil (A24: exactly one banner, on a grounded post). The owner-approved emblem (A22) is
 * painted into the cloth unchanged in shape, but the cloth has lived outdoors: the dye has faded unevenly, rain has left
 * tide lines, the lower third is splashed with mud from the track, the hem is torn into uneven tails and there are a couple
 * of holes. The PNG itself is never modified; weathering happens on the canvas the emblem is drawn into.
 */

export interface CanvasSource {
  /** A 2D canvas; in tests a stub. */
  canvas(w: number, h: number): HTMLCanvasElement;
  /** Load an image by URL; resolves null on failure. */
  image(url: string): Promise<CanvasImageSource | null>;
}

export const BANNER_W = 1.45;
export const BANNER_H = 3.5;
const TEX_W = 384;
const TEX_H = Math.round((TEX_W * BANNER_H) / BANNER_W);

type Ctx2D = CanvasRenderingContext2D;

/**
 * The weathered cloth without the emblem: base dye, weave, fading, stains, mud, a woven border and a torn hem (alpha).
 * `thickness` paints the same marks in grey as a light-through map: bare cloth is thin (white), border, mud and seams
 * are thick (dark). Both modes consume the same random sequence, so the two maps line up exactly.
 */
export function paintBannerCloth(c: Ctx2D, w: number, h: number, seed = 27, thickness = false) {
  const rng = mulberry32(seed);
  const T = thickness;
  c.clearRect(0, 0, w, h);
  // Dye: a deep violet-brown, bleached lighter toward the top where the sun has had it longest.
  const g = c.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, T ? '#ffffff' : '#5a3d4c');
  g.addColorStop(0.35, T ? '#f0f0f0' : '#452a3a');
  g.addColorStop(1, T ? '#c8c8c8' : '#2d1c24');
  c.fillStyle = g;
  c.fillRect(0, 0, w, h);
  // Uneven fading: soft blotches (sun-rotted patches are also thinner).
  for (let i = 0; i < 70; i++) {
    const x = rng() * w;
    const y = rng() * h * 0.8;
    const r = 20 + rng() * 90;
    const gr = c.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.05 + rng() * 0.08;
    gr.addColorStop(0, T ? `rgba(255,255,255,${a})` : `rgba(150,120,115,${a})`);
    gr.addColorStop(1, T ? 'rgba(255,255,255,0)' : 'rgba(150,120,115,0)');
    c.fillStyle = gr;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // Weave.
  c.globalAlpha = T ? 0.18 : 0.07;
  c.fillStyle = '#000';
  for (let y = 0; y < h; y += 3) c.fillRect(0, y, w, 1);
  c.fillStyle = T ? '#000' : '#d8c0b0';
  for (let x = 0; x < w; x += 3) c.fillRect(x, 0, 1, h);
  c.globalAlpha = 1;
  // Woven border band, dull ochre, worn through in places.
  c.strokeStyle = T ? 'rgba(30,30,30,0.85)' : 'rgba(150,112,60,0.55)';
  c.lineWidth = 7;
  c.strokeRect(14, 14, w - 28, h * 0.86);
  c.strokeStyle = T ? 'rgba(20,20,20,0.7)' : 'rgba(40,24,20,0.5)';
  c.lineWidth = 2;
  c.strokeRect(22, 22, w - 44, h * 0.86 - 16);
  for (let i = 0; i < 26; i++) {
    const a = 0.5 + rng() * 0.4;
    c.fillStyle = T ? `rgba(230,230,230,${a})` : `rgba(60,38,44,${a})`;
    const side = rng() < 0.5;
    c.fillRect(side ? (rng() < 0.5 ? 10 : w - 20) : 10 + rng() * (w - 20), side ? 14 + rng() * h * 0.85 : rng() < 0.5 ? 10 : h * 0.86 + 6, side ? 10 : 6 + rng() * 22, side ? 6 + rng() * 22 : 10);
  }
  // Rain tide lines.
  c.lineWidth = 1.5;
  for (let i = 0; i < 9; i++) {
    const y0 = h * (0.2 + rng() * 0.6);
    const ta = 0.08 + rng() * 0.08;
    c.strokeStyle = T ? `rgba(0,0,0,${ta})` : `rgba(190,160,150,${ta})`;
    c.beginPath();
    c.moveTo(0, y0);
    for (let x = 0; x <= w; x += 12) c.lineTo(x, y0 + Math.sin(x * 0.05 + i) * 6 + (rng() - 0.5) * 5);
    c.stroke();
  }
  // Mud: splashed from below, heavier toward the hem, with a few drips running down.
  for (let i = 0; i < 260; i++) {
    const t = Math.pow(rng(), 0.6);
    const y = h - t * h * 0.42;
    const x = rng() * w;
    const r = 1 + rng() * (6 + (1 - t) * 10);
    const mr = 40 + rng() * 25;
    const mg = 30 + rng() * 15;
    const mb = 18 + rng() * 10;
    const ma = 0.25 + (1 - t) * 0.55;
    c.fillStyle = T ? `rgba(0,0,0,${ma * 0.8})` : `rgba(${mr},${mg},${mb},${ma})`;
    c.beginPath();
    c.ellipse(x, y, r, r * (0.6 + rng() * 0.8), rng() * 3, 0, Math.PI * 2);
    c.fill();
    if (rng() < 0.08) c.fillRect(x - 1, y, 2, 10 + rng() * 40);
  }
  const mud = c.createLinearGradient(0, h * 0.62, 0, h);
  mud.addColorStop(0, T ? 'rgba(0,0,0,0)' : 'rgba(45,32,20,0)');
  mud.addColorStop(1, T ? 'rgba(0,0,0,0.7)' : 'rgba(45,32,20,0.75)');
  c.fillStyle = mud;
  c.fillRect(0, h * 0.62, w, h * 0.38);
  // Torn hem: three uneven tails, ragged threads, and two holes.
  c.globalCompositeOperation = 'destination-out';
  c.fillStyle = '#000';
  const tails = [0, 0.34 + rng() * 0.05, 0.67 + rng() * 0.05, 1];
  c.beginPath();
  c.moveTo(0, h);
  for (let k = 0; k < 3; k++) {
    const a = tails[k]! * w;
    const b = tails[k + 1]! * w;
    const tipY = h - (k === 1 ? 10 : 40 + rng() * 60);
    const notchY = h - (140 + rng() * 90);
    c.lineTo(a, tipY);
    for (let s = 1; s <= 6; s++) c.lineTo(a + ((b - a) * s) / 12, tipY + (rng() - 0.5) * 14);
    c.lineTo(b, notchY);
  }
  c.lineTo(w, h);
  c.closePath();
  c.fill();
  // Bottom of each tail is frayed: many little bites.
  for (let i = 0; i < 90; i++) {
    const x = rng() * w;
    const y = h * (0.9 + rng() * 0.1);
    c.fillRect(x, y, 1 + rng() * 3, 3 + rng() * 14);
  }
  for (let i = 0; i < 2; i++) {
    const x = w * (0.2 + rng() * 0.6);
    const y = h * (0.45 + rng() * 0.3);
    c.beginPath();
    c.ellipse(x, y, 5 + rng() * 9, 4 + rng() * 7, rng() * 3, 0, Math.PI * 2);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}

/**
 * Dull an emblem's pixels toward old dyed thread: less saturation, lower value, a warm cast, and blotchy wear where the
 * thread has rubbed thin. Works on raw RGBA so it does not depend on canvas filter support.
 */
export function weatherEmblemPixels(data: Uint8ClampedArray, w: number, h: number, seed = 5) {
  const rng = mulberry32(seed);
  const wear: { x: number; y: number; r: number }[] = [];
  for (let i = 0; i < 14; i++) wear.push({ x: rng() * w, y: rng() * h, r: (0.05 + rng() * 0.12) * w });
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const o = (j * w + i) * 4;
      if (data[o + 3] === 0) continue;
      let r = data[o]! / 255;
      let g = data[o + 1]! / 255;
      let b = data[o + 2]! / 255;
      const l = 0.3 * r + 0.59 * g + 0.11 * b;
      const sat = 0.4;
      r = l + (r - l) * sat;
      g = l + (g - l) * sat;
      b = l + (b - l) * sat;
      // Warm, darkened, lower contrast.
      r = (r * 0.66 + 0.06) * 1.05;
      g = (g * 0.66 + 0.05) * 0.98;
      b = (b * 0.66 + 0.05) * 0.86;
      let rub = 0;
      for (const p of wear) rub = Math.max(rub, 1 - Math.hypot(i - p.x, j - p.y) / p.r);
      const a = (data[o + 3]! / 255) * (0.9 - 0.55 * Math.max(0, rub) * (0.6 + 0.4 * rng()));
      data[o] = Math.round(Math.min(1, r) * 255);
      data[o + 1] = Math.round(Math.min(1, g) * 255);
      data[o + 2] = Math.round(Math.min(1, b) * 255);
      data[o + 3] = Math.round(Math.max(0, a) * 255);
    }
  }
}

/**
 * Paint the emblem into the cloth: dulled, a little sun-bleached and rubbed thin, as if dyed and embroidered years ago.
 * With `thickness`, only its shape is painted, dark: embroidered thread stops the light that shines through the cloth.
 */
export function paintBannerEmblem(c: Ctx2D, w: number, h: number, emblem: CanvasImageSource, iw: number, ih: number, scratch: HTMLCanvasElement, thickness = false) {
  const size = Math.round(w * 0.74);
  const eh = Math.round((size * ih) / Math.max(1, iw));
  const x = Math.round((w - size) / 2);
  const y = Math.round(h * 0.2);
  scratch.width = size;
  scratch.height = eh;
  const s = scratch.getContext('2d', { willReadFrequently: true })!;
  s.clearRect(0, 0, size, eh);
  s.drawImage(emblem, 0, 0, size, eh);
  const img = s.getImageData(0, 0, size, eh);
  weatherEmblemPixels(img.data, size, eh);
  if (thickness) {
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 20;
      img.data[i + 3] = Math.round(img.data[i + 3]! * 0.85);
    }
  }
  s.putImageData(img, 0, 0);
  c.save();
  // Only where the cloth still exists (not in the tears).
  c.globalCompositeOperation = 'source-atop';
  c.drawImage(scratch, x, y);
  // Weave and grime over the print.
  if (!thickness) {
    c.globalAlpha = 0.2;
    c.fillStyle = '#1a0f10';
    for (let yy = y; yy < y + eh; yy += 3) c.fillRect(x, yy, size, 1);
  }
  c.restore();
}

export interface MenuBanner {
  group: THREE.Group;
  cloth: WindCloth;
  /** True once the emblem is on the cloth. */
  printed(): boolean;
  update(time: number, strength: number): void;
  dispose(): void;
}

/**
 * Pole, crossbar and cloth. The pole is an unbarked trunk, crooked, set in a cairn of field stones and held by two guy ropes
 * pegged into the ground; an iron spike caps it. `region` supplies the shared rugged materials for the hardware.
 */
export function buildMenuBanner(
  src: CanvasSource,
  emblemUrl: string,
  groundAt: (x: number, z: number) => number,
  hardware: (group: THREE.Group, poleTop: THREE.Vector3, barY: number) => void,
): MenuBanner {
  const group = new THREE.Group();
  group.name = 'Menu_Hegemony_Standard';
  const canvas = src.canvas(TEX_W, TEX_H);
  const c = canvas.getContext('2d')!;
  paintBannerCloth(c, TEX_W, TEX_H);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const thinCanvas = src.canvas(TEX_W, TEX_H);
  const tc = thinCanvas.getContext('2d')!;
  paintBannerCloth(tc, TEX_W, TEX_H, 27, true);
  const thin = new THREE.CanvasTexture(thinCanvas);
  thin.colorSpace = THREE.NoColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.96, metalness: 0, alphaTest: 0.5 });
  // The standard hangs between the camera and the low sun: its dyed wool glows where the light comes through, the
  // embroidered emblem, the border and the mud stay dark against it.
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uThin = { value: thin };
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uThin;').replace(
      '#include <lights_fragment_begin>',
      `#include <lights_fragment_begin>
      #if NUM_DIR_LIGHTS > 0
      {
        vec3 bL = normalize(directionalLights[0].direction);
        float bBack = clamp(-dot(normal, bL), 0.0, 1.0);
        float bThin = texture2D(uThin, vMapUv).r;
        vec3 dye = diffuseColor.rgb * vec3(1.05, 0.85, 0.88) + vec3(0.006, 0.003, 0.003);
        reflectedLight.indirectDiffuse += dye * directionalLights[0].color * bBack * bThin * bThin * 0.75;
      }
      #endif`,
    );
  };
  mat.customProgramCacheKey = () => 'tervain-menu-standard-cloth';
  const cloth = createWindCloth(BANNER_W, BANNER_H, mat, { segmentsX: 12, segmentsY: 28, phase: 1.7, amplitude: 0.07 });
  cloth.mesh.name = 'Menu_Hegemony_Standard_Cloth';
  cloth.mesh.castShadow = true;
  const poleTop = new THREE.Vector3(0.1, 7.2, 0.05);
  const barY = 6.75;
  cloth.mesh.position.set(0.12 + BANNER_W / 2 + 0.05, barY - BANNER_H / 2 - 0.05, 0.1);
  group.add(cloth.mesh);
  hardware(group, poleTop, barY);
  void groundAt;
  let printed = false;
  let disposed = false;
  void src.image(emblemUrl).then((img) => {
    if (!img || disposed) return;
    const iw = (img as HTMLImageElement).naturalWidth || (img as { width?: number }).width || 1;
    const ih = (img as HTMLImageElement).naturalHeight || (img as { height?: number }).height || 1;
    // Repaint from scratch so a late load never double-prints.
    paintBannerCloth(c, TEX_W, TEX_H);
    paintBannerEmblem(c, TEX_W, TEX_H, img, iw, ih, src.canvas(4, 4));
    tex.needsUpdate = true;
    paintBannerCloth(tc, TEX_W, TEX_H, 27, true);
    paintBannerEmblem(tc, TEX_W, TEX_H, img, iw, ih, src.canvas(4, 4), true);
    thin.needsUpdate = true;
    printed = true;
  });
  return {
    group,
    cloth,
    printed: () => printed,
    update(time: number, strength: number) {
      cloth.update(time, strength);
    },
    dispose() {
      disposed = true;
      cloth.mesh.geometry.dispose();
      mat.dispose();
      tex.dispose();
      thin.dispose();
    },
  };
}
