import * as THREE from 'three';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ANIMALS, buildAnimals, validateAnimalTemplate } from '../../src/presentation/animals';
import { requiredAnimalClips } from '../../src/presentation/animals/catalog';
import { animalGroundAllowed, animalHabitatAllowed, animalNavigationColliders, animalPointAllowed, animalRouteDistance } from '../../src/presentation/animals/navigation';
import { createFloraPopulation, registerFloraColliders, type FloraTree } from '../../src/presentation/floraPopulation';
import { createScatterPopulation, registerScatterColliders } from '../../src/presentation/scatterPopulation';
import { createMeshyForest, type MeshyForest } from '../../src/presentation/meshyTrees';
import { createPineForest, type PineForest } from '../../src/presentation/solitaryPine';
import { groundedTreeY, treeWoodCollisionRadius } from '../../src/presentation/treeGrounding';
import { Exclusions } from '../../src/presentation/vegetation';
import { forestLandmarkGeometry } from '../../src/presentation/forestLandmarks';
import type { FrameContext } from '../../src/presentation/context';
import { Terrain } from '../../src/world/terrain';
import { buildStaticColliders, type Colliders } from '../../src/world/colliders';
import { NavGrid } from '../../src/world/nav';
import { ANCHORS, SPAWN } from '../../src/world/layout';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';
import { animalBinary, animalTemplates } from './animalFixture';
import { pineTemplates } from './pineFixture';
import { meshyTreeTemplates } from './meshyTreeFixture';

let pine: PineForest, meshy: MeshyForest, terrain: Terrain, colliders: Colliders, templates: ReadonlyMap<string, GLTF>;
beforeAll(async () => {
  const [conifers, broadleaves, animals] = await Promise.all([pineTemplates(), meshyTreeTemplates(), animalTemplates()]);
  templates = animals; pine = createPineForest(conifers); meshy = createMeshyForest(broadleaves); terrain = new Terrain(); colliders = buildStaticColliders(terrain);
  forestLandmarkGeometry(terrain, colliders);
  const exclusions = new Exclusions(terrain);
  const variant = (tree: Pick<FloraTree, 'sp' | 'v' | 'assetId'>) => tree.sp === 'pine' ? pine.variant('pine', tree.v + 1) : meshy.variant(tree.sp, tree.v, tree.assetId);
  const population = createFloraPopulation(terrain, exclusions,
    (tree, fallback) => tree.sp === 'pine' ? pine.collisionRadius('pine', tree.v + 1, tree.s, terrain.heightAt(tree.x, tree.z) - tree.y)
      : fallback > 0 ? treeWoodCollisionRadius(variant(tree), tree.s, terrain.heightAt(tree.x, tree.z) - tree.y) : fallback,
    tree => groundedTreeY(terrain, tree, variant(tree)), undefined, tree => variant(tree).crownRadius * tree.s);
  registerFloraColliders(population, colliders);
  const rocks = createScatterPopulation(terrain, exclusions, population); registerScatterColliders(rocks, colliders);
  terrain.registerRockSurfaces(rocks.flatMap(rock => rock.contact ? [rock.contact] : []));
}, 30_000);
afterAll(() => { pine?.dispose(); meshy?.dispose(); });

