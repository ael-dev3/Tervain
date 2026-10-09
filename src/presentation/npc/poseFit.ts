import * as THREE from 'three';
import { ANGLE_KEYS, applyRigAngles, GESTURE_DEFAULTS, type ArmAngles, type Rig } from '../characters';
import { reachArm } from './armReach';
import { weldExact } from './weld';
import { seatLegs, type SeatMeasure } from './seat';
import type { WorkPropKind } from './workProps';

/**
 * Poses fitted to each resident's own body.
 *
 * The poser's angles were written once for every figure, but the prepared residents range from a slight steward to a
 * pack-laden fisher and an aproned baker: the same hanging arm that clears one figure's hips runs another's hand into
 * a skirt, and the same crossed forearms that rest on one chest sink into a broader one. On load each model is measured:
 * its torso, hips, thighs and shins become radial envelopes around their joints, its forearms and hands a few dozen
 * sample points, and short searches find the arm angles that keep those samples just outside the body for the hanging
 * arm (standing, walking and talking) and for the standing gestures that touch it (crossed arms, hands on hips, hands
 * behind the back, hands clasped before the belt). The poser blends to those angles; nothing is simulated per frame.
 */
export const NPC_POSE_FIT_PROFILE = 'resident-pose-fit-v1';
/** Air left between a resting hand or forearm and the body or garment it rests against, metres. */
export const POSE_CLEARANCE = 0.012;
/** Most outward lift a standing arm takes, and the most more a walking swing adds (rad); past these a stance would read as stiff. */
export const HANG_LIMIT = 0.24;
/** A placed gesture may rest this far into a garment's envelope before it is given up (metres). */
export const GESTURE_TOLERANCE = 0.025;
export const SWING_LIMIT = 0.2;

type ArmFit = ArmAngles;

/** The resident tasks drawn with tools in hand. */
export type FittedWork = 'writing' | 'provisioning' | 'stonework' | 'measuring';
export type WorkHolder = 'handL' | 'handR' | 'lap';

export interface WorkFit {
  a: [ArmFit, ArmFit];
  b: [ArmFit, ArmFit];
  /** Each tool's place relative to its holder (a palm socket under the elbow joint, or the hips for the lap). */
  props: { kind: WorkPropKind; holder: WorkHolder; position: [number, number, number]; quaternion: [number, number, number, number]; length?: number }[];
}

/**
 * Where a working resident's surface or tool stands, relative to their feet (metres): the counter, the rock face. These
 * fit only the procedural poser, kept for a resident whose own rig fails to load; residents on their own rigs reach the
 * real surfaces at their posts (npc/workSites.ts, A70).
 */
export const WORK_SITES = {
  /** The supplier's counter top and how far before him it begins. */
  counter: { height: 1.02, reach: 0.42 },
  /** The quarry face where a hand dresses stone. */
  face: { reach: 0.52 },
  /** The ledger on the lap of a resident writing on a bench. */
  bench: 0.55,
} as const;

export interface NpcPoseFit {
  profile: string;
  /** Extra outward lift (rad) that keeps each hanging arm clear of hips, thighs and skirt: [left, right]. */
  hang: [number, number];
  /** Further lift at the forward and back ends of a walking swing: [[left forward, left back], [right forward, right back]]. */
  swing: [[number, number], [number, number]];
  crossed: [ArmFit, ArmFit];
  hips: [ArmFit, ArmFit];
  behind: [ArmFit, ArmFit];
  clasped: [ArmFit, ArmFit];
  /** The arms carry a garment panel (cape, apron, pack): smaller swings, no gestures that lift the arms off the body. */
  garmentArms: boolean;
  /**
   * Gestures whose reach could not be placed clear of the body and kept their written angles, e.g. `crossedR (clip)`.
   * The poser does not choose these for the figure's routine; only a forced gesture (the people tool) still shows them.
   */
  unplaced: string[];
  /**
   * Sitting, in the model's bind metres: how far the seat contact (buttocks and thigh backs, thighs level) lies below
   * the hip joint, the hip-to-knee length and the knee's height above the soles.
   */
  seat: SeatMeasure;
  /** Palms resting on the thighs for a seat of a given height (metres above the ground), nearest used. */
  seatedHands: { height: number; arms: [ArmFit, ArmFit] }[];
  /** Tasks with tools: two key poses of both arms, blended by the poser, and where each tool sits. */
  work: Partial<Record<FittedWork, WorkFit>>;
  /** Deepest a forearm or hand reached into the body beyond its allowance, unfitted and fitted rest pose, metres. */
  rest: { before: number; after: number };
}

