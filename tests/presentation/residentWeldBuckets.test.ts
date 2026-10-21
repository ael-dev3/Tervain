import { createHash } from 'node:crypto';
import { loadResident, residentMesh } from './residentFixtures';
import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { weldExact, weldExactSteps } from '../../src/presentation/npc/weld';

it.each(['sync', 'staged'] as const)('allocates a collision list only when needed (%s)', mode => {
  const position = new THREE.BufferAttribute(Float64Array.from([
    1, 0, 0, 1 + 1e-12, 0, 0, 1, 0, 0, 1 + 1e-12, 0, 0,
    2, 0, 0, 2, 0, 0, 1 + 2e-12, 0, 0,
  ]), 3);
  const set = Map.prototype.set, arrays = new Set<unknown[]>();
  const spy = vi.spyOn(Map.prototype, 'set').mockImplementation(function(this: Map<unknown, unknown>, key, value) {
    if (Array.isArray(value)) arrays.add(value);
    return set.call(this, key, value);
  });
  let result;
  try {
    if (mode === 'sync') result = weldExact(position);
    else {
      const steps = weldExactSteps(position);
      for (;;) { const next = steps.next(); if (next.done) { result = next.value; break; } }
    }
  } finally { spy.mockRestore(); }
  expect(result.node).toEqual(Int32Array.of(0, 1, 0, 1, 2, 2, 3));
  expect(result.first).toEqual(Int32Array.of(0, 1, 4, 6));
  expect(arrays.size).toBe(1);
});


it.each([
  ['rillford-reeve', 21474, '0e5820d79434d51795fc8d4192eedf8e58252c6a3e6a9526d2c4e8ae83841339'],
  ['ash-recorder', 17112, 'e48c4ab2e22c6a8d50a7f53f73c2f8127a4a6b7a272d554ac936e0dd4f9f2a6d'],
] as const)('preserves every delivered %s node and representative', async (id, points, expected) => {
  const { source } = await loadResident(id), position = residentMesh(source.scene).geometry.getAttribute('position');
  const a = weldExact(position), steps = weldExactSteps(position);
  let b;
  for (;;) { const next = steps.next(); if (next.done) { b = next.value; break; } }
  expect(b).toEqual(a);
  expect(a.first.length).toBe(points);
  const hash = createHash('sha256').update(JSON.stringify({ node: Array.from(a.node), first: Array.from(a.first) })).digest('hex');
  expect(hash).toBe(expected);
});
