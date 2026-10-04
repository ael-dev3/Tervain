import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildFallingLeaves, fallingLeafCanopySites, FALLING_LEAF_LIMIT } from '../../src/presentation/fallingLeaves';
import type { FloraTree } from '../../src/presentation/floraPopulation';
import type { TreeVariant } from '../../src/presentation/treeGen';
import type { FrameContext, SceneModule } from '../../src/presentation/context';

const tree = (id = 'oak:1', sp: FloraTree['sp'] = 'oak'): FloraTree => ({ sp, v: 0, x: -182, y: 1, z: 14,
  s: 1, yaw: 0, tint: 1, radius: 1, collisionId: id, decorationRank: 0 });
const source = (): TreeVariant => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([1.5, 5.5, 1, 2.5, 5.5, 1, 2.5, 6.5, 1, 1.5, 6.5, 1], 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  return { species: 'oak', height: 8, crownRadius: 3, trunkRadius: 1, bark: 'oak', leafTexture: 'oak', crownTexture: 'crown',
    lods: [{ wood: null, leaf: geometry, tris: 2 }, { wood: null, leaf: null, tris: 0 }, { wood: null, leaf: null, tris: 0 }] };
};
const frame = (reducedMotion = false, x = -182): FrameContext => {
  const camera = new THREE.PerspectiveCamera(); camera.position.set(x, 2, 14);
  return { camera, focus: camera.position.clone(), reducedMotion, nightness: 0, time: 1000, hour: 11,
    sunDir: new THREE.Vector3(1, 1, 1), quality: 'high', view: {} as FrameContext['view'] };
};
const meshOf = (module: SceneModule) => module.group.getObjectByName('detached-leaves') as THREE.InstancedMesh<THREE.BufferGeometry, THREE.MeshLambertMaterial>;
const opacity = (mesh: THREE.InstancedMesh) => mesh.geometry.getAttribute('aLeafOpacity');
const positionOf = (mesh: THREE.InstancedMesh, i = 0) => {
  const matrix = new THREE.Matrix4(); mesh.getMatrixAt(i, matrix); return new THREE.Vector3().setFromMatrixPosition(matrix);
};

