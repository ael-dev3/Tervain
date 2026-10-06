import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { CameraRig } from '../../src/presentation/cameraRig';
import { HuntingArrows, type ArrowWater } from '../../src/presentation/huntingArrow';
import { makeBathymetryTextures, oceanVisibilityBounds } from '../../src/presentation/water/ocean';
import { RippleField } from '../../src/presentation/water/ripples';
import { Splashes } from '../../src/presentation/water/splashes';
import { WaterSystem } from '../../src/presentation/water/waterSystem';
import { SEA_LEVEL } from '../../src/world/layout';
import { Colliders } from '../../src/world/colliders';
import { Terrain } from '../../src/world/terrain';
import { BATHY_NX, BATHY_NZ } from '../../src/world/water/bathymetry';
import { FILM } from '../../src/world/water/waterWorld';
import { SEA_MAX_RISE } from '../../src/world/water/waves';

let terrain: Terrain;
let water: WaterSystem;
beforeAll(() => {
  terrain = new Terrain();
  water = new WaterSystem(terrain, 'high');
  // Ease to a full stream so every inland surface is wet.
  water.update(0.1, { spring: 1, main: 1, village: 0.8, quarry: 0.6 }, new THREE.PerspectiveCamera(), new THREE.Vector3(), false, false);
  for (let i = 0; i < 300; i++) water.world.update(0.1, { spring: 1, main: 1, village: 0.8, quarry: 0.6 });
  water.inland.refresh();
});

