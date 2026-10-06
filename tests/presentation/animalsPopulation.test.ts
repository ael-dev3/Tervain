import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { AnimalPopulation, animalModelUrl, ANIMAL_BUDGETS } from '../../src/presentation/animals/population';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import type { FrameContext } from '../../src/presentation/context';
import { Terrain } from '../../src/world/terrain';
import { Colliders } from '../../src/world/colliders';
import { createInitialState } from '../../src/game/state';
import { worldView } from '../../src/game/worldView';

function asset() {
  const scene = new THREE.Group(), root = new THREE.Bone(); root.name = 'Root'; scene.add(root);
  const bones = [root];
  for (const name of ['Head', 'Spine', 'Chest', 'Pelvis', 'Neck', 'Tail1', 'Tail2', 'FrontLeftFoot', 'FrontRightFoot', 'BackLeftFoot', 'BackRightFoot']) {
    const bone = new THREE.Bone(); bone.name = name; root.add(bone); bones.push(bone);
  }
  const geometry = new THREE.BoxGeometry(1, 1, 1); geometry.translate(0, .5, 0);
  const count = geometry.attributes.position!.count;
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(new Uint16Array(count * 4), 4));
  const weights = new Float32Array(count * 4); for (let i = 0; i < count; i++) weights[i * 4] = 1;
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(weights, 4));
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  scene.add(mesh); mesh.bind(new THREE.Skeleton(bones));
  const animations = ['Idle', 'Walk', 'Run', 'Call'].map((name) => new THREE.AnimationClip(name, 2, [new THREE.QuaternionKeyframeTrack('Head.quaternion', [0, 1, 2], [0, 0, 0, 1, 0, .2, 0, .9797959, 0, 0, 0, 1])]));
  return { scene, animations };
}

function frame(x: number, z: number): FrameContext {
  const camera = new THREE.PerspectiveCamera(100, 1, .1, 1400);
  camera.position.set(x, 5, z + 10); camera.lookAt(x, 1, z); camera.updateMatrixWorld();
  return { time: 0, camera, focus: new THREE.Vector3(x, 0, z), nightness: 0, sunDir: new THREE.Vector3(0, 1, 0), reducedMotion: false, hour: 11, view: worldView(createInitialState()), quality: 'low' };
}

describe('bounded animal presentation lifecycle', () => {
  it('resolves model URLs under the published repository-relative base', () => {
    expect(animalModelUrl('models/animals/bear-a.glb', './', 'https://example.test/Tervain/index.html').href).toBe('https://example.test/Tervain/models/animals/bear-a.glb');
  });

  it('keeps hunting variants available from the exact hosted build commit when copied model files are omitted', () => {
    const sha = '0123456789abcdef0123456789abcdef01234567', hosted = `https://raw.githubusercontent.com/ael-dev3/Tervain/${sha}/public/models/`;
    for (const definition of ANIMALS.filter((animal) => animal.file)) {
      expect(animalModelUrl(definition.file!, './', 'https://example.test/Tervain/index.html', hosted).href).toBe(`${hosted}animals/${definition.id}.glb`);
    }
    expect(() => animalModelUrl('models/animals/../bear.glb', './', 'https://example.test/Tervain/', hosted)).toThrow(/Invalid model asset path/);
  });

  it('performs no downloads before play and freezes native bones and call queues while paused', async () => {
    const load = vi.fn(async () => asset()), population = new AnimalPopulation(new Terrain(), new Colliders(), 'low', { kind: 'individual', id: 'bear-a', clip: 'Walk' }, load);
    const home = population.inspectionFrame()!, context = frame(home.x, home.z);
    population.update(.1, context);
    expect(load).not.toHaveBeenCalled();
    await population.preloadInspection();
    expect(population.stats().loaded).toBe(1);
    const head = population.group.getObjectByName('Head')!;
    population.setRunning(true); population.update(.1, context);
    const pose = head.quaternion.clone();
    population.setRunning(false);
    for (let i = 0; i < 60; i++) population.update(.1, context);
    expect(head.quaternion.equals(pose)).toBe(true);
    expect(population.stats().active).toBe(0);
    expect(population.drainCalls()).toEqual([]);
    population.dispose(); expect(population.group.children).toHaveLength(0);
  });

  it('caps live resident geometry and animation work even when many habitats are in range', async () => {
    const population = new AnimalPopulation(new Terrain(), new Colliders(), 'low', null, async () => asset());
    const context = frame(-160, -15); population.setRunning(true);
    for (let i = 0; i < 10; i++) {
      population.update(.1, context); await new Promise((resolve) => setTimeout(resolve, 0));
      expect(population.stats().loaded).toBeLessThanOrEqual(ANIMAL_BUDGETS.low.resident);
      expect(population.stats().loading).toBeLessThanOrEqual(2);
      expect(population.stats().active).toBeLessThanOrEqual(ANIMAL_BUDGETS.low.active);
    }
    expect(population.stats().loaded).toBe(6);
    population.dispose(); expect(population.stats().loaded).toBe(0);
  });

  it('disposes a decoded rig that arrives after its world was released', async () => {
    let finish!: (model: ReturnType<typeof asset>) => void;
    const deferred = new Promise<ReturnType<typeof asset>>((resolve) => { finish = resolve; });
    const population = new AnimalPopulation(new Terrain(), new Colliders(), 'low', { kind: 'individual', id: 'bear-a', clip: null }, async () => deferred);
    const loading = population.preloadInspection();
    population.dispose();
    const model = asset(), mesh = model.scene.children.find((child) => (child as THREE.SkinnedMesh).isSkinnedMesh) as THREE.SkinnedMesh;
    const geometryDisposed = vi.fn(), materialDisposed = vi.fn();
    mesh.geometry.addEventListener('dispose', geometryDisposed);
    (mesh.material as THREE.Material).addEventListener('dispose', materialDisposed);
    finish(model); await loading;
    expect(geometryDisposed).toHaveBeenCalledOnce(); expect(materialDisposed).toHaveBeenCalledOnce();
    expect(population.stats().loaded).toBe(0); expect(population.group.children).toHaveLength(0);
  });

  it('does not request an unavailable model or borrow a sibling variant', async () => {
    const load = vi.fn(async () => asset());
    const population = new AnimalPopulation(new Terrain(), new Colliders(), 'low', { kind: 'individual', id: 'boar-c', clip: null }, load);
    await population.preloadInspection(); population.setRunning(true); population.update(.1, frame(-205, 75));
    expect(load).not.toHaveBeenCalled();
    expect(population.diagnostics.find((animal) => animal.id === 'boar-c')!.status).toBe('source missing');
    expect(population.stats().catalog).toBe(ANIMALS.length); expect(population.stats().unavailable).toBe(1);
    population.dispose();
  });
});