const BODY_BONES = ['torso', 'hips', 'legL', 'legR', 'kneeL', 'kneeR', 'head'] as const;
type BodyBone = (typeof BODY_BONES)[number];
const SECTORS = 24, SLICE = 0.02;

/** Outer radial envelope of the surface a joint carries, around a vertical axis through its pivot (bind frame). */
class Envelope {
  private readonly radius: Float32Array;
  private readonly low: number;
  private readonly slices: number;
  constructor(points: readonly THREE.Vector3[]) {
    let low = Infinity, high = -Infinity;
    for (const p of points) { low = Math.min(low, p.y); high = Math.max(high, p.y); }
    this.low = low;
    this.slices = Number.isFinite(low) ? Math.max(1, Math.ceil((high - low) / SLICE) + 1) : 0;
    this.radius = new Float32Array(this.slices * SECTORS);
    for (const p of points) {
      const cell = this.cell(p);
      if (cell >= 0) this.radius[cell] = Math.max(this.radius[cell]!, Math.hypot(p.x, p.z));
    }
    // A sparse slice can leave a direction empty; such a gap is not an opening in the body.
    for (let slice = 0; slice < this.slices; slice++) {
      const values = Array.from(this.radius.subarray(slice * SECTORS, (slice + 1) * SECTORS)).filter(v => v > 0).sort((a, b) => a - b);
      const fill = values[Math.floor(values.length / 2)] ?? 0;
      for (let sector = 0; sector < SECTORS; sector++) {
        const at = slice * SECTORS + sector;
        if (this.radius[at] === 0) this.radius[at] = Math.min(fill, Math.max(this.radius[slice * SECTORS + (sector + 1) % SECTORS]!, this.radius[slice * SECTORS + (sector + SECTORS - 1) % SECTORS]!) || fill);
      }
    }
  }
  private cell(p: THREE.Vector3) {
    const slice = Math.floor((p.y - this.low) / SLICE);
    if (slice < 0 || slice >= this.slices) return -1;
    const sector = Math.min(SECTORS - 1, Math.floor((Math.atan2(p.z, p.x) + Math.PI) / (2 * Math.PI) * SECTORS));
    return slice * SECTORS + sector;
  }
  /** The envelope's radius at a height and direction (this joint's bind frame); 0 beyond its ends. */
  radiusToward(y: number, angle: number): number {
    const p = new THREE.Vector3(Math.cos(angle) * 0.01, y, Math.sin(angle) * 0.01);
    const cell = this.cell(p);
    return cell < 0 ? 0 : this.radius[cell]!;
  }
  /** How far a point (in this joint's bind frame) lies inside the envelope; negative outside, -Infinity beyond its ends. */
  depth(p: THREE.Vector3): number {
    const cell = this.cell(p);
    return cell < 0 ? -Infinity : this.radius[cell]! - Math.hypot(p.x, p.z);
  }
}

interface Sample {
  bone: THREE.Bone;
  offset: THREE.Vector3;
  /** How deep the point already lay in the body as the figure was made (a hand resting on a coat or pouch). */
  rest: number;
}

export interface PoseFitBody {
  envelopes: Map<BodyBone, { bone: THREE.Bone; pivot: THREE.Vector3; envelope: Envelope }>;
  samples: [Sample[], Sample[]];
  /** Forearm and hand samples only, for gestures that bring the hands to the body. */
  hands: [Sample[], Sample[]];
  /** Seat and thigh-underside points (buttocks, backs of thighs, skirt behind), for resting on a seat. */
  seat: Sample[];
  /** Lowest sole height and the knee's bind height (model frame). */
  sole: number;
}

