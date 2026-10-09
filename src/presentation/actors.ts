import * as THREE from 'three';
import { BARKS, NPCS, type Activity, type NpcDef } from '../content/npcs';
import { evalAll } from '../game/state';
import type { EncounterId, NpcId, WorldState } from '../game/types';
import type { Collider, Colliders } from '../world/colliders';
import { ANCHORS, MAINT_ROUTE, type EnemySpawn, type V2 } from '../world/layout';
import { berthFor, indoorPost, roomDoorstep, roomRoute, walkingGround, type Berth } from '../world/homes';
import type { NavGrid } from '../world/nav';
import type { Terrain } from '../world/terrain';
import { applyFlash, createBanditRig, createNpcRig, createThornback, poseRig, type Mode, type Pose, type Rig } from './characters';
import { npcStyle, type WorkGesture } from './npcStyle';
import { workSiteFor, type WorkSite } from './npc/workSites';
import { NpcApproachGreeting } from './npcApproachGreeting';
import { EnemyRoute } from './enemyRoute';

const hourIn = (h: number, from: number, to: number) => (from <= to ? h >= from && h < to : h >= from || h < to);

export interface Goal {
  anchor: string;
  activity: Activity;
  /** An indoor post within the anchor's building (A70). */
  inside?: string;
}

/** Choose where an NPC should be, and what they should be doing, at this hour. */
export function resolveGoal(def: NpcDef, state: WorldState, hour: number): Goal {
  for (const o of def.overrides ?? []) {
    if (!evalAll(state, o.when)) continue;
    if (o.from !== undefined && o.to !== undefined && !hourIn(hour, o.from, o.to)) continue;
    return { anchor: o.anchor, activity: o.activity };
  }
  for (const e of def.schedule) {
    if (hourIn(hour, e.from, e.to)) return e.inside ? { anchor: e.anchor, activity: e.activity, inside: e.inside } : { anchor: e.anchor, activity: e.activity };
  }
  return { anchor: def.home, activity: 'rest' };
}

/** A fight this near wakes a sleeper (m), A70. */
export const NPC_ALARM_REACH = 40;

export interface ActorContext {
  terrain: Terrain;
  colliders: Colliders;
  /** Peaceful moving bodies, including the seated waystation pet. */
  wildlifeContacts?: readonly Collider[];
  /** Other live residents, keyed by person:<id>; the moving actor excludes itself. */
  residentContacts?: readonly Collider[];
  nav: NavGrid;
  state: WorldState;
  hour: number;
  player: { x: number; z: number; y: number };
  reducedMotion: boolean;
  /** Where a fight is going on, if anywhere (A70): sleepers within NPC_ALARM_REACH sit up awake until it is over. */
  alarms?: readonly { x: number; z: number }[];
  /** A remark, by its line in voice.ts. */
  onBark: (a: NpcActor, line: string) => boolean | void;
}

export const NPC_WALK_SPEED = 1.55;
/** Actual Meshy sole sweeps measured at 60 Hz: 0.78 pose speed gives roughly this stance-cycle travel at 1.8 m stature. */
export const NPC_WALK_CYCLE_METRES = 1.48;
export const NPC_WALK_POSE_SPEED = 0.78;
const NPC_RADIUS = .35;
const NPC_ACCELERATION = 3.2;
const NPC_BRAKING = 4;
const arrivalRadius = (activity: Activity) => activity === 'work' || activity === 'sit' ? .06 : .15;
const npcSeed = (id: string) => [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 17);
/**
 * How fast a resident turns, radians a second (A69): about 180° a second walking and 125° standing, easing into the
 * last part of a turn. People turn about with a step or two; they never spin on the spot.
 */
const NPC_TURN_WALKING = 3.2, NPC_TURN_STANDING = 2.2, NPC_TURN_EASE = 7;
/** A turn on the spot faster than this (radians a second) is stepped round, each radian a stride's arc of gait (A69). */
const NPC_TURN_STEPPED = .6, NPC_TURN_STRIDE = .3;
/** Within this of their place's heading (radians) a resident settles there: they sit down or start work facing it. */
const NPC_SETTLED = .3;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
/** What is done at each indoor post, whoever does it (A70). */
const INDOOR_GESTURES: Record<string, WorkGesture> = { bakery_oven: 'baking', mill_bench: 'general', office_table: 'ledger', reeve_table: 'ledger' };
const UP = new THREE.Vector3(0, 1, 0), FORWARD = new THREE.Vector3(0, 0, 1);
/** Seconds to lie down from sitting on a bed's edge, or to sit up again; and a moment sat on it first (A70). */
const NPC_LIE_SECONDS = 1.8, NPC_SIT_BEFORE_LYING = 1.2;
/** Asleep beyond this from the player, their pose is renewed only every NPC_ASLEEP_POSE seconds; beyond the second they are not drawn (A70). */
const NPC_ASLEEP_NEAR = 25, NPC_ASLEEP_FAR = 60, NPC_ASLEEP_POSE = .5;

/** Turn `from` toward `to` at no more than `rate` radians a second, easing out over the last part of the turn (A69). */
export function turnToward(from: number, to: number, rate: number, dt: number): number {
  const d = wrapAngle(to - from);
  return wrapAngle(from + Math.sign(d) * Math.min(Math.abs(d) * -Math.expm1(-dt * NPC_TURN_EASE), rate * dt));
}

/** A resident's place: where they stand and which way they face, a seat's height, and who else shares a meeting place. */
export type NpcPlace = V2 & { yaw: number; seat?: number; seatBack?: number; company?: readonly (V2 & { id: NpcId })[] };

/** A stride's rise: 0.3 m over ground, up to a building's tread where the ground falls away below its doorstep (A70). */
function riseOk(terrain: Pick<Terrain, 'groundAt'>, x: number, z: number, y: number, nx: number, nz: number, ny: number): boolean {
  const rise = Math.abs(ny - y);
  return rise <= .3 || rise <= .46 && (ny > terrain.groundAt(nx, nz) + .01 || y > terrain.groundAt(x, z) + .01);
}

/** Actual foot/body geometry, rather than a conservative navigation cell, decides a short local connection. */
function clearNpcSegment(from: V2, to: V2, ctx: Pick<ActorContext, 'terrain' | 'colliders'>, height: number, extra: readonly Collider[] = []): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z), steps = Math.max(1, Math.ceil(distance / .15));
  let x = from.x, z = from.z, y = walkingGround(ctx.terrain, x, z);
  if (!Number.isFinite(y)) return false;
  for (let i = 1; i <= steps; i++) {
    const nx = from.x + (to.x - from.x) * i / steps, nz = from.z + (to.z - from.z) * i / steps;
    // Up a building's doorstep and in over its threshold, a tread at a time (A70).
    const ny = walkingGround(ctx.terrain, nx, nz, y);
    if (!ctx.terrain.walkable(nx, nz) || !Number.isFinite(ny) || !riseOk(ctx.terrain, x, z, y, nx, nz, ny)) return false;
    const step = ctx.colliders.move(x, z, nx - x, nz - z, NPC_RADIUS, undefined,
      { minY: Math.min(y, ny) + .02, maxY: Math.max(y, ny) + height }, extra);
    if (Math.hypot(step.x - nx, step.z - nz) > .001) return false;
    x = nx; z = nz; y = ny;
  }
  return true;
}

