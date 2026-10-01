import * as THREE from 'three';
import { BARKS, NPCS, type Activity, type NpcDef } from '../content/npcs';
import { evalAll } from '../game/state';
import type { EncounterId, NpcId, WorldState } from '../game/types';
import type { Colliders } from '../world/colliders';
import { ANCHORS, MAINT_ROUTE, type EnemySpawn, type V2 } from '../world/layout';
import type { NavGrid } from '../world/nav';
import type { Terrain } from '../world/terrain';
import { applyFlash, createBanditRig, createNpcRig, createThornback, poseRig, type Mode, type Pose, type Rig } from './characters';
import { npcStyle } from './npcStyle';

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
  nav: NavGrid;
  state: WorldState;
  hour: number;
  player: { x: number; z: number; y: number };
  reducedMotion: boolean;
  onBark: (a: NpcActor, text: string) => void;
}

const WALK_SPEED = 1.55;

export class NpcActor {
  readonly def: NpcDef;
  readonly rig: Rig;
  x = 0;
  z = 0;
  y = 0;
  yaw = 0;
  hidden = false;
  talking = false;
  goal: Goal = { anchor: '', activity: 'stand' };
  private path: V2[] | null = null;
  private pi = 0;
  private clock = Math.random() * 10;
  private anim = 0;
  private barkCooldown = 8 + Math.random() * 10;
  private lastBarkKey = '';
  private placed = false;
  private viaMaint = false;
  mode: Mode = 'idle';

