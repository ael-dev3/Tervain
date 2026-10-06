import * as THREE from 'three';
import { S } from '../content/strings';
import type { Game } from '../game/game';
import { ANIMAL_SPECIES, HUNTING_ARROW_RANGE, SKINNING_SECONDS, type AnimalId } from '../game/hunting';
import type { Input } from '../platform/input';
import { codeLabel, type Settings } from '../platform/settings';
import type { AudioEngine } from './audio';
import type { CameraRig } from './cameraRig';
import type { Player } from './player';
import type { WorldScene } from './world';
import type { Hud } from './ui/hud';
import { HuntingArrows, HUNTING_ARROW_GRAVITY, type ArrowImpact, type ArrowShot } from './huntingArrow';
import type { AnimalArrowHit } from './animals/hunting/hit';

interface HuntingHost {
  game: Game; input: Input; player: Player; world: WorldScene; cam: CameraRig;
  audio: AudioEngine; hud: Hud; settings: Settings;
}
interface HuntingImpact extends ArrowImpact { animal?: AnimalArrowHit; expired?: boolean }
const SPEED = 65;
const DRAW_SECONDS = .7;
const center = new THREE.Vector2();

/** The low ballistic arc through the reticle target. Damage is independent of draw time. */
export function arrowDirection(origin: THREE.Vector3, target: THREE.Vector3, speed = SPEED): THREE.Vector3 {
  const delta = target.clone().sub(origin), horizontal = Math.hypot(delta.x, delta.z);
  if (horizontal < .01) return delta.normalize();
  const speedSquared = speed * speed;
  const discriminant = speedSquared * speedSquared - HUNTING_ARROW_GRAVITY *
    (HUNTING_ARROW_GRAVITY * horizontal * horizontal + 2 * delta.y * speedSquared);
  if (discriminant < 0) return delta.normalize();
  const tangent = (speedSquared - Math.sqrt(discriminant)) / (HUNTING_ARROW_GRAVITY * horizontal);
  const cosine = 1 / Math.sqrt(1 + tangent * tangent);
  return new THREE.Vector3(delta.x / horizontal * cosine, tangent * cosine, delta.z / horizontal * cosine);
}

/** Transient input, flight and skinning presentation; durable hunting facts remain in Game commands. */
export class HuntingController {
  readonly arrows = new HuntingArrows();
  private drawing = false;
  private drawTime = 0;
  private releasePending = false;
  private skinId: AnimalId | null = null;
  private shotOrigins = new Map<number, THREE.Vector3>();
  private resolved = new Set<number>();

  constructor(private readonly host: HuntingHost, private readonly canAct: () => boolean) {}

  get drawFraction() { return Math.min(1, this.drawTime / DRAW_SECONDS); }
  get isDrawing() { return this.drawing; }

  attach() { this.reset(); this.host.world.scene.add(this.arrows.group); }
  detach() { this.reset(); this.arrows.group.removeFromParent(); }
  syncInputMode() { this.host.input.bowMode = this.host.player.bowEquipped(this.host.game); }

  reset() {
    this.cancelDraw();
    this.host.player.cancelSkinning();
    this.skinId = null;
    this.host.cam.setAiming(false);
    this.arrows.clear(); this.shotOrigins.clear(); this.resolved.clear();
    this.host.audio.stopHuntingSounds();
  }

  private cancelDraw() {
    this.drawing = this.releasePending = false; this.drawTime = 0;
    this.host.player.setBowAim(null);
    this.host.audio.stopHuntingSounds('bow_draw');
  }