/**
 * Stable places beside a shared conversation/office anchor; work surfaces and seats retain their authored placement.
 * The others' places at a shared anchor come too: a resident turns toward whoever is there with them (A69).
 */
export function npcGoalPosition(def: NpcDef, goal: Goal, ctx: Pick<ActorContext, 'terrain' | 'colliders'>, height: number): NpcPlace {
  // An indoor post is a furnished spot found in its room (A70).
  const post = goal.inside ? indoorPost(goal.inside, ctx.terrain, ctx.colliders, height) : null;
  if (post) return { x: post.x, z: post.z, yaw: post.yaw };
  const base = ANCHORS[goal.anchor] ?? { x: 0, z: 0, yaw: 0 };
  if (goal.activity !== 'stand' && goal.activity !== 'talk') return base;
  const entries = (d: NpcDef) => [...d.schedule, ...d.overrides ?? []];
  const peers = Object.values(NPCS).filter(d => entries(d).some(e => e.anchor === goal.anchor && (e.activity === 'stand' || e.activity === 'talk'))).sort((a, b) => a.id.localeCompare(b.id));
  if (peers.length < 2 || !peers.some(d => d.id === def.id)) return base;
  const chosen: (V2 & { id: NpcId })[] = [];
  for (const [i, peer] of peers.entries()) {
    const lateral = (i - (peers.length - 1) / 2) * 1.3;
    const offsets = [{ x: lateral, z: 0 }, ...[.85, 1.5, 2.2].flatMap(r =>
      [0, Math.PI / 2, -Math.PI / 2, Math.PI].map(angle => ({ x: Math.sin(angle + i * Math.PI) * r, z: Math.cos(angle + i * Math.PI) * r })))];
    let stance: V2 = base;
    for (const offset of offsets) {
      const point = { x: base.x + offset.x * Math.cos(base.yaw) + offset.z * Math.sin(base.yaw), z: base.z - offset.x * Math.sin(base.yaw) + offset.z * Math.cos(base.yaw) };
      const y = ctx.terrain.groundAt(point.x, point.z);
      if (!Number.isFinite(y) || !ctx.terrain.walkable(point.x, point.z) || chosen.some(other => Math.hypot(point.x - other.x, point.z - other.z) < .82)
        || ctx.colliders.blocked(point.x, point.z, NPC_RADIUS, { minY: y + .02, maxY: y + height })) continue;
      stance = point; break;
    }
    chosen.push({ x: stance.x, z: stance.z, id: peer.id });
  }
  const own = chosen.find(place => place.id === def.id)!;
  return { x: own.x, z: own.z, yaw: base.yaw, company: chosen.filter(place => place.id !== def.id) };
}

/** A coarse grid can reject a counter's whole cell even when the resident's exact working stance is clear. */
export function finishNpcPath(path: V2[] | null, goal: V2, ctx: Pick<ActorContext, 'terrain' | 'colliders'>, height: number): V2[] | null {
  const start = path?.at(-1);
  if (!path || !start) return path;
  const distance = Math.hypot(goal.x - start.x, goal.z - start.z);
  if (distance < 0.01 || distance > 4) return path;
  if (!clearNpcSegment(start, goal, ctx, height)) return path;
  // Moving animals and the player are checked each frame rather than turning a temporary visitor into a permanent route gap.
  return [...path, { x: goal.x, z: goal.z }];
}

export class NpcActor {
  readonly def: NpcDef;
  readonly rig: Rig;
  x = 0;
  z = 0;
  y = 0;
  yaw = 0;
  hidden = false;
  talking = false;
  /** Conversation reservations pause a route; only an actual voiced turn gestures. */
  speaking = true;
  /** Whom they face while talking: the player unless another person is set (an overheard scene). */
  faceTo: { x: number; z: number } | null = null;
  goal: Goal = { anchor: '', activity: 'stand' };
  private path: V2[] | null = null;
  private pi = 0;
  private clock = 0;
  private anim = 0;
  private barkCooldown = 8 + Math.random() * 10;
  private lastBarkKey = '';
  private placed = false;
  private viaMaint = false;
  private maintenanceCursor = 0;
  private destination: NpcPlace = { x: 0, z: 0, yaw: 0 };
  private speed = 0;
  private routeRetry = 0;
  private routeFailures = 0;
  private stuck = 0;
  private dynamicWait = 0;
  private standDelay = 0;
  private navVersion = -1;
  private unavailable = false;
  private waking = false;
  /** Their bed for the night, found once (A70); undefined until looked for, null for someone with none. */
  private berth: Berth | null | undefined = undefined;
  private berthVersion = -1;
  /** How far lain down on the bed they are on (0 sitting on its edge, 1 lying), and that bed while they are on it (A70). */
  lie = 0;
  private lying: Berth | null = null;
  private seatedFor = 0;
  /** Asleep with nobody near, their pose is only renewed now and then (A70). */
  private poseWait = 0;
  private readonly approachGreeting: NpcApproachGreeting | null;
  mode: Mode = 'idle';

  constructor(def: NpcDef, rig?: Rig) {
    this.def = def;
    this.rig = rig ?? createNpcRig(def);
    this.clock = (npcSeed(def.id) % 1000) / 100;
    this.approachGreeting = def.approachGreeting ? new NpcApproachGreeting(def.approachGreeting) : null;
    this.rig.root.traverse((o) => {
      o.userData.npc = def.id;
    });
  }

  get id(): NpcId {
    return this.def.id;
  }

  get interactable(): boolean {
    return !this.hidden;
  }

  /** Lying in their bed (A70): they see nothing, remark on nothing and hold no scene with anyone. */
  get asleep(): boolean {
    return !this.hidden && this.lie > 0.5;
  }

  /** A standing body others walk round; someone on a bed is out of the way, on it (A70). */
  get solid(): boolean {
    return !this.hidden && this.lie === 0 && this.lying === null;
  }

  /** The top of the piece an indoor worker works at, in their own frame like the outdoor work sites (A70). */
  private indoorWorkSite(ctx: ActorContext): WorkSite | undefined {
    const post = this.goal.inside && indoorPost(this.goal.inside, ctx.terrain, ctx.colliders, this.rig.height);
    if (!post) return undefined;
    const c = Math.cos(this.yaw), s = Math.sin(this.yaw);
    const local = post.corners.map(p => { const dx = p.x - this.x, dz = p.z - this.z; return [dx * c - dz * s, dx * s + dz * c] as const; });
    return { kind: 'counter', top: post.top - this.y, x0: Math.min(...local.map(p => p[0])), x1: Math.max(...local.map(p => p[0])),
      z0: Math.min(...local.map(p => p[1])), z1: Math.max(...local.map(p => p[1])) };
  }

  /** The bed a resting resident goes to (A70), looked for again only when the static world changes. */
  private berthOf(ctx: Pick<ActorContext, 'terrain' | 'colliders'>): Berth | null {
    if (this.berth === undefined || (this.berth === null && this.berthVersion !== ctx.colliders.version)) {
      this.berth = berthFor(this.id, ctx.terrain, ctx.colliders, this.rig.height);
      this.berthVersion = ctx.colliders.version;
    }
    return this.berth;
  }

  private restBerth(): Berth | null {
    return this.goal.activity === 'rest' ? this.berth ?? null : null;
  }

