import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import type { G3Image } from '../../src/gothic3local/image';
import { clusterFor, leafClusters } from '../../src/gothic3local/leafatlas';
import { parseSpeedTree, tokenize } from '../../src/gothic3local/speedtree';
import { growTree, isConifer, leafMaterials } from '../../src/gothic3local/trees';
import { type Token, speedTree } from './fixtures';

const level = (min: number, max: number, angle: number): Token[] => [
  [1016],
  [6004, `BezierSpline ${min} ${max} 0.1\n{\n2\n0 1 0 0 1\n}`],
  [6005, 'BezierSpline 0.02 0.04 0'],
  [6007, `BezierSpline ${angle} ${angle + 20} 0`],
  [6012, 6],
  [1017],
];

function definition(region: readonly number[] = [1, 1, 0, 1, 0, 0, 1, 0]): Uint8Array {
  return speedTree([
    [1000, '__IdvSpt_02_'],
    [1002],
    [2000, 'G3_SpT_Bark_RedOakBark_01_Diffuse_01.tga'],
    [2001, 650],
    [2002, new Uint8Array([0])],
    [2003, 100],
    ...level(0.6, 0.8, 0),
    ...level(0.3, 0.5, 40),
    ...level(0.2, 0.3, 50),
    [4003, 'CarolinaBuckthorn_Leaves_1.tga'],
    // A section whose payload is not one of the usual sizes.
    [10000],
    [10002, new Uint8Array([1, 0, 0, 0, 0, 0, 0, 0x3f, 0, 0, 0x40, 0x3f, 0, 0])],
    [10001],
    [14002, 'CarolinaBuckthornFrond.tga'],
    [20000],
    [20002, 'G3_Speedtree_Misc_Composite_02_Diffuse_01.dds'],
    [20003, new Uint8Array([0])],
    [20004, new Uint8Array([0])],
    [20005, region],
    [20001],
    [22000, new Uint8Array([0])],
  ]);
}

describe('SpeedTree definitions', () => {
  it('tokenizes to the end, through payloads of unusual sizes', () => {
    const bytes = definition();
    const tokens = tokenize(bytes);
    const last = tokens[tokens.length - 1]!;
    expect(last.at + last.data.length).toBe(bytes.length);
    expect(tokens.find((t) => t.id === 10002)?.data.length).toBe(14);
  });

  it('reads the parameters the viewer grows trees from', () => {
    const def = parseSpeedTree(definition());
    expect(def.bark).toBe('G3_SpT_Bark_RedOakBark_01_Diffuse_01.tga');
    expect(def.size).toBeCloseTo(650);
    expect(def.levels).toHaveLength(3);
    expect(def.levels[1]!.length).toEqual({ min: 0.3, max: 0.5, variance: 0.1 });
    expect(def.levels[2]!.angle.min).toBe(50);
    expect(def.composite).toBe('G3_Speedtree_Misc_Composite_02_Diffuse_01.dds');
    // The whole image is not a billboard region; a part of it is.
    expect(def.billboardRegion).toBeNull();
    expect(parseSpeedTree(definition([1, 0.4863, 0.5, 0.4863, 0.5, 0.2432, 1, 0.2432])).billboardRegion).toEqual([0.5, Math.fround(0.2432), 1, Math.fround(0.4863)]);
    expect(() => parseSpeedTree(speedTree([[1000, 'something else']]))).toThrow(/SpeedTree/);
  });
});

