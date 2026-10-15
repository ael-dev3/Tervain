import { describe, it, expect, vi } from 'vitest';
import * as THREE from 'three';
import { mergeStaticParts } from '../../src/presentation/staticMerge';

function fixture() {
  const group = new THREE.Group(), geometry = new THREE.BoxGeometry(), material = new THREE.MeshBasicMaterial();
  const parts = [new THREE.Mesh(geometry, material), new THREE.Mesh(geometry, material)];
  parts[0]!.position.set(1, 2, 3); parts[1]!.rotation.set(.2, .4, .6);
  group.add(...parts);
  const dispose = (merged: THREE.Mesh[]) => { geometry.dispose(); material.dispose(); merged.forEach(m => m.geometry.dispose()); };
  return { group, parts, dispose };
}

describe('retained static source matrices', () => {
  it('stops rebuilding fixed local transforms after a successful merge', () => {
    const f = fixture(), merged = mergeStaticParts(f.group);
    const locals = f.parts.map(p => p.matrix.clone());
    const spies = f.parts.map(p => vi.spyOn(p.matrix, 'compose'));
    for (let i = 0; i < 120; i++) f.group.updateMatrixWorld(true);
    expect(merged).toHaveLength(1);
    f.parts.forEach((p, i) => { expect(spies[i]).not.toHaveBeenCalled(); expect(p.matrix.equals(locals[i]!)).toBe(true); });
    spies.forEach(s => s.mockRestore()); f.dispose(merged);
  });
  it('still propagates parent movement, rotation and scale to retained world transforms', () => {
    const f = fixture(), merged = mergeStaticParts(f.group), locals = f.parts.map(p => p.matrix.clone());
    f.group.position.set(8, -2, 4); f.group.rotation.set(.1, .5, -.3); f.group.scale.set(2, 3, .5);
    f.group.updateMatrixWorld(true);
    f.parts.forEach((p, i) => {
      expect(p.matrixWorldAutoUpdate).toBe(true);
      expect(p.matrix.equals(locals[i]!)).toBe(true);
      expect(p.matrixWorld.equals(new THREE.Matrix4().multiplyMatrices(f.group.matrixWorld, locals[i]!))).toBe(true);
    }); f.dispose(merged);
  });
  it('leaves skipped and unmerged meshes able to update their own pose', () => {
    const f = fixture(), merged = mergeStaticParts(f.group, { skip: p => p === f.parts[0] });
    expect(merged).toHaveLength(0);
    f.parts.forEach(p => { expect(p.matrixAutoUpdate).toBe(true); p.position.x = 9; });
    f.group.updateMatrixWorld(true);
    f.parts.forEach(p => expect(p.matrix.elements[12]).toBe(9)); f.dispose(merged);
  });
  it('preserves an explicitly supplied manual local matrix', () => {
    const f = fixture(), p = f.parts[0]!; p.matrixAutoUpdate = false; p.matrix.makeTranslation(7, 8, 9);
    const manual = p.matrix.clone(), merged = mergeStaticParts(f.group);
    f.group.position.y = 4; f.group.updateMatrixWorld(true);
    expect(p.matrix.equals(manual)).toBe(true);
    expect(p.matrixWorld.elements[13]).toBe(12); f.dispose(merged);
  });
});
