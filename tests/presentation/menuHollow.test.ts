import * as THREE from 'three';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { MENU_CAMERA } from '../../src/presentation/menu/menuLayout';
import { HERMIT_DOOR } from '../../src/presentation/menu/menuCamp';
import { TREE_HOLLOW } from '../../src/presentation/menu/menuTree';
import { buildMenuHollow } from '../../src/presentation/menu/menuHollow';
import { createWispLighting } from '../../src/presentation/menu/menuWispLight';
import { menuGroveFixture } from './groveFixture';

const fixture = menuGroveFixture();
const face = fixture.tree.door!;
const lights = createWispLighting(5);
const hollow = buildMenuHollow(face, { lights });
const bark = new THREE.Mesh(fixture.tree.wood, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
const cell = new THREE.Mesh(hollow.mesh.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
afterAll(() => {
  hollow.dispose();
  (bark.material as THREE.Material).dispose();
  (cell.material as THREE.Material).dispose();
  fixture.dispose();
});
for (const m of [bark, cell]) m.updateMatrixWorld(true);
/** Door frame (x across, y up, z out) → tree-local. */
const n = face.normal;
const t = [n[2], 0, -n[0]] as const;
const toTree = (x: number, y: number, z: number) =>
  new THREE.Vector3(face.origin[0] + t[0] * x + n[0] * z, face.origin[1] + y, face.origin[2] + t[2] * x + n[2] * z);
const toDoor = (p: THREE.Vector3) => {
  const dx = p.x - face.origin[0];
  const dz = p.z - face.origin[2];
  return new THREE.Vector3(dx * t[0] + dz * t[2], p.y - face.origin[1], dx * n[0] + dz * n[2]);
};

describe('the hollow behind the hermit door', () => {
  it('is finite, modest, and lies wholly within the boxes the tree carves for it', () => {
    const pos = hollow.mesh.geometry.getAttribute('position');
    expect(Array.from(pos.array).every(Number.isFinite)).toBe(true);
    expect(Array.from(hollow.mesh.geometry.getAttribute('normal').array).every(Number.isFinite)).toBe(true);
    expect(hollow.stats.triangles).toBeGreaterThan(300);
    expect(hollow.stats.triangles).toBeLessThan(3000);
    const p = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      const d = toDoor(p.fromBufferAttribute(pos, i));
      expect(d.z).toBeLessThanOrEqual(0);
      expect(d.z).toBeGreaterThanOrEqual(-TREE_HOLLOW.depth);
      expect(d.y).toBeGreaterThanOrEqual(-0.06);
      expect(d.y).toBeLessThanOrEqual(TREE_HOLLOW.height);
      // The tunnel flares a little behind the posts, into the empty inside of the bole; the chamber keeps to its box.
      const half = d.z > -TREE_HOLLOW.tunnelDepth ? HERMIT_DOOR.width / 2 + 0.1 : TREE_HOLLOW.halfWidth;
      expect(Math.abs(d.x), `vertex ${i} at ${d.toArray().map((v) => v.toFixed(2))}`).toBeLessThanOrEqual(half);
    }
  });

  it('is closed all round except the doorway, with no bark, bough or root inside it', () => {
    const centre = toTree(-0.03, 0.95, -1.0);
    const ray = new THREE.Raycaster();
    let checked = 0;
    for (let k = 0; k < 400; k++) {
      // Even directions over the sphere.
      const y = 1 - (2 * (k + 0.5)) / 400;
      const r = Math.sqrt(1 - y * y);
      const a = k * 2.399963229728653;
      const dir = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r);
      // Skip what leaves through the doorway: rays heading out of the face within the aperture's reach.
      const outward = dir.x * n[0] + dir.z * n[2];
      if (outward > 0.35) continue;
      ray.set(centre, dir);
      const wall = ray.intersectObject(cell, false)[0];
      const wood = ray.intersectObject(bark, false)[0];
      expect(wall, `ray ${k} escapes the hollow`).toBeDefined();
      expect(wall!.distance).toBeLessThan(1.6);
      if (wood) expect(wood.distance, `bark inside the hollow along ray ${k}`).toBeGreaterThan(wall!.distance);
      checked++;
    }
    expect(checked).toBeGreaterThan(250);
  });

  it('shows its back wall, not the sky beyond the tree, to the menu camera through the open doorway', () => {
    const camera = fixture.treeRoot.worldToLocal(new THREE.Vector3(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z));
    const ray = new THREE.Raycaster();
    let hits = 0;
    for (const x of [-0.3, -0.1, 0.1, 0.3]) for (const y of [0.25, 0.7, 1.15, 1.55]) {
      const target = toTree(x, y, 0);
      ray.set(camera, target.clone().sub(camera).normalize());
      const wall = ray.intersectObject(cell, false)[0];
      expect(wall, `nothing behind the doorway at ${x},${y}`).toBeDefined();
      const depth = -toDoor(wall!.point).z;
      expect(depth).toBeGreaterThan(-0.01);
      if (depth > 0.9) hits++;
    }
    // Most of the view through the doorway reaches deep into the cell.
    expect(hits).toBeGreaterThanOrEqual(10);
  });

  it('draws only while the door is open and takes its light from the heart and the spirits', () => {
    const material = hollow.mesh.material as THREE.ShaderMaterial;
    hollow.update({ opening: 0, heart: 1, warm: 1, time: 10 });
    expect(hollow.mesh.visible).toBe(false);
    hollow.update({ opening: 0.6, heart: 1.4, warm: 1, time: 42 });
    expect(hollow.mesh.visible).toBe(true);
    expect(material.uniforms.uOpen!.value).toBeCloseTo(0.6);
    expect(material.uniforms.uHeart!.value).toBeCloseTo(1.4);
    expect(material.uniforms.uWispLights).toBe(lights.uniforms.uWispLights);
    expect(material.fragmentShader).toContain('uWispColours[5]');
    expect(material.fog).toBe(true);
    const camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 16 / 9, 0.2, 2600);
    camera.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
    camera.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
    camera.updateMatrixWorld(true);
    hollow.setView(camera, fixture.treeRoot);
    const heart = material.uniforms.uHeartView!.value as THREE.Vector3;
    expect(heart.toArray().every(Number.isFinite)).toBe(true);
    expect(heart.z).toBeLessThan(-15);
    for (const bad of [Number.NaN, -1, 5]) hollow.update({ opening: bad, heart: bad, warm: 1, time: 0 });
    expect(Number.isFinite(material.uniforms.uOpen!.value)).toBe(true);
  });

  it('disposes its own geometry and material once', () => {
    const own = buildMenuHollow(face, { lights: createWispLighting(0) });
    const geometry = vi.spyOn(own.mesh.geometry, 'dispose');
    const material = vi.spyOn(own.mesh.material as THREE.Material, 'dispose');
    own.dispose();
    own.dispose();
    expect(geometry).toHaveBeenCalledTimes(1);
    expect(material).toHaveBeenCalledTimes(1);
  });
});
