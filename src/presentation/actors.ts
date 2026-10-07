import * as THREE from 'three';
import { BARKS, NPCS, type Activity, type NpcDef } from '../content/npcs';
import { evalAll } from '../game/state';
import type { EncounterId, NpcId, WorldState } from '../game/types';
import type { Collider, Colliders } from '../world/colliders';
import { ANCHORS, MAINT_ROUTE, type EnemySpawn, type V2 } from '../world/layout';
import type { NavGrid } from '../world/nav';
import type { Terrain } from '../world/terrain';
import { applyFlash, createBanditRig, createNpcRig, createThornback, poseRig, type Mode, type Pose, type Rig } from './characters';
import { npcStyle } from './npcStyle';
import { NpcApproachGreeting } from './npcApproachGreeting';
import { EnemyRoute } from './enemyRoute';

const hourIn = (h: number, from: number, to: number) => (from <= to ? h >= from && h < to : h >= from || h < to);

export interface Goal {
  anchor: string;
  activity: Activity;
}

/** Choose where an NPC should be, and what they should be doing, at this hour. */
export function resolveGoal(def: NpcDef, state: WorldState, hour: number): Goal {
  for (const o of def.overrides ?? []) {
    if (!evalAll(state, o.when)) continue;
    if (o.from !== undefined && o.to !== undefined && !hourIn(hour, o.from, o.to)) continue;
    return { anchor: o.anchor, activity: o.activity };
  }
  for (const e of def.schedule) {
    if (hourIn(hour, e.from, e.to)) return { anchor: e.anchor, activity: e.activity };
  }
  return { anchor: def.home, activity: 'rest' };
}

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

/** Actual foot/body geometry, rather than a conservative navigation cell, decides a short local connection. */
function clearNpcSegment(from: V2, to: V2, ctx: Pick<ActorContext, 'terrain' | 'colliders'>, height: number, extra: readonly Collider[] = []): boolean {
  const distance = Math.hypot(to.x - from.x, to.z - from.z), steps = Math.max(1, Math.ceil(distance / .15));
  let x = from.x, z = from.z, y = ctx.terrain.groundAt(x, z);
  if (!Number.isFinite(y)) return false;
  for (let i = 1; i <= steps; i++) {
    const nx = from.x + (to.x - from.x) * i / steps, nz = from.z + (to.z - from.z) * i / steps;
    const ny = ctx.terrain.groundAt(nx, nz);
    if (!ctx.terrain.walkable(nx, nz) || !Number.isFinite(ny) || Math.abs(ny - y) > .3) return false;
    const step = ctx.colliders.move(x, z, nx - x, nz - z, NPC_RADIUS, undefined,
      { minY: Math.min(y, ny) + .02, maxY: Math.max(y, ny) + height }, extra);
    if (Math.hypot(step.x - nx, step.z - nz) > .001) return false;
    x = nx; z = nz; y = ny;
  }
  return true;
}

