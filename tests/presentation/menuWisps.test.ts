import * as THREE from 'three';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { MENU_CAMERA } from '../../src/presentation/menu/menuLayout';
import { GROVE_MAX_SPIRITS, createMenuGrove, groveSpiritBand, type MenuGrove } from '../../src/presentation/menu/menuGrove';
import { WISP_COLOURS, WISP_COUNTS, buildMenuWisps, type MenuWisps } from '../../src/presentation/menu/menuWisps';
import { sampleMenuRhythm } from '../../src/presentation/menu/menuScoreRhythm';
import { menuGroveFixture } from './groveFixture';

const fixture = menuGroveFixture();
afterAll(() => fixture.dispose());
const built: MenuWisps[] = [];
afterEach(() => { for (const w of built.splice(0)) w.dispose(); });

const camera = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 16 / 9, 0.2, 2600);
camera.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
camera.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
camera.updateMatrixWorld(true);

const tree = { x: fixture.treeRoot.position.x, y: fixture.treeRoot.position.y, z: fixture.treeRoot.position.z, yaw: fixture.treeRoot.rotation.y };
function wisps(quality: 'low' | 'medium' | 'high' = 'high') {
  const w = buildMenuWisps({ tree, quality });
  built.push(w);
  return w;
}
let shared: MenuGrove | null = null;
const grove = () => (shared ??= createMenuGrove(fixture.world, GROVE_MAX_SPIRITS));
const layer = (w: MenuWisps, name: string) => w.group.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
const flames = (w: MenuWisps) => layer(w, 'Menu_Wisp_Flames').geometry.getAttribute('aColour') as THREE.InstancedBufferAttribute;
const centres = (w: MenuWisps) => layer(w, 'Menu_Wisp_Flames').geometry.getAttribute('aCentre') as THREE.InstancedBufferAttribute;

