import * as THREE from 'three';

/**
 * Turning on the spot and settling a stride with real steps (A71): the feet lift and re-plant alternately in a pivot
 * pattern while the body turns above them, rather than a walk cycle played in place (which slides the planted foot) or
 * a statue turned on a turntable.
 *
 * The step pattern is an authored clip, `turn.left` / `turn.right`, built at load from the figure's own walk: each leg's
 * mid-swing pose (its knee most bent) is read from the walk clip and eased in and out of the figure's stand pose, the
 * leading foot (the side turned toward) in the first half of the cycle, the trailing foot in the second. The clip moves
 * only the legs and keeps the root in place. It is applied as a layer relative to the stand pose, so whatever idle plays
 * beneath keeps its upper body, and the feet are held where they were planted by a two-joint reach: a planted foot does
 * not slide while the hips turn over it, a lifted one travels to where it lands.
 *
 * Fades follow the recovered Gothic 3 animation instruction: a phase that begins or ends (`_Begin_` / `_End_`) fades in
 * or out over 0.1 s (the standard animation fade, Game 2069e184); see src/gothic3/animation-instruction.ts. Only that
 * timing is used, no Gothic 3 data.
 */
export const TURN_STEP = {
  /** Seconds a full two-step cycle takes at rate 1. */
  duration: 0.7,
  /** The leading foot is in the air over this part of the cycle, the trailing foot over the next. */
  lead: [0.04, 0.48] as const,
  trail: [0.52, 0.96] as const,
  /** Fade in and out, seconds (the Gothic phase fade). */
  fade: 0.1,
  /** How much of the walk's mid-swing pose a turning step takes: a pivot step is lower than a stride. */
  swing: 0.6,
  /** Keyframes per clip. */
  samples: 25,
  /** A foot this near where it would land (metres) keeps its place rather than taking a step. */
  stay: 0.03,
} as const;

export type Side = 'Left' | 'Right';
export const SIDES = ['Left', 'Right'] as const;
export interface LegChain { upper: THREE.Bone; lower: THREE.Bone; foot: THREE.Bone }
export type Legs = Record<Side, LegChain>;

/** A track's own interpolant (spherical for quaternions); typed loosely in three's declarations. */
const interpolant = (track: THREE.KeyframeTrack) => (track as unknown as { createInterpolant(): THREE.Interpolant }).createInterpolant();
const smooth = (v: number) => { const t = Math.min(1, Math.max(0, v)); return t * t * (3 - 2 * t); };
/** Where a foot is in its swing, 0..1, and 0 outside it. */
export function swingOf(side: Side, lead: Side, u: number): number {
  const [from, to] = side === lead ? TURN_STEP.lead : TURN_STEP.trail;
  return Math.min(1, Math.max(0, (u - from) / (to - from)));
}
/** How far a foot is lifted at cycle point u: up and down again once over its swing. */
export function liftOf(side: Side, lead: Side, u: number): number {
  const s = swingOf(side, lead, u);
  return Math.sin(Math.PI * s) ** 2;
}

/**
 * Build `turn.left` and `turn.right` for a figure: the legs eased from `stand` toward the walk's mid-swing pose of each
 * leg in turn. Returns null when the walk lacks the legs' tracks.
 */
export function buildTurnClips(legs: Legs, stand: ReadonlyMap<THREE.Bone, THREE.Quaternion>, walk: THREE.AnimationClip):
  Record<Side, THREE.AnimationClip> | null {
  const trackOf = (bone: THREE.Bone) => walk.tracks.find((track) => track.name === `${bone.name}.quaternion`);
  const swingPose = new Map<THREE.Bone, THREE.Quaternion>();
  for (const side of SIDES) {
    const chain = legs[side], knee = trackOf(chain.lower), rest = stand.get(chain.lower);
    if (!knee || !rest) return null;
    // Mid-swing: the knee most bent from its stand pose.
    let best = 0, bend = -1;
    const q = new THREE.Quaternion();
    for (let k = 0; k < knee.times.length; k++) {
      const angle = q.fromArray(knee.values, k * 4).normalize().angleTo(rest);
      if (angle > bend) { bend = angle; best = knee.times[k]!; }
    }
    for (const bone of [chain.upper, chain.lower, chain.foot]) {
      const track = trackOf(bone), from = stand.get(bone);
      if (!track || !from) return null;
      const value = interpolant(track).evaluate(best);
      swingPose.set(bone, new THREE.Quaternion().fromArray(value).normalize());
    }
  }
  const clip = (lead: Side) => {
    const tracks: THREE.KeyframeTrack[] = [];
    const times = Array.from({ length: TURN_STEP.samples }, (_, i) => (i / (TURN_STEP.samples - 1)) * TURN_STEP.duration);
    for (const side of SIDES) for (const bone of [legs[side].upper, legs[side].lower, legs[side].foot]) {
      const from = stand.get(bone)!, to = swingPose.get(bone)!, q = new THREE.Quaternion(), values: number[] = [];
      for (const time of times) values.push(...q.copy(from).slerp(to, TURN_STEP.swing * liftOf(side, lead, time / TURN_STEP.duration)).toArray());
      tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, values));
    }
    return new THREE.AnimationClip(`turn.${lead.toLowerCase()}`, TURN_STEP.duration, tracks);
  };
  return { Left: clip('Left'), Right: clip('Right') };
}

