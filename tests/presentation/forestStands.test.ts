import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { createForestFloorPopulation } from '../../src/presentation/forestFloor';
import { buildTreeVariant, type Species } from '../../src/presentation/treeGen';
import { createPineForest, isPineSpecies, type PineForest } from '../../src/presentation/solitaryPine';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { deepwoodCover, FOREST_CLEARINGS, forestClearingCover } from '../../src/world/forest';
import { FOREST_CROWN_ENVELOPE, FOREST_PALETTE, forestStandAt, type ForestFamily } from '../../src/world/forestStands';
import { DEEPWOOD, SPAWN } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { canPlayerStandAt } from '../../src/world/playerPlacement';
import { Terrain } from '../../src/world/terrain';
import { pineTemplates } from './pineFixture';

let terrain: Terrain, exclusions: Exclusions, population: FloraTree[];
let pine: PineForest;
const footprintFor = (tree: Readonly<FloraTree>, fallback: number) => isPineSpecies(tree.sp)
  ? pine.collisionRadius(tree.sp, tree.v + 1, tree.s) : fallback;
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const regional = (trees: readonly FloraTree[]) => trees.filter(tree => tree.radius > 0 && tree.standId && tree.familyRole
  && tree.x >= DEEPWOOD.minX && tree.x <= DEEPWOOD.maxX && tree.z >= DEEPWOOD.minZ && tree.z <= DEEPWOOD.maxZ);
const fixedSample = (trees: readonly FloraTree[]) => trees.filter(tree => tree.radius > 0
  && tree.x >= -215 && tree.x <= -95 && tree.z >= -75 && tree.z <= 80);

beforeAll(async () => {
  pine = createPineForest(await pineTemplates());
  terrain = new Terrain();
  exclusions = new Exclusions(terrain);
  population = createFloraPopulation(terrain, exclusions, footprintFor);
});
afterAll(() => pine.dispose());

/** Independent closest-point calculation; this does not call the implementation's conservative bound. */
function ellipseDistance(point: { x: number; z: number }, ellipse: typeof FOREST_CLEARINGS[number]): number {
  const dx = point.x - ellipse.x, dz = point.z - ellipse.z;
  const u = Math.abs(dx * Math.cos(ellipse.yaw) + dz * Math.sin(ellipse.yaw));
  const v = Math.abs(-dx * Math.sin(ellipse.yaw) + dz * Math.cos(ellipse.yaw));
  if ((u / ellipse.rx) ** 2 + (v / ellipse.rz) ** 2 <= 1) return 0;
  const a2 = ellipse.rx ** 2, b2 = ellipse.rz ** 2;
  const norm = (t: number) => (ellipse.rx * u / (t + a2)) ** 2 + (ellipse.rz * v / (t + b2)) ** 2;
  let lo = 0, hi = Math.max(a2, b2);
  while (norm(hi) > 1) hi *= 2;
  for (let step = 0; step < 50; step++) {
    const mid = (lo + hi) * 0.5;
    if (norm(mid) > 1) lo = mid; else hi = mid;
  }
  const t = (lo + hi) * 0.5;
  return Math.hypot(u - a2 * u / (t + a2), v - b2 * v / (t + b2));
}

const measuredRadii = new Map<string, number>();
function allLodRadius(sp: Species, variant: number): number {
  const key = `${sp}:${variant}`, found = measuredRadii.get(key);
  if (found !== undefined) return found;
  const imported = isPineSpecies(sp);
  const model = imported ? pine.variant(sp, variant) : buildTreeVariant(sp, variant);
  let radius = 0;
  for (const lod of model.lods) for (const geometry of [lod.wood, lod.leaf]) {
    if (!geometry) continue;
    const vertices = geometry.getAttribute('position');
    for (let i = 0; i < vertices.count; i++) radius = Math.max(radius, Math.hypot(vertices.getX(i), vertices.getZ(i)));
    if (!imported) geometry.dispose();
  }
  measuredRadii.set(key, radius);
  return radius;
}