describe('the sea as drawn', () => {
  it('uploads the solved bed and swell as finite float textures, with every unsolved phase filled', () => {
    const tex = makeBathymetryTextures(water.world.bathymetry);
    try {
      for (const t of [tex.bed, tex.wave]) {
        expect(t.image.width).toBe(BATHY_NX + 1);
        expect(t.image.height).toBe(BATHY_NZ + 1);
        expect(Array.from(t.image.data as Float32Array).every(Number.isFinite)).toBe(true);
        expect(t.magFilter).toBe(THREE.NearestFilter);
      }
    } finally { tex.bed.dispose(); tex.wave.dispose(); }
  });

  it('bounds the sea for the water pass: offshore views see it, a forest view inland does not', () => {
    const boxes = oceanVisibilityBounds(water.world.bathymetry, SEA_MAX_RISE);
    const frustum = (from: THREE.Vector3, to: THREE.Vector3) => {
      const camera = new THREE.PerspectiveCamera(58, 16 / 9, 0.25, 1400);
      camera.position.copy(from); camera.lookAt(to); camera.updateMatrixWorld();
      return new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    };
    const sea = frustum(new THREE.Vector3(-262, 3, 30), new THREE.Vector3(-320, 0, 30));
    expect(boxes.some((b) => sea.intersectsBox(b))).toBe(true);
    const inland = frustum(new THREE.Vector3(-150, 6, 0), new THREE.Vector3(0, 4, 0));
    expect(boxes.some((b) => inland.intersectsBox(b))).toBe(false);
    for (const b of boxes) {
      expect(b.min.y).toBeLessThan(SEA_LEVEL);
      expect(b.max.y).toBeCloseTo(SEA_LEVEL + SEA_MAX_RISE, 6);
    }
  });

  it('covers the foreground above troughs and overhead below crests when the lens crosses mean sea level', () => {
    const x = -340, z = 30;
    let trough = { surface: Infinity, time: 0 }, crest = { surface: -Infinity, time: 0 };
    for (let t = 0; t < 100; t += 0.1) {
      const surface = water.world.sea(x, z, t)!.surface;
      if (surface < trough.surface) trough = { surface, time: t };
      if (surface > crest.surface) crest = { surface, time: t };
    }
    const raycaster = new THREE.Raycaster();
    for (const [wave, above] of [[trough, true], [crest, false]] as const) {
      const camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 1400);
      camera.position.set(x, wave.surface + (above ? 0.28 : -0.3), z);
      camera.lookAt(x, camera.position.y + 0.2, z - 10); camera.updateMatrixWorld();
      expect(camera.position.y < SEA_LEVEL).toBe(above);
      water.ocean.update(camera, wave.time, 1, wave.surface);
      const u = water.ocean.mesh.material.uniforms, range = u.uGridRange!.value as THREE.Vector4;
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(u.uGridPlaneY!.value as number));
      const edgeY = above ? -0.95 : 0.95;
      expect(range.x).toBeLessThan(edgeY);
      expect(range.y).toBeGreaterThan(edgeY);
      for (const edgeX of [-0.95, 0.95]) {
        raycaster.setFromCamera(new THREE.Vector2(edgeX, edgeY), camera);
        const hit = raycaster.ray.intersectPlane(plane, new THREE.Vector3());
        expect(hit).not.toBeNull();
        expect(hit!.distanceTo(camera.position)).toBeLessThan(10);
      }
    }
  });

  it('uses mean sea level as the projection plane when the lens has no local sea sample', () => {
    const camera = new THREE.PerspectiveCamera();
    camera.position.set(-200, 4, 30); camera.lookAt(-340, 0, 30);
    water.ocean.update(camera, 0, 1);
    expect(water.ocean.mesh.material.uniforms.uGridPlaneY!.value).toBe(SEA_LEVEL);
  });

  it('retains triangle coverage across the foreground as displaced waves pass the swimming camera', () => {
    // The shader samples the same physical surface as WaterWorld.sea. Moving its projected x/z by the Gerstner
    // offset instead pulls the near grid boundary into view; the t=4 pose exposed most of the lower-right corner.
    const shader = water.ocean.mesh.material.vertexShader;
    expect(shader).toContain('o = seaOffset(p.xz - o.xz,');
    expect(shader).toContain('vec3 world = vec3(p.x, SEA_LEVEL + o.y, p.z);');
    const geometry = water.ocean.mesh.geometry.clone();
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    const grid = geometry.getAttribute('aGrid'), positions = geometry.getAttribute('position');
    const raycaster = new THREE.Raycaster();
    const near = new THREE.Vector3(), far = new THREE.Vector3(), direction = new THREE.Vector3();
    try {
      for (const [time, above] of [[0, true], [2, true], [4, true], [6, true], [2, false], [4, false]] as const) {
        const rig = new CameraRig();
        rig.setAspect(1422 / 800); rig.pitch = -0.05; rig.wantDist = 4.5;
        const player = water.world.sea(-340, 30, time)!;
        rig.follow(1 / 60, -340, player.surface - 1.25, 30, terrain, new Colliders(), true, 0);
        rig.clearWater((x, z) => water.world.sea(x, z, time)?.surface ?? null, true);
        const camera = rig.camera;
        const surface = water.world.sea(camera.position.x, camera.position.z, time)!.surface;
        if (!above) {
          camera.position.y = surface - 0.3;
          camera.lookAt(-340, camera.position.y + 0.2, 30);
        }
        water.ocean.update(camera, time, 1, surface);
        const u = water.ocean.mesh.material.uniforms;
        const inverse = u.uGridInverse!.value as THREE.Matrix4, range = u.uGridRange!.value as THREE.Vector4;
        const eye = u.uGridCamera!.value as THREE.Vector3, planeY = u.uGridPlaneY!.value as number;
        const distanceLimit = u.uGridFar!.value as number;
        // Evaluate the physical wave surface over the production grid, then raycast its actual triangles. This
        // checks raster coverage after vertical wave displacement, rather than only intersecting the flat plane.
        for (let i = 0; i < grid.count; i++) {
          const x = THREE.MathUtils.lerp(-range.z, range.z, grid.getX(i));
          const y = THREE.MathUtils.lerp(range.x, range.y, grid.getY(i));
          near.set(x, y, -1).applyMatrix4(inverse); far.set(x, y, 1).applyMatrix4(inverse);
          direction.subVectors(far, near).normalize();
          const distance = (planeY - eye.y) / (Math.abs(direction.y) > 1e-5 ? direction.y : -1e-5);
          if (distance > 0 && distance <= distanceLimit) near.copy(eye).addScaledVector(direction, distance);
          else {
            direction.set(direction.x + 1e-5, 0, direction.z).normalize();
            near.copy(eye).addScaledVector(direction, distanceLimit);
          }
          positions.setXYZ(i, near.x, water.world.sea(near.x, near.z, time)?.surface ?? SEA_LEVEL, near.z);
        }
        geometry.computeBoundingSphere(); mesh.updateMatrixWorld();
        for (const x of [-0.95, -0.5, 0, 0.5, 0.95]) for (const y of [0.5, 0.75, 0.95]) {
          raycaster.setFromCamera(new THREE.Vector2(x, above ? -y : y), camera);
          expect(raycaster.intersectObject(mesh).length, `t=${time}, above=${above}, ray=(${x},${above ? -y : y})`).toBeGreaterThan(0);
        }
      }
    } finally { geometry.dispose(); material.dispose(); }
  });
});

