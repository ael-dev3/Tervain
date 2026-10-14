import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { weightedCell } from '../../src/presentation/canopy';
import {
  BROADLEAF_CELL_COUNT, CONIFER_PAD, FIR_CELL_TABLE, LEAF_ATLAS_GRID, broadleafCellWeights, combineAtlas, coverageAt, coverageMips, halveKeepingCoverage,
  remapFirToAtlas, remapPineToAtlas, type AtlasLevel,
} from '../../src/presentation/leafAtlas';

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root));
const manifest = JSON.parse(read('public/textures/leaf/manifest.json').toString('utf8')) as {
  schema: number; files: Record<string, { file: string; bytes: number; sha256: string }>;
  layout: Record<string, { size: number; grid: number; cells: { index: number; name: string }[]; coverage: number[] }>;
};

describe('the procedural leaf atlases (B12)', () => {
  it('ships both atlases as checked files with the documented 4 x 4 layout', () => {
    expect(manifest.schema).toBe(1);
    for (const key of ['broadleaf.color', 'broadleaf.data', 'conifer.color', 'conifer.data']) {
      const entry = manifest.files[key]!;
      const bytes = read(`public/textures/leaf/${entry.file}`);
      expect(bytes.length, key).toBe(entry.bytes);
      expect(createHash('sha256').update(bytes).digest('hex'), key).toBe(entry.sha256);
      expect(bytes.subarray(8, 12).toString('latin1'), key).toBe('WEBP');
    }
    for (const name of ['broadleaf', 'conifer']) {
      const layout = manifest.layout[name]!;
      expect(layout.size).toBe(2048);
      expect(layout.grid).toBe(LEAF_ATLAS_GRID);
      expect(layout.cells.length).toBe(16);
      expect(new Set(layout.cells.map((cell) => cell.name)).size).toBe(16);
    }
    expect(CONIFER_PAD.pine).toEqual([8, 9, 10, 11]);
    expect(manifest.layout.conifer!.cells[CONIFER_PAD.firLeader]!.name).toBe('fir-leader');
    expect(manifest.layout.conifer!.cells[CONIFER_PAD.pine[0]!]!.name).toBe('pine-pad-a');
    // Every pad carries leaves: none is empty and none is solid.
    for (const share of [...manifest.layout.broadleaf!.coverage, ...manifest.layout.conifer!.coverage]) { expect(share).toBeGreaterThan(0.05); expect(share).toBeLessThan(0.8); }
  });

  it('weights species toward their own leaf shapes and keeps autumn cells rare', () => {
    const oak = broadleafCellWeights('oak'), birch = broadleafCellWeights('birch');
    expect(oak).toHaveLength(BROADLEAF_CELL_COUNT);
    expect(oak[4]).toBe(0); expect(birch[1]).toBe(0);
    expect(oak[3]).toBeLessThan(oak[2]!);
    expect(weightedCell(oak, 0)).toBe(0);
    expect(weightedCell(oak, 0.999999)).toBe(15);
    const hits = new Set<number>();
    for (let i = 0; i < 4000; i++) hits.add(weightedCell(oak, i / 4000));
    expect(hits.size).toBeGreaterThanOrEqual(7);
  });

  it('maps every source fir sprig to a fir, spruce, whorl or leader pad', () => {
    expect(FIR_CELL_TABLE).toHaveLength(64);
    const pads = new Set(FIR_CELL_TABLE.map((code) => code >> 1));
    for (const pad of pads) expect(pad >= 0 && pad <= 15 && !CONIFER_PAD.pine.includes(pad as 8) && pad !== CONIFER_PAD.pineTuft && pad !== CONIFER_PAD.pineLeader).toBe(true);
    expect(pads.size).toBeGreaterThanOrEqual(10);
  });

  it('remaps card UVs cell by cell, keeping their place within the cell (mirrored where the table says)', () => {
    const g = new THREE.BufferGeometry();
    // Source cell (col 2, row 0): table code 12 = pad 6 unmirrored; cell (col 0, row 0): code 9 = pad 4 mirrored.
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0.26, 0.01, 0.37, 0.01, 0.3, 0.1, 0.01, 0.01, 0.1, 0.01, 0.05, 0.1], 2));
    g.setIndex([0, 1, 2, 3, 4, 5]);
    expect(remapFirToAtlas(g)).toBe(6);
    const uv = g.getAttribute('uv');
    expect(uv.getX(0)).toBeCloseTo((2 + (0.26 * 8 - 2)) / 4, 5);
    expect(uv.getY(2)).toBeCloseTo((1 + 0.1 * 8) / 4, 5);
    expect(uv.getX(3)).toBeCloseTo((0 + (1 - 0.08)) / 4, 5);
    expect(uv.getY(3)).toBeCloseTo((1 + 0.08) / 4, 5);
    const p = new THREE.BufferGeometry();
    p.setAttribute('uv', new THREE.Float32BufferAttribute([0.6, 0.1, 0.9, 0.1, 0.75, 0.4], 2));
    p.setIndex([0, 1, 2]);
    remapPineToAtlas(p);
    // Source cell (1, 0) becomes pine pad 9 (column 1, row 2).
    expect(p.getAttribute('uv').getX(0)).toBeCloseTo((1 + (0.6 * 2 - 1)) / 4, 5);
    expect(p.getAttribute('uv').getY(0)).toBeCloseTo((2 + 0.2) / 4, 5);
  });

  it('keeps coverage through the mips and never darkens an edge', () => {
    const size = 256, data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4, field = Math.sin(x * 1.3) * Math.sin(y * 1.1 + 0.4) + 0.5 * Math.sin(x * 0.37 + y * 0.53), leaf = Math.max(0, Math.min(1, field * 1.4 - 0.5)); // thin soft leaves: a mean filter would thin them out
      data[i] = 90; data[i + 1] = 130; data[i + 2] = 50; data[i + 3] = Math.round(leaf * 255);
    }
    const top: AtlasLevel = { width: size, height: size, data };
    const cutoff = 0.27, mips = coverageMips(top, cutoff), target = coverageAt(top, cutoff);
    expect(mips).toHaveLength(9);
    for (const level of mips.slice(1, 4)) expect(Math.abs(coverageAt(level, cutoff) - target)).toBeLessThan(0.08);
    // Colour is weighted by alpha: transparent texels (set to black here) do not pull a halved edge dark.
    const dark = new Uint8Array(data); for (let i = 0; i < dark.length; i += 4) if (!dark[i + 3]) { dark[i] = 0; dark[i + 1] = 0; dark[i + 2] = 0; }
    const half = halveKeepingCoverage({ width: size, height: size, data: dark }, target, cutoff);
    for (let i = 0; i < half.data.length; i += 4) if (half.data[i + 3]! > 0) expect(half.data[i]!).toBeGreaterThan(70);
  });

  it('combines the colour and data images into straight RGBA', () => {
    const color = [10, 20, 30, 255, 40, 50, 60, 255], data = [200, 1, 2, 255, 0, 3, 4, 255];
    expect([...combineAtlas(color, data, 1).data.slice(0, 4)]).toEqual([10, 20, 30, 200]);
  });
});
