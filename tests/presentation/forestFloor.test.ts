import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildForestFernGeometry, buildForestFloor, buildForestLitterGeometry, createForestFloorPopulation, selectForestFloorPopulation } from '../../src/presentation/forestFloor';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { deepwoodCover } from '../../src/world/forest';
import { ARRIVAL_ROUTE, DEEPWOOD, FOREST_RUIN, FOREST_WAYMARKERS, SPAWN } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';
import type { FrameContext } from '../../src/presentation/context';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';
import { disposeTreeTextures } from '../../src/presentation/treeTextures';

const terrain = new Terrain();
const exclusions = new Exclusions(terrain);
const population = createForestFloorPopulation(terrain, exclusions);

describe('Deepwood floor', () => {
  it('creates repeatable fern, litter, moss, fallen timber and fungi layers inside the woodland, keeping arrival sand and relics clear', () => {
    expect(createForestFloorPopulation(terrain, exclusions)).toEqual(population);
    expect(population.length).toBeGreaterThan(650);
    expect(new Set(population.map((p) => p.kind))).toEqual(new Set(['fern', 'moss', 'litter', 'log', 'fungi']));
    for (const p of population) {
      expect(deepwoodCover(p.x, p.z)).toBeGreaterThan(0.05);
      expect(p.x).toBeGreaterThan(DEEPWOOD.minX);
      expect(Math.hypot(p.x - SPAWN.x, p.z - SPAWN.z)).toBeGreaterThan(30);
      expect(Math.hypot(p.x - FOREST_RUIN.x, p.z - FOREST_RUIN.z)).toBeGreaterThan(FOREST_RUIN.r);
      for (const marker of FOREST_WAYMARKERS) expect(Math.hypot(p.x - marker.x, p.z - marker.z)).toBeGreaterThan(2.4);
      expect(p.y).toBe(terrain.heightAt(p.x, p.z));
      expect(terrain.carveAt(p.x, p.z)).toBeLessThanOrEqual(0.01);
      expect(distToPolyline(p.x, p.z, ARRIVAL_ROUTE).d).toBeGreaterThan(2.1);
      expect(Number.isFinite(p.nx) && Number.isFinite(p.nz)).toBe(true);
    }
  });

  it('thins only decoration as presets change and retains the same authored positions', () => {
    const low = selectForestFloorPopulation(population, 'low');
    const medium = selectForestFloorPopulation(population, 'medium');
    const high = selectForestFloorPopulation(population, 'high');
    expect(low.length).toBeLessThan(medium.length);
    expect(medium.length).toBeLessThan(high.length);
    expect(low.every((p) => medium.includes(p))).toBe(true);
    expect(medium.every((p) => high.includes(p))).toBe(true);
    expect(high).toEqual(population);
  });

  it('builds finite indexed fern leaflets joined to seven curved midribs, with a grounded root and affordable geometry', () => {
    for (let variant = 0; variant < 3; variant++) {
      const g = buildForestFernGeometry(variant);
      const positions = g.getAttribute('position');
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      expect(g.index!.count / 3).toBe(504);
      expect(g.boundingBox!.min.y).toBeLessThan(0.085);
      expect(g.boundingBox!.max.y).toBeGreaterThan(0.45);
      expect(g.boundingBox!.max.y).toBeLessThan(1);
      // Every frond has nine paired stem vertices followed by fourteen leaflets. Their first vertex lies directly
      // on the same analytic midrib interpolation represented by the enclosing stem segment.
      const stride = 18 + 14 * 5;
      for (let frond = 0; frond < 7; frond++) {
        const base = frond * stride;
        for (let leaflet = 0; leaflet < 14; leaflet++) {
          const rootIndex = base + 18 + leaflet * 5;
          const stemIndex = base + (1 + Math.floor(leaflet / 2)) * 2;
          for (const axis of [0, 1, 2]) {
            const root = positions.array[rootIndex * 3 + axis]!;
            const stem = (positions.array[stemIndex * 3 + axis]! + positions.array[(stemIndex + 1) * 3 + axis]!) * 0.5;
            expect(root).toBeCloseTo(stem, 5);
          }
        }
      }
      g.dispose();
    }
    const litter = buildForestLitterGeometry(0);
    expect(litter.index!.count / 3).toBe(52);
    expect(litter.boundingBox!.max.y).toBeLessThan(0.06);
    litter.dispose();
  });

  it('culls floor instances with the camera, keeps geometry static and releases all owned buffers once', () => {
    const floor = buildForestFloor(terrain, exclusions, 'medium');
    const meshes = floor.group.children as THREE.InstancedMesh[];
    expect(meshes.length).toBeGreaterThan(5);
    const geometryDisposals = meshes.map((m) => vi.spyOn(m.geometry, 'dispose'));
    const bufferDisposals = meshes.map((m) => vi.spyOn(m, 'dispose'));
    const materials = new Set(meshes.map((m) => m.material as THREE.MeshStandardMaterial));
    const materialDisposals = [...materials].map((m) => vi.spyOn(m, 'dispose'));
    const logMaterial = [...materials].find((m) => m.map)!;
    const barkDisposal = vi.spyOn(logMaterial.map!, 'dispose');
    const normalDisposal = vi.spyOn(logMaterial.normalMap!, 'dispose');
    const snapshots = meshes.map((m) => Array.from(m.geometry.getAttribute('position').array));
    const camera = new THREE.PerspectiveCamera(65, 1.6, 0.1, 150);
    camera.position.set(-182, terrain.heightAt(-182, 10) + 3, 10);
    camera.lookAt(-170, camera.position.y, 0);
    camera.updateMatrixWorld();
    const frame: FrameContext = { camera, time: 0, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(0.4, 1, 0.6).normalize(), reducedMotion: false, hour: 9, view: worldView(createInitialState()), quality: 'medium' };
    floor.update(1, frame);
    expect(floor.stats!().forestFloorDrawn).toBeGreaterThan(10);
    floor.update(1, frame);
    meshes.forEach((m, i) => expect(Array.from(m.geometry.getAttribute('position').array)).toEqual(snapshots[i]));
    camera.position.set(180, 10, 150);
    camera.lookAt(190, 10, 155);
    camera.updateMatrixWorld();
    floor.update(1, frame);
    expect(floor.stats!().forestFloorDrawn).toBe(0);
    floor.dispose!();
    floor.dispose!();
    geometryDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    bufferDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    materialDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    expect(barkDisposal).not.toHaveBeenCalled();
    expect(normalDisposal).not.toHaveBeenCalled();
    disposeTreeTextures();
    expect(barkDisposal).toHaveBeenCalledTimes(1);
    expect(normalDisposal).toHaveBeenCalledTimes(1);
    expect(floor.group.children).toHaveLength(0);
  });
});
