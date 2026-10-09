import * as THREE from 'three';
import type { Pose } from '../characters';
import type { ResidentMotionLibrary } from '../npc/residentMotion';
import { HERO_BONES, HERO_FINGERS, type HeroBoneName, type HeroBones } from './bones';
import { HERO_RUN_CYCLE, HERO_RUN_SPEED, HERO_WALK_CYCLE, HERO_WALK_SPEED } from './locomotion';
import { HERO_SWIM_CYCLE, HERO_SWIM_RATE, heroSwimClips } from './swim';

export interface HeroPose extends Pose {
  grounded?: boolean;
  /** Horizontal metres actually resolved by physics this frame. Missing travel means no movement. */
  travel?: number;
  moveSpeed?: number;
}

/**
 * Where the legs go when the hero moves other than straight ahead, his chest still facing the guard or the aim (A70).
 * The hips turn toward the way he moves, at most `most` radians, the chest turned back over the spine; backing off plays
 * the gait backward, entered past `back[0]` from ahead and left below `back[1]`, so a camera turn near the boundary
 * cannot flip a planted foot to and fro. Standing, the feet stay planted while the body turns above them, until the
 * twist passes `step`, when they step round (`settle`, a rate) with `stride` metres of gait per radian.
 */
export const HERO_LEG_TWIST = { most: 1.05, follow: 10, settle: 9, step: 0.7, stride: 0.22, back: [1.92, 1.4], relax: 0.6 } as const;

/**
 * How each action's overlay comes and goes, seconds to settle (A70): an action that takes over fades in at its own pace,
 * one that ends hands back at its own. The recovered Gothic fades (about 0.2 s, 0.3 s for wrapped actions) were the
 * reference, not a rule. Priority decides which pace applies: a stronger action takes over at once.
 */
export const HERO_ACTION_FADE: Readonly<Record<string, { in: number; out: number; priority: number }>> = {
  idle: { in: 0.2, out: 0.2, priority: 0 },
  talk: { in: 0.3, out: 0.3, priority: 1 },
  work: { in: 0.3, out: 0.3, priority: 2 },
  sit: { in: 0.4, out: 0.4, priority: 2 },
  swim: { in: 0.3, out: 0.3, priority: 2 },
  block: { in: 0.14, out: 0.25, priority: 3 },
  attack: { in: 0.08, out: 0.22, priority: 4 },
  dodge: { in: 0.06, out: 0.2, priority: 5 },
  hurt: { in: 0.05, out: 0.3, priority: 6 },
};
const overlayOf = (mode: string) => mode.startsWith('attack') || mode === 'telegraph' || mode === 'strike' ? 'attack'
  : HERO_ACTION_FADE[mode] ? mode : 'idle';
/** The legs and pelvis: no upper-body overlay may move them (A70); sitting, swimming and the airborne pose own them. */
const LOWER_BODY = new Set<string>(['mixamorig:Hips', ...(['Left', 'Right'] as const).flatMap((side) =>
  ['UpLeg', 'Leg', 'Foot', 'ToeBase', 'Toe_End'].map((part) => `mixamorig:${side}${part}`))]);