  /** Runs before the player's native skeleton is posed. */
  controls(dt: number, playing: boolean) {
    const { player, input, game, world, cam, audio } = this.host;
    if (!playing || !this.canAct()) {
      this.cancelDraw(); player.cancelSkinning(); cam.setAiming(false); return;
    }
    if (input.pressed('skin')) this.skin();
    if (this.skinId && !this.skinValid(this.skinId)) player.cancelSkinning();
    const available = player.bowEquipped(game) && player.state === 'free' && player.alive && !world.physics.holding;
    if (!available) { this.cancelDraw(); cam.setAiming(false); return; }
    const held = input.isDown('attack');
    const aimHeld = input.isDown('block');
    if (!this.drawing && held && (input.pressed('attack') || aimHeld)) {
      if ((game.state.inventory.arrow ?? 0) <= 0) {
        if (input.pressed('attack')) this.host.hud.toast(S('hunting.need_arrow'), 'bad');
      } else {
        this.drawing = true; this.drawTime = 0;
        audio.huntingSound('bow_draw');
      }
    }
    if (this.drawing) {
      this.drawTime = Math.min(DRAW_SECONDS, this.drawTime + dt);
      if (!held) { this.drawing = false; this.releasePending = true; audio.stopHuntingSounds('bow_draw'); }
    }
    const aiming = aimHeld || this.drawing || this.releasePending;
    cam.setAiming(aiming);
    player.setBowAim(aiming ? {
      x: Math.sin(cam.yaw) * Math.cos(cam.pitch), y: -Math.sin(cam.pitch), z: Math.cos(cam.yaw) * Math.cos(cam.pitch),
    } : null, this.drawFraction);
  }

  /** Runs after camera following and native animal posing, so contacts use this frame's visible triangles. */
  afterWorld(dt: number, playing: boolean) {
    if (!playing || !this.canAct()) return;
    if (this.releasePending) { this.releasePending = false; this.release(); this.drawTime = 0; }
    this.arrows.update(dt, (from, to, shot) => this.sweep(from, to, shot), (shot, impact) => this.impact(shot, impact as HuntingImpact));
  }

  private release() {
    const { player, game, world, cam, audio, hud } = this.host;
    const muzzle = player.releaseBow();
    if (!muzzle) return;
    const result = game.dispatch({ t: 'fireBow' });
    if (!result.ok) { hud.toast(S(`hunting.${result.reason}`), 'bad'); return; }
    audio.huntingSound('bow_release');
    world.animals.alertShot(player);
    const ray = new THREE.Raycaster();
    cam.camera.updateMatrixWorld(); ray.setFromCamera(center, cam.camera);
    const far = ray.ray.at(HUNTING_ARROW_RANGE, new THREE.Vector3());
    const scenery = world.physics.traceProjectile(ray.ray.origin, far);
    const animal = world.animals.traceArrow(ray.ray.origin, ray.ray.direction, HUNTING_ARROW_RANGE);
    const target = animal && (!scenery || animal.distance < scenery.distance) ? new THREE.Vector3().copy(animal.point)
      : scenery ? new THREE.Vector3().copy(scenery.point) : far;
    const direction = arrowDirection(muzzle.origin, target);
    const shot = this.arrows.launch(muzzle.origin, direction, SPEED);
    if (!shot) return;
    this.shotOrigins.set(shot.id, muzzle.origin.clone());
    while (this.shotOrigins.size > 32) this.shotOrigins.delete(this.shotOrigins.keys().next().value!);
    // The visible bow cannot put an arrow through cover between the player and the arrow tip.
    const cover = world.physics.traceProjectile({ x: player.x, y: player.y + 1.25, z: player.z }, muzzle.origin);
    if (cover) {
      this.impact(shot, { point: new THREE.Vector3().copy(cover.point) });
      // Resolve that obstruction on the first swept step too, then remove the flight exactly once.
      this.shotOrigins.set(shot.id, new THREE.Vector3(Infinity, Infinity, Infinity));
    }
  }

  private sweep(from: THREE.Vector3, to: THREE.Vector3, shot: ArrowShot): HuntingImpact | null {
    const origin = this.shotOrigins.get(shot.id);
    if (!origin || !Number.isFinite(origin.x)) return { point: from.clone(), lodge: false, expired: true };
    const segment = to.clone().sub(from), length = segment.length();
    if (length < 1e-8) return null;
    const scenery = this.host.world.physics.traceProjectile(from, to);
    const animal = this.host.world.animals.traceArrow(from, segment.normalize(), length);
    if (animal && (!scenery || animal.distance < scenery.distance - 1e-5)) {
      return { point: new THREE.Vector3().copy(animal.point), animal, lodge: false };
    }
    if (scenery) return { point: new THREE.Vector3().copy(scenery.point) };
    if (to.distanceTo(origin) > HUNTING_ARROW_RANGE) return { point: to.clone(), lodge: false, expired: true };
    return null;
  }