  constructor(def: NpcDef) {
    this.def = def;
    this.rig = createNpcRig(def);
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

  private anchorPos(name: string): V2 & { yaw: number } {
    return ANCHORS[name] ?? { x: 0, z: 0, yaw: 0 };
  }

  /** Put the actor at the place their schedule says they should be right now (used at load and for far-away actors). */
  snapToGoal(ctx: ActorContext) {
    const g = resolveGoal(this.def, ctx.state, ctx.hour);
    this.goal = g;
    const a = this.anchorPos(g.anchor);
    this.x = a.x;
    this.z = a.z;
    this.yaw = a.yaw;
    this.path = null;
    this.hidden = g.activity === 'rest';
    this.placed = true;
    this.y = ctx.terrain.groundAt(this.x, this.z);
  }

  update(dt: number, ctx: ActorContext) {
    const avail = ctx.state.npcs[this.def.id].available;
    if (!avail) {
      this.hidden = true;
      this.rig.root.visible = false;
      return;
    }
    if (!this.placed) this.snapToGoal(ctx);
    const goal = resolveGoal(this.def, ctx.state, ctx.hour);
    const changed = goal.anchor !== this.goal.anchor || goal.activity !== this.goal.activity;
    if (changed) {
      const prevAnchor = this.goal.anchor;
      this.goal = goal;
      const a = this.anchorPos(goal.anchor);
      const distToPlayer = Math.hypot(this.x - ctx.player.x, this.z - ctx.player.z);
      if (this.hidden && goal.activity !== 'rest') {
        // Step out of the house at the door.
        const home = this.anchorPos(this.def.home);
        this.x = home.x;
        this.z = home.z;
        this.hidden = false;
      }
      if (goal.anchor !== prevAnchor) {
        this.viaMaint = false;
        const nearLedge = Math.hypot(this.x - MAINT_ROUTE[0]!.x, this.z - MAINT_ROUTE[0]!.z) < 30;
        if (this.def.id === 'maintenance_worker' && nearLedge && ctx.state.facts.ila_method === 'shortcut') {
          // She walks the old track through the maintenance gate rather than past the beast.
          const wp = [...MAINT_ROUTE];
          const rest = ctx.nav.findPath(wp[wp.length - 1]!, a);
          this.path = rest ? [...wp, ...rest] : wp;
          this.pi = 0;
          this.viaMaint = true;
        } else if (distToPlayer > 90) {
          this.x = a.x;
          this.z = a.z;
          this.yaw = a.yaw;
          this.path = null;
        } else {
          this.path = ctx.nav.findPath({ x: this.x, z: this.z }, a);
          this.pi = 0;
          if (!this.path) {
            // No route: fall back to a bounded state update rather than leaving them stuck.
            this.x = a.x;
            this.z = a.z;
          }
        }
      }
    }

    this.clock += dt;
    let moving = false;
    if (this.path && this.pi < this.path.length && !this.talking) {
      const wp = this.path[this.pi]!;
      const dx = wp.x - this.x;
      const dz = wp.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.35) this.pi++;
      else {
        // Wait rather than shove through the player in a doorway.
        const pd = Math.hypot(ctx.player.x - (this.x + (dx / d) * 0.8), ctx.player.z - (this.z + (dz / d) * 0.8));
        if (pd > 0.9) {
          const step = Math.min(d, WALK_SPEED * dt);
          let nx = this.x + (dx / d) * step;
          let nz = this.z + (dz / d) * step;
          if (!this.viaMaint) {
            const r = ctx.colliders.resolve(nx, nz, 0.35);
            nx = r.x;
            nz = r.z;
          }
          this.x = nx;
          this.z = nz;
          const target = Math.atan2(dx, dz);
          this.yaw = lerpAngle(this.yaw, target, 1 - Math.exp(-dt * 8));
          moving = true;
        }
      }
      if (this.pi >= this.path.length) this.path = null;
    }

    if (!moving) {
      if (this.talking) {
        const target = Math.atan2(ctx.player.x - this.x, ctx.player.z - this.z);
        this.yaw = lerpAngle(this.yaw, target, 1 - Math.exp(-dt * 6));
      } else if (!this.path) {
        const a = this.anchorPos(this.goal.anchor);
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
    else if (this.talking) mode = 'talk';
    else if (!this.path) {
      const act = this.goal.activity;
      mode = act === 'work' ? 'work' : act === 'sit' ? 'sit' : act === 'talk' ? 'talk' : 'idle';
      // Work only reads as work at a work place; a distant anchor mismatch leaves them idle.
    }
    this.mode = mode;
    this.anim += dt * (moving ? 1.05 : 0.3);
    const style = npcStyle(this.def.id);
    const pose: Pose = {
      mode,
      speed: moving ? 0.55 : 0,
      time: mode === 'work' || mode === 'sit' ? this.clock : this.anim,
      t: 0,
      amp: ctx.reducedMotion ? 0.4 : 1,
      workGesture: style.work,
      // Standing about, a resident folds their arms, looks round, shifts their weight (still when motion is reduced).
      idle: ctx.reducedMotion ? undefined : { seed: style.faceSeed, clock: this.clock },
    };
    if (!this.hidden) poseRig(this.rig, pose, dt);

    // Ambient remarks when the player passes close.
    if (!this.hidden) {
      this.barkCooldown -= dt;
      const pd = Math.hypot(ctx.player.x - this.x, ctx.player.z - this.z);
      if (this.barkCooldown <= 0 && pd < 6.5 && !this.talking) {
        const pool = BARKS.filter((b) => b.npc === this.def.id && evalAll(ctx.state, b.when));
        if (pool.length > 0) {
          const pick = pool[Math.floor(Math.random() * pool.length)]!;
          if (pick.text !== this.lastBarkKey || pool.length === 1) {
            this.lastBarkKey = pick.text;
            ctx.onBark(this, pick.text);
          }
        }
        this.barkCooldown = 28 + Math.random() * 20;
      }
    }
  }

  get headPosition(): THREE.Vector3 {
    return new THREE.Vector3(this.x, this.y + 1.95 * this.def.look.height + (this.mode === 'sit' ? -0.45 : 0), this.z);
  }
}

function lerpAngle(a: number, b: number, t: number) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export { lerpAngle };

/* ============================ Enemies ============================ */

export type EnemyState = 'idle' | 'alert' | 'chase' | 'telegraph' | 'strike' | 'recover' | 'stagger' | 'return' | 'dead';

export interface EnemyContext {
  terrain: Terrain;
  colliders: Colliders;
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
  private searchT = 0;
  private dashDir = { x: 0, z: 0 };
  engaged = false;
  fade = 1;
  private idleYaw: number;
  private readonly cfg: { speed: number; reach: number; wind: number; strike: number; recover: number; damage: number; notice: number; leash: number; heavy: boolean };
  readonly name: string;

  constructor(spawn: EnemySpawn) {
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
      this.rig = createBanditRig(spawn.id === 'ford_bandit_b' ? 1 : 0);
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
  }

  private moveToward(tx: number, tz: number, speed: number, dt: number, ctx: EnemyContext, stopDist = 0) {
    const dx = tx - this.x;
    const dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d <= stopDist || d < 1e-4) return false;
    const step = Math.min(speed * dt, d - stopDist);
    let nx = this.x + (dx / d) * step;
    let nz = this.z + (dz / d) * step;
    if (!ctx.terrain.walkable(nx, nz, 1.0)) {
      // Slide along whichever axis stays walkable.
      if (ctx.terrain.walkable(nx, this.z, 1.0)) nz = this.z;
      else if (ctx.terrain.walkable(this.x, nz, 1.0)) nx = this.x;
      else return false;
    }
    const r = ctx.colliders.resolve(nx, nz, this.radius);
    this.x = r.x;
    this.z = r.z;
    this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.25);
    return true;
  }

