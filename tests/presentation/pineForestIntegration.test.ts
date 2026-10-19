import { beforeAll, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildTreeVariant, type TreeVariant } from '../../src/presentation/treeGen';
import { groundedTreeY, seatTreeFlares, treeWoodCollisionRadius, TREE_ROOT_PLANE, TREE_SOIL_OVERLAP } from '../../src/presentation/treeGrounding';
import { buildFlora } from '../../src/presentation/flora';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, floraLodWeights, type FloraTree } from '../../src/presentation/floraPopulation';
import { pineTemplates } from './pineFixture';
import { createPineForest, isPineSpecies, type PineTemplates } from '../../src/presentation/solitaryPine';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { defaultSettings } from '../../src/platform/settings';
import type { FrameContext } from '../../src/presentation/context';
import { worldView } from '../../src/game/worldView';
import { createInitialState } from '../../src/game/state';

// Floor pixels have their own tests/browser gate; isolate actual tree instancing without a DOM canvas.
vi.mock('../../src/presentation/forestFloor', () => ({ buildForestFloor: () => ({ group: new THREE.Group(), update() {}, dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', () => ({
  woodMaterial: () => new THREE.MeshStandardMaterial(), leafMaterial: () => new THREE.MeshStandardMaterial(), installBarkDetail() {}, disposeTreeMaterials() {},
}));
vi.mock('../../src/presentation/treeTextures', () => ({ barkTextures: () => ({ map: new THREE.DataTexture(), surface: new THREE.DataTexture() }), disposeTreeTextures() {} }));
vi.mock('../../src/presentation/treeGen', async (original) => {
  const actual = await original<typeof import('../../src/presentation/treeGen')>();
  return { ...actual, buildTreeVariant: (species: Parameters<typeof actual.buildTreeVariant>[0], seed: number) => {
    if (['pine', 'fir', 'shorepine'].includes(species)) throw new Error('Old conifer geometry must never be requested.');
    return actual.buildTreeVariant(species, seed);
  } };
});

let templates: PineTemplates, terrain: Terrain, excl: Exclusions, population: FloraTree[], canonical: Colliders;
beforeAll(async () => {
  templates = await pineTemplates();
  terrain = new Terrain(); excl = new Exclusions(terrain);
  const source = createPineForest(templates); canonical = new Colliders();
  const variants = new Map<string, TreeVariant>();
  const variantFor = (tree: Pick<FloraTree, 'sp' | 'v'>): TreeVariant => {
    const key = `${tree.sp}:${tree.v}`;
    let variant = variants.get(key);
    if (!variant) {
      variant = isPineSpecies(tree.sp) ? source.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1);
      variants.set(key, variant);
    }
    return variant;
  };
  population = createFloraPopulation(terrain, excl, (tree, footprint) => isPineSpecies(tree.sp)
    ? source.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
    : footprint > 0 ? treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : footprint,
    tree => groundedTreeY(terrain, tree, variantFor(tree)));
  seatTreeFlares(population, terrain, variantFor, isPineSpecies);
  // Navigation sees final seated wood; visual/physical planting radii remain canonical.
  registerFloraColliders(population, canonical, undefined, tree => isPineSpecies(tree.sp) ? tree.radius
    : treeWoodCollisionRadius(variantFor(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y));
  source.dispose();
  for (const variant of variants.values()) if (!isPineSpecies(variant.species)) for (const lod of variant.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); }
});

describe('historical source-Pine component render substitution without the Meshy catalog', () => {
  it('selects the requested root LOD and keeps omitted far wood visible as a coverage deficit', () => {
    vi.stubGlobal('location', { search: '' });
    const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality: 'low', settings: { ...defaultSettings(), quality: 'low' }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    try {
      const records = (targets: ReturnType<NonNullable<typeof forest.placementAuditTargets>>) => targets.map(t => ({ label: t.label, geometry: t.geometry.uuid, matrix: t.matrix.elements }));
      expect(records(forest.placementAuditTargets!())).toEqual(records(forest.placementAuditTargets!(0)));
      for (const lod of [0, 1, 2]) {
        const expected = forest.canopyAuditTargets!(lod).filter(t => t.wood).map(t => ({ label: t.label, geometry: t.wood!.uuid, matrix: t.matrix.elements }));
        expect(records(forest.placementAuditTargets!(lod))).toEqual(expected);
      }
      expect(forest.placementAuditTargets!(2).length).toBeLessThan(forest.placementAuditTargets!(0).length);
      for (const lod of [-1, .5, 3, NaN]) expect(() => forest.placementAuditTargets!(lod)).toThrow('Invalid placement LOD');
    } finally { forest.dispose!(); vi.unstubAllGlobals(); }
  });

  it('exports exact complete woody contact for canonical trees with shared buffers, uniform planted transforms and no leaf cards', () => {
    vi.stubGlobal('location', { search: '' });
    let firstTransforms: unknown;
    for (const quality of ['low', 'medium', 'high'] as const) {
      const colliders = new Colliders();
      const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
      const canonicalTrees = population.filter(tree => tree.collisionId && tree.radius > 0);
      expect(forest.physicalWood.map(tree => tree.id)).toEqual(canonicalTrees.map(tree => tree.collisionId));
      expect(forest.physicalWood).toHaveLength(canonical.all.length);
      const nearWood = forest.group.children.filter(object => object.name.endsWith(':0:wood')) as THREE.InstancedMesh[];
      const leafArrays = new Set(forest.group.children.filter(object => object.name.endsWith(':foliage')).map(object => (object as THREE.Mesh).geometry.getAttribute('position').array));
      const variantBuffers = new Map<string, { positions: Float32Array; indices: Uint32Array }>();
      for (const contact of forest.physicalWood) {
        const tree = canonicalTrees.find(tree => tree.collisionId === contact.id)!;
        expect(contact.translation).toEqual({ x: tree.x, y: tree.y, z: tree.z });
        expect(contact.yaw).toBe(tree.yaw); expect(contact.scale).toBe(tree.s);
        expect(contact.positions).toBeInstanceOf(Float32Array); expect(contact.indices).toBeInstanceOf(Uint32Array);
        expect(leafArrays.has(contact.positions)).toBe(false);
        const mesh = nearWood.find(mesh => mesh.geometry.getAttribute('position').array === contact.positions)!;
        expect(mesh, contact.id).toBeDefined();
        const index = mesh.geometry.index;
        expect(contact.indices.length).toBe(index?.count ?? contact.positions.length / 3);
        let topologyErrors = 0;
        for (let i = 0; i < contact.indices.length; i++) if (contact.indices[i] !== (index ? index.getX(i) : i)) topologyErrors++;
        expect(topologyErrors).toBe(0);
        if (isPineSpecies(tree.sp)) expect(contact.indices.length / 3).toBe(4378);
        const key = `${tree.sp}:${tree.v}:${tree.assetId ?? ''}`, previous = variantBuffers.get(key);
        if (previous) { expect(contact.positions).toBe(previous.positions); expect(contact.indices).toBe(previous.indices); }
        else variantBuffers.set(key, contact);
      }
      expect(variantBuffers.size).toBeLessThan(forest.physicalWood.length / 10);
      const transforms = forest.physicalWood.map(({ id, translation, yaw, scale }) => ({ id, translation, yaw, scale }));
      if (firstTransforms) expect(transforms).toEqual(firstTransforms); else firstTransforms = transforms;
      forest.dispose!();
    }
    vi.unstubAllGlobals();
  });

  for (const quality of ['low', 'medium', 'high'] as const) for (const lod of [0, 1, 2]) {
    it(`replaces every conifer and retains canonical obstacles on ${quality} LOD${lod}`, () => {
      vi.stubGlobal('location', { search: `?lod=${lod}` });
      const colliders = new Colliders();
      const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
      expect(colliders.all).toEqual(canonical.all);
      // This component explicitly omits the new catalog and retains its historical
      // all-conifer substitution. A51 changes accepted habitat claims and density;
      // presets still change only decorations, never canonical obstacle identities.
      const selectedPopulation = selectFloraPopulation(population, quality).trees;
      expect(forest.stats!().solitaryPines).toBe(selectedPopulation.filter(tree => isPineSpecies(tree.sp)).length);
      const imported = forest.group.children.filter((object) => object.name.startsWith('solitary-pine:')) as THREE.InstancedMesh[];
      const batches = new Set(selectedPopulation.filter((tree) => isPineSpecies(tree.sp)).map((tree) => `${tree.sp}:${tree.v}`));
      // Every populated source batch owns two near parts, two middle parts and one far card mesh.
      expect(imported).toHaveLength(batches.size * 5);
      expect(imported.filter((mesh) => mesh.name === 'solitary-pine:2:foliage').every((mesh) => mesh.geometry.index!.count / 3 === 48)).toBe(true);
      const camera = new THREE.OrthographicCamera(-800, 800, 800, -800, 0.1, 1800);
      camera.position.set(0, 1000, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
      const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(1, 1, 1), reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
      forest.update(0.2, frame);
      const drawn = forest.group.children.filter((object) => (object as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
      const triangles = drawn.reduce((total, mesh) => total + (mesh.geometry.index?.count ?? mesh.geometry.getAttribute('position').count) / 3 * mesh.count, 0);
      expect(forest.stats!().treeTris).toBe(Math.round(triangles));
      const selected = selectFloraPopulation(population, quality).trees;
      expect(forest.stats!().treesDrawn).toBe(selected.length);
      const found = new Set<typeof selected[number]>();
      const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
      for (const mesh of drawn) {
        const p = mesh.geometry.getAttribute('position');
        for (let instance = 0; instance < mesh.count; instance++) {
          mesh.getMatrixAt(instance, matrix);
          const tree = selected.find(tree => Math.abs(tree.x - matrix.elements[12]!) < 0.00002 && Math.abs(tree.z - matrix.elements[14]!) < 0.00002)!;
          expect(tree, mesh.name).toBeDefined(); found.add(tree);
          expect(matrix.elements[13]).toBeCloseTo(tree.y, 4);
          const scale = new THREE.Vector3().setFromMatrixScale(matrix);
          expect(scale.x).toBeCloseTo(tree.s, 5); expect(scale.y).toBeCloseTo(tree.s, 5); expect(scale.z).toBeCloseTo(tree.s, 5);
          if (!mesh.name.endsWith(':wood')) continue;
          // Actual rendered instance positions, not only population metadata or root-origin height.
          let maximumExposure = -Infinity;
          for (let i = 0; i < p.count; i++) if (p.getY(i) <= TREE_ROOT_PLANE) {
            point.fromBufferAttribute(p, i).applyMatrix4(matrix);
            maximumExposure = Math.max(maximumExposure, point.y - terrain.heightAt(point.x, point.z) + TREE_SOIL_OVERLAP);
          }
          expect(maximumExposure, `${quality} LOD${lod} ${mesh.name} ${tree.x},${tree.z}`).toBeLessThanOrEqual(0.00003);
        }
      }
      expect(found.size).toBe(selected.length);
      forest.dispose!(); forest.dispose!();
      vi.unstubAllGlobals();
    });
  }

  it('crossfades actual source instances continuously on short camera steps without changing their forms or roots', () => {
    vi.stubGlobal('location', { search: '' });
    const quality = 'medium', colliders = new Colliders();
    const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    const tree = selectFloraPopulation(population, quality).trees.find(tree => tree.sp === 'pine')!;
    const camera = new THREE.OrthographicCamera(-800, 800, 800, -800, 0.1, 1800);
    const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(1, 1, 1), reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    const foliage = forest.group.children.filter(object => object.name.startsWith('solitary-pine:') && object.name.endsWith(':foliage')) as THREE.InstancedMesh[];
    const matrix = new THREE.Matrix4(), scale = new THREE.Vector3();
    for (const distance of [119.99, 120.01, 150, 179.99, 180.01, 479.99, 480.01, 550, 619.99, 620.01]) {
      camera.position.set(tree.x - distance, tree.y + 12, tree.z); camera.lookAt(tree.x, tree.y + 12, tree.z); camera.updateMatrixWorld();
      forest.update(0.001, frame);
      const found = [0, 0, 0], intervals: [number, number][] = [];
      for (const mesh of foliage) for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        if (Math.abs(matrix.elements[12]! - tree.x) > 0.00002 || Math.abs(matrix.elements[14]! - tree.z) > 0.00002) continue;
        const level = Number(mesh.name.split(':')[1]);
        const coverage = mesh.geometry.getAttribute('aDistanceCoverage');
        found[level] = coverage.getY(i) - coverage.getX(i);
        intervals.push([coverage.getX(i), coverage.getY(i)]);
        expect(matrix.elements[13]).toBeCloseTo(tree.y, 4);
        scale.setFromMatrixScale(matrix);
        expect(scale.x).toBeCloseTo(tree.s, 5); expect(scale.y).toBeCloseTo(tree.s, 5); expect(scale.z).toBeCloseTo(tree.s, 5);
      }
      const expected = floraLodWeights(quality, distance);
      for (let level = 0; level < 3; level++) expect(found[level]).toBeCloseTo(expected[level]!, 6);
      intervals.sort((a, b) => a[0] - b[0]);
      expect(intervals[0]![0]).toBe(0); expect(intervals.at(-1)![1]).toBe(1);
      for (let i = 1; i < intervals.length; i++) expect(intervals[i]![0]).toBe(intervals[i - 1]![1]);
    }
    expect(colliders.all).toEqual(canonical.all);
    forest.dispose!(); vi.unstubAllGlobals();
  });

  it('reuses static world tree bounds during continuous camera turns', () => {
    vi.stubGlobal('location', { search: '' });
    const quality = 'high';
    const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality,
      settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(),
      sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    const tree = population.find(t => t.sp === 'pine')!;
    const camera = new THREE.PerspectiveCamera(58, 1.6, .1, 1400);
    camera.position.set(tree.x, tree.y + 2, tree.z + 30);
    camera.lookAt(tree.x, tree.y + 2, tree.z); camera.updateMatrixWorld();
    const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0,
      sunDir: new THREE.Vector3(1, 1, 1), shadowFrustum: null, reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    forest.update(1 / 60, frame);
    const bounds = vi.spyOn(THREE.Sphere.prototype, 'applyMatrix4');
    try {
      for (let i = 0; i < 60; i++) { camera.rotateY(.01); camera.updateMatrixWorld(); forest.update(1 / 60, frame); }
      process.stdout.write(`static tree bound transforms during 60 turns: ${bounds.mock.calls.length}\n`);
      expect(bounds.mock.calls.length).toBe(0);
      expect(forest.stats!().treesDrawn).toBeGreaterThan(0);
    } finally { bounds.mockRestore(); forest.dispose!(); vi.unstubAllGlobals(); }
  });

  it('uploads only changed tree slots after turning the camera', () => {
    vi.stubGlobal('location', { search: '' });
    const quality = 'high';
    const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality,
      settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(),
      sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    const tree = population.find(t => t.sp === 'pine')!;
    const camera = new THREE.PerspectiveCamera(58, 1.6, .1, 1400);
    camera.position.set(tree.x, tree.y + 2, tree.z + 30);
    camera.lookAt(tree.x, tree.y + 2, tree.z); camera.updateMatrixWorld();
    const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0,
      sunDir: new THREE.Vector3(1, 1, 1), shadowFrustum: null, reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    const meshes: THREE.InstancedMesh[] = [];
    forest.group.traverse(o => { if (o instanceof THREE.InstancedMesh && o.geometry.hasAttribute('aDistanceCoverage')) meshes.push(o); });
    forest.update(1 / 60, frame);
    const before = new Map<THREE.BufferAttribute, { version: number; data: number[]; count: number }>();
    for (const mesh of meshes) {
      for (const attr of [mesh.instanceMatrix, mesh.instanceColor, mesh.geometry.getAttribute('aDistanceCoverage') as THREE.BufferAttribute]) {
        if (attr) before.set(attr, { version: attr.version, data: Array.from(attr.array), count: mesh.count });
      }
      mesh.instanceMatrix.clearUpdateRanges(); mesh.instanceColor?.clearUpdateRanges();
      (mesh.geometry.getAttribute('aDistanceCoverage') as THREE.BufferAttribute).clearUpdateRanges();
    }
    camera.rotateY(.1); camera.updateMatrixWorld(); forest.update(1 / 60, frame);
    let full = 0, active = 0, prefixBytes = 0, staticBytes = 0;
    for (const mesh of meshes) {
      for (const attr of [mesh.instanceMatrix, mesh.instanceColor, mesh.geometry.getAttribute('aDistanceCoverage') as THREE.BufferAttribute]) {
        if (!attr) continue;
        full += attr.array.byteLength;
        const ranges = attr.updateRanges;
        if (!ranges.length) {
          const old = before.get(attr)!;
          expect(attr.version).toBe(old.version);
          expect(mesh.count).toBeLessThanOrEqual(old.count);
          const prefix = Math.max(1, mesh.count) * attr.itemSize;
          expect(Array.from(attr.array.slice(0, prefix))).toEqual(old.data.slice(0, prefix));
          continue;
        }
        expect(ranges, mesh.name).toHaveLength(1);
        const range = ranges[0]!;
        const gpu = before.get(attr)!.data.slice();
        expect(range.start).toBeGreaterThanOrEqual(0);
        expect(range.start + range.count).toBeLessThanOrEqual(attr.array.length);
        for (let i = range.start; i < range.start + range.count; i++) gpu[i] = attr.array[i]!;
        const count = mesh.count * attr.itemSize;
        expect(gpu.slice(0, count), mesh.name).toEqual(Array.from(attr.array.slice(0, count)));
        if (attr === mesh.instanceMatrix || attr === mesh.instanceColor) {
          prefixBytes += Math.max(1, mesh.count) * attr.itemSize * 4;
          staticBytes += range.count * 4;
        }
        active += range.count * 4;
      }
    }
    expect(active).toBeLessThan(full / 2);
    expect(staticBytes).toBeLessThanOrEqual(prefixBytes);
    let sawPartialUpload = false;
    // Multiple selection refreshes can precede an actual GPU upload (including culled batches).
    // Keep a simulated GPU at the preceding draw, then consume the union of all pending writes every fourth turn.
    const gpu = new Map<THREE.BufferAttribute, number[]>();
    for (const mesh of meshes) for (const attr of [mesh.instanceMatrix, mesh.instanceColor]) {
      if (attr) { gpu.set(attr, Array.from(attr.array)); attr.clearUpdateRanges(); }
    }
    for (let turn = 0; turn < 32; turn++) {
      camera.rotateY(turn < 16 ? .04 : -.04); camera.updateMatrixWorld(); forest.update(1 / 60, frame);
      if (turn % 4 !== 3) continue;
      for (const mesh of meshes) for (const attr of [mesh.instanceMatrix, mesh.instanceColor]) {
        if (!attr) continue;
        const data = gpu.get(attr)!;
        for (const range of attr.updateRanges) {
          if (range.start > 0) sawPartialUpload = true;
          for (let i = range.start; i < range.start + range.count; i++) data[i] = attr.array[i]!;
        }
        const count = mesh.count * attr.itemSize;
        expect(data.slice(0, count), `${mesh.name} turn ${turn}`).toEqual(Array.from(attr.array.slice(0, count)));
        attr.clearUpdateRanges();
      }
    }
    expect(sawPartialUpload).toBe(true);
    process.stdout.write(`tree turn upload bytes: ${full} full -> ${active} active\n`);
    forest.dispose!(); vi.unstubAllGlobals();
  });

  it('casts off-screen trees in the sun volume from shadow-only meshes, never drawn in colour, and tracks a moving sun with an idle camera', () => {
    vi.stubGlobal('location', { search: '' });
    const quality = 'high', colliders = new Colliders();
    const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    const tree = selectFloraPopulation(population, quality).trees.find(tree => tree.sp === 'pine')!;
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1400);
    camera.position.set(tree.x, tree.y + 12, tree.z + 80); camera.lookAt(tree.x, tree.y + 12, tree.z + 200); camera.updateMatrixWorld();
    const shadowCamera = new THREE.OrthographicCamera(-40, 40, 40, -40, 0.1, 150);
    const shadow = new THREE.Frustum(), pv = new THREE.Matrix4();
    const setShadow = (shift: number) => {
      shadowCamera.position.set(tree.x + shift, tree.y + 80, tree.z); shadowCamera.lookAt(tree.x + shift, tree.y, tree.z); shadowCamera.updateMatrixWorld();
      shadow.setFromProjectionMatrix(pv.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse));
    };
    const frame: FrameContext = { camera, quality, time: 1, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(1, 1, 1), shadowFrustum: null, reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    const foliage = forest.shadowCasters.children.filter(object => object.name.startsWith('solitary-pine:') && object.name.endsWith(':foliage:shadow')) as THREE.InstancedMesh[];
    const colour = forest.group.children.filter(object => object.name.startsWith('solitary-pine:') && object.name.endsWith(':foliage')) as THREE.InstancedMesh[];
    expect(foliage.length).toBeGreaterThan(0);
    expect(foliage.every(mesh => mesh.castShadow && !mesh.receiveShadow)).toBe(true);
    expect(colour.every(mesh => !mesh.castShadow)).toBe(true);
    const matrix = new THREE.Matrix4();
    const drawnIn = (meshes: THREE.InstancedMesh[]) => meshes.some(mesh => {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        if (Math.abs(matrix.elements[12]! - tree.x) < 0.00002 && Math.abs(matrix.elements[14]! - tree.z) < 0.00002) return true;
      }
      return false;
    });
    const targetPresent = () => drawnIn(foliage);
    forest.update(0.2, frame); expect(targetPresent()).toBe(false);
    setShadow(0); frame.shadowFrustum = shadow;
    forest.update(0.001, frame); expect(targetPresent()).toBe(true);
    // Shadow-only: the colour pass does not pay for a tree the camera cannot see.
    expect(drawnIn(colour)).toBe(false);
    const versions = foliage.map(mesh => mesh.instanceMatrix.version);
    forest.update(0.01, frame); expect(foliage.map(mesh => mesh.instanceMatrix.version)).toEqual(versions);
    setShadow(0.1);
    forest.update(0.1, frame); expect(foliage.map(mesh => mesh.instanceMatrix.version)).toEqual(versions);
    forest.update(0.1, frame);
    // The small sun drift retains the same caster slots, so the static buffers stay unchanged.
    expect(foliage.map(mesh => mesh.instanceMatrix.version)).toEqual(versions);
    expect(targetPresent()).toBe(true);
    // A large hour/focus jump exceeds the guard and is reflected on this very frame.
    setShadow(300); forest.update(0.001, frame); expect(targetPresent()).toBe(false);
    setShadow(0); forest.update(0.001, frame); expect(targetPresent()).toBe(true);
    // A broad crown can intersect the sun volume while the same instance's trunk is wholly outside.
    // Every packed part must satisfy its own envelope, retaining two metres of wind and one of drift.
    let independentParts = false;
    const sphere = new THREE.Sphere();
    for (const shift of [0, 15, 30, 45, 60]) {
      setShadow(shift); forest.update(0.001, frame);
      for (const object of forest.shadowCasters.children) {
        const mesh = object as THREE.InstancedMesh;
        if (!mesh.isInstancedMesh) continue;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          sphere.copy(mesh.geometry.boundingSphere!).applyMatrix4(matrix); sphere.radius += 3;
          expect(shadow.intersectsSphere(sphere), mesh.name).toBe(true);
        }
        if (mesh.name.endsWith(':wood:shadow')) {
          const leaf = forest.shadowCasters.getObjectByName(mesh.name.replace(':wood:shadow', ':foliage:shadow')) as THREE.InstancedMesh | undefined;
          if (leaf && leaf.count !== mesh.count) independentParts = true;
        }
      }
    }
    expect(independentParts).toBe(true);
    frame.shadowFrustum = null; forest.update(0.001, frame); expect(targetPresent()).toBe(false);
    forest.dispose!(); vi.unstubAllGlobals();
  });

  it('animates detached leaves with an idle camera while the actual tree matrices stay still, and freezes in Reduced Motion', () => {
    vi.stubGlobal('location', { search: '' });
    const quality = 'medium', colliders = new Colliders();
    const forest = buildFlora({ terrain, excl, colliders, quality, settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
    const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 1400);
    camera.position.set(-200, 3, 12); camera.lookAt(-180, 5, 12); camera.updateMatrixWorld();
    const frame: FrameContext = { camera, quality, time: 1, focus: new THREE.Vector3(-200, terrain.heightAt(-200, 12), 12), nightness: 0, sunDir: new THREE.Vector3(1, 1, 1), reducedMotion: false, hour: 11, view: worldView(createInitialState()) };
    forest.update(0.1, frame);
    const leaves = forest.group.getObjectByName('detached-leaves') as THREE.InstancedMesh;
    expect(leaves.isInstancedMesh).toBe(true);
    expect(leaves.count).toBeGreaterThan(0);
    const leafPose = [...leaves.instanceMatrix.array];
    const treeMeshes = forest.group.children.filter(object => (object as THREE.InstancedMesh).isInstancedMesh) as THREE.InstancedMesh[];
    const treePoses = treeMeshes.map(mesh => [...mesh.instanceMatrix.array]);
    forest.update(1, frame);
    expect([...leaves.instanceMatrix.array]).not.toEqual(leafPose);
    expect(treeMeshes.map(mesh => [...mesh.instanceMatrix.array])).toEqual(treePoses);
    const heldLeafPose = [...leaves.instanceMatrix.array];
    frame.time = 100; frame.reducedMotion = true;
    forest.update(10, frame);
    expect([...leaves.instanceMatrix.array]).toEqual(heldLeafPose);
    expect(treeMeshes.map(mesh => [...mesh.instanceMatrix.array])).toEqual(treePoses);
    expect(colliders.all).toEqual(canonical.all);
    forest.dispose!(); vi.unstubAllGlobals();
  });
});

it('retains every far-LOD pine in audit coverage when its delivered card has no wood', () => {
  vi.stubGlobal('location', { search: '' });
  const quality = 'low';
  const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality,
    settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(),
    sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
  try {
    const near = forest.canopyAuditTargets!(0), far = forest.canopyAuditTargets!(2);
    expect(far).toHaveLength(forest.counts.trees);
    expect(far.map(t => t.label).sort()).toEqual(near.map(t => t.label).sort());
    const unsupported = far.filter(t => !t.wood && t.leaves);
    expect(unsupported.length).toBeGreaterThan(0);
    expect(unsupported.some(t => t.species === 'pine')).toBe(true);
    expect(unsupported.every(t => ['pine', 'fir', 'shorepine'].includes(t.species ?? '') && t.lod === 2)).toBe(true);
  } finally { forest.dispose!(); vi.unstubAllGlobals(); }
});

it('keeps fixed tree color-batch local matrices cached while parent transforms still propagate', () => {
  vi.stubGlobal('location', { search: '' });
  const quality = 'low';
  const forest = buildFlora({ terrain, excl, colliders: new Colliders(), quality,
    settings: { ...defaultSettings(), quality }, library: AssetLibrary.empty(),
    sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
  const spies: ReturnType<typeof vi.spyOn>[] = [];
  try {
    const parts = forest.group.children.filter(p => (p as THREE.InstancedMesh).isInstancedMesh && /:([012]):(wood|foliage)$/.test(p.name)) as THREE.InstancedMesh[];
    expect(parts.length).toBeGreaterThan(0);
    forest.group.updateMatrixWorld(true);
    const local = parts.map(p => p.matrix.clone()), instances = parts.map(p => p.instanceMatrix.array.slice());
    for (const p of parts) spies.push(vi.spyOn(p.matrix, 'compose'));
    for (let i = 0; i < 120; i++) forest.group.updateMatrixWorld(true);
    expect(spies.reduce((n, spy) => n + spy.mock.calls.length, 0)).toBe(0);
    forest.group.position.set(3, -2, 7); forest.group.rotation.set(.1, .3, -.2); forest.group.scale.set(2, .8, 1.3);
    forest.group.updateMatrixWorld(true);
    parts.forEach((p, i) => {
      expect(p.matrixAutoUpdate).toBe(false); expect(p.matrixWorldAutoUpdate).toBe(true);
      expect(p.matrix.equals(local[i]!)).toBe(true);
      expect(p.matrixWorld.equals(new THREE.Matrix4().multiplyMatrices(forest.group.matrixWorld, local[i]!))).toBe(true);
      expect(p.instanceMatrix.array).toEqual(instances[i]);
    });
  } finally { spies.forEach(s => s.mockRestore()); forest.dispose!(); vi.unstubAllGlobals(); }
});
