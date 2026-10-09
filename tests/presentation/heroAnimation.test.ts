import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { setArmed, setSash, type Mode } from '../../src/presentation/characters';
import { HERO_ACTION_FADE, HERO_GAIT_PHASE, HERO_LEG_TWIST } from '../../src/presentation/hero/animation';
import { bindHeroBones, HERO_BONES, HERO_FINGERS, type HeroBoneName } from '../../src/presentation/hero/bones';
import { HERO_RUN_CYCLE, HERO_RUN_SPEED, HERO_WALK_CYCLE, HERO_WALK_SPEED } from '../../src/presentation/hero/locomotion';
import { createHeroRig, type MainHeroRig } from '../../src/presentation/hero/rig';
import { loadHeroWithoutImages, meshes } from './heroFixture';

let asset: GLTF;
beforeAll(async () => { asset = await loadHeroWithoutImages(); });
const pose = (mode: Mode = 'idle', overrides = {}) => ({ mode, time: 0, speed: 1, t: 0.45, amp: 0, grounded: true, travel: 0, moveSpeed: 0, ...overrides });
const angle = (a: THREE.Quaternion, b: THREE.Quaternion) => a.clone().normalize().angleTo(b.clone().normalize());
const skinOf = (root: THREE.Object3D) => meshes(root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
const advance = (rig: MainHeroRig, mode: Mode, speed: number, seconds = 2, hz = 60, blade = false) => {
  for (let i = 0; i < seconds * hz; i++) rig.hero.pose(pose(mode, { travel: speed / hz, moveSpeed: speed }), 1 / hz, blade);
};
function sourcePose(name: string, time: number) {
  const scene = cloneSkinned(asset.scene);
  const mixer = new THREE.AnimationMixer(scene), clip = asset.animations.find((clip) => clip.name === name)!;
  const action = mixer.clipAction(clip).play(); action.time = time; action.paused = true;
  mixer.update(0); scene.updateMatrixWorld(true);
  return bindHeroBones(scene);
}
function soleVertices(rig: MainHeroRig, side: 'Left' | 'Right') {
  const skin = skinOf(rig.root), bones = bindHeroBones(rig.root);
  const joints = new Set(['Foot', 'ToeBase', 'Toe_End'].map((part) => skin.skeleton.bones.indexOf(bones[`mixamorig:${side}${part}` as HeroBoneName])));
  const { position, skinIndex, skinWeight } = skin.geometry.attributes;
  const result: number[] = [];
  for (let i = 0; i < position!.count; i++) {
    if (position!.getY(i) > 0.04) continue;
    let weight = 0;
    for (let k = 0; k < 4; k++) if (joints.has(skinIndex!.getComponent(i, k))) weight += skinWeight!.getComponent(i, k);
    if (weight >= .6) result.push(i);
  }
  return result;
}
function lowestSole(rig: MainHeroRig, vertices: number[]) {
  const mesh = skinOf(rig.root), point = new THREE.Vector3(); let low = Infinity;
  rig.root.updateMatrixWorld(true);
  for (const vertex of vertices) { mesh.getVertexPosition(vertex, point); low = Math.min(low, mesh.localToWorld(point).y); }
  return low;
}

describe('authored Mixamo playable hero', () => {
  it('loads the actual sealed Meshy 7.1 delivery of at most 150,000 triangles, exact 66 joints and all six source clips on private skeletons', () => {
    const one = createHeroRig(asset), two = createHeroRig(asset), skin = skinOf(one.root), source = skinOf(asset.scene);
    expect(skin.geometry.index!.count / 3).toBe(149_974);
    expect(skin.skeleton.bones).toHaveLength(66);
    expect(Object.keys(bindHeroBones(one.root))).toEqual([...HERO_BONES]);
    expect(one.hips).not.toBe(two.hips); expect(one.hips).not.toBe(source.skeleton.bones[0]);
    expect(skin.geometry).toBe(source.geometry); expect(skin.material).not.toBe(source.material);
    expect(skin.material).not.toBe(skinOf(two.root).material);
    expect(asset.animations.map((clip) => clip.name).sort()).toEqual(['Boxing_Practice', 'Casual_Walk', 'Dead', 'Run_03', 'Running', 'Walking']);
    for (const clip of asset.animations) expect(clip.tracks).toHaveLength(132);
    expect(one.height).toBe(1.899);
    // Each rig blends its own joints as dual quaternions (A69), so a bent elbow or hip keeps its volume.
    expect(skin.userData.npcDualQuaternion).toMatchObject({ bones: 66 });
  });

  it('is one closed surface whose seam copies move together, so it cannot open into cuts (A69)', () => {
    const geometry = skinOf(asset.scene).geometry, position = geometry.getAttribute('position'), index = geometry.index!;
    const joints = geometry.getAttribute('skinIndex'), weights = geometry.getAttribute('skinWeight');
    // Copies of one position (UV and normal seams) are one vertex of the surface.
    const ids = new Map<string, number>(), weld: number[] = [], skinOf_: string[] = [];
    for (let i = 0; i < position.count; i++) {
      const key = [position.getX(i), position.getY(i), position.getZ(i)].map((v) => Math.round(v / 5e-5)).join(',');
      if (!ids.has(key)) ids.set(key, ids.size);
      weld.push(ids.get(key)!);
      const skin = [0, 1, 2, 3].map((k) => `${joints.getComponent(i, k)}:${weights.getComponent(i, k).toFixed(4)}`).filter((e) => !e.endsWith(':0.0000')).sort().join(' ');
      const first = skinOf_[weld[i]!];
      if (first === undefined) skinOf_[weld[i]!] = skin; else expect(skin, `seam copy ${i}`).toBe(first);
    }
    // Every edge of the welded surface borders exactly two triangles: no slit, hole or loose piece edge.
    const edges = new Map<string, number>();
    for (let t = 0; t < index.count; t += 3) {
      const v = [weld[index.getX(t)]!, weld[index.getX(t + 1)]!, weld[index.getX(t + 2)]!];
      for (const [a, b] of [[v[0]!, v[1]!], [v[1]!, v[2]!], [v[2]!, v[0]!]] as const) {
        const key = a < b ? `${a},${b}` : `${b},${a}`;
        edges.set(key, (edges.get(key) ?? 0) + 1);
      }
    }
    expect([...edges.values()].filter((count) => count !== 2)).toHaveLength(0);
  });

  it('preserves the authored leg and arm rotations at their measured gait phase instead of reconstructing them with IK', () => {
    for (const [mode, name, speed] of [['walk', 'Walking', HERO_WALK_SPEED], ['run', 'Running', HERO_RUN_SPEED]] as const) {
      const rig = createHeroRig(asset); advance(rig, mode, speed, 4);
      const duration = asset.animations.find((clip) => clip.name === name)!.duration;
      const reference = sourcePose(name, ((rig.hero.diagnostics.phase + HERO_GAIT_PHASE[name]) % 1) * duration);
      const bones = bindHeroBones(rig.root);
      for (const side of ['Left', 'Right'] as const) for (const part of ['UpLeg', 'Leg', 'Foot', 'ToeBase', 'Arm', 'ForeArm', 'Hand'] as const) {
        const name = `mixamorig:${side}${part}` as const;
        expect(angle(bones[name].quaternion, reference[name].quaternion), name).toBeLessThan(0.0001);
        expect(bones[name].position.distanceTo(reference[name].position), name).toBeLessThan(0.00001);
      }
      expect(rig.hero.diagnostics.activeClip).toBe(name);
    }
  });

  it('advances only from actual grounded metres and clears gait on reset', () => {
    const rig = createHeroRig(asset); advance(rig, 'walk', HERO_WALK_SPEED, 1.5);
    const before = rig.hero.diagnostics;
    expect(before.distanceMetres).toBeCloseTo(2.475, 8);
    expect(before.phase).toBeCloseTo((2.475 / HERO_WALK_CYCLE) % 1, 8);
    for (const travel of [0, undefined, -1, NaN, Infinity]) {
      for (let i = 0; i < 30; i++) rig.hero.pose(pose('run', { moveSpeed: 8, travel }), 1 / 60, false);
      expect(rig.hero.diagnostics.phase).toBe(before.phase);
      expect(rig.hero.diagnostics.distanceMetres).toBe(before.distanceMetres);
      expect(rig.hero.consumeFootfalls()).toBe(0);
    }
    rig.hero.pose(pose('run', { grounded: false, travel: 1 }), 1 / 60, false);
    expect(rig.hero.diagnostics.phase).toBe(before.phase);
    expect(rig.hero.diagnostics.footContacts).toEqual([false, false]);
    rig.hero.reset();
    expect(rig.hero.diagnostics.phase).toBe(0); expect(rig.hero.diagnostics.distanceMetres).toBe(0);
    expect(rig.hero.diagnostics.activeClip).toBe('RelaxedIdle');
    expect(rig.hero.diagnostics.footContacts).toEqual([true, true]); expect(rig.hero.consumeFootfalls()).toBe(0);
  });

  it('uses speed matched cycles with continuous walk/run phase at 30, 60 and 120 Hz', () => {
    const states = [30, 60, 120].map((hz) => {
      const rig = createHeroRig(asset); let footfalls = 0;
      for (const [mode, speed] of [['walk', HERO_WALK_SPEED], ['run', HERO_RUN_SPEED], ['walk', HERO_WALK_SPEED]] as const) {
        for (let i = 0; i < hz * 2; i++) {
          const before = rig.hero.diagnostics.phase;
          rig.hero.pose(pose(mode, { travel: speed / hz }), 1 / hz, false);
          const change = (rig.hero.diagnostics.phase - before + 1) % 1;
          expect(change).toBeGreaterThan(0); expect(change).toBeLessThan(speed / hz / HERO_WALK_CYCLE + 0.000001);
          footfalls += rig.hero.consumeFootfalls(); expect(rig.hero.consumeFootfalls()).toBe(0);
        }
      }
      return { ...rig.hero.diagnostics, footfalls };
    });
    for (const state of states) {
      expect(state.distanceMetres).toBeCloseTo(18.3, 8);
      expect(state.phase).toBeCloseTo(states[0]!.phase, 8);
      expect(state.footfalls).toBe(states[0]!.footfalls);
      expect(state.cycleMetres).toBeCloseTo(HERO_WALK_CYCLE, 5);
    }
    const run = createHeroRig(asset); advance(run, 'run', HERO_RUN_SPEED, 4);
    expect(run.hero.diagnostics.cycleMetres).toBeCloseTo(HERO_RUN_CYCLE, 8);
    const phase = run.hero.diagnostics.phase; advance(run, 'run', HERO_RUN_SPEED, 2 / 3, 120);
    expect(run.hero.diagnostics.phase).toBeCloseTo(phase, 7);
  });

  it('grounds the relaxed derived idle and keeps paused poses stable rather than returning to bind pose', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
    const initial = HERO_BONES.map((name) => bones[name].quaternion.clone());
    for (const side of ['Left', 'Right'] as const) {
      const vertices = soleVertices(rig, side); expect(vertices.length).toBeGreaterThan(20);
      expect(lowestSole(rig, vertices)).toBeGreaterThan(-0.004);
      expect(lowestSole(rig, vertices)).toBeLessThan(0.004);
      const hand = bones[`mixamorig:${side}Hand`].getWorldPosition(new THREE.Vector3());
      expect(hand.y).toBeLessThan(bones['mixamorig:Hips'].getWorldPosition(new THREE.Vector3()).y);
    }
    advance(rig, 'idle', 0, 3);
    for (const [index, name] of HERO_BONES.entries()) expect(angle(bones[name].quaternion, initial[index]!)).toBeLessThan(0.00001);
    advance(rig, 'walk', HERO_WALK_SPEED); advance(rig, 'idle', 0, 3);
    expect(rig.hero.diagnostics.activeClip).toBe('RelaxedIdle');
    for (const [index, name] of HERO_BONES.entries()) expect(angle(bones[name].quaternion, initial[index]!)).toBeLessThan(0.00001);
  });

  it('retains measured source contact/backslide behavior and signals two contacts per complete walking cycle', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root), dt = 1 / 120;
    advance(rig, 'walk', HERO_WALK_SPEED, 3, 120); rig.hero.consumeFootfalls();
    let count = 0, lastZ = 0, lastPhase = -1; const residuals: number[] = [];
    for (let i = 0; i < 250; i++) {
      rig.root.position.z += HERO_WALK_SPEED * dt;
      rig.hero.pose(pose('walk', { travel: HERO_WALK_SPEED * dt }), dt, false);
      rig.root.updateMatrixWorld(true);
      const z = bones['mixamorig:LeftFoot'].getWorldPosition(new THREE.Vector3()).z, phase = rig.hero.diagnostics.phase;
      // Central authored stance avoids deliberate heel/toe rollover at the contact boundaries.
      if (phase > .1 && phase < .35 && lastPhase > .1 && lastPhase < .35) residuals.push(Math.abs((z - lastZ) / dt));
      lastZ = z; lastPhase = phase; count += rig.hero.consumeFootfalls();
    }
    expect(count).toBe(4); expect(residuals.length).toBeGreaterThan(30);
    residuals.sort((a, b) => a - b);
    expect(residuals[Math.floor(residuals.length / 2)]).toBeLessThan(.22);
  });

  it('walks under guard using source legs, while applying a separate upper-body guard', () => {
    const walk = createHeroRig(asset), guard = createHeroRig(asset);
    advance(walk, 'walk', 1.0725, 3); advance(guard, 'block', 1.0725, 3);
    const one = bindHeroBones(walk.root), two = bindHeroBones(guard.root);
    for (const side of ['Left', 'Right'] as const) for (const part of ['UpLeg', 'Leg', 'Foot'] as const) {
      const name = `mixamorig:${side}${part}` as const;
      expect(angle(one[name].quaternion, two[name].quaternion)).toBeLessThan(.00001);
    }
    expect(angle(one['mixamorig:RightArm'].quaternion, two['mixamorig:RightArm'].quaternion)).toBeGreaterThan(.3);
    expect(guard.hero.diagnostics.activeClip).toBe('Walking'); expect(guard.hero.diagnostics.runWeight).toBe(0);
    expect(guard.hero.consumeFootfalls()).toBeGreaterThan(2);
  });

  it('never moves the physics root and plays authored Dead once to a stable final pose with local fall travel', () => {
    const rig = createHeroRig(asset); rig.root.position.set(15, 4, -19); rig.root.rotation.y = 1.2;
    const position = rig.root.position.clone(), quaternion = rig.root.quaternion.clone();
    for (const mode of ['idle', 'walk', 'run', 'attack_light', 'attack_heavy', 'block', 'dodge', 'hurt', 'work', 'sit'] as Mode[]) {
      advance(rig, mode, 2, .5, 60, true);
      expect(rig.root.position.equals(position)).toBe(true); expect(rig.root.quaternion.equals(quaternion)).toBe(true);
    }
    rig.hero.reset(); const hipsZ = rig.hips.position.z;
    for (let i = 0; i < 360; i++) rig.hero.pose(pose('dead', { t: 0 }), 1 / 60, false);
    expect(rig.hero.diagnostics.activeClip).toBe('Dead'); expect(rig.hero.diagnostics.deathClamped).toBe(true);
    const end = rig.hips.position.clone(), endQ = rig.head.quaternion.clone();
    expect(Math.abs(end.z - hipsZ)).toBeGreaterThan(.4);
    advance(rig, 'dead', 0, 2);
    expect(rig.hips.position.distanceTo(end)).toBeLessThan(1e-8); expect(angle(rig.head.quaternion, endQ)).toBeLessThan(1e-7);
    expect(rig.body.quaternion.angleTo(new THREE.Quaternion())).toBe(0);
    expect(rig.root.position.equals(position)).toBe(true); expect(rig.root.quaternion.equals(quaternion)).toBe(true);
    rig.root.traverse((object) => expect([...object.position.toArray(), ...object.quaternion.toArray()].every(Number.isFinite)).toBe(true));
    rig.hero.reset(); expect(rig.hero.diagnostics.deathTime).toBe(0); expect(rig.hips.position.z).toBeCloseTo(hipsZ, 7);
    const resetHip = rig.hips.position.clone(), resetHead = rig.head.quaternion.clone();
    advance(rig, 'idle', 0, 2);
    expect(rig.hips.position.distanceTo(resetHip)).toBeLessThan(1e-8);
    expect(angle(rig.head.quaternion, resetHead)).toBeLessThan(1e-7);
  });

  it('settles the final authored fall onto the floor through the visual pivot without rewriting bones or physics', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
    rig.root.position.set(7, 2.5, -4); rig.root.rotation.y = .7;
    const rootPosition = rig.root.position.clone(), rootRotation = rig.root.quaternion.clone();
    const duration = asset.animations.find((clip) => clip.name === 'Dead')!.duration;
    const vertices = Array.from({ length: skinOf(rig.root).geometry.attributes.position!.count }, (_, i) => i);
    // The fall tests every low boot vertex each frame; the 150,000-triangle body (A74) has about 3,800 of them.
    expect(soleVertices(rig, 'Left').length + soleVertices(rig, 'Right').length).toBeLessThan(4500);
    for (let i = 0; i < Math.ceil(duration * 60) + 30; i++) {
      rig.hero.pose(pose('dead', { t: 0 }), 1 / 60, false);
      if (rig.hero.diagnostics.deathTime <= duration * .75) expect(rig.body.position.y).toBeGreaterThanOrEqual(0);
      expect(rig.body.position.y).toBeLessThanOrEqual(.08);
      expect(rig.body.position.y).toBeGreaterThan(-.15);
      // While the body settles, the 150,000-triangle boot's toe (A74) may touch up to 6 mm into the floor for a moment.
      if (i < 15 || i % 10 === 0) expect(lowestSole(rig, vertices) - rootPosition.y).toBeGreaterThan(-.0075);
    }
    expect(Math.abs(lowestSole(rig, vertices) - rootPosition.y)).toBeLessThan(.005);
    // The authored fall rests 6.4 cm above the floor on the Meshy 7.1 body (A74; 8 to 10 cm on the A37 mesh).
    expect(rig.body.position.y).toBeLessThan(-.055); expect(rig.body.position.y).toBeGreaterThan(-.1);
    const reference = sourcePose('Dead', duration);
    for (const name of HERO_BONES) {
      expect(bones[name].position.distanceTo(reference[name].position), name).toBeLessThan(.00001);
      expect(angle(bones[name].quaternion, reference[name].quaternion), name).toBeLessThan(.00001);
    }
    expect(rig.root.position.equals(rootPosition)).toBe(true); expect(rig.root.quaternion.equals(rootRotation)).toBe(true);
    rig.hero.reset(); expect(rig.body.position.y).toBe(0);
    advance(rig, 'idle', 0); expect(rig.body.position.y).toBe(0);
  });

  it('retains equipment visibility and fits the blade to the actual palm basis', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root), socket = rig.weapon!.parent!;
    expect(socket.parent).toBe(bones['mixamorig:RightHand']); expect(socket.position.length()).toBeGreaterThan(.06); expect(socket.position.length()).toBeLessThan(.13);
    const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(socket.quaternion);
    const across = bones['mixamorig:RightHandMiddle1'].position.clone().sub(bones['mixamorig:RightHandPinky1'].position).normalize();
    expect(axis.dot(across)).toBeGreaterThan(.99999);
    expect(rig.scabbard!.parent).toBe(bones['mixamorig:Hips']); expect(rig.sash!.parent).toBe(bones['mixamorig:Hips']);
    expect(rig.weapon!.visible).toBe(false); expect(rig.scabbard!.visible).toBe(false);
    setArmed(rig, 'sheathed'); expect(rig.scabbard!.visible).toBe(true); expect(rig.sheathed!.visible).toBe(true);
    setArmed(rig, 'drawn'); expect(rig.weapon!.visible).toBe(true); expect(rig.sheathed!.visible).toBe(false); expect(rig.grip).toBe('blade');
    setArmed(rig, 'none'); expect(rig.weapon!.visible).toBe(false); expect(rig.scabbard!.visible).toBe(false);
    setSash(rig, 0x4d7a54); expect(rig.sash!.visible).toBe(true); setSash(rig, null); expect(rig.sash!.visible).toBe(false);
  });

  it('uses real individual finger joints for grip and keeps unclassified auxiliary bones source driven', () => {
    const open = createHeroRig(asset), held = createHeroRig(asset), fists = createHeroRig(asset);
    advance(open, 'idle', 0); advance(held, 'idle', 0, 2, 60, true); advance(fists, 'block', 0);
    const a = bindHeroBones(open.root), b = bindHeroBones(held.root), c = bindHeroBones(fists.root);
    let changed = 0;
    for (const finger of HERO_FINGERS) for (const joint of [1, 2, 3, 4] as const) {
      const right = `mixamorig:RightHand${finger}${joint}` as HeroBoneName, left = `mixamorig:LeftHand${finger}${joint}` as HeroBoneName;
      if (angle(a[right].quaternion, b[right].quaternion) > .1) changed++;
      expect(angle(a[left].quaternion, b[left].quaternion)).toBeLessThan(.00001);
      expect(b[right].quaternion.length()).toBeCloseTo(1, 5);
    }
    expect(changed).toBeGreaterThan(4);
    expect(angle(a['mixamorig:LeftHandMiddle2'].quaternion, c['mixamorig:LeftHandMiddle2'].quaternion)).toBeGreaterThan(.3);
    for (const name of HERO_BONES.filter((name) => name.startsWith('Bone_'))) expect(angle(a[name].quaternion, b[name].quaternion)).toBeLessThan(.00001);
  });
});

