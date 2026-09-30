import * as THREE from 'three';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { buildWater, type WaterSystem } from '../../src/presentation/waterMesh';
import { disposeSceneResources } from '../../src/presentation/disposeScene';
import { SKY } from '../../src/presentation/skyState';
import { FORD, SPRING_POOL, STREAMS } from '../../src/world/layout';
import { distToPolyline, Terrain } from '../../src/world/terrain';

let terrain: Terrain;
const systems: WaterSystem[] = [];
const originalRadius = SPRING_POOL.r;
const targets = { spring: 1, main: 0.75, village: 0, quarry: 0.62 };
const make = () => {
  const water = buildWater(terrain);
  systems.push(water);
  return water;
};

beforeAll(() => { terrain = new Terrain(); });
afterEach(() => {
  SPRING_POOL.r = originalRadius;
  for (const water of systems.splice(0)) {
    const scene = new THREE.Scene(); scene.add(water.group);
    disposeSceneResources(scene, () => water.dispose());
  }
});

/** Actual expanded rest triangles, independently of any GLSL deformation. */
function expectSurface(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const index = geometry.getIndex()!;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const face = new THREE.Vector3();
  const connections = Array.from({ length: position.count }, () => new Set<number>());
  for (let i = 0; i < index.count; i += 3) {
    const ids = [index.getX(i), index.getX(i + 1), index.getX(i + 2)];
    a.fromBufferAttribute(position, ids[0]!); b.fromBufferAttribute(position, ids[1]!); c.fromBufferAttribute(position, ids[2]!);
    face.crossVectors(b.sub(a), c.sub(a));
    expect(face.lengthSq(), `triangle ${i / 3} has genuine surface area`).toBeGreaterThan(1e-10);
    expect(face.y, `triangle ${i / 3} faces above the water`).toBeGreaterThan(0);
    for (const id of ids) {
      expect(new THREE.Vector3().fromBufferAttribute(normal, id).length()).toBeCloseTo(1, 5);
      for (const other of ids) connections[id]!.add(other);
    }
  }
  const visited = new Set([0]);
  const queue = [0];
  for (let i = 0; i < queue.length; i++) {
    for (const next of connections[queue[i]!]!) if (!visited.has(next)) { visited.add(next); queue.push(next); }
  }
  expect(visited.size, 'all surface vertices form one connected mesh').toBe(position.count);
}