  /** Initial load/time-skip placement only; running schedules always walk rather than teleporting at a distance. */
  snapToGoal(ctx: ActorContext) {
    const g = resolveGoal(this.def, ctx.state, ctx.hour);
    this.goal = g;
    const a = this.destination = this.placeFor(g, ctx);
    this.x = a.x;
    this.z = a.z;
    this.yaw = a.yaw;
    this.path = null;
    this.pi = 0;
    this.maintenanceCursor = 0;
    this.speed = this.stuck = this.dynamicWait = this.standDelay = this.routeRetry = this.routeFailures = 0;
    this.navVersion = ctx.colliders.version;
    // Loaded at night, a resident with a bed is found lying in it, never vanished at their door (A70).
    const berth = g.activity === 'rest' ? this.berthOf(ctx) : null;
    this.hidden = g.activity === 'rest' && !berth;
    this.lying = berth;
    this.lie = berth ? 1 : 0;
    this.seatedFor = berth ? 2 : 0;
    this.poseWait = 0;
    this.waking = false;
    this.placed = true;
    this.y = walkingGround(ctx.terrain, this.x, this.z);
    this.rig.root.visible = !this.hidden;
    this.placeRig();
  }

  private atDestination() {
    return Math.hypot(this.x - this.destination.x, this.z - this.destination.z) <= arrivalRadius(this.goal.activity);
  }

  /** On their way somewhere: a route still to walk. A passing remark is made on the move, and doors open for them (A69). */
  get underway(): boolean {
    return !this.hidden && this.path !== null && !this.atDestination();
  }

  /** Turned to their place's heading: only then do they sit down on its seat or start work at it (A69). */
  private settled() {
    return Math.abs(wrapAngle(this.destination.yaw - this.yaw)) < NPC_SETTLED;
  }

  private seatedHere() {
    return (this.goal.activity === 'sit' || this.restBerth() !== null) && this.atDestination() && this.settled();
  }

  /**
   * The body where it is: on its feet at (x, y, z) facing yaw, or, lain down on a bed, rolled onto its side about the
   * seated hips until they rest on the bed's middle, head to its far end (A70).
   */
  private placeRig() {
    const root = this.rig.root, berth = this.lying;
    root.position.set(this.x, this.y, this.z);
    root.rotation.set(0, this.yaw, 0);
    if (!berth || this.lie <= 0) return;
    const s = this.lie * this.lie * (3 - 2 * this.lie);
    const sitting = new THREE.Quaternion().setFromAxisAngle(UP, this.yaw);
    // Rolled about the way they face: their head goes to whichever side the bed's far end lies.
    const side = new THREE.Vector3(1, 0, 0).applyQuaternion(sitting);
    const roll = side.x * berth.head.x + side.z * berth.head.z > 0 ? -Math.PI / 2 : Math.PI / 2;
    const lying = sitting.clone().multiply(new THREE.Quaternion().setFromAxisAngle(FORWARD, roll));
    const pivot = new THREE.Vector3(0, berth.seat + .08, -berth.seatBack);
    const target = new THREE.Vector3(berth.hip.x, berth.hip.y, berth.hip.z).sub(pivot.clone().applyQuaternion(lying));
    root.position.lerp(target, s);
    root.quaternion.copy(sitting.slerp(lying, s));
  }

  /** Which way a resident faces at their place: toward whoever shares it with them now, else its own heading (A69). */
  private placeYaw(ctx: ActorContext): number {
    const company = this.destination.company?.filter((peer) => {
      if (!ctx.state.npcs[peer.id]?.available) return false;
      const goal = resolveGoal(NPCS[peer.id], ctx.state, ctx.hour);
      return goal.anchor === this.goal.anchor && (goal.activity === 'stand' || goal.activity === 'talk');
    });
    if (!company?.length) return this.destination.yaw;
    const x = company.reduce((sum, peer) => sum + peer.x, 0) / company.length, z = company.reduce((sum, peer) => sum + peer.z, 0) / company.length;
    return Math.atan2(x - this.x, z - this.z);
  }

  /**
   * Where a resident goes for a goal. A seat is sat down on from in front of it, where their clips begin getting down on
   * their feet, rather than from inside the bench; the seat's height is then taken from that spot's ground (A69).
   */
  private placeFor(goal: Goal, ctx: ActorContext): NpcPlace {
    // To bed: before its edge, facing out of it, to sit down on it and lie down (A70).
    const berth = goal.activity === 'rest' ? this.berthOf(ctx) : null;
    if (berth) return { x: berth.stand.x, z: berth.stand.z, yaw: berth.yaw, seat: berth.seat, seatBack: berth.seatBack };
    const place = npcGoalPosition(this.def, goal, ctx, this.rig.height);
    // Resting at a seat ends where they stood up from it, not inside the bench.
    if ((goal.activity !== 'sit' && goal.activity !== 'rest') || place.seat === undefined) return place;
    const back = this.rig.resident?.seatApproach(place.seat) ?? 0;
    if (!(back > .01)) return place;
    const x = place.x + Math.sin(place.yaw) * back, z = place.z + Math.cos(place.yaw) * back;
    const y = ctx.terrain.groundAt(x, z), seatGround = ctx.terrain.groundAt(place.x, place.z);
    // Only where a person can stand; otherwise they sit down from the seat's own place.
    if (!Number.isFinite(y) || !Number.isFinite(seatGround) || !ctx.terrain.walkable(x, z)
      || ctx.colliders.blocked(x, z, NPC_RADIUS, { minY: y + .02, maxY: y + this.rig.height })) return place;
    return { ...place, x, z, seat: place.seat + seatGround - y, seatBack: back };
  }

  /** Out of their door, a resident faces the way they are going rather than the door they went in by (A69). */
  private faceRoute() {
    const next = this.path?.[this.pi];
    this.yaw = next && Math.hypot(next.x - this.x, next.z - this.z) > .05 ? Math.atan2(next.x - this.x, next.z - this.z) : this.destination.yaw;
  }

