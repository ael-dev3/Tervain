import * as THREE from 'three';
import { mulberry32 } from '../../world/noise';

/** An original four-chart plant atlas. Pixels are authored from connected stems and leaf
 * ellipses, never photographs or reference-game imagery. RGB modulates the habitat's olive
 * palette; transparent padding and modest mip filtering retain small grass silhouettes. */
const cached = new Map<number, Uint8Array>();

function paint(size: number): Uint8Array {
  const existing = cached.get(size);
  if (existing) return existing;
  const pixels = new Uint8Array(size * size * 4), cell = size / 2;
  const root = mulberry32(604210);
  const put = (tile: number, x: number, y: number, alpha: number, value: number, dry = 0) => {
    if (x < 0 || y < 0 || x >= cell || y >= cell) return;
    const px = Math.floor(x) + tile % 2 * cell, py = Math.floor(y) + Math.floor(tile / 2) * cell;
    const index = (py * size + px) * 4, opacity = Math.round(Math.max(0, Math.min(1, alpha)) * 255);
    if (opacity <= pixels[index + 3]!) return;
    // A lightly painted midrib and worn margins stay subdued under direct sun.
    const grain = ((Math.imul(px + 1, 73856093) ^ Math.imul(py + 1, 19349663)) >>> 0) % 17 / 850 - 0.01;
    const base = Math.max(0.08, Math.min(1, value + grain));
    pixels[index] = Math.round(Math.min(1, base * (1 + dry * 0.13)) * 255);
    pixels[index + 1] = Math.round(base * (1 - dry * 0.045) * 255);
    pixels[index + 2] = Math.round(base * (1 - dry * 0.2) * 255);
    pixels[index + 3] = opacity;
  };
  const stroke = (tile: number, ax: number, ay: number, bx: number, by: number, width: number, value: number, dry = 0) => {
    ax *= cell; ay *= cell; bx *= cell; by *= cell; width *= cell;
    const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
    const loX = Math.max(0, Math.floor(Math.min(ax, bx) - width - 1)), hiX = Math.min(cell - 1, Math.ceil(Math.max(ax, bx) + width + 1));
    const loY = Math.max(0, Math.floor(Math.min(ay, by) - width - 1)), hiY = Math.min(cell - 1, Math.ceil(Math.max(ay, by) + width + 1));
    for (let y = loY; y <= hiY; y++) for (let x = loX; x <= hiX; x++) {
      const t = Math.max(0, Math.min(1, ((x + 0.5 - ax) * dx + (y + 0.5 - ay) * dy) / Math.max(1e-6, len2)));
      const distance = Math.hypot(x + 0.5 - ax - t * dx, y + 0.5 - ay - t * dy);
      put(tile, x, y, Math.max(0, Math.min(1, width + 0.6 - distance)), value, dry);
    }
  };
  const leaf = (tile: number, ax: number, ay: number, bx: number, by: number, width: number, value: number, dry = 0) => {
    ax *= cell; ay *= cell; bx *= cell; by *= cell; width *= cell;
    const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy), nx = dx / length, ny = dy / length;
    const loX = Math.max(0, Math.floor(Math.min(ax, bx) - width - 1)), hiX = Math.min(cell - 1, Math.ceil(Math.max(ax, bx) + width + 1));
    const loY = Math.max(0, Math.floor(Math.min(ay, by) - width - 1)), hiY = Math.min(cell - 1, Math.ceil(Math.max(ay, by) + width + 1));
    for (let y = loY; y <= hiY; y++) for (let x = loX; x <= hiX; x++) {
      const px = x + 0.5 - ax, py = y + 0.5 - ay, t = (px * nx + py * ny) / length;
      if (t < 0 || t > 1) continue;
      const across = Math.abs(-px * ny + py * nx), half = width * Math.sin(t * Math.PI) ** 0.8;
      const opacity = Math.max(0, Math.min(1, half + 0.6 - across));
      const rib = 1 - Math.min(1, across / Math.max(1, half));
      put(tile, x, y, opacity, value * (0.78 + rib * 0.16 + t * 0.06), dry);
    }
  };
  for (let tile = 0; tile < 4; tile++) {
    const herbs = tile === 2, short = tile === 0, dry = tile === 3;
    const stems = herbs ? 4 : short ? 8 : 6;
    for (let stem = 0; stem < stems; stem++) {
      const x0 = 0.16 + stem / (stems - 1) * 0.68, lean = (root() - 0.5) * 0.2;
      const top = (herbs ? 0.47 : short ? 0.66 : 0.77) + root() * (short ? 0.21 : 0.17);
      const x1 = x0 + lean * 0.45, y1 = top * 0.48, x2 = x0 + lean, y2 = top;
      const shade = 0.69 + root() * 0.19;
      stroke(tile, x0, 0.02, x1, y1, herbs ? 0.006 : 0.0045, shade * 0.76, dry ? 1 : 0);
      stroke(tile, x1, y1, x2, y2, herbs ? 0.0048 : 0.0035, shade, dry ? 1 : 0);
      if (herbs) {
        for (let level = 0; level < 3; level++) {
          const t = 0.3 + level * 0.22, x = x0 + lean * t, y = top * t;
          for (const sign of [-1, 1]) leaf(tile, x, y, x + sign * (0.11 - level * 0.018), y + 0.12, 0.021 + root() * 0.006, shade);
        }
        leaf(tile, x2, y2 - 0.05, x2 + lean * 0.1, y2 + 0.08, 0.021, shade);
      } else {
        for (let level = 0; level < 3; level++) {
          const t = 0.18 + level * 0.23, x = x0 + lean * t, y = top * t, sign = level % 2 ? 1 : -1;
          leaf(tile, x, y, x + sign * (0.07 + root() * 0.06), y + 0.16, short ? 0.011 : 0.007, shade, dry ? 0.8 : 0);
        }
        if (dry) for (let spike = 0; spike < 5; spike++) {
          const y = top - 0.05 - spike * 0.018, x = x2 - lean * spike * 0.02;
          leaf(tile, x, y, x + (spike % 2 ? -1 : 1) * 0.025, y + 0.018, 0.009, 0.92, 1);
        }
      }
    }
  }
  cached.set(size, pixels);
  return pixels;
}

export function buildGrassClusterTexture(size = 512): THREE.DataTexture {
  if (!Number.isInteger(size) || size < 64 || size % 2 !== 0) throw new Error('Grass atlas size must be an even integer of at least 64.');
  const texture = new THREE.DataTexture(paint(size).slice(), size, size, THREE.RGBAFormat);
  texture.name = 'Original rooted meadow / herb / seed-head clusters';
  texture.colorSpace = THREE.NoColorSpace; // Linear multiplier over the world habitat tint.
  texture.minFilter = THREE.LinearMipmapLinearFilter; texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true; texture.anisotropy = 8; texture.needsUpdate = true;
  return texture;
}
