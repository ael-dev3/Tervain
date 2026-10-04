import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { setArmed, setSash, type Mode } from '../../src/presentation/characters';
import { heroFootStep } from '../../src/presentation/hero/animation';
import { bindHeroBones } from '../../src/presentation/hero/bones';
import { createHeroRig } from '../../src/presentation/hero/rig';
import { loadHeroWithoutImages, meshes } from './heroFixture';

let asset: GLTF;
beforeAll(async () => { asset = await loadHeroWithoutImages(); });
const pose = (mode: Mode = 'idle', overrides = {}) => ({ mode, time: 0, speed: 1, t: 0.45, amp: 1, grounded: true, travel: 0, moveSpeed: 0, ...overrides });

describe('approved playable hero', () => {
  it('uses the delivered 49,500-triangle mesh and all 30 exact imported bones on a private skeleton', () => {
    const one = createHeroRig(asset), two = createHeroRig(asset);
    const source = meshes(asset.scene).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
    const skin = meshes(one.root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
    expect(skin.geometry.index!.count / 3).toBe(49_500);
    expect(skin.skeleton.bones).toHaveLength(30);
    expect(skin.skeleton.bones.some((bone) => bone === source.skeleton.bones[0])).toBe(false);
    expect(one.hips).not.toBe(two.hips);
    expect(skin.geometry).toBe(source.geometry);
    expect(skin.material).not.toBe(source.material);
    expect(asset.animations.map((clip) => clip.name).sort()).toEqual(['Breathing', 'Idle', 'LookAround', 'Walk', 'WalkRootMotion']);
    expect(Object.keys(bindHeroBones(one.root))).toHaveLength(30);
    const allTriangles = meshes(one.root).reduce((sum, mesh) => sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position!.count) / 3, 0);
    expect(allTriangles).toBeLessThan(50_000);
  });

  it('never moves or rotates the physics root, including falling, jump and attack visual overlays', () => {
    const rig = createHeroRig(asset);
    rig.root.position.set(15, 4, -19); rig.root.rotation.set(0, 1.2, 0);
    const position = rig.root.position.clone(), quaternion = rig.root.quaternion.clone();
    for (const mode of ['idle', 'walk', 'run', 'attack_light', 'attack_heavy', 'block', 'dodge', 'hurt', 'work', 'sit', 'dead'] as Mode[]) {
      for (let i = 0; i < 30; i++) rig.hero.pose(pose(mode, { moveSpeed: 3.5, travel: 3.5 / 60 }), 1 / 60, true);
      expect(rig.root.position.equals(position)).toBe(true);
      expect(rig.root.quaternion.equals(quaternion)).toBe(true);
      rig.root.traverse((object) => expect([...object.position.toArray(), ...object.quaternion.toArray(), ...object.scale.toArray()].every(Number.isFinite)).toBe(true));
    }
    rig.hero.pose(pose('run', { grounded: false, moveSpeed: 6, travel: 0.1 }), 1 / 60, false);
    expect(rig.hero.diagnostics.footContacts).toEqual([false, false]);
    expect(rig.root.position.equals(position)).toBe(true);
  });

  it('advances gait from resolved metres, freezes it at a wall, and resets it on teleport', () => {
    const rig = createHeroRig(asset);
    for (let i = 0; i < 90; i++) rig.hero.pose(pose('walk', { moveSpeed: 2.2, travel: 2.2 / 60 }), 1 / 60, false);
    const before = rig.hero.diagnostics;
    expect(before.distanceMetres).toBeCloseTo(3.3, 8);
    expect(before.phase).toBeGreaterThan(0);
    expect(before.phase).toBeLessThan(1);
    for (let i = 0; i < 90; i++) rig.hero.pose(pose('walk', { moveSpeed: 3.5, travel: 0 }), 1 / 60, false);
    expect(rig.hero.diagnostics.phase).toBe(before.phase);
    expect(rig.hero.diagnostics.distanceMetres).toBe(before.distanceMetres);
    rig.hero.reset();
    expect(rig.hero.diagnostics.phase).toBe(0);
    expect(rig.hero.diagnostics.distanceMetres).toBe(0);
    expect(rig.body.rotation.x).toBe(0);
    expect(rig.body.position.y).toBe(0);
    expect(rig.hero.diagnostics.footContacts).toEqual([true, true]);
  });

  it('cancels body travel during foot contact while allowing natural heel/toe ankle rise', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
    const dt = 1 / 120, speed = 2.2;
    for (let i = 0; i < 150; i++) { rig.root.position.z += speed * dt; rig.hero.pose(pose('walk', { moveSpeed: speed, travel: speed * dt }), dt, false); }
    let last: { position: THREE.Vector3; planted: boolean; phase: number } | null = null;
    let contacts = 0;
    for (let i = 0; i < 300; i++) {
      rig.root.position.z += speed * dt;
      rig.hero.pose(pose('walk', { moveSpeed: speed, travel: speed * dt }), dt, false);
      rig.root.updateMatrixWorld(true);
      const position = bones['foot.L'].getWorldPosition(new THREE.Vector3());
      const diagnostic = rig.hero.diagnostics, planted = diagnostic.footContacts[0];
      if (last && planted && last.planted && diagnostic.phase > last.phase) {
        expect(Math.abs(position.z - last.position.z)).toBeLessThan(0.0001);
        expect(position.y).toBeGreaterThan(0.13);
        expect(position.y).toBeLessThan(0.24);
        contacts++;
      }
      last = { position, planted, phase: diagnostic.phase };
    }
    expect(contacts).toBeGreaterThan(100);
  });

  it('samples the same gait at ordinary frame rates and does not accumulate root motion', () => {
    const states = [30, 60, 120].map((hz) => {
      const rig = createHeroRig(asset);
      for (let i = 0; i < hz * 2; i++) rig.hero.pose(pose('walk', { moveSpeed: 3, travel: 3 / hz }), 1 / hz, false);
      return rig.hero.diagnostics;
    });
    for (const state of states) {
      expect(state.distanceMetres).toBeCloseTo(6, 8);
      expect(state.phase).toBeCloseTo(states[0]!.phase, 8);
    }
  });

  it('keeps actual skinned boot soles above the support plane through walking and sprint strides', () => {
    const rig = createHeroRig(asset);
    const skin = meshes(rig.root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
    const position = skin.geometry.attributes.position!;
    const soleVertices: number[] = [];
    for (let i = 0; i < position.count; i++) if (position.getY(i) < 0.045) soleVertices.push(i);
    expect(soleVertices.length).toBeGreaterThan(100);
    let lowest = Infinity;
    for (const [mode, speed] of [['walk', 3.5], ['run', 6]] as const) {
      rig.hero.reset();
      for (let i = 0; i < 180; i++) {
        rig.hero.pose(pose(mode, { moveSpeed: speed, travel: speed / 60 }), 1 / 60, false);
        if (i % 6 !== 0) continue;
        rig.root.updateMatrixWorld(true);
        const point = new THREE.Vector3();
        for (const vertex of soleVertices) {
          skin.getVertexPosition(vertex, point);
          lowest = Math.min(lowest, skin.localToWorld(point).y);
        }
      }
    }
    expect(lowest).toBeGreaterThan(-0.002);
  });

  it('keeps an upright pelvis and narrow human foot tracks rather than a crouched donor stance', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
    let lowestHip = Infinity, widestFeet = 0;
    for (const [mode, speed] of [['walk', 3.5], ['run', 6]] as const) {
      rig.hero.reset();
      for (let i = 0; i < 240; i++) {
        rig.hero.pose(pose(mode, { moveSpeed: speed, travel: speed / 60 }), 1 / 60, false);
        if (i < 90) continue;
        rig.root.updateMatrixWorld(true);
        lowestHip = Math.min(lowestHip, rig.hips.position.y);
        widestFeet = Math.max(widestFeet, Math.abs(bones['foot.L'].getWorldPosition(new THREE.Vector3()).x - bones['foot.R'].getWorldPosition(new THREE.Vector3()).x));
      }
    }
    expect(lowestHip).toBeGreaterThan(0.9);
    expect(widestFeet).toBeLessThan(0.34);
  });

  it('carries both arms with a visible counter-swing rather than leaving the painting A-pose frozen', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
    const wristZ: [number[], number[]] = [[], []];
    for (let i = 0; i < 240; i++) {
      rig.hero.pose(pose('walk', { moveSpeed: 3.5, travel: 3.5 / 60 }), 1 / 60, false);
      if (i < 90) continue;
      rig.root.updateMatrixWorld(true);
      wristZ[0].push(bones['hand.L'].getWorldPosition(new THREE.Vector3()).z);
      wristZ[1].push(bones['hand.R'].getWorldPosition(new THREE.Vector3()).z);
    }
    for (const range of wristZ) expect(Math.max(...range) - Math.min(...range)).toBeGreaterThan(0.18);
    const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
    const meanL = average(wristZ[0]), meanR = average(wristZ[1]);
    const covariance = wristZ[0].reduce((sum, value, i) => sum + (value - meanL) * (wristZ[1][i]! - meanR), 0);
    expect(covariance).toBeLessThan(0);
  });

  it('emits one footfall per new contact at equal frame rates and clears sounds on stop, jump or reset', () => {
    const counts = [30, 60, 120].map((hz) => {
      const rig = createHeroRig(asset);
      let count = 0;
      for (let i = 0; i < hz * 3; i++) {
        rig.hero.pose(pose('walk', { moveSpeed: 3.5, travel: 3.5 / hz }), 1 / hz, false);
        count += rig.hero.consumeFootfalls();
        expect(rig.hero.consumeFootfalls()).toBe(0);
      }
      rig.hero.pose(pose('walk', { moveSpeed: 3.5, travel: 0 }), 1 / hz, false);
      expect(rig.hero.consumeFootfalls()).toBe(0);
      rig.hero.pose(pose('run', { grounded: false, moveSpeed: 6, travel: 1 }), 1 / hz, false);
      expect(rig.hero.consumeFootfalls()).toBe(0);
      rig.hero.pose(pose('walk', { moveSpeed: 3.5, travel: 1 }), 0.1, false);
      rig.hero.reset(); expect(rig.hero.consumeFootfalls()).toBe(0);
      return count;
    });
    expect(counts[0]).toBeGreaterThan(8);
    expect(counts).toEqual([counts[0], counts[0], counts[0]]);
  });

  it('honours real equipment and standing-band visibility on imported hand/hip sockets', () => {
    const rig = createHeroRig(asset), bones = bindHeroBones(rig.root);
    expect(rig.weapon!.visible).toBe(false); expect(rig.scabbard!.visible).toBe(false); expect(rig.sash!.visible).toBe(false);
    expect(rig.weapon!.parent!.parent).toBe(bones['hand.R']);
    expect(rig.scabbard!.parent).toBe(bones.pelvis); expect(rig.sash!.parent).toBe(bones.pelvis);
    setArmed(rig, 'sheathed');
    expect(rig.weapon!.visible).toBe(false); expect(rig.scabbard!.visible).toBe(true); expect(rig.sheathed!.visible).toBe(true); expect(rig.grip).toBe('none');
    setArmed(rig, 'drawn');
    expect(rig.weapon!.visible).toBe(true); expect(rig.sheathed!.visible).toBe(false); expect(rig.grip).toBe('blade');
    setArmed(rig, 'none');
    expect(rig.weapon!.visible).toBe(false); expect(rig.scabbard!.visible).toBe(false);
    setSash(rig, 0x4d7a54); expect(rig.sash!.visible).toBe(true);
    expect((rig.sash!.material as THREE.MeshStandardMaterial).color.getHex()).toBe(0x4d7a54);
    setSash(rig, null); expect(rig.sash!.visible).toBe(false);
  });

  it('closes grouped fingers and thumbs locally around a blade or fists without exploding weighted fingertips', () => {
    const open = createHeroRig(asset), held = createHeroRig(asset), fists = createHeroRig(asset);
    for (let i = 0; i < 90; i++) {
      open.hero.pose(pose('idle'), 1 / 60, false);
      held.hero.pose(pose('idle'), 1 / 60, true);
      fists.hero.pose(pose('block'), 1 / 60, false);
    }
    const openBones = bindHeroBones(open.root), heldBones = bindHeroBones(held.root), fistBones = bindHeroBones(fists.root);
    expect(heldBones['fingers.R'].quaternion.angleTo(openBones['fingers.R'].quaternion)).toBeCloseTo(1.08, 4);
    expect(heldBones['thumb.R'].quaternion.angleTo(openBones['thumb.R'].quaternion)).toBeGreaterThan(0.5);
    expect(heldBones['fingers.L'].quaternion.angleTo(openBones['fingers.L'].quaternion)).toBeLessThan(0.00001);
    for (const side of ['L', 'R'] as const) expect(fistBones[`fingers.${side}`].quaternion.angleTo(openBones[`fingers.${side}`].quaternion)).toBeCloseTo(1.08, 4);
    const openSkin = meshes(open.root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
    const heldSkin = meshes(held.root).find((mesh) => (mesh as THREE.SkinnedMesh).isSkinnedMesh)! as THREE.SkinnedMesh;
    const indices = heldSkin.geometry.attributes.skinIndex!, weights = heldSkin.geometry.attributes.skinWeight!;
    const fingerIndex = heldSkin.skeleton.bones.indexOf(heldBones['fingers.R']);
    open.root.updateMatrixWorld(true); held.root.updateMatrixWorld(true);
    let count = 0, moved = 0;
    for (let vertex = 0; vertex < indices.count; vertex++) {
      let influenced = false;
      for (let slot = 0; slot < 4; slot++) if (indices.getComponent(vertex, slot) === fingerIndex && weights.getComponent(vertex, slot) > 0.8) influenced = true;
      if (!influenced) continue;
      const before = new THREE.Vector3(), after = new THREE.Vector3();
      openSkin.getVertexPosition(vertex, before); heldSkin.getVertexPosition(vertex, after);
      openBones['hand.R'].worldToLocal(openSkin.localToWorld(before));
      heldBones['hand.R'].worldToLocal(heldSkin.localToWorld(after));
      expect([...after.toArray()].every(Number.isFinite)).toBe(true);
      expect(before.distanceTo(after)).toBeLessThan(0.12);
      moved = Math.max(moved, before.distanceTo(after)); count++;
    }
    expect(count).toBeGreaterThan(4);
    expect(moved).toBeGreaterThan(0.025);
    // Empty hands reopen when the weapon is put away, including after a guard pose.
    for (let i = 0; i < 90; i++) held.hero.pose(pose('idle'), 1 / 60, false);
    expect(heldBones['fingers.R'].quaternion.angleTo(openBones['fingers.R'].quaternion)).toBeLessThan(0.00001);
  });
});

describe('plant/swing stride construction', () => {
  it('matches controller travel during contact and gives a continuous lifted recovery', () => {
    const cycle = 1.55, duty = 0.52;
    const a = heroFootStep(0.1, cycle, duty, 0.095), b = heroFootStep(0.2, cycle, duty, 0.095);
    expect(a.z - b.z).toBeCloseTo(cycle * 0.1, 10);
    expect(a.lift).toBeGreaterThanOrEqual(0); expect(a.planted).toBe(true);
    expect(heroFootStep(duty * 0.5, cycle, duty, 0.095).lift).toBe(0);
    expect(heroFootStep(duty + 0.24, cycle, duty, 0.095).lift).toBeCloseTo(0.095, 10);
    expect(heroFootStep(1, cycle, duty, 0.095).z).toBe(heroFootStep(0, cycle, duty, 0.095).z);
  });
});
