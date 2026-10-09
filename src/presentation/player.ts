import { ROCK_STEP_HEIGHT } from '../world/rockContacts';
import * as THREE from 'three';
import { cliffiness, shoreDistance } from '../world/coast';
import type { Game } from '../game/game';
import type { Input } from '../platform/input';
import type { Settings } from '../platform/settings';
import type { Collider, Colliders } from '../world/colliders';
import type { Terrain } from '../world/terrain';
import { roadWeight } from '../world/terrain';
import { LIGHTHOUSE, WORLD } from '../world/layout';
import { lighthouseSurfacesAt, lighthouseTreadTop } from '../world/lighthouse';
import { PLAYER_BODY_HEIGHT, PLAYER_BODY_RADIUS, PLAYER_FOOT_CLEARANCE, supportedPlayerHeight } from '../world/playerPlacement';
import type { AudioEngine, SurfaceKind } from './audio';
import { createPlayerRig, poseRig, setArmed, setSash, applyFlash, type Mode, type Pose, type Rig } from './characters';
import { EnemyActor, NpcActor, lerpAngle } from './actors';
import { HERO_WALK_SPEED, HERO_RUN_SPEED, HERO_GUARD_SPEED, HERO_WALK_CYCLE, HERO_RUN_CYCLE, HERO_RUN_THRESHOLD } from './hero/locomotion';
import { PlayerHuntingVisual } from './playerHunting';

export type PlayerState = 'free' | 'light' | 'heavy' | 'dodge' | 'hurt' | 'channel' | 'dead';

export const STAMINA_MAX = 100;
/** A fresh meter supports about 133 seconds of uninterrupted exploration running. */
const SPRINT_STAMINA_PER_SECOND = 0.75;
const SPRINT_MIN_STAMINA = 0.5;
/** The saddled deer's walk and run under a rider (m/s), A70. */
export const MOUNT_WALK = 2.1, MOUNT_RUN = 6.2;
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
const PLAYER_RADIUS = PLAYER_BODY_RADIUS;
const STEP_HEIGHT = 0.8;
const GROUND_FOLLOW_DROP = 0.5;
const GRAVITY = 17;
const FIRM_FOOTING_SLOPE = 0.95;
/** Sample terrain along the whole move, so a sprint/dodge cannot skip a solid face or water strip. */
const TERRAIN_STEP = 0.16;
/** Water deeper than this lifts the wanderer off the bed into a swim; he finds his feet again below SWIM_EXIT. */
export const SWIM_DEPTH = 1.35;
export const SWIM_EXIT = 1.15;
/** How far below the surface a swimmer's feet hang: chest under, head above. */
export const SWIM_FLOAT = 1.25;
/** Breaststroke and a hard crawl (m/s); the hard pace spends stamina. */
export const SWIM_SPEED = 1.45;
export const SWIM_SPRINT = 2.3;
const SWIM_SPRINT_STAMINA = 6;
/** Walking pace kept in water `depth` metres deep: legs push water from the shins up, and a waist-deep wade halves it. */
export function wadeFactor(depth: number): number {
  const t = Math.min(1, Math.max(0, (depth - 0.1) / 1.05));
  return 1 - 0.5 * t * t * (3 - 2 * t);
}

/** Movable-body contacts share the authoritative player position with the static scenery controller. */
export interface PlayerPhysicsContacts {
  move(x: number, y: number, z: number, dx: number, dz: number, grounded: boolean): { x: number; y: number; z: number };
  /** Highest reachable top below feetY + STEP_HEIGHT, including supports far below a falling body. */
  supportAt(x: number, z: number, feetY: number): number | null;
  ceilingAt(x: number, z: number, radius: number, fromHeadY: number, toHeadY: number): number | null;
  /** Material of the support actually beneath the feet, so wood does not sound like masonry. */
  surfaceAt?(x: number, z: number, feetY: number): SurfaceKind | null;
}

/** The realm's water as the wanderer meets it: where it stands and moves, and what disturbing it does. */
export interface PlayerWater {
  sample(x: number, z: number): { surface: number; bed: number; depth: number; flowX: number; flowZ: number } | null;
  splash(x: number, y: number, z: number, energy: number, push?: { x: number; z: number }, kind?: 'splash' | 'plop' | 'enter' | 'stroke' | 'wade'): void;
  disturb(x: number, z: number, radius: number, strength: number, foam?: number): void;
  emit(kind: 'enter' | 'exit' | 'stroke' | 'wade' | 'dive' | 'surface', x: number, y: number, z: number, energy?: number): void;
}

export interface PlayerCtx {
  terrain: Terrain;
  /** Wading and swimming follow the realm's water when it is given; without it deep water simply blocks. */
  water?: PlayerWater;
  colliders: Colliders;
  input: Input;
  settings: Settings;
  game: Game;
  audio: AudioEngine;
  enemies: EnemyActor[];
  npcs: NpcActor[];
  /** Moving peaceful animals participate in the same swept contacts as residents. */
  wildlifeContacts?: readonly Collider[];
  physics?: PlayerPhysicsContacts;
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
  private gaitTime = 0;
  /** The facing at the last pose, for how far the hero turned between poses (A70). */
  private poseYaw = 0;
  channel: { label: string; t: number; dur: number; done: () => void; kind?: 'skinning'; cancelled?: () => void } | null = null;
  shake = 0;
  inWater = false;
  /** Swimming in water too deep to stand in; the depth of water at the feet (m, 0 on dry ground). */
  swimming = false;
  waterDepth = 0;
  /** Riding the saddled deer (A70): which animal, how high its saddle sits, and its walking and running pace. */
  mount: { id: string; seat: number } | null = null;
  private mountBob = 0;
  private soaked = 0;
  private wakeClock = 0;
  private strokeClock = 0;
  private splashedAt = -Infinity;
  surface: SurfaceKind = 'grass';
  lastMoveSpeed = 0;
  mode: Mode = 'idle';
  /** Whether the blade is in hand (only when the wanderer has one). */
  drawn = false;
  private calm = 0;
  private shown: 'none' | 'sheathed' | 'drawn' | null = null;
  readonly huntingVisual: PlayerHuntingVisual;
  private skinningHeight: number | undefined;
  private skinningArms: 'none' | 'sheathed' | 'drawn' = 'none';