describe('inland water as drawn', () => {
  it('never floats a sheet of water above the ground it stands on', () => {
    for (const mesh of water.inland.meshes) {
      if (!mesh.visible) continue;
      const p = mesh.geometry.getAttribute('position'), wet = mesh.geometry.getAttribute('aWet');
      for (let i = 0; i < p.count; i++) {
        if (wet.getX(i) < 0.5) {
          expect(p.getY(i)).toBeLessThan(terrain.heightAt(p.getX(i), p.getZ(i)));
          continue;
        }
        const ground = terrain.heightAt(p.getX(i), p.getZ(i));
        // A wet vertex is under ground (a bank), or over it by no more than the water the model solved there.
        const sample = water.world.sample(p.getX(i), p.getZ(i));
        const allowed = Math.max(FILM, sample ? sample.depth : 0) + 0.6;
        expect(p.getY(i) - ground, `${mesh.name} vertex ${i}`).toBeLessThan(allowed);
      }
    }
  });

  it('lays the spring pool level at the model\'s pool height', () => {
    const pool = water.inland.meshes.find((m) => m.name === 'water-spring-pool')!;
    const p = pool.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i += 37) expect(p.getY(i)).toBeCloseTo(water.world.poolLevel, 6);
  });
});

describe('disturbing the water', () => {
  it('keeps spray in a fixed pool of droplets that falls and fades', () => {
    const spray = new Splashes();
    try {
      spray.emit(0, 0, 0, 40, 3);
      expect(spray.active).toBe(40);
      for (let i = 0; i < 120; i++) spray.update(1 / 30);
      expect(spray.active).toBe(0);
      spray.emit(Number.NaN, 0, 0, 10, 2);
      expect(spray.active).toBe(0);
    } finally { spray.dispose(); }
  });

  it('queues ripple drops and refuses nonsense', () => {
    const field = new RippleField(64, 20);
    try {
      field.drop({ x: 1, z: 1, radius: 0.4, strength: 0.05, foam: 0.3 });
      field.drop({ x: Number.NaN, z: 1, radius: 0.4, strength: 0.05, foam: 0.3 });
      field.drop({ x: 1, z: 1, radius: 0, strength: 0.05, foam: 0.3 });
      expect((field as unknown as { pending: unknown[] }).pending).toHaveLength(1);
      expect(field.ready).toBe(false);
    } finally { field.dispose(); }
  });

  it('turns a body meeting the water into spray, rings and a sound to hear, and hears a fish rise now and then', () => {
    const disturb = vi.spyOn(water, 'disturb');
    water.splash(-300, 0, 30, 0.8);
    water.emit('stroke', -300, 0, 30, 0.4);
    const state = water.soundState(-300, 1, 30, 0.1);
    expect(state.events.map((e) => e.kind)).toEqual(['splash', 'stroke']);
    expect(disturb).toHaveBeenCalledOnce();
    expect(water.soundState(-300, 1, 30, 0.1).events).toHaveLength(0);
    disturb.mockRestore();
  });
});

describe('arrows and water', () => {
  it('splashes once as an arrow breaks the surface, slows it hard, then floats it and lets it drift', () => {
    const arrows = new HuntingArrows();
    const enter = vi.fn();
    const pond: ArrowWater = { sample: () => ({ surface: 0, flowX: 0.5, flowZ: 0 }), enter };
    try {
      arrows.launch(new THREE.Vector3(0, 2, 0), new THREE.Vector3(1, -0.6, 0).normalize(), 30);
      for (let i = 0; i < 90; i++) arrows.update(1 / 60, () => null, undefined, pond);
      expect(enter).toHaveBeenCalledOnce();
      expect(enter.mock.calls[0]![1]).toBeGreaterThan(20);
      expect(arrows.activeCount).toBe(0);
      expect(arrows.floatingCount).toBe(1);
      const floating = arrows.group.children[0]!;
      const x = floating.position.x;
      for (let i = 0; i < 120; i++) arrows.update(1 / 60, () => null, undefined, pond);
      expect(floating.position.y).toBeCloseTo(0, 1);
      expect(floating.position.x).toBeGreaterThan(x + 0.5);
    } finally { arrows.dispose(); }
  });
});
