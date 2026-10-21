import { createHash } from 'node:crypto';
import { expect, it, vi } from 'vitest';
const allocations = vi.hoisted(() => ({ v3: 0, v4: 0 }));
vi.mock('three', async importOriginal => {
  const actual = await importOriginal<typeof import('three')>();
  return { ...actual,
    Vector3: class extends actual.Vector3 { constructor(x?: number, y?: number, z?: number) { super(x, y, z); allocations.v3++; } },
    Vector4: class extends actual.Vector4 { constructor(x?: number, y?: number, z?: number, w?: number) { super(x, y, z, w); allocations.v4++; } },
  };
});
import * as THREE from 'three';
import { deriveBranchLeaf, type BranchField } from '../../src/presentation/foliage/branchWind';

it('reuses card scratch while preserving component data, including roots visited late and missing anchors', () => {
  const geometry = new THREE.BufferGeometry(), positions: number[] = [], indices: number[] = [];
  for (let k = 0; k < 96; k++) {
    const x = k * 0.01, i = k * 4;
    positions.push(x, 2, 0, x + .004, 2, 0, x + .004, 2.004, 0, x, 2.004, 0);
    indices.push(i + 2, i, i + 1, i + 2, i + 3, i); // Component root is not its first visited vertex.
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices);
  const field: BranchField = { axis: [0, 0], height: 8, limbs: 1,
    nearest(x) { return x > .95 ? -1 : 0; },
    position(_, out) { out.set(0, 2, 0); },
    read(_, wind, pivot) { wind.set(.654321098, .123456789, 2.345678901, 0); pivot.set(.123456789, 1.23456789, -.345678901); },
  };
  allocations.v3 = allocations.v4 = 0;
  const result = deriveBranchLeaf(geometry, field);
  expect(result?.anchored).toBe(95 / 96);
  const hash = createHash('sha256');
  for (const name of ['_wind', '_pivot']) hash.update(new Uint8Array(geometry.getAttribute(name).array.buffer));
  expect(hash.digest('hex')).toBe('5f6152426e6d158647bf83477af9e2d325045636cb49cbfef93271f13ed6c4ae');
  expect(allocations).toEqual({ v3: 3, v4: 1 });
  geometry.dispose();
});
