import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import {
  blendDualQuaternions, dualQuaternionSkinOf, installDualQuaternionSkinning, NPC_DQ_SKINNING_KEY, patchDualQuaternionMaterial, writeDualQuaternion,
} from '../../src/presentation/npc/dualQuaternionSkinning';
import { createMeshyNpcRig } from '../../src/presentation/meshynpcs';
import { poseRig } from '../../src/presentation/characters';
import { loadResident, residentMesh } from './residentFixtures';

const shaderOf = (lib: { vertexShader: string; fragmentShader: string }) =>
  ({ vertexShader: lib.vertexShader, fragmentShader: lib.fragmentShader, uniforms: {} }) as unknown as THREE.WebGLProgramParametersWithUniforms;

describe('resident dual-quaternion skinning', () => {
  it('moves a point exactly as its single joint does, and keeps a blended joint at length where averaged matrices shrink it', () => {
    const motions = new Float32Array(16);
    const turn = new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(0.02, -0.01, 0.03);
    writeDualQuaternion(new THREE.Matrix4(), motions, 0);
    writeDualQuaternion(turn, motions, 8);
    const point = new THREE.Vector3(0.1, -0.3, 0.05);
    const rigid = blendDualQuaternions(motions, [1, 0, 0, 0], [1, 0, 0, 0], point.clone());
    expect(rigid.distanceTo(point.clone().applyMatrix4(turn))).toBeLessThan(1e-6);
    // Half on a joint at rest, half on one turned a quarter about the same pivot: the point stays on its circle.
    const pure = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
    writeDualQuaternion(pure, motions, 8);
    const below = new THREE.Vector3(0, -0.1, 0);
    const dq = blendDualQuaternions(motions, [0, 1, 0, 0], [0.5, 0.5, 0, 0], below.clone());
    const linear = below.clone().multiplyScalar(0.5).add(below.clone().applyMatrix4(pure).multiplyScalar(0.5));
    expect(dq.length()).toBeCloseTo(0.1, 6);
    expect(linear.length()).toBeLessThan(0.075);
    // Normals turn with the blended rotation.
    const normal = new THREE.Vector3(1, 0, 0);
    blendDualQuaternions(motions, [0, 1, 0, 0], [0.5, 0.5, 0, 0], new THREE.Vector3(), normal);
    expect(normal.length()).toBeCloseTo(1, 6);
    expect(normal.x).toBeCloseTo(Math.SQRT1_2, 5);
  });

  it('replaces the colour and shadow passes\' skinning chunks with the blended motion, composing earlier hooks and keys', () => {
    const material = new THREE.MeshStandardMaterial();
    material.onBeforeCompile = shader => { shader.vertexShader += '\n// earlier hook'; };
    material.customProgramCacheKey = () => 'earlier-v2';
    patchDualQuaternionMaterial(material, 44);
    patchDualQuaternionMaterial(material, 44);
    const colour = shaderOf(THREE.ShaderLib.physical);
    material.onBeforeCompile(colour, {} as THREE.WebGLRenderer);
    expect(colour.vertexShader).toContain('// earlier hook');
    expect(colour.vertexShader).toContain('#define TV_DQ_BASE 44');
    expect(colour.vertexShader).not.toContain('#include <skinbase_vertex>');
    expect(colour.vertexShader).not.toContain('#include <skinning_vertex>');
    expect(colour.vertexShader).not.toContain('#include <skinnormal_vertex>');
    expect(colour.vertexShader.indexOf('tvDqReal /= tvDqLength')).toBeLessThan(colour.vertexShader.indexOf('objectNormal = tvDqRotate'));
    expect(material.customProgramCacheKey()).toBe(`earlier-v2|${NPC_DQ_SKINNING_KEY}-44`);
    const depth = new THREE.MeshDepthMaterial();
    patchDualQuaternionMaterial(depth, 44);
    const shadow = shaderOf(THREE.ShaderLib.depth);
    depth.onBeforeCompile(shadow, {} as THREE.WebGLRenderer);
    expect(shadow.vertexShader).toContain('transformed = tvDqRotate( tvDqReal, transformed )');
    const broken = new THREE.MeshStandardMaterial();
    patchDualQuaternionMaterial(broken, 44);
    expect(() => broken.onBeforeCompile({ vertexShader: 'void main() {}', fragmentShader: '', uniforms: {} } as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer)).toThrow(/cannot find/);
  });

  it('packs every joint\'s motion after its matrices in the actor\'s own bone texture and matches linear skinning on single-joint points', async () => {
    const { source, entry } = await loadResident('spring-steward');
    const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, { skinRepair: false, jointFit: false, poseFit: false, surface: false });
    const mesh = residentMesh(rig.root);
    const skin = dualQuaternionSkinOf(mesh)!;
    expect(skin).not.toBeNull();
    expect(skin.base).toBe(44);
    expect(mesh.skeleton.boneTexture!.image.width).toBe(12);
    expect(mesh.userData.npcDualQuaternion).toEqual({ base: 44, bones: 11, texture: 12 });
    expect(mesh.customDepthMaterial).toBeInstanceOf(THREE.MeshDepthMaterial);
    expect(mesh.customDistanceMaterial).toBeInstanceOf(THREE.MeshDistanceMaterial);
    poseRig(rig, { mode: 'walk', speed: 0.78, time: 0.3, t: 0, amp: 1 }, 1);
    rig.root.updateMatrixWorld(true);
    mesh.skeleton.update();
    const index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight'), position = mesh.geometry.getAttribute('position');
    let checked = 0;
    for (let vertex = 0; vertex < position.count && checked < 200; vertex += 37) {
      if (weight.getX(vertex) < 0.9999) continue;
      const linear = new THREE.Vector3().fromBufferAttribute(position, vertex);
      mesh.applyBoneTransform(vertex, linear);
      const blended = blendDualQuaternions(skin.motions, [index.getX(vertex), index.getY(vertex), index.getZ(vertex), index.getW(vertex)],
        [weight.getX(vertex), weight.getY(vertex), weight.getZ(vertex), weight.getW(vertex)], new THREE.Vector3().fromBufferAttribute(position, vertex));
      expect(blended.distanceTo(linear)).toBeLessThan(1e-4);
      checked++;
    }
    expect(checked).toBeGreaterThan(50);
    // The shadow materials leave with the actor's colour material.
    let disposed = 0;
    mesh.customDepthMaterial!.addEventListener('dispose', () => disposed++);
    (mesh.material as THREE.Material).dispose();
    expect(disposed).toBe(1);
  });

  it('keeps the texture layout when a renderer asks the skeleton to rebuild it', () => {
    const bones = [new THREE.Bone(), new THREE.Bone()];
    bones[0]!.add(bones[1]!); bones[1]!.position.y = -0.3;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, -0.3, 0, 0.1, -0.3, 0], 3));
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute([0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0], 4));
    const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
    mesh.add(bones[0]!); mesh.bind(new THREE.Skeleton(bones));
    const skin = installDualQuaternionSkinning(mesh);
    const texture = mesh.skeleton.boneTexture;
    mesh.skeleton.computeBoneTexture();
    expect(mesh.skeleton.boneTexture).toBe(texture);
    bones[1]!.rotation.x = -1;
    mesh.updateMatrixWorld(true); mesh.skeleton.update();
    const point = blendDualQuaternions(skin.motions, [1, 0, 0, 0], [1, 0, 0, 0], new THREE.Vector3(0.1, -0.3, 0));
    const linear = new THREE.Vector3(0.1, -0.3, 0); mesh.applyBoneTransform(2, linear);
    expect(point.distanceTo(linear)).toBeLessThan(1e-6);
  });
});
