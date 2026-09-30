import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENU_CAMERA, MENU_TREE, menuHeight } from '../../src/presentation/menu/menuLayout';
import { restHeight } from '../../src/presentation/menu/menuLand';
import { buildAncientTree } from '../../src/presentation/menu/menuTree';
import { buildMenuWisps, sampleMenuAwakening, type MenuWisps } from '../../src/presentation/menu/menuWisps';

const built: MenuWisps[] = [];
const treeCentre = new THREE.Vector3(-10.5, -0.4, -9.8);
const doorFacing = 0.45;
const doorAt = treeCentre.clone().add(new THREE.Vector3(Math.sin(doorFacing) * 1.65, 0, Math.cos(doorFacing) * 1.65));

function fixture(quality: 'low' | 'medium' | 'high' = 'high') {
  const wisps = buildMenuWisps({ doorAt, doorFacing, treeCentre, quality });
  built.push(wisps);
  return wisps;
}

function meshes(wisps: MenuWisps) { return wisps.group.children as THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>[]; }
function attribute(wisps: MenuWisps, name: string, tail = false) {
  return meshes(wisps)[tail ? 2 : 0]!.geometry.getAttribute(name) as THREE.InstancedBufferAttribute;
}
function snapshot(wisps: MenuWisps) {
  return {
    visible: wisps.group.visible,
    head: Array.from(attribute(wisps, 'aHead').array),
    tint: Array.from(attribute(wisps, 'aTint').array),
    life: Array.from(attribute(wisps, 'aLife').array),
    trail: Array.from({ length: 7 }, (_, i) => Array.from(attribute(wisps, `aTrail${i}`, true).array)),
  };
}

afterEach(() => { for (const wisps of built.splice(0)) wisps.dispose(); });