  private planRoute(ctx: ActorContext, maintenance = false) {
    const from = { x: this.x, z: this.z }, to = this.destination;
    const continuingMaintenance = this.viaMaint;
    this.viaMaint = false;
    const rooms = (ctx.terrain as Partial<Terrain>).rooms;
    const inside = rooms?.at(from.x, from.z) ?? null, into = rooms?.at(to.x, to.z) ?? null;
    if (inside || into) {
      // In and out of a room by its doorway, on the room's own fine grid; between rooms by the paths outside (A70).
      const parts: (V2[] | null)[] = [];
      if (inside && inside === into) parts.push(roomRoute(inside, from, to, ctx.terrain, ctx.colliders, this.rig.height));
      else {
        let start: V2 = from;
        if (inside) { parts.push(roomRoute(inside, from, roomDoorstep(inside), ctx.terrain, ctx.colliders, this.rig.height)); start = roomDoorstep(inside); }
        const outside = into ? roomDoorstep(into) : to;
        if (Math.hypot(outside.x - start.x, outside.z - start.z) > .2) {
          parts.push(Math.hypot(outside.x - start.x, outside.z - start.z) <= 3 && clearNpcSegment(start, outside, ctx, this.rig.height)
            ? [{ x: outside.x, z: outside.z }] : finishNpcPath(ctx.nav.findPath(start, outside), outside, ctx, this.rig.height));
        }
        if (into) parts.push(roomRoute(into, outside, to, ctx.terrain, ctx.colliders, this.rig.height));
      }
      this.path = parts.every(p => p) ? parts.flat() as V2[] : null;
    } else if (Math.hypot(to.x - from.x, to.z - from.z) <= 3 && clearNpcSegment(from, to, ctx, this.rig.height)) {
      this.path = [{ x: to.x, z: to.z }];
    } else if (maintenance && this.def.id === 'maintenance_worker' && ctx.state.facts.ila_method === 'shortcut'
      && (continuingMaintenance || Math.hypot(this.x - MAINT_ROUTE[0]!.x, this.z - MAINT_ROUTE[0]!.z) < 30) && this.maintenanceCursor < MAINT_ROUTE.length) {
      let route = MAINT_ROUTE.slice(this.maintenanceCursor);
      const last = route.at(-1)!;
      if (continuingMaintenance && this.maintenanceCursor >= 2 && this.stuck > 1.5) {
        // Once through the gate, a new static obstruction needs a quarry-side detour, never a return to the ledge.
        const reconnect = finishNpcPath(ctx.nav.findPath(from, last), last, ctx, this.rig.height);
        const end = reconnect?.at(-1);
        if (reconnect?.length && end && Math.hypot(end.x - last.x, end.z - last.z) < .15) route = reconnect;
      }
      const rest = finishNpcPath(ctx.nav.findPath(last, to), to, ctx, this.rig.height);
      this.path = rest?.length ? [...route, ...rest] : route;
      this.viaMaint = true;
    } else this.path = finishNpcPath(ctx.nav.findPath(from, to), to, ctx, this.rig.height);
    if (this.path?.length === 0) this.path = null;
    this.pi = 0;
    this.stuck = 0;
    this.routeFailures = this.path ? 0 : Math.min(3, this.routeFailures + 1);
    this.routeRetry = Math.min(8, 2 ** this.routeFailures) + (npcSeed(this.id) % 10) / 10;
  }

  private passedWaypoint(point: V2) {
    if (!this.viaMaint) return;
    const index = MAINT_ROUTE.findIndex(p => p.x === point.x && p.z === point.z);
    if (index >= 0) this.maintenanceCursor = Math.max(this.maintenanceCursor, index + 1);
  }

  private contacts(ctx: ActorContext): Collider[] {
    return [...ctx.wildlifeContacts ?? [], ...ctx.residentContacts ?? [],
      { id: 'player', kind: 'circle' as const, x: ctx.player.x, z: ctx.player.z, r: .4, active: true, minY: ctx.player.y + .02, maxY: ctx.player.y + 1.9 }]
      .filter(c => c.active && c.id !== `person:${this.id}`);
  }

  /** A visitor in an open lane can be passed; an occupied doorway/workplace remains a polite wait. */
  private tryPassing(ctx: ActorContext, contacts: readonly Collider[]) {
    let joinIndex = this.pi, target = this.path?.[joinIndex];
    if (!target) return false;
    // A short grid corner is not the destination. Reconnect farther along the route, dropping the bypassed corners.
    while (Math.hypot(target.x - this.x, target.z - this.z) < 3 && joinIndex < this.path!.length - 1) target = this.path![++joinIndex]!;
    const dx = target.x - this.x, dz = target.z - this.z, distance = Math.hypot(dx, dz);
    // Within reach of their own place, with someone standing in the way: a step aside, then in (A70).
    if (distance < 3) return joinIndex === this.path!.length - 1 && this.stepAside(target, distance, ctx, contacts);
    const fx = dx / distance, fz = dz / distance;
    for (const side of [1, -1]) for (const width of [1.1, 1.65, 2.2]) {
      const a = { x: this.x + fz * width * side, z: this.z - fx * width * side };
      const b = { x: a.x + fx * 2.5, z: a.z + fz * 2.5 };
      const c = { x: this.x + fx * 2.8, z: this.z + fz * 2.8 };
      if (![a, b, c].every((point, i) => clearNpcSegment(i === 0 ? this : i === 1 ? a : b, point, ctx, this.rig.height, contacts))) continue;
      // The remainder may cross an old corner's wall: static geometry must validate the new connection as well.
      if (!clearNpcSegment(c, target, ctx, this.rig.height)) continue;
      for (const point of this.path!.slice(this.pi, joinIndex)) this.passedWaypoint(point);
      this.path = [a, b, c, ...this.path!.slice(joinIndex)];
      this.pi = 0; this.dynamicWait = 0; this.stuck = 0;
      return true;
    }
    return false;
  }

  /**
   * The last few metres to a free place, round someone standing in the way: a short step to one side, then straight in.
   * Before, a resident who had arrived first could hold the next one off for the whole meeting (A70). A place someone
   * stands on is still waited for, as a doorway or a work edge is.
   */
  private stepAside(target: V2, distance: number, ctx: ActorContext, contacts: readonly Collider[]) {
    if (distance < .2) return false;
    if (contacts.some(c => c.kind === 'circle' && Math.hypot(c.x - target.x, c.z - target.z) < c.r + NPC_RADIUS)) return false;
    const fx = (target.x - this.x) / distance, fz = (target.z - this.z) / distance;
    for (const side of [1, -1]) for (const width of [.8, 1.1, 1.4]) {
      const aside = { x: this.x + fz * width * side, z: this.z - fx * width * side };
      if (!clearNpcSegment(this, aside, ctx, this.rig.height, contacts) || !clearNpcSegment(aside, target, ctx, this.rig.height, contacts)) continue;
      this.path = [aside, { x: target.x, z: target.z }];
      this.pi = 0; this.dynamicWait = 0; this.stuck = 0;
      return true;
    }
    return false;
  }

