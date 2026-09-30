import { describe, expect, it } from 'vitest';
import { WORDMARK_VIEW, cropToContent, renderWordmark, wordmarkShapes } from '../../src/presentation/ui/menuArtwork';
import { paintBronzeFrame, paintGrimeDark, paintGrimeLight, paintLeather, paintParchment } from '../../src/presentation/ui/menuMaterials';

function hash(d: Uint8ClampedArray) {
  let h = 2166136261;
  for (let i = 0; i < d.length; i += 7) h = Math.imul(h ^ d[i]!, 16777619);
  return h >>> 0;
}

describe('TERVAIN wordmark', () => {
  it('keeps every shape inside the design box, with the V and the sword-blade I below the baseline', () => {
    const { add, cut } = wordmarkShapes();
    expect(add.length).toBeGreaterThan(30);
    expect(cut.length).toBeGreaterThanOrEqual(2);
    let maxY = 0;
    for (const p of [...add, ...cut]) {
      for (const [x, y] of p) {
        expect(x).toBeGreaterThanOrEqual(-5);
        expect(x).toBeLessThanOrEqual(WORDMARK_VIEW.w);
        expect(y).toBeGreaterThanOrEqual(-5);
        expect(y).toBeLessThanOrEqual(WORDMARK_VIEW.h);
        maxY = Math.max(maxY, y);
      }
    }
    expect(maxY).toBeGreaterThan(170);
  });

  it('casts the same image every time, with a transparent background and solid letters', () => {
    const a = renderWordmark(480);
    const b = renderWordmark(480);
    expect(a.w).toBe(480);
    expect(a.h).toBeGreaterThan(100);
    expect(hash(a.data)).toBe(hash(b.data));
    // Corners are clear.
    for (const [x, y] of [[0, 0], [a.w - 1, 0], [0, a.h - 1], [a.w - 1, a.h - 1]] as const) expect(a.data[(y * a.w + x) * 4 + 3]).toBe(0);
    let solid = 0;
    let lit = 0;
    for (let i = 0; i < a.w * a.h; i++) {
      if (a.data[i * 4 + 3]! > 250) {
        solid++;
        if (a.data[i * 4]! > 150) lit++;
      }
    }
    const frac = solid / (a.w * a.h);
    expect(frac).toBeGreaterThan(0.1);
    expect(frac).toBeLessThan(0.6);
    // Worn bright edges exist, but the metal is not a flat gold fill.
    expect(lit).toBeGreaterThan(20);
    expect(lit / solid).toBeLessThan(0.5);
  });

  it('trims the casting to what can be seen, with an even margin, so it centres on the panel and stands on it', () => {
    const img = renderWordmark(480);
    const m = 3;
    const c = cropToContent(img, m);
    expect(c.w).toBeLessThan(img.w);
    expect(c.h).toBeLessThan(img.h);
    const alpha = (x: number, y: number) => c.data[(y * c.w + x) * 4 + 3]!;
    const row = (y: number) => Array.from({ length: c.w }, (_, x) => alpha(x, y)).some((v) => v > 4);
    const col = (x: number) => Array.from({ length: c.h }, (_, y) => alpha(x, y)).some((v) => v > 4);
    // Something visible lies exactly the margin in from every edge, and nothing lies closer.
    for (const [has, at] of [[row, m], [row, c.h - 1 - m], [col, m], [col, c.w - 1 - m]] as const) expect(has(at)).toBe(true);
    for (const [has, at] of [[row, 0], [row, c.h - 1], [col, 0], [col, c.w - 1]] as const) expect(has(at)).toBe(false);
  });
});

describe('menu surfaces', () => {
  it('produce images of the requested size with sensible alpha', () => {
    const dark = paintGrimeDark(512, 3);
    const light = paintGrimeLight(512, 4);
    const leather = paintLeather(64, 5);
    for (const p of [dark, light]) {
      expect(p.data.length).toBe(512 * 512 * 4);
      let covered = 0;
      for (let i = 3; i < p.data.length; i += 4) if (p.data[i]! > 0) covered++;
      // A film of specks and scratches, not a wash.
      expect(covered / (512 * 512)).toBeGreaterThan(0.005);
      expect(covered / (512 * 512)).toBeLessThan(0.3);
    }
    for (let i = 3; i < leather.data.length; i += 4) expect(leather.data[i]).toBe(255);
  });

  it('casts the frame as one solid piece round an open centre, with notched corners and seamless sides', () => {
    const size = 192;
    const { pixels, slice } = paintBronzeFrame(size, 48, 9);
    const px = (x: number, y: number) => Array.from(pixels.data.slice((y * size + x) * 4, (y * size + x) * 4 + 4));
    expect(slice).toBe(48);
    // The leather shows through the middle, and the corner is notched clear.
    expect(px(96, 96)[3]).toBe(0);
    expect(px(1, 1)[3]).toBe(0);
    // Solid from just inside the outer edge all the way to the leather on every side: no ring of scene between the frame
    // and the panel it holds.
    for (let d = 1; d < slice; d++) {
      for (const [x, y] of [[96, d], [96, size - 1 - d], [d, 96], [size - 1 - d, 96]] as const) expect(px(x, y)[3]).toBe(255);
    }
    // A verdigris lip lines the leather's edge.
    const [r, g, b] = px(96, 45);
    expect(g!).toBeGreaterThan(r!);
    expect(b!).toBeGreaterThan(r!);
    // The sides repeat seamlessly: where one repeat of the side ends the next (or the corner) carries on the same grain.
    for (let y = 10; y < 36; y++) expect(px(size - slice, y)).toEqual(px(slice, y));
  });

  it('tears the parchment edge and repeats its middle without a seam', () => {
    const size = 256;
    const s = 40;
    const { pixels } = paintParchment(size, s, 11);
    const a = (x: number, y: number) => pixels.data[(y * size + x) * 4 + 3]!;
    expect(a(0, 128)).toBe(0);
    expect(a(128, 0)).toBe(0);
    expect(a(128, 128)).toBe(255);
    // The middle slice [s, size - s) repeats: its first and last columns must continue into each other.
    const inner = size - 2 * s;
    let diff = 0;
    for (let y = s; y < size - s; y++) {
      const o1 = (y * size + s) * 4;
      const o2 = (y * size + s + inner - 1) * 4;
      diff += Math.abs(pixels.data[o1]! - pixels.data[o2]!);
    }
    expect(diff / inner).toBeLessThan(12);
  });
});