describe('regional forest stands and broad clearings', () => {
  it('approaches the regional 75/20/5 target after source wood, crown, age and spacing rejection', () => {
    const trees = regional(population);
    expect(trees.length).toBeGreaterThan(100);
    const count = (role: FloraTree['familyRole']) => trees.filter(tree => tree.familyRole === role).length;
    const dominant = count('dominant') / trees.length, secondary = count('secondary') / trees.length, other = count('other') / trees.length;
    expect(dominant).toBeGreaterThanOrEqual(FOREST_PALETTE.target.dominant - 0.05);
    expect(dominant).toBeLessThanOrEqual(FOREST_PALETTE.target.dominant + 0.05);
    expect(secondary).toBeGreaterThanOrEqual(FOREST_PALETTE.target.secondary - 0.05);
    expect(secondary).toBeLessThanOrEqual(FOREST_PALETTE.target.secondary + 0.05);
    expect(other).toBeGreaterThanOrEqual(0.02);
    expect(other).toBeLessThanOrEqual(0.08);
    expect(dominant + secondary + other).toBeCloseTo(1, 10);
    expect(trees.some(tree => tree.age === 'sapling')).toBe(true);
    for (const tree of trees) {
      expect(tree.sp === 'pine' ? 'dominant' : tree.sp === 'oak' ? 'secondary' : 'other').toBe(tree.familyRole);
    }
  });

  it('improves the fixed-domain 25–60 m comparison and retains large accepted stand spans', () => {
    const trees = fixedSample(population), counts = new Map<string, number>();
    let pairs = 0, matches = 0;
    for (let i = 0; i < trees.length; i++) {
      counts.set(trees[i]!.sp, (counts.get(trees[i]!.sp) ?? 0) + 1);
      for (let j = i + 1; j < trees.length; j++) {
        const d = distance(trees[i]!, trees[j]!);
        if (d < 25 || d > 60) continue;
        pairs++;
        if (trees[i]!.sp === trees[j]!.sp) matches++;
      }
    }
    expect(pairs).toBeGreaterThan(500);
    // PR #12, 87f48cb: the same rectangle has 239 trunks, mixture .3620209730 and pair match .4092453288.
    expect(matches / pairs).toBeGreaterThan(0.4092453288036884 + 0.15);
    // This comparison is partly affected by the regional palette. The independent connected-field
    // and accepted-neighbour checks below establish spatial grouping against the new mixture.
    const pineBody = trees.filter(tree => tree.sp === 'pine');
    const oakGroups = new Map<string, FloraTree[]>();
    for (const tree of trees.filter(tree => tree.sp === 'oak' && tree.standId)) {
      const group = oakGroups.get(tree.standId!) ?? [];
      group.push(tree); oakGroups.set(tree.standId!, group);
    }
    const span = (group: readonly FloraTree[]) => Math.max(0, ...group.flatMap((a, i) => group.slice(i + 1).map(b => distance(a, b))));
    expect(span(pineBody)).toBeGreaterThan(80);
    expect([...oakGroups.values()].some(group => group.length >= 10 && span(group) > 35)).toBe(true);
  });

  it('forms connected landform-sized family fields and groups actual neighbours beyond the new mixture', () => {
    const step = 2, width = Math.ceil((DEEPWOOD.maxX - DEEPWOOD.minX) / step);
    const height = Math.ceil((DEEPWOOD.maxZ - DEEPWOOD.minZ) / step);
    const field = new Map<number, ReturnType<typeof forestStandAt>>();
    const point = (index: number) => ({ x: DEEPWOOD.minX + (index % width) * step, z: DEEPWOOD.minZ + Math.floor(index / width) * step });
    for (let j = 0; j < height; j++) for (let i = 0; i < width; i++) {
      const index = j * width + i, p = point(index);
      if (deepwoodCover(p.x, p.z) > 0.15) field.set(index, forestStandAt(p.x, p.z));
    }
    const visited = new Set<number>(), components: { sp: string; area: number; span: number }[] = [];
    for (const [start, family] of field) {
      if (visited.has(start)) continue;
      const queue = [start]; visited.add(start);
      let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const index = queue[cursor]!, p = point(index), i = index % width, j = Math.floor(index / width);
        minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minZ = Math.min(minZ, p.z); maxZ = Math.max(maxZ, p.z);
        for (const [di, dj] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          if (i + di! < 0 || i + di! >= width || j + dj! < 0 || j + dj! >= height) continue;
          const next = (j + dj!) * width + i + di!, sample = field.get(next);
          if (!sample || visited.has(next) || sample.sp !== family.sp || sample.id !== family.id) continue;
          visited.add(next); queue.push(next);
        }
      }
      components.push({ sp: family.sp, area: queue.length * step ** 2, span: Math.max(maxX - minX, maxZ - minZ) });
    }
    // Field continuity is an authoring proxy; accepted-tree spans and native captures verify the resulting woodland.
    expect(components.some(component => component.sp === 'pine' && component.area > 1200 && component.span > 80)).toBe(true);
    expect(components.filter(component => component.sp === 'oak' && component.area > 600 && component.span > 35).length).toBeGreaterThanOrEqual(2);
    const trees = fixedSample(population), counts = new Map<string, number>();
    let matches = 0;
    for (const tree of trees) {
      counts.set(tree.sp, (counts.get(tree.sp) ?? 0) + 1);
      let nearest: FloraTree | undefined, best = Infinity;
      for (const other of trees) {
        if (tree === other) continue;
        const d = distance(tree, other);
        if (d < best) { nearest = other; best = d; }
      }
      if (nearest?.sp === tree.sp) matches++;
    }
    const mixture = [...counts.values()].reduce((sum, count) => sum + (count / trees.length) ** 2, 0);
    expect(matches / trees.length).toBeGreaterThan(mixture + 0.15);
  });

  it('bounds actual near, middle and far geometry rather than assuming the declared near crown radius', () => {
    for (const sp of ['pine', 'oak', 'fir', 'birch'] satisfies ForestFamily[]) {
      for (let variant = 1; variant <= 3; variant++) {
        expect(allLodRadius(sp, variant), `${sp}:${variant} all-LOD envelope`).toBeLessThanOrEqual(FOREST_CROWN_ENVELOPE[sp]);
      }
    }
  });

  it('keeps every accepted canopy footprint outside the rotated open core on all graphics presets', () => {
    const conflicts: string[] = [];
    for (const tree of population.filter(tree => tree.sp !== 'shrub')) {
      // Yaw preserves this measured horizontal radial envelope; uniform scale expands it exactly.
      const reach = allLodRadius(tree.sp, tree.v + 1) * tree.s;
      for (const clearing of FOREST_CLEARINGS) {
        if (ellipseDistance(tree, clearing) < reach - 1e-6) conflicts.push(`${tree.collisionId ?? tree.sp}/${clearing.id}`);
      }
    }
    expect(conflicts).toEqual([]);
    for (const quality of ['low', 'medium', 'high'] as const) {
      expect(selectFloraPopulation(population, quality).obstacles).toEqual(population.filter(tree => tree.radius > 0));
    }
  });

  it('keeps delivered conifer vertices outside both clearing cores after actual yaw and uniform scale on every LOD', () => {
    const conflicts: string[] = [];
    const checkedLods = new Set<number>();
    let checkedVertices = 0;
    for (const tree of population) {
      if (!isPineSpecies(tree.sp)) continue;
      const model = pine.variant(tree.sp, tree.v + 1);
      const cosine = Math.cos(tree.yaw), sine = Math.sin(tree.yaw);
      for (const clearing of FOREST_CLEARINGS) {
        const cc = Math.cos(clearing.yaw), cs = Math.sin(clearing.yaw);
        for (const [level, lod] of model.lods.entries()) {
          let closest = Infinity;
          for (const geometry of [lod.wood, lod.leaf]) {
            if (!geometry) continue;
            const positions = geometry.getAttribute('position');
            for (let i = 0; i < positions.count; i++) {
              // Match the world instance transform, then project into the independently rotated ellipse.
              const x = tree.x + (positions.getX(i) * cosine + positions.getZ(i) * sine) * tree.s;
              const z = tree.z + (-positions.getX(i) * sine + positions.getZ(i) * cosine) * tree.s;
              const dx = x - clearing.x, dz = z - clearing.z;
              closest = Math.min(closest, ((dx * cc + dz * cs) / clearing.rx) ** 2
                + ((-dx * cs + dz * cc) / clearing.rz) ** 2);
              checkedVertices++;
            }
          }
          if (closest <= 1) conflicts.push(`${tree.collisionId ?? tree.sp}/${clearing.id}/LOD${level}`);
          checkedLods.add(level);
        }
      }
    }
    expect(checkedVertices).toBeGreaterThan(0);
    expect([...checkedLods].sort()).toEqual([0, 1, 2]);
    expect(conflicts).toEqual([]);
    // The independent radial-envelope test above also bounds complete triangle interiors,
    // including edges between these vertices, rather than relying on point samples alone.
  });

  it('opens sizeable cores and grades their shoulders without cutting away the forest habitat', () => {
    expect(FOREST_CLEARINGS.length).toBeGreaterThanOrEqual(2);
    for (const clearing of FOREST_CLEARINGS) {
      expect(Math.PI * clearing.rx * clearing.rz).toBeGreaterThan(500);
      const local = (u: number, v: number) => ({
        x: clearing.x + u * Math.cos(clearing.yaw) - v * Math.sin(clearing.yaw),
        z: clearing.z + u * Math.sin(clearing.yaw) + v * Math.cos(clearing.yaw),
      });
      for (const point of [local(0, 0), local(clearing.rx * 0.7, 0), local(0, clearing.rz * 0.7)]) {
        expect(forestClearingCover(point.x, point.z)).toBe(0);
        expect(deepwoodCover(point.x, point.z)).toBeGreaterThan(0.15);
      }
      const shoulder = local(0, clearing.rz + 7), outside = local(0, clearing.rz + 25);
      expect(forestClearingCover(shoulder.x, shoulder.z)).toBeGreaterThan(0);
      expect(forestClearingCover(shoulder.x, shoulder.z)).toBeLessThan(1);
      expect(forestClearingCover(outside.x, outside.z)).toBeGreaterThan(0.95);
    }
  });

  it('keeps shade understory out of open cores and rejects unsuitable terrain independently of canopy', () => {
    const floor = createForestFloorPopulation(terrain, exclusions, population);
    expect(floor.some(piece => piece.kind === 'fern')).toBe(true);
    const conflicts: string[] = [];
    for (const piece of floor) for (const clearing of FOREST_CLEARINGS) {
      if (ellipseDistance(piece, clearing) < 0.01) conflicts.push(`${piece.id}/${clearing.id}`);
    }
    expect(conflicts).toEqual([]);
    for (const site of [
      { heightAt: () => 0.2, slopeAt: () => 0, carveAt: () => 0 },
      { heightAt: () => 3, slopeAt: () => 0.8, carveAt: () => 0 },
      { heightAt: () => 3, slopeAt: () => 0, carveAt: () => 0.2 },
    ]) expect(createForestFloorPopulation(site, { blocked: () => false }, population)).toEqual([]);
  });

  it('has an irregular visible contour inside the unchanged authoring bounds', () => {
    const west: number[] = [];
    for (let z = -75; z <= 80; z += 10) {
      expect(deepwoodCover(DEEPWOOD.minX - 1, z)).toBe(0);
      expect(deepwoodCover(DEEPWOOD.maxX + 1, z)).toBe(0);
      for (let x = DEEPWOOD.minX; x < DEEPWOOD.maxX; x += 1) {
        const cover = deepwoodCover(x, z);
        expect(Number.isFinite(cover) && cover >= 0 && cover <= 1).toBe(true);
        if (cover >= 0.3) { west.push(x); break; }
      }
    }
    expect(west.length).toBeGreaterThan(8);
    expect(Math.max(...west) - Math.min(...west)).toBeGreaterThan(5);
    for (const point of [{ x: -200, z: -20 }, { x: -170, z: 30 }, { x: -130, z: 65 }]) {
      expect(forestStandAt(point.x, point.z)).toEqual(forestStandAt(point.x, point.z));
    }
  });

  it('recovers a saved player newly inside a trunk to the same safe point across presets', async () => {
    const { App } = await import('../../src/app');
    const target = regional(population)[Math.floor(regional(population).length / 2)]!;
    const recover = (colliders: Colliders, x: number, z: number, feetY?: number) => {
      const world = { terrain, colliders, nav: new NavGrid(terrain, colliders) };
      return Reflect.apply(Reflect.get(App.prototype, 'safePosition'), { world }, [x, z, feetY]) as { x: number; z: number; y: number };
    };
    const recovered = [];
    for (const quality of ['low', 'medium', 'high'] as const) {
      const colliders = buildStaticColliders(terrain);
      registerFloraColliders(selectFloraPopulation(population, quality).obstacles, colliders);
      expect(canPlayerStandAt(terrain, colliders, target.x, target.z, target.y)).toBe(false);
      const point = recover(colliders, target.x, target.z, target.y);
      expect(Object.values(point).every(Number.isFinite)).toBe(true);
      expect(distance(point, target)).toBeGreaterThan(0);
      expect(distance(point, target)).toBeLessThan(30);
      expect(point.y).toBe(terrain.groundAt(point.x, point.z));
      expect(canPlayerStandAt(terrain, colliders, point.x, point.z, point.y)).toBe(true);
      recovered.push(point);
      expect(recover(colliders, SPAWN.x, SPAWN.z, terrain.groundAt(SPAWN.x, SPAWN.z))).toEqual({ x: SPAWN.x, z: SPAWN.z, y: terrain.groundAt(SPAWN.x, SPAWN.z) });
    }
    expect(recovered[0]).toEqual(recovered[1]);
    expect(recovered[1]).toEqual(recovered[2]);
    const sealed = buildStaticColliders(terrain);
    sealed.circle('restore_test_sealed', target.x, target.z, 40);
    expect(recover(sealed, target.x, target.z, target.y)).toEqual({ x: SPAWN.x, z: SPAWN.z, y: terrain.groundAt(SPAWN.x, SPAWN.z) });
  });
});