const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _ba = new THREE.Vector3(), _bc = new THREE.Vector3();
const _axis = new THREE.Vector3(), _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _qp = new THREE.Quaternion(), _turn = new THREE.Quaternion();
const UP = new THREE.Vector3(0, 1, 0);
const LAND = new THREE.Vector3(), TARGET = new THREE.Vector3(), GOAL = new THREE.Vector3();
const LAND_TURN = new THREE.Quaternion(), SOLE = new THREE.Quaternion(), PITCH = new THREE.Quaternion(), ATTITUDE = new THREE.Quaternion(), SPIN = new THREE.Quaternion();

/** Two-joint reach in world space: the ankle onto `target`, the foot then given the world attitude `sole`. */
export function reachFoot(chain: LegChain, target: THREE.Vector3, sole: THREE.Quaternion): void {
  const { upper, lower, foot } = chain;
  if (!upper.parent) return;
  const a = upper.getWorldPosition(_a), b = lower.getWorldPosition(_b), c = foot.getWorldPosition(_c);
  const first = a.distanceTo(b), second = b.distanceTo(c);
  if (first < 1e-4 || second < 1e-4) return;
  // Stretching the leg further than the pose has it approaches full stretch ever more slowly (the knee's angle runs away
  // as the leg straightens), continuous with the pose itself: no snap where the reach begins or nears its end.
  const now = c.distanceTo(a), room = Math.max(0, first + second - 1e-3 - now);
  let reach = target.distanceTo(a);
  if (reach > now) reach = room > 1e-6 ? now + room * -Math.expm1(-(reach - now) / room) : now;
  reach = Math.max(reach, Math.abs(first - second) + 1e-3);
  const ba = _ba.subVectors(a, b), bc = _bc.subVectors(c, b);
  const wanted = Math.acos(THREE.MathUtils.clamp((first * first + second * second - reach * reach) / (2 * first * second), -1, 1));
  const qUpper = upper.getWorldQuaternion(_qa), qLower = lower.getWorldQuaternion(_qb);
  const axis = _axis.crossVectors(ba, bc);
  if (axis.lengthSq() > 1e-12) {
    _turn.setFromAxisAngle(axis.normalize(), wanted - ba.angleTo(bc));
    qLower.premultiply(_turn);
    c.sub(b).applyQuaternion(_turn).add(b);
  }
  _turn.setFromUnitVectors(_ba.subVectors(c, a).normalize(), _bc.subVectors(target, a).normalize());
  qUpper.premultiply(_turn);
  qLower.premultiply(_turn);
  upper.quaternion.copy(upper.parent.getWorldQuaternion(_qp).invert().multiply(qUpper));
  lower.quaternion.copy(_qp.copy(qUpper).invert().multiply(qLower));
  foot.quaternion.copy(_qp.copy(qLower).invert().multiply(sole));
  upper.updateMatrixWorld(true);
}

interface Foot {
  /** Where the foot stands (world, horizontal used) and its world attitude, while planted. */
  at: THREE.Vector3; turn: THREE.Quaternion;
  /** Where it lifted off, while in the air. */
  from: THREE.Vector3; fromTurn: THREE.Quaternion;
  planted: boolean;
  /** Whether this cycle has settled if the foot steps (it stays put when already where it would land). */
  decided: boolean;
  /** This frame: the ankle and its attitude from the pose beneath, without and with the step layer. */
  flat: THREE.Vector3; flatTurn: THREE.Quaternion; home: THREE.Vector3; homeTurn: THREE.Quaternion;
}
const newFoot = (): Foot => ({
  at: new THREE.Vector3(), turn: new THREE.Quaternion(), from: new THREE.Vector3(), fromTurn: new THREE.Quaternion(),
  planted: true, decided: false, flat: new THREE.Vector3(), flatTurn: new THREE.Quaternion(), home: new THREE.Vector3(), homeTurn: new THREE.Quaternion(),
});