describe('grown trees', () => {
  const def = parseSpeedTree(definition());

  it('grows the same tree for the same species, with leaf cards that face the camera', () => {
    const a = growTree('g3_tree_s_linden_01.spt', def, [0.25, 0.5, 0.5, 0.75]);
    const b = growTree('g3_tree_s_linden_01.spt', def, [0.25, 0.5, 0.5, 0.75]);
    expect(Array.from(a.leaves.getAttribute('position').array)).toEqual(Array.from(b.leaves.getAttribute('position').array));
    const corners = a.leaves.getAttribute('g3corner');
    const positions = a.leaves.getAttribute('position');
    expect(corners.count).toBe(positions.count);
    // Each card's four corners share its centre and spread around it.
    expect([positions.getX(0), positions.getY(0)]).toEqual([positions.getX(3), positions.getY(3)]);
    expect(corners.getX(0) + corners.getX(2)).toBeCloseTo(0, 5);
    // The leaf image region, top of the image at the top of the card.
    const uv = a.leaves.getAttribute('uv');
    expect([uv.getX(0), uv.getY(0), uv.getX(2), uv.getY(2)]).toEqual([0.25, 0.75, 0.5, 0.5]);
    // Bounds include the cards' reach beyond their centres.
    const sphere = a.leaves.boundingSphere!;
    let farthest = 0;
    for (let i = 0; i < positions.count; i++) farthest = Math.max(farthest, sphere.center.distanceTo(new THREE.Vector3().fromBufferAttribute(positions, i)));
    expect(sphere.radius - farthest).toBeGreaterThan(10);
    expect(a.bark.getAttribute('position').count).toBeGreaterThan(100);
    expect(a.height).toBeGreaterThan(0);
  });

  it('grows needle trees as cones and broad-leaved ones as rounder crowns', () => {
    expect([isConifer('G3_Tree_M_DouglasFir_04.spt'), isConifer('G3_Tree_L_PinOak_01.spt'), isConifer('G3_Tree_S_Linden_01.spt')]).toEqual([true, false, false]);
    const fir = growTree('g3_tree_m_douglasfir_04.spt', def);
    const box = new THREE.Box3().setFromBufferAttribute(fir.leaves.getAttribute('position') as THREE.BufferAttribute);
    const low: number[] = [];
    const high: number[] = [];
    const p = fir.leaves.getAttribute('position');
    for (let i = 0; i < p.count; i += 4) (p.getY(i) < (box.min.y + box.max.y) / 2 ? low : high).push(Math.hypot(p.getX(i), p.getZ(i)));
    const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
    expect(fir.conifer).toBe(true);
    expect(mean(low)).toBeGreaterThan(mean(high));
    const { material, depth } = leafMaterials(null, { time: { value: 0 }, overbright: { value: 1 }, detailBox: { value: new THREE.Vector4() } }, fir.height, 'fir');
    expect([material.side, (material as THREE.MeshLambertMaterial).alphaTest, (depth as THREE.MeshDepthMaterial).alphaTest]).toEqual([THREE.DoubleSide, 0.2, 0.2]);
  });
});

/** An ARGB8 image with one shape per quarter tile, drawn by `paint(tile, x, y)` (texel coordinates within the tile). */
function atlas(size: number, paint: (tile: number, x: number, y: number) => boolean): G3Image {
  const data = new Uint8Array(size * size * 4);
  const tile = size / 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = Math.floor(y / tile) * 4 + Math.floor(x / tile);
      if (!paint(t, x % tile, y % tile)) continue;
      const o = (y * size + x) * 4;
      data.set([40, 120, 50, 255], o);
    }
  }
  return { width: size, height: size, format: 'ARGB8', faces: [[data]] };
}

describe('leaf clusters in composite images', () => {
  const size = 256;
  const t = size / 4;
  const image = atlas(size, (tile, x, y) => {
    const dx = x - t / 2;
    const dy = y - t / 2;
    const r = Math.hypot(dx, dy);
    switch (tile) {
      case 0: // A broad cluster: a ragged disc.
        return r < t * 0.42 + Math.sin(Math.atan2(dy, dx) * 7) * 3;
      case 1: // Billboards: two narrow upright trees.
        return (Math.abs(x - t * 0.25) < 4 || Math.abs(x - t * 0.75) < 4) && y > 6 && y < t - 4;
      case 2: // A bare branch: thin lines.
        return Math.abs(x - y) < 1 || Math.abs(x + y - t) < 1;
      case 3: {
        // Needles: thin spokes from a centre.
        const a = Math.atan2(dy, dx);
        return r < t * 0.45 && (r < 4 || Math.abs(Math.sin(a * 12)) < 0.45);
      }
      default:
        return false;
    }
  });

  it('keeps broad and needle clusters, and leaves billboards and bare branches out', () => {
    const clusters = leafClusters(image);
    const tiles = clusters.map((c) => Math.floor(c.v0 * 4) * 4 + Math.floor(c.u0 * 4)).sort();
    expect(tiles).toEqual([0, 3]);
    expect(clusterFor('g3_tree_m_douglasfir_04.spt', clusters, true)?.u0).toBeGreaterThanOrEqual(0.75);
    expect(clusterFor('g3_tree_s_linden_01.spt', clusters, false)?.u0).toBeLessThan(0.25);
    expect(clusterFor('anything', [], false)).toBeNull();
  });
});