/** Stable places beside a shared conversation/office anchor; work surfaces and seats retain their authored placement. */
export function npcGoalPosition(def: NpcDef, goal: Goal, ctx: Pick<ActorContext, 'terrain' | 'colliders'>, height: number): V2 & { yaw: number; seat?: number } {
  const base = ANCHORS[goal.anchor] ?? { x: 0, z: 0, yaw: 0 };
  if (goal.activity !== 'stand' && goal.activity !== 'talk') return base;
  const entries = (d: NpcDef) => [...d.schedule, ...d.overrides ?? []];
  const peers = Object.values(NPCS).filter(d => entries(d).some(e => e.anchor === goal.anchor && (e.activity === 'stand' || e.activity === 'talk'))).sort((a, b) => a.id.localeCompare(b.id));
  if (peers.length < 2 || !peers.some(d => d.id === def.id)) return base;
  const chosen: V2[] = [];
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
    chosen.push(stance);
    if (peer.id === def.id) return { ...stance, yaw: base.yaw };
  }
  return base;
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
  private destination: V2 & { yaw: number; seat?: number } = { x: 0, z: 0, yaw: 0 };
  private speed = 0;
  private routeRetry = 0;
  private routeFailures = 0;
  private stuck = 0;
  private dynamicWait = 0;
  private standDelay = 0;
  private navVersion = -1;
  private unavailable = false;
  private waking = false;
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

  /** Initial load/time-skip placement only; running schedules always walk rather than teleporting at a distance. */
  snapToGoal(ctx: ActorContext) {
    const g = resolveGoal(this.def, ctx.state, ctx.hour);
    this.goal = g;
    const a = this.destination = npcGoalPosition(this.def, g, ctx, this.rig.height);
    this.x = a.x;
    this.z = a.z;
    this.yaw = a.yaw;
    this.path = null;
    this.pi = 0;
    this.maintenanceCursor = 0;
    this.speed = this.stuck = this.dynamicWait = this.standDelay = this.routeRetry = this.routeFailures = 0;
    this.navVersion = ctx.colliders.version;
    this.hidden = g.activity === 'rest';
    this.waking = false;
    this.placed = true;
    this.y = ctx.terrain.groundAt(this.x, this.z);
    this.rig.root.position.set(this.x, this.y, this.z);
    this.rig.root.rotation.y = this.yaw;
    this.rig.root.visible = !this.hidden;
  }

  private atDestination() {
    return Math.hypot(this.x - this.destination.x, this.z - this.destination.z) <= arrivalRadius(this.goal.activity);
  }

  private planRoute(ctx: ActorContext, maintenance = false) {
    const from = { x: this.x, z: this.z }, to = this.destination;
    const continuingMaintenance = this.viaMaint;
    this.viaMaint = false;
    if (Math.hypot(to.x - from.x, to.z - from.z) <= 3 && clearNpcSegment(from, to, ctx, this.rig.height)) {
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
    if (distance < 3) return false;
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
    const changed = goal.anchor !== this.goal.anchor || goal.activity !== this.goal.activity;
    if (changed || this.unavailable) {
      const wasResting = this.goal.activity === 'rest';
      if (this.mode === 'sit' || this.goal.activity === 'sit' && this.talking) this.standDelay = .85;
      this.goal = goal;
      this.destination = npcGoalPosition(this.def, goal, ctx, this.rig.height);
      if (this.hidden && goal.activity !== 'rest') {
        if (wasResting || this.waking) {
          // Share a doorway in turns, rather than materialising two bodies on the same home anchor.
          this.waking = true;
        } else this.hidden = false;
      }
      if (goal.activity === 'rest') this.waking = false;
      this.unavailable = false;
      this.routeFailures = 0;
      this.routeRetry = 0;
      if (!this.atDestination()) this.planRoute(ctx, true);
      else this.path = null;
    }
    if (this.waking) {
      const y = ctx.terrain.groundAt(this.x, this.z);
      const resolved = ctx.colliders.resolve(this.x, this.z, NPC_RADIUS, `person:${this.id}`, { minY: y + .02, maxY: y + this.rig.height }, contacts);
      if (Math.hypot(resolved.x - this.x, resolved.z - this.z) < .001) { this.hidden = false; this.waking = false; }
    }

    this.routeRetry = Math.max(0, this.routeRetry - dt);
    if (this.navVersion !== ctx.colliders.version) { this.navVersion = ctx.colliders.version; this.routeRetry = 0; }
    if (!this.hidden && !this.talking && !this.atDestination() && this.routeRetry === 0 && (!this.path || this.stuck > 1.5 && this.dynamicWait === 0)) this.planRoute(ctx, this.viaMaint);

    this.clock += dt;
    let moving = false;
    let travelled = 0;
    let dynamicBlocked = false;
    const substeps = Math.max(1, Math.ceil(dt / .05)), stepDt = dt / substeps;
    for (let sub = 0; sub < substeps; sub++) {
      if (this.talking || this.hidden || this.standDelay > 0) { this.speed = 0; this.standDelay = Math.max(0, this.standDelay - stepDt); continue; }
      while (this.path && this.pi < this.path.length) {
        const wp = this.path[this.pi]!, d = Math.hypot(wp.x - this.x, wp.z - this.z);
        if (d <= (this.pi === this.path.length - 1 ? arrivalRadius(this.goal.activity) : .2)) { this.passedWaypoint(wp); this.pi++; continue; }
        // Short, verified corner cuts keep a route from stopping at every grid vertex.
        const next = this.path[this.pi + 1];
        if (next && d < .55) {
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
      this.yaw = lerpAngle(this.yaw, yaw, 1 - Math.exp(-stepDt * 8));
      const alignment = Math.max(0, Math.cos(yaw - this.yaw));
      const final = this.pi === this.path.length - 1;
      let wanted = Math.min(NPC_WALK_SPEED, Math.sqrt(2 * NPC_BRAKING * Math.max(0, final ? d - arrivalRadius(this.goal.activity) : d))) * alignment;
      const ahead = Math.min(d, .65), y = ctx.terrain.groundAt(this.x, this.z);
      const hit = ctx.colliders.cast(this.x, this.z, this.x + dx / d * ahead, this.z + dz / d * ahead, NPC_RADIUS,
        new Set([`person:${this.id}`]), { minY: y + .02, maxY: y + this.rig.height }, contacts, true);
      if (hit) {
        wanted = Math.min(wanted, Math.sqrt(2 * NPC_BRAKING * Math.max(0, hit.t * ahead - .025)));
        dynamicBlocked ||= contacts.some(c => c.id === hit.collider.id);
      }
      const change = (wanted > this.speed ? NPC_ACCELERATION : NPC_BRAKING) * stepDt;
      this.speed += Math.max(-change, Math.min(change, wanted - this.speed));
      const step = Math.min(d, this.speed * alignment * stepDt);
      const nx = this.x + dx / d * step, nz = this.z + dz / d * step, ny = ctx.terrain.groundAt(nx, nz);
      if (!ctx.terrain.walkable(nx, nz) || !Number.isFinite(ny) || Math.abs(ny - y) > .3) { this.speed = 0; continue; }
      const result = ctx.colliders.move(this.x, this.z, nx - this.x, nz - this.z, NPC_RADIUS, `person:${this.id}`,
        { minY: Math.min(y, ny) + .02, maxY: Math.max(y, ny) + this.rig.height }, contacts);
      const travel = Math.hypot(result.x - this.x, result.z - this.z), ground = ctx.terrain.groundAt(result.x, result.z);
      // An overlapping visitor must not throw a resident across the lane in a single resolve call.
      if (travel > step + .025 || !ctx.terrain.walkable(result.x, result.z) || !Number.isFinite(ground) || Math.abs(ground - y) > .3) { this.speed = 0; continue; }
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
        const to = this.faceTo ?? ctx.player;
        const target = Math.atan2(to.x - this.x, to.z - this.z);
        this.yaw = lerpAngle(this.yaw, target, 1 - Math.exp(-dt * 6));
      } else if (!this.path && this.atDestination()) {
        const a = this.destination;
        this.yaw = lerpAngle(this.yaw, a.yaw, 1 - Math.exp(-dt * 3));
        if (this.goal.activity === 'rest' && Math.hypot(this.x - a.x, this.z - a.z) < 1.2) this.hidden = true;
      }
    }

    this.y = ctx.terrain.groundAt(this.x, this.z);
    this.rig.root.visible = !this.hidden;
    this.rig.root.position.set(this.x, this.y, this.z);
    this.rig.root.rotation.y = this.yaw;

    let mode: Mode = 'idle';
    if (moving) mode = 'walk';
    else if (this.talking) mode = this.speaking ? 'talk' : this.goal.activity === 'sit' && this.atDestination() ? 'sit' : 'idle';
    else if (!this.path && this.atDestination()) {
      const act = this.goal.activity;
      mode = act === 'work' ? 'work' : act === 'sit' ? 'sit' : 'idle';
      // Work only reads as work at a work place; a distant anchor mismatch leaves them idle.
    }
    this.mode = mode;
    // A resident waiting at a doorway cannot keep walking in place. Only resolved route metres advance the gait.
    this.anim += travel / (NPC_WALK_CYCLE_METRES * (this.rig.height / 1.8));
    const style = npcStyle(this.def.id);
    const pose: Pose = {
      mode,
      speed: moving && dt > 0 ? NPC_WALK_POSE_SPEED * Math.min(1, travel / dt / NPC_WALK_SPEED) : 0,
      time: mode === 'walk' ? this.anim : this.clock,
      t: 0,
      // Locomotion remains distance-matched; Reduced Motion reduces idle/work gestures rather than making moving feet shuffle.
      amp: ctx.reducedMotion && !moving ? 0.4 : 1,
      travel,
      moveSpeed: dt > 0 ? travel / dt : 0,
      workGesture: style.work,
      seated: !moving && this.goal.activity === 'sit' && this.atDestination(),
      seatHeight: this.destination.seat,
      // Standing about, a resident folds their arms, looks round, shifts their weight (still when motion is reduced).
      idle: ctx.reducedMotion ? undefined : { seed: style.faceSeed, clock: this.clock },
    };
    if (!this.hidden) poseRig(this.rig, pose, dt);

    // Ambient remarks when the player passes close.
    if (!this.hidden) {
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
    const seated = this.goal.activity === 'sit' && this.atDestination() && this.mode !== 'walk';
    const lower = this.rig.cur?.lower;
    const supported = Number.isFinite(lower) ? Math.max(-.65, Math.min(0, lower!)) * ((this.rig.hipY || .95) / .95) : seated ? -.45 : 0;
    return new THREE.Vector3(this.x, this.y + 1.95 * this.def.look.height + supported, this.z);
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
    if (this.state === 'dead') {
      // Fall over.
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
