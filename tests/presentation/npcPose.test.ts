import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { describe, expect, it } from 'vitest';
import { idleVariant, poseRig, type Pose, type Rig } from '../../src/presentation/characters';
import { createMeshyNpcRig, type MeshyNpcEntry } from '../../src/presentation/meshynpcs';
import { Frame } from '../../src/presentation/human/frame';
import { BONES, type BoneName } from '../../src/presentation/human/skin';

const parents: Record<BoneName, BoneName | null> = {
  hips: null, torso: 'hips', head: 'torso', armL: 'torso', elbowL: 'armL', armR: 'torso', elbowR: 'armR',
  legL: 'hips', kneeL: 'legL', legR: 'hips', kneeR: 'legR',
};

/** An original, connected metre-scale skeleton with weighted heel/toe triangles; no external textures or renderer. */
function resident() {
  const scene = new THREE.Group(), bones = {} as Record<BoneName, THREE.Bone>;
  const joints = new Frame('man', 1, 1).joints();
  for (const name of BONES) {
    const bone = new THREE.Bone(), parent = parents[name];
    bones[name] = bone; bone.name = name; bone.position.set(...joints[name]);
    if (parent) bone.position.sub(new THREE.Vector3(...joints[parent]));
    (parent ? bones[parent] : scene).add(bone);
  }
  scene.updateMatrixWorld(true);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    .1, -.025, -.06, .16, -.025, -.06, .1, -.025, .16,
    -.1, -.025, -.06, -.16, -.025, -.06, -.1, -.025, .16,
    -.25, .85, 0, -.25, .82, .04, -.28, .85, .04,
  ], 3));
  const jointsAtVertices = [8, 8, 8, 10, 10, 10, 6, 6, 6];
  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(jointsAtVertices.flatMap(joint => [joint, 0, 0, 0]), 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(jointsAtVertices.flatMap(() => [1, 0, 0, 0]), 4));
  geometry.computeVertexNormals();
  const mesh = new THREE.SkinnedMesh(geometry, new THREE.MeshStandardMaterial());
  scene.add(mesh); mesh.bind(new THREE.Skeleton(BONES.map(name => bones[name])));
  const entry: MeshyNpcEntry = { id: 'pose-resident', file: 'pose-resident.glb', triangles: 3, bytes: 20,
    height: 1.8, sha256: '0'.repeat(64), surfaceBake: 'geometry-only-v1' };
  const rig = createMeshyNpcRig({ scene, animations: [] } as unknown as GLTF, entry);
  return { rig, geometry, mesh: rig.body.getObjectByProperty('isSkinnedMesh', true) as THREE.SkinnedMesh };
}

const pose = (extra: Partial<Pose> = {}): Pose => ({ mode: 'idle', speed: 0, time: 0, t: 0, amp: 1, ...extra });
function hold(rig: Rig, p: Pose, seconds = 3, fps = 60) {
  for (let frame = 0; frame < seconds * fps; frame++) poseRig(rig, p, 1 / fps);
}