  update(dt: number, ctx: ActorContext) {
    dt = Number.isFinite(dt) ? Math.min(2, Math.max(0, dt)) : 0;
    const avail = ctx.state.npcs[this.def.id].available;
    if (!avail) {
      this.unavailable = true;
      this.speed = 0;
      this.hidden = true;
      this.rig.root.visible = false;
      return;
    }
    if (!this.placed) this.snapToGoal(ctx);
    const contacts = this.contacts(ctx);
    const goal = resolveGoal(this.def, ctx.state, ctx.hour);
    const changed = goal.anchor !== this.goal.anchor || goal.activity !== this.goal.activity || goal.inside !== this.goal.inside;
    if (changed || this.unavailable) {
      const wasResting = this.goal.activity === 'rest';
      let appeared = false;
      // Getting up from a seat takes its clip's own time to stand: they walk off on their feet, not mid-rise (A69).
      if (this.mode === 'sit' || this.goal.activity === 'sit' && this.talking || this.lying) this.standDelay = Math.max(.85, this.rig.resident?.standUpSeconds ?? 0);
      this.goal = goal;
      if (goal.activity === 'rest') this.berthOf(ctx);
      this.destination = this.placeFor(goal, ctx);
      if (this.hidden && goal.activity !== 'rest') {
        if (wasResting || this.waking) {
          // Share a doorway in turns, rather than materialising two bodies on the same home anchor.
          this.waking = true;
        } else {
          this.hidden = false;
          appeared = true;
        }
      }
      if (goal.activity === 'rest') this.waking = false;
      this.unavailable = false;
      this.routeFailures = 0;
      this.routeRetry = 0;
      if (!this.atDestination()) this.planRoute(ctx, true);
      else this.path = null;
      if (appeared) this.faceRoute();
    }
    if (this.waking) {
      const y = ctx.terrain.groundAt(this.x, this.z);
      const resolved = ctx.colliders.resolve(this.x, this.z, NPC_RADIUS, `person:${this.id}`, { minY: y + .02, maxY: y + this.rig.height }, contacts);
      if (Math.hypot(resolved.x - this.x, resolved.z - this.z) < .001) { this.hidden = false; this.waking = false; this.faceRoute(); }
    }

    this.routeRetry = Math.max(0, this.routeRetry - dt);
    if (this.navVersion !== ctx.colliders.version) { this.navVersion = ctx.colliders.version; this.routeRetry = 0; }
    if (!this.hidden && !this.talking && !this.atDestination() && this.routeRetry === 0 && (!this.path || this.stuck > 1.5 && this.dynamicWait === 0)) this.planRoute(ctx, this.viaMaint);

    this.clock += dt;
    const yawBefore = this.yaw;
    let moving = false;
    let travelled = 0;
    let dynamicBlocked = false;
    const substeps = Math.max(1, Math.ceil(dt / .05)), stepDt = dt / substeps;
    for (let sub = 0; sub < substeps; sub++) {
      // Lain down, they first sit up on the bed's edge, then get to their feet, then walk (A70).
      if (this.talking || this.hidden || this.lie > 0 || this.standDelay > 0) {
        this.speed = 0;
        if (this.lie === 0) this.standDelay = Math.max(0, this.standDelay - stepDt);
        continue;
      }
      while (this.path && this.pi < this.path.length) {
        const wp = this.path[this.pi]!, d = Math.hypot(wp.x - this.x, wp.z - this.z);
        if (d <= (this.pi === this.path.length - 1 ? arrivalRadius(this.goal.activity) : .2)) { this.passedWaypoint(wp); this.pi++; continue; }
        // Short, verified corner cuts keep a route from stopping at every grid vertex.
        const next = this.path[this.pi + 1];
        // Indoors the route is already drawn clear of the furniture: no corner is cut there (A70).
        if (next && d < .55 && !(ctx.terrain as Partial<Terrain>).rooms?.at(this.x, this.z)) {
          const n = Math.hypot(next.x - wp.x, next.z - wp.z), t = Math.min(1, .7 / (n || 1));
          const ahead = { x: wp.x + (next.x - wp.x) * t, z: wp.z + (next.z - wp.z) * t };
          if (clearNpcSegment(this, ahead, ctx, this.rig.height, contacts)) { this.passedWaypoint(wp); this.pi++; continue; }
        }
        break;
      }
      if (this.path && this.pi >= this.path.length) this.path = null;
      if (!this.path) { this.speed = 0; continue; }
      const wp = this.path[this.pi]!;
      const dx = wp.x - this.x;
      const dz = wp.z - this.z;
      const d = Math.hypot(dx, dz);
      const yaw = Math.atan2(dx, dz);
      this.yaw = turnToward(this.yaw, yaw, NPC_TURN_WALKING, stepDt);
      const alignment = Math.max(0, Math.cos(yaw - this.yaw));
      const final = this.pi === this.path.length - 1;
      let wanted = Math.min(NPC_WALK_SPEED, Math.sqrt(2 * NPC_BRAKING * Math.max(0, final ? d - arrivalRadius(this.goal.activity) : d))) * alignment;
      const ahead = Math.min(d, .65), y = walkingGround(ctx.terrain, this.x, this.z, this.y);
      const hit = ctx.colliders.cast(this.x, this.z, this.x + dx / d * ahead, this.z + dz / d * ahead, NPC_RADIUS,
        new Set([`person:${this.id}`]), { minY: y + .02, maxY: y + this.rig.height }, contacts, true);
      if (hit) {
        const dynamic = contacts.some(c => c.id === hit.collider.id);
        // A wall only grazed (a door jamb, a table's corner) is slid along rather than braked for (A70).
        if (dynamic || -(hit.nx * dx + hit.nz * dz) / d > .35) wanted = Math.min(wanted, Math.sqrt(2 * NPC_BRAKING * Math.max(0, hit.t * ahead - .025)));
        dynamicBlocked ||= dynamic;
      }
      const change = (wanted > this.speed ? NPC_ACCELERATION : NPC_BRAKING) * stepDt;
      this.speed += Math.max(-change, Math.min(change, wanted - this.speed));
      const step = Math.min(d, this.speed * alignment * stepDt);
      const nx = this.x + dx / d * step, nz = this.z + dz / d * step, ny = walkingGround(ctx.terrain, nx, nz, y);
      if (!ctx.terrain.walkable(nx, nz) || !Number.isFinite(ny) || !riseOk(ctx.terrain, this.x, this.z, y, nx, nz, ny)) { this.speed = 0; continue; }
      const result = ctx.colliders.move(this.x, this.z, nx - this.x, nz - this.z, NPC_RADIUS, `person:${this.id}`,
        { minY: Math.min(y, ny) + .02, maxY: Math.max(y, ny) + this.rig.height }, contacts);
      const travel = Math.hypot(result.x - this.x, result.z - this.z), ground = walkingGround(ctx.terrain, result.x, result.z, y);
      // An overlapping visitor must not throw a resident across the lane in a single resolve call.
      if (travel > step + .025 || !ctx.terrain.walkable(result.x, result.z) || !Number.isFinite(ground) || !riseOk(ctx.terrain, this.x, this.z, y, result.x, result.z, ground)) { this.speed = 0; continue; }
      this.x = result.x; this.z = result.z; this.y = ground;
      travelled += travel;
      if (result.hit && travel < step * .2) this.speed = 0;
    }

    const travel = travelled;
    moving = travel > 1e-6;
    this.stuck = this.path && !this.talking && this.standDelay === 0 && travel < dt * .03 ? this.stuck + dt : 0;
    this.dynamicWait = dynamicBlocked ? this.dynamicWait + dt : 0;
    if (this.dynamicWait > 1.25 && this.stuck > .5) this.tryPassing(ctx, contacts);

    if (!moving) {
      if (this.talking) {
        // Seated, they talk from their seat; standing, they turn to whom they are talking to (A69).
        if (!this.seatedHere()) {
          const to = this.faceTo ?? ctx.player;
          this.yaw = turnToward(this.yaw, Math.atan2(to.x - this.x, to.z - this.z), NPC_TURN_STANDING, dt);
        }
      } else if (!this.path && this.atDestination()) {
        const a = this.destination;
        this.yaw = turnToward(this.yaw, this.placeYaw(ctx), NPC_TURN_STANDING, dt);
        // Off to rest from a seat, they are on their feet first (A69).
        // Someone without a bed still goes in at their door; everyone else goes to bed (A70).
        if (this.goal.activity === 'rest' && !this.restBerth() && this.standDelay === 0 && Math.hypot(this.x - a.x, this.z - a.z) < 1.2) this.hidden = true;
      }
    }
    // A turn on the spot is stepped round rather than glided like a statue on a turntable (A69).
    const turned = Math.abs(wrapAngle(this.yaw - yawBefore));
    const stepping = !moving && !this.hidden && dt > 0 && turned > NPC_TURN_STEPPED * dt;
    // With their own turn clips they step round where they stand (A71); otherwise the walk is stepped round in place.
    const inPlace = this.rig.resident?.stepsInPlace === true;
    const gait = moving ? travel : stepping && !inPlace ? turned * NPC_TURN_STRIDE * (this.rig.height / 1.8) : 0;

    this.y = walkingGround(ctx.terrain, this.x, this.z, this.y);

    // Sat on their bed a moment, they lie down; spoken to, they sit up to talk, and lie down again after (A70).
    const seatedNow = this.seatedHere();
    const berth = this.restBerth();
    if (berth && seatedNow && !moving) { this.lying = berth; this.seatedFor += dt; } else if (!this.lying) this.seatedFor = 0;
    const alarmed = !!ctx.alarms?.some(a => Math.hypot(a.x - this.x, a.z - this.z) < NPC_ALARM_REACH);
    const lieWanted = berth !== null && this.lying === berth && seatedNow && !this.talking && !alarmed && this.seatedFor >= NPC_SIT_BEFORE_LYING;
    this.lie = Math.max(0, Math.min(1, this.lie + (lieWanted ? 1 : -1) * dt / NPC_LIE_SECONDS));
    // Sat up and off to somewhere else: the bed's edge is left as any seat is.
    if (this.lie === 0 && this.lying && (this.lying !== berth || !seatedNow)) { this.lying = null; this.seatedFor = 0; }
    const playerDistance = Math.hypot(ctx.player.x - this.x, ctx.player.z - this.z);
    const drawn = !this.hidden && !(this.lie === 1 && playerDistance > NPC_ASLEEP_FAR);
    this.rig.root.visible = drawn;
    this.placeRig();

    let mode: Mode = 'idle';
    // On a bed, sitting on it or lain down, they keep their seat until they are on their feet again (A70).
    const onBed = this.lying !== null && (this.lie > 0 || seatedNow);
    const seated = seatedNow || onBed;
    if (moving || (stepping && !inPlace)) mode = 'walk';
    else if (this.talking) mode = this.speaking ? 'talk' : seated ? 'sit' : 'idle';
    else if (onBed) mode = 'sit';
    else if (!this.path && this.atDestination()) {
      // Work only reads as work at a work place, facing it; a seat is sat on once they have turned to it (A69).
      const act = this.goal.activity;
      mode = act === 'work' && this.settled() ? 'work' : (act === 'sit' || this.restBerth()) && seated ? 'sit' : 'idle';
    }
    this.mode = mode;
    // A resident waiting at a doorway cannot keep walking in place. Only resolved route metres, or a turn stepped round on
    // the spot, advance the gait.
    this.anim += gait / (NPC_WALK_CYCLE_METRES * (this.rig.height / 1.8));
    const style = npcStyle(this.def.id);
    const pose: Pose = {
      mode,
      speed: mode === 'walk' && dt > 0 ? NPC_WALK_POSE_SPEED * Math.min(1, gait / dt / NPC_WALK_SPEED) : 0,
      time: mode === 'walk' ? this.anim : this.clock,
      t: 0,
      // Locomotion remains distance-matched; Reduced Motion reduces idle/work gestures rather than making moving feet shuffle.
      amp: ctx.reducedMotion && mode !== 'walk' ? 0.4 : 1,
      travel: gait,
      moveSpeed: dt > 0 ? gait / dt : 0,
      turn: wrapAngle(this.yaw - yawBefore),
      workGesture: (this.goal.inside && INDOOR_GESTURES[this.goal.inside]) || style.work,
      // The real counter, rock face or ground the work is done against (A70).
      workSite: mode === 'work' ? (this.goal.inside ? this.indoorWorkSite(ctx) : workSiteFor(this.goal.anchor, this, ctx.terrain)) : undefined,
      seated: mode !== 'walk' && seated,
      seatHeight: onBed ? this.lying!.seat : this.destination.seat,
      seatBack: onBed ? this.lying!.seatBack : this.destination.seatBack,
      // Standing about, a resident folds their arms, looks round, shifts their weight (still when motion is reduced).
      idle: ctx.reducedMotion ? undefined : { seed: style.faceSeed, clock: this.clock },
    };
    // Asleep away from the player, the pose is renewed now and then rather than every frame (A70).
    this.poseWait += dt;
    const lazy = this.lie === 1 && playerDistance > NPC_ASLEEP_NEAR;
    if (drawn && (!lazy || this.poseWait >= NPC_ASLEEP_POSE)) { poseRig(this.rig, pose, this.poseWait); this.poseWait = 0; }
    else if (!drawn) this.poseWait = 0;

    // Ambient remarks when the player passes close; the sleeping make none (A70).
    if (!this.hidden && this.lie === 0) {
      if (this.approachGreeting && this.def.approachGreeting) {
        const distance = Math.hypot(ctx.player.x - this.x, ctx.player.z - this.z, ctx.player.y - this.y);
        this.approachGreeting.update(dt, distance, !this.talking,
          () => ctx.onBark(this, this.def.approachGreeting!.line) === true);
        return;
      }
      this.barkCooldown -= dt;
      const pd = Math.hypot(ctx.player.x - this.x, ctx.player.z - this.z);
      if (this.barkCooldown <= 0 && pd < 6.5 && !this.talking) {
        const pool = BARKS.filter((b) => b.npc === this.def.id && evalAll(ctx.state, b.when) && (!b.hours || hourIn(ctx.hour, b.hours[0], b.hours[1])));
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)]!;
          if (pick.line !== this.lastBarkKey || pool.length === 1) {
            this.lastBarkKey = pick.line;
            ctx.onBark(this, pick.line);
          }
        }
        this.barkCooldown = 28 + Math.random() * 20;
      }
    }
  }

  get headPosition(): THREE.Vector3 {
    const seated = (this.goal.activity === 'sit' || this.lying !== null) && this.atDestination() && this.mode !== 'walk';
    // Authored rigs never write the procedural lower: they take the seated drop (A70).
    const lower = this.rig.resident ? undefined : this.rig.cur?.lower;
    const supported = Number.isFinite(lower) ? Math.max(-.65, Math.min(0, lower!)) * ((this.rig.hipY || .95) / .95) : seated ? -.45 : 0;
    const up = new THREE.Vector3(this.x, this.y + 1.95 * this.def.look.height + supported, this.z);
    if (!this.lying || this.lie <= 0) return up;
    // Lain down, their head is on the bed beyond their hips (A70).
    const { hip, head } = this.lying, s = this.lie * this.lie * (3 - 2 * this.lie);
    return up.lerp(new THREE.Vector3(hip.x + head.x * .75, hip.y + .1, hip.z + head.z * .75), s);
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export { lerpAngle };

/** Preserve the established 60 Hz turn response without making it faster on a higher-refresh display. */
const enemyTurnEase = (perFrame: number, dt: number) => -Math.expm1(Math.log1p(-perFrame) * 60 * dt);

/* ============================ Enemies ============================ */

export type EnemyState = 'idle' | 'alert' | 'chase' | 'telegraph' | 'strike' | 'recover' | 'stagger' | 'return' | 'dead';

export interface EnemyContext {
  terrain: Terrain;
  colliders: Colliders;
  nav?: NavGrid;
  /** Current finite bodies; the controller excludes its own enemy id. */
  contacts?: readonly Collider[];
  player: { x: number; z: number; y: number; alive: boolean; invulnerable: boolean };
  reducedMotion: boolean;
  /** Called at the moment a strike would land. Returns true if it connected (for effects). */
  strikePlayer: (e: EnemyActor, damage: number, heavy: boolean) => void;
  onGrowl: (e: EnemyActor) => void;
  time: number;
}

export class EnemyActor {
  readonly id: EncounterId;
  readonly spawn: EnemySpawn;
  readonly rig: Rig;
  x: number;
  z: number;
  y = 0;
  yaw = 0;
  hp: number;
  readonly maxHp: number;
  state: EnemyState = 'idle';
  private t = 0;
  private struck = false;
  private clock = Math.random() * 5;
  private gait = 0;
  private readonly route = new EnemyRoute();
  private routeState: EnemyState = 'idle';
  private dashDir = { x: 0, z: 0 };
  engaged = false;
  fade = 1;
  private idleYaw: number;
  private readonly cfg: { speed: number; reach: number; wind: number; strike: number; recover: number; damage: number; notice: number; leash: number; heavy: boolean };
  readonly name: string;

  constructor(spawn: EnemySpawn, rig?: Rig) {
    this.spawn = spawn;
    this.id = spawn.id;
    this.x = spawn.x;
    this.z = spawn.z;
    this.idleYaw = spawn.id === 'ford_bandit_b' ? 4.0 : 1.2;
    if (spawn.kind === 'thornback') {
      this.rig = createThornback();
      this.hp = this.maxHp = 110;
      this.cfg = { speed: 4.4, reach: 2.9, wind: 0.95, strike: 0.4, recover: 1.1, damage: 20, notice: 10, leash: spawn.leash, heavy: true };
      this.name = 'Thornback';
    } else {
      this.rig = rig ?? createBanditRig(spawn.id === 'ford_bandit_b' ? 1 : 0);
      this.hp = this.maxHp = 55;
      this.cfg = { speed: 3.5, reach: 1.9, wind: 0.6, strike: 0.2, recover: 0.9, damage: 11, notice: 12, leash: spawn.leash, heavy: false };
      this.name = 'Toll-jumper';
    }
    this.rig.root.traverse((o) => {
      o.userData.enemy = spawn.id;
    });
  }

  get alive() {
    return this.state !== 'dead';
  }

  get radius() {
    return this.id === 'cut_creature' ? 0.85 : 0.4;
  }

  /** Apply a hit from the player. Returns true if this hit killed the enemy. */
  takeHit(damage: number, heavy: boolean, fromX: number, fromZ: number): boolean {
    if (this.state === 'dead') return false;
    this.hp -= damage;
    this.rig.hitFlash = 1;
    this.engaged = true;
    const d = Math.hypot(this.x - fromX, this.z - fromZ) || 1;
    this.dashDir = { x: (this.x - fromX) / d, z: (this.z - fromZ) / d };
    if (this.hp <= 0) {
      this.state = 'dead';
      this.t = 0;
      return true;
    }
    // A committed swing is not free to interrupt; heavy blows stagger even a wind-up.
    if (heavy || (this.state !== 'telegraph' && this.state !== 'strike')) {
      this.state = 'stagger';
      this.t = heavy ? 0.85 : 0.3;
    }
    return false;
  }

  /** Called when the player perfectly blocks this enemy's strike. */
  parried(fromX = this.x, fromZ = this.z) {
    if (this.state === 'dead') return;
    const d = Math.hypot(this.x - fromX, this.z - fromZ) || 1;
    this.dashDir = { x: (this.x - fromX) / d, z: (this.z - fromZ) / d };
    this.state = 'stagger';
    this.t = 1.1;
    this.rig.hitFlash = 0.5;
  }

  reset(ctx: { terrain: Terrain }) {
    if (this.state === 'dead') return;
    this.state = 'idle';
    this.hp = this.maxHp;
    this.x = this.spawn.x;
    this.z = this.spawn.z;
    this.engaged = false;
    this.y = ctx.terrain.groundAt(this.x, this.z);
    this.gait = 0;
    this.route.reset();
  }

  /** One finite capsule sweep for pursuit, recoil and creature lunges. */
  private moveStep(dx: number, dz: number, ctx: EnemyContext): number {
    let nx = this.x + dx, nz = this.z + dz;
    if (!ctx.terrain.walkable(nx, nz, 1)) {
      if (ctx.terrain.walkable(nx, this.z, 1)) nz = this.z;
      else if (ctx.terrain.walkable(this.x, nz, 1)) nx = this.x;
      else return 0;
    }
    const y = ctx.terrain.groundAt(this.x, this.z), ny = ctx.terrain.groundAt(nx, nz);
    if (!Number.isFinite(ny) || Math.abs(ny - y) > .32) return 0;
    const r = ctx.colliders.move(this.x, this.z, nx - this.x, nz - this.z, this.radius, `enemy:${this.id}`,
      { minY: Math.min(y, ny) + .02, maxY: Math.max(y, ny) + this.rig.height }, ctx.contacts);
    const travel = Math.hypot(r.x - this.x, r.z - this.z);
    // A capsule introduced inside another body must not depenetrate by a visible teleport.
    if (travel > Math.hypot(dx, dz) + .02 || !ctx.terrain.walkable(r.x, r.z, 1)
      || Math.abs(ctx.terrain.groundAt(r.x, r.z) - y) > .32) return 0;
    this.x = r.x; this.z = r.z;
    return travel;
  }

  private moveToward(tx: number, tz: number, speed: number, dt: number, ctx: EnemyContext, stopDist = 0) {
    if (Math.hypot(tx - this.x, tz - this.z) <= stopDist) return false;
    const waypoint = this.route.waypoint(this, { x: tx, z: tz }, dt, ctx, this.radius, this.rig.height);
    if (!waypoint) return false;
    const dx = waypoint.x - this.x, dz = waypoint.z - this.z, d = Math.hypot(dx, dz);
    if (d < 1e-4) return false;
    const remaining = Math.hypot(tx - this.x, tz - this.z) - stopDist;
    const step = Math.min(speed * dt, d, remaining);
    const ox = this.x, oz = this.z;
    const travel = this.moveStep(dx / d * step, dz / d * step, ctx);
    this.route.resolved(travel, step, dt);
    if (travel > 1e-6) this.yaw = lerpAngle(this.yaw, Math.atan2(this.x - ox, this.z - oz), enemyTurnEase(0.25, dt));
    return travel > 1e-6;
  }

  update(dt: number, ctx: EnemyContext) {
    if (this.routeState !== this.state) {
      this.route.reset();
      this.routeState = this.state;
    }
    const previousX = this.x, previousZ = this.z;
    this.clock += dt;
    if (this.state === 'dead') {
      this.t += dt;
      this.fade = Math.max(0, 1 - Math.max(0, this.t - 4) / 3);
      this.rig.root.visible = this.fade > 0.01;
      this.applyTransform(ctx, 'dead', 0, 0, dt);
      return;
    }
    const p = ctx.player;
    const dx = p.x - this.x;
    const dz = p.z - this.z;
    const dist = Math.hypot(dx, dz);
    const fromSpawn = Math.hypot(this.x - this.spawn.x, this.z - this.spawn.z);
    let mode: Mode = 'idle';
    let speed01 = 0;

    switch (this.state) {
      case 'idle': {
        if (p.alive && dist < this.cfg.notice) {
          const facing = Math.atan2(dx, dz);
          // Shortest angular difference, valid however far the stored yaw has drifted.
          const da = Math.abs(Math.atan2(Math.sin(facing - this.yaw), Math.cos(facing - this.yaw)));
          const seen = dist < 4.5 || da < 1.25;
          const blocked = ctx.colliders.segmentBlocked(this.x, this.z, p.x, p.z);
          if (seen && !blocked && fromSpawn < this.cfg.leash) {
            this.state = 'alert';
            this.t = 0.55;
            this.engaged = true;
            ctx.onGrowl(this);
          }
        }
        // Idle bandits shift and look about; the creature paces its patch.
        this.yaw = lerpAngle(this.yaw, this.idleYaw + Math.sin(this.clock * 0.4) * 0.5, enemyTurnEase(0.02, dt));
        if (this.spawn.kind === 'thornback') {
          const a = this.clock * 0.25;
          this.moveToward(this.spawn.x + Math.cos(a) * 3, this.spawn.z + Math.sin(a) * 3, 0.9, dt, ctx);
          mode = 'walk';
          speed01 = 0.35;
        }
        break;
      }
      case 'alert':
        this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), enemyTurnEase(0.2, dt));
        this.t -= dt;
        if (this.t <= 0) this.state = 'chase';
        break;
      case 'chase': {
        mode = 'run';
        speed01 = 1;
        if (!p.alive || fromSpawn > this.cfg.leash + 6 || dist > this.cfg.notice * 2.2) {
          this.state = 'return';
          this.engaged = false;
          break;
        }
        if (dist <= this.cfg.reach) {
          this.state = 'telegraph';
          this.t = 0;
          this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), enemyTurnEase(0.25, dt));
          this.route.reset();
          break;
        }
        this.moveToward(p.x, p.z, this.cfg.speed, dt, ctx, this.cfg.reach * 0.7);
        break;
      }
      case 'telegraph': {
        // The wind-up tracks the player only at the start, so sidestepping works.
        this.t += dt;
        if (this.t < this.cfg.wind * 0.45) this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), enemyTurnEase(0.25, dt));
        mode = 'telegraph';
        if (this.t >= this.cfg.wind) {
          this.state = 'strike';
          this.t = 0;
          this.struck = false;
          this.dashDir = { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
        }
        break;
      }
      case 'strike': {
        this.t += dt;
        mode = 'strike';
        if (this.cfg.heavy) {
          // The creature lunges forward during its strike.
          this.moveStep(this.dashDir.x * 7 * dt, this.dashDir.z * 7 * dt, ctx);
        }
        if (!this.struck && this.t >= this.cfg.strike * 0.5) {
          this.struck = true;
          const ax = Math.sin(this.yaw);
          const az = Math.cos(this.yaw);
          const d = Math.hypot(p.x - this.x, p.z - this.z);
          const cos = d > 0 ? ((p.x - this.x) * ax + (p.z - this.z) * az) / d : 1;
          if (d < this.cfg.reach + 0.5 && cos > 0.35 && p.alive) ctx.strikePlayer(this, this.cfg.damage, this.cfg.heavy);
        }
        // A perfect block parries during the strike call: keep the stagger instead of overwriting it.
        if (this.state !== 'strike') break;
        if (this.t >= this.cfg.strike) {
          this.state = 'recover';
          this.t = 0;
        }
        break;
      }
      case 'recover':
        this.t += dt;
        mode = 'idle';
        if (this.t >= this.cfg.recover) this.state = dist < this.cfg.notice * 2 && p.alive ? 'chase' : 'return';
        break;
      case 'stagger':
        this.t -= dt;
        mode = 'idle';
        {
          this.moveStep(this.dashDir.x * 2.2 * dt, this.dashDir.z * 2.2 * dt, ctx);
        }
        if (this.t <= 0) this.state = p.alive ? 'chase' : 'return';
        break;
      case 'return': {
        mode = 'walk';
        speed01 = 0.7;
        this.moveToward(this.spawn.x, this.spawn.z, this.cfg.speed * 0.7, dt, ctx, 0.6);
        // They regain their health while they return, and rest again at the post.
        this.hp = Math.min(this.maxHp, this.hp + dt * 12);
        if (Math.hypot(this.x - this.spawn.x, this.z - this.spawn.z) < 1) {
          this.state = 'idle';
          this.engaged = false;
        }
        if (p.alive && dist < this.cfg.notice * 0.6 && fromSpawn < this.cfg.leash) {
          this.state = 'chase';
          this.engaged = true;
        }
        break;
      }
    }
    this.applyTransform(ctx, mode, speed01, this.t, dt, Math.hypot(this.x - previousX, this.z - previousZ));
  }

  private applyTransform(ctx: EnemyContext, mode: Mode, speed01: number, t: number, dt: number, travel = 0) {
    this.y = ctx.terrain.groundAt(this.x, this.z);
    this.rig.root.position.set(this.x, this.y, this.z);
    this.rig.root.rotation.y = this.yaw;
    const actionT = mode === 'telegraph' ? Math.min(1, t / this.cfg.wind) : mode === 'strike' ? Math.min(1, t / this.cfg.strike) : 0;
    // Resident/player gait already follows resolved metres. Do the same for humanoid enemies,
    // retaining their existing free-travel cycle rates (run 1.5 Hz, return 0.9 Hz) and amplitude.
    // Switching state must not rescale a lifetime clock or animate footsteps against a blocking contact.
    let poseMode = this.state === 'stagger' ? 'hurt' : mode;
    const locomotion = mode === 'walk' || mode === 'run';
    if (this.rig.kind === 'humanoid' && locomotion) {
      if (travel > 1e-6 && dt > 0) {
        const nominalSpeed = this.cfg.speed * (mode === 'run' ? 1 : 0.7);
        this.gait += travel / (nominalSpeed / (mode === 'run' ? 1.5 : 0.9));
        speed01 *= Math.min(1, travel / (dt * nominalSpeed));
      } else {
        poseMode = 'idle';
        speed01 = 0;
      }
    }
    const movingPose = poseMode === 'walk' || poseMode === 'run';
    const pose: Pose = { mode: poseMode, speed: speed01,
      // A contact holds only gait. The resolved idle must still breathe/look around on its continuous clock.
      time: this.rig.kind === 'humanoid' && movingPose ? this.gait : this.clock * (poseMode === 'run' ? 1.5 : 0.9),
      travel, moveSpeed: dt > 0 ? travel / dt : 0,
      t: this.state === 'stagger' ? 1 - Math.max(0, this.t) / 0.85 : actionT, amp: ctx.reducedMotion ? 0.5 : 1 };
    poseRig(this.rig, pose, dt);
    if (this.state === 'dead' && !this.rig.resident) {
      // Fall over (a figure on its own rig falls in its death clip instead).
      const k = Math.min(1, this.t / 0.6);
      this.rig.body.rotation.z = this.rig.kind === 'thornback' ? k * 1.4 : 0;
      this.rig.body.rotation.x = this.rig.kind === 'humanoid' ? -1.5 * k : 0;
    }
    applyFlash(this.rig, this.rig.hitFlash);
    if (this.rig.hitFlash > 0) this.rig.hitFlash = Math.max(0, this.rig.hitFlash - dt * 4);
  }

  get headPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.x, this.y + this.rig.height + 0.35, this.z);
  }

  /** True while the wind-up is visible (used by the HUD to show a threat cue as well as the animation). */
  get telegraphing() {
    return this.state === 'telegraph';
  }
}

export { NPCS };