/** Measure a bound resident: envelopes of the body's joints and sample points on both forearms and hands. */
export function measureBody(rig: Rig, mesh: THREE.SkinnedMesh): PoseFitBody {
  const scene = mesh.parent!;
  scene.updateMatrixWorld(true);
  const bones = mesh.skeleton.bones;
  const names = bones.map(bone => bone.name);
  const byName = (name: string) => bones[names.indexOf(name)]!;
  const pivot = (bone: THREE.Bone) => scene.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
  const position = mesh.geometry.getAttribute('position'), index = mesh.geometry.getAttribute('skinIndex'), weight = mesh.geometry.getAttribute('skinWeight');
  const buckets = new Map<BodyBone, THREE.Vector3[]>(BODY_BONES.map(name => [name, []]));
  const seatPoints: { p: THREE.Vector3; bone: BodyBone }[] = [];
  let sole = Infinity;
  const arm: [THREE.Vector3[], THREE.Vector3[]] = [[], []], hand: [THREE.Vector3[], THREE.Vector3[]] = [[], []];
  const local = new THREE.Matrix4().copy(scene.matrixWorld).invert().multiply(mesh.matrixWorld);
  for (const vertex of weldExact(position).first) {
    const w: Record<string, number> = {};
    for (let slot = 0; slot < 4; slot++) { const amount = weight.getComponent(vertex, slot); if (amount > 0) w[names[index.getComponent(vertex, slot)]!] = (w[names[index.getComponent(vertex, slot)]!] ?? 0) + amount; }
    const p = new THREE.Vector3().fromBufferAttribute(position, vertex).applyMatrix4(local);
    const left = (w.armL ?? 0) + (w.elbowL ?? 0), right = (w.armR ?? 0) + (w.elbowR ?? 0);
    if (left > 0.9 || right > 0.9) {
      const side = left > 0.9 ? 0 : 1;
      arm[side].push(p);
      if ((w[side === 0 ? 'elbowL' : 'elbowR'] ?? 0) > 0.9) hand[side].push(p);
      continue;
    }
    if (left > 0.1 || right > 0.1) continue;
    let best: BodyBone | null = null, bestWeight = 0;
    for (const name of BODY_BONES) if ((w[name] ?? 0) > bestWeight) { best = name; bestWeight = w[name]!; }
    if (best && bestWeight >= 0.5) buckets.get(best)!.push(p);
    if (best === 'kneeL' || best === 'kneeR') sole = Math.min(sole, p.y);
    if ((best === 'hips' || best === 'legL' || best === 'legR') && p.y > 0.55 && p.y < 1.05) seatPoints.push({ p, bone: best });
  }
  const envelopes = new Map<BodyBone, { bone: THREE.Bone; pivot: THREE.Vector3; envelope: Envelope }>();
  for (const name of BODY_BONES) {
    const bone = byName(name), at = pivot(bone);
    envelopes.set(name, { bone, pivot: at, envelope: new Envelope(buckets.get(name)!.map(p => p.clone().sub(at))) });
  }
  // Forearms, hands and the lower upper arm (the armpit always touches the side and is the shoulder blend's to manage).
  const pick = (points: THREE.Vector3[], side: number, count: number, onlyHand: boolean): Sample[] => {
    const shoulder = pivot(byName(side === 0 ? 'armL' : 'armR'));
    const elbow = byName(side === 0 ? 'elbowL' : 'elbowR'), upper = byName(side === 0 ? 'armL' : 'armR');
    const elbowAt = pivot(elbow);
    const usable = points.filter(p => p.distanceTo(shoulder) > 0.18 && (!onlyHand || p.y < elbowAt.y - 0.05));
    const step = Math.max(1, Math.floor(usable.length / count));
    const chosen: Sample[] = [];
    for (let i = 0; i < usable.length && chosen.length < count; i += step) {
      const p = usable[i]!, bone = p.y < elbowAt.y ? elbow : upper;
      chosen.push({ bone, offset: p.clone().sub(pivot(bone)), rest: 0 });
    }
    return chosen;
  };
  void rig;
  const seatStep = Math.max(1, Math.floor(seatPoints.length / 160));
  const seat: Sample[] = [];
  for (let i = 0; i < seatPoints.length; i += seatStep) {
    const { p, bone } = seatPoints[i]!, at = envelopes.get(bone)!;
    seat.push({ bone: at.bone, offset: p.clone().sub(at.pivot), rest: 0 });
  }
  const body: PoseFitBody = {
    envelopes,
    samples: [pick(arm[0], 0, 90, false), pick(arm[1], 1, 90, false)],
    hands: [pick(hand[0], 0, 60, true), pick(hand[1], 1, 60, true)],
    seat,
    sole: Number.isFinite(sole) ? sole : 0,
  };
  // As bound, every point sits where the figure was made; record how deep each already was.
  for (const set of [...body.samples, ...body.hands]) for (const sample of set) sample.rest = sampleDepth(body, sample);
  return body;
}

