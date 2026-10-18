import * as THREE from 'three';
import { describe, it, expect } from 'vitest';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';
import { cullDetachedCards, woodReachLocal } from '../../src/presentation/canopy';
import { ORCHARD_MAX_SCALE } from '../../src/presentation/treeScale';
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

describe('orchard world-space wood reach', () => {
  it('clears scaled audit flags without changing surviving vertex attributes or the input index', () => {
    const { wood, leaves } = fixture();
    // A card whose nearest point is 1.4 local units away passes the old local 1.5 check,
    // but exceeds 1.5 world metres on the reported 1.1247402672-scale tree.
    const positions = leaves.getAttribute('position');
    for (let i = 4; i < 8; i++) positions.setX(i, positions.getX(i) - 3.5);
    const matrix = new THREE.Matrix4().makeScale(1.1247402672073803, 1.1247402672073803, 1.1247402672073803);
    const audit = (leaf: THREE.BufferGeometry, at = matrix) => auditCanopies([{ label: 'orchard', species: 'orchard', wood, leaves: leaf, matrix: at }], { gap: .75, woodReach: 1.5, alpha: false });
    expect(audit(leaves).trees[0]!.detachedCards).toBe(1);
    const original = Array.from(leaves.index!.array);
    leaves.setAttribute('_wind', new THREE.Float32BufferAttribute(new Array(positions.count).fill(.3), 1));
    const { geometry, removed } = cullDetachedCards(leaves, wood, woodReachLocal(1.5, ORCHARD_MAX_SCALE));
    expect(removed).toBe(1); expect(geometry.index!.count).toBe(6);
    expect(Array.from(leaves.index!.array)).toEqual(original);
    for (const name of Object.keys(leaves.attributes)) expect(geometry.getAttribute(name)).toBe(leaves.getAttribute(name));
    for (const scale of [.9, 1, 1.1247402672073803, ORCHARD_MAX_SCALE]) {
      const tree = audit(geometry, new THREE.Matrix4().makeScale(scale, scale, scale)).trees[0]!;
      expect(tree.detachedCards).toBe(0); expect(tree.detachedClumps).toBe(0);
    }
  });

  it('uses leaf-surface samples rather than a card centre alone', () => {
    const { wood, leaves } = fixture();
    const p = leaves.getAttribute('position');
    for (let i = 4; i < 8; i++) p.setX(i, i === 4 || i === 7 ? 1 : 2.2);
    // Centre is beyond reach, but the surface touches the reachable side.
    const { geometry, removed } = cullDetachedCards(leaves, wood, 1.5);
    expect(removed).toBe(0); expect(geometry).toBe(leaves);
  });
});