describe('all nineteen delivered animals in the canonical living world', () => {
  it('ships distinct original skins, embedded textures, measured gaits and working bone animation for every source', () => {
    const topology = new Set<string>();
    for (const definition of ANIMALS) {
      const template = templates.get(definition.id)!, model = validateAnimalTemplate(template, definition), { bytes, json } = animalBinary(definition);
      expect(bytes.readUInt32LE(8)).toBe(bytes.length); expect(model.triangles, definition.id).toBeGreaterThan(1000); expect(model.triangles).toBeLessThanOrEqual(50_000);
      expect(json.images?.length, definition.id).toBeGreaterThan(0); expect(json.images.every((image: { bufferView?: number }) => image.bufferView !== undefined)).toBe(true);
      let skin: THREE.SkinnedMesh | undefined; template.scene.traverse(object => { if ((object as THREE.SkinnedMesh).isSkinnedMesh) skin = object as THREE.SkinnedMesh; });
      expect(skin, definition.id).toBeTruthy(); expect(skin!.skeleton.bones).toHaveLength(29);
      for (const paw of ['frontPawL', 'frontPawR', 'hindPawL', 'hindPawR']) expect(skin!.skeleton.bones.some(bone => bone.name === paw), definition.id).toBe(true);
      const positions = skin!.geometry.getAttribute('position');
      topology.add(`${positions.count}:${model.triangles}:${positions.getX(0)}:${positions.getY(0)}:${positions.getZ(0)}`);
      const samples = Array.from({ length: Math.min(60, positions.count) }, (_, index) => Math.floor(index * positions.count / 60));
      const point = new THREE.Vector3(), before: THREE.Vector3[] = [];
      for (const name of requiredAnimalClips(definition)) {
        const clip = template.animations.find(candidate => candidate.name === name)!;
        const mixer = new THREE.AnimationMixer(template.scene), action = mixer.clipAction(clip).play();
        mixer.setTime(0); template.scene.updateMatrixWorld(true); skin!.skeleton.update();
        before.length = 0; samples.forEach(index => before.push(skin!.getVertexPosition(index, new THREE.Vector3())));
        mixer.setTime(clip.duration * 0.31); template.scene.updateMatrixWorld(true); skin!.skeleton.update();
        const motion = samples.reduce((sum, index, sample) => sum + skin!.getVertexPosition(index, point).distanceTo(before[sample]!), 0);
        expect(motion, `${definition.id}:${name}`).toBeGreaterThan(0.0001);
        action.stop(); mixer.uncacheRoot(template.scene);
      }
    }
    expect(topology.size).toBe(19);
  });

  it('fits every actual body among imported trees and physical stones, without closing the player routes', () => {
    const canonicalCount = colliders.all.length, module = buildAnimals({ terrain, colliders, quality: 'low' }, templates, ANIMALS, () => {});
    const heights = new Map(ANIMALS.map(definition => [definition.id,
      validateAnimalTemplate(templates.get(definition.id)!, definition).bounds.getSize(new THREE.Vector3()).y]));
    try {
      const sites = module.snapshot(), animalColliders = animalNavigationColliders(colliders);
      expect(sites).toHaveLength(19); expect(colliders.all).toHaveLength(canonicalCount);
      for (const site of sites) {
        const definition = ANIMALS.find(animal => animal.id === site.id)!;
        expect(animalPointAllowed(definition, site, site.radius, terrain, animalColliders, [], heights.get(site.id)!), site.id).toBe(true);
        expect(animalRouteDistance(site), site.id).toBeLessThan(definition.habitat === 'rocky-woodland' ? 65 : 30);
      }
      const nav = new NavGrid(terrain, colliders);
      for (const goal of [ANCHORS.village_square!, ANCHORS.lantern_door!, ANCHORS.quarry_yard!, ANCHORS.ford_camp!]) expect(nav.findPath(SPAWN, goal)).not.toBeNull();
      const input: FrameContext = { camera: new THREE.PerspectiveCamera(), focus: new THREE.Vector3(-180, 0, 15), time: 0,
        sunDir: new THREE.Vector3(0, 1, 0), nightness: 0, reducedMotion: false, hour: 12, view: worldView(createInitialState()), quality: 'low' };
      const route = [new THREE.Vector3(-218, 0, 21), new THREE.Vector3(-180, 0, 15), new THREE.Vector3(-145, 0, 29), new THREE.Vector3(-83, 0, 30), new THREE.Vector3(110, 0, 35)];
      for (let step = 0; step < 1500; step++) {
        input.focus.copy(route[Math.floor(step / 300)]!); input.focus.y = terrain.heightAt(input.focus.x, input.focus.z); input.time += 0.1;
        module.update(0.1, input);
        if (step % 50) continue;
        for (const animal of module.snapshot()) {
          const definition = ANIMALS.find(candidate => candidate.id === animal.id)!;
          expect(animalHabitatAllowed(definition, animal), `${animal.id}:${step}`).toBe(true);
          expect(animalGroundAllowed(terrain, animal, animal.radius), `${animal.id}:${step}`).toBe(true);
          expect(animalColliders.blocked(animal.x, animal.z, animal.radius, { minY: animal.y + 0.03, maxY: animal.y + heights.get(animal.id)! }), `${animal.id}:${step}`).toBe(false);
          expect(animal.visible, `${animal.id}:${step}`).toBe(true);
        }
      }
      // Looking from the far side of the map never removes an animal or its shadow at a distance threshold.
      input.focus.set(180, 0, -130); input.quality = 'high'; module.update(0.1, input);
      expect(module.snapshot().every(animal => animal.visible)).toBe(true);
      module.group.traverse(object => { if ((object as THREE.Mesh).isMesh) expect((object as THREE.Mesh).castShadow).toBe(true); });
    } finally { module.dispose?.(); }
  }, 30_000);
});
