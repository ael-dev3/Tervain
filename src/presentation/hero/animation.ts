import * as THREE from 'three';
import type { Pose } from '../characters';
import type { HeroBoneName, HeroBones } from './bones';

export interface HeroPose extends Pose {
  /** Physics decides whether the feet have support. The visual never adds jump/root travel. */
  grounded?: boolean;
  /** Actual horizontal distance resolved by the player controller during this frame, in metres. */
  travel?: number;
  moveSpeed?: number;
}

type Transform = { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
type Leg = {
  thigh: THREE.Bone; calf: THREE.Bone; foot: THREE.Bone;
  ankle: THREE.Vector3; hip: THREE.Vector3; footRotation: THREE.Quaternion;
  thighLength: number; calfLength: number;
};
type FootStep = { z: number; lift: number; pitch: number; planted: boolean };
const FORWARD = new THREE.Vector3(0, 0, 1);
const clamp = THREE.MathUtils.clamp;
const fraction = (value: number) => ((value % 1) + 1) % 1;
const smooth = (value: number) => value * value * (3 - 2 * value);
const blend = (current: number, target: number, dt: number, rate = 18) => current + (target - current) * (1 - Math.exp(-dt * rate));

/** A planted foot travels backward exactly one controller metre per metre covered by the body. */
export function heroFootStep(phase: number, cycleMetres: number, duty: number, lift: number): FootStep {
  const p = fraction(phase);
  const stride = cycleMetres * duty;
  // Roll off the heel, settle flat, then rise onto the toe. A rigid flat foot at both extremes
  // shortens a human leg's useful reach and forces the whole figure into a perpetual crouch.
  const rollHeight = (pitch: number) => Math.sin(Math.abs(pitch)) * (pitch < 0 ? 0.16 : 0.21);
  if (p < duty) {
    const t = p / duty;
    const pitch = -0.2 * (1 - smooth(clamp(t / 0.24, 0, 1))) + 0.32 * smooth(clamp((t - 0.7) / 0.3, 0, 1));
    return { z: stride / 2 - cycleMetres * p, lift: rollHeight(pitch), pitch, planted: true };
  }
  const t = (p - duty) / (1 - duty);
  const arc = Math.sin(Math.PI * t) ** 2;
  const pitch = 0.32 * (1 - smooth(clamp(t / 0.36, 0, 1))) - 0.2 * smooth(clamp((t - 0.6) / 0.4, 0, 1));
  return { z: -stride / 2 + stride * smooth(t), lift: lift * arc + rollHeight(pitch), pitch, planted: false };
}

/**
 * The approved GLB's real idle, breathing, look and upper-body walk curves drive this one skeleton.
 * Its original 0.43 m/s walk is a close-inspection gait. Longer two-bone leg strides adapt it to the
 * existing game speeds; playing the original seven times faster would make tiny frantic footsteps.
 * No clip, action overlay or foot solver writes the world/controller root transform.
 */
export class HeroAnimationController {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly rest = new Map<THREE.Bone, Transform>();
  private readonly legs: readonly [Leg, Leg];
  private readonly angles = new Map<string, number>();
  private readonly rootPosition: THREE.Vector3;
  private readonly rootRotation: THREE.Quaternion;
  private readonly pelvisPosition: THREE.Vector3;
  private phase = 0;
  private idleClock = 0;
  private motionBlend = 0;
  private distance = 0;
  private cycleMetres = 1.25;
  private pendingFootfalls = 0;
  private footContacts: readonly [boolean, boolean] = [true, true];
  private grounded = true;
  private clip = 'Idle';
  private bodyTilt = 0;
  private bodyHeight = 0;

  constructor(private readonly scene: THREE.Group, private readonly body: THREE.Group, private readonly bones: HeroBones, clips: readonly THREE.AnimationClip[]) {
    // glTF was saved on Idle frame 0, not in bind pose. Bone inverses recover the actual bind axes.
    const skeletons = new Set<THREE.Skeleton>();
    scene.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((object as THREE.SkinnedMesh).skeleton);
    });
    for (const skeleton of skeletons) skeleton.pose();
    scene.updateMatrixWorld(true);
    for (const bone of Object.values(bones)) this.rest.set(bone, {
      position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
    });
    this.rootPosition = bones.root.position.clone();
    this.rootRotation = bones.root.quaternion.clone();
    this.pelvisPosition = bones.pelvis.position.clone();
    const sceneRotation = scene.getWorldQuaternion(new THREE.Quaternion()).invert();
    const position = (bone: THREE.Bone) => scene.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
    this.legs = (['L', 'R'] as const).map((side) => {
      const thigh = bones[`thigh.${side}`], calf = bones[`calf.${side}`], foot = bones[`foot.${side}`];
      const hip = position(thigh), knee = position(calf), ankle = position(foot);
      return { thigh, calf, foot, hip, ankle, thighLength: hip.distanceTo(knee), calfLength: knee.distanceTo(ankle),
        footRotation: sceneRotation.clone().multiply(foot.getWorldQuaternion(new THREE.Quaternion())) };
    }) as unknown as readonly [Leg, Leg];
    this.mixer = new THREE.AnimationMixer(scene);
    for (const name of ['Idle', 'Breathing', 'LookAround', 'Walk']) {
      const source = clips.find((candidate) => candidate.name === name);
      if (!source || source.duration <= 0) throw new Error(`Main hero is missing its ${name} animation`);
      const clip = source.clone();
      // Root motion is intentionally unavailable to this visual adapter. World physics has sole authority.
      clip.tracks = clip.tracks.filter((track) => !track.name.startsWith(`${bones.root.name}.`));
      this.actions.set(name, this.mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play());
    }
    this.reset();
  }

  get diagnostics() {
    return { phase: this.phase, distanceMetres: this.distance, cycleMetres: this.cycleMetres,
      grounded: this.grounded, activeClip: this.clip, footContacts: this.footContacts } as const;
  }

  /** One sound for each actual heel strike; stopped/airborne frames never produce footsteps. */
  consumeFootfalls(): number {
    const footfalls = this.pendingFootfalls;
    this.pendingFootfalls = 0;
    return footfalls;
  }

  /** Loading/teleporting/restarting discards the old gait and all eased action offsets. */
  reset(): void {
    this.phase = this.idleClock = this.motionBlend = this.distance = 0;
    this.cycleMetres = 1.25;
    this.pendingFootfalls = 0;
    this.angles.clear();
    this.bodyTilt = this.bodyHeight = 0;
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.grounded = true;
    this.footContacts = [true, true];
    this.sampleClips(0);
    this.scene.updateMatrixWorld(true);
  }

  pose(p: HeroPose, dt: number, blade: boolean): void {
    if (!(dt > 0) || !Number.isFinite(dt)) { this.pendingFootfalls = 0; return; }
    this.idleClock += dt;
    this.grounded = p.grounded ?? true;
    const locomotion = this.grounded && (p.mode === 'walk' || p.mode === 'run');
    const speed = Math.max(0, p.moveSpeed ?? p.speed * (p.mode === 'run' ? 6 : 3.5));
    const travel = locomotion ? Math.max(0, p.travel ?? speed * dt) : 0;
    const running = clamp((speed - 3.8) / 2.2, 0, 1);
    // Continuous phase survives changing speed and walk/run transitions; it never uses a lifetime clock * speed.
    const brisk = clamp((speed - 1.5) / 2, 0, 1);
    const cycleTarget = 0.85 + 0.4 * clamp(speed / 1.5, 0, 1) + 0.6 * brisk + 0.6 * running;
    // Integrate 1/cycle analytically while stride length eases, so changing cadence is frame-rate independent.
    const inverseCycleMean = Math.log1p(cycleTarget * Math.expm1(6 * dt) / this.cycleMetres) / (6 * cycleTarget * dt);
    const advance = travel * inverseCycleMean;
    if (travel > 0) this.pendingFootfalls += Math.floor((this.phase + advance) * 2 + 1e-8) - Math.floor(this.phase * 2 + 1e-8);
    else this.pendingFootfalls = 0;
    this.phase = fraction(this.phase + advance);
    this.cycleMetres = blend(this.cycleMetres, cycleTarget, dt, 6);
    this.distance += travel;
    this.motionBlend = blend(this.motionBlend, locomotion && travel > 0 ? 1 : 0, dt, 12);
    this.sampleClips(this.motionBlend);
    const amp = clamp(p.amp, 0, 1);
    const lower = this.poseActions(p, dt, blade, amp);
    const dead = p.mode === 'dead';
    this.bodyTilt = blend(this.bodyTilt, dead ? -Math.PI / 2 : 0, dt, dead ? 3 : 18);
    this.bodyHeight = blend(this.bodyHeight, dead ? 0.225 : 0, dt, dead ? 3 : 18);
    this.body.rotation.x = this.bodyTilt;
    this.body.position.y = this.bodyHeight;

    if (!dead && p.mode !== 'sit' && this.grounded) {
      const duty = clamp(0.75 / this.cycleMetres, 0.3, 0.6);
      const steps = [heroFootStep(this.phase, this.cycleMetres, duty, 0.105 + 0.085 * running),
        heroFootStep(this.phase + 0.5, this.cycleMetres, duty, 0.105 + 0.085 * running)] as const;
      const targets = this.legs.map((leg, i) => {
        const target = leg.ankle.clone();
        // The donor's inspection stance was 48 cm wide. Human foot tracks sit nearly below each hip.
        target.x = THREE.MathUtils.lerp(target.x, leg.hip.x + Math.sign(leg.hip.x) * 0.023, this.motionBlend);
        target.y += steps[i]!.lift * this.motionBlend;
        target.z += steps[i]!.z * this.motionBlend;
        return target;
      });
      // Keep leg reach feasible at the longer steps instead of stretching bones or burying the soles.
      let pelvisY = this.pelvisPosition.y - lower - 0.012 * this.motionBlend;
      for (let i = 0; i < this.legs.length; i++) {
        const leg = this.legs[i]!, target = targets[i]!;
        const reach = (leg.thighLength + leg.calfLength) * 0.998;
        const horizontalSq = (target.x - leg.hip.x) ** 2 + (target.z - leg.hip.z) ** 2;
        pelvisY = Math.min(pelvisY, target.y + Math.sqrt(Math.max(0.01, reach * reach - horizontalSq)));
      }
      this.bones.pelvis.position.y = pelvisY;
      this.scene.updateMatrixWorld(true);
      for (let i = 0; i < this.legs.length; i++) this.solveLeg(this.legs[i]!, targets[i]!, steps[i]!.pitch * this.motionBlend);
      this.footContacts = steps.map((step) => this.motionBlend < 0.05 || step.planted) as unknown as readonly [boolean, boolean];
      for (const [i, side] of (['L', 'R'] as const).entries()) {
        const step = steps[i]!;
        this.rotate(`tabard_front.${side}`, -this.motionBlend * (0.035 + Math.max(0, step.z) * 0.52), 0, 0);
        this.rotate(`tabard_back.${side}`, this.motionBlend * (0.025 + Math.max(0, -step.z) * 0.35), 0, 0);
      }
    } else if (!dead && !this.grounded) {
      this.footContacts = [false, false];
      // Tuck in the air. The player's existing ballistic solver supplies every centimetre of height.
      this.rotate('thigh.L', -0.23, 0, 0);
      this.rotate('thigh.R', -0.18, 0, 0);
      this.rotate('calf.L', 0.55, 0, 0);
      this.rotate('calf.R', 0.48, 0, 0);
    }
    this.scene.updateMatrixWorld(true);
  }

  private sampleClips(walkWeight: number): void {
    for (const [bone, transform] of this.rest) {
      bone.position.copy(transform.position);
      bone.quaternion.copy(transform.quaternion);
      bone.scale.copy(transform.scale);
    }
    const local = fraction(this.idleClock / 24) * 24;
    const look = local >= 15 && local < 21 ? 0.38 * Math.sin((local - 15) / 6 * Math.PI) ** 2 : 0;
    const idleWeight = 1 - walkWeight;
    for (const [name, action] of this.actions) {
      const weight = name === 'Walk' ? walkWeight : name === 'LookAround' ? look * idleWeight :
        name === 'Breathing' ? 0.24 * idleWeight : (0.76 - look) * idleWeight;
      action.setEffectiveWeight(weight);
      action.time = name === 'Walk' ? this.phase * action.getClip().duration : this.idleClock % action.getClip().duration;
    }
    this.mixer.update(0);
    this.bones.root.position.copy(this.rootPosition);
    this.bones.root.quaternion.copy(this.rootRotation);
    this.clip = walkWeight > 0.5 ? 'Walk' : look > 0.2 ? 'LookAround' : 'Idle + Breathing';
    this.scene.updateMatrixWorld(true);
  }

  private rotate(name: HeroBoneName, x: number, y: number, z: number): void {
    if (x === 0 && y === 0 && z === 0) return;
    const bone = this.bones[name];
    const sceneQ = this.scene.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    delta.premultiply(sceneQ).multiply(sceneQ.invert());
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
    const parent = bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
    bone.quaternion.copy(parent.multiply(world));
    bone.updateMatrixWorld(true);
  }

  private aim(bone: THREE.Bone, child: THREE.Bone, targetInScene: THREE.Vector3): void {
    const start = bone.getWorldPosition(new THREE.Vector3());
    const from = child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
    const to = this.scene.localToWorld(targetInScene.clone()).sub(start).normalize();
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    bone.updateMatrixWorld(true);
  }

  private solveLeg(leg: Leg, target: THREE.Vector3, pitch: number): void {
    const hip = this.scene.worldToLocal(leg.thigh.getWorldPosition(new THREE.Vector3()));
    const direction = target.clone().sub(hip);
    const distance = clamp(direction.length(), Math.abs(leg.thighLength - leg.calfLength) + 1e-5, leg.thighLength + leg.calfLength - 1e-5);
    const axis = direction.normalize();
    const pole = FORWARD.clone().addScaledVector(axis, -axis.dot(FORWARD)).normalize();
    const along = (leg.thighLength ** 2 - leg.calfLength ** 2 + distance ** 2) / (2 * distance);
    const side = Math.sqrt(Math.max(0, leg.thighLength ** 2 - along ** 2));
    const knee = hip.clone().addScaledVector(axis, along).addScaledVector(pole, side);
    this.aim(leg.thigh, leg.calf, knee);
    this.aim(leg.calf, leg.foot, target);
    const footWorld = this.scene.getWorldQuaternion(new THREE.Quaternion()).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch)).multiply(leg.footRotation);
    leg.foot.quaternion.copy(leg.foot.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(footWorld));
    leg.foot.updateMatrixWorld(true);
  }

  private poseActions(p: HeroPose, dt: number, blade: boolean, amp: number): number {
    const target: Partial<Record<HeroBoneName, [number, number, number]>> = {};
    let lower = 0;
    const arm = (side: 'L' | 'R', x: number, elbow: number, z = 0) => {
      target[`upperarm.${side}`] = [x, 0, z];
      target[`forearm.${side}`] = [elbow, 0, 0];
    };
    const t = clamp(p.t, 0, 1);
    const gait = this.grounded && (p.mode === 'walk' || p.mode === 'run') ? this.motionBlend * amp : 0;
    const counter = Math.cos(this.phase * Math.PI * 2) * gait;
    const running = p.mode === 'run' ? clamp(((p.moveSpeed ?? p.speed * 6) - 3.8) / 2.2, 0, 1) : 0;
    if (gait > 0) {
      // Shoulders oppose the forward foot, with a softly folded elbow on the forward-going arm.
      // The inspection clip is restrained; the longer game stride needs this extra carried weight.
      const pump = 0.25 + 0.2 * running;
      const elbow = (0.15 + 0.65 * running) * gait;
      arm('L', pump * counter, -elbow - 0.13 * Math.max(0, -counter));
      arm('R', -pump * counter, -elbow - 0.13 * Math.max(0, counter));
      target.pelvis = [0, (0.025 + 0.012 * running) * counter, 0];
      target.chest = [0, -(0.045 + 0.02 * running) * counter, 0];
    }
    if (blade) arm('R', -0.13 - 0.065 * counter, -0.28, 0.03);
    switch (p.mode) {
      case 'run':
        target.chest = [0.15 * this.motionBlend, -(0.045 + 0.02 * running) * counter, 0];
        if (!this.grounded) { arm('L', -0.2, -0.35); arm('R', -0.2, -0.35); }
        break;
      case 'attack_light':
      case 'attack_heavy': {
        const heavy = p.mode === 'attack_heavy';
        const windEnd = heavy ? 0.5 : 0.35, strikeEnd = heavy ? 0.68 : 0.6;
        const wind = clamp(t / windEnd, 0, 1);
        const strike = smooth(clamp((t - windEnd) / (strikeEnd - windEnd), 0, 1));
        const recovery = smooth(clamp((t - strikeEnd) / (1 - strikeEnd), 0, 1));
        const out = strike * (1 - recovery), raised = wind * (1 - strike);
        if (blade) {
          arm('R', -(heavy ? 2.25 : 1.7) * raised - 0.35 * out, -0.7 * raised - 0.12, 0.14 * out);
          arm('L', heavy ? -1.75 * raised - 0.3 * out : -0.2, heavy ? -0.95 * raised - 0.1 : -0.4);
        } else {
          arm('R', -0.48 * raised - 1.15 * out, -1.5 * raised - 0.12, heavy ? -0.28 * raised + 0.26 * out : 0.05 * out);
          arm('L', -0.53, -1.15, -0.06);
        }
        target.chest = [0.13 * out - 0.09 * raised, (heavy ? 0.48 : 0.3) * out - 0.28 * raised, 0];
        lower = heavy ? 0.06 * out : 0.025 * raised;
        break;
      }
      case 'block':
        arm('R', blade ? -0.76 : -0.56, blade ? -0.85 : -1.6, blade ? 0.24 : 0.08);
        arm('L', -0.53, blade ? -1.0 : -1.6, -0.08);
        target.chest = [0.09, 0, 0]; lower = 0.045;
        break;
      case 'dodge':
        arm('L', -0.25, -0.68); arm('R', -0.25, -0.68);
        target.chest = [0.35 * Math.sin(t * Math.PI), 0, 0];
        target.head = [0.1, 0, 0]; lower = 0.16 * Math.sin(t * Math.PI);
        break;
      case 'hurt':
        arm('L', -0.17, -0.35); arm('R', -0.17, -0.35);
        target.chest = [-0.2 * Math.sin(t * Math.PI), 0, 0];
        target.head = [-0.12 * Math.sin(t * Math.PI), 0, 0]; lower = 0.025;
        break;
      case 'work': {
        const reach = (Math.sin(this.idleClock * 2.3) + 1) / 2;
        arm('L', -0.5, -0.56); arm('R', -0.48 - 0.1 * reach, -0.54 - 0.05 * reach);
        target.chest = [0.06, 0, 0]; target.head = [0.08, 0, 0]; lower = 0.025;
        break;
      }
      case 'sit':
        target['thigh.L'] = [-1.25, 0, 0]; target['thigh.R'] = [-1.25, 0, 0];
        target['calf.L'] = [1.4, 0, 0]; target['calf.R'] = [1.4, 0, 0];
        arm('L', -0.35, -0.62); arm('R', -0.35, -0.62);
        this.bones.pelvis.position.y -= 0.4;
        break;
      case 'talk':
        arm('R', -0.4, -0.45, Math.sin(this.idleClock * 1.7) * 0.08 * amp);
        target.head = [0, Math.sin(this.idleClock * 0.8) * 0.06 * amp, 0];
        break;
      case 'telegraph':
        arm('R', -1.6 * t, -0.7 * t); target.chest = [-0.08 * t, -0.22 * t, 0];
        break;
      case 'strike':
        arm('R', -1.6 + 1.3 * smooth(clamp(t * 3, 0, 1)), -0.22);
        target.chest = [0.13, 0.25, 0];
        break;
      case 'dead':
        arm('L', -0.1, -0.15); arm('R', -0.04, -0.12);
        target['calf.L'] = [0.12, 0, 0]; target['calf.R'] = [0.2, 0, 0];
        break;
      case 'idle':
      case 'walk':
        break;
    }
    // The source A-pose is useful for painting. Relax it into a carried-arm stance while playing.
    for (const side of ['L', 'R'] as const) {
      const name = `upperarm.${side}` as const;
      const current = target[name] ?? [0, 0, 0];
      target[name] = [current[0], current[1], current[2] + (side === 'L' ? -0.24 : 0.24)];
    }
    // Easing applies only to extra action offsets; authored sampling and distance phase remain continuous.
    for (const name of Object.keys(this.bones) as HeroBoneName[]) {
      const desired = target[name] ?? [0, 0, 0];
      const values = desired.map((value, i) => {
        const key = `${name}:${i}`, current = blend(this.angles.get(key) ?? 0, value, dt);
        this.angles.set(key, current);
        return current;
      });
      this.rotate(name, values[0]!, values[1]!, values[2]!);
    }
    // These are grouped fingers, not individual phalanges. Curl in each joint's own anatomical
    // frame, after the hand/arm pose: a world-X curl would point the wrong way in a raised guard.
    const fighting = p.mode === 'block' || p.mode.startsWith('attack');
    for (const side of ['L', 'R'] as const) {
      const closed = fighting || (side === 'R' && blade);
      const key = `grip:${side}`;
      const amount = blend(this.angles.get(key) ?? 0, closed ? 1 : 0, dt, 22);
      this.angles.set(key, amount);
      const fingers = this.bones[`fingers.${side}`], thumb = this.bones[`thumb.${side}`];
      fingers.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.08 * amount));
      thumb.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5 * amount, 0, (side === 'R' ? -0.3 : 0.3) * amount)));
      fingers.updateMatrixWorld(true);
      thumb.updateMatrixWorld(true);
    }
    // Keep support calculations independent of the pelvis's small authored side-to-side breath.
    this.bones.pelvis.position.x = this.pelvisPosition.x;
    this.bones.pelvis.position.z = this.pelvisPosition.z;
    return lower;
  }
}