  constructor(rig: Rig = createPlayerRig()) {
    this.rig = rig;
    this.group.add(this.rig.root);
    this.huntingVisual = new PlayerHuntingVisual(this.rig);
    this.showArms('none');
  }

  /** Ownership and equipment are distinct: carrying the wreck's blade never silently equips it. */
  arms(game: Game): Arms {
    return game.state.equippedWeapon === 'rusted_sword' && (game.state.inventory.rusted_sword ?? 0) > 0 ? BLADE : FISTS;
  }

  bowEquipped(game: Game): boolean {
    return String(game.state.equippedWeapon) === 'hunting_bow' &&
      ((game.state.inventory as Partial<Record<string, number>>).hunting_bow ?? 0) > 0;
  }

  get bowAiming(): boolean { return this.huntingVisual.isAiming && this.state === 'free' && !this.swimming; }

  /** Gameplay supplies the camera/muzzle target direction and the normalized draw charge. */
  setBowAim(direction: { x: number; y: number; z: number } | null, drawProgress = 0): void {
    if (this.swimming) direction = null;
    this.huntingVisual.setAim(this.state === 'free' && this.alive ? direction : null, drawProgress);
    if (direction && this.state === 'free' && Number.isFinite(direction.x) && Number.isFinite(direction.z) &&
      Math.hypot(direction.x, direction.z) > .001) this.yaw = Math.atan2(direction.x, direction.z);
  }

  /** Returns the visible arrow tip, then animates the release hand; ammunition remains gameplay-owned. */
  releaseBow(): { origin: THREE.Vector3; direction: THREE.Vector3 } | null {
    return this.state === 'free' && this.alive && !this.swimming ? this.huntingVisual.release() : null;
  }

  get skinningProgress(): number | null {
    return this.channel?.kind === 'skinning' ? Math.min(1, this.channel.t / this.channel.dur) : null;
  }

  beginSkinning(targetX: number, targetZ: number, duration = 3, done: () => void = () => {}, cancelled?: () => void, targetHeight?: number): boolean {
    if (!this.grounded || ![targetX, targetZ, duration].every(Number.isFinite) || duration <= 0 ||
      !this.beginChannel('Skinning animal', duration, done)) return false;
    this.channel!.kind = 'skinning';
    this.channel!.cancelled = cancelled;
    this.skinningArms = this.shown ?? 'none';
    this.showArms('none');
    this.skinningHeight = targetHeight !== undefined && Number.isFinite(targetHeight) ? targetHeight - this.y : .4;
    this.yaw = Math.atan2(targetX - this.x, targetZ - this.z);
    this.setBowAim(null);
    this.huntingVisual.setSkinning(0, 0, this.skinningHeight);
    return true;
  }

  cancelSkinning(): void { if (this.channel?.kind === 'skinning') this.cancelChannel(); }

  dispose(): void { this.cancelSkinning(); this.huntingVisual.dispose(); }

  /** Equipment changes remain visible while inventory pauses the world; an unfinished blow cannot change weapon halfway through. */
  syncEquipment(game: Game, draw = false) {
    if (this.state === 'light' || this.state === 'heavy') {
      this.state = 'free';
      this.timer = this.dur = 0;
      this.hitDone = true;
    }
    this.blocking = false;
    this.blockTime = 0;
    const armed = this.arms(game) === BLADE;
    this.cancelSkinning();
    this.huntingVisual.setEquipped(this.bowEquipped(game));
    this.drawn = armed && draw;
    this.calm = 0;
    this.showArms(!armed ? 'none' : this.drawn ? 'drawn' : 'sheathed');
  }

  /** Re-selecting the held blade readies it without cancelling a blow or dropping guard. */
  readyWeapon(game: Game) {
    if (this.alive && this.bowEquipped(game)) { this.huntingVisual.setEquipped(true); return; }
    if (!this.alive || this.arms(game) !== BLADE) return;
    this.drawn = true;
    this.calm = 0;
    this.showArms('drawn');
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

  /** Climb into the saddle of an animal standing at (x, z) facing yaw (A70). */
  mountUp(id: string, seat: number, x: number, y: number, z: number, yaw: number) {
    this.cancelSkinning();
    this.mount = { id, seat };
    this.x = x; this.y = y; this.z = z; this.yaw = yaw; this.poseYaw = yaw;
    this.vx = this.vz = this.vy = 0; this.grounded = true; this.blocking = false;
  }

  /** Step down beside the mount; returns where he stands. */
  dismount(ctx: Pick<PlayerCtx, 'terrain' | 'colliders'>): void {
    if (!this.mount) return;
    this.mount = null;
    for (const side of [1, -1, 2, -2]) {
      const a = this.yaw + side * Math.PI / 2, d = Math.abs(side) === 2 ? 1.6 : 1.1;
      const x = this.x + Math.sin(a) * d, z = this.z + Math.cos(a) * d;
      if (!ctx.colliders.blocked(x, z, PLAYER_RADIUS)) { this.x = x; this.z = z; break; }
    }
    this.y = ctx.terrain.supportAt(this.x, this.z, this.y + 0.5);
    this.vx = this.vz = this.vy = 0; this.grounded = true;
  }

  setPosition(x: number, z: number, yaw: number, terrain: Terrain, feetY?: number) {
    this.mount = null;
    this.cancelSkinning();
    this.huntingVisual.restorePose();
    this.huntingVisual.setAim(null);
    this.huntingVisual.setSkinning(null);
    this.x = x;
    this.z = z;
    this.yaw = yaw;
    this.y = supportedPlayerHeight(terrain, x, z, feetY);
    this.vx = this.vy = this.vz = 0;
    this.grounded = true;
    this.state = 'free';
    this.timer = this.dur = 0;
    this.hitDone = false;
    this.heavy = false;
    this.iframes = 0;
    this.shake = 0;
    this.blocking = false;
    this.blockTime = 0;
    this.dodgeDir = { x: 0, z: 0 };
    this.lastMoveSpeed = 0;
    this.stepDist = 0;
    this.gaitTime = 0;
    this.staminaPause = 0;
    this.exhausted = this.stamina <= 0.01;
    this.drawn = false;
    this.calm = 0;
    this.inWater = false;
    this.swimming = false;
    this.waterDepth = 0;
    this.soaked = this.wakeClock = this.strokeClock = 0;
    this.mode = 'idle';
    this.rig.hitFlash = 0;
    this.rig.hero?.reset();
    this.channel = null;
    this.rig.root.position.set(x, this.y, z);
    this.rig.root.rotation.y = yaw;
  }

  beginChannel(label: string, dur: number, done: () => void) {
    if (this.state !== 'free' || this.swimming) return false;
    this.state = 'channel';
    this.channel = { label, t: 0, dur, done };
    this.blocking = false;
    this.vx = this.vz = this.lastMoveSpeed = 0;
    return true;
  }

  cancelChannel() {
    if (this.state === 'channel') {
      const cancelled = this.channel?.cancelled;
      if (this.channel?.kind === 'skinning') this.showArms(this.skinningArms);
      this.state = 'free';
      this.channel = null;
      this.huntingVisual.setSkinning(null);
      this.huntingVisual.restorePose();
      cancelled?.();
    }
  }

  private surfaceAt(ctx: PlayerCtx): SurfaceKind {
    const movableSurface = ctx.physics?.surfaceAt?.(this.x, this.z, this.y);
    if (movableSurface) return movableSurface;
    if (ctx.terrain.deckAt(this.x, this.z)) return 'deck';
    const support = this.supportAt(this.x, this.z, ctx);
    if (support > ctx.terrain.groundAt(this.x, this.z) + 0.02) {
      // The lighthouse list also contains low stone doorsteps; only the elevated stair/gallery treads are wood.
      const wood = lighthouseSurfacesAt(this.x, this.z).some((height) => height >= lighthouseTreadTop(0) - 1e-6 &&
        Math.abs(ctx.terrain.heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z) + height - support) < 0.02);
      return wood ? 'deck' : 'stone';
    }
    if (ctx.water ? this.waterDepth > 0.06 : ctx.terrain.carveAt(this.x, this.z) > 0.12 || ctx.terrain.seaDepth(this.x, this.z) > 0.12) return 'water';
    if (roadWeight(this.x, this.z) > 0.55) return 'road';
    if (ctx.terrain.slopeAt(this.x, this.z) > 0.5) return 'stone';
    if (shoreDistance(this.x, this.z) < 26 && cliffiness(this.z) < 0.5 && this.x < -200) return 'sand';
    return 'grass';
  }

