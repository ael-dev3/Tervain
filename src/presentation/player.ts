import * as THREE from 'three';
import { cliffiness, shoreDistance } from '../world/coast';
import type { Game } from '../game/game';
import type { Input } from '../platform/input';
import type { Settings } from '../platform/settings';
import type { Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import { roadWeight } from '../world/terrain';
import { DECKS } from '../world/layout';
import type { AudioEngine, SurfaceKind } from './audio';
import { createPlayerRig, poseRig, setArmed, setSash, applyFlash, type Mode, type Pose, type Rig } from './characters';
import { EnemyActor, NpcActor, lerpAngle } from './actors';

export type PlayerState = 'free' | 'light' | 'heavy' | 'dodge' | 'hurt' | 'channel' | 'dead';

export const STAMINA_MAX = 100;
const COST = { light: 12, heavy: 30, dodge: 22, jump: 6, blockHit: 18 };
const DUR = { light: 0.62, heavy: 1.05, dodge: 0.4, hurt: 0.38 };
/** Portion of the action after which the blow lands. */
const HIT_AT = { light: 0.45, heavy: 0.6 };
export const PERFECT_BLOCK_WINDOW = 0.18;

/**
 * What the wanderer fights with (proposal). Like the Gothic heroes they arrive with nothing; fists are quick but weak and
 * short, and a guard of bare forearms softens a blow without turning it. The first blade lies in the wreck on the strand.
 */
export interface Arms {
  light: number;
  heavy: number;
  range: { light: number; heavy: number };
  arc: { light: number; heavy: number };
  dur: { light: number; heavy: number };
  cost: { light: number; heavy: number };
  /** Share of a blocked blow that still lands (fresh, tired); a perfect block with a blade parries. */
  guard: { fresh: number; tired: number; perfect: number | 'parry' };
}
export const FISTS: Arms = {
  light: 7,
  heavy: 15,
  range: { light: 1.6, heavy: 1.8 },
  arc: { light: 0.85, heavy: 1.0 },
  dur: { light: 0.5, heavy: 0.9 },
  cost: { light: 9, heavy: 24 },
  guard: { fresh: 0.6, tired: 0.85, perfect: 0.35 },
};
export const BLADE: Arms = {
  light: 19,
  heavy: 42,
  range: { light: 2.35, heavy: 2.7 },
  arc: { light: 1.05, heavy: 1.25 },
  dur: { light: DUR.light, heavy: DUR.heavy },
  cost: { light: COST.light, heavy: COST.heavy },
  guard: { fresh: 0.3, tired: 0.6, perfect: 'parry' },
};
/** Seconds without a fight before the blade goes back on the hip. */
const SHEATHE_AFTER = 6;

export interface PlayerCtx {
  terrain: Terrain;
  colliders: Colliders;
  input: Input;
  settings: Settings;
  game: Game;
  audio: AudioEngine;
  enemies: EnemyActor[];
  npcs: NpcActor[];
  viewYaw: number;
  controllable: boolean;
  onHitEnemy: (e: EnemyActor, killed: boolean, heavy: boolean) => void;
  onHurt: (damage: number, blocked: boolean) => void;
  onDeath: () => void;
  onBoundary: () => void;
}

export class Player {
  readonly rig: Rig;
  readonly group = new THREE.Group();
  x = 0;
  y = 0;
  z = 0;
  yaw = 0;
  vy = 0;
  vx = 0;
  vz = 0;
  grounded = true;
  state: PlayerState = 'free';
  stamina = STAMINA_MAX;
  exhausted = false;
  blocking = false;
  blockTime = 0;
  private timer = 0;
  private dur = 0;
  private hitDone = false;
  private heavy = false;
  private staminaPause = 0;
  private iframes = 0;
  private dodgeDir = { x: 0, z: 0 };
  private stepDist = 0;
  private clock = 0;
  private hurtStagger = false;
  channel: { label: string; t: number; dur: number; done: () => void } | null = null;
  shake = 0;
  inWater = false;
  surface: SurfaceKind = 'grass';
  lastMoveSpeed = 0;
  private wasBlocking = false;
  mode: Mode = 'idle';
  /** Whether the blade is in hand (only when the wanderer has one). */
  drawn = false;
  private calm = 0;
  private shown: 'none' | 'sheathed' | 'drawn' | null = null;

  constructor() {
    this.rig = createPlayerRig();
    this.group.add(this.rig.root);
    this.showArms('none');
  }

  /** The wanderer's weapon, from what they carry. */
  arms(game: Game): Arms {
    return (game.state.inventory.rusted_sword ?? 0) > 0 ? BLADE : FISTS;
  }

  private showArms(state: 'none' | 'sheathed' | 'drawn') {
    if (this.shown === state) return;
    this.shown = state;
    setArmed(this.rig, state);
  }

  get alive() {
    return this.state !== 'dead';
  }

  get invulnerable() {
    return this.iframes > 0;
  }

  get facing() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }

  setPosition(x: number, z: number, yaw: number, terrain: Terrain) {
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.y = terrain.groundAt(x, z);
    this.vy = 0;
    this.grounded = true;
    this.state = 'free';
    this.channel = null;
    this.rig.root.position.set(x, this.y, z);
    this.rig.root.rotation.y = yaw;
  }

  beginChannel(label: string, dur: number, done: () => void) {
    if (this.state !== 'free') return false;
    this.state = 'channel';
    this.channel = { label, t: 0, dur, done };
    this.blocking = false;
    return true;
  }

  cancelChannel() {
    if (this.state === 'channel') {
      this.state = 'free';
      this.channel = null;
    }
  }

  private surfaceAt(ctx: PlayerCtx): SurfaceKind {
    if (ctx.terrain.deckAt(this.x, this.z)) return 'deck';
    if (ctx.terrain.carveAt(this.x, this.z) > 0.12 || ctx.terrain.seaDepth(this.x, this.z) > 0.12) return 'water';
    if (roadWeight(this.x, this.z) > 0.55) return 'road';
    if (ctx.terrain.slopeAt(this.x, this.z) > 0.5) return 'stone';
    if (shoreDistance(this.x, this.z) < 26 && cliffiness(this.z) < 0.5 && this.x < -200) return 'sand';
    return 'grass';
  }

  /** Try to move by (dx, dz) with collision, slope, step and water rules; slides along obstacles. */
  private tryMove(dx: number, dz: number, ctx: PlayerCtx): boolean {
    let moved = false;
    const attempt = (mx: number, mz: number) => {
      if (Math.abs(mx) < 1e-6 && Math.abs(mz) < 1e-6) return false;
      let nx = this.x + mx;
      let nz = this.z + mz;
      const r = ctx.colliders.resolve(nx, nz, 0.4);
      nx = r.x;
      nz = r.z;
      if (!ctx.terrain.walkable(nx, nz)) {
        if (ctx.terrain.valleyRadius(nx, nz) > 1.02) ctx.onBoundary();
        return false;
      }
      const g = ctx.terrain.groundAt(nx, nz);
      if (this.grounded && g - this.y > 0.8) return false;
      if (!this.grounded && g - this.y > 0.35 && this.vy < 0) {
        /* landing above ground handled below */
      }
      this.x = nx;
      this.z = nz;
      return true;
    };
    if (attempt(dx, dz)) moved = true;
    else {
      // Slide: try each axis on its own.
      const a = attempt(dx, 0);
      const b = attempt(0, dz);
      moved = a || b;
    }
    return moved;
  }

  private startAction(kind: 'light' | 'heavy', arms: Arms) {
    this.state = kind;
    this.heavy = kind === 'heavy';
    this.dur = arms.dur[kind];
    this.timer = 0;
    this.hitDone = false;
    this.blocking = false;
  }

  private spend(n: number) {
    this.stamina = Math.max(0, this.stamina - n);
    this.staminaPause = 0.7;
    if (this.stamina <= 0.01) this.exhausted = true;
  }

  /** Damage from an enemy strike. Handles block, perfect block, dodge invulnerability and guard break. */
  receiveHit(damage: number, heavy: boolean, from: EnemyActor, ctx: PlayerCtx) {
    if (this.state === 'dead' || this.iframes > 0) return;
    const dx = from.x - this.x;
    const dz = from.z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const f = this.facing;
    const facing = (dx / d) * f.x + (dz / d) * f.z > 0.17;
    if (this.blocking && facing && this.state === 'free') {
      const arms = this.arms(ctx.game);
      const perfect = this.blockTime < PERFECT_BLOCK_WINDOW;
      // Only a blade turns a blow aside; a guard of bare forearms softens it.
      if (perfect && arms.guard.perfect === 'parry') {
        ctx.audio.hit('perfect');
        from.parried(this.x, this.z);
        this.shake = Math.max(this.shake, 0.1);
        ctx.onHurt(0, true);
        return;
      }
      const skill = ctx.game.state.skills.includes('steady_guard') ? 0.6 : 1;
      const cost = COST.blockHit * skill * (heavy ? 1.6 : 1);
      const tired = this.stamina < cost * 0.5;
      const share = perfect && typeof arms.guard.perfect === 'number' ? arms.guard.perfect : tired ? arms.guard.tired : arms.guard.fresh;
      const dmg = Math.round(damage * share);
      this.spend(cost);
      ctx.audio.hit('block');
      this.shake = Math.max(this.shake, 0.18);
      if (this.stamina <= 0 && heavy) {
        // Guard break on a heavy blow: a brief stagger, never a lock.
        this.state = 'hurt';
        this.timer = 0;
        this.dur = DUR.hurt;
        this.blocking = false;
      }
      this.applyDamage(dmg, true, ctx);
      return;
    }
    ctx.audio.hit('flesh');
    ctx.audio.hurt();
    this.shake = Math.max(this.shake, 0.35);
    this.state = 'hurt';
    this.timer = 0;
    this.dur = DUR.hurt;
    this.blocking = false;
    this.rig.hitFlash = 1;
    this.applyDamage(damage, false, ctx);
    const kx = -dx / d;
    const kz = -dz / d;
    this.tryMove(kx * 0.5, kz * 0.5, ctx);
    this.hurtStagger = true;
  }

  private applyDamage(amount: number, blocked: boolean, ctx: PlayerCtx) {
    if (amount > 0) ctx.game.dispatch({ t: 'damagePlayer', amount });
    ctx.onHurt(amount, blocked);
    if (ctx.game.state.player.health <= 0) {
      this.state = 'dead';
      this.timer = 0;
      this.blocking = false;
      ctx.onDeath();
    }
  }

  update(dt: number, ctx: PlayerCtx) {
    this.clock += dt;
    const inp = ctx.input;
    const control = ctx.controllable;
    this.iframes = Math.max(0, this.iframes - dt);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.staminaPause = Math.max(0, this.staminaPause - dt);
    this.inWater = false;

    // Movement intent relative to the camera.
    const mv = control && (this.state === 'free' || this.state === 'light' || this.state === 'heavy') ? inp.move() : { x: 0, y: 0 };
    const fx = Math.sin(ctx.viewYaw);
    const fz = Math.cos(ctx.viewYaw);
    const rx = -Math.cos(ctx.viewYaw);
    const rz = Math.sin(ctx.viewYaw);
    let wx = fx * mv.y + rx * mv.x;
    let wz = fz * mv.y + rz * mv.x;
    const len = Math.hypot(wx, wz);
    const mag = Math.min(1, len);
    if (len > 0) {
      wx /= len;
      wz /= len;
    }
    const hasInput = mag > 0.05;

    // Blocking.
    const wantBlock = control && (this.state === 'free') && inp.held('block');
    if (wantBlock && !this.blocking) this.blockTime = 0;
    this.blocking = wantBlock;
    if (this.blocking) this.blockTime += dt;
    if (!control && inp.uiOpen) inp.clearToggle('block');

    // Sprint.
    const sprintHeld = control && inp.held('sprint') && hasInput && !this.blocking;
    const sprinting = sprintHeld && this.stamina > 0.5 && !this.exhausted && this.state === 'free';
    if (sprintHeld && this.exhausted) inp.clearToggle('sprint');

    // Actions (edge-triggered).
    const arms = this.arms(ctx.game);
    if (control && this.state === 'free') {
      if (inp.pressed('attack') && !this.blocking) {
        this.startAction('light', arms);
        this.spend(arms.cost.light);
        ctx.audio.swing(false);
      } else if (inp.pressed('heavy') && !this.exhausted && this.stamina >= arms.cost.heavy * 0.6) {
        this.startAction('heavy', arms);
        this.spend(arms.cost.heavy);
        ctx.audio.swing(true);
      } else if (inp.pressed('dodge') && !this.exhausted && this.stamina >= COST.dodge * 0.6) {
        this.state = 'dodge';
        this.timer = 0;
        this.dur = DUR.dodge;
        this.iframes = 0.3;
        this.blocking = false;
        this.spend(COST.dodge);
        this.dodgeDir = hasInput ? { x: wx, z: wz } : { x: -fx, z: -fz };
        this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      } else if (inp.pressed('jump') && this.grounded) {
        this.vy = 5.4;
        this.grounded = false;
        this.stamina = Math.max(0, this.stamina - COST.jump);
        this.staminaPause = 0.4;
      }
    }

    // The blade comes out for a fight and goes back on the hip once things are quiet.
    const hasBlade = arms === BLADE;
    const engaged = ctx.enemies.some((e) => e.alive && e.engaged && Math.hypot(e.x - this.x, e.z - this.z) < 18);
    if (!hasBlade) this.drawn = false;
    else if (this.state === 'light' || this.state === 'heavy' || this.blocking || engaged) {
      this.drawn = true;
      this.calm = 0;
    } else if (this.state === 'free') {
      this.calm += dt;
      if (this.calm > SHEATHE_AFTER) this.drawn = false;
    }
    this.showArms(!hasBlade ? 'none' : this.drawn ? 'drawn' : 'sheathed');

    // State timers.
    let speed = 0;
    switch (this.state) {
      case 'free': {
        const target = sprinting ? 6.0 : this.blocking ? 1.9 : 3.5;
        const back = mv.y < -0.3 && !this.blocking ? 0.7 : 1;
        speed = hasInput ? target * back * Math.max(0.35, mag) : 0;
        break;
      }
      case 'light':
      case 'heavy': {
        this.timer += dt;
        const hitAt = this.heavy ? HIT_AT.heavy : HIT_AT.light;
        const p = this.timer / this.dur;
        // Lunge slightly during the blow, and let the player steer the swing a little.
        speed = p < hitAt + 0.2 ? (this.heavy ? 1.2 : 1.6) : 0;
        if (hasInput && p < hitAt) this.yaw = lerpAngle(this.yaw, Math.atan2(wx, wz), 0.06);
        if (!this.hitDone && p >= hitAt) {
          this.hitDone = true;
          this.resolveBlow(ctx);
        }
        if (this.timer >= this.dur) this.state = 'free';
        break;
      }
      case 'dodge': {
        this.timer += dt;
        speed = 0;
        const p = this.timer / this.dur;
        const v = (1 - p) * 13;
        this.tryMove(this.dodgeDir.x * v * dt, this.dodgeDir.z * v * dt, ctx);
        if (this.timer >= this.dur) this.state = 'free';
        break;
      }
      case 'hurt':
        this.timer += dt;
        if (this.timer >= this.dur) this.state = 'free';
        break;
      case 'channel': {
        const ch = this.channel;
        if (ch) {
          ch.t += dt;
          if (ch.t >= ch.dur) {
            this.channel = null;
            this.state = 'free';
            ch.done();
          } else if (control && (inp.move().x !== 0 || inp.move().y !== 0) && Math.hypot(inp.move().x, inp.move().y) > 0.6) {
            this.cancelChannel();
          }
        } else this.state = 'free';
        break;
      }
      case 'dead':
        this.timer += dt;
        break;
    }

    // Horizontal motion with light inertia.
    const targetVx = wx * speed;
    const targetVz = wz * speed;
    const accel = this.grounded ? 38 : 8;
    const k = 1 - Math.exp(-dt * accel * 0.35);
    this.vx += (targetVx - this.vx) * k;
    this.vz += (targetVz - this.vz) * k;
    if (this.state !== 'dodge' && (Math.abs(this.vx) > 0.01 || Math.abs(this.vz) > 0.01)) {
      const sf = ctx.terrain.carveAt(this.x, this.z) > 0.12 && !ctx.terrain.deckAt(this.x, this.z) ? 0.72 : 1;
      this.tryMove(this.vx * dt * sf, this.vz * dt * sf, ctx);
    }
    this.lastMoveSpeed = Math.hypot(this.vx, this.vz);

    // Facing.
    if (this.state === 'free') {
      if (this.blocking) this.yaw = lerpAngle(this.yaw, ctx.viewYaw, 1 - Math.exp(-dt * 14));
      else if (this.lastMoveSpeed > 0.4 && hasInput) this.yaw = lerpAngle(this.yaw, Math.atan2(this.vx, this.vz), 1 - Math.exp(-dt * 12));
    }

    // Gravity and grounding.
    const ground = ctx.terrain.groundAt(this.x, this.z);
    if (this.grounded) {
      // Follow the ground, but step down gently so slopes do not make the character hop.
      this.y += (ground - this.y) * Math.min(1, dt * 28);
      if (Math.abs(ground - this.y) > 0.6) this.y = ground;
      if (this.y - ground > 0.4) {
        this.grounded = false;
      }
    }
    if (!this.grounded) {
      this.vy -= 17 * dt;
      this.y += this.vy * dt;
      if (this.y <= ground) {
        this.y = ground;
        this.vy = 0;
        this.grounded = true;
      }
    }

    // Stamina.
    if (sprinting && this.lastMoveSpeed > 1) {
      this.stamina = Math.max(0, this.stamina - 12 * dt);
      this.staminaPause = 0.5;
      if (this.stamina <= 0.01) {
        this.exhausted = true;
        inp.clearToggle('sprint');
      }
    } else if (this.staminaPause <= 0 && !this.blocking) {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + (this.exhausted ? 16 : 24) * dt);
    } else if (this.blocking && this.staminaPause <= 0) {
      this.stamina = Math.min(STAMINA_MAX, this.stamina + 6 * dt);
    }
    if (this.exhausted && this.stamina > 22) this.exhausted = false;

    // Footsteps and surface.
    this.surface = this.surfaceAt(ctx);
    this.inWater = this.surface === 'water';
    if (this.grounded && this.lastMoveSpeed > 0.8 && (this.state === 'free')) {
      this.stepDist += this.lastMoveSpeed * dt;
      const stride = sprinting ? 2.2 : 1.85;
      if (this.stepDist > stride) {
        this.stepDist = 0;
        ctx.audio.footstep(this.surface, sprinting);
      }
    } else if (this.lastMoveSpeed < 0.3) this.stepDist = 1.4;

    // Push out of other characters so the player cannot walk through them.
    for (const n of ctx.npcs) {
      if (n.hidden || !ctx.game.state.npcs[n.id].available) continue;
      const dx = this.x - n.x;
      const dz = this.z - n.z;
      const dd = Math.hypot(dx, dz);
      if (dd < 0.75 && dd > 1e-4) {
        this.x = n.x + (dx / dd) * 0.75;
        this.z = n.z + (dz / dd) * 0.75;
      }
    }
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      const dx = this.x - e.x;
      const dz = this.z - e.z;
      const dd = Math.hypot(dx, dz);
      const min = 0.4 + e.radius;
      if (dd < min && dd > 1e-4) {
        this.x = e.x + (dx / dd) * min;
        this.z = e.z + (dz / dd) * min;
      }
    }
    void DECKS;

    this.applyPose(dt, ctx);
    ctx.game.setPlayerTransform(this.x, this.y, this.z, this.yaw);
  }

  /** Resolve the moment a swing lands against everything in its arc. */
  private resolveBlow(ctx: PlayerCtx) {
    const arms = this.arms(ctx.game);
    const kind = this.heavy ? 'heavy' : 'light';
    const range = arms.range[kind];
    const half = arms.arc[kind];
    const f = this.facing;
    let any = false;
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      const dx = e.x - this.x;
      const dz = e.z - this.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.radius) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / (d || 1))));
      if (ang > half) continue;
      const dmg = arms[kind];
      const killed = e.takeHit(dmg, this.heavy, this.x, this.z);
      ctx.audio.hit('flesh');
      ctx.onHitEnemy(e, killed, this.heavy);
      any = true;
    }
    if (any) this.shake = Math.max(this.shake, this.heavy ? 0.25 : 0.12);
  }

  private applyPose(dt: number, ctx: PlayerCtx) {
    const g = ctx.game.state;
    let mode: Mode = 'idle';
    let t = 0;
    switch (this.state) {
      case 'light':
        mode = 'attack_light';
        t = this.timer / this.dur;
        break;
      case 'heavy':
        mode = 'attack_heavy';
        t = this.timer / this.dur;
        break;
      case 'dodge':
        mode = 'dodge';
        t = this.timer / this.dur;
        break;
      case 'hurt':
        mode = 'hurt';
        t = this.timer / this.dur;
        break;
      case 'channel':
        mode = 'work';
        break;
      case 'dead':
        mode = 'dead';
        break;
      default:
        if (this.blocking) mode = 'block';
        else if (this.lastMoveSpeed > 4.2) mode = 'run';
        else if (this.lastMoveSpeed > 0.4) mode = 'walk';
    }
    if (!this.grounded && this.state === 'free') mode = 'run';
    this.mode = mode;
    const speedNorm = Math.min(1, this.lastMoveSpeed / (mode === 'run' ? 6 : 3.5));
    const gaitRate = mode === 'run' ? 1.55 : 1.15;
    const pose: Pose = { mode, speed: speedNorm, time: this.clock * gaitRate * (0.5 + speedNorm * 0.6), t, amp: ctx.settings.reducedMotion ? 0.6 : 1 };
    poseRig(this.rig, pose, dt);
    applyFlash(this.rig, this.rig.hitFlash);
    if (this.rig.hitFlash > 0) this.rig.hitFlash = Math.max(0, this.rig.hitFlash - dt * 4);
    this.rig.root.position.set(this.x, this.y, this.z);
    this.rig.root.rotation.y = this.yaw;
    // Clothing that shows local standing.
    const inv = g.inventory;
    const sash = (inv.league_sash ?? 0) > 0 ? 0x4d7a54 : (inv.contract_band ?? 0) > 0 ? 0x8a3a30 : (inv.witness_cord ?? 0) > 0 ? 0xd9c98a : null;
    setSash(this.rig, sash);
    void this.wasBlocking;
    void this.hurtStagger;
  }
}
