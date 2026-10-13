import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { beginStaticSkinFrame, endStaticSkinFrame, installDualQuaternionSkinning } from '../../src/presentation/npc/dualQuaternionSkinning';

function fixture() {
  const mesh = new THREE.SkinnedMesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  const bones = Array.from({ length: 66 }, () => new THREE.Bone());
  for (const bone of bones.slice(1)) bones[0]!.add(bone);
  mesh.add(bones[0]!); mesh.bind(new THREE.Skeleton(bones));
  const skin = installDualQuaternionSkinning(mesh);
  mesh.updateMatrixWorld(true);
  return { mesh, bones, dispose() { skin.dispose(); mesh.skeleton.dispose(); mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); } };
}

it('refreshes once per frozen draw and preserves packed values across changed poses and binds', () => {
  const cached = fixture(), reference = fixture();
  try {
    for (let frame = 0; frame < 120; frame++) {
      for (const f of [cached, reference]) {
        f.bones[1]!.rotation.set(frame * .013, frame * .027, frame * -.017);
        f.mesh.updateMatrixWorld(true);
        f.mesh.bindMatrix.makeTranslation(frame * .001, 0, 0);
        f.mesh.bindMatrixInverse.copy(f.mesh.bindMatrix).invert();
      }
      reference.mesh.skeleton.update();
      const spy = vi.spyOn(THREE.Matrix4.prototype, 'decompose');
      const nested = beginStaticSkinFrame();
      try { for (let pass = 0; pass < 5; pass++) cached.mesh.skeleton.update(); }
      finally { endStaticSkinFrame(nested); }
      expect(spy).toHaveBeenCalledTimes(66); spy.mockRestore();
      expect(Array.from(cached.mesh.skeleton.boneMatrices!)).toEqual(Array.from(reference.mesh.skeleton.boneMatrices!));
    }
    const spy = vi.spyOn(THREE.Matrix4.prototype, 'decompose');
    cached.mesh.skeleton.update(); cached.mesh.skeleton.update();
    expect(spy).toHaveBeenCalledTimes(132); spy.mockRestore();
  } finally { vi.restoreAllMocks(); cached.dispose(); reference.dispose(); }
});

it('invalidates the resumed outer scope after a nested render and restores ordinary updates on exit', () => {
  const f = fixture(), spy = vi.spyOn(THREE.Matrix4.prototype, 'decompose');
  const outer = beginStaticSkinFrame();
  try {
    f.mesh.skeleton.update();
    const inner = beginStaticSkinFrame();
    try { f.mesh.skeleton.update(); f.mesh.skeleton.update(); }
    finally { endStaticSkinFrame(inner); }
    f.mesh.skeleton.update(); f.mesh.skeleton.update();
    expect(spy).toHaveBeenCalledTimes(198);
  } finally { endStaticSkinFrame(outer); }
  try { f.mesh.skeleton.update(); expect(spy).toHaveBeenCalledTimes(264); }
  finally { spy.mockRestore(); f.dispose(); }
});

it('retries failed updates in the same scope and restores the bone texture', () => {
  const f = fixture(), texture = f.mesh.skeleton.boneTexture, inverse = f.mesh.skeleton.boneInverses[0]!;
  const nested = beginStaticSkinFrame();
  try {
    Reflect.set(f.mesh.skeleton.boneInverses, 0, undefined);
    expect(() => f.mesh.skeleton.update()).toThrow();
    expect(f.mesh.skeleton.boneTexture).toBe(texture);
    f.mesh.skeleton.boneInverses[0] = inverse;
    const spy = vi.spyOn(THREE.Matrix4.prototype, 'decompose');
    f.mesh.skeleton.update(); f.mesh.skeleton.update();
    expect(spy).toHaveBeenCalledTimes(66); spy.mockRestore();
  } finally { endStaticSkinFrame(nested); f.dispose(); }
});

it('clears the scope after an exception and handles independently posed skeletons', () => {
  const a = fixture(), b = fixture(), nested = beginStaticSkinFrame();
  try {
    expect(() => { a.mesh.skeleton.update(); b.mesh.skeleton.update(); throw new Error('render failed'); }).toThrow('render failed');
  } finally { endStaticSkinFrame(nested); }
  try {
    a.bones[2]!.position.x = .7; a.mesh.updateMatrixWorld(true);
    const before = a.mesh.skeleton.boneMatrices!.slice(); a.mesh.skeleton.update();
    expect(Array.from(a.mesh.skeleton.boneMatrices!)).not.toEqual(Array.from(before));
    const spy = vi.spyOn(THREE.Matrix4.prototype, 'decompose');
    b.mesh.skeleton.update(); expect(spy).toHaveBeenCalledTimes(66); spy.mockRestore();
  } finally { a.dispose(); b.dispose(); }
});