describe('resident pose continuity and supported posture', () => {
  it('folds the supported lower body as one movement instead of lifting both feet before the pelvis reaches the seat', () => {
    const { rig } = resident();
    hold(rig, pose());
    const standingKnee = rig.cur.kneeL!;
    for (let frame = 0; frame < 60; frame++) {
      poseRig(rig, pose({ mode: 'sit' }), 1 / 60);
      const lowered = rig.cur.lower! / -.48;
      expect(rig.cur.legL! / -1.55).toBeCloseTo(lowered, 7);
      expect(rig.cur.legR! / -1.55).toBeCloseTo(lowered, 7);
      expect((rig.cur.kneeL! - standingKnee) / (1.5 - standingKnee)).toBeCloseTo(lowered, 7);
    }
  });

  it('keeps both thighs, knees and seated hips supported throughout speech, then completely releases the seat', () => {
    const { rig } = resident();
    hold(rig, pose({ mode: 'sit', time: 2 }));
    const seated = [rig.legL.rotation.x, rig.legR.rotation.x, rig.kneeL!.rotation.x, rig.kneeR!.rotation.x, rig.hips.position.y];
    for (let frame = 0; frame < 240; frame++) {
      poseRig(rig, pose({ mode: 'talk', seated: true, time: 2 + frame / 60 }), 1 / 60);
      const actual = [rig.legL.rotation.x, rig.legR.rotation.x, rig.kneeL!.rotation.x, rig.kneeR!.rotation.x, rig.hips.position.y];
      actual.forEach((value, index) => expect(value).toBeCloseTo(seated[index]!, 6));
    }
    hold(rig, pose({ mode: 'idle', time: 6 }));
    expect(Math.abs(rig.legL.rotation.x)).toBeLessThan(.001);
    expect(Math.abs(rig.legR.rotation.x)).toBeLessThan(.001);
    expect(rig.hips.position.y).toBeCloseTo(rig.hipY, 5);
  });

  it('does not fling joints or drop the body during task, conversation, seating and locomotion transitions', () => {
    const { rig, geometry, mesh } = resident();
    const source = Array.from(geometry.getAttribute('position').array);
    rig.root.position.set(7, 2, -4); rig.root.rotation.y = .6;
    hold(rig, pose({ mode: 'work', workGesture: 'provisioning', time: 3 }));
    const modes: Partial<Pose>[] = [
      { mode: 'talk' }, { mode: 'idle', idle: { seed: 1103, clock: 3, force: 'scratch head' } },
      { mode: 'walk', speed: .78 }, { mode: 'sit' }, { mode: 'talk', seated: true }, { mode: 'walk', speed: .78 },
      { mode: 'work', workGesture: 'stonework' }, { mode: 'idle' },
    ];
    let clock = 3;
    for (const next of modes) {
      for (let frame = 0; frame < 120; frame++) {
        const previous = { ...rig.cur }, priorBody = rig.body.position.y;
        clock += 1 / 60;
        poseRig(rig, pose({ ...next, time: clock }), 1 / 60);
        for (const [key, value] of Object.entries(rig.cur)) {
          const rate = key === 'lower' ? .72 : key.startsWith('head') ? 1.5 : 4;
          expect(Math.abs(value - previous[key]!)).toBeLessThanOrEqual(rate / 60 + 1e-10);
        }
        expect(Math.abs(rig.body.position.y - priorBody)).toBeLessThan(.065);
        rig.root.updateMatrixWorld(true); mesh.skeleton.update();
        for (let vertex = 0; vertex < mesh.geometry.getAttribute('position').count; vertex++) {
          const at = mesh.getVertexPosition(vertex, new THREE.Vector3());
          expect(at.toArray().every(Number.isFinite)).toBe(true);
        }
        expect(rig.root.position.toArray()).toEqual([7, 2, -4]);
        expect(rig.root.rotation.y).toBe(.6);
      }
    }
    expect(Array.from(geometry.getAttribute('position').array)).toEqual(source);
    expect(rig.root.userData.meshyNpc.triangles).toBe(3);
  });

  it('performs a brief scratch and returns to rest before selecting another standing gesture', () => {
    let seed = 1;
    while (idleVariant(seed, 1) !== 'scratch head') seed++;
    const { rig } = resident();
    let raisedSeconds = 0, peak = 0;
    for (let frame = 0; frame < 420; frame++) {
      const clock = frame / 60;
      poseRig(rig, pose({ time: clock, idle: { seed, clock } }), 1 / 60);
      if (rig.armR.rotation.x < -1.2) raisedSeconds += 1 / 60;
      peak = Math.min(peak, rig.armR.rotation.x);
    }
    expect(peak).toBeLessThan(-2);
    expect(raisedSeconds).toBeGreaterThan(1);
    expect(raisedSeconds).toBeLessThan(2.5);
    expect(rig.armR.rotation.x).toBeGreaterThan(-.1);
    expect(rig.elbowR!.rotation.x).toBeGreaterThan(-.25);
  });

  it.each(['mending', 'provisioning', 'writing', 'stonework', 'guard'] as const)(
    'reduces %s motion while keeping hands in the same working posture', gesture => {
      const a = resident().rig, b = resident().rig, still = resident().rig;
      let fullSpan = 0, reducedSpan = 0;
      for (let step = 0; step < 20; step++) {
        const time = step * .4;
        hold(a, pose({ mode: 'work', workGesture: gesture, time }), 1);
        hold(b, pose({ mode: 'work', workGesture: gesture, time, amp: .35 }), 1);
        hold(still, pose({ mode: 'work', workGesture: gesture, time, amp: 0 }), 1);
        const key = gesture === 'guard' ? 'headY' : 'armRx';
        fullSpan = Math.max(fullSpan, Math.abs(a.cur[key]! - still.cur[key]!));
        reducedSpan = Math.max(reducedSpan, Math.abs(b.cur[key]! - still.cur[key]!));
        expect(Math.abs(a.armR.rotation.x - b.armR.rotation.x)).toBeLessThan(.25);
      }
      expect(fullSpan).toBeGreaterThan(.025);
      expect(reducedSpan).toBeLessThan(fullSpan * .4);
    },
  );

  it('uses elapsed seconds consistently at 30, 60 and 144 frames per second', () => {
    const values: Record<string, number>[] = [30, 60, 144].map(fps => {
      const { rig } = resident();
      hold(rig, pose({ mode: 'sit', time: 3 }), 3, fps);
      for (let frame = 1; frame <= fps * 3; frame++) {
        poseRig(rig, pose({ mode: 'work', workGesture: 'mending', time: 3 + frame / fps }), 1 / fps);
      }
      return { ...rig.cur, sole: rig.body.position.y };
    });
    for (const result of values.slice(0, 2)) {
      for (const [key, value] of Object.entries(result)) expect(Math.abs(value - values[2]![key]!)).toBeLessThan(.025);
    }
  });

  it('leaves paused or malformed frame durations inert after the initial sole has been fitted', () => {
    const { rig } = resident();
    hold(rig, pose({ mode: 'work', workGesture: 'mending', time: 1 }));
    const before = { ...rig.cur }, body = rig.body.position.y;
    for (const dt of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      poseRig(rig, pose({ mode: 'talk', time: 50 }), dt);
      expect(rig.cur).toEqual(before);
      expect(rig.body.position.y).toBeCloseTo(body, 8);
    }
  });
});
