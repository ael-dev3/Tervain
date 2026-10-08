import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Mode } from '../../src/presentation/characters';
import { HERO_SWIM } from '../../src/presentation/hero/animation';
import { bindHeroBones } from '../../src/presentation/hero/bones';
import { createHeroRig, type MainHeroRig } from '../../src/presentation/hero/rig';
import { residentMotionLibrary, type ResidentMotionLibrary } from '../../src/presentation/npc/residentMotion';
import { loadHeroWithoutImages } from './heroFixture';
import { loadResidentMotion } from './residentFixtures';

let asset: GLTF;
let library: ResidentMotionLibrary;
beforeAll(async () => {
  asset = await loadHeroWithoutImages();
  library = residentMotionLibrary(await loadResidentMotion());
}, 60_000);
const pose = (mode: Mode, speed: number) => ({ mode, time: 0, speed, t: 0, amp: 1, grounded: false, travel: 0, moveSpeed: speed * 1.45 });
const run = (rig: MainHeroRig, mode: Mode, speed: number, seconds: number) => {
  let strokes = 0;
  for (let i = 0; i < seconds * 60; i++) { rig.hero.pose(pose(mode, speed), 1 / 60, false); strokes += rig.hero.consumeStrokes(); }
  return strokes;
};
const joint = (rig: MainHeroRig, name: 'mixamorig:Head' | 'mixamorig:Spine2' | 'mixamorig:LeftFoot') => {
  rig.root.updateMatrixWorld(true);
  return bindHeroBones(rig.root)[name].getWorldPosition(new THREE.Vector3());
};
const head = (rig: MainHeroRig) => joint(rig, 'mixamorig:Head');

describe('the hero in deep water', () => {
  it('leans into a breaststroke about the chest, keeping the head above the waterline, one stroke a cycle', () => {
    const rig = createHeroRig(asset);
    const standing = head(rig);
    const strokes = run(rig, 'swim', 1, 6);
    expect(rig.hero.swimming).toBeGreaterThan(0.95);
    const swimming = head(rig);
    // The chest stays at the pivot height, so the head stays at about the waterline: not under it.
    expect(swimming.y).toBeGreaterThan(HERO_SWIM.pivot - 0.05);
    expect(swimming.y).toBeLessThan(standing.y);
    // About 0.8 strokes a second at full pace.
    expect(strokes).toBeGreaterThanOrEqual(3);
    expect(strokes).toBeLessThanOrEqual(8);
  });

  it('treads water upright when still, and stands straight again on leaving the water', () => {
    const rig = createHeroRig(asset);
    run(rig, 'swim', 0, 4);
    const treading = head(rig);
    expect(treading.y).toBeGreaterThan(HERO_SWIM.pivot + 0.1);
    run(rig, 'idle', 0, 3);
    expect(rig.hero.swimming).toBeLessThan(0.02);
    expect(rig.hero.consumeStrokes()).toBe(0);
  });
});

describe('the hero swimming with the authored strokes', () => {
  const authored = () => {
    const rig = createHeroRig(asset);
    rig.hero.useSwimClips(library);
    expect(rig.hero.authoredSwim).toBe(true);
    return rig;
  };

  it('swims the breaststroke with the chest at the waterline, head above it and legs trailing, one stroke a cycle', () => {
    const rig = authored();
    const standing = head(rig);
    const strokes = run(rig, 'swim', 1, 6);
    expect(rig.hero.diagnostics.activeClip).toBe('SwimStroke');
    // The clip carries the lean: the body is not pitched as a whole.
    expect(rig.body.quaternion.angleTo(new THREE.Quaternion())).toBeLessThan(1e-6);
    let lowestHead = Infinity, chestDrift = 0;
    for (let i = 0; i < 120; i++) {
      run(rig, 'swim', 1, 1 / 60);
      lowestHead = Math.min(lowestHead, head(rig).y);
      chestDrift = Math.max(chestDrift, Math.abs(joint(rig, 'mixamorig:Spine2').y - HERO_SWIM.pivot));
    }
    expect(chestDrift).toBeLessThan(1e-3);
    expect(lowestHead).toBeGreaterThan(HERO_SWIM.pivot);
    expect(head(rig).y).toBeLessThan(standing.y - 0.2);
    // Nearly level: the feet trail behind and below the chest.
    const chest = joint(rig, 'mixamorig:Spine2'), foot = joint(rig, 'mixamorig:LeftFoot');
    expect(chest.z - foot.z).toBeGreaterThan(0.9);
    expect(chest.y - foot.y).toBeLessThan(0.7);
    expect(strokes).toBeGreaterThanOrEqual(3);
    expect(strokes).toBeLessThanOrEqual(6);
  });

  it('treads water upright when still and walks out of it standing straight', () => {
    const rig = authored();
    run(rig, 'swim', 0, 4);
    expect(rig.hero.diagnostics.activeClip).toBe('SwimTread');
    expect(head(rig).y).toBeGreaterThan(HERO_SWIM.pivot + 0.1);
    run(rig, 'idle', 0, 3);
    expect(rig.hero.swimming).toBeLessThan(0.02);
    expect(rig.hero.diagnostics.activeClip).toBe('RelaxedIdle');
    expect(rig.body.position.length()).toBeLessThan(0.01);
    expect(rig.hero.consumeStrokes()).toBe(0);
  });
});
