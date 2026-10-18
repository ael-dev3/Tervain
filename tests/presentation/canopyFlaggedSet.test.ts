import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';
import { detachedClumpSet } from '../../src/diagnostics/canopyConnectivity';

// A vertical wood triangle at x = 0 and two leaf cards: one 0.5 m from it (attached) and one 5 m away (detached).
function fixture() {
  const wood = new THREE.BufferGeometry();
  wood.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 2, 0, 0, 1, 0.5], 3));
  wood.setIndex([0, 1, 2]);
  const pos: number[] = [], idx: number[] = [];
  const card = (cx: number, cy: number, cz: number) => { const b = pos.length / 3; const corners: [number, number][] = [[-.1, -.1], [.1, -.1], [.1, .1], [-.1, .1]];
  for (const [x, y] of corners) pos.push(cx + x, cy + y, cz); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
  card(0.5, 1, 0.1);
  card(5, 1, 0.1);
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  leaves.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0), 3));
  leaves.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
  leaves.setIndex(idx);
  return { wood, leaves };
}

describe('generator flagged set equals the audit detached set', () => {
  it('flags the same clumps as the canopy audit', () => {
    const { wood, leaves } = fixture();
    const audit = auditCanopies([{ label: 'fixture', species: 'oak', wood, leaves, matrix: new THREE.Matrix4() } as never], { woodReach: 1.5 });
    const tree = audit.trees[0]!;
    const shared = detachedClumpSet(leaves, wood, 1.5, 0.75);
    expect(shared.detachedClumps).toBe(tree.detachedClumps);
    expect(shared.far.filter(Boolean).length).toBe(tree.detachedCards);
    expect(tree.detachedClumps).toBe(1);
  });
});
