import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { buildForestFernGeometry, buildForestFloor, buildForestLitterGeometry, buildForestShrubGeometry, createForestFloorPopulation, selectForestFloorPopulation, FOREST_FLOOR_DISTANCE } from '../../src/presentation/forestFloor';
import { Terrain } from '../../src/world/terrain';
import { Exclusions } from '../../src/presentation/vegetation';
import { deepwoodCover } from '../../src/world/forest';
import { ARRIVAL_ROUTE, DEEPWOOD, FOREST_RUIN, FOREST_WAYMARKERS, SPAWN } from '../../src/world/layout';
import { distToPolyline } from '../../src/world/terrain';
import type { FrameContext } from '../../src/presentation/context';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';
import { disposeTreeTextures } from '../../src/presentation/treeTextures';
import { createFloraPopulation } from '../../src/presentation/floraPopulation';

const terrain = new Terrain();
const exclusions = new Exclusions(terrain);
const population = createForestFloorPopulation(terrain, exclusions);

describe('Deepwood floor', () => {
  it('follows actual canopy, keeps trunk footings clear, and attaches fungi to accepted fallen timber', () => {
    const trees = createFloraPopulation(terrain, exclusions);
    expect(createForestFloorPopulation(terrain, exclusions, [])).toEqual([]);
    const grounded = createForestFloorPopulation(terrain, exclusions, trees);
    expect(grounded).toEqual(createForestFloorPopulation(terrain, exclusions, trees));
    const logs = grounded.filter((p) => p.kind === 'log');
    const fungi = grounded.filter((p) => p.kind === 'fungi');
    expect(logs.length).toBeGreaterThan(0);
    expect(fungi.length).toBeGreaterThan(0);
    expect(new Set(grounded.map((p) => p.id)).size).toBe(grounded.length);
    for (const fungus of fungi) {
      const log = logs.find((p) => p.id === fungus.parentLogId)!;
      expect(log).toBeDefined();
      expect(fungus.rank).toBe(log.rank);
      expect(fungus.y).toBe(terrain.heightAt(fungus.x, fungus.z));
      const dx = fungus.x - log.x, dz = fungus.z - log.z;
      expect(dx * Math.cos(log.yaw) - dz * Math.sin(log.yaw)).toBeCloseTo(0, 8);
      expect(Math.hypot(dx, dz)).toBeLessThan(1.1);
    }
    const trunks = trees.filter((t) => t.radius > 0);
    let minimumFootingGap = Infinity;
    for (const piece of grounded) for (const tree of trunks) {
      minimumFootingGap = Math.min(minimumFootingGap, Math.hypot(piece.x - tree.x, piece.z - tree.z) - tree.radius);
    }
    expect(minimumFootingGap).toBeGreaterThanOrEqual(0.24);
  });

  it('uses the shared planted crown field rather than unrelated logical trunk shade, including pine needle litter', () => {
    const trees = createFloraPopulation(terrain, exclusions);
    const zero = { coverAt: () => 0, broadleafAt: () => 0 };
    expect(createForestFloorPopulation(terrain, exclusions, trees, zero)).toEqual([]);
    const anchor = population.find(piece => piece.kind === 'fern')!;
    const crown = {
      coverAt: (x: number, z: number) => Math.hypot(x - anchor.x, z - anchor.z) < 24 ? 0.7 : 0,
      broadleafAt: () => 0,
    };
    const floor = createForestFloorPopulation(terrain, exclusions, trees, crown);
    expect(floor.some(piece => piece.kind === 'fern')).toBe(true);
    expect(floor.some(piece => piece.kind === 'shrub')).toBe(true);
    expect(floor.filter(piece => piece.kind === 'litter').every(piece => piece.variant === 2)).toBe(true);
    expect(floor.every(piece => crown.coverAt(piece.x, piece.z) > 0)).toBe(true);
    expect(floor).toEqual(createForestFloorPopulation(terrain, exclusions, trees, crown));
    const needleLitter = buildForestLitterGeometry(2);
    expect(needleLitter.index!.count / 3).toBe(96);
    expect(needleLitter.boundingBox!.max.y).toBeLessThan(0.06);
    needleLitter.dispose();
  });

  it('creates repeatable fern, litter, moss, fallen timber and fungi layers inside the woodland, keeping arrival sand and relics clear', () => {
    expect(createForestFloorPopulation(terrain, exclusions)).toEqual(population);
    // Broad clearings deliberately remove clutter. Actual canopy must supply a woodland floor,
    // while removing that canopy must remove the shade-dependent layer rather than meeting an old count.
    expect(population.some(p => p.kind === 'fern' && deepwoodCover(p.x, p.z) > 0.5)).toBe(true);
    expect(createForestFloorPopulation(terrain, exclusions, [])).toEqual([]);
    expect(new Set(population.map((p) => p.kind))).toEqual(new Set(['fern', 'shrub', 'moss', 'litter', 'log', 'fungi']));
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
    for (const selected of [low, medium, high]) {
      const logs = new Set(selected.filter((p) => p.kind === 'log').map((p) => p.id));
      expect(selected.filter((p) => p.kind === 'fungi').every((p) => !!p.parentLogId && logs.has(p.parentLogId))).toBe(true);
    }
    const fungus = population.find((p) => p.kind === 'fungi')!;
    expect(selectForestFloorPopulation([fungus], 'high')).toEqual([]);
  });

  it('keeps grounded fungi geometry beside fallen logs after both pieces follow their local slopes', () => {
    const floor = buildForestFloor(terrain, exclusions, 'high');
    try {
      const meshes = floor.group.children as THREE.InstancedMesh[];
      const fungusGeometry = meshes.find((m) => m.name === 'forest_floor_fungi:0')!.geometry;
      const up = new THREE.Vector3(0, 1, 0), normal = new THREE.Vector3(), rotation = new THREE.Quaternion(), yaw = new THREE.Quaternion();
      const matrixFor = (piece: (typeof population)[number]) => {
        normal.set(piece.nx, 1, piece.nz).normalize();
        rotation.setFromUnitVectors(up, normal).multiply(yaw.setFromAxisAngle(up, piece.yaw));
        return new THREE.Matrix4().compose(new THREE.Vector3(piece.x, piece.y, piece.z), rotation, new THREE.Vector3().setScalar(piece.scale));
      };
      const point = new THREE.Vector3();
      let minimumCylinderClearance = Infinity;
      for (const fungus of population.filter((p) => p.kind === 'fungi')) {
        const log = population.find((p) => p.id === fungus.parentLogId)!;
        const geometry = meshes.find((m) => m.name === `forest_floor_log:${log.variant}`)!.geometry;
        geometry.computeBoundingBox();
        const intoLog = matrixFor(log).invert().multiply(matrixFor(fungus));
        const vertices = fungusGeometry.getAttribute('position');
        for (let i = 0; i < vertices.count; i++) {
          point.fromBufferAttribute(vertices, i).applyMatrix4(intoLog);
          if (point.x >= geometry.boundingBox!.min.x && point.x <= geometry.boundingBox!.max.x) {
            // A cylinder of the log's maximum radius conservatively encloses its tapered surface.
            minimumCylinderClearance = Math.min(minimumCylinderClearance, Math.hypot(point.y - 0.12, point.z) - 0.22);
          }
        }
      }
      expect(minimumCylinderClearance).toBeGreaterThan(0);
    } finally {
      floor.dispose?.();
      disposeTreeTextures();
    }
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

  it('joins woodland shrub leaves to five complete curved stems with finite normals and a bounded low silhouette', () => {
    for (let variant = 0; variant < 2; variant++) {
      const geometry = buildForestShrubGeometry(variant);
      const positions = geometry.getAttribute('position'), normals = geometry.getAttribute('normal');
      expect(geometry.index!.count / 3).toBeLessThan(400);
      expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      expect(Array.from(normals.array).every(Number.isFinite)).toBe(true);
      expect(geometry.boundingBox!.min.y).toBeLessThan(0.015);
      expect(geometry.boundingBox!.max.y).toBeGreaterThan(0.45);
      expect(geometry.boundingBox!.max.y).toBeLessThan(0.85);
      // Six 4-vertex stem rings followed by eight 5-vertex leaves per branch. Leaves emerge from
      // the centre of the corresponding solid ring; they are not disconnected floating quads.
      const stride = 24 + 8 * 5;
      for (let branch = 0; branch < 5; branch++) for (let node = 1; node <= 4; node++) for (let side = 0; side < 2; side++) {
        const leafRoot = branch * stride + 24 + ((node - 1) * 2 + side) * 5;
        const ring = branch * stride + node * 4;
        for (let axis = 0; axis < 3; axis++) {
          const centre = [0, 1, 2, 3].reduce((sum, i) => sum + positions.array[(ring + i) * 3 + axis]!, 0) / 4;
          expect(positions.array[leafRoot * 3 + axis]).toBeCloseTo(centre, 5);
        }
      }
      geometry.dispose();
    }
  });

  it('culls floor instances with the camera, keeps geometry static and releases all owned buffers once', () => {
    const floor = buildForestFloor(terrain, exclusions, 'medium');
    const meshes = floor.group.children as THREE.InstancedMesh[];
    expect(meshes.length).toBeGreaterThan(5);
    const geometryDisposals = meshes.map((m) => vi.spyOn(m.geometry, 'dispose'));
    const bufferDisposals = meshes.map((m) => vi.spyOn(m, 'dispose'));
    const shadowDisposals = meshes.flatMap((m) => [vi.spyOn(m.customDepthMaterial!, 'dispose'), vi.spyOn(m.customDistanceMaterial!, 'dispose')]);
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
    const uploaded = meshes.map((m) => m.instanceMatrix.version);
    floor.update(1, frame);
    meshes.forEach((m, i) => expect(m.instanceMatrix.version).toBe(uploaded[i]));
    meshes.forEach((m, i) => expect(Array.from(m.geometry.getAttribute('position').array)).toEqual(snapshots[i]));
    camera.lookAt(-200, camera.position.y, 22);
    camera.updateMatrixWorld();
    floor.update(0.01, frame);
    meshes.forEach((m, i) => expect(m.instanceMatrix.version).toBeGreaterThan(uploaded[i]!));
    camera.position.set(180, 10, 150);
    camera.lookAt(190, 10, 155);
    camera.updateMatrixWorld();
    floor.update(1, frame);
    expect(floor.stats!().forestFloorDrawn).toBe(0);
    floor.dispose!();
    floor.dispose!();
    geometryDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    bufferDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    shadowDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    materialDisposals.forEach((spy) => expect(spy).toHaveBeenCalledTimes(1));
    expect(barkDisposal).not.toHaveBeenCalled();
    expect(normalDisposal).not.toHaveBeenCalled();
    disposeTreeTextures();
    expect(barkDisposal).toHaveBeenCalledTimes(1);
    expect(normalDisposal).toHaveBeenCalledTimes(1);
    expect(floor.group.children).toHaveLength(0);
  });

  it('keeps fallen timber at its authored size through the former cutoff and fades continuously on small moving frames', () => {
    const target = population.find((p) => p.kind === 'log')!;
    const floor = buildForestFloor(terrain, exclusions, 'high');
    const mesh = floor.group.getObjectByName(`forest_floor_log:${target.variant}`) as THREE.InstancedMesh;
    const coverage = mesh.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
    const camera = new THREE.PerspectiveCamera(65, 1.6, 0.1, 600);
    const frame: FrameContext = { camera, time: 0, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(0.4, 1, 0.6).normalize(), reducedMotion: false, hour: 9, view: worldView(createInitialState()), quality: 'high' };
    const matrix = new THREE.Matrix4(), point = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Quaternion();
    const sample = (distance: number) => {
      camera.position.set(target.x, target.y + 0.3, target.z + distance);
      camera.lookAt(target.x, target.y + 0.3, target.z);
      camera.updateMatrixWorld();
      floor.update(1 / 240, frame);
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        matrix.decompose(point, rotation, scale);
        if (point.distanceTo(new THREE.Vector3(target.x, target.y, target.z)) < 0.001) {
          expect(scale.x).toBeCloseTo(target.scale, 5);
          expect(scale.y).toBeCloseTo(target.scale, 5);
          expect(scale.z).toBeCloseTo(target.scale, 5);
          return coverage.getY(i);
        }
      }
      return 0;
    };
    const distances = FOREST_FLOOR_DISTANCE.high;
    expect(sample(distances.start)).toBe(1);
    expect(sample(128)).toBeGreaterThan(0.9); // Former hard cutoff is now inside a gradual fade.
    expect(sample((distances.start + distances.end) / 2)).toBeCloseTo(0.5, 5);
    const upload = coverage.version;
    const before = sample(160.001);
    expect(coverage.version).toBeGreaterThan(upload);
    expect(before).toBeLessThan(0.5);
    expect(before).toBeGreaterThan(0.4999);
    expect(sample(distances.end - 0.1)).toBeGreaterThan(0);
    expect(sample(distances.end + 0.1)).toBe(0);
    floor.dispose!();
    disposeTreeTextures();
  });

  it('retains offscreen fern casters only in the sun volume and refreshes slow idle shadow drift within its preload guard', () => {
    const target = population.find((p) => p.kind === 'fern')!;
    const floor = buildForestFloor(terrain, exclusions, 'high');
    const mesh = floor.group.getObjectByName(`forest_floor_fern:${target.variant}`) as THREE.InstancedMesh;
    const camera = new THREE.PerspectiveCamera(65, 1.6, 0.1, 600);
    camera.position.set(target.x, target.y + 0.4, target.z + 10);
    camera.lookAt(target.x, target.y + 0.4, target.z + 30); // The fern is completely behind the view.
    camera.updateMatrixWorld();
    const frame: FrameContext = { camera, time: 0, focus: camera.position.clone(), nightness: 0, sunDir: new THREE.Vector3(0.4, 1, 0.6).normalize(), shadowFrustum: null, reducedMotion: false, hour: 9, view: worldView(createInitialState()), quality: 'high' };
    const matrix = new THREE.Matrix4(), point = new THREE.Vector3();
    const containsTarget = () => {
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix);
        point.setFromMatrixPosition(matrix);
        if (point.distanceTo(new THREE.Vector3(target.x, target.y, target.z)) < 0.001) return true;
      }
      return false;
    };
    floor.update(1 / 240, frame);
    expect(containsTarget()).toBe(false);
    const shadowCamera = new THREE.OrthographicCamera(-3, 3, 3, -3, 0.1, 30);
    const shadowMatrix = new THREE.Matrix4();
    const shadowAt = (x: number) => {
      shadowCamera.position.set(x, target.y + 10, target.z);
      shadowCamera.lookAt(x, target.y, target.z);
      shadowCamera.updateMatrixWorld();
      return new THREE.Frustum().setFromProjectionMatrix(shadowMatrix.multiplyMatrices(shadowCamera.projectionMatrix, shadowCamera.matrixWorldInverse));
    };
    frame.shadowFrustum = shadowAt(target.x);
    floor.update(1 / 240, frame);
    expect(containsTarget()).toBe(true);
    const coverage = mesh.geometry.getAttribute('aDistanceCoverage') as THREE.InstancedBufferAttribute;
    const upload = coverage.version;
    frame.shadowFrustum = shadowAt(target.x + 0.01);
    floor.update(1 / 240, frame);
    expect(coverage.version).toBe(upload);
    floor.update(0.21, frame);
    expect(coverage.version).toBeGreaterThan(upload);
    // A jump beyond the guarded volume refreshes immediately, even if the previous upload was this frame.
    frame.shadowFrustum = shadowAt(target.x + 100);
    floor.update(1 / 240, frame);
    expect(containsTarget()).toBe(false);
    floor.dispose!();
    disposeTreeTextures();
  });
});