  private supportAt(x: number, z: number, ctx: PlayerCtx, feetY = this.y): number {
    const base = Math.max(ctx.terrain.supportAt(x, z, feetY), ctx.physics?.supportAt(x, z, feetY) ?? -Infinity);
    // Low furniture is landed on, not sunk into, where the body fits above it (a stool under a table does not) (A70).
    const top = ctx.colliders.lowTopAt(x, z, PLAYER_RADIUS * 0.6, feetY);
    if (top === null || top <= base) return base;
    const above = { minY: top + PLAYER_FOOT_CLEARANCE, maxY: top + PLAYER_BODY_HEIGHT, excludePrecise: Boolean(ctx.physics) };
    return ctx.colliders.blocked(x, z, PLAYER_RADIUS, above) ? base : top;
  }

  /** Reachable standing windows select stairs for walking, but a fast fall must also meet surfaces crossed this frame. */
  private fallingSupport(nextY: number, support: number, ctx: PlayerCtx): number {
    if (nextY >= this.y || support >= this.y - STEP_HEIGHT) return support;
    const samples = Math.min(64, Math.max(1, Math.ceil((this.y - nextY) / 0.4)));
    for (let i = 1; i <= samples; i++) {
      const feetY = this.y + (nextY - this.y) * i / samples;
      const crossed = this.supportAt(this.x, this.z, ctx, feetY);
      // A nearby overhead tread is never a foothold above the descending body's previous feet.
      if (crossed <= this.y + 1e-6) support = Math.max(support, crossed);
    }
    return support;
  }

  /** Source-supported rocks use the modest ledge budget; authored stairs retain their established step height. */
  private stepHeightAt(x: number, z: number, support: number, ctx: PlayerCtx): number {
    const rock = ctx.terrain.rockSupportAt?.(x, z, this.y);
    return rock !== null && rock !== undefined && support > ctx.terrain.groundAt(x, z) + .02 &&
      Math.abs(rock - support) < .01 ? ROCK_STEP_HEIGHT : STEP_HEIGHT;
  }

  /** A hillside is contact geometry, not a horizontal fence derived from a slope cutoff. */
  private travelAllowed(x: number, z: number, feetY: number, ctx: PlayerCtx): boolean {
    if (ctx.terrain.walkable(x, z, Infinity, feetY)) return true;
    // Water too deep to walk in is waded or swum, anywhere inside the realm.
    if (!ctx.water || x < WORLD.minX + 4 || x > WORLD.maxX - 4 || z < WORLD.minZ + 4 || z > WORLD.maxZ - 4) return false;
    if (ctx.terrain.valleyRadius(x, z) > 1.02) return false;
    return (ctx.water.sample(x, z)?.depth ?? 0) > 0.3;
  }

  /** Gravity along exposed steep ground lets loose footing slide downhill instead of holding a vertical pose. */
  private downhillGravity(ctx: PlayerCtx): { x: number; z: number; slip: number } {
    if (!this.grounded || ctx.terrain.deckAt(this.x, this.z)) return { x: 0, z: 0, slip: 0 };
    const bareGround = ctx.terrain.groundAt(this.x, this.z);
    if (this.supportAt(this.x, this.z, ctx) > bareGround + 0.02) return { x: 0, z: 0, slip: 0 };
    const slope = ctx.terrain.slopeAt(this.x, this.z);
    if (slope <= FIRM_FOOTING_SLOPE) return { x: 0, z: 0, slip: 0 };
    const e = 0.3;
    const groundAt = ctx.terrain.heightAt?.bind(ctx.terrain) ?? ctx.terrain.groundAt.bind(ctx.terrain);
    const dx = (groundAt(this.x + e, this.z) - groundAt(this.x - e, this.z)) / (2 * e);
    const dz = (groundAt(this.x, this.z + e) - groundAt(this.x, this.z - e)) / (2 * e);
    const slip = Math.min(1, Math.max(0, (slope - FIRM_FOOTING_SLOPE) / 0.3));
    const normalLengthSquared = 1 + dx * dx + dz * dz;
    return { x: -GRAVITY * dx / normalLengthSquared * slip, z: -GRAVITY * dz / normalLengthSquared * slip, slip };
  }