describe('carved inland water surfaces', () => {
  it('subdivides across the actual channels with connected upward triangles and sampled floors', () => {
    const water = make();
    let triangles = 0;
    for (const [id, ribbon] of Object.entries(water.ribbons)) {
      const spec = STREAMS.find((stream) => stream.id === (id === 'spring' ? 'main' : id))!;
      const geo = ribbon.mesh.geometry;
      const position = geo.getAttribute('position'), across = geo.getAttribute('aAcross');
      const floor = geo.getAttribute('aFloor'), level = geo.getAttribute('aLevel');
      const centerIds = Array.from({ length: position.count }, (_, i) => i).filter((i) => across.getX(i) === 0);
      expect(centerIds.length).toBeGreaterThan(4);
      expect(new Set(Array.from(across.array)).size).toBe(9);
      expectSurface(geo);
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i);
        expect(distToPolyline(x, z, spec.points).d).toBeLessThan(spec.halfWidth);
        expect(terrain.carveAt(x, z), 'surface stays within the carved channel').toBeGreaterThan(0.02);
        expect(floor.getX(i)).toBeCloseTo(terrain.heightAt(x, z), 4);
      }
      for (const i of centerIds) expect(level.getX(i)).toBeLessThanOrEqual(terrain.carveAt(position.getX(i), position.getZ(i)) * 0.7 + 1e-5);
      triangles += geo.getIndex()!.count / 3;
    }
    expect(triangles).toBeLessThan(5000);
  });

  it('joins spring and managed main at the exact sluice cross-section', () => {
    const water = make();
    const upstream = water.ribbons.spring.mesh.geometry.getAttribute('position');
    const downstream = water.ribbons.main.mesh.geometry.getAttribute('position');
    for (let column = 0; column < 9; column++) {
      const a = new THREE.Vector3().fromBufferAttribute(upstream, upstream.count - 9 + column);
      const b = new THREE.Vector3().fromBufferAttribute(downstream, column);
      expect(a.distanceTo(b)).toBeLessThan(1e-6);
    }
    const split = new THREE.Vector3().fromBufferAttribute(downstream, 4);
    const anchor = STREAMS[0]!.points[3]!;
    expect(split.x).toBe(anchor.x); expect(split.z).toBe(anchor.z);
  });

  it('keeps the shallow ford waterline below its surrounding ground instead of applying main depth 1.6', () => {
    const geometry = make().ribbons.main.mesh.geometry;
    const position = geometry.getAttribute('position'), across = geometry.getAttribute('aAcross'), level = geometry.getAttribute('aLevel');
    let closest = -1, distance = Infinity;
    for (let i = 0; i < position.count; i++) {
      if (across.getX(i) !== 0) continue;
      const d = Math.hypot(position.getX(i) - FORD.x, position.getZ(i) - FORD.z);
      if (d < distance) { closest = i; distance = d; }
    }
    expect(distance).toBeLessThan(0.2);
    const x = position.getX(closest), z = position.getZ(closest);
    const surrounding = terrain.heightAt(x, z) + terrain.carveAt(x, z);
    expect(level.getX(closest)).toBeLessThan(0.3);
    expect(position.getY(closest)).toBeLessThan(surrounding - 0.04);
  });

  it.each([5, 11])('derives the pool geometry and shading radius from authored radius %s', (radius) => {
    SPRING_POOL.r = radius;
    const pool = make().pool;
    const position = pool.geometry.getAttribute('position'), floor = pool.geometry.getAttribute('aFloor');
    let outer = 0;
    for (let i = 0; i < position.count; i++) {
      const x = position.getX(i), z = position.getZ(i);
      outer = Math.max(outer, Math.hypot(x, z));
      expect(floor.getX(i) + pool.position.y).toBeCloseTo(terrain.heightAt(SPRING_POOL.x + x, SPRING_POOL.z + z), 4);
    }
    expect(outer).toBeCloseTo(radius * 0.92, 5);
    expect(pool.material.uniforms.uRadius!.value).toBe(radius * 0.92);
    expect(position.count).toBeGreaterThan(300);
    expectSurface(pool.geometry);
  });

  it('keeps every wetland surface below its actual carved ground crest instead of floating a horizontal disk', () => {
    const water = make(), pool = water.pool;
    const p = pool.geometry.getAttribute('position'), floor = pool.geometry.getAttribute('aFloor');
    const carve = pool.geometry.getAttribute('aCarve'), confluence = pool.geometry.getAttribute('aConfluence');
    let minHeight = Infinity, maxHeight = -Infinity;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + pool.position.x, z = p.getZ(i) + pool.position.z;
      const ground = floor.getX(i) + pool.position.y;
      const restHeight = p.getY(i) + pool.position.y;
      expect(ground).toBeCloseTo(terrain.heightAt(x, z), 4);
      expect(carve.getX(i)).toBeCloseTo(terrain.carveAt(x, z), 4);
      expect(restHeight).toBeGreaterThan(ground);
      expect(restHeight).toBeLessThan(ground + terrain.carveAt(x, z));
      expect(Math.hypot(x - SPRING_POOL.x, z - SPRING_POOL.z)).toBeLessThanOrEqual(SPRING_POOL.r * 0.92 + 1e-6);
      expect(confluence.getX(i)).toBe(1);
      minHeight = Math.min(minHeight, restHeight); maxHeight = Math.max(maxHeight, restHeight);
    }
    expect(maxHeight - minHeight, 'the existing hillside cannot support one horizontal pond').toBeGreaterThan(4);
    expectSurface(pool.geometry);
  });

  it.each([0.34, 0.5])('shares the exact inlet cross-section and hydraulic height at normal spring flow %s', (flow) => {
    const water = make(), pool = water.pool, inlet = water.ribbons.spring;
    water.update(100, 100, { spring: flow, main: 0.32, village: 0.1, quarry: 0.3 }, 1);
    expect(pool.material.uniforms.uInletFlow).toBe(inlet.uniforms.uFlow);
    expect(pool.material.uniforms.uInletFlow!.value).toBe(flow);
    const pp = pool.geometry.getAttribute('position'), pf = pool.geometry.getAttribute('aFloor');
    const ip = inlet.mesh.geometry.getAttribute('position'), inf = inlet.mesh.geometry.getAttribute('aFloor');
    const ic = inlet.mesh.geometry.getAttribute('aConfluence');
    const response = 0.25 + flow * 0.75;
    for (let column = 0; column < 9; column++) {
      expect(ic.getX(column)).toBe(1);
      const x = ip.getX(column), z = ip.getZ(column);
      const poolId = Array.from({ length: pp.count }, (_, i) => i).find((i) => Math.hypot(pp.getX(i) + pool.position.x - x, pp.getZ(i) + pool.position.z - z) < 1e-6);
      expect(poolId, `inlet column ${column} belongs to the pool's own connected mesh`).toBeDefined();
      const floor = pf.getX(poolId!) + pool.position.y;
      const poolRest = pp.getY(poolId!) + pool.position.y;
      expect(poolRest).toBeCloseTo(ip.getY(column), 5);
      const poolHeight = floor + (poolRest - floor) * response;
      const streamHeight = inf.getX(column) + (ip.getY(column) - inf.getX(column)) * response;
      expect(poolHeight).toBeCloseTo(streamHeight, 5);
      expect(poolHeight).toBeGreaterThan(terrain.heightAt(x, z));
      expect(poolHeight).toBeLessThan(terrain.heightAt(x, z) + terrain.carveAt(x, z));
    }
  });

  it('bounds shader-contracted and lowered flow surfaces for ordinary frustum culling', () => {
    for (const ribbon of Object.values(make().ribbons)) {
      const g = ribbon.mesh.geometry, p = g.getAttribute('position'), bed = g.getAttribute('aBed'), level = g.getAttribute('aLevel');
      const across = g.getAttribute('aAcross'), half = g.getAttribute('aHalf'), perp = g.getAttribute('aPerp');
      for (let i = 0; i < p.count; i++) {
        const offset = across.getX(i) * half.getX(i) * (0.18 - 1);
        const low = new THREE.Vector3(p.getX(i) + perp.getX(i) * offset, bed.getX(i) + level.getX(i) * 0.25 - 0.02, p.getZ(i) + perp.getY(i) * offset);
        expect(g.boundingBox!.containsPoint(low)).toBe(true);
        expect(g.boundingSphere!.containsPoint(low)).toBe(true);
      }
    }
  });
});