const _inverse = new THREE.Matrix4(), _world = new THREE.Vector3(), _local = new THREE.Vector3();

function sampleDepth(body: PoseFitBody, sample: Sample, inverses?: Map<BodyBone, THREE.Matrix4>): number {
  let worst = -Infinity;
  _world.copy(sample.offset).applyMatrix4(sample.bone.matrixWorld);
  for (const [name, { bone, envelope }] of body.envelopes) {
    // Bones keep identity axes at bind, so a joint's bind frame is its inverse world transform.
    _local.copy(_world).applyMatrix4(inverses?.get(name) ?? _inverse.copy(bone.matrixWorld).invert());
    worst = Math.max(worst, envelope.depth(_local));
  }
  return worst;
}

/**
 * How far one side's arm reaches into the body for the rig's current joint angles (scene must be updated), beyond what
 * is allowed: `margin` of air, or no deeper than the point already lay as the figure was made. Positive is a clip.
 */
export function sideExcess(body: PoseFitBody, side: 0 | 1, handsOnly = false, margin = POSE_CLEARANCE): number {
  let worst = -Infinity;
  const inverses = new Map<BodyBone, THREE.Matrix4>();
  for (const [name, { bone }] of body.envelopes) inverses.set(name, new THREE.Matrix4().copy(bone.matrixWorld).invert());
  for (const sample of (handsOnly ? body.hands : body.samples)[side]) {
    worst = Math.max(worst, sampleDepth(body, sample, inverses) - Math.max(-margin, sample.rest));
  }
  return worst;
}

/** The poser's plain standing pose without breath or gesture. */
export const REST_ANGLES: Readonly<Record<string, number>> = {
  ...Object.fromEntries(ANGLE_KEYS.map(key => [key, 0])),
  armLx: 0.04, armRx: 0.04, armLz: 0.11, armRz: -0.11, elbowL: -0.18, elbowR: -0.18, kneeL: 0.06, kneeR: 0.06, torsoX: 0.04, headX: 0.05,
};

/**
 * Fit the standing gestures and the hanging arm to one measured body. The rig is posed while searching and returned to
 * its bind pose afterwards.
 */