describe('direction, turning and action layers (A70)', () => {
  const worldQ = (rig: MainHeroRig, name: HeroBoneName) => bindHeroBones(rig.root)[name].getWorldQuaternion(new THREE.Quaternion());
  const yawOf = (q: THREE.Quaternion) => { const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q); return Math.atan2(f.x, f.z); };
  const turnBetween = (a: THREE.Quaternion, b: THREE.Quaternion) => { const d = yawOf(b) - yawOf(a); return Math.atan2(Math.sin(d), Math.cos(d)); };
  const move = (rig: MainHeroRig, mode: Mode, heading: number, seconds: number, hz = 60, speed = 1.0725) => {
    for (let i = 0; i < seconds * hz; i++) rig.hero.pose(pose(mode, { travel: speed / hz, moveSpeed: speed, heading }), 1 / hz, false);
  };

  it('strafing under guard turns the hips toward the way of travel while the chest stays ahead', () => {
    const ahead = createHeroRig(asset), aside = createHeroRig(asset);
    move(ahead, 'block', 0, 1); move(aside, 'block', Math.PI / 2, 1);
    const hips = turnBetween(worldQ(ahead, 'mixamorig:Hips'), worldQ(aside, 'mixamorig:Hips'));
    expect(hips).toBeGreaterThan(HERO_LEG_TWIST.most - 0.08);
    expect(hips).toBeLessThan(HERO_LEG_TWIST.most + 0.08);
    expect(Math.abs(turnBetween(worldQ(ahead, 'mixamorig:Spine2'), worldQ(aside, 'mixamorig:Spine2')))).toBeLessThan(0.08);
    expect(Math.abs(turnBetween(worldQ(ahead, 'mixamorig:Head'), worldQ(aside, 'mixamorig:Head')))).toBeLessThan(0.08);
  });

  it('backing off plays the gait backward, with hysteresis at the boundary against a turning camera', () => {
    const rig = createHeroRig(asset);
    move(rig, 'block', Math.PI, 0.2);
    const phases: number[] = [];
    for (let i = 0; i < 20; i++) { move(rig, 'block', Math.PI, 1 / 60); phases.push(rig.hero.diagnostics.phase); }
    const steps = phases.slice(1).map((p, i) => ((p - phases[i]! + 1.5) % 1) - 0.5);
    expect(steps.every((d) => d < 0)).toBe(true);
    expect(rig.hero.consumeFootfalls()).toBeGreaterThanOrEqual(0);
    // Either side of the boundary: entered past 110°, left only below 80°.
    const fresh = createHeroRig(asset), backward = () => Reflect.get(fresh.hero, 'backward') as boolean;
    move(fresh, 'block', 1.75, 0.1); expect(backward()).toBe(false);
    move(fresh, 'block', 1.95, 0.1); expect(backward()).toBe(true);
    move(fresh, 'block', 1.6, 0.1); expect(backward()).toBe(true);
    move(fresh, 'block', 1.75, 0.1); expect(backward()).toBe(true);
    move(fresh, 'block', 1.3, 0.1); expect(backward()).toBe(false);
  });

  it('turning on the spot keeps the boots planted until the twist grows, then steps round', () => {
    const rig = createHeroRig(asset);
    for (let i = 0; i < 30; i++) rig.hero.pose(pose('block'), 1 / 60, false);
    const feet = () => {
      rig.root.updateMatrixWorld(true);
      const bones = bindHeroBones(rig.root);
      return (['Left', 'Right'] as const).map((side) => bones[`mixamorig:${side}Foot`].getWorldPosition(new THREE.Vector3()));
    };
    const before = feet();
    // A slow quarter turn of the body: the outer root turns, the legs hold.
    for (let i = 0; i < 20; i++) { rig.root.rotation.y += 0.02; rig.hero.pose(pose('block', { turn: 0.02 }), 1 / 60, false); }
    const after = feet();
    for (let side = 0; side < 2; side++) expect(after[side]!.distanceTo(before[side]!)).toBeLessThan(0.03);
    // A long turn steps the legs round under the body again.
    for (let i = 0; i < 40; i++) { rig.root.rotation.y += 0.04; rig.hero.pose(pose('block', { turn: 0.04 }), 1 / 60, false); }
    for (let i = 0; i < 90; i++) rig.hero.pose(pose('block'), 1 / 60, false);
    expect(Math.abs(Reflect.get(rig.hero, 'legYaw') as number)).toBeLessThan(0.05);
  });

  it('fades each action in and out at its own pace, the same at 30, 60 and 120 Hz', () => {
    const armAt = (hz: number, mode: Mode, seconds: number, then?: { mode: Mode; seconds: number }) => {
      const rig = createHeroRig(asset), rest = createHeroRig(asset);
      for (let i = 0; i < 0.5 * hz; i++) { rig.hero.pose(pose('idle'), 1 / hz, false); rest.hero.pose(pose('idle'), 1 / hz, false); }
      for (let i = 0; i < Math.round(seconds * hz); i++) { rig.hero.pose(pose(mode), 1 / hz, false); rest.hero.pose(pose('idle'), 1 / hz, false); }
      if (then) for (let i = 0; i < Math.round(then.seconds * hz); i++) { rig.hero.pose(pose(then.mode), 1 / hz, false); rest.hero.pose(pose('idle'), 1 / hz, false); }
      return angle(bindHeroBones(rig.root)['mixamorig:RightArm'].quaternion, bindHeroBones(rest.root)['mixamorig:RightArm'].quaternion);
    };
    const full = armAt(60, 'block', 1.5);
    expect(full).toBeGreaterThan(0.3);
    for (const hz of [30, 60, 120]) {
      // Most of the guard is up within its fade-in, and fully raised by twice that.
      expect(armAt(hz, 'block', HERO_ACTION_FADE.block!.in) / full, `${hz} Hz in`).toBeGreaterThan(0.85);
      expect(armAt(hz, 'block', 2 * HERO_ACTION_FADE.block!.in) / full, `${hz} Hz in`).toBeGreaterThan(0.97);
      // Lowering the guard hands back at the guard's own pace.
      expect(armAt(hz, 'block', 1, { mode: 'idle', seconds: HERO_ACTION_FADE.block!.out }) / full, `${hz} Hz out`).toBeLessThan(0.15);
      expect(Math.abs(armAt(hz, 'block', 0.1) - armAt(60, 'block', 0.1)), `${hz} Hz matches 60 Hz`).toBeLessThan(0.03);
    }
  });

  it('keeps every upper-body action off the legs: hurt, attack and work over a walk leave the authored legs', () => {
    for (const mode of ['hurt', 'attack_light', 'work', 'talk'] as Mode[]) {
      const walk = createHeroRig(asset), act = createHeroRig(asset);
      move(walk, 'walk', 0, 1); move(act, mode, 0, 1);
      const one = bindHeroBones(walk.root), two = bindHeroBones(act.root);
      for (const side of ['Left', 'Right'] as const) for (const part of ['UpLeg', 'Leg', 'Foot'] as const) {
        const name = `mixamorig:${side}${part}` as const;
        expect(angle(one[name].quaternion, two[name].quaternion), `${mode} ${name}`).toBeLessThan(1e-5);
      }
    }
  });
  it('plants each foot on the ground under it, the pelvis lowered to the lower foot (A70)', () => {
    const rig = createHeroRig(asset), left = soleVertices(rig, 'Left'), right = soleVertices(rig, 'Right');
    rig.root.updateMatrixWorld(true);
    const leftX = bindHeroBones(rig.root)['mixamorig:LeftFoot'].getWorldPosition(new THREE.Vector3()).x;
    const flatL = lowestSole(rig, left), flatR = lowestSole(rig, right);
    // A stair edge between the feet: the left foot's side stands 0.18 m higher.
    const groundAt = (x: number) => (Math.sign(x) === Math.sign(leftX) ? 0.18 : 0);
    for (let i = 0; i < 90; i++) rig.hero.pose(pose('idle', { groundAt, rootY: 0 }), 1 / 60, false);
    expect(lowestSole(rig, left) - flatL).toBeCloseTo(0.18, 1);
    expect(Math.abs(lowestSole(rig, right) - flatR)).toBeLessThan(0.03);
    // Down a step the pelvis drops so the lower foot still reaches; airborne the legs hang free again.
    const below = (x: number) => (Math.sign(x) === Math.sign(leftX) ? -0.2 : 0);
    for (let i = 0; i < 90; i++) rig.hero.pose(pose('idle', { groundAt: below, rootY: 0 }), 1 / 60, false);
    expect(lowestSole(rig, left) - flatL).toBeCloseTo(-0.2, 1);
    expect(Math.abs(lowestSole(rig, right) - flatR)).toBeLessThan(0.03);
    for (let i = 0; i < 90; i++) rig.hero.pose(pose('run', { grounded: false, groundAt: below, rootY: 0 }), 1 / 60, false);
    expect(rig.body.position.y).toBeCloseTo(0, 3);
  });
});
