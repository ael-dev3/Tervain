import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { buildFlora } from '../../src/presentation/flora';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { Exclusions } from '../../src/presentation/vegetation';
import { Terrain } from '../../src/world/terrain';
import { Colliders } from '../../src/world/colliders';
import { defaultSettings } from '../../src/platform/settings';
import type { FrameContext } from '../../src/presentation/context';
import type { PineTemplates } from '../../src/presentation/solitaryPine';

vi.mock('../../src/presentation/floraPopulation', async original => ({
  ...await original<typeof import('../../src/presentation/floraPopulation')>(),
  createFloraPopulation: () => [-80, 80].map((z, i) => ({ sp: 'oak', v: 0, x: 0, y: 0, z, s: 1, yaw: 0, tint: 1, radius: 1, collisionId: 'tree:'+i, decorationRank: 0 })),
}));
vi.mock('../../src/presentation/forestFloor', () => ({ buildForestFloor: () => ({ group: new THREE.Group(), update() {}, dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', () => ({ woodMaterial: () => new THREE.MeshStandardMaterial(), leafMaterial: () => new THREE.MeshStandardMaterial(), installBarkDetail() {}, disposeTreeMaterials() {} }));
vi.mock('../../src/presentation/treeTextures', () => ({ barkTextures: () => ({ map: new THREE.DataTexture(), surface: new THREE.DataTexture() }), disposeTreeTextures() {} }));

it('selects the opposite tree for a capture, restores primary buffers/stats, and preserves nested captures and the idle cache', () => {
  vi.stubGlobal('location', { search: '' });
  const terrain = new Terrain(); terrain.heightAt = () => 0;
  const scene = new THREE.Group(); scene.add(new THREE.Mesh(new THREE.CylinderGeometry(.2,.2,10,6), new THREE.MeshStandardMaterial())); scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshStandardMaterial({alphaTest:.5})));
  const templates = [0,1,2].map(() => ({scene})) as unknown as PineTemplates;
  const forest = buildFlora({ terrain, excl: new Exclusions(terrain), colliders: new Colliders(), quality: 'low', settings: defaultSettings(), library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
  const camera = new THREE.PerspectiveCamera(45, 1, .1, 200); camera.position.set(0, 5, 0); camera.lookAt(0, 5, 30); camera.updateMatrixWorld(true);
  const frame = { camera, reducedMotion: true, time: 0, focus: camera.position, nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), quality: 'low', hour: 12, view: {} as FrameContext['view'] } as FrameContext;
  const snapshot = () => {
    const meshes: unknown[] = [];
    forest.group.traverse(o => { const m = o as THREE.InstancedMesh; if (!m.isInstancedMesh) return;
      const coverage = m.geometry.getAttribute('aDistanceCoverage');
      meshes.push([m.name, m.visible, m.count, Array.from(m.instanceMatrix.array.slice(0, m.count * 16)), m.instanceColor ? Array.from(m.instanceColor.array.slice(0, m.count * 3)) : null, coverage ? Array.from(coverage.array.slice(0, m.count * 2)) : null, (m.boundingSphere ? [m.boundingSphere.center.toArray(),m.boundingSphere.radius] : null)]);
    });
    return JSON.stringify({ meshes, stats: forest.stats?.() });
  };
  try {
    forest.update(0, frame); const primary = snapshot();
    expect(forest.stats?.().treesDrawn).toBe(1);
    const capture = camera.clone(); capture.lookAt(0, 5, -30); capture.updateMatrixWorld(true);
    const restore = forest.forCapture(capture), captured = snapshot();
    expect(captured).not.toBe(primary); expect(forest.stats?.().treesDrawn).toBe(1);
    const parent = new THREE.Group(); parent.position.z = 10000;
    const child = capture.clone(); child.position.z = -10000; parent.add(child); parent.updateMatrixWorld(true);
    const parentedRestore = forest.forCapture(child);
    expect(snapshot()).toBe(captured); parentedRestore(); expect(snapshot()).toBe(captured);
    const nested = forest.forCapture(camera); expect(snapshot()).toBe(primary);
    nested(); expect(snapshot()).toBe(captured); nested(); expect(snapshot()).toBe(captured);
    restore(); expect(snapshot()).toBe(primary); restore(); expect(snapshot()).toBe(primary);
    camera.position.z += .001; camera.updateMatrixWorld(true);
    forest.update(0, frame); expect(snapshot()).toBe(primary);
    const belowThresholdRestore = forest.forCapture(capture);
    belowThresholdRestore(); expect(snapshot()).toBe(primary);
  } finally { forest.dispose?.(); scene.traverse(o => {const m=o as THREE.Mesh;if(m.isMesh){m.geometry.dispose();(m.material as THREE.Material).dispose();}}); vi.unstubAllGlobals(); }
});