export function fitNpcPoses(rig: Rig, body: PoseFitBody, palms: [THREE.Vector3, THREE.Vector3], garmentArms = false): NpcPoseFit {
  const scene = rig.root;
  const angles: Record<string, number> = { ...REST_ANGLES };
  const pose = (changes: Record<string, number>) => {
    Object.assign(angles, REST_ANGLES, changes);
    applyRigAngles(rig, angles);
    scene.updateMatrixWorld(true);
  };
  const keys = (side: 0 | 1) => side === 0 ? { x: 'armLx', y: 'armLy', z: 'armLz', elbow: 'elbowL', out: 1 } : { x: 'armRx', y: 'armRy', z: 'armRz', elbow: 'elbowR', out: -1 };
  const armChanges = (side: 0 | 1, arm: ArmFit) => { const k = keys(side); return { [k.x]: arm.x, [k.y]: arm.y, [k.z]: arm.z, [k.elbow]: arm.elbow }; };

  // Hanging arm: the least outward lift that clears hips, thighs and garment at rest, and the extra a walking swing
  // needs as the hand passes forward or back beside a flared skirt or coat.
  pose({});
  const restBefore = Math.max(sideExcess(body, 0), sideExcess(body, 1));
  const lift = (side: 0 | 1, swing: Record<string, number>, from: number, cap: number) => {
    const k = keys(side);
    for (let extra = from; extra <= cap + 1e-9; extra += 0.02) {
      pose({ ...swing, [k.z]: REST_ANGLES[k.z]! + k.out * extra });
      if (sideExcess(body, side) <= 0) return extra;
    }
    return cap;
  };
  const hang: [number, number] = [0, 0];
  const swing: [[number, number], [number, number]] = [[0, 0], [0, 0]];
  for (const side of [0, 1] as const) {
    const k = keys(side), own = side === 0 ? 'legL' : 'legR', other = side === 0 ? 'legR' : 'legL';
    hang[side] = lift(side, {}, 0, HANG_LIMIT);
    const forward = lift(side, { [k.x]: -0.34, [k.elbow]: -0.55, [own]: 0.43, [other]: -0.43 }, hang[side], hang[side] + SWING_LIMIT);
    const back = lift(side, { [k.x]: 0.34, [k.elbow]: -0.24, [own]: -0.43, [other]: 0.43 }, hang[side], hang[side] + SWING_LIMIT);
    swing[side] = [forward - hang[side], back - hang[side]];
  }
  pose({ [keys(0).z]: REST_ANGLES.armLz! + hang[0], [keys(1).z]: REST_ANGLES.armRz! - hang[1] });
  const restAfter = Math.max(sideExcess(body, 0), sideExcess(body, 1));

  // Gestures that touch the body are placed by reach: each palm goes to a point on this figure's own surfaces, the
  // elbow towards a natural pole, and the target steps out a centimetre at a time until forearm and hand ride clear.
  pose({});
  const surface = (name: BodyBone, y: number, angle: number) => {
    const { pivot, envelope } = body.envelopes.get(name)!;
    return envelope.radiusToward(y - pivot.y, angle);
  };
  const hipsAt = body.envelopes.get('hips')!.pivot, torsoAt = body.envelopes.get('torso')!.pivot;
  const girth = (y: number, angle: number) => Math.max(surface('hips', y, angle), surface('torso', y, angle));
  const shoulders = [rig.armL, rig.armR].map(arm => arm.getWorldPosition(new THREE.Vector3()).applyMatrix4(rig.hips.parent!.matrixWorld.clone().invert()));
  const unplaced: string[] = [];
  const place = (side: 0 | 1, target: THREE.Vector3, pole: THREE.Vector3, outward: THREE.Vector3, fallback: ArmFit, margin = POSE_CLEARANCE, name = ''): ArmFit => {
    let why = 'clip', best: ArmFit | null = null, bestExcess = Infinity;
    for (let step = 0; step <= 12; step++) {
      const solved = reachArm(rig, side, target.clone().addScaledVector(outward, step * 0.01), pole, palms[side]);
      if (solved.miss > 0.06) { why = `reach ${solved.miss.toFixed(3)}`; break; }
      const arm: ArmFit = { x: solved.x, y: solved.y, z: solved.z, elbow: solved.elbow };
      pose(armChanges(side, arm));
      const excess = sideExcess(body, side, true, margin);
      pose({});
      if (excess <= 0) return arm;
      if (excess < bestExcess) { bestExcess = excess; best = arm; }
    }
    // Nearly clear is better than the written angles: a forearm a centimetre or two into a loose shirt reads as resting.
    if (best && bestExcess < GESTURE_TOLERANCE) return best;
    unplaced.push(`${name}${side === 0 ? 'L' : 'R'} (${why}${best ? ` ${bestExcess.toFixed(3)}` : ''})`);
    return fallback;
  };
  const sign = (side: 0 | 1) => side === 0 ? 1 : -1;
  const out = (side: 0 | 1) => new THREE.Vector3(sign(side), 0, 0);
  // Hands on hips: the palm on the side of the waist just above the hip bone, elbow out and a little back.
  const hips: [ArmFit, ArmFit] = ([0, 1] as const).map(side => {
    const y = hipsAt.y + 0.07, r = girth(y, side === 0 ? 0 : Math.PI);
    return place(side, new THREE.Vector3(hipsAt.x + sign(side) * (r + 0.03), y, hipsAt.z - 0.01), new THREE.Vector3(sign(side), -0.25, -0.6), out(side), GESTURE_DEFAULTS.hips[side], POSE_CLEARANCE, 'hips');
  }) as [ArmFit, ArmFit];
  // Hands clasped before the belt: palms together in front of the belly, elbows hanging easy.
  const front = (y: number) => girth(y, Math.PI / 2);
  const clasped: [ArmFit, ArmFit] = ([0, 1] as const).map(side => {
    const y = hipsAt.y + 0.03;
    return place(side, new THREE.Vector3(hipsAt.x + sign(side) * 0.035, y, hipsAt.z + front(y) + 0.07), new THREE.Vector3(sign(side) * 0.9, -1, -0.2),
      new THREE.Vector3(0, 0, 1), GESTURE_DEFAULTS.clasped[side], POSE_CLEARANCE, 'clasped');
  }) as [ArmFit, ArmFit];
  // Hands behind the back: palms over the small of the back, elbows out and back.
  const behind: [ArmFit, ArmFit] = ([0, 1] as const).map(side => {
    const y = hipsAt.y + 0.1, back = girth(y, -Math.PI / 2);
    return place(side, new THREE.Vector3(hipsAt.x + sign(side) * 0.045, y, hipsAt.z - back - 0.06), new THREE.Vector3(sign(side), -0.5, -0.8),
      new THREE.Vector3(0, 0, -1), GESTURE_DEFAULTS.behind[side], POSE_CLEARANCE, 'behind');
  }) as [ArmFit, ArmFit];
  // Arms crossed: each palm on the other arm's biceps, forearms across the chest, the right over the left.
  const crossed: [ArmFit, ArmFit] = ([0, 1] as const).map(side => {
    const other = shoulders[1 - side]!, y = other.y - 0.17;
    const chest = torsoAt.z + girth(y, Math.PI / 2);
    const z = Math.max(chest + 0.05, other.z + 0.08) + (side === 1 ? 0.05 : 0);
    return place(side, new THREE.Vector3(other.x - sign(side) * 0.02, y, z), new THREE.Vector3(sign(side) * 0.35, -1, 0.45),
      new THREE.Vector3(0, 0, 1), GESTURE_DEFAULTS.crossed[side], side === 1 ? POSE_CLEARANCE + 0.04 : POSE_CLEARANCE, 'crossed');
  }) as [ArmFit, ArmFit];

  // Sitting: with the thighs level, how far below the hip joint the seat contact lies.
  const model = rig.hips.parent!;
  const toModel = new THREE.Matrix4().copy(model.matrixWorld).invert();
  const hipBind = body.envelopes.get('hips')!.pivot, legBind = body.envelopes.get('legL')!.pivot, kneeBind = body.envelopes.get('kneeL')!.pivot;
  pose({ legL: -1.55, legR: -1.55, kneeL: 1.55, kneeR: 1.55 });
  let lowest = Infinity;
  for (const sample of body.seat) {
    const p = sample.offset.clone().applyMatrix4(sample.bone.matrixWorld).applyMatrix4(toModel);
    lowest = Math.min(lowest, p.y);
  }
  const hipNow = rig.hips.getWorldPosition(new THREE.Vector3()).applyMatrix4(toModel).y;
  const seat = {
    drop: Number.isFinite(lowest) ? THREE.MathUtils.clamp(hipNow - lowest, 0.05, 0.25) : 0.11,
    thigh: legBind.distanceTo(kneeBind),
    shin: kneeBind.y - body.sole,
  };
  void hipBind;
  // Palms on the thighs, part way to the knee, for the seats the realm has: none (the poser's default), a log, a bench.
  const seatedHands: NpcPoseFit['seatedHands'] = [];
  for (const height of [0.42, 0.55]) {
    const legs = seatLegs(seat, height, 1, rig.hipY);
    pose({ legL: legs.thigh, legR: legs.thigh, kneeL: legs.knee, kneeR: legs.knee, lower: legs.lower, torsoX: 0.05 });
    const arms = ([0, 1] as const).map(side => {
      const leg = side === 0 ? rig.legL : rig.legR, envelope = body.envelopes.get(side === 0 ? 'legL' : 'legR')!;
      const along = -seat.thigh * 0.55, top = envelope.envelope.radiusToward(along, Math.PI / 2);
      const target = new THREE.Vector3(0, along, (top || 0.08) + 0.025).applyMatrix4(leg.matrixWorld).applyMatrix4(toModel);
      const solved = reachArm(rig, side, target, new THREE.Vector3(sign(side), 0, -0.6), palms[side]);
      return { x: solved.x, y: solved.y, z: solved.z, elbow: solved.elbow } as ArmFit;
    }) as [ArmFit, ArmFit];
    seatedHands.push({ height, arms });
  }

  // Tasks with tools. Each places the palms by reach for two key poses, then records how each tool must sit in its
  // holder for the task to read: the quill's nib on the page, the hammer's head at the chisel, the rod on the ground.
  const work: NpcPoseFit['work'] = {};
  const solve = (side: 0 | 1, target: THREE.Vector3, pole: THREE.Vector3): ArmFit => {
    const solved = reachArm(rig, side, target, pole, palms[side]);
    return { x: solved.x, y: solved.y, z: solved.z, elbow: solved.elbow };
  };
  const socketPose = (side: 0 | 1) => {
    // The palm socket in the model frame for the rig's current pose: the elbow joint's turn, at the measured palm.
    const elbow = side === 0 ? rig.elbowL! : rig.elbowR!;
    const elbowWorld = new THREE.Matrix4().multiplyMatrices(toModel, elbow.matrixWorld);
    const rotation = new THREE.Quaternion().setFromRotationMatrix(elbowWorld);
    const position = palms[side].clone().sub(elbowBindOf(side)).applyMatrix4(elbowWorld);
    return { rotation, position };
  };
  const elbowBindOf = (side: 0 | 1) => {
    const at = new THREE.Vector3();
    for (let node: THREE.Object3D | null = side === 0 ? rig.elbowL! : rig.elbowR!; node && node !== model; node = node.parent) at.add(node.position);
    at.y += rig.hipY - rig.hips.position.y;
    return at;
  };
  const held = (kind: WorkPropKind, side: 0 | 1, arms: [ArmFit, ArmFit], legsPose: Record<string, number>, direction: THREE.Vector3, length?: number) => {
    pose({ ...legsPose, ...armChanges(0, arms[0]), ...armChanges(1, arms[1]) });
    const socket = socketPose(side);
    const world = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    const local = socket.rotation.clone().invert().multiply(world);
    return { kind, holder: (side === 0 ? 'handL' : 'handR') as WorkHolder, position: [0, 0, 0] as [number, number, number], quaternion: local.toArray() as [number, number, number, number], ...(length ? { length } : {}) };
  };

  // Writing on a bench: the ledger on the lap, the left hand holding its edge, the right writing across the page.
  {
    const legs = seatLegs(seat, WORK_SITES.bench, 1, rig.hipY);
    const seated = { legL: legs.thigh, legR: legs.thigh, kneeL: legs.knee, kneeR: legs.knee, lower: legs.lower, torsoX: 0.14, headX: 0.32 };
    pose(seated);
    const tops = [rig.legL, rig.legR].map((leg, side) => {
      const envelope = body.envelopes.get(side === 0 ? 'legL' : 'legR')!.envelope;
      const along = -seat.thigh * 0.6;
      return new THREE.Vector3(0, along, (envelope.radiusToward(along, Math.PI / 2) || 0.08)).applyMatrix4(leg.matrixWorld).applyMatrix4(toModel);
    });
    const book = tops[0]!.clone().add(tops[1]!).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.03, 0));
    const left = solve(0, book.clone().add(new THREE.Vector3(0.12, 0.02, -0.01)), new THREE.Vector3(1, -0.2, -0.5));
    const strokeA = solve(1, book.clone().add(new THREE.Vector3(-0.03, 0.09, 0.03)), new THREE.Vector3(-1, -0.3, -0.4));
    const strokeB = solve(1, book.clone().add(new THREE.Vector3(-0.1, 0.09, -0.01)), new THREE.Vector3(-1, -0.3, -0.4));
    const hips = rig.hips.getWorldPosition(new THREE.Vector3()).applyMatrix4(toModel);
    const lap = book.clone().sub(hips);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2 + legs.thigh);
    const quillProp = held('quill', 1, [left, strokeA], seated, new THREE.Vector3(0.25, 0.85, -0.45));
    work.writing = { a: [left, strokeA], b: [left, strokeB], props: [
      { kind: 'ledger', holder: 'lap', position: lap.toArray() as [number, number, number], quaternion: tilt.toArray() as [number, number, number, number] },
      quillProp,
    ] };
  }

  // Provisioning at the counter: both palms on its top; now and then the right hand lifts an arrow to sight along it.
  {
    pose({});
    const top = WORK_SITES.counter.height, reach = WORK_SITES.counter.reach;
    const onCounter: [ArmFit, ArmFit] = [
      solve(0, new THREE.Vector3(hipsAt.x + 0.2, top + 0.035, reach + 0.08), new THREE.Vector3(1, -0.4, -0.5)),
      solve(1, new THREE.Vector3(hipsAt.x - 0.18, top + 0.035, reach + 0.06), new THREE.Vector3(-1, -0.4, -0.5)),
    ];
    const sighting: [ArmFit, ArmFit] = [onCounter[0], solve(1, new THREE.Vector3(hipsAt.x - 0.05, 1.42, 0.36), new THREE.Vector3(-1, -0.6, -0.2))];
    work.provisioning = { a: onCounter, b: sighting, props: [held('arrow', 1, sighting, {}, new THREE.Vector3(1, 0.08, 0.15))] };
  }

  // Dressing stone at the face: the chisel held to the rock at chest height, the hammer raised, then struck home.
  {
    pose({});
    const reach = WORK_SITES.face.reach;
    const chiselAt = new THREE.Vector3(hipsAt.x + 0.06, 1.2, reach - 0.19);
    const holdChisel = solve(0, chiselAt, new THREE.Vector3(1, -0.6, -0.3));
    const struckEnd = chiselAt.clone().add(new THREE.Vector3(0, 0, -0.07));
    const strikeAt = struckEnd.clone().add(new THREE.Vector3(-0.2, -0.04, -0.12));
    const raised: [ArmFit, ArmFit] = [holdChisel, solve(1, new THREE.Vector3(hipsAt.x - 0.34, 1.46, 0.06), new THREE.Vector3(-1, -0.3, -0.6))];
    const strike: [ArmFit, ArmFit] = [holdChisel, solve(1, strikeAt, new THREE.Vector3(-1, -0.6, -0.3))];
    work.stonework = { a: raised, b: strike, props: [
      held('chisel', 0, strike, {}, new THREE.Vector3(0, -0.05, 1)),
      held('hammer', 1, strike, {}, struckEnd.clone().sub(strikeAt)),
    ] };
  }

  // Measuring: the rod planted upright before the right foot, the hand on it at chest height, sliding to read a mark.
  {
    pose({});
    const rodAt = new THREE.Vector3(hipsAt.x - 0.22, 1.18, 0.3);
    const high: [ArmFit, ArmFit] = [hips[0], solve(1, rodAt, new THREE.Vector3(-1, -0.5, -0.4))];
    const low: [ArmFit, ArmFit] = [hips[0], solve(1, rodAt.clone().add(new THREE.Vector3(0, -0.1, 0)), new THREE.Vector3(-1, -0.5, -0.4))];
    pose({ ...armChanges(0, high[0]), ...armChanges(1, high[1]) });
    const grip = socketPose(1).position;
    work.measuring = { a: high, b: low, props: [held('rod', 1, high, {}, new THREE.Vector3(0, 1, 0), Math.max(0.5, grip.y))] };
  }

  pose({});
  for (const key of ANGLE_KEYS) angles[key] = 0;
  applyRigAngles(rig, angles);
  scene.updateMatrixWorld(true);
  return { profile: NPC_POSE_FIT_PROFILE, hang, swing, crossed, hips, behind, clasped, garmentArms, unplaced, seat, seatedHands, work,
    rest: { before: +restBefore.toFixed(4), after: +restAfter.toFixed(4) } };
}
