import * as THREE from 'three';
import { readFileSync, readdirSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { poseRig, type Mode, type Pose } from '../../src/presentation/characters';
import { HERO_GRIP_FADE, HERO_HAND_GRIPS } from '../../src/presentation/hero/animation';
import { bindHeroBones, HERO_FINGERS } from '../../src/presentation/hero/bones';
import { createHeroRig, type MainHeroRig } from '../../src/presentation/hero/rig';
import { createMeshyNpcRig, type ResidentMotionSource } from '../../src/presentation/meshynpcs';
import { residentMotionLibrary } from '../../src/presentation/npc/residentMotion';
import { RESIDENT_JOINTS } from '../../src/presentation/npc/residentRig';
import { TURN_STEP } from '../../src/presentation/turnSteps';
import { loadHeroWithoutImages } from './heroFixture';
import { loadResident, loadResidentMotion, loadResidentRigData } from './residentFixtures';

let asset: GLTF;
beforeAll(async () => { asset = await loadHeroWithoutImages(); });
const RATES = [30, 60, 120] as const;
const bonesOf = (root: THREE.Object3D) => { const bones: THREE.Bone[] = []; root.traverse((o) => { if ((o as THREE.Bone).isBone) bones.push(o as THREE.Bone); }); return bones; };
const yawOf = (q: THREE.Quaternion) => { const f = new THREE.Vector3(0, 0, 1).applyQuaternion(q); return Math.atan2(f.x, f.z); };
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Fastest any joint turns between frames (radians a second), and the largest single-frame jump (radians). */
class Spin {
  fastest = 0; jump = 0;
  private last: THREE.Quaternion[] | null = null;
  constructor(private readonly bones: THREE.Bone[], private readonly hz: number) {}
  frame(measure = true): void {
    const now = this.bones.map((bone) => bone.quaternion.clone().normalize());
    if (this.last && measure) now.forEach((q, i) => {
      const angle = q.angleTo(this.last![i]!);
      this.fastest = Math.max(this.fastest, angle * this.hz); this.jump = Math.max(this.jump, angle);
    });
    this.last = now;
  }
}
/**
 * A pop is a jump that does not shrink with the frame: its rate grows with the frame rate (four times from 30 to 120 Hz).
 * Smooth motion keeps its pace; a motion that merely sets off at once (a fade's first frame) reads a little faster at
 * 120 Hz, as 30 Hz averages its start over a longer frame.
 */
function expectNoPop(spins: Record<number, Spin>, most: number, label: string) {
  for (const hz of RATES) expect(spins[hz]!.fastest, `${label} ${hz} Hz`).toBeLessThan(most);
  expect(spins[120]!.fastest / spins[30]!.fastest, `${label} 120 Hz against 30 Hz`).toBeLessThan(1.75);
  expect(spins[120]!.jump, `${label} largest jump at 120 Hz`).toBeLessThan(most / 120 * 1.05);
}

const heroPose = (mode: Mode = 'idle', o: Partial<Pose> = {}): Pose => ({ mode, time: 0, speed: 1, t: 0, amp: 1, grounded: true, travel: 0, moveSpeed: 0, ...o });
const feetOf = (rig: MainHeroRig) => {
  const bones = bindHeroBones(rig.root);
  return () => { rig.root.updateMatrixWorld(true); return (['Left', 'Right'] as const).map((side) => bones[`mixamorig:${side}Foot`].getWorldPosition(new THREE.Vector3())); };
};

describe('turning on the spot with turn clips (A71)', () => {
  it('builds turn.left and turn.right from the hero\'s own walk: legs only, the root kept in place', () => {
    const rig = createHeroRig(asset);
    expect(rig.hero.diagnostics.turnClips).toEqual(['turn.left', 'turn.right']);
    const clips = Reflect.get(Reflect.get(rig.hero, 'steps') as object, 'clips') as Record<string, THREE.AnimationClip>;
    for (const clip of Object.values(clips)) {
      expect(clip.duration).toBeCloseTo(TURN_STEP.duration, 6);
      expect(clip.tracks.every((track) => track.name.endsWith('.quaternion') && /(UpLeg|Leg|Foot)\.quaternion$/.test(track.name))).toBe(true);
      expect(clip.tracks.some((track) => track.name.includes('Hips'))).toBe(false);
    }
  });

  it('turns the hero a quarter turn in steps: planted feet hold within 2 cm, the turn is completed, no pops at 30/60/120 Hz', () => {
    const spins: Record<number, Spin> = {};
    for (const hz of RATES) for (const seconds of [0.15, 0.5, 1.2]) {
      const rig = createHeroRig(asset), feet = feetOf(rig), spin = new Spin(bonesOf(rig.root), hz);
      if (seconds === 0.5) spins[hz] = spin;
      for (let i = 0; i < hz / 2; i++) { rig.hero.pose(heroPose(), 1 / hz, false); spin.frame(false); }
      const planted: (THREE.Vector3 | null)[] = [null, null];
      let slide = 0, lifts = 0, turned = 0, clipSeen = false;
      for (let i = 0; i < 3 * hz; i++) {
        const d = Math.min(Math.PI / 2 - turned, (Math.PI / 2) / (seconds * hz));
        turned += d; rig.root.rotation.y += d;
        rig.hero.pose(heroPose('idle', { turn: d }), 1 / hz, false);
        spin.frame();
        clipSeen ||= rig.hero.diagnostics.activeClip.startsWith('turn.');
        const at = feet(), contacts = rig.hero.diagnostics.footContacts;
        for (let side = 0; side < 2; side++) {
          if (contacts[side]) { planted[side] ??= at[side]!.clone(); slide = Math.max(slide, Math.hypot(at[side]!.x - planted[side]!.x, at[side]!.z - planted[side]!.z)); }
          else { if (planted[side]) lifts++; planted[side] = null; }
        }
      }
      expect(clipSeen, `${hz} Hz ${seconds} s`).toBe(true);
      expect(slide, `${hz} Hz ${seconds} s planted slide`).toBeLessThan(0.02);
      expect(lifts, `${hz} Hz ${seconds} s steps`).toBeGreaterThanOrEqual(2);
      // The whole turn is made: hips and feet face the new way, the feet back under the body where a standing hero has them.
      expect(Math.abs(Reflect.get(rig.hero, 'legYaw') as number)).toBeLessThan(1e-3);
      const bones = bindHeroBones(rig.root);
      expect(Math.abs(wrap(yawOf(bones['mixamorig:Hips'].getWorldQuaternion(new THREE.Quaternion())) - Math.PI / 2))).toBeLessThan(0.05);
      const still = createHeroRig(asset);
      for (let i = 0; i < 3.5 * hz; i++) still.hero.pose(heroPose(), 1 / hz, false);
      const stand = feetOf(still)(), now = feet();
      for (let side = 0; side < 2; side++) {
        expect(rig.root.worldToLocal(now[side]!.clone()).distanceTo(still.root.worldToLocal(stand[side]!.clone())), `${hz} Hz ${seconds} s home`).toBeLessThan(0.02);
      }
    }
    expectNoPop(spins, 16, 'hero turn');
  });

  it('leads a turn with the head and chest: turned ahead into it while turning, straight again once turned (A76)', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root), hz = 60;
    const headAhead = () => { rig.root.updateMatrixWorld(true); return wrap(yawOf(bones['mixamorig:Head'].getWorldQuaternion(new THREE.Quaternion())) - rig.root.rotation.y); };
    for (let i = 0; i < hz; i++) rig.hero.pose(heroPose(), 1 / hz, false);
    const rest = headAhead();
    let most = 0;
    for (let i = 0; i < hz; i++) {
      rig.root.rotation.y += 2 / hz;
      rig.hero.pose(heroPose('idle', { turn: 2 / hz }), 1 / hz, false);
      most = Math.max(most, headAhead() - rest);
    }
    expect(most).toBeGreaterThan(0.25);
    expect(most).toBeLessThan(0.8);
    for (let i = 0; i < 2 * hz; i++) rig.hero.pose(heroPose(), 1 / hz, false);
    expect(Math.abs(headAhead() - rest)).toBeLessThan(0.03);
    // Turning the other way leads the other way.
    let least = 0;
    for (let i = 0; i < hz / 2; i++) {
      rig.root.rotation.y -= 2 / hz;
      rig.hero.pose(heroPose('idle', { turn: -2 / hz }), 1 / hz, false);
      least = Math.min(least, headAhead() - rest);
    }
    expect(least).toBeLessThan(-0.2);
  });

  it('turns a resident on the spot with their own turn clips, feet held, home again after, no pops', async () => {
    const { source, entry } = await loadResident('estate-steward');
    const motion: ResidentMotionSource = { data: await loadResidentRigData('estate-steward'), library: residentMotionLibrary(await loadResidentMotion()), build: 'man', seed: 7, fighter: false };
    const spins: Record<number, Spin> = {};
    const pose = (turn: number): Pose => ({ mode: 'idle', speed: 0, time: 0, t: 0, amp: 1, turn });
    for (const hz of RATES) {
      const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, {}, motion), bones = bonesOf(rig.root);
      expect(rig.resident!.stepsInPlace).toBe(true);
      const steps = rig.resident!.turnSteps!, spin = spins[hz] = new Spin(bones, hz);
      const foot = (side: string) => bones.find((bone) => bone.name === `${side}Foot`)!;
      for (let i = 0; i < hz; i++) { poseRig(rig, pose(0), 1 / hz); spin.frame(false); }
      const planted: (THREE.Vector3 | null)[] = [null, null];
      let slide = 0, lifts = 0, turned = 0;
      for (let i = 0; i < 3 * hz; i++) {
        // About as fast as a standing resident turns (actors.ts NPC_TURN_STANDING).
        const d = Math.min(2.2 / hz, Math.PI / 2 - turned);
        turned += d; rig.root.rotation.y += d;
        poseRig(rig, pose(d), 1 / hz);
        spin.frame();
        rig.root.updateMatrixWorld(true);
        (['Left', 'Right'] as const).forEach((side, k) => {
          const at = foot(side).getWorldPosition(new THREE.Vector3());
          if (steps.influence < 0.999) { planted[k] = null; return; }
          if (steps.contacts[k]) { planted[k] ??= at; slide = Math.max(slide, Math.hypot(at.x - planted[k]!.x, at.z - planted[k]!.z)); }
          else { if (planted[k]) lifts++; planted[k] = null; }
        });
      }
      expect(slide, `${hz} Hz planted slide`).toBeLessThan(0.02);
      expect(lifts, `${hz} Hz steps`).toBeGreaterThanOrEqual(2);
      expect(steps.influence).toBe(0);
      const still = createMeshyNpcRig(source, entry, 1, 'none', undefined, {}, motion), stillBones = bonesOf(still.root);
      for (let i = 0; i < 4 * hz; i++) poseRig(still, pose(0), 1 / hz);
      still.root.updateMatrixWorld(true); rig.root.updateMatrixWorld(true);
      for (const side of ['Left', 'Right']) {
        const home = still.root.worldToLocal(stillBones.find((bone) => bone.name === `${side}Foot`)!.getWorldPosition(new THREE.Vector3()));
        expect(rig.root.worldToLocal(foot(side).getWorldPosition(new THREE.Vector3())).distanceTo(home), `${hz} Hz ${side} home`).toBeLessThan(0.02);
      }
    }
    expectNoPop(spins, 16, 'resident turn');
  }, 120_000);
});

