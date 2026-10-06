import * as THREE from 'three';
import { beforeAll, describe, expect, it } from 'vitest';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { Mode } from '../../src/presentation/characters';
import { HERO_SWIM } from '../../src/presentation/hero/animation';
import { bindHeroBones } from '../../src/presentation/hero/bones';
import { createHeroRig, type MainHeroRig } from '../../src/presentation/hero/rig';
import { loadHeroWithoutImages } from './heroFixture';

let asset: GLTF;
beforeAll(async () => { asset = await loadHeroWithoutImages(); });
const pose = (mode: Mode, speed: number) => ({ mode, time: 0, speed, t: 0, amp: 1, grounded: false, travel: 0, moveSpeed: speed * 1.45 });
const run = (rig: MainHeroRig, mode: Mode, speed: number, seconds: number) => {
  let strokes = 0;
  for (let i = 0; i < seconds * 60; i++) { rig.hero.pose(pose(mode, speed), 1 / 60, false); strokes += rig.hero.consumeStrokes(); }
  return strokes;
};
const head = (rig: MainHeroRig) => {
  rig.root.updateMatrixWorld(true);
  return bindHeroBones(rig.root)['mixamorig:Head'].getWorldPosition(new THREE.Vector3());
};

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
