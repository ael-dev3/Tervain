import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MENU_DEER_PACE, MENU_DEER_ROUTE, buildMenuDeer, deerPoseAt, deerTimeline } from '../../src/presentation/menu/menuDeer';
import { MENU_BANNER, MENU_CAMERA, MENU_FIRE, MENU_STONES, MENU_TREE, browZ, menuHeight } from '../../src/presentation/menu/menuLayout';
import { createAnimalFigure } from '../../src/presentation/animals';
import { ANIMALS } from '../../src/presentation/animals/catalog';
import type { GrassMover } from '../../src/presentation/grass/trample';
import { animalFixture } from './animalFixture';

const deer = ANIMALS.find((a) => a.species === 'deer')!;
const view = Math.atan2(MENU_CAMERA.lookX - MENU_CAMERA.x, MENU_CAMERA.lookZ - MENU_CAMERA.z);
/** Within the 16:9 frame (with a little margin). */
const inView = (x: number, z: number) => {
  const off = Math.atan2(x - MENU_CAMERA.x, z - MENU_CAMERA.z) - view;
  return Math.abs(Math.atan2(Math.sin(off), Math.cos(off))) < 0.68;
};

describe('menu heath stag', () => {
  it('walks its round without jumps, at an unhurried pace, and comes back the way it went', () => {
    const timeline = deerTimeline();
    const walking = MENU_DEER_ROUTE.legs.filter((l) => l.kind === 'walk').length;
    expect(timeline.spans).toHaveLength(MENU_DEER_ROUTE.legs.length);
    expect(timeline.period).toBeGreaterThan(90);
    expect(timeline.period).toBeLessThan(200);
    const dt = 0.05;
    let prev = deerPoseAt(0, timeline), maxSpeed = 0, seen = 0, walks = 0;
    for (let t = dt; t < timeline.period; t += dt) {
      const p = deerPoseAt(t, timeline);
      expect([p.x, p.z, p.yaw, p.speed].every(Number.isFinite)).toBe(true);
      const step = Math.hypot(p.x - prev.x, p.z - prev.z) / dt;
      maxSpeed = Math.max(maxSpeed, step);
      expect(step).toBeLessThan(MENU_DEER_PACE.speed * 1.2);
      // Turning toward a new heading is gradual too.
      const turn = Math.abs(Math.atan2(Math.sin(p.yaw - prev.yaw), Math.cos(p.yaw - prev.yaw))) / dt;
      expect(turn).toBeLessThan(4);
      if (p.kind === 'walk' && prev.kind !== 'walk') walks++;
      if (p.kind !== 'away' && inView(p.x, p.z)) seen++;
      prev = p;
    }
    expect(walks).toBe(walking - 1);
    expect(maxSpeed).toBeGreaterThan(MENU_DEER_PACE.speed * 0.9);
    // On screen for most of the round, and out of sight when it starts again.
    expect(seen * dt).toBeGreaterThan(timeline.period * 0.45);
    const start = deerPoseAt(0, timeline), end = deerPoseAt(timeline.period - 1e-3, timeline);
    expect(inView(start.x, start.z)).toBe(false);
    expect(end.kind).toBe('away');
    expect(inView(end.x, end.z)).toBe(false);
    expect(deerPoseAt(timeline.period + 12, timeline)).toEqual(deerPoseAt(12, timeline));
    expect(deerPoseAt(Number.NaN, timeline)).toEqual(deerPoseAt(0, timeline));
  });

  it('keeps to open heath: clear of the camp, the tree, the stones, the standard and the brow', () => {
    const timeline = deerTimeline();
    for (let t = 0; t < timeline.period; t += 0.25) {
      const p = deerPoseAt(t, timeline);
      if (p.kind === 'away') continue;
      expect(Math.hypot(p.x - MENU_FIRE.x, p.z - MENU_FIRE.z)).toBeGreaterThan(8);
      expect(Math.hypot(p.x - MENU_TREE.x, p.z - MENU_TREE.z)).toBeGreaterThan(6);
      expect(Math.hypot(p.x - MENU_STONES.x, p.z - MENU_STONES.z)).toBeGreaterThan(6);
      expect(Math.hypot(p.x - MENU_BANNER.x, p.z - MENU_BANNER.z)).toBeGreaterThan(4);
      expect(p.z).toBeGreaterThan(browZ(p.x) + 6);
    }
  });

  it('stands on the ground, presses two legs into the grass, and holds still on a repeated time', () => {
    const figure = createAnimalFigure(animalFixture(), deer);
    const stag = buildMenuDeer(figure, { shadows: true });
    let shadowCasters = 0;
    stag.root.traverse((o) => { if ((o as THREE.Mesh).isMesh && (o as THREE.Mesh).castShadow) shadowCasters++; });
    expect(shadowCasters).toBeGreaterThan(0);
    const transition = vi.spyOn(figure.animation, 'transition');
    const update = vi.spyOn(figure.animation, 'update');
    stag.update(30, 1 / 60);
    expect(stag.pose.kind).toBe('graze');
    expect(transition).toHaveBeenLastCalledWith('Graze');
    expect(stag.root.position.y).toBeCloseTo(Math.min(menuHeight(stag.pose.x, stag.pose.z), stag.root.position.y + 1), 0);
    expect(stag.root.position.y).toBeLessThanOrEqual(menuHeight(stag.pose.x, stag.pose.z) + 0.011);
    const movers: GrassMover[] = [];
    stag.movers(movers);
    expect(movers).toHaveLength(2);
    expect(Math.hypot(movers[0]!.x - movers[1]!.x, movers[0]!.z - movers[1]!.z)).toBeGreaterThan(0.6);
    stag.update(30, 1 / 60);
    expect(update).toHaveBeenLastCalledWith(0, 0);
    stag.update(4, 1 / 60);
    expect(stag.pose.kind).toBe('walk');
    expect(transition).toHaveBeenLastCalledWith('Walk');
    // Out of sight it is hidden and pushes nothing.
    stag.update(deerTimeline().period - 1, 1 / 60);
    expect(stag.root.visible).toBe(false);
    movers.length = 0;
    stag.movers(movers);
    expect(movers).toHaveLength(0);
    const dispose = vi.spyOn(figure, 'dispose');
    stag.dispose(); stag.dispose();
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
