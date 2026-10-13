import { expect, it } from 'vitest';
import * as THREE from 'three';
import { remapStrayFernCell } from '../../src/presentation/meshyTrees';

it('moves only cards in the fir atlas top-right fern cell, two rows down', () => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0.9, 0.05, 0.99, 0.12, 0.5, 0.05, 0.9, 0.3], 2));
  expect(remapStrayFernCell(g)).toBe(2);
  const uv = g.getAttribute('uv');
  expect([uv.getY(0), uv.getY(1), uv.getY(2), uv.getY(3)].map((v) => +v.toFixed(3))).toEqual([0.3, 0.37, 0.05, 0.3]);
});
