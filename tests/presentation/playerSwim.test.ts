import * as THREE from 'three';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import type { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { Player, SWIM_DEPTH, SWIM_FLOAT, SWIM_SPEED, wadeFactor, type PlayerCtx, type PlayerWater } from '../../src/presentation/player';
import { Colliders } from '../../src/world/colliders';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

/**
 * A beach: dry sand east of x = 0, then the bed shelves into the sea to the west (one metre down every four), still water
 * at height 0, optionally drifting. Deep water is not walkable ground; whether it can be swum is the water's business.
 */
function setup(flowX = 0) {
  let move = { x: 0, y: 0 };
  const presses = new Set<string>();
  const ground = (x: number) => (x >= 0 ? 0.2 : Math.max(-6, x / 4));
  const terrain = {
    groundAt: ground, supportAt: ground, heightAt: ground, walkable: (x: number) => ground(x) > -0.85, valleyRadius: () => 0,
    deckAt: () => null, carveAt: () => 0, seaDepth: (x: number) => Math.max(0, -ground(x)), slopeAt: () => 0.25,
  } as unknown as Terrain;
  const events: { kind: string; energy: number }[] = [];
  const water: PlayerWater = {
    sample: (x) => (ground(x) < 0 ? { surface: 0, bed: ground(x), depth: -ground(x), flowX, flowZ: 0 } : null),
    splash: vi.fn((_x, _y, _z, energy, _push, kind) => { events.push({ kind: kind ?? 'splash', energy }); }),
    disturb: vi.fn(),
    emit: vi.fn((kind, _x, _y, _z, energy) => { events.push({ kind, energy: energy ?? 0.5 }); }),
  };
  const audio = { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn(), jump: vi.fn(), land: vi.fn(), dodge: vi.fn() } as unknown as AudioEngine;
  const input = {
    move: () => move, held: () => false, pressed: (a: string) => presses.has(a), clearToggle: vi.fn(), uiOpen: false,
  } as unknown as Input;
  const ctx: PlayerCtx = {
    terrain, water, audio, input, colliders: new Colliders(), settings: defaultSettings(), game: new Game(),
    npcs: [], enemies: [], viewYaw: -Math.PI / 2, controllable: true,
    onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn(),
  };
  const player = new Player();
  player.setPosition(2, 0, -Math.PI / 2, terrain);
  return {
    player, ctx, audio, events, presses,
    setMove: (x: number, y: number) => { move = { x, y }; },
    run: (seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) { player.update(1 / 60, ctx); presses.clear(); } },
  };
}

beforeEach(() => vi.clearAllMocks());

describe('wading and swimming', () => {
  it('slows a wader with depth, and never below half pace', () => {
    expect(wadeFactor(0)).toBe(1);
    expect(wadeFactor(0.5)).toBeLessThan(wadeFactor(0.2));
    expect(wadeFactor(3)).toBeCloseTo(0.5, 6);
  });

  it('walks out of its depth into a swim, floats at the surface and swims at swimming pace', () => {
    const s = setup();
    s.setMove(0, 1);
    s.run(9);
    expect(s.player.swimming).toBe(true);
    expect(s.player.waterDepth).toBeGreaterThan(SWIM_DEPTH);
    expect(s.player.y).toBeCloseTo(-SWIM_FLOAT, 1);
    expect(s.player.mode).toBe('swim');
    expect(s.player.lastMoveSpeed).toBeGreaterThan(SWIM_SPEED * 0.8);
    expect(s.player.lastMoveSpeed).toBeLessThan(SWIM_SPEED * 1.2);
    expect(s.events.some((e) => e.kind === 'enter')).toBe(true);
    expect(s.events.some((e) => e.kind === 'stroke')).toBe(true);
    expect(s.events.some((e) => e.kind === 'wade')).toBe(true);
    // Wading steps replace footsteps once the water is above the knees.
    expect(s.audio.footstep).toHaveBeenCalled();
  });

  it('cannot strike, guard, jump or dodge while swimming', () => {
    const s = setup();
    s.setMove(0, 1);
    s.run(9);
    s.setMove(0, 0);
    const stamina = s.player.stamina;
    for (const action of ['attack', 'heavy', 'jump', 'dodge']) {
      s.presses.add(action);
      s.run(1 / 60);
    }
    expect(s.player.state).toBe('free');
    expect(s.audio.swing).not.toHaveBeenCalled();
    expect(s.audio.jump).not.toHaveBeenCalled();
    expect(s.audio.dodge).not.toHaveBeenCalled();
    expect(s.player.stamina).toBeGreaterThanOrEqual(stamina);
    expect(s.player.beginChannel('work', 1, () => {})).toBe(false);
  });

  it('is carried by a current while swimming, and finds its feet again in the shallows', () => {
    const s = setup(0.8);
    s.setMove(0, 1);
    s.run(9);
    expect(s.player.swimming).toBe(true);
    // Drifting downstream (+x here, back toward the beach) with no stroke.
    s.setMove(0, 0);
    const x = s.player.x;
    s.run(3);
    expect(s.player.x).toBeGreaterThan(x + 1);
    // Swim back east to the beach: standing again, then dry, with the drip of climbing out.
    s.setMove(0, -1);
    s.run(14);
    expect(s.player.swimming).toBe(false);
    expect(s.player.grounded).toBe(true);
    expect(s.player.waterDepth).toBe(0);
    expect(s.events.some((e) => e.kind === 'exit')).toBe(true);
  });

  it('keeps the old behaviour without the water model: deep water simply blocks', () => {
    const s = setup();
    delete s.ctx.water;
    s.setMove(0, 1);
    s.run(9);
    expect(s.player.swimming).toBe(false);
    expect(s.player.x).toBeGreaterThan(-3.6);
  });
});