type Transform = { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
const clamp = THREE.MathUtils.clamp;
const fraction = (value: number) => ((value % 1) + 1) % 1;
const smooth = (value: number) => value * value * (3 - 2 * value);
const blend = (current: number, target: number, dt: number, rate = 16) => current + (target - current) * (1 - Math.exp(-dt * rate));
const finite = (value: number | undefined, fallback = 0) => Number.isFinite(value) ? value! : fallback;
/** Measured low-sole/backward-travel contact estimates, not source animation events. */
export const HERO_GAIT_PHASE = { Walking: 0.292, Running: 0.311, rightContact: 0.48 } as const;
export const HERO_IDLE_STANCE = { clip: 'Casual_Walk', time: 2.65 } as const;
/**
 * Swimming leans the whole figure forward about the chest (which stays at the waterline) so the head rides above the
 * surface and the legs trail: steeply while stroking, more upright while treading water. With the authored strokes
 * (see {@link HeroAnimationController.useSwimClips}) the clips carry the lean and only the pivot height applies.
 */
export const HERO_SWIM = { pivot: 1.25, strokePitch: 1.12, treadPitch: 0.32, strokeHz: 0.78, treadHz: 0.5 } as const;
const X_AXIS = new THREE.Vector3(1, 0, 0);

/** Piecewise smooth keyframes over a cycle [0, 1): [time, value] pairs, the first repeated at 1. */
function cycle(c: number, keys: readonly (readonly [number, number])[]): number {
  for (let i = 0; i < keys.length; i++) {
    const [t0, v0] = keys[i]!, [t1, v1] = keys[(i + 1) % keys.length]!;
    const end = i + 1 < keys.length ? t1 : 1;
    if (c >= t0 && c < end) return v0 + (v1 - v0) * smooth((c - t0) / Math.max(1e-6, end - t0));
  }
  return keys[0]![1];
}

/** Authored Mixamo motion on a private skeleton; physics alone moves the outer character root. */
export class HeroAnimationController {
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<string, THREE.AnimationAction>();
  private readonly rest = new Map<THREE.Bone, Transform>();
  private readonly sampled = new Map<THREE.Bone, Transform>();
  private readonly soleSamples: { mesh: THREE.SkinnedMesh; vertices: number[] }[] = [];
  private readonly gripPose = new Map<HeroBoneName, THREE.Quaternion>();
  private readonly angles = new Map<string, number>();
  private phase = 0;
  private idleClock = 0;
  private motionBlend = 0;
  private distance = 0;
  private cycleMetres = HERO_WALK_CYCLE;
  private runWeight = 0;
  private pendingFootfalls = 0;
  private footContacts: readonly [boolean, boolean] = [true, true];
  private grounded = true;
  private clip = 'RelaxedIdle';
  private deadClock = 0;
  private deadWeight = 0;
  private wasDead = false;
  private readonly deathClearance: number;
  private swimBlend = 0;
  private swimMoving = 0;
  private swimClock = 0;
  private strokesPending = 0;
  /** The authored breaststroke and treading water, once the motion library has lent them. */
  private swim: { stroke: THREE.AnimationAction; tread: THREE.AnimationAction } | null = null;
  /** The legs' turn against the chest (A70), whether the gait runs backward, and the twist held standing. */
  private legYaw = 0;
  private backward = false;
  private standTwist = 0;
  private stepping = false;
  private standingClock = 0;
  private heldClock = 0;
  /** The overlay now leading and the one it took over from, for their fades (A70). */
  private overlay = 'idle';
  private overlayFrom = 'idle';

  constructor(private readonly scene: THREE.Group, private readonly body: THREE.Group,
    private readonly bones: HeroBones, clips: readonly THREE.AnimationClip[]) {
    const skeletons = new Set<THREE.Skeleton>();
    scene.traverse((object) => {
      if ((object as THREE.SkinnedMesh).isSkinnedMesh) skeletons.add((object as THREE.SkinnedMesh).skeleton);
    });
    for (const skeleton of skeletons) skeleton.pose();
    scene.updateMatrixWorld(true);
    for (const bone of Object.values(bones)) this.rest.set(bone, {
      position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
    });
    scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const joints = new Set((['Left', 'Right'] as const).flatMap((side) => ['Foot', 'ToeBase', 'Toe_End']
        .map((part) => mesh.skeleton.bones.indexOf(bones[`mixamorig:${side}${part}` as HeroBoneName]))));
      const { position, skinIndex, skinWeight } = mesh.geometry.attributes;
      const vertices: number[] = [];
      for (let vertex = 0; vertex < position!.count; vertex++) {
        if (position!.getY(vertex) > 0.04) continue;
        let weight = 0;
        for (let slot = 0; slot < 4; slot++) if (joints.has(skinIndex!.getComponent(vertex, slot))) weight += skinWeight!.getComponent(vertex, slot);
        if (weight >= 0.6) vertices.push(vertex);
      }
      this.soleSamples.push({ mesh, vertices });
    });
    this.mixer = new THREE.AnimationMixer(scene);
    const source = (name: string) => {
      const found = clips.find((candidate) => candidate.name === name);
      if (!found || !(found.duration > 0)) throw new Error(`Main hero is missing its ${name} animation`);
      // Only skeleton channels may be evaluated. Global/model/controller transforms are never targets.
      const copy = found.clone();
      const allowed = new Set(Object.values(bones).flatMap((bone) => [`${bone.name}.position`, `${bone.name}.quaternion`]));
      copy.tracks = copy.tracks.filter((track) => allowed.has(track.name));
      return copy;
    };
    const snapshot = (clip: THREE.AnimationClip, time: number) => {
      this.restore();
      const action = this.mixer.clipAction(clip).play();
      action.time = clamp(time, 0, clip.duration);
      this.mixer.update(0);
      scene.updateMatrixWorld(true);
      // Copy before stop(): Three restores the previously bound property values when an action stops.
      const result = new Map<THREE.Bone, Transform>();
      for (const bone of Object.values(bones)) result.set(bone, {
        position: bone.position.clone(), quaternion: bone.quaternion.clone(), scale: bone.scale.clone(),
      });
      action.stop(); this.mixer.uncacheClip(clip);
      for (const [bone, pose] of result) { bone.position.copy(pose.position); bone.quaternion.copy(pose.quaternion); bone.scale.copy(pose.scale); }
      scene.updateMatrixWorld(true);
    };
    // The source final fall rests above its floor. Measure that static clearance once, including
    // imported scene grounding, without altering any authored bone channel or physics transform.
    const death = source('Dead');
    snapshot(death, death.duration);
    let lowest = Infinity;
    const point = new THREE.Vector3();
    scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      for (let vertex = 0; vertex < mesh.geometry.attributes.position!.count; vertex++) {
        mesh.getVertexPosition(vertex, point);
        body.worldToLocal(mesh.localToWorld(point));
        lowest = Math.min(lowest, point.y);
      }
    });
    this.deathClearance = clamp(finite(lowest), 0, 0.15);
    // Boxing supplies only actual individual phalange poses for fists/blade grip, never idle body motion.
    snapshot(source('Boxing_Practice'), 0.25);
    for (const side of ['Left', 'Right'] as const) for (const finger of HERO_FINGERS) for (const joint of [1, 2, 3, 4] as const) {
      const name = `mixamorig:${side}Hand${finger}${joint}` as HeroBoneName;
      this.gripPose.set(name, bones[name].quaternion.clone());
    }
    snapshot(source(HERO_IDLE_STANCE.clip), HERO_IDLE_STANCE.time);
    // The relaxed source frame is mid-walk. Ground its two soles once while deriving the constant idle.
    // This is not a runtime gait solver: Walking and Running always retain their authored leg curves.
    this.settleIdleStance();
    const idleTracks: THREE.KeyframeTrack[] = [];
    for (const bone of Object.values(bones)) {
      const p = bone.position.toArray(), q = bone.quaternion.toArray();
      idleTracks.push(new THREE.VectorKeyframeTrack(`${bone.name}.position`, [0, 1], [...p, ...p]));
      idleTracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, [0, 1], [...q, ...q]));
    }
    const idle = new THREE.AnimationClip('RelaxedIdle', 1, idleTracks);
    this.restore();
    for (const clip of [idle, source('Walking'), source('Running'), source('Dead')]) {
      const action = this.mixer.clipAction(clip).play();
      action.paused = true;
      action.setEffectiveWeight(0);
      if (clip.name === 'Dead') { action.setLoop(THREE.LoopOnce, 1); action.clampWhenFinished = true; }
      else action.setLoop(THREE.LoopRepeat, Infinity);
      this.actions.set(clip.name, action);
    }
    this.reset();
  }

  /**
   * Swim with the breaststroke and treading water from the residents' motion library, retargeted onto this skeleton,
   * in place of the procedural stroke (A65). Once per controller; a library without them leaves the procedural stroke.
   */
  useSwimClips(library: ResidentMotionLibrary): void {
    if (this.swim) return;
    const clips = heroSwimClips(library, this.bones, this.rest);
    if (!clips) return;
    const action = (clip: THREE.AnimationClip) => {
      const played = this.mixer.clipAction(clip).play();
      played.paused = true;
      played.setEffectiveWeight(0);
      played.setLoop(THREE.LoopRepeat, Infinity);
      return played;
    };
    this.swim = { stroke: action(clips.stroke), tread: action(clips.tread) };
  }

  /** Whether the authored strokes are in use. */
  get authoredSwim(): boolean { return this.swim !== null; }

  get diagnostics() {
    return { phase: this.phase, distanceMetres: this.distance, cycleMetres: this.cycleMetres,
      grounded: this.grounded, activeClip: this.clip, footContacts: this.footContacts,
      walkWeight: this.motionBlend * (1 - this.runWeight), runWeight: this.motionBlend * this.runWeight,
      deathTime: this.deadClock, deathClamped: this.deadClock >= this.actions.get('Dead')!.getClip().duration } as const;
  }

  consumeFootfalls(): number { const result = this.pendingFootfalls; this.pendingFootfalls = 0; return result; }

  /** Strokes completed since the last call (the moment the hands sweep wide), for the stroke's splash and sound. */
  consumeStrokes(): number { const result = this.strokesPending; this.strokesPending = 0; return result; }

  /** How far the figure is into its swimming lean, 0 upright .. 1. */
  get swimming(): number { return this.swimBlend; }

  /** Equipment actions reuse the source's actual finger grip, without replacing its body or locomotion pose. */
  applyHandGrip(side: 'Left' | 'Right', amount: number): void {
    const weight = clamp(finite(amount), 0, 1);
    for (const finger of HERO_FINGERS) for (const joint of [1, 2, 3, 4] as const) {
      const name = `mixamorig:${side}Hand${finger}${joint}` as HeroBoneName;
      this.bones[name].quaternion.slerp(this.gripPose.get(name)!, weight);
    }
    this.scene.updateMatrixWorld(true);
  }

  reset(): void {
    this.phase = this.idleClock = this.motionBlend = this.distance = this.runWeight = 0;
    this.cycleMetres = HERO_WALK_CYCLE;
    this.deadClock = this.deadWeight = 0; this.wasDead = false;
    this.swimBlend = this.swimMoving = this.swimClock = this.strokesPending = 0;
    this.pendingFootfalls = 0; this.angles.clear();
    this.legYaw = this.standTwist = this.standingClock = this.heldClock = 0; this.backward = this.stepping = false;
    this.overlay = this.overlayFrom = 'idle';
    this.body.position.set(0, 0, 0); this.body.quaternion.identity();
    this.grounded = true; this.footContacts = [true, true];
    this.sampleClips(); this.scene.updateMatrixWorld(true);
  }

  pose(p: HeroPose, dt: number, blade: boolean): void {
    if (!(dt > 0) || !Number.isFinite(dt)) { this.pendingFootfalls = 0; return; }
    const step = Math.min(dt, 0.25);
    this.idleClock += step;
    this.grounded = p.grounded ?? true;
    const dead = p.mode === 'dead';
    if (dead && !this.wasDead) this.deadClock = 0;
    if (dead) this.deadClock = Math.min(this.deadClock + step, this.actions.get('Dead')!.getClip().duration);
    this.wasDead = dead;
    this.deadWeight = blend(this.deadWeight, dead ? 1 : 0, step, 14);
    const swimming = p.mode === 'swim' && !dead;
    this.swimBlend = blend(this.swimBlend, swimming ? 1 : 0, step, 4);
    this.swimMoving = blend(this.swimMoving, swimming ? clamp(finite(p.speed), 0, 1) : 0, step, 3);
    if (swimming) {
      const before = this.swimClock;
      const rate = this.swim ? HERO_SWIM_RATE : HERO_SWIM;
      this.swimClock += step * THREE.MathUtils.lerp(rate.treadHz, rate.strokeHz, this.swimMoving) * (0.8 + 0.4 * clamp(finite(p.speed), 0, 1.5));
      // The pull ends at a fifth of a cycle: one stroke heard and seen per cycle.
      this.strokesPending += Math.floor(this.swimClock - 0.2) - Math.floor(before - 0.2);
    }
    const canStep = this.grounded && !dead && p.mode !== 'sit';
    const moving = canStep && finite(p.travel) > 0;
    // Standing, the feet stay planted while the body turns above them, and step round once the twist grows (A70).
    let stepTravel = 0;
    if (!moving && canStep && p.mode !== 'swim') {
      if (this.standingClock === 0) this.standTwist = this.legYaw;
      this.standingClock += step;
      this.standTwist = clamp(this.standTwist - finite(p.turn), -1.6, 1.6);
      // A twist held once the body has stopped turning is stepped out too, so he does not stand twisted.
      this.heldClock = Math.abs(finite(p.turn)) > 1e-4 ? 0 : this.heldClock + step;
      if (Math.abs(this.standTwist) > HERO_LEG_TWIST.step || (this.heldClock > HERO_LEG_TWIST.relax && Math.abs(this.standTwist) > 0.15)) this.stepping = true;
      if (this.stepping) {
        const before = this.standTwist;
        this.standTwist = blend(this.standTwist, 0, step, HERO_LEG_TWIST.settle);
        stepTravel = Math.abs(before - this.standTwist) * HERO_LEG_TWIST.stride;
        if (Math.abs(this.standTwist) < 0.03) { this.standTwist = 0; this.stepping = false; }
      }
      this.legYaw = this.standTwist;
    } else {
      this.standingClock = this.heldClock = 0; this.standTwist = 0; this.stepping = false;
    }
    if (moving) {
      // Backing off plays the gait backward; the boundary has hysteresis, so a camera turn cannot flip a planted foot.
      const heading = finite(p.heading), away = Math.abs(heading);
      this.backward = this.backward ? away > HERO_LEG_TWIST.back[1] : away > HERO_LEG_TWIST.back[0];
      const toward = this.backward ? Math.atan2(Math.sin(heading - Math.PI), Math.cos(heading - Math.PI)) : heading;
      this.legYaw = blend(this.legYaw, clamp(toward, -HERO_LEG_TWIST.most, HERO_LEG_TWIST.most), step, HERO_LEG_TWIST.follow);
    } else if (!canStep || p.mode === 'swim') { this.legYaw = blend(this.legYaw, 0, step, HERO_LEG_TWIST.follow); this.backward = false; }
    const travel = canStep ? Math.max(0, finite(p.travel)) + stepTravel : 0;
    const speed = travel / dt;
    const desiredRun = p.mode === 'block' ? 0 : clamp((speed - HERO_WALK_SPEED) / (HERO_RUN_SPEED - HERO_WALK_SPEED), 0, 1);
    const targetCycle = THREE.MathUtils.lerp(HERO_WALK_CYCLE, HERO_RUN_CYCLE, desiredRun);
    // Analytic integral of inverse stride length during exponential walk/run crossfade.
    // The phase advances only from resolved metres, even when blocked input still requests motion.
    const inverseCycle = Math.log1p(targetCycle * Math.expm1(8 * step) / this.cycleMetres) / (8 * targetCycle * step);
    const advance = travel * inverseCycle * (this.backward && moving ? -1 : 1);
    if (travel > 0) {
      for (const contact of [0, HERO_GAIT_PHASE.rightContact]) {
        this.pendingFootfalls += Math.abs(Math.floor(this.phase + advance - contact + 1e-9) - Math.floor(this.phase - contact + 1e-9));
      }
    } else this.pendingFootfalls = 0;
    this.phase = fraction(this.phase + advance);
    this.distance += travel;
    this.cycleMetres = blend(this.cycleMetres, targetCycle, step, 8);
    this.runWeight = clamp((this.cycleMetres - HERO_WALK_CYCLE) / (HERO_RUN_CYCLE - HERO_WALK_CYCLE), 0, 1);
    this.motionBlend = blend(this.motionBlend, travel > 0 ? 1 : 0, step, 14);
    this.sampleClips();
    if (!dead) {
      this.poseActions(p, step, blade);
      this.twistLegs(this.legYaw);
    }
    // Settle only the late tumble, leaving the upright/early foot contacts untouched. This pivot
    // follows the physics root but never moves it; reset() clears the visual floor correction.
    const deathProgress = this.deadClock / this.actions.get('Dead')!.getClip().duration;
    let support = 0;
    if (this.deadWeight > 0 && deathProgress <= 0.75) {
      // The initial idle-to-fall crossfade can briefly put the boots below the floor. Evaluate only
      // cached sole candidates in visual-pivot space, so the previous support offset cannot feed back.
      this.body.updateWorldMatrix(true, false);
      // SkinnedMesh refreshes bindMatrixInverse in updateMatrixWorld (not updateWorldMatrix).
      this.body.updateMatrixWorld(true);
      let lowest = Infinity;
      const point = new THREE.Vector3();
      for (const { mesh, vertices } of this.soleSamples) for (const vertex of vertices) {
        mesh.getVertexPosition(vertex, point);
        this.body.worldToLocal(mesh.localToWorld(point));
        lowest = Math.min(lowest, point.y);
      }
      support = clamp(-finite(lowest), 0, 0.08);
    }
    const deathY = support - this.deathClearance * this.deadWeight * smooth(clamp((deathProgress - 0.75) / 0.25, 0, 1)) || 0;
    if (this.swim) {
      // The authored strokes carry their own lean: the chest is held at the waterline over the physics root, so the
      // head rides above the surface and the legs trail behind.
      this.body.quaternion.identity();
      this.body.position.set(0, deathY, 0);
      if (this.swimBlend > 1e-3) {
        this.body.updateMatrixWorld(true);
        const chest = this.body.worldToLocal(this.bones['mixamorig:Spine2'].getWorldPosition(new THREE.Vector3())).add(this.body.position);
        this.body.position.set(-this.swimBlend * chest.x, deathY + this.swimBlend * (HERO_SWIM.pivot - chest.y), -this.swimBlend * chest.z);
      }
    } else {
      // The swimming lean turns about the chest, so the head stays at the waterline whatever the pitch.
      const pitch = this.swimBlend * THREE.MathUtils.lerp(HERO_SWIM.treadPitch, HERO_SWIM.strokePitch, this.swimMoving)
        + this.swimBlend * this.swimMoving * 0.06 * Math.sin(this.swimClock * Math.PI * 2);
      this.body.quaternion.setFromAxisAngle(X_AXIS, pitch);
      this.body.position.set(0, deathY + HERO_SWIM.pivot * (1 - Math.cos(pitch)), -HERO_SWIM.pivot * Math.sin(pitch));
    }
    const leftDuty = THREE.MathUtils.lerp(0.472, 0.118, this.runWeight);
    const rightStart = THREE.MathUtils.lerp(0.488, 0.472, this.runWeight);
    const rightDuty = THREE.MathUtils.lerp(0.48, 0.143, this.runWeight);
    this.footContacts = !this.grounded || dead ? [false, false] : travel === 0 ? [true, true] :
      [this.phase <= leftDuty, fraction(this.phase - rightStart) <= rightDuty];
    this.scene.updateMatrixWorld(true);
  }

  private restore(): void {
    for (const [bone, pose] of this.rest) { bone.position.copy(pose.position); bone.quaternion.copy(pose.quaternion); bone.scale.copy(pose.scale); }
  }

  private sampleClips(): void {
    // Undo last frame's overlays, retaining the previous mixer result. Three intentionally skips
    // unchanged properties; restoring bind pose here would break paused idle and clamped death.
    for (const [bone, pose] of this.sampled.size ? this.sampled : this.rest) {
      bone.position.copy(pose.position); bone.quaternion.copy(pose.quaternion); bone.scale.copy(pose.scale);
    }
    // Authored swimming takes over the body as the figure settles into the water.
    const swim = this.swim ? this.swimBlend : 0;
    const live = (1 - this.deadWeight) * (1 - swim);
    if (this.swim) {
      const { stroke, tread } = this.swim, { strokesPerLoop, strokePull, treadPull } = HERO_SWIM_CYCLE;
      // A stroke's pull ends a fifth of the way through its cycle of swimClock (see consumeStrokes).
      for (const action of [stroke, tread]) action.enabled = true;
      stroke.setEffectiveWeight(swim * this.swimMoving * (1 - this.deadWeight));
      tread.setEffectiveWeight(swim * (1 - this.swimMoving) * (1 - this.deadWeight));
      stroke.time = fraction((this.swimClock - 0.2) / strokesPerLoop + strokePull) * stroke.getClip().duration;
      tread.time = fraction(this.swimClock - 0.2 + treadPull) * tread.getClip().duration;
    }
    for (const [name, action] of this.actions) {
      action.enabled = true;
      action.setEffectiveWeight(name === 'Dead' ? this.deadWeight : name === 'RelaxedIdle' ? (1 - this.motionBlend) * live :
        this.motionBlend * (name === 'Running' ? this.runWeight : 1 - this.runWeight) * live);
      action.time = name === 'Walking' ? fraction(this.phase + HERO_GAIT_PHASE.Walking) * action.getClip().duration :
        name === 'Running' ? fraction(this.phase + HERO_GAIT_PHASE.Running) * action.getClip().duration :
        name === 'Dead' ? this.deadClock : 0;
    }
    this.mixer.update(0);
    for (const bone of Object.values(this.bones)) {
      let pose = this.sampled.get(bone);
      if (!pose) { pose = { position: new THREE.Vector3(), quaternion: new THREE.Quaternion(), scale: new THREE.Vector3() }; this.sampled.set(bone, pose); }
      pose.position.copy(bone.position); pose.quaternion.copy(bone.quaternion); pose.scale.copy(bone.scale);
    }
    this.clip = this.deadWeight > 0.5 ? 'Dead' : swim > 0.5 ? (this.swimMoving > 0.5 ? 'SwimStroke' : 'SwimTread')
      : this.motionBlend < 0.05 ? 'RelaxedIdle' : this.runWeight > 0.5 ? 'Running' : 'Walking';
    this.scene.updateMatrixWorld(true);
  }

  /** Rotate in character axes, converted through the actual imported bone parent basis. */
  private rotate(name: HeroBoneName, x: number, y: number, z: number): void {
    if (Math.abs(x) + Math.abs(y) + Math.abs(z) < 1e-10) return;
    const bone = this.bones[name], sceneQ = this.scene.getWorldQuaternion(new THREE.Quaternion());
    const delta = new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));
    delta.premultiply(sceneQ).multiply(sceneQ.clone().invert());
    const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(delta);
    bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
    bone.updateMatrixWorld(true);
  }

  /** Turn the hips and legs by yaw radians about the character's up axis, the spine turning the chest back ahead (A70). */
  private twistLegs(yaw: number): void {
    if (Math.abs(yaw) < 1e-4) return;
    this.rotate('mixamorig:Hips', 0, yaw, 0);
    this.rotate('mixamorig:Spine', 0, -yaw * 0.4, 0);
    this.rotate('mixamorig:Spine1', 0, -yaw * 0.3, 0);
    this.rotate('mixamorig:Spine2', 0, -yaw * 0.3, 0);
  }

  private settleIdleStance(): void {
    this.scene.updateMatrixWorld(true);
    const soles = [Infinity, Infinity];
    this.scene.traverse((object) => {
      const mesh = object as THREE.SkinnedMesh;
      if (!mesh.isSkinnedMesh) return;
      const indices = mesh.geometry.attributes.skinIndex!, weights = mesh.geometry.attributes.skinWeight!;
      const positions = mesh.geometry.attributes.position!;
      for (const [i, side] of (['Left', 'Right'] as const).entries()) {
        const joints = new Set(['Foot', 'ToeBase', 'Toe_End'].map((part) => mesh.skeleton.bones.indexOf(this.bones[`mixamorig:${side}${part}` as HeroBoneName])));
        const point = new THREE.Vector3();
        for (let vertex = 0; vertex < positions.count; vertex++) {
          if (positions.getY(vertex) > 0.04) continue;
          let weight = 0;
          for (let slot = 0; slot < 4; slot++) if (joints.has(indices.getComponent(vertex, slot))) weight += weights.getComponent(vertex, slot);
          if (weight < 0.6) continue;
          mesh.getVertexPosition(vertex, point);
          this.scene.worldToLocal(mesh.localToWorld(point));
          soles[i] = Math.min(soles[i]!, point.y);
        }
      }
    });
    if (!soles.every(Number.isFinite)) return;
    const legData = (['Left', 'Right'] as const).map((side, i) => {
      const thigh = this.bones[`mixamorig:${side}UpLeg`], calf = this.bones[`mixamorig:${side}Leg`], foot = this.bones[`mixamorig:${side}Foot`];
      const target = foot.getWorldPosition(new THREE.Vector3()); target.y -= soles[i]!;
      return { thigh, calf, foot, target, rotation: foot.getWorldQuaternion(new THREE.Quaternion()) };
    });
    this.bones['mixamorig:Hips'].position.y -= Math.min(...soles) + 0.008;
    this.scene.updateMatrixWorld(true);
    const aim = (bone: THREE.Bone, child: THREE.Bone, target: THREE.Vector3) => {
      const start = bone.getWorldPosition(new THREE.Vector3());
      const from = child.getWorldPosition(new THREE.Vector3()).sub(start).normalize();
      const to = target.clone().sub(start).normalize();
      const world = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromUnitVectors(from, to));
      bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world));
      bone.updateMatrixWorld(true);
    };
    for (const { thigh, calf, foot, target, rotation } of legData) {
      const hip = thigh.getWorldPosition(new THREE.Vector3()), knee = calf.getWorldPosition(new THREE.Vector3()), ankle = foot.getWorldPosition(new THREE.Vector3());
      const a = hip.distanceTo(knee), b = knee.distanceTo(ankle), direction = target.clone().sub(hip);
      const length = clamp(direction.length(), Math.abs(a - b) + 1e-6, a + b - 1e-6), axis = direction.normalize();
      const pole = knee.clone().sub(hip).addScaledVector(axis, -knee.clone().sub(hip).dot(axis)).normalize();
      const along = (a * a - b * b + length * length) / (2 * length);
      const nextKnee = hip.clone().addScaledVector(axis, along).addScaledVector(pole, Math.sqrt(Math.max(0, a * a - along * along)));
      aim(thigh, calf, nextKnee); aim(calf, foot, target);
      foot.quaternion.copy(foot.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(rotation));
      foot.updateMatrixWorld(true);
    }
  }

  private poseActions(p: HeroPose, dt: number, blade: boolean): void {
    const target: Partial<Record<HeroBoneName, [number, number, number]>> = {};
    const amp = clamp(finite(p.amp, 1), 0, 1), t = clamp(finite(p.t), 0, 1);
    const arm = (side: 'Left' | 'Right', shoulder: number, elbow: number, out = 0) => {
      target[`mixamorig:${side}Arm`] = [shoulder, 0, out];
      target[`mixamorig:${side}ForeArm`] = [elbow, 0, 0];
    };
    // Breathing belongs only to the derived idle. Never pump arms or reconstruct legs over source gait.
    if (this.motionBlend < 1) target['mixamorig:Spine2'] = [0.006 * Math.sin(this.idleClock * 1.6) * (1 - this.motionBlend) * amp, 0, 0];
    if (blade) arm('Right', -0.10, -0.18);
    switch (p.mode) {
      case 'attack_light': case 'attack_heavy': case 'telegraph': case 'strike': {
        const heavy = p.mode === 'attack_heavy', end = heavy ? 0.48 : 0.34;
        const wind = smooth(clamp(t / end, 0, 1)) * (1 - smooth(clamp((t - end) / 0.22, 0, 1)));
        const strike = Math.sin(Math.PI * clamp((t - end) / (1 - end), 0, 1));
        arm('Right', -(blade ? 1.55 : 0.7) * wind - (blade ? 0.3 : 0.95) * strike, -0.5 * wind - 0.12, 0.08 * strike);
        arm('Left', heavy && blade ? -0.75 * wind : -0.25, -0.5);
        target['mixamorig:Spine2'] = [0.08 * strike, 0.2 * strike - 0.15 * wind, 0];
        break;
      }
      case 'block':
        arm('Right', blade ? -0.65 : -0.55, blade ? -0.8 : -1.25, 0.1);
        arm('Left', -0.5, blade ? -0.65 : -1.25, -0.08);
        target['mixamorig:Spine2'] = [0.07, 0, 0]; break;
      case 'dodge':
        target['mixamorig:Spine2'] = [0.25 * Math.sin(t * Math.PI), 0, 0];
        arm('Left', -0.2, -0.5); arm('Right', -0.2, -0.5); break;
      case 'hurt':
        target['mixamorig:Spine2'] = [-0.2 * Math.sin(t * Math.PI), 0, 0];
        target['mixamorig:Head'] = [-0.09 * Math.sin(t * Math.PI), 0, 0]; break;
      case 'work':
        arm('Left', -0.45, -0.5); arm('Right', -0.45 - 0.05 * Math.sin(this.idleClock * 2.3), -0.55);
        target['mixamorig:Head'] = [0.06, 0, 0]; break;
      case 'talk':
        arm('Right', -0.25, -0.4, Math.sin(this.idleClock * 1.7) * 0.04 * amp); break;
      case 'sit':
        target['mixamorig:LeftUpLeg'] = [-1.15, 0, 0]; target['mixamorig:RightUpLeg'] = [-1.15, 0, 0];
        target['mixamorig:LeftLeg'] = [1.35, 0, 0]; target['mixamorig:RightLeg'] = [1.35, 0, 0];
        this.bones['mixamorig:Hips'].position.y -= 0.4; break;
      case 'swim': {
        if (this.swim) {
          // The authored stroke swims face down; he keeps his chin up to see where he swims, more so the faster he goes.
          target['mixamorig:Neck'] = [-0.4 * this.swimMoving, 0, 0];
          target['mixamorig:Head'] = [-0.45 * this.swimMoving, 0, 0];
          break;
        }
        // Breaststroke: pull wide, tuck the hands under the chin, shoot them forward as the legs kick and glide.
        // Treading water: the hands scull in front and the legs cycle. The two blend by speed.
        const c = fraction(this.swimClock), m = this.swimMoving;
        const stroke = {
          shoulder: cycle(c, [[0, -2.85], [0.2, -1.75], [0.42, -1.95], [0.7, -2.85]]),
          elbow: cycle(c, [[0, -0.05], [0.2, -0.35], [0.42, -1.7], [0.7, -0.1]]),
          out: cycle(c, [[0, 0.1], [0.2, 0.95], [0.42, 0.25], [0.7, 0.08]]),
          thigh: cycle(c, [[0, -0.05], [0.2, -0.3], [0.45, -0.85], [0.62, -0.1]]),
          knee: cycle(c, [[0, 0.1], [0.2, 0.45], [0.45, 1.6], [0.62, 0.15]]),
          spread: cycle(c, [[0, 0], [0.4, 0.3], [0.6, 0.12]]),
        };
        const s = Math.sin(c * Math.PI * 2), k = Math.cos(c * Math.PI * 2);
        const mix = (tread: number, swim: number) => tread + (swim - tread) * m;
        arm('Left', mix(-1.25, stroke.shoulder), mix(-0.6, stroke.elbow), mix(0.35 + 0.3 * s, stroke.out) * amp);
        arm('Right', mix(-1.25, stroke.shoulder), mix(-0.6, stroke.elbow), -mix(0.35 + 0.3 * s, stroke.out) * amp);
        target['mixamorig:LeftUpLeg'] = [mix(-0.5 + 0.3 * s, stroke.thigh), 0, mix(0.1, stroke.spread)];
        target['mixamorig:RightUpLeg'] = [mix(-0.5 - 0.3 * s, stroke.thigh), 0, -mix(0.1, stroke.spread)];
        target['mixamorig:LeftLeg'] = [mix(0.9 + 0.4 * k, stroke.knee), 0, 0];
        target['mixamorig:RightLeg'] = [mix(0.9 - 0.4 * k, stroke.knee), 0, 0];
        // Chin up to look where he swims; the lean is the body's, so the neck takes back most of it.
        target['mixamorig:Neck'] = [-0.25 - 0.2 * m, 0, 0];
        target['mixamorig:Head'] = [-0.15 - 0.35 * m, 0, 0];
        target['mixamorig:Spine2'] = [-0.08 * m, 0, 0];
        break;
      }
      default: break;
    }
    if (!this.grounded && p.mode !== 'swim') {
      // Only an airborne fallback pose; the physics solver supplies all actual jump displacement.
      target['mixamorig:LeftUpLeg'] = [-0.18, 0, 0]; target['mixamorig:RightUpLeg'] = [-0.14, 0, 0];
      target['mixamorig:LeftLeg'] = [0.35, 0, 0]; target['mixamorig:RightLeg'] = [0.3, 0, 0];
      arm('Left', -0.12, -0.28); arm('Right', -0.12, -0.28);
    }
    // Each action fades in at its own pace when it takes over and hands back at its own when it ends; a stronger action
    // (hurt over attack over guard) takes over at once, whatever was fading (A70).
    const now = overlayOf(p.mode);
    if (now !== this.overlay) { this.overlayFrom = this.overlay; this.overlay = now; }
    const next = HERO_ACTION_FADE[this.overlay]!, from = HERO_ACTION_FADE[this.overlayFrom]!;
    const rate = 3 / (next.priority >= from.priority ? next.in : from.out);
    // Only sitting, swimming and the airborne pose may move the legs: every other action is an upper-body overlay over
    // the authored gait, which keeps its contact with the ground (A70).
    const legs = p.mode === 'sit' || p.mode === 'swim' || !this.grounded;
    for (const name of HERO_BONES) {
      const desired = !legs && LOWER_BODY.has(name) ? [0, 0, 0] : target[name] ?? [0, 0, 0];
      const values = desired.map((value, i) => {
        const key = `${name}:${i}`, next = blend(this.angles.get(key) ?? 0, value, dt, rate);
        this.angles.set(key, next); return next;
      });
      this.rotate(name, values[0]!, values[1]!, values[2]!);
    }
    const fighting = p.mode === 'block' || p.mode.startsWith('attack');
    for (const side of ['Left', 'Right'] as const) {
      const key = `grip:${side}`, desired = fighting ? 1 : side === 'Right' && blade ? 0.82 : 0;
      const amount = blend(this.angles.get(key) ?? 0, desired, dt, 22);
      this.angles.set(key, amount);
      for (const finger of HERO_FINGERS) for (const joint of [1, 2, 3, 4] as const) {
        const name = `mixamorig:${side}Hand${finger}${joint}` as HeroBoneName;
        this.bones[name].quaternion.slerp(this.gripPose.get(name)!, amount);
      }
    }
  }
}