describe('native score-led hermitage wisps', () => {
  it('uses three texture-free, depth-occluded instanced draws with a bounded detailed-core budget on every preset', () => {
    for (const [quality, count] of [['low', 16], ['medium', 24], ['high', 30]] as const) {
      const wisps = fixture(quality);
      expect(wisps.group.visible).toBe(false);
      expect(wisps.stats.wisps).toBe(count);
      expect(wisps.stats.meshes).toBe(3);
      expect(meshes(wisps)).toHaveLength(3);
      let triangles = 0;
      for (const mesh of meshes(wisps)) {
        const geometry = mesh.geometry;
        expect(geometry.isInstancedBufferGeometry).toBe(true);
        expect(geometry.instanceCount).toBe(count);
        triangles += (geometry.index?.count ?? geometry.attributes.position!.count) / 3 * count;
        expect(mesh.material.depthTest).toBe(true);
        expect(mesh.material.depthWrite).toBe(false);
        if (mesh.material.side === THREE.DoubleSide) expect(mesh.material.forceSinglePass).toBe(true);
        expect(mesh.material.uniforms).toEqual({});
        expect(mesh.material.fragmentShader).not.toContain('sampler2D');
        expect(geometry.boundingSphere!.radius).toBeGreaterThan(10);
        for (const value of Object.values(geometry.attributes)) expect(Array.from(value.array).every(Number.isFinite)).toBe(true);
      }
      expect(triangles).toBe(wisps.stats.triangles);
      expect(triangles).toBeLessThan(1100);
      wisps.update(85, 0.352, 214.2);
      for (const mesh of meshes(wisps)) {
        for (const value of Object.values(mesh.geometry.attributes)) expect(Array.from(value.array).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('keeps the door shut for thirty seconds, reveals the crowd gradually and returns it before the native loop', () => {
    expect(sampleMenuAwakening(0)).toEqual({ opening: 0, reveal: 0, returning: 0 });
    expect(sampleMenuAwakening(30).opening).toBe(0);
    expect(sampleMenuAwakening(34).opening).toBeGreaterThan(0);
    expect(sampleMenuAwakening(39).opening).toBe(1);
    expect(sampleMenuAwakening(42).reveal).toBe(1);
    expect(sampleMenuAwakening(203).returning).toBe(0);
    expect(sampleMenuAwakening(207).returning).toBeGreaterThan(0);
    expect(sampleMenuAwakening(210.2).returning).toBe(1);
    expect(sampleMenuAwakening(210.2).opening).toBeGreaterThan(0);
    expect(sampleMenuAwakening(213.8).opening).toBe(0);
    const wisps = fixture();
    wisps.update(30, 1, 214.2);
    expect(wisps.group.visible).toBe(false);
    wisps.update(32, 1, 214.2);
    const early = attribute(wisps, 'aLife');
    const seen = Array.from({ length: 30 }, (_, i) => early.getX(i)).filter((v) => v > 0).length;
    expect(seen).toBeGreaterThan(0);
    expect(seen).toBeLessThan(8);
    wisps.update(43, 1, 214.2);
    expect(Array.from({ length: 30 }, (_, i) => early.getX(i)).every((v) => v === 1)).toBe(true);
    wisps.update(210.2, 1, 214.2);
    const heads = attribute(wisps, 'aHead');
    for (let i = 0; i < 30; i++) {
      const x = heads.getX(i) + treeCentre.x - doorAt.x;
      const z = heads.getZ(i) + treeCentre.z - doorAt.z;
      expect(Math.hypot(x, z)).toBeLessThan(0.16);
      expect(heads.getY(i) + treeCentre.y - doorAt.y).toBeGreaterThan(0.8);
      expect(heads.getY(i) + treeCentre.y - doorAt.y).toBeLessThan(1);
    }
    wisps.update(212, 1, 214.2);
    expect(wisps.group.visible).toBe(false);
    wisps.update(0.01, 1, 214.2);
    expect(wisps.group.visible).toBe(false);
    for (const time of [NaN, Infinity, -1, 0, 31, 39, 210, 214.2, 1000]) {
      for (const duration of [NaN, 0, Infinity, 214.2]) {
        const cue = sampleMenuAwakening(time, duration);
        expect(Object.values(cue).every((value) => Number.isFinite(value) && value >= 0 && value <= 1)).toBe(true);
      }
    }
  });

  it('reconstructs every core, spectral tint and historical tail point directly from source time', () => {
    const a = fixture();
    const b = fixture();
    const random = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('animation must not sample random'); });
    try {
      for (let time = 31; time < 99; time += 0.43) a.update(time, 0.352, 214.2);
      a.update(99, 0.352, 214.2);
      b.update(99, 0.352, 214.2);
      expect(snapshot(a)).toEqual(snapshot(b));
      const frozen = snapshot(a);
      const version = attribute(a, 'aHead').version;
      for (let i = 0; i < 60; i++) a.update(99, 0.352, 214.2);
      expect(snapshot(a)).toEqual(frozen);
      expect(attribute(a, 'aHead').version).toBe(version);
      a.update(55, 0.352, 214.2);
      b.update(55, 0.352, 214.2);
      expect(snapshot(a)).toEqual(snapshot(b));
      const tail = attribute(a, 'aTrail3', true);
      b.update(55 - 0.75, 0.352, 214.2);
      const past = attribute(b, 'aHead');
      for (let i = 0; i < 30; i++) {
        expect([tail.getX(i), tail.getY(i), tail.getZ(i)]).toEqual([past.getX(i), past.getY(i), past.getZ(i)]);
      }
      const head = attribute(a, 'aHead');
      const attached = attribute(a, 'aTrail0', true);
      for (let i = 0; i < 30; i++) expect([attached.getX(i), attached.getY(i), attached.getZ(i)]).toEqual([head.getX(i), head.getY(i), head.getZ(i)]);
    } finally { random.mockRestore(); }
  });

  it('keeps common spirits unchanged across presets, clear of the bole and central choices, with visible pearl volume', () => {
    const low = fixture('low');
    const high = fixture('high');
    const camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 16 / 9, 0.2, 2600);
    camera.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
    camera.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
    camera.updateMatrixWorld(true);
    const point = new THREE.Vector3();
    let minimumCorePixels = Infinity;
    for (let time = 50; time <= 195; time += 2.37) {
      low.update(time, 0.352, 214.2);
      high.update(time, 0.352, 214.2);
      expect(Array.from(attribute(low, 'aHead').array)).toEqual(Array.from(attribute(high, 'aHead').array).slice(0, 16 * 4));
      const heads = attribute(high, 'aHead');
      for (let i = 0; i < 30; i++) {
        const x = heads.getX(i);
        const z = heads.getZ(i);
        expect(Math.hypot(x, z)).toBeGreaterThan(2.8);
        point.set(x + treeCentre.x, heads.getY(i) + treeCentre.y, z + treeCentre.z).project(camera);
        expect(point.x).toBeLessThan(-0.25);
        point.set(x + treeCentre.x, heads.getY(i) + treeCentre.y, z + treeCentre.z).applyMatrix4(camera.matrixWorldInverse);
        const pixels = heads.getW(i) * 2 * 566 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * -point.z);
        minimumCorePixels = Math.min(minimumCorePixels, pixels);
      }
    }
    expect(minimumCorePixels).toBeGreaterThan(5);
    expect(attribute(high, 'aTint').getX(0)).not.toBe(attribute(high, 'aTint').getX(4));
  });

  it('hides at zero gain and disposes only its owned geometry/materials once', () => {
    const wisps = fixture();
    const geometry = meshes(wisps).map((mesh) => vi.spyOn(mesh.geometry, 'dispose'));
    const material = meshes(wisps).map((mesh) => vi.spyOn(mesh.material, 'dispose'));
    const originalDoor = doorAt.clone();
    const originalTree = treeCentre.clone();
    wisps.update(90, 0.352, 214.2);
    expect(wisps.group.visible).toBe(true);
    wisps.update(90, 0, 214.2);
    expect(wisps.group.visible).toBe(false);
    wisps.update(90, 0.352, 214.2);
    expect(wisps.group.visible).toBe(true);
    wisps.dispose(); wisps.dispose();
    wisps.update(90, 1, 214.2);
    expect(wisps.group.visible).toBe(false);
    expect(wisps.group.children).toHaveLength(0);
    for (const spy of [...geometry, ...material]) expect(spy).toHaveBeenCalledTimes(1);
    expect(doorAt).toEqual(originalDoor);
    expect(treeCentre).toEqual(originalTree);
  });

  it('keeps a visible front procession beside the actual tree at the native narrow desktop framing', () => {
    const treeRoot = new THREE.Group();
    const ty = restHeight(MENU_TREE.x, MENU_TREE.z, 2.5) + 0.1;
    treeRoot.position.set(MENU_TREE.x, ty, MENU_TREE.z);
    treeRoot.rotation.y = 0.35;
    treeRoot.updateMatrixWorld(true);
    const scratch = new THREE.Vector3();
    const up = new THREE.Vector3(0, 1, 0);
    const yaw = Math.atan2(MENU_CAMERA.x - MENU_TREE.x, MENU_CAMERA.z - MENU_TREE.z) - 0.27;
    const direction = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)).applyAxisAngle(up, -treeRoot.rotation.y);
    const tree = buildAncientTree(1207, {
      leafCards: 0,
      door: { az: Math.atan2(direction.z, direction.x), halfWidth: 0.6, height: 1.95, opening: { width: 0.86, height: 1.72 } },
      ground: (x, z) => {
        treeRoot.localToWorld(scratch.set(x, 0, z));
        return menuHeight(scratch.x, scratch.z) - ty;
      },
    });
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const bark = new THREE.Mesh(tree.wood, material);
    treeRoot.add(bark);
    treeRoot.updateMatrixWorld(true);
    const portal = treeRoot.localToWorld(new THREE.Vector3(...tree.door!.origin));
    const normal = new THREE.Vector3(...tree.door!.normal).applyAxisAngle(up, treeRoot.rotation.y);
    const camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 1006 / 672, 0.2, 2600);
    camera.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
    camera.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
    camera.updateMatrixWorld(true);
    const ray = new THREE.Raycaster();
    const point = new THREE.Vector3();
    const screen = new THREE.Vector3();
    try {
      for (const quality of ['low', 'medium', 'high'] as const) {
        const wisps = buildMenuWisps({ doorAt: portal, doorFacing: Math.atan2(normal.x, normal.z), treeCentre: treeRoot.position, quality });
        built.push(wisps);
        wisps.group.updateMatrixWorld(true);
        for (let time = 40; time < 202; time += 3.19) {
          wisps.update(time, 0.352, 214.2);
          const heads = attribute(wisps, 'aHead');
          const life = attribute(wisps, 'aLife');
          let visible = 0;
          for (let i = 0; i < heads.count; i++) {
            point.set(heads.getX(i), heads.getY(i), heads.getZ(i));
            wisps.group.localToWorld(point);
            screen.copy(point).project(camera);
            // Clear of the title, leather choice column, and left screen edge.
            if (screen.x < -0.94 || screen.x > -0.34 || screen.y < -0.72 || screen.y > 0.46 || life.getX(i) < 0.1) continue;
            ray.ray.origin.copy(camera.position);
            ray.ray.direction.copy(point).sub(camera.position).normalize();
            ray.far = camera.position.distanceTo(point) - 0.2;
            if (ray.intersectObject(bark, false).length === 0) visible++;
          }
          expect(visible, `${quality} at source ${time.toFixed(2)}s`).toBeGreaterThanOrEqual(quality === 'low' ? 4 : quality === 'medium' ? 6 : 8);
        }
      }
    } finally { tree.wood.dispose(); tree.leaves.dispose(); material.dispose(); }
  });
});