  update(dt: number, ctx: EnemyContext) {
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
        this.yaw = lerpAngle(this.yaw, this.idleYaw + Math.sin(this.clock * 0.4) * 0.5, 0.02);
        if (this.spawn.kind === 'thornback') {
          const a = this.clock * 0.25;
          this.moveToward(this.spawn.x + Math.cos(a) * 3, this.spawn.z + Math.sin(a) * 3, 0.9, dt, ctx);
          mode = 'walk';
          speed01 = 0.35;
        }
        break;
      }
      case 'alert':
        this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.2);
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
          this.yaw = Math.atan2(dx, dz);
          break;
        }
        this.moveToward(p.x, p.z, this.cfg.speed, dt, ctx, this.cfg.reach * 0.7);
        break;
      }
      case 'telegraph': {
        // The wind-up tracks the player only at the start, so sidestepping works.
        this.t += dt;
        if (this.t < this.cfg.wind * 0.45) this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 0.25);
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
          const r = ctx.colliders.resolve(this.x + this.dashDir.x * 7 * dt, this.z + this.dashDir.z * 7 * dt, this.radius);
          if (ctx.terrain.walkable(r.x, r.z, 1.0)) {
            this.x = r.x;
            this.z = r.z;
          }
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
          const r = ctx.colliders.resolve(this.x + this.dashDir.x * 2.2 * dt, this.z + this.dashDir.z * 2.2 * dt, this.radius);
          if (ctx.terrain.walkable(r.x, r.z, 1.0)) {
            this.x = r.x;
            this.z = r.z;
          }
        }
        if (this.t <= 0) this.state = p.alive ? 'chase' : 'return';
        break;
      case 'return': {
        mode = 'walk';
        speed01 = 0.7;
        const moved = this.moveToward(this.spawn.x, this.spawn.z, this.cfg.speed * 0.7, dt, ctx, 0.6);
        // They regain their health while they return, and rest again at the post.
        this.hp = Math.min(this.maxHp, this.hp + dt * 12);
        if (!moved || Math.hypot(this.x - this.spawn.x, this.z - this.spawn.z) < 1) {
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
    void this.searchT;
    this.applyTransform(ctx, mode, speed01, this.t, dt);
  }

  private applyTransform(ctx: EnemyContext, mode: Mode, speed01: number, t: number, dt: number) {
    this.y = ctx.terrain.groundAt(this.x, this.z);
    this.rig.root.position.set(this.x, this.y, this.z);
    this.rig.root.rotation.y = this.yaw;
    const actionT = mode === 'telegraph' ? Math.min(1, t / this.cfg.wind) : mode === 'strike' ? Math.min(1, t / this.cfg.strike) : 0;
    const pose: Pose = { mode: this.state === 'stagger' ? 'hurt' : mode, speed: speed01, time: this.clock * (mode === 'run' ? 1.5 : 0.9), t: this.state === 'stagger' ? 1 - Math.max(0, this.t) / 0.85 : actionT, amp: ctx.reducedMotion ? 0.5 : 1 };
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