  /** Living people are contact volumes, not unrestricted post-physics position pushes. */
  private contacts(ctx: PlayerCtx): Collider[] {
    const contacts: Collider[] = [...(ctx.wildlifeContacts ?? [])];
    for (const n of ctx.npcs) {
      if (n.hidden || !ctx.game.state.npcs[n.id]?.available) continue;
      contacts.push({ id: `person:${n.id}`, kind: 'circle', x: n.x, z: n.z, r: 0.35, active: true, minY: n.y, maxY: n.y + 2.1 });
    }
    for (const e of ctx.enemies) {
      if (!e.alive) continue;
      contacts.push({ id: `enemy:${e.id}`, kind: 'circle', x: e.x, z: e.z, r: e.radius, active: true, minY: e.y, maxY: e.y + 2.1 });
    }
    return contacts;
  }

  /** A movable-body slide may not place the player inside an actor or back through static scenery. */
  private contactClear(x: number, y: number, z: number, ctx: PlayerCtx, people: readonly Collider[]): boolean {
    const bounds = { minY: y + PLAYER_FOOT_CLEARANCE, maxY: y + PLAYER_BODY_HEIGHT, excludePrecise: Boolean(ctx.physics) };
    if (ctx.colliders.blocked(x, z, PLAYER_RADIUS, bounds)) return false;
    const clear = ctx.colliders.resolve(x, z, PLAYER_RADIUS, undefined, bounds, people);
    return Math.hypot(clear.x - x, clear.z - z) < 0.001;
  }

  /** Actors can approach a stationary player. Correct those contacts through the same swept scenery constraint. */
  private settleContacts(ctx: PlayerCtx) {
    const bounds = { minY: this.y + PLAYER_FOOT_CLEARANCE, maxY: this.y + PLAYER_BODY_HEIGHT, excludePrecise: Boolean(ctx.physics) };
    const people = this.contacts(ctx);
    const target = ctx.colliders.resolve(this.x, this.z, PLAYER_RADIUS, undefined, bounds, people);
    if (!target.hit) return;
    if (Math.hypot(target.x - this.x, target.z - this.z) > PLAYER_RADIUS * 2 + 0.05) return;
    const scenerySafe = ctx.colliders.move(this.x, this.z, target.x - this.x, target.z - this.z, PLAYER_RADIUS, undefined, bounds);
    const safe = ctx.physics?.move(this.x, this.y, this.z, scenerySafe.x - this.x, scenerySafe.z - this.z, this.grounded) ?? { ...scenerySafe, y: this.y };
    const ground = this.supportAt(safe.x, safe.z, ctx, safe.y);
    // A push out of one body never crosses another: out of a sack pile against a wall it used to land the hero on the far
    // side of the wall (A70). Only what he stands in may lie between.
    const inside = new Set(ctx.colliders.near(this.x, this.z, PLAYER_RADIUS).map((c) => c.id));
    if (ctx.colliders.cast(this.x, this.z, safe.x, safe.z, 0, inside, bounds)) return;
    if (!this.travelAllowed(safe.x, safe.z, safe.y, ctx) || ground - this.y > (this.grounded ? this.stepHeightAt(safe.x, safe.z, ground, ctx) : 0.18)) return;
    if (this.grounded && ground > this.y && this.stepHeightAt(safe.x, safe.z, ground, ctx) === ROCK_STEP_HEIGHT &&
      ctx.colliders.ceilingAt(safe.x, safe.z, PLAYER_RADIUS,
      this.y + PLAYER_BODY_HEIGHT, ground + PLAYER_BODY_HEIGHT) !== null) return;
    if (!this.contactClear(safe.x, this.grounded ? Math.max(safe.y, ground) : safe.y, safe.z, ctx, people)) return;
    this.x = safe.x;
    this.z = safe.z;
    if (this.grounded && this.y - ground <= GROUND_FOLLOW_DROP) this.y = ground;
  }

