import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createFloraPopulation, registerFloraColliders, selectFloraPopulation, type FloraTree } from '../../src/presentation/floraPopulation';
import { createForestFloorPopulation } from '../../src/presentation/forestFloor';
import { buildTreeVariant, type Species, type TreeVariant } from '../../src/presentation/treeGen';
import { createPineForest, isPineSpecies, type PineForest } from '../../src/presentation/solitaryPine';
import { groundedTreeY, treeWoodCollisionRadius } from '../../src/presentation/treeGrounding';
import { Exclusions } from '../../src/presentation/vegetation';
import { Colliders, buildStaticColliders } from '../../src/world/colliders';
import { deepwoodCover, FOREST_CLEARINGS, forestClearingCover } from '../../src/world/forest';
import { FOREST_COMPANION_STANDS, FOREST_CROWN_ENVELOPE, FOREST_PALETTE, forestStandAt, type ForestFamily } from '../../src/world/forestStands';
import { DEEPWOOD, SPAWN } from '../../src/world/layout';
import { NavGrid } from '../../src/world/nav';
import { canPlayerStandAt } from '../../src/world/playerPlacement';
import { Terrain } from '../../src/world/terrain';
import { pineTemplates } from './pineFixture';

let terrain: Terrain, exclusions: Exclusions, population: FloraTree[];
let pine: PineForest;
const plantedVariants = new Map<string, TreeVariant>();
const plantedVariant = (tree: Pick<FloraTree, 'sp' | 'v'>) => {
  const key = `${tree.sp}:${tree.v}`;
  let variant = plantedVariants.get(key);
  if (!variant) {
    variant = isPineSpecies(tree.sp) ? pine.variant(tree.sp, tree.v + 1) : buildTreeVariant(tree.sp, tree.v + 1);
    plantedVariants.set(key, variant);
  }
  return variant;
};
const footprintFor = (tree: Readonly<FloraTree>, fallback: number) => isPineSpecies(tree.sp)
  ? pine.collisionRadius(tree.sp, tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
  : fallback > 0 ? treeWoodCollisionRadius(plantedVariant(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : fallback;
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
const regional = (trees: readonly FloraTree[]) => trees.filter(tree => tree.radius > 0 && tree.standId && tree.familyRole
  && tree.x >= DEEPWOOD.minX && tree.x <= DEEPWOOD.maxX && tree.z >= DEEPWOOD.minZ && tree.z <= DEEPWOOD.maxZ);
const fixedSample = (trees: readonly FloraTree[]) => trees.filter(tree => tree.radius > 0
  && tree.x >= -215 && tree.x <= -95 && tree.z >= -75 && tree.z <= 80);

/** Independent plan-view measurements of accepted stems, not the authoring ellipses or leaf
 * discs. PCA supplies the narrow dimension so a long row cannot satisfy the stand-span gate. */
function acceptedStandPlan(trees: readonly FloraTree[]) {
  const centre = trees.reduce((out, tree) => ({ x: out.x + tree.x / trees.length, z: out.z + tree.z / trees.length }), { x: 0, z: 0 });
  let xx = 0, zz = 0, xz = 0;
  for (const tree of trees) {
    xx += (tree.x - centre.x) ** 2; zz += (tree.z - centre.z) ** 2;
    xz += (tree.x - centre.x) * (tree.z - centre.z);
  }
  const yaw = Math.atan2(2 * xz, xx - zz) / 2;
  const narrow = trees.map(tree => -(tree.x - centre.x) * Math.sin(yaw) + (tree.z - centre.z) * Math.cos(yaw));
  const sorted = [...trees].sort((a, b) => a.x - b.x || a.z - b.z);
  const cross = (a: FloraTree, b: FloraTree, c: FloraTree) => (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
  const chain = (points: readonly FloraTree[]) => {
    const edge: FloraTree[] = [];
    for (const point of points) {
      while (edge.length > 1 && cross(edge.at(-2)!, edge.at(-1)!, point) <= 0) edge.pop();
      edge.push(point);
    }
    return edge.slice(0, -1);
  };
  const hull = [...chain(sorted), ...chain(sorted.reverse())];
  const hullArea = Math.abs(hull.reduce((sum, point, i) => {
    const next = hull[(i + 1) % hull.length]!;
    return sum + point.x * next.z - point.z * next.x;
  }, 0)) / 2;
  return {
    hullArea, minorSpan: Math.max(...narrow) - Math.min(...narrow),
    occupied10mCells: new Set(trees.map(tree => `${Math.floor(tree.x / 10)}:${Math.floor(tree.z / 10)}`)).size,
  };
}

beforeAll(async () => {
  pine = createPineForest(await pineTemplates());
  terrain = new Terrain();
  exclusions = new Exclusions(terrain);
  population = createFloraPopulation(terrain, exclusions, footprintFor, tree => groundedTreeY(terrain, tree, plantedVariant(tree)));
});
afterAll(() => {
  for (const variant of plantedVariants.values()) {
    if (isPineSpecies(variant.species)) continue;
    for (const lod of variant.lods) { lod.wood?.dispose(); lod.leaf?.dispose(); }
  }
  pine.dispose();
});

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
  it('retains a pine-led regional mix around the approximate 75/20/5 target after real wood rejection', () => {
    const trees = regional(population);
    expect(trees.length).toBeGreaterThan(100);
    const count = (role: FloraTree['familyRole']) => trees.filter(tree => tree.familyRole === role).length;
    const dominant = count('dominant') / trees.length, secondary = count('secondary') / trees.length, other = count('other') / trees.length;
    // Approximate regional art target, not a per-patch quota. Complete broadleaf wood now
    // competes with the imported pine's footprints; never shrink either tree to force a ratio.
    expect(dominant).toBeGreaterThanOrEqual(FOREST_PALETTE.target.dominant - 0.05);
    expect(dominant).toBeLessThanOrEqual(FOREST_PALETTE.target.dominant + 0.05);
    expect(secondary).toBeGreaterThanOrEqual(FOREST_PALETTE.target.secondary - 0.05);
    expect(secondary).toBeLessThanOrEqual(FOREST_PALETTE.target.secondary + 0.05);
    expect(other).toBeGreaterThanOrEqual(0.02);
    // Integer cohorts permit a fraction of one stem beyond the nominal 8% accent ceiling.
    expect(other).toBeLessThanOrEqual(Math.ceil(trees.length * 0.08) / trees.length);
    expect(dominant + secondary + other).toBeCloseTo(1, 10);
    expect(trees.some(tree => tree.age === 'sapling')).toBe(true);
    for (const tree of trees) {
      expect(tree.sp === 'pine' ? 'dominant' : tree.sp === 'oak' ? 'secondary' : 'other').toBe(tree.familyRole);
    }
  });

  it('retains a continuous pine body and genuinely two-dimensional accepted companion groves', () => {
    const trees = fixedSample(population);
    const pineBody = trees.filter(tree => tree.sp === 'pine');
    const oakGroups = new Map<string, FloraTree[]>();
    // Named-stand shape uses the full authored region. The fixed comparison rectangle clips
    // the eastern grove's northern adults and is a separate statistical context window.
    for (const tree of regional(population).filter(tree => tree.sp === 'oak' && tree.standId)) {
      const group = oakGroups.get(tree.standId!) ?? [];
      group.push(tree); oakGroups.set(tree.standId!, group);
    }
    const span = (group: readonly FloraTree[]) => Math.max(0, ...group.flatMap((a, i) => group.slice(i + 1).map(b => distance(a, b))));
    expect(span(pineBody)).toBeGreaterThan(80);
    for (const stand of FOREST_COMPANION_STANDS) {
      const adults = (oakGroups.get(stand.id) ?? []).filter(tree => tree.age === 'mature' || tree.age === 'veteran');
      // Composition regression controls, not Gothic 3 density quotas or rendered leaf coverage.
      expect(adults.length, stand.id).toBeGreaterThanOrEqual(6);
      const footprint = acceptedStandPlan(adults);
      expect(span(adults), stand.id).toBeGreaterThan(30);
      expect(footprint.minorSpan, stand.id).toBeGreaterThan(13);
      expect(footprint.hullArea, stand.id).toBeGreaterThan(350);
      expect(footprint.occupied10mCells, stand.id).toBeGreaterThanOrEqual(6);
    }
  });

  it('tapers companion suitability without individual tree lotteries or a narrow one-axis field', () => {
    for (const stand of FOREST_COMPANION_STANDS) {
      expect(stand.cores.length).toBeGreaterThan(1);
      for (const core of stand.cores) {
        expect(core.margin).toBeGreaterThanOrEqual(10);
        expect(core.margin).toBeLessThanOrEqual(20);
        expect(Math.min(core.rx, core.rz) * 2).toBeGreaterThanOrEqual(20);
        expect(forestStandAt(core.x, core.z).companionCover).toBeGreaterThan(0.95);
      }
    }
    const samples = Array.from({ length: 90 }, (_, i) => forestStandAt(-235 + i, -12));
    expect(samples.some(sample => sample.companionCover > 0.1 && sample.companionCover < 0.9)).toBe(true);
    expect(samples.every(sample => Number.isFinite(sample.companionCover) && sample.companionCover >= 0 && sample.companionCover <= 1)).toBe(true);
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
