import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { expect, it } from 'vitest';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';

function fixture(near: boolean) {
  // One BVH leaf: the farther triangle is visited first and fits the link gap,
  // while only the second sheet satisfies the smaller wood-contact radius.
  const sheets = [new THREE.PlaneGeometry(2, 2).translate(0, 0, 0.625)];
  if (near) sheets.push(new THREE.PlaneGeometry(2, 2).translate(0, 0, 0.25));
  const wood = mergeGeometries(sheets), leaves = new THREE.PlaneGeometry(0.125, 0.125);
  return { wood, leaves, dispose() { wood.dispose(); leaves.dispose(); sheets.forEach(g => g.dispose()); } };
}

for (const reach of [0.25, 0.375]) it(`does not mistake a link-gap witness for wood contact at reach ${reach}`, () => {
  const f = fixture(true);
  try {
    const actual = detachedClumpSet(f.leaves, f.wood, reach, 1);
    const audit = auditCanopies([{ label: 'card', wood: f.wood, leaves: f.leaves, matrix: new THREE.Matrix4() }],
      { gap: 1, woodReach: reach });
    expect(actual.far).toEqual([false]);
    expect(actual.detachedClumps).toBe(0);
    expect(audit.summary.detachedCards).toBe(0);
  } finally { f.dispose(); }
});

it('retains genuinely unsupported cards when the link gap is wider than wood reach', () => {
  const f = fixture(false);
  try {
    const actual = detachedClumpSet(f.leaves, f.wood, 0.375, 1);
    expect(actual.far).toEqual([true]); expect(actual.detachedClumps).toBe(1);
  } finally { f.dispose(); }
});

for (const gap of [0.125, 0.375]) it(`preserves contact with an equal or smaller link gap ${gap}`, () => {
  const f = fixture(true);
  try { expect(detachedClumpSet(f.leaves, f.wood, 0.375, gap).far).toEqual([false]); }
  finally { f.dispose(); }
});