  /** Sweep every move (including dodge, attack and recoil), including real movable-body contacts. */
  private tryMove(dx: number, dz: number, ctx: PlayerCtx): boolean {
    const beforeX = this.x;
    const beforeZ = this.z;
    const contacts = this.contacts(ctx);
    const count = Math.max(1, Math.ceil(Math.hypot(dx, dz) / TERRAIN_STEP));
    const sx = dx / count;
    const sz = dz / count;
    let boundaryReported = false;
    const attempt = (mx: number, mz: number) => {
      if (Math.abs(mx) < 1e-8 && Math.abs(mz) < 1e-8) return false;
      const bounds = { minY: this.y + PLAYER_FOOT_CLEARANCE, maxY: this.y + PLAYER_BODY_HEIGHT, excludePrecise: Boolean(ctx.physics) };
      const result = ctx.colliders.move(this.x, this.z, mx, mz, PLAYER_RADIUS, undefined, bounds, contacts);
      // A step never carries him further than he asked: the excess is a push out of a body he half-entered mid-jump (a window
      // lintel), and its far side lies past the wall (A70).
      if (Math.hypot(result.x - this.x, result.z - this.z) > Math.hypot(mx, mz) + 0.25) return false;
      const physical = ctx.physics?.move(this.x, this.y, this.z, result.x - this.x, result.z - this.z, this.grounded) ?? { ...result, y: this.y };
      const nx = physical.x;
      const nz = physical.z;
      const g = this.supportAt(nx, nz, ctx, physical.y);
      if (!this.travelAllowed(nx, nz, physical.y, ctx) || g - this.y > (this.grounded ? this.stepHeightAt(nx, nz, g, ctx) : this.swimming ? 0.45 : 0.18)) {
        if (!boundaryReported && ctx.terrain.valleyRadius(nx, nz) > 1.02) {
          boundaryReported = true;
          ctx.onBoundary();
        }
        return false;
      }
      // Lifting onto a supported stone must not push the head through an authored deck/ceiling.
      if (this.grounded && g > this.y && this.stepHeightAt(nx, nz, g, ctx) === ROCK_STEP_HEIGHT &&
        ctx.colliders.ceilingAt(nx, nz, PLAYER_RADIUS,
        this.y + PLAYER_BODY_HEIGHT, g + PLAYER_BODY_HEIGHT) !== null) return false;
      // If a crowded doorway cannot satisfy every contact, retain the last scenery-safe position.
      if (!this.contactClear(nx, this.grounded ? Math.max(physical.y, g) : physical.y, nz, ctx, contacts)) return false;
      this.x = nx;
      this.z = nz;
      if (this.grounded) {
        if (this.y - g > GROUND_FOLLOW_DROP) this.grounded = false;
        else this.y = g;
      }
      for (const normal of result.normals) {
        const inward = this.vx * normal.x + this.vz * normal.z;
        if (inward < 0) { this.vx -= normal.x * inward; this.vz -= normal.z * inward; }
      }
      return Math.hypot(nx - beforeX, nz - beforeZ) > 1e-7;
    };
    for (let i = 0; i < count; i++) {
      if (!attempt(sx, sz)) {
        // Ground steps/water edges do not have authored planes; legal axes still give a useful slide.
        const xFirst = Math.abs(sx) >= Math.abs(sz);
        if (xFirst) { attempt(sx, 0); attempt(0, sz); }
        else { attempt(0, sz); attempt(sx, 0); }
      }
    }
    return Math.hypot(this.x - beforeX, this.z - beforeZ) > 1e-6;
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
    if (!ctx.controllable || this.state === 'dead' || this.iframes > 0) return;
    // A strike cannot land through scenery or on someone on a different floor.
    if (Math.abs(from.y - this.y) > 2.1 || ctx.colliders.cast(this.x, this.z, from.x, from.z, 0, undefined, { minY: Math.min(this.y, from.y) + 0.65, maxY: Math.max(this.y, from.y) + 1.35 })) return;
    const dx = from.x - this.x;
    const dz = from.z - this.z;
    const d = Math.hypot(dx, dz) || 1;
    const f = this.facing;
    const facing = (dx / d) * f.x + (dz / d) * f.z > 0.17;
    this.cancelSkinning();
    this.setBowAim(null);
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
      ctx.audio.hit('block', arms === BLADE);
      this.shake = Math.max(this.shake, 0.18);
      if (this.stamina <= 0 && heavy) {
        // Guard break on a heavy blow: a brief stagger, never a lock.
        this.state = 'hurt';
        this.timer = 0;
        this.dur = DUR.hurt;
        this.blocking = false;
        this.vx = this.vz = 0;
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
    this.vx = this.vz = 0;
  }

  private applyDamage(amount: number, blocked: boolean, ctx: PlayerCtx) {
    if (amount > 0) ctx.game.dispatch({ t: 'damagePlayer', amount });
    ctx.onHurt(amount, blocked);
    if (ctx.game.state.player.health <= 0) {
      this.state = 'dead';
      this.timer = 0;
      this.blocking = false;
      this.vx = this.vz = 0;
      ctx.onDeath();
    }
  }

  /** Deep enough to swim, or shallow enough to stand again: the switch between the two, with its splash. */
  private updateSwimming(water: ReturnType<PlayerWater['sample']>, ctx: PlayerCtx) {
    this.waterDepth = water ? Math.max(0, Math.min(water.depth, water.surface - this.y)) : 0;
    if (!ctx.water) return;
    // A bridge, rock or loose body's top is footing: water below it cannot immerse the feet above it.
    const standingDepth = water ? Math.max(0, water.surface - this.supportAt(this.x, this.z, ctx)) : 0;
    if (!this.swimming && water && this.alive && standingDepth >= SWIM_DEPTH && (this.grounded || this.y <= water.surface - SWIM_FLOAT + 0.05)) {
      this.swimming = true;
      // Whatever was in hand stops: no blows, guard, aim or work in deep water.
      if (this.state === 'channel') this.cancelChannel();
      if (this.state === 'light' || this.state === 'heavy' || this.state === 'dodge') { this.state = 'free'; this.timer = this.dur = 0; this.hitDone = true; }
      this.blocking = false;
      this.setBowAim(null);
      this.grounded = false;
      // A plunge already threw its spray as the feet broke the surface; wading out of one's depth is quieter.
      if (this.clock - this.splashedAt < 0.6) ctx.water.emit('enter', this.x, water.surface, this.z, 0.8);
      else ctx.water.splash(this.x, water.surface, this.z, 0.3, { x: this.vx * 0.3, z: this.vz * 0.3 }, 'enter');
      this.vy = Math.min(0, this.vy) * 0.35;
    } else if (this.swimming && (!water || standingDepth < SWIM_EXIT || !this.alive)) {
      this.swimming = false;
      this.vy = 0;
      // Feet find the bed; the ordinary footing takes over from here.
      const ground = this.supportAt(this.x, this.z, ctx);
      if (this.y - ground <= GROUND_FOLLOW_DROP + 0.4) { this.y = Math.max(this.y, ground); this.grounded = true; }
    }
    if (this.waterDepth > 0.75) this.soaked = 1;
  }

  /** A footfall: the surface's own step, or in deeper water a wading slosh and the ripples it leaves. */
  private footfall(ctx: PlayerCtx, sprinting: boolean) {
    const water = ctx.water && this.waterDepth > 0.32 && !this.swimming ? ctx.water.sample(this.x, this.z) : null;
    if (!water) {
      ctx.audio.footstep(this.surface, sprinting);
      return;
    }
    const f = this.facing, pace = Math.min(1, this.lastMoveSpeed / HERO_RUN_SPEED);
    ctx.water!.splash(this.x + f.x * 0.25, water.surface, this.z + f.z * 0.25, 0.05 + 0.2 * pace, { x: this.vx * 0.25, z: this.vz * 0.25 }, 'wade');
  }

  update(dt: number, ctx: PlayerCtx) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    // Reading/paused controls may still request a pose; never drift or finish an action behind that UI.
    if (!ctx.controllable && this.alive) {
      this.vx = this.vz = this.lastMoveSpeed = 0;
      this.blocking = false;
      this.applyPose(0, ctx);
      return;
    }
    this.settleContacts(ctx);
    const frameX = this.x;
    const frameZ = this.z;
    this.clock += dt;
    const inp = ctx.input;
    const hasBow = this.bowEquipped(ctx.game);
    this.huntingVisual.setEquipped(hasBow);
    if (this.state !== 'free') this.setBowAim(null);
    const control = ctx.controllable;
    this.iframes = Math.max(0, this.iframes - dt);
    this.shake = Math.max(0, this.shake - dt * 1.6);
    this.staminaPause = Math.max(0, this.staminaPause - dt);
    this.inWater = false;
    // Water: how deep it stands here, and whether that is deep enough to swim.
    this.updateSwimming(ctx.water?.sample(this.x, this.z) ?? null, ctx);

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
    const wantBlock = control && !hasBow && !this.swimming && !this.mount && (this.state === 'free') && inp.held('block');
    if (wantBlock && !this.blocking) this.blockTime = 0;
    this.blocking = wantBlock;
    if (this.blocking) this.blockTime += dt;
    if (!control && inp.uiOpen) inp.clearToggle('block');

    // Sprint.
    const sprintHeld = control && inp.held('sprint') && hasInput && !this.blocking && !this.bowAiming;
    if (sprintHeld && this.state === 'free' && this.stamina <= SPRINT_MIN_STAMINA) this.exhausted = true;
    const sprinting = sprintHeld && this.stamina > SPRINT_MIN_STAMINA && !this.exhausted && this.state === 'free';
    if (sprintHeld && this.exhausted) inp.clearToggle('sprint');

    // Actions (edge-triggered).
    const arms = this.arms(ctx.game);
    if (control && this.state === 'free' && !this.swimming && !this.mount) {
      if (!hasBow && inp.pressed('attack') && !this.blocking && this.stamina >= arms.cost.light) {
        this.startAction('light', arms);
        this.spend(arms.cost.light);
        ctx.audio.swing(false, arms === BLADE);
      } else if (!hasBow && inp.pressed('heavy') && !this.exhausted && this.stamina >= arms.cost.heavy) {
        this.startAction('heavy', arms);
        this.spend(arms.cost.heavy);
        ctx.audio.swing(true, arms === BLADE);
      } else if (inp.pressed('dodge') && !this.exhausted && this.stamina >= COST.dodge) {
        this.state = 'dodge';
        this.timer = 0;
        this.dur = DUR.dodge;
        this.iframes = 0.3;
        this.blocking = false;
        this.spend(COST.dodge);
        ctx.audio.dodge(this.surface);
        this.dodgeDir = hasInput ? { x: wx, z: wz } : { x: -fx, z: -fz };
        this.yaw = Math.atan2(this.dodgeDir.x, this.dodgeDir.z);
      } else if (inp.pressed('jump') && this.grounded && this.stamina >= COST.jump) {
        this.vy = 5.4;
        this.grounded = false;
        this.stamina = Math.max(0, this.stamina - COST.jump);
        this.staminaPause = 0.4;
        ctx.audio.jump(this.surface);
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
    this.showArms(this.channel?.kind === 'skinning' ? 'none' : !hasBlade ? 'none' : this.drawn ? 'drawn' : 'sheathed');

    // State timers.
    let pendingBlow = false;
    let speed = 0;
    switch (this.state) {
      case 'free': {
        let target = sprinting ? HERO_RUN_SPEED : this.blocking || this.bowAiming ? HERO_GUARD_SPEED : HERO_WALK_SPEED;
        if (this.swimming) target = sprinting ? SWIM_SPRINT : SWIM_SPEED;
        // In the saddle the deer sets the pace: an easy walk, a run with sprint held (A70).
        else if (this.mount) target = sprinting ? MOUNT_RUN : MOUNT_WALK;
        else if (ctx.water) target *= wadeFactor(this.waterDepth);
        const back = mv.y < -0.3 && !this.blocking ? 0.7 : 1;
        speed = hasInput ? target * back * mag : 0;
        break;
      }
      case 'light':
      case 'heavy': {
        this.timer += dt;
        const hitAt = this.heavy ? HIT_AT.heavy : HIT_AT.light;
        const p = this.timer / this.dur;
        // Lunge slightly during the blow, and let the player steer the swing a little.
        speed = p < hitAt + 0.2 ? (this.heavy ? 1.2 : 1.6) : 0;
        if (hasInput && p < hitAt) this.yaw = lerpAngle(this.yaw, Math.atan2(wx, wz), 1 - Math.exp(-dt * 4));
        if (!this.hitDone && p >= hitAt) {
          this.hitDone = true;
          pendingBlow = true;
        }
        if (this.timer >= this.dur) { this.state = 'free'; speed = 0; }
        break;
      }
      case 'dodge': {
        const from = Math.min(this.dur, this.timer);
        const to = Math.min(this.dur, this.timer + dt);
        this.timer += dt;
        speed = 0;
        // Integral of the authored deceleration: equal dodge distance at 30/60/120 Hz, no backwards final frame.
        const distance = 13 * ((to - from) - (to * to - from * from) / (2 * this.dur));
        this.vx = this.vz = 0;
        this.tryMove(this.dodgeDir.x * distance, this.dodgeDir.z * distance, ctx);
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
          // A move requested on the final skinning frame still interrupts the cut before loot can be granted.
          if (ch.kind === 'skinning' && control && Math.hypot(inp.move().x, inp.move().y) > .05) {
            this.cancelChannel();
            break;
          }
          ch.t += dt;
          if (ch.t >= ch.dur) {
            if (ch.kind === 'skinning') this.showArms(this.skinningArms);
            this.channel = null;
            this.state = 'free';
            this.huntingVisual.setSkinning(null);
            ch.done();
          } else if (control && ch.kind !== 'skinning' && Math.hypot(inp.move().x, inp.move().y) > .6) {
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
    const lunging = this.state === 'light' || this.state === 'heavy';
    const forward = this.facing;
    // Releasing a direction in mid-air cannot apply ground friction. Directional input still provides modest air control.
    const coasting = !this.grounded && !this.swimming && !hasInput && this.state === 'free';
    const slope = this.channel?.kind === 'skinning' ? { x: 0, z: 0, slip: 0 } : this.downhillGravity(ctx);
    const rate = this.swimming ? 3.2 : this.grounded ? 13.3 + (2.2 - 13.3) * slope.slip : 2.8;
    // The water carries a swimmer along with it and pulls at a wader's legs.
    const current = ctx.water && (this.swimming || this.grounded) ? ctx.water.sample(this.x, this.z) : null;
    const carry = this.swimming ? 1 : 0.35 * Math.min(1, this.waterDepth / 1.2);
    const targetVx = (coasting ? this.vx : (lunging ? forward.x : wx) * speed) + slope.x / rate + (current?.flowX ?? 0) * carry;
    const targetVz = (coasting ? this.vz : (lunging ? forward.z : wz) * speed) + slope.z / rate + (current?.flowZ ?? 0) * carry;
    const k = 1 - Math.exp(-dt * rate);
    const displacementX = targetVx * dt + (this.vx - targetVx) * k / rate;
    const displacementZ = targetVz * dt + (this.vz - targetVz) * k / rate;
    this.vx += (targetVx - this.vx) * k;
    this.vz += (targetVz - this.vz) * k;
    if (this.state !== 'dodge' && (Math.abs(this.vx) > 0.01 || Math.abs(this.vz) > 0.01)) {
      // Without the water model, any water slows a step; with it, wading depth sets the pace above.
      const sf = !ctx.water && (ctx.terrain.carveAt(this.x, this.z) > 0.12 || ctx.terrain.seaDepth(this.x, this.z) > 0.12) && !ctx.terrain.deckAt(this.x, this.z) ? 0.72 : 1;
      const fromX = this.x;
      const fromZ = this.z;
      const intendedX = displacementX * sf;
      const intendedZ = displacementZ * sf;
      this.tryMove(intendedX, intendedZ, ctx);
      const actualX = this.x - fromX;
      const actualZ = this.z - fromZ;
      if (Math.abs(actualX - intendedX) > 0.001) this.vx = actualX / (dt * sf);
      if (Math.abs(actualZ - intendedZ) > 0.001) this.vz = actualZ / (dt * sf);
    }
    this.lastMoveSpeed = Math.hypot(this.x - frameX, this.z - frameZ) / dt;

    // Facing.
    if (this.state === 'free') {
      if (this.bowAiming) { /* Aim direction is supplied by the camera's selected target. */ }
      else if (this.blocking) this.yaw = lerpAngle(this.yaw, ctx.viewYaw, 1 - Math.exp(-dt * 14));
      else if (this.swimming && hasInput) this.yaw = lerpAngle(this.yaw, Math.atan2(wx, wz), 1 - Math.exp(-dt * 5));
      else if (this.lastMoveSpeed > 0.4 && hasInput) this.yaw = lerpAngle(this.yaw, Math.atan2(this.vx, this.vz), 1 - Math.exp(-dt * 12));
    }

    // Feet follow legal small steps exactly; leaving a ledge starts a fall instead of snapping to its bottom.
    let ground = this.supportAt(this.x, this.z, ctx);
    const swimWater = this.swimming ? ctx.water?.sample(this.x, this.z) ?? null : null;
    if (swimWater) {
      // A damped spring holds the swimmer at the surface: a plunge sinks and bobs back, the swell lifts and lowers him.
      this.vy += (swimWater.surface - SWIM_FLOAT - this.y) * 22 * dt;
      this.vy *= Math.exp(-dt * 6.5);
      this.y += this.vy * dt;
      if (this.y < ground) { this.y = ground; this.vy = Math.max(0, this.vy); }
    } else if (this.grounded) {
      if (this.y - ground > GROUND_FOLLOW_DROP) this.grounded = false;
      else { this.y = ground; this.vy = 0; }
    }
    if (!this.grounded && !swimWater) {
      // Analytic ballistic step keeps jump height and fall travel consistent across frame rates.
      const nextY = this.y + this.vy * dt - 0.5 * GRAVITY * dt * dt;
      ground = this.fallingSupport(nextY, ground, ctx);
      const staticCeiling = ctx.colliders.ceilingAt(this.x, this.z, PLAYER_RADIUS, this.y + PLAYER_BODY_HEIGHT, nextY + PLAYER_BODY_HEIGHT);
      const movableCeiling = ctx.physics?.ceilingAt(this.x, this.z, PLAYER_RADIUS, this.y + PLAYER_BODY_HEIGHT, nextY + PLAYER_BODY_HEIGHT) ?? null;
      const ceiling = staticCeiling === null ? movableCeiling : movableCeiling === null ? staticCeiling : Math.min(staticCeiling, movableCeiling);
      const fromY = this.y;
      this.y = ceiling === null ? nextY : ceiling - PLAYER_BODY_HEIGHT - 0.0001;
      // Falling into water: spray as the feet break the surface.
      const below = ctx.water && this.vy < -2.5 ? ctx.water.sample(this.x, this.z) : null;
      if (below && fromY > below.surface && this.y <= below.surface) {
        ctx.water!.splash(this.x, below.surface, this.z, Math.min(1, -this.vy / 12), { x: this.vx * 0.2, z: this.vz * 0.2 }, 'splash');
        this.splashedAt = this.clock;
      }
      this.vy = ceiling === null ? this.vy - GRAVITY * dt : 0;
      if (this.vy <= 0 && this.y <= ground) {
        // Stepping down a kerb is silent; a jump or a real drop lands audibly.
        if (this.vy < -3.2) ctx.audio.land(this.surface, -this.vy);
        this.y = ground;
        this.vy = 0;
        this.grounded = true;
      }
    }

    if (pendingBlow) this.resolveBlow(ctx);

    // Stamina.
    if (sprinting && this.state === 'free' && this.lastMoveSpeed > 1 && !this.mount) {
      this.stamina = Math.max(0, this.stamina - (this.swimming ? SWIM_SPRINT_STAMINA : SPRINT_STAMINA_PER_SECOND) * dt);
      this.staminaPause = 0.5;
      if (this.stamina <= SPRINT_MIN_STAMINA) {
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
    this.inWater = this.surface === 'water' || this.swimming;
    if (!this.rig.hero && this.grounded && this.lastMoveSpeed > 0.8 && (this.state === 'free')) {
      this.stepDist += this.lastMoveSpeed * dt;
      const stride = sprinting ? HERO_RUN_CYCLE / 2 : HERO_WALK_CYCLE / 2;
      if (this.stepDist > stride) {
        this.stepDist -= stride;
        this.footfall(ctx, sprinting);
      }
    } else if (this.lastMoveSpeed < 0.3) this.stepDist = 0;
    if (ctx.water) this.waterEffects(dt, ctx);


    this.applyPose(dt, ctx);
    // The imported rig reports actual heel strikes; surface sounds follow its visible contacts.
    const footfalls = this.rig.hero?.consumeFootfalls() ?? 0;
    for (let i = 0; i < footfalls; i++) this.footfall(ctx, sprinting);
    if (this.swimming && ctx.water) {
      let strokes = this.rig.hero?.consumeStrokes() ?? 0;
      if (!this.rig.hero) {
        this.strokeClock += dt * 0.78;
        strokes = Math.floor(this.strokeClock);
        this.strokeClock -= strokes;
      }
      const w = strokes > 0 ? ctx.water.sample(this.x, this.z) : null;
      if (w) {
        const f = this.facing, pace = Math.min(1, this.lastMoveSpeed / SWIM_SPRINT);
        ctx.water.splash(this.x + f.x * 0.75, w.surface, this.z + f.z * 0.75, 0.08 + 0.22 * pace, { x: f.x * 0.6, z: f.z * 0.6 }, 'stroke');
      }
    }
    ctx.game.setPlayerTransform(this.x, this.y, this.z, this.yaw);
  }

  /** Ripples around legs or a swimming body, and the drip of climbing out after a swim. */
  private waterEffects(dt: number, ctx: PlayerCtx) {
    const water = ctx.water!;
    if (this.swimming || this.waterDepth > 0.15) {
      this.wakeClock += dt;
      if (this.wakeClock > 0.09) {
        this.wakeClock = 0;
        const speed = this.lastMoveSpeed;
        if (speed > 0.25 || this.swimming) {
          water.disturb(this.x, this.z, this.swimming ? 0.45 : 0.3, (this.swimming ? 0.006 : 0.004) * Math.min(3, 0.5 + speed), 0.05 * Math.min(1, speed / 2));
        }
      }
    }
    if (this.soaked > 0 && this.waterDepth < 0.02 && !this.swimming && this.grounded) {
      water.emit('exit', this.x, this.y + 1, this.z, 0.6);
      this.soaked = 0;
    }
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
      if (d > range + e.radius || Math.abs(e.y - this.y) > 2.1) continue;
      if (ctx.colliders.cast(this.x, this.z, e.x, e.z, 0, undefined, { minY: Math.min(this.y, e.y) + 0.65, maxY: Math.max(this.y, e.y) + 1.35 })) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, (dx * f.x + dz * f.z) / (d || 1))));
      if (ang > half) continue;
      const dmg = arms[kind];
      const killed = e.takeHit(dmg, this.heavy, this.x, this.z);
      ctx.audio.hit('flesh', arms === BLADE);
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
        if (this.swimming) mode = 'swim';
        else if (this.blocking) mode = 'block';
        else if (this.lastMoveSpeed > HERO_RUN_THRESHOLD + (this.mode === 'run' ? -0.3 : 0.3)) mode = 'run';
        else if (this.lastMoveSpeed > 0.12) mode = 'walk';
    }
    if (!this.grounded && !this.swimming && this.state === 'free') mode = 'run';
    if (this.mount && this.state === 'free') mode = 'sit';
    this.mode = mode;
    const speedNorm = Math.min(1, this.lastMoveSpeed / (mode === 'swim' ? SWIM_SPEED : mode === 'run' ? HERO_RUN_SPEED : HERO_WALK_SPEED));
    // Integrate gait phase from actual travel. Multiplying a lifetime clock by changing speed made legs snap on turns/stops.
    const gait = mode === 'walk' || mode === 'run' || mode === 'block';
    if (gait && this.grounded) this.gaitTime += this.lastMoveSpeed * dt / (mode === 'run' ? HERO_RUN_CYCLE : HERO_WALK_CYCLE);
    // Guarding or aiming, he moves other than the way he faces: the legs follow the way of travel (A70). How far he
    // turned since the last pose plants his feet as he turns on the spot; a jump of the facing (a load) is not a turn.
    const strafing = this.state === 'free' && (this.blocking || this.bowAiming) && !this.swimming;
    const heading = strafing && this.lastMoveSpeed > 0.12 ? Math.atan2(Math.sin(Math.atan2(this.vx, this.vz) - this.yaw), Math.cos(Math.atan2(this.vx, this.vz) - this.yaw)) : 0;
    const turned = Math.atan2(Math.sin(this.yaw - this.poseYaw), Math.cos(this.yaw - this.poseYaw));
    this.poseYaw = this.yaw;
    const pose: Pose = {
      mode, speed: speedNorm, time: gait ? this.gaitTime : this.clock, t,
      amp: ctx.settings.reducedMotion ? 0.6 : 1,
      grounded: this.grounded,
      travel: this.grounded && gait ? this.lastMoveSpeed * dt : 0,
      moveSpeed: this.lastMoveSpeed,
      heading,
      turn: Math.abs(turned) < 1.2 ? turned : 0,
      // The feet find the ground under them: a stair edge, a root, a slope (A70).
      groundAt: (x: number, z: number) => this.supportAt(x, z, ctx, this.y + 0.35),
      rootY: this.y,
      straddle: this.mount !== null,
    };
    this.huntingVisual.restorePose();
    // The root stands where he is before the pose, so the feet are planted against this frame's ground. In the saddle he
    // sits on the deer's back, rising and falling a little with its gait.
    this.mountBob += this.mount ? dt * this.lastMoveSpeed * 2.4 : 0;
    const seat = this.mount ? this.mount.seat + Math.abs(Math.sin(this.mountBob)) * Math.min(0.06, this.lastMoveSpeed * 0.012) : 0;
    this.rig.root.position.set(this.x, this.y + seat, this.z);
    this.rig.root.rotation.y = this.yaw;
    this.rig.root.updateMatrixWorld(true);
    poseRig(this.rig, pose, dt);
    applyFlash(this.rig, this.rig.hitFlash);
    if (this.rig.hitFlash > 0) this.rig.hitFlash = Math.max(0, this.rig.hitFlash - dt * 4);
    this.rig.root.position.set(this.x, this.y + seat, this.z);
    this.rig.root.rotation.y = this.yaw;
    this.huntingVisual.setSkinning(this.skinningProgress, this.channel?.t ?? 0, this.skinningHeight);
    this.huntingVisual.apply(dt);
    // Clothing that shows local standing.
    const inv = g.inventory;
    const sash = (inv.league_sash ?? 0) > 0 ? 0x4d7a54 : (inv.contract_band ?? 0) > 0 ? 0x8a3a30 : (inv.witness_cord ?? 0) > 0 ? 0xd9c98a : null;
    setSash(this.rig, sash);
  }
}