describe('water flow and cosmetic ownership', () => {
  it('preserves exponential quest-flow easing independently of frame subdivision', () => {
    const whole = make(), steps = make();
    whole.update(1, 99, targets, 1);
    for (let i = 0; i < 100; i++) steps.update(0.01, i * 0.01, targets, 1);
    const initial = { spring: 0.3, main: 0.3, village: 0.1, quarry: 0.3 };
    for (const key of Object.keys(initial) as (keyof typeof initial)[]) {
      expect(whole.ribbons[key].uniforms.uFlow.value).toBeCloseTo(targets[key] + (initial[key] - targets[key]) * Math.exp(-0.6), 12);
      expect(steps.ribbons[key].uniforms.uFlow.value).toBeCloseTo(whole.ribbons[key].uniforms.uFlow.value, 12);
    }
  });

  it('keeps the exact dry threshold and leaves the spring pool present when channels dry', () => {
    const water = make();
    water.update(100, 100, { spring: 0.025, main: 0.025, village: 0.025, quarry: 0.025 }, 1);
    for (const ribbon of Object.values(water.ribbons)) expect(ribbon.mesh.visible).toBe(true);
    water.update(100, 200, { spring: 0, main: 0, village: 0, quarry: 0 }, 1);
    for (const ribbon of Object.values(water.ribbons)) {
      expect(ribbon.uniforms.uFlow.value).toBeLessThan(0.025);
      expect(ribbon.mesh.visible).toBe(false);
    }
    expect(water.pool.visible).toBe(true); expect(water.poolUniforms.uFlow.value).toBe(0.6);
  });

  it('freezes only cosmetic phase exactly, resumes without world-time jumps, and still eases flow', () => {
    const water = make();
    water.update(0.3, 800, targets, 0.72);
    const before = water.ribbons.main.uniforms.uFlow.value;
    water.update(3, 2000, targets, 0.55, true, true);
    for (const u of [...Object.values(water.ribbons).map((ribbon) => ribbon.uniforms), water.poolUniforms]) {
      expect(u.uTime.value).toBe(0.3); expect(u.uLight.value).toBe(0.55); expect(u.uEffects.value).toBe(0);
    }
    expect(water.ribbons.main.uniforms.uFlow.value).toBeGreaterThan(before);
    water.update(0.2, 9000, targets, 1, false, false);
    expect(water.poolUniforms.uTime.value).toBe(0.5);
    expect(water.poolUniforms.uEffects.value).toBe(1);
    water.update(-1, NaN, targets, 1);
    water.update(NaN, NaN, targets, 1);
    expect(water.poolUniforms.uTime.value).toBe(0.5);
  });

  it('shares live sky state and detaches borrowed capture/reflection textures before graph cleanup', () => {
    const water = make(), scene = new THREE.Scene(); scene.add(water.group);
    const textures = [new THREE.Texture(), new THREE.DepthTexture(2, 2), new THREE.Texture()];
    let borrowedDisposals = 0, geometryDisposals = 0, materialDisposals = 0;
    textures.forEach((texture) => texture.addEventListener('dispose', () => borrowedDisposals++));
    for (const mesh of [...Object.values(water.ribbons).map((ribbon) => ribbon.mesh), water.pool]) {
      const u = mesh.material.uniforms;
      expect(u.uTop).toBe(SKY.top); expect(u.uHorizon).toBe(SKY.horizon); expect(u.uSunI).toBe(SKY.sunI);
      u.tWaterColor!.value = textures[0]; u.tWaterDepth!.value = textures[1]; u.tWaterReflection!.value = textures[2];
      u.uWaterCapture!.value = u.uWaterReflectionReady!.value = 1;
      mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
      mesh.material.addEventListener('dispose', () => materialDisposals++);
    }
    disposeSceneResources(scene, () => water.dispose());
    water.dispose(); water.update(2, 9001, targets, 1);
    expect(borrowedDisposals).toBe(0);
    expect(geometryDisposals).toBe(5); expect(materialDisposals).toBe(5);
    expect(water.pool.material.uniforms.uWaterCapture!.value).toBe(0);
    expect(water.pool.material.uniforms.tWaterReflection!.value).toBeNull();
    textures.forEach((texture) => texture.dispose());
  });
});
