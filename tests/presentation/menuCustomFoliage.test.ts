import { createFoliageField } from '../../src/presentation/foliage/foliageWind';
import { GrassWind } from '../../src/presentation/grass/wind';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { buildAncientTree } from '../../src/presentation/menu/menuTree';
import { HERMIT_DOOR } from '../../src/presentation/menu/menuCamp';
import { MENU_TREE_SOURCE, createMenuTreeRemix } from '../../src/presentation/menu/menuTreeRemix';
import { createWispLighting } from '../../src/presentation/menu/menuWispLight';
import { MenuScene } from '../../src/presentation/menuScene';
import { meshyTreeTemplates } from './meshyTreeFixture';
import { menuResourceFixture } from './menuResourceFixture';

interface Sprig { vertexStart: number; vertexCount: number; stemRootVertexIndices: number[] }
interface Attachments { sourceVertices: number; sprigs: Sprig[] }
let source: readonly [GLTF, GLTF, GLTF];
const owned: { dispose(): void }[] = [];
beforeAll(async () => { source = (await meshyTreeTemplates([MENU_TREE_SOURCE])).get(MENU_TREE_SOURCE)!; });
afterEach(() => { for (const item of owned.splice(0)) item.dispose(); });
afterAll(() => {
  for (const gltf of source) gltf.scene.traverse(object => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) material.dispose();
  });
});
function foliage(gltf = source[0]) {
  let result: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
  gltf.scene.traverse(object => { if ((object as THREE.Mesh).isMesh && object.name === 'Foliage') result = object as typeof result; });
  return result!;
}
function metadata(mesh = foliage()): Attachments { return mesh.userData.tervainCustomFoliage; }
function architecture() {
  const tree = buildAncientTree(1207, { leafCards: 0, woodDetail: 0.8,
    door: { az: 2, halfWidth: HERMIT_DOOR.faceHalfWidth, height: HERMIT_DOOR.faceTop,
      opening: { width: HERMIT_DOOR.width, height: HERMIT_DOOR.height } } });
  owned.push(tree.wood, tree.leaves); return tree;
}
function rootOf(positions: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, sprig: Sprig) {
  const root = new THREE.Vector3();
  for (const index of sprig.stemRootVertexIndices) root.add(new THREE.Vector3().fromBufferAttribute(positions, index));
  return root.divideScalar(sprig.stemRootVertexIndices.length);
}
/** Independent distance audit over actual triangles, without the adapter's bounds acceleration. */
function woodDistance(point: THREE.Vector3, geometry: THREE.BufferGeometry) {
  const positions = geometry.getAttribute('position'), indices = geometry.index, triangle = new THREE.Triangle(), closest = new THREE.Vector3();
  let squared = Infinity;
  for (let i = 0; i < (indices?.count ?? positions.count); i += 3) {
    triangle.a.fromBufferAttribute(positions, indices?.getX(i) ?? i);
    triangle.b.fromBufferAttribute(positions, indices?.getX(i + 1) ?? i + 1);
    triangle.c.fromBufferAttribute(positions, indices?.getX(i + 2) ?? i + 2);
    triangle.closestPointToPoint(point, closest);
    const distance = closest.distanceToSquared(point);
    if (Number.isFinite(distance)) squared = Math.min(squared, distance);
  }
  return Math.sqrt(squared);
}
function compile(material: THREE.MeshStandardMaterial) {
  const shader = { uniforms: {}, vertexShader: THREE.ShaderLib.standard.vertexShader, fragmentShader: THREE.ShaderLib.standard.fragmentShader } as
    Parameters<THREE.MeshStandardMaterial['onBeforeCompile']>[0];
  material.onBeforeCompile(shader, {} as THREE.WebGLRenderer); return shader;
}
const wind = () => createFoliageField(new GrassWind({ direction: [0.5, 0.87], steady: 0.2, gust: 0.55, speed: 3.4 }));