describe('transitions (A71)', () => {
  it('stopping mid-stride takes a settling step: no planted foot slides into the stand, no pop', () => {
    const spins: Record<number, Spin> = {};
    for (const hz of RATES) for (const stopAt of [0.5, 0.62, 0.75, 0.9]) {
      const rig = createHeroRig(asset), bones = bindHeroBones(rig.root), spin = new Spin(bonesOf(rig.root), hz);
      if (stopAt === 0.75) spins[hz] = spin;
      const toes = () => { rig.root.updateMatrixWorld(true); return (['Left', 'Right'] as const).map((side) => bones[`mixamorig:${side}ToeBase`].getWorldPosition(new THREE.Vector3())); };
      let slide = 0, footfalls = 0, from: THREE.Vector3[] | null = null;
      for (let i = 0; i < 2 * hz; i++) {
        const walking = i / hz < stopAt;
        if (walking) rig.root.position.z += 1.07 / hz;
        rig.hero.pose(walking ? heroPose('walk', { travel: 1.07 / hz, moveSpeed: 1.07 }) : heroPose(), 1 / hz, false);
        spin.frame(i / hz >= stopAt - 0.1);
        const settled = rig.hero.consumeFootfalls();
        if (walking) continue;
        footfalls += settled;
        const at = toes(), contacts = rig.hero.diagnostics.footContacts;
        from ??= at.map((v) => v.clone());
        for (let side = 0; side < 2; side++) {
          if (contacts[side] && at[side]!.y < 0.06) slide = Math.max(slide, Math.hypot(at[side]!.x - from[side]!.x, at[side]!.z - from[side]!.z));
          else from[side] = at[side]!.clone();
        }
      }
      // The older crossfade slid a planted foot up to 24 cm into the stand.
      expect(slide, `${hz} Hz stop at ${stopAt}`).toBeLessThan(0.02);
      expect(footfalls, `${hz} Hz stop at ${stopAt}: the settling steps are heard`).toBeGreaterThanOrEqual(1);
      expect(rig.hero.diagnostics.activeClip).toBe('RelaxedIdle');
    }
    expectNoPop(spins, 20, 'hero stop');
  });

  it('fades the hero\'s grips in and out smoothly: fist, sword, relaxed, bow, draw, knife and hide', () => {
    const spins: Record<number, Spin> = {};
    for (const hz of RATES) {
      const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
      const fingers = (['Left', 'Right'] as const).flatMap((side) => HERO_FINGERS.flatMap((finger) => ([1, 2, 3] as const).map((joint) => bones[`mixamorig:${side}Hand${finger}${joint}`])));
      const spin = spins[hz] = new Spin(fingers, hz);
      // Idle, an attack and its recovery with the sword drawn, then idle: the grip closes to a fist and opens again.
      for (let i = 0; i < 2 * hz; i++) {
        const t = i / hz, mode: Mode = t > 0.3 && t < 0.9 ? 'attack_light' : 'idle';
        rig.hero.pose(heroPose(mode, { t: (t - 0.3) / 0.6 }), 1 / hz, true);
        spin.frame();
      }
    }
    // The older grip snapped toward its target at 26-34 rad/s (faster the higher the frame rate).
    expectNoPop(spins, 12, 'grip');
    const rig = createHeroRig(asset);
    for (const [grip, shape] of Object.entries(HERO_HAND_GRIPS)) {
      for (let i = 0; i < 60 * HERO_GRIP_FADE * 1.5; i++) { rig.hero.holdGrip('Left', grip as keyof typeof HERO_HAND_GRIPS); rig.hero.pose(heroPose(), 1 / 60, false); }
      for (const finger of HERO_FINGERS) expect(rig.hero.gripOf('Left')[finger], `${grip} ${finger}`).toBeCloseTo(shape[finger], 6);
    }
    // Once no longer held, the hand relaxes again.
    for (let i = 0; i < 60 * HERO_GRIP_FADE * 1.5; i++) rig.hero.pose(heroPose(), 1 / 60, false);
    for (const finger of HERO_FINGERS) expect(rig.hero.gripOf('Left')[finger]).toBeCloseTo(HERO_HAND_GRIPS.relaxed[finger], 6);
  });

  it('residents have no finger joints to grip with: every shipped rig is the 24-joint Meshy skeleton', () => {
    const dir = new URL('../../public/models/npcs/rigs/', import.meta.url);
    const files = readdirSync(dir).filter((name) => name.endsWith('.json'));
    expect(files.length).toBeGreaterThan(5);
    expect(RESIDENT_JOINTS.length).toBe(24);
    for (const file of files) {
      const rig = JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as { bones: ({ name: string } | string)[] };
      const names = rig.bones.map((bone) => typeof bone === 'string' ? bone : bone.name);
      expect(names.length, file).toBe(24);
      expect(names.some((name) => /thumb|index|middle|ring|pinky|finger/i.test(name)), file).toBe(false);
    }
  });

  it('keeps residents\' sitting down and up, and an attack\'s recovery, free of pops at 30/60/120 Hz', async () => {
    const { source, entry } = await loadResident('maintenance-worker');
    const motion: ResidentMotionSource = { data: await loadResidentRigData('maintenance-worker'), library: residentMotionLibrary(await loadResidentMotion()), build: 'man', seed: 7, fighter: true };
    const sit: Record<number, Spin> = {}, recover: Record<number, Spin> = {};
    for (const hz of RATES) {
      const rig = createMeshyNpcRig(source, entry, 1, 'none', undefined, {}, motion);
      const back = rig.resident!.seatApproach(0.55);
      const pose = (mode: Mode, seated: boolean, o: Partial<Pose> = {}): Pose => ({ mode, speed: 0, time: 0, t: 0, amp: 1, seated, seatHeight: 0.55, seatBack: back, ...o });
      const spin = sit[hz] = new Spin(bonesOf(rig.root), hz);
      for (let i = 0; i < 14 * hz; i++) {
        const t = i / hz;
        poseRig(rig, t < 1 ? pose('idle', false) : t < 8 ? pose('sit', true) : pose('idle', false), 1 / hz);
        spin.frame(t >= 1);
      }
      const fighter = createMeshyNpcRig(source, entry, 1, 'none', undefined, {}, motion), after = recover[hz] = new Spin(bonesOf(fighter.root), hz);
      for (let i = 0; i < 3 * hz; i++) {
        const t = i / hz;
        poseRig(fighter, t > 0.5 && t < 1.3 ? pose('attack_light', false, { t: (t - 0.5) / 0.8 }) : pose('idle', false), 1 / hz);
        after.frame(t >= 1.3);
      }
    }
    // The clips themselves turn a joint at most about 5 rad/s getting down and up; the crossfades add nothing.
    expectNoPop(sit, 7, 'sit down and up');
    expectNoPop(recover, 7, 'attack recovery');
  }, 120_000);
});