describe('the hermitage spirits as lights', () => {
  it('draws three texture-free additive layers on every preset, depth-tested and never writing depth', () => {
    for (const quality of ['low', 'medium', 'high'] as const) {
      const w = wisps(quality);
      const count = WISP_COUNTS[quality];
      expect(w.group.visible).toBe(false);
      expect(w.stats.wisps).toBe(count);
      expect(w.stats.meshes).toBe(3);
      const flamesMesh = layer(w, 'Menu_Wisp_Flames');
      expect((flamesMesh.geometry as THREE.InstancedBufferGeometry).isInstancedBufferGeometry).toBe(true);
      expect((flamesMesh.geometry as THREE.InstancedBufferGeometry).instanceCount).toBe(count);
      expect(w.group.getObjectByName('Menu_Wisp_Sparks')).toBeInstanceOf(THREE.Points);
      for (const name of ['Menu_Wisp_Flames', 'Menu_Wisp_Trails', 'Menu_Wisp_Sparks']) {
        const m = layer(w, name).material;
        expect(m.depthTest).toBe(true);
        expect(m.depthWrite).toBe(false);
        expect(m.blending).toBe(THREE.AdditiveBlending);
        expect(m.fragmentShader).not.toContain('sampler2D');
        if (m.side === THREE.DoubleSide) expect(m.forceSinglePass).toBe(true);
      }
      expect(w.stats.triangles).toBeLessThan(1800);
      grove().advanceTo(85);
      w.update(grove(), 0.352, camera);
      expect(w.group.visible).toBe(true);
      for (const name of ['Menu_Wisp_Flames', 'Menu_Wisp_Trails', 'Menu_Wisp_Sparks']) {
        for (const value of Object.values(layer(w, name).geometry.attributes)) expect(Array.from(value.array).every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('shows the spirits only while the score plays, the hollow is awake and its door open', () => {
    const w = wisps();
    const g = grove();
    g.advanceTo(29);
    w.update(g, 0.352, camera);
    expect(w.group.visible).toBe(false);
    g.advanceTo(31);
    w.update(g, 0.352, camera);
    expect(w.group.visible).toBe(true);
    w.update(g, 0, camera);
    expect(w.group.visible).toBe(false);
    for (const c of w.lights.uniforms.uWispColours.value) expect(c.lengthSq()).toBe(0);
    g.advanceTo(213.9);
    w.update(g, 0.352, camera);
    expect(w.group.visible).toBe(false);
  });

  it('colours each spirit by its band and brightens it with that band and the accents', () => {
    const w = wisps('low');
    const g = grove();
    g.advanceTo(90);
    w.update(g, 0.352, camera);
    const colours = new Set<string>();
    for (let i = 0; i < 16; i++) {
      const c = WISP_COLOURS[groveSpiritBand(i)]!;
      expect([flames(w).getX(i), flames(w).getY(i), flames(w).getZ(i)]).toEqual(c.map((v) => Math.fround(v)));
      colours.add(c.join());
    }
    expect(colours.size).toBe(6);
    // Brightness follows the measured level of the band each spirit hears.
    let loud = 0;
    let quiet = 0;
    for (let t = 60; t < 200; t += 0.53) {
      g.advanceTo(t);
      w.update(g, 0.352, camera);
      const s = sampleMenuRhythm(t);
      for (let i = 0; i < 16; i++) {
        if (!g.inHollow(g.position[i * 3]!, g.position[i * 3 + 1]!, g.position[i * 3 + 2]!) && s.accent < 0.05 && g.bump[i]! < 0.05) {
          const level = s.bands[groveSpiritBand(i)]!;
          if (level > 0.85) loud = Math.max(loud, flames(w).getW(i));
          if (level < 0.45) quiet = Math.max(quiet, flames(w).getW(i));
        }
      }
    }
    expect(loud).toBeGreaterThan(quiet * 1.3);
  });

  it('dims spirits still inside the hollow, and lights the wood only with spirits outside the bark', () => {
    const w = wisps('medium');
    const g = grove();
    g.advanceTo(32.5);
    w.update(g, 0.352, camera);
    expect(w.lights.count).toBe(5);
    for (let i = 0; i < 28; i++) expect(g.outside[i]).toBe(0);
    for (const c of w.lights.uniforms.uWispColours.value) expect(c.w).toBe(0);
    const insideBrightness = Math.max(...Array.from({ length: 28 }, (_, i) => flames(w).getW(i)));
    g.advanceTo(75);
    w.update(g, 0.352, camera);
    const outsideBrightness = Math.max(...Array.from({ length: 28 }, (_, i) => flames(w).getW(i)));
    expect(outsideBrightness).toBeGreaterThan(insideBrightness * 1.5);
    let lit = 0;
    for (let k = 0; k < w.lights.count; k++) {
      const l = w.lights.uniforms.uWispLights.value[k]!;
      const c = w.lights.uniforms.uWispColours.value[k]!;
      expect([l.x, l.y, l.z, l.w, c.x, c.y, c.z, c.w].every(Number.isFinite)).toBe(true);
      if (c.w === 1 && c.x + c.y + c.z > 0) lit++;
      // View space: in front of the camera.
      expect(l.z).toBeLessThan(0);
    }
    expect(lit).toBeGreaterThan(0);
  });

  it('draws the same first spirits on every preset, since they share one simulation', () => {
    const low = wisps('low');
    const high = wisps('high');
    const g = grove();
    for (const t of [44, 77.7, 133]) {
      g.advanceTo(t);
      low.update(g, 0.352, camera);
      high.update(g, 0.352, camera);
      expect(Array.from(centres(low).array)).toEqual(Array.from(centres(high).array).slice(0, 16 * 4));
    }
  });

  it('disposes its own geometry and materials once', () => {
    const w = wisps();
    const geometry = w.group.children.map((o) => vi.spyOn((o as THREE.Mesh).geometry, 'dispose'));
    const material = w.group.children.map((o) => vi.spyOn((o as THREE.Mesh).material as THREE.Material, 'dispose'));
    w.dispose();
    w.dispose();
    w.update(grove(), 1, camera);
    expect(w.group.visible).toBe(false);
    expect(w.group.children).toHaveLength(0);
    for (const spy of [...geometry, ...material]) expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('the dance as seen from the menu', () => {
  it('keeps spirits in view beside the tree, clear of the title and choices, through the whole dance', () => {
    const bark = new THREE.Mesh(fixture.tree.wood, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    fixture.treeRoot.add(bark);
    fixture.treeRoot.updateMatrixWorld(true);
    try {
      const narrow = new THREE.PerspectiveCamera(MENU_CAMERA.fov, 1006 / 672, 0.2, 2600);
      narrow.position.set(MENU_CAMERA.x, MENU_CAMERA.y, MENU_CAMERA.z);
      narrow.lookAt(MENU_CAMERA.lookX, MENU_CAMERA.lookY, MENU_CAMERA.lookZ);
      narrow.updateMatrixWorld(true);
      const ray = new THREE.Raycaster();
      const p = new THREE.Vector3();
      const s = new THREE.Vector3();
      const g = grove();
      for (let t = 40; t < 202; t += 3.19) {
        g.advanceTo(t);
        const seen = { low: 0, medium: 0, high: 0 };
        for (let i = 0; i < g.count; i++) {
          p.set(g.position[i * 3]!, g.position[i * 3 + 1]!, g.position[i * 3 + 2]!);
          fixture.treeRoot.localToWorld(p);
          s.copy(p).project(narrow);
          // Clear of the title, the leather choice column and the left screen edge.
          if (s.x < -0.94 || s.x > -0.34 || s.y < -0.72 || s.y > 0.46) continue;
          ray.ray.origin.copy(narrow.position);
          ray.ray.direction.copy(p).sub(narrow.position).normalize();
          ray.far = narrow.position.distanceTo(p) - 0.2;
          if (ray.intersectObject(bark, false).length > 0) continue;
          if (i < 16) seen.low++;
          if (i < 28) seen.medium++;
          seen.high++;
        }
        expect(seen.high, `high at ${t.toFixed(2)} s`).toBeGreaterThanOrEqual(10);
        expect(seen.medium, `medium at ${t.toFixed(2)} s`).toBeGreaterThanOrEqual(6);
        expect(seen.low, `low at ${t.toFixed(2)} s`).toBeGreaterThanOrEqual(3);
      }
    } finally {
      fixture.treeRoot.remove(bark);
      (bark.material as THREE.Material).dispose();
    }
  });
});