  private impact(shot: ArrowShot, impact: HuntingImpact) {
    if (this.resolved.has(shot.id)) return;
    this.resolved.add(shot.id); this.shotOrigins.delete(shot.id);
    while (this.resolved.size > 32) this.resolved.delete(this.resolved.values().next().value!);
    if (impact.expired) return;
    const { audio, world, game } = this.host;
    if (impact.animal) {
      const hit = impact.animal;
      world.animals.showArrowImpact(hit, shot.velocity.clone().normalize());
      if (hit.zone) {
        game.dispatch({ t: 'hitAnimal', hit: { id: hit.id, zone: hit.zone, position: hit.position, yaw: hit.yaw } });
        world.animals.syncHunting(game.state.hunting);
        audio.huntingSound('arrow_flesh', impact.point, this.listener());
      } else audio.huntingSound('arrow_ground', impact.point, this.listener());
    } else audio.huntingSound('arrow_ground', impact.point, this.listener());
  }

  private listener() {
    const { cam } = this.host;
    return { x: cam.camera.position.x, y: cam.camera.position.y, z: cam.camera.position.z, heading: cam.yaw };
  }

  private skinValid(id: AnimalId) {
    const { player, game, world } = this.host;
    const record = game.state.hunting[id];
    if (record?.status !== 'dead' || (game.state.inventory.skinning_knife ?? 0) < 1 || !player.alive) return false;
    const frame = world.animals.skinningFrame(id, player);
    if (!frame?.ready || Math.hypot(frame.stance.x - player.x, frame.stance.z - player.z) > .4) return false;
    const from = { x: player.x, y: player.y + .95, z: player.z };
    const target = { ...frame.target, y: frame.target.y + .04 };
    const obstruction = world.physics.traceProjectile(from, target);
    return !obstruction || obstruction.distance >= Math.hypot(target.x - from.x, target.y - from.y, target.z - from.z) - .06;
  }

  skin() {
    const { player, world, game, hud, audio } = this.host;
    if (!this.canAct()) return;
    if (player.skinningProgress !== null) { player.cancelSkinning(); return; }
    const carcass = world.animals.nearestCarcass(player);
    if (!carcass) return;
    if ((game.state.inventory.skinning_knife ?? 0) < 1) { hud.toast(S('hunting.need_knife'), 'bad'); return; }
    if (player.state !== 'free' || world.physics.holding || this.drawing) return;
    if (!this.skinValid(carcass.id)) { hud.toast(S('hunting.too_far')); return; }
    const frame = world.animals.skinningFrame(carcass.id, player)!;
    this.cancelDraw(); this.host.cam.setAiming(false);
    const started = player.beginSkinning(frame.target.x, frame.target.z, SKINNING_SECONDS, () => {
      audio.stopHuntingSounds('skinning');
      if (this.canAct() && this.skinValid(carcass.id)) {
        game.setPlayerTransform(player.x, player.y, player.z, player.yaw);
        const result = game.dispatch({ t: 'skinAnimal', id: carcass.id });
        if (result.ok) { world.animals.syncHunting(game.state.hunting); audio.huntingSound('skinning_complete'); }
        else hud.toast(S(`hunting.${result.reason}`), 'bad');
      }
      this.skinId = null;
    }, () => {
      audio.stopHuntingSounds('skinning'); this.skinId = null;
      hud.toast(S('hunting.cancelled'));
    }, frame.target.y);
    if (started) { this.skinId = carcass.id; audio.huntingSound('skinning', frame.target, this.listener()); }
  }

  updateHud() {
    const { player, world, game, hud, input } = this.host;
    if (!this.canAct()) { hud.setHunting(null); return; }
    const carcass = this.skinId ? { id: this.skinId } : world.animals.nearestCarcass(player);
    const knife = (game.state.inventory.skinning_knife ?? 0) > 0;
    hud.setHunting({
      bowEquipped: player.bowEquipped(game), aiming: player.bowAiming, drawing: this.drawing,
      drawFraction: this.drawFraction, arrows: game.state.inventory.arrow ?? 0,
      aimKey: input.label('block', codeLabel), drawKey: input.label('attack', codeLabel), skinKey: input.label('skin', codeLabel),
      carcassName: carcass ? S(`animal.${ANIMAL_SPECIES[carcass.id]}`) : undefined,
      canSkin: !!carcass && knife && player.state === 'free' && !this.drawing && !world.physics.holding && this.skinValid(carcass.id),
      skinUnavailable: !knife ? S('hunting.need_knife') : S('hunting.too_far'),
      skinProgress: player.skinningProgress,
    });
  }
}