/** What to do this frame. */
export interface StepInput {
  /** Seconds since the last frame. */
  dt: number;
  /** Start (or carry on into) a cycle led by this foot; null to let the steps come to rest. */
  lead: Side | null;
  /** How far through the cycle to move this frame (cycle fractions). */
  advance: number;
  /** A lifted foot lands where its home will be once the body has turned this much more about `pivot` (radians, world up). */
  anticipate?: number;
  pivot?: THREE.Vector3;
  /** Keep the feet where they stand even with no cycle running (standing still while the body turns above them). */
  hold?: boolean;
  /** At a cycle's end with no lead asked for, step once more if a foot still stands this far (metres) from home. */
  settleBeyond?: number;
  /**
   * Between cycles, a planted foot within TURN_STEP.stay of home creeps there at this many metres a second (the last
   * centimetre of a settling step, too small to step), so a figure standing still does not stand off its pose for good.
   */
  creep?: number;
  /** Take hold at once rather than fading in: right for a hold that starts from the pose as it stands. */
  engage?: boolean;
  /** Let go at once (fading out): the feet follow the pose beneath again. */
  release?: boolean;
}

/**
 * Plays a figure's turn clips as a step layer over its pose and keeps its feet where they stand (A71). Call
 * {@link restore} before the pose beneath is rebuilt if nothing else gives the legs back, then {@link update} after it.
 */
export class TurnSteps {
  private readonly feet: Record<Side, Foot> = { Left: newFoot(), Right: newFoot() };
  private readonly interpolants = new Map<string, THREE.Interpolant>();
  private readonly stand: Map<THREE.Bone, THREE.Quaternion>;
  private readonly saved = new Map<THREE.Bone, THREE.Quaternion>();
  private leadSide: Side | null = null;
  private u = 0;
  private weight = 0;
  private held = false;
  private footfalls = 0;

  constructor(private readonly legs: Legs, readonly clips: Record<Side, THREE.AnimationClip>, stand: ReadonlyMap<THREE.Bone, THREE.Quaternion>) {
    this.stand = new Map([...stand].map(([bone, q]) => [bone, q.clone()]));
    for (const side of SIDES) for (const track of clips[side].tracks) this.interpolants.set(`${side}:${track.name}`, interpolant(track));
  }

  /** The cycle's lead foot while a cycle runs, else null. */
  get cycling(): Side | null { return this.leadSide; }
  /** How far through the cycle, 0..1. */
  get progress(): number { return this.u; }
  /** How much the steps lead the legs, 0..1 (fading in and out). */
  get influence(): number { return smooth(this.weight); }
  /** Whether each foot is on the ground: [left, right]. */
  get contacts(): readonly [boolean, boolean] {
    return [this.feet.Left.planted, this.feet.Right.planted];
  }
  /** Where a planted foot stands (world), or null in the air or with no hold. */
  planted(side: Side): THREE.Vector3 | null { return this.held && this.feet[side].planted ? this.feet[side].at : null; }
  /** Feet set down since the last call. */
  consumeFootfalls(): number { const n = this.footfalls; this.footfalls = 0; return n; }

  /** Let go of everything at once (a reset). */
  reset(): void {
    this.leadSide = null; this.u = 0; this.weight = 0; this.held = false; this.footfalls = 0;
    for (const side of SIDES) { this.feet[side].planted = true; this.feet[side].decided = false; }
  }

  /** Give the legs back the pose they had before the last update. */
  restore(): void {
    for (const [bone, q] of this.saved) bone.quaternion.copy(q);
    this.saved.clear();
  }