describe('gentle detached broadleaf shedding', () => {
  it('releases from exact source-card centres with grounded yaw/uniform scale, without editing any source buffers', () => {
    const variant = source(), t = { ...tree(), y: 4, s: 1.5, yaw: Math.PI / 2 };
    const geometry = variant.lods[0].leaf!, before = [...geometry.getAttribute('position').array];
    const sites = fallingLeafCanopySites(t, variant);
    expect(sites).toHaveLength(1);
    expect(sites[0]!.x).toBeCloseTo(-180.5, 10);
    expect(sites[0]!.y).toBeCloseTo(13, 10);
    expect(sites[0]!.z).toBeCloseTo(11, 10);
    const leaves = buildFallingLeaves({ heightAt: () => 0 }, 'high', [t], () => variant);
    leaves.update(2, frame()); leaves.dispose?.();
    expect([...geometry.getAttribute('position').array]).toEqual(before);
    expect(geometry.getAttribute('aLeafOpacity')).toBeUndefined();
    expect(variant.lods[1].leaf).toBeNull();
    geometry.dispose();
  });

  it('sheds only suitable woodland broadleaf crowns with a small fixed preset budget', () => {
    const variant = source();
    const excluded: FloraTree[] = ['pine', 'fir', 'shorepine', 'dead', 'shrub'].map((sp, i) => tree(`excluded:${i}`, sp as FloraTree['sp']));
    excluded.push({ ...tree('beach'), x: -285 }, { ...tree('small'), s: 0.1 });
    const calls: string[] = [];
    const empty = buildFallingLeaves({ heightAt: () => 0 }, 'high', excluded, t => { calls.push(t.sp); return variant; });
    expect(meshOf(empty).count).toBe(0);
    expect(calls).toEqual(['oak']); // Only the broadleaf sapling needs its source-height check.
    empty.dispose?.();
    const trees = Array.from({ length: 180 }, (_, i) => tree(`crowns:${i}`));
    for (const quality of ['high', 'medium', 'low'] as const) {
      const leaves = buildFallingLeaves({ heightAt: () => 0 }, quality, trees, () => variant);
      const mesh = meshOf(leaves);
      expect(mesh.count).toBe(FALLING_LEAF_LIMIT[quality]);
      expect(leaves.stats?.().fallingLeafTris).toBe(mesh.count * 10);
      expect(mesh.material.forceSinglePass).toBe(true);
      expect(mesh.material.side).toBe(THREE.DoubleSide);
      expect(mesh.material.depthWrite).toBe(false);
      expect(mesh.castShadow).toBe(false);
      leaves.dispose?.();
    }
    variant.lods[0].leaf!.dispose();
  });

  it('uses pointed folded lit geometry with no square backing and preserves fog/tone shader chunks', () => {
    const variant = source(), leaves = buildFallingLeaves({ heightAt: () => 0 }, 'medium', [tree()], () => variant), mesh = meshOf(leaves);
    const p = mesh.geometry.getAttribute('position');
    expect(p.count).toBe(11);
    expect(mesh.geometry.index!.count).toBe(30);
    expect(p.getZ(0)).toBeGreaterThan(0);
    expect(p.getX(1)).toBe(0); expect(p.getX(6)).toBe(0);
    expect(mesh.geometry.getAttribute('normal').count).toBe(p.count);
    const shader = { uniforms: {}, vertexShader: '#include <common>\n#include <begin_vertex>',
      fragmentShader: '#include <common>\n#include <alphatest_fragment>\n#include <fog_fragment>\n#include <tonemapping_fragment>' };
    mesh.material.onBeforeCompile(shader as unknown as THREE.WebGLProgramParametersWithUniforms, {} as THREE.WebGLRenderer);
    expect(shader.fragmentShader).toContain('diffuseColor.a *= vLeafOpacity');
    expect(shader.fragmentShader).toContain('#include <fog_fragment>');
    expect(shader.fragmentShader).toContain('#include <tonemapping_fragment>');
    expect(mesh.material.map).toBeNull();
    leaves.dispose?.(); variant.lods[0].leaf!.dispose();
  });

  it('keeps actual folded vertices above steep terrain, descends gently, and hides every canopy recycle', () => {
    const variant = source();
    const terrain = { heightAt: (x: number, z: number) => 1 + (x + 180) * 0.32 + (z - 15) * 0.22 };
    const leaves = buildFallingLeaves(terrain, 'high', [tree()], () => variant), mesh = meshOf(leaves), f = frame();
    const matrix = new THREE.Matrix4(), vertex = new THREE.Vector3(), p = mesh.geometry.getAttribute('position');
    leaves.update(0, f);
    let previous = positionOf(mesh), previousOpacity = opacity(mesh).getX(0), cycles = 0, movingSamples = 0;
    for (let step = 0; step < 2600; step++) {
      leaves.update(0.05, f);
      const current = positionOf(mesh), a = opacity(mesh).getX(0);
      expect(current.x).toBeGreaterThan(-181);
      expect(current.x).toBeLessThan(-177.7);
      expect(Math.abs(current.z - 15)).toBeLessThan(1.7);
      if (a > 0.001) {
        mesh.getMatrixAt(0, matrix);
        for (let v = 0; v < p.count; v++) {
          vertex.fromBufferAttribute(p, v).applyMatrix4(matrix);
          expect(vertex.y - terrain.heightAt(vertex.x, vertex.z)).toBeGreaterThan(0.005);
        }
      }
      if (current.y - previous.y > 1) {
        cycles++; expect(a).toBeLessThan(0.006); expect(previousOpacity).toBe(0);
      } else if (a > 0.2 && previousOpacity > 0.2) {
        expect(current.distanceTo(previous)).toBeLessThan(0.075);
        if (current.y < previous.y - 0.003) movingSamples++;
      }
      previous = current; previousOpacity = a;
    }
    expect(cycles).toBeGreaterThan(2);
    expect(movingSamples).toBeGreaterThan(100);
    leaves.dispose?.(); variant.lods[0].leaf!.dispose();
  });

  it('has frame-partition independent flight and freezes poses exactly in Reduced Motion', () => {
    const variant = source(), a = buildFallingLeaves({ heightAt: () => 0 }, 'high', [tree()], () => variant);
    const b = buildFallingLeaves({ heightAt: () => 0 }, 'high', [tree()], () => variant), f = frame();
    a.update(3, f);
    for (let i = 0; i < 30; i++) b.update(0.1, f);
    expect([...meshOf(a).instanceMatrix.array]).toEqual([...meshOf(b).instanceMatrix.array]);
    expect([...opacity(meshOf(a)).array]).toEqual([...opacity(meshOf(b)).array]);
    const matrices = [...meshOf(a).instanceMatrix.array], alpha = [...opacity(meshOf(a)).array];
    a.update(100, frame(true)); a.update(Number.NaN, f); a.update(-2, f); a.update(Number.POSITIVE_INFINITY, f);
    expect([...meshOf(a).instanceMatrix.array]).toEqual(matrices);
    expect([...opacity(meshOf(a)).array]).toEqual(alpha);
    a.update(0.5, f); expect([...meshOf(a).instanceMatrix.array]).not.toEqual(matrices);
    a.dispose?.(); b.dispose?.(); variant.lods[0].leaf!.dispose();
  });

  it('settles continuously at first ground contact without a vertical pose step', () => {
    const variant = source(), leaves = buildFallingLeaves({ heightAt: () => 0 }, 'medium', [tree()], () => variant);
    const mesh = meshOf(leaves), f = frame();
    leaves.update(0, f);
    let previous = positionOf(mesh), previousAlpha = opacity(mesh).getX(0), settled = false;
    for (let i = 0; i < 3500; i++) {
      leaves.update(0.01, f);
      const current = positionOf(mesh), alpha = opacity(mesh).getX(0);
      // Recycle occurs while invisible; every descending and settling pose should remain continuous.
      if (current.y <= previous.y && alpha > 0.01 && previousAlpha > 0.01) expect(previous.y - current.y).toBeLessThan(0.009);
      if (current.y < 0.3 && alpha > 0.2) settled = true;
      previous = current; previousAlpha = alpha;
    }
    expect(settled).toBe(true);
    leaves.dispose?.(); variant.lods[0].leaf!.dispose();
  });

  it('fades reversibly across the distance band without changing leaf scale or switching sources', () => {
    const variant = source(), leaves = buildFallingLeaves({ heightAt: () => 0 }, 'medium', [tree()], () => variant);
    leaves.update(1, frame());
    const mesh = meshOf(leaves), matrices = [...mesh.instanceMatrix.array], start = positionOf(mesh);
    const capture: number[] = [];
    for (let d = 28; d <= 57; d += 0.25) {
      const f = frame(true); f.camera.position.set(start.x + d, 2, start.z);
      leaves.update(100, f); capture.push(opacity(mesh).getX(0));
      expect([...mesh.instanceMatrix.array]).toEqual(matrices);
    }
    expect(capture[0]).toBeGreaterThan(0);
    expect(capture.at(-1)).toBe(0);
    for (let i = 1; i < capture.length; i++) expect(Math.abs(capture[i]! - capture[i - 1]!)).toBeLessThan(0.016);
    leaves.update(0, frame(true)); expect(opacity(mesh).getX(0)).toBe(capture[0]);
    leaves.dispose?.(); variant.lods[0].leaf!.dispose();
  });

  it('releases only its allocations once and does no terrain evaluation high above the cached ground ceiling', () => {
    const variant = source(); let terrainCalls = 0;
    const leaves = buildFallingLeaves({ heightAt: () => { terrainCalls++; return 0; } }, 'high', [tree()], () => variant), mesh = meshOf(leaves);
    let geometryDisposes = 0, materialDisposes = 0, sourceDisposes = 0, instanceDisposes = 0;
    mesh.geometry.addEventListener('dispose', () => geometryDisposes++); mesh.material.addEventListener('dispose', () => materialDisposes++);
    mesh.addEventListener('dispose', () => instanceDisposes++); variant.lods[0].leaf!.addEventListener('dispose', () => sourceDisposes++);
    let observedHigh = false;
    for (let i = 0; i < 100; i++) {
      terrainCalls = 0; leaves.update(0.1, frame());
      if ([positionOf(mesh, 0).y, positionOf(mesh, 1).y].every(y => y > 1)) {
        expect(terrainCalls).toBe(0); observedHigh = true; break;
      }
    }
    expect(observedHigh).toBe(true);
    leaves.dispose?.(); leaves.dispose?.();
    expect(geometryDisposes).toBe(1); expect(materialDisposes).toBe(1); expect(instanceDisposes).toBe(1); expect(sourceDisposes).toBe(0);
    terrainCalls = 0; leaves.update(1, frame()); expect(terrainCalls).toBe(0); expect(leaves.group.children).toHaveLength(0);
    variant.lods[0].leaf!.dispose();
  });
});
