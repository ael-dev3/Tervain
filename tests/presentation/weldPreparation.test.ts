import * as THREE from 'three';
import { expect, it } from 'vitest';
import { weldExact, weldExactSteps } from '../../src/presentation/npc/weld';

it('can interleave exact welds without joining merely nearby positions', () => {
  const a = new THREE.Float32BufferAttribute(Array.from({ length: 1600 }, (_, i) => [i % 23, i % 7, i % 5]).flat(), 3);
  const b = new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, .00001, 0, 0, -0, 0, 0], 3);
  const expectedA = weldExact(a), expectedB = weldExact(b), left = weldExactSteps(a), right = weldExactSteps(b);
  let yields = 0;
  for (;;) {
    const next = left.next();
    if (next.done) { expect(next.value).toEqual(expectedA); break; }
    yields++;
    if (yields === 1) {
      const other = right.next();
      expect(other.done).toBe(true);
      if (other.done) expect(other.value).toEqual(expectedB);
    }
  }
  expect(yields).toBeGreaterThan(0);
  expect(expectedB.node[0]).toBe(expectedB.node[1]);
  expect(expectedB.node[2]).not.toBe(expectedB.node[0]);
});

it('bounds collision-bucket work as well as source-vertex work', () => {
  // Distinct doubles round to the same Float32 hash: a single bucket contains many candidates.
  const position = new THREE.BufferAttribute(Float64Array.from(Array.from({ length: 1200 }, (_, i) => [1 + i * 1e-12, 0, 0]).flat()), 3);
  const expected = weldExact(position), getX = position.getX.bind(position);
  let reads = 0, turns = 0;
  position.getX = i => { reads++; return getX(i); };
  const steps = weldExactSteps(position);
  for (;;) {
    reads = 0;
    const next = steps.next();
    expect(reads).toBeLessThanOrEqual(512);
    if (next.done) { expect(next.value).toEqual(expected); break; }
    turns++;
  }
  expect(turns).toBeGreaterThan(1200 / 512);
});
