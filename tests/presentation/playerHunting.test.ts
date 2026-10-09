import * as THREE from 'three';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Player } from '../../src/presentation/player';
import { Game } from '../../src/game/game';
import { PlayerHuntingVisual } from '../../src/presentation/playerHunting';
import { createHeroRig } from '../../src/presentation/hero/rig';
import { bindHeroBones } from '../../src/presentation/hero/bones';
import { HERO_GRIP_FADE } from '../../src/presentation/hero/animation';
import { loadHeroWithoutImages, meshes } from './heroFixture';

let asset: GLTF;
beforeAll(async () => { asset = await loadHeroWithoutImages(); });
const idle = { mode: 'idle', speed: 0, time: 0, t: 0, amp: 0, grounded: true, travel: 0, moveSpeed: 0 } as const;

function setup() {
  const rig = createHeroRig(asset);
  const visual = new PlayerHuntingVisual(rig);
  const pose = (dt = 1 / 60) => { visual.restorePose(); rig.hero.pose(idle, dt, false); visual.apply(dt); };
  return { rig, visual, bones: bindHeroBones(rig.root), pose };
}

describe('bow and skinning on the delivered hero skeleton', () => {
  it('holds a visible bow in the real left palm, aims its nocked arrow and draws its right hand with the string', () => {
    const s = setup();
    const direction = new THREE.Vector3(.2, .14, 1).normalize();
    s.rig.root.position.set(14, 3, -11);
    s.rig.root.rotation.y = .18;
    s.visual.setEquipped(true);
    s.visual.setAim(direction, 0);
    s.pose();
    const startHand = s.bones['mixamorig:RightHand'].getWorldPosition(new THREE.Vector3());
    const string = s.visual.bow.getObjectByName('Hunting / drawn bow string') as THREE.Line;
    const nockStart = (string.geometry.attributes.position as THREE.BufferAttribute).getZ(1);
    s.visual.setAim(direction, 1);
    s.pose();
    expect(s.visual.bow.visible).toBe(true);
    expect(s.visual.bow.parent!.parent).toBe(s.bones['mixamorig:LeftHand']);
    const actualDirection = new THREE.Vector3(0, 0, 1).applyQuaternion(s.visual.nockedArrow.getWorldQuaternion(new THREE.Quaternion()));
    expect(actualDirection.distanceTo(direction)).toBeLessThan(1e-6);
    const nockEnd = (string.geometry.attributes.position as THREE.BufferAttribute).getZ(1);
    expect(nockStart - nockEnd).toBeCloseTo(.39, 6);
    const endHand = s.bones['mixamorig:RightHand'].getWorldPosition(new THREE.Vector3());
    expect(startHand.distanceTo(endHand)).toBeGreaterThan(.25);
    const nockWorld = s.visual.bow.localToWorld(new THREE.Vector3(0, 0, nockEnd));
    expect(endHand.distanceTo(nockWorld)).toBeLessThan(.12);
    const sourceSkin = meshes(asset.scene).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)!;
    const ownSkin = meshes(s.rig.root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)!;
    expect(ownSkin.geometry).toBe(sourceSkin.geometry);
    const released = s.visual.release()!;
    expect(released.origin.distanceTo(s.visual.nockedArrow.getWorldPosition(new THREE.Vector3()))).toBeLessThan(1e-7);
    expect(released.direction.distanceTo(direction)).toBeLessThan(1e-7);
    expect(s.visual.nockedArrow.visible).toBe(false);
    s.visual.dispose();
  });

  it('crouches with an actual moving knife hand and restores every overlaid joint after skinning', () => {
    const s = setup();
    s.pose();
    const originalHip = s.bones['mixamorig:Hips'].position.clone();
    const originalArm = s.bones['mixamorig:RightArm'].quaternion.clone();
    const originalLeg = s.bones['mixamorig:RightUpLeg'].quaternion.clone();
    const originalKnee = s.bones['mixamorig:RightLeg'].quaternion.clone();
    s.visual.setSkinning(.5, 1.5);
    s.pose();
    expect(originalHip.y - s.bones['mixamorig:Hips'].position.y).toBeCloseTo(.5, 6);
    expect(s.visual.knife.visible).toBe(true);
    expect(s.visual.bow.visible).toBe(false);
    expect(originalLeg.angleTo(s.bones['mixamorig:RightUpLeg'].quaternion)).toBeGreaterThan(.2);
    expect(originalKnee.angleTo(s.bones['mixamorig:RightLeg'].quaternion)).toBeGreaterThan(.8);
    const one = s.visual.knife.getWorldPosition(new THREE.Vector3());
    s.visual.setSkinning(.5, 1.625);
    s.pose();
    const two = s.visual.knife.getWorldPosition(new THREE.Vector3());
    expect(one.distanceTo(two)).toBeGreaterThan(.02);
    expect(two.y).toBeLessThan(.85);
    s.visual.setSkinning(null);
    s.pose();
    expect(s.bones['mixamorig:Hips'].position.distanceTo(originalHip)).toBeLessThan(1e-7);
    expect(s.bones['mixamorig:RightArm'].quaternion.clone().normalize().angleTo(originalArm.normalize())).toBeLessThan(1e-7);
    expect(s.bones['mixamorig:RightUpLeg'].quaternion.clone().normalize().angleTo(originalLeg.normalize())).toBeLessThan(1e-7);
    expect(s.rig.body.position.y).toBe(0);
    expect(s.visual.knife.visible).toBe(false);
    s.visual.dispose();
  });

  it('keeps the delivered skin finite and sampled footwear above the floor through the full skinning crouch', () => {
    const s = setup();
    const mesh = meshes(s.rig.root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
    const vertices: number[] = [];
    for (let i = 0; i < mesh.geometry.attributes.position!.count; i++) if (mesh.geometry.attributes.position!.getY(i) < .05) vertices.push(i);
    const point = new THREE.Vector3();
    for (const height of [.2, .4, .8]) for (const progress of [.025, .1, .15, .3, .5, .75, .85, .95, .975]) {
      s.visual.setSkinning(progress, progress * 3, height);
      s.pose();
      let lowest = Infinity;
      for (const vertex of vertices) {
        mesh.getVertexPosition(vertex, point);
        s.rig.root.worldToLocal(mesh.localToWorld(point));
        expect(point.toArray().every(Number.isFinite)).toBe(true);
        lowest = Math.min(lowest, point.y);
      }
      expect(lowest, `footwear at skinning progress ${progress}, surface ${height}m`).toBeGreaterThan(-.018);
    }
    s.visual.dispose();
  });

  it('does not accumulate crouch depth when a frozen pose is requested repeatedly', () => {
    const s = setup();
    s.visual.setSkinning(.5, 1.5);
    s.pose();
    const hip = s.bones['mixamorig:Hips'].position.clone();
    const knife = s.visual.knife.getWorldPosition(new THREE.Vector3());
    for (let i = 0; i < 100; i++) s.pose(0);
    expect(s.bones['mixamorig:Hips'].position.distanceTo(hip)).toBeLessThan(1e-7);
    expect(s.visual.knife.getWorldPosition(new THREE.Vector3()).distanceTo(knife)).toBeLessThan(1e-7);
    s.visual.dispose();
  });

  it('puts the actual knife cutting end at the supplied low, medium and large carcass surface heights', () => {
    const s = setup();
    for (const height of [.2, .4, .8]) {
      s.visual.setSkinning(.5, 1.5, height);
      s.pose();
      const tip = s.visual.knife.localToWorld(new THREE.Vector3(0, 0, .185));
      expect(Math.abs(tip.y - height), `cutting end at ${height}m`).toBeLessThan(.065);
      expect(tip.z).toBeGreaterThan(.62);
      expect(tip.z).toBeLessThan(.78);
    }
    s.visual.dispose();
  });

  it('uses a cancellable grounded skinning channel without granting loot from presentation', () => {
    const player = new Player(createHeroRig(asset));
    const done = vi.fn(), cancelled = vi.fn();
    player.grounded = false;
    expect(player.beginSkinning(0, 2, 3, done, cancelled)).toBe(false);
    player.grounded = true;
    expect(player.beginSkinning(0, 2, 3, done, cancelled)).toBe(true);
    expect(player.state).toBe('channel');
    expect(player.skinningProgress).toBe(0);
    expect(player.beginSkinning(2, 0, 3, done)).toBe(false);
    player.channel!.t = 1.5;
    expect(player.skinningProgress).toBe(.5);
    player.cancelSkinning();
    expect(player.state).toBe('free');
    expect(player.skinningProgress).toBeNull();
    expect(done).not.toHaveBeenCalled();
    expect(cancelled).toHaveBeenCalledOnce();
    player.cancelSkinning();
    expect(cancelled).toHaveBeenCalledOnce();
    player.dispose();
  });

  it('puts away a drawn sword for the knife action and restores that equipment when cancelled', () => {
    const player = new Player(createHeroRig(asset)), game = new Game();
    game.state.inventory.rusted_sword = 1;
    game.dispatch({ t: 'equipWeapon', item: 'rusted_sword' });
    player.syncEquipment(game, true);
    expect(player.rig.weapon!.visible).toBe(true);
    expect(player.beginSkinning(0, .7)).toBe(true);
    expect(player.rig.weapon!.visible).toBe(false);
    player.cancelSkinning();
    expect(player.rig.weapon!.visible).toBe(true);
    player.dispose();
  });

  it('uses the delivered closed-hand pose for the knife and restores the relaxed fingers afterwards, fading both ways (A71)', () => {
    const s = setup(), reference = createHeroRig(asset);
    reference.hero.applyHandGrip('Right', 1);
    const referenceBones = bindHeroBones(reference.root);
    s.pose();
    const name = 'mixamorig:RightHandMiddle2';
    const relaxed = s.bones[name].quaternion.clone().normalize();
    const grip = referenceBones[name].quaternion.clone().normalize();
    const fullAngle = relaxed.angleTo(grip);
    expect(fullAngle).toBeGreaterThan(.1);
    s.visual.setSkinning(.5, 1.5, .4);
    // The grip closes over HERO_GRIP_FADE, not at once: a frame in it has barely begun, and it is closed after the fade.
    s.pose(); s.pose();
    expect(s.bones[name].quaternion.clone().normalize().angleTo(grip)).toBeGreaterThan(fullAngle * .8);
    for (let i = 0; i < 60 * HERO_GRIP_FADE; i++) s.pose();
    expect(s.bones[name].quaternion.clone().normalize().angleTo(grip)).toBeLessThan(fullAngle * .08);
    s.visual.setSkinning(null);
    for (let i = 0; i < 60 * HERO_GRIP_FADE + 2; i++) s.pose();
    expect(s.bones[name].quaternion.clone().normalize().angleTo(relaxed)).toBeLessThan(1e-6);
    s.visual.dispose();
  });
});