describe('actual custom foliage bound to the carved menu tree', () => {
  it('rigidly binds every actual sprig to the retained wood surface and pins its complete stem base under wind', () => {
    const tree = architecture(), details = metadata();
    expect(details.sourceVertices).toBeGreaterThan(0); expect(details.sprigs.length).toBeGreaterThan(0);
    const field = wind(), result = createMenuTreeRemix(source, tree, field, createWispLighting(4));
    owned.push(result);
    const part = result.parts[0]!, positions = part.geometry.getAttribute('position'), weights = part.geometry.getAttribute('menuCrownWindWeight');
    expect(result.sourceLod).toBe(0); expect(weights.count).toBe(positions.count);
    for (const sprig of details.sprigs) {
      expect(woodDistance(rootOf(positions, sprig), tree.wood)).toBeLessThan(0.000006);
      for (const index of sprig.stemRootVertexIndices) expect(weights.getX(index)).toBe(0);
      for (let i = sprig.vertexStart; i < sprig.vertexStart + sprig.vertexCount; i++) {
        expect(weights.getX(i)).toBeGreaterThanOrEqual(0); expect(weights.getX(i)).toBeLessThanOrEqual(1);
      }
    }
    for (let i = 0; i < details.sourceVertices; i++) expect(weights.getX(i)).toBe(1);
    const shader = compile(part.material);
    expect(shader.vertexShader).toContain('attribute float menuCrownWindWeight;');
    // The crown's wind (the heath's sea wind) is scaled by the pinning weight exactly once; stem roots never move.
    expect(shader.vertexShader.match(/\* menuCrownWindWeight/g)).toHaveLength(1);
    expect(shader.vertexShader).toContain('tvFoliageOffset');
    expect(shader.uniforms.uGrassTime).toBe(field.wind.uniforms.uGrassTime);
    // Lit as leaves, and the spirits' light is still the last change to the shader.
    expect(shader.fragmentShader).toContain('#define RE_Direct RE_Direct_Foliage');
    expect(shader.fragmentShader.lastIndexOf('uWispLights')).toBeGreaterThan(shader.fragmentShader.indexOf('RE_Direct_Foliage'));
    // The crown's shadow moves with it.
    expect(part.depth).not.toBeNull();
  });

  it('keeps every ordinary source vertex under one uniform fit, each sprig rigid, UVs/indices intact and shared source bytes untouched', () => {
    const original = foliage(), details = metadata(original), originalPositions = original.geometry.getAttribute('position');
    const before = new Float32Array(originalPositions.array), beforeUv = new Float32Array(original.geometry.getAttribute('uv').array);
    const sourceDisposal = vi.spyOn(original.geometry, 'dispose');
    const tree = architecture(), result = createMenuTreeRemix(source, tree, wind(), createWispLighting(4));
    owned.push(result);
    const geometry = result.parts[0]!.geometry, positions = geometry.getAttribute('position');
    const originalBox = new THREE.Box3(), fittedBox = new THREE.Box3(), point = new THREE.Vector3();
    for (let i = 0; i < details.sourceVertices; i++) {
      originalBox.expandByPoint(point.fromBufferAttribute(originalPositions, i).applyMatrix4(original.matrixWorld));
      fittedBox.expandByPoint(point.fromBufferAttribute(positions, i));
    }
    const originalSize = originalBox.getSize(new THREE.Vector3()), fittedSize = fittedBox.getSize(new THREE.Vector3());
    const scale = fittedSize.x / originalSize.x;
    expect(fittedSize.y / originalSize.y).toBeCloseTo(scale, 6); expect(fittedSize.z / originalSize.z).toBeCloseTo(scale, 6);
    const translation = fittedBox.getCenter(new THREE.Vector3()).sub(originalBox.getCenter(new THREE.Vector3()).multiplyScalar(scale));
    let error = 0;
    for (let i = 0; i < details.sourceVertices; i++) {
      point.fromBufferAttribute(originalPositions, i).applyMatrix4(original.matrixWorld).multiplyScalar(scale).add(translation);
      error = Math.max(error, point.distanceTo(new THREE.Vector3().fromBufferAttribute(positions, i)));
    }
    expect(error).toBeLessThan(0.000008);
    const beforeRoot = new THREE.Vector3(), afterRoot = new THREE.Vector3(), normalMatrix = new THREE.Matrix3().getNormalMatrix(original.matrixWorld);
    for (const sprig of details.sprigs) {
      beforeRoot.fromBufferAttribute(originalPositions, sprig.vertexStart).applyMatrix4(original.matrixWorld);
      afterRoot.fromBufferAttribute(positions, sprig.vertexStart);
      for (let i = sprig.vertexStart; i < sprig.vertexStart + sprig.vertexCount; i++) {
        point.fromBufferAttribute(originalPositions, i).applyMatrix4(original.matrixWorld).sub(beforeRoot).multiplyScalar(scale);
        const fitted = new THREE.Vector3().fromBufferAttribute(positions, i).sub(afterRoot);
        expect(point.distanceTo(fitted)).toBeLessThan(0.000008);
      }
    }
    for (let i = 0; i < originalPositions.count; i++) {
      point.fromBufferAttribute(original.geometry.getAttribute('normal'), i).applyNormalMatrix(normalMatrix);
      expect(point.distanceTo(new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), i))).toBeLessThan(0.000002);
    }
    expect(geometry.getAttribute('uv').array).toEqual(beforeUv); expect(geometry.index!.array).toEqual(original.geometry.index!.array);
    result.dispose(); result.dispose(); expect(sourceDisposal).not.toHaveBeenCalled();
    expect(originalPositions.array).toEqual(before); expect(original.geometry.getAttribute('uv').array).toEqual(beforeUv);
  });

  it('uses the same connected custom crown and complete under-20k tree on every real menu preset, with reduced motion frozen', () => {
    const templates = new Map([[MENU_TREE_SOURCE, source]]), details = metadata();
    let referencePositions: Float32Array | undefined, referenceCount = 0;
    for (const quality of ['high', 'medium', 'low'] as const) {
      const scene = new MenuScene({ quality, resources: menuResourceFixture(), treeTemplates: templates });
      owned.push(scene);
      const root = scene.scene.getObjectByName('Menu_Ancient_Tree')!, wood = root.getObjectByName('Menu_Ancient_Tree_Wood') as THREE.Mesh;
      const leaves = root.getObjectByName('Menu_Ancient_Tree_Leaves') as THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;
      expect(scene.stats.treeSource).toBe(`${MENU_TREE_SOURCE}:LOD0`);
      expect(scene.stats.treeTriangles).toBeLessThan(20_000); expect(scene.stats.treeTriangles).toBeGreaterThan(18_333);
      const positions = leaves.geometry.getAttribute('position');
      for (const sprig of details.sprigs) expect(woodDistance(rootOf(positions, sprig), wood.geometry)).toBeLessThan(0.000006);
      if (referencePositions) {
        expect(positions.array).toEqual(referencePositions); expect(scene.stats.treeTriangles).toBe(referenceCount);
      } else { referencePositions = new Float32Array(positions.array); referenceCount = scene.stats.treeTriangles; }
      scene.update(0.04, false, { time: 35, duration: 214.2, playing: true, gain: 0.352 });
      // The crown keeps the heath's wind clock: Reduced Motion holds it exactly where it was.
      const shader = compile(leaves.material), frozen = shader.uniforms.uGrassTime!.value;
      const awakening = scene.awakeningState;
      scene.update(12, true, { time: 90, duration: 214.2, playing: true, gain: 0.352 });
      expect(shader.uniforms.uGrassTime!.value).toBe(frozen); expect(scene.awakeningState).toEqual(awakening);
      expect(positions.array).toEqual(referencePositions);
    }
  });

  it('rejects malformed embedded sprig ranges before cloning or touching a shared actual template', () => {
    const broken = { ...source[0], scene: source[0].scene.clone() } as GLTF, mesh = foliage(broken);
    mesh.userData.tervainCustomFoliage.sprigs[0].vertexStart = -1;
    const geometryDisposal = vi.spyOn(mesh.geometry, 'dispose');
    expect(() => createMenuTreeRemix([broken, source[1], source[2]], architecture(),
      wind(), createWispLighting(4))).toThrow(/sprig range/);
    expect(geometryDisposal).not.toHaveBeenCalled(); expect(metadata().sprigs[0]!.vertexStart).toBeGreaterThanOrEqual(metadata().sourceVertices);
  });
});