  update(input: StepInput): void {
    const dt = Number.isFinite(input.dt) ? Math.max(0, input.dt) : 0;
    const starting = input.lead !== null && !input.release;
    if (this.leadSide === null && starting) { this.leadSide = input.lead; this.u = 0; for (const side of SIDES) this.feet[side].decided = false; }
    this.weight = (this.leadSide !== null || input.hold) && !input.release ? (input.engage && !this.held ? 1 : Math.min(1, this.weight + dt / TURN_STEP.fade)) : Math.max(0, this.weight - dt / TURN_STEP.fade);
    if (input.release) { this.leadSide = null; this.u = 0; }
    if (this.weight <= 0 && this.leadSide === null) { this.held = false; for (const side of SIDES) this.feet[side].planted = true; return; }
    const w = smooth(this.weight);
    // The pose beneath, then the step layer over it.
    this.measure('flat');
    for (const side of SIDES) for (const bone of [this.legs[side].upper, this.legs[side].lower, this.legs[side].foot]) {
      if (!this.saved.has(bone)) this.saved.set(bone, bone.quaternion.clone());
    }
    if (this.leadSide !== null) this.u = Math.min(1, this.u + Math.max(0, input.advance));
    if (this.leadSide !== null) {
      const time = this.u * TURN_STEP.duration;
      for (const side of SIDES) for (const bone of [this.legs[side].upper, this.legs[side].lower, this.legs[side].foot]) {
        const value = this.interpolants.get(`${this.leadSide}:${bone.name}.quaternion`)?.evaluate(time);
        if (!value) continue;
        // The clip relative to the stand pose, laid over whatever the legs are doing.
        _qa.fromArray(value).normalize().premultiply(_qb.copy(this.stand.get(bone)!).invert());
        bone.quaternion.multiply(_qb.identity().slerp(_qa, w)).normalize();
      }
    }
    this.measure('home');
    if (!this.held) {
      for (const side of SIDES) {
        const foot = this.feet[side];
        foot.at.copy(foot.flat); foot.turn.copy(foot.flatTurn); foot.planted = true;
      }
      this.held = true;
    }
    const lead = this.leadSide;
    if (lead === null && input.creep) for (const side of SIDES) {
      const foot = this.feet[side], gap = Math.hypot(foot.at.x - foot.flat.x, foot.at.z - foot.flat.z);
      if (!foot.planted || gap > TURN_STEP.stay) continue;
      const k = gap <= input.creep * dt ? 1 : (input.creep * dt) / gap;
      foot.at.lerp(foot.flat, k); foot.turn.slerp(foot.flatTurn, k);
    }
    const angle = input.anticipate ?? 0;
    for (const side of SIDES) {
      const foot = this.feet[side], chain = this.legs[side];
      // Where it would land: under the body as the pose beneath has it, turned on by what is still to come.
      const land = LAND.copy(foot.flat);
      const landTurn = LAND_TURN.copy(foot.flatTurn);
      if (angle !== 0 && input.pivot) {
        SPIN.setFromAxisAngle(UP, angle);
        land.sub(input.pivot).applyQuaternion(SPIN).add(input.pivot);
        landTurn.premultiply(SPIN);
      }
      const s1 = lead ? swingOf(side, lead, this.u) : 1;
      if (lead && !foot.decided && foot.planted && s1 > 0) {
        // Lifting off, unless it already stands where it would land.
        foot.decided = true;
        if (Math.hypot(foot.at.x - land.x, foot.at.z - land.z) >= TURN_STEP.stay) { foot.planted = false; foot.from.copy(foot.at); foot.fromTurn.copy(foot.turn); }
      }
      const target = TARGET, sole = SOLE;
      if (!foot.planted) {
        const s = smooth(s1);
        target.copy(foot.from).lerp(land, s);
        sole.copy(foot.fromTurn).slerp(landTurn, s);
        if (s1 >= 1 || !lead) {
          foot.planted = true; foot.at.copy(land); foot.turn.copy(landTurn); this.footfalls++;
          target.copy(land); sole.copy(landTurn);
        }
      } else { target.copy(foot.at); sole.copy(foot.turn); }
      // Height from the pose beneath and the step's lift; the foot's pitch in the air from the step layer.
      const lifted = foot.planted ? 0 : foot.home.y - foot.flat.y;
      const goal = GOAL.set(
        THREE.MathUtils.lerp(foot.flat.x, target.x, w), foot.flat.y + lifted, THREE.MathUtils.lerp(foot.flat.z, target.z, w));
      const attitude = ATTITUDE.copy(foot.flatTurn).slerp(sole, w);
      if (!foot.planted) attitude.premultiply(PITCH.copy(foot.homeTurn).multiply(SPIN.copy(foot.flatTurn).invert()));
      reachFoot(chain, goal, attitude);
    }
    if (lead && this.u >= 1) {
      // The cycle is done: carry on with another if still asked to, else come to rest.
      if (starting) { this.u = 0; this.leadSide = input.lead; for (const side of SIDES) this.feet[side].decided = false; }
      else if (input.settleBeyond !== undefined && SIDES.some((side) =>
        Math.hypot(this.feet[side].at.x - this.feet[side].flat.x, this.feet[side].at.z - this.feet[side].flat.z) > input.settleBeyond!)) {
        this.u = 0; for (const side of SIDES) this.feet[side].decided = false;
      } else this.leadSide = null;
    }
  }

  private measure(which: 'flat' | 'home'): void {
    for (const side of SIDES) {
      const foot = this.feet[side], bone = this.legs[side].foot;
      bone.updateWorldMatrix(true, false);
      bone.getWorldPosition(which === 'flat' ? foot.flat : foot.home);
      bone.getWorldQuaternion(which === 'flat' ? foot.flatTurn : foot.homeTurn);
    }
  }
}
