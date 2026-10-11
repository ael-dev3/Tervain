import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Input } from '../../src/platform/input';
import { DEFAULT_BINDINGS, defaultSettings, findConflict, loadSettings } from '../../src/platform/settings';
import { EnemyActor } from '../../src/presentation/actors';
import { ENEMY_SPAWNS } from '../../src/world/layout';
import { createStandInRig } from '../../src/presentation/characters';

afterEach(() => vi.unstubAllGlobals());

describe('second scout fixes (A93)', () => {
  it('gives an action newer than the stored settings only keys the player has not used elsewhere', () => {
    const stored = Object.fromEntries(Object.entries(DEFAULT_BINDINGS).filter(([a]) => a !== 'skin'));
    stored.interact = ['KeyV'];
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ bindings: stored }), setItem: () => {} });
    const loaded = loadSettings();
    expect(loaded.bindings.interact).toEqual(['KeyV']);
    expect(loaded.bindings.skin).not.toContain('KeyV');
    for (const code of loaded.bindings.skin) expect(findConflict(loaded.bindings, 'skin', code)).toBeNull();
  });

  it('notices a refused pointer lock, and forgets it once a lock is granted', async () => {
    const listeners = new Map<string, (() => void)[]>();
    const doc = { pointerLockElement: null as unknown, addEventListener: (t: string, fn: () => void) => listeners.set(t, [...(listeners.get(t) ?? []), fn]) };
    vi.stubGlobal('window', { innerHeight: 800, addEventListener: () => {} });
    vi.stubGlobal('document', doc);
    vi.stubGlobal('navigator', { getGamepads: () => [] });
    const target = { id: 'view', requestPointerLock: vi.fn(() => Promise.reject(new Error('cooldown'))) } as unknown as HTMLElement;
    const input = new Input(target, () => defaultSettings());
    expect(input.lockRefused).toBe(false);
    input.requestPointerLock();
    await Promise.resolve(); await Promise.resolve();
    expect(input.lockRefused).toBe(true);
    doc.pointerLockElement = target;
    expect(input.lockRefused).toBe(false);
    doc.pointerLockElement = null;
    (target.requestPointerLock as ReturnType<typeof vi.fn>).mockReturnValueOnce(undefined);
    input.requestPointerLock();
    expect(input.lockRefused).toBe(false);
    for (const fn of listeners.get('pointerlockerror') ?? []) fn();
    expect(input.lockRefused).toBe(true);
  });

  it('sets a late bandit model at their post, hidden until posed, not at the origin', () => {
    const spawn = ENEMY_SPAWNS.find((s) => s.id === 'ford_bandit_a')!;
    const enemy = new EnemyActor(spawn, createStandInRig(1.87, 'blade'), false), scene = new THREE.Scene();
    scene.add(enemy.rig.root);
    const model = createStandInRig(1.87, 'blade');
    enemy.adoptRig(model);
    expect(model.root.position.x).toBeCloseTo(enemy.x);
    expect(model.root.position.z).toBeCloseTo(enemy.z);
    expect(Math.hypot(model.root.position.x, model.root.position.z)).toBeGreaterThan(10);
    expect(model.root.visible).toBe(false);
  });
});
