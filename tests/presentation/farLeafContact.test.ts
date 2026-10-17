import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { buildFlora } from '../../src/presentation/flora';
import { woodAnchor } from '../../src/presentation/canopy';
import type { PineTemplates } from '../../src/presentation/solitaryPine';
import { AssetLibrary } from '../../src/presentation/assets/library';
import { Terrain } from '../../src/world/terrain';
import { Colliders } from '../../src/world/colliders';
import { Exclusions } from '../../src/presentation/vegetation';
import { defaultSettings } from '../../src/platform/settings';

vi.mock('../../src/presentation/forestFloor', () => ({ buildForestFloor: () => ({ group: new THREE.Group(), update() {}, dispose() {} }) }));
vi.mock('../../src/presentation/treeMaterials', () => ({
  woodMaterial: () => new THREE.MeshStandardMaterial(), leafMaterial: () => new THREE.MeshStandardMaterial(), installBarkDetail() {}, disposeTreeMaterials() {},
}));
vi.mock('../../src/presentation/treeTextures', () => ({ barkTextures: () => ({ map: new THREE.DataTexture(), surface: new THREE.DataTexture() }), disposeTreeTextures() {} }));

it('keeps opaque leaf contact when the forest hands over to a far model with wood', () => {
  const scene = new THREE.Group(), wood = new THREE.CylinderGeometry(.2, .2, 10, 6).translate(0, 5, 0);
  const leaves = new THREE.PlaneGeometry(1, 1).translate(4, 8, 0), woodMaterial = new THREE.MeshStandardMaterial(), leafMaterial = new THREE.MeshStandardMaterial({ alphaTest: .42 });
  scene.add(new THREE.Mesh(wood, woodMaterial), new THREE.Mesh(leaves, leafMaterial));
  const templates = [0, 1, 2].map(() => ({ scene })) as unknown as PineTemplates;
  const terrain = new Terrain(), before = leaves.getAttribute('position').array.slice();
  const forest = buildFlora({ terrain, excl: new Exclusions(terrain), colliders: new Colliders(), quality: 'low',
    settings: { ...defaultSettings(), quality: 'low' }, library: AssetLibrary.empty(), sway: { uTime: { value: 0 }, uWind: { value: 0 } } }, templates);
  try {
    const target = forest.canopyAuditTargets!(2).find(t => t.species === 'pine' && t.wood && t.leaves)!;
    expect(target).toBeDefined();
    const p = target.leaves!.getAttribute('position'), hit = new THREE.Vector3(), query = woodAnchor(target.wood!);
    let gap = Infinity;
    for (let i = 0; i < p.count; i++) gap = Math.min(gap, query(new THREE.Vector3().fromBufferAttribute(p, i), hit));
    const scale = Math.hypot(...target.matrix.elements.slice(0, 3));
    expect(gap * scale).toBeLessThanOrEqual(.6);
    expect(leaves.getAttribute('position').array).toEqual(before);
  } finally { forest.dispose?.(); wood.dispose(); leaves.dispose(); woodMaterial.dispose(); leafMaterial.dispose(); }
});
