import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Game } from '../../src/game/game';
import { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';
import type { AudioEngine } from '../../src/presentation/audio';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import { Colliders } from '../../src/world/colliders';
import type { Terrain } from '../../src/world/terrain';

vi.mock('../../src/presentation/characters', () => ({
  createPlayerRig: () => ({ root: new THREE.Group(), hitFlash: 0 }),
  setArmed: vi.fn(), setSash: vi.fn(), poseRig: vi.fn(), applyFlash: vi.fn(),
}));

function controls() {
  const listeners = new Map<string, ((e: any) => void)[]>();
  vi.stubGlobal('window', { innerHeight: 800, addEventListener: (type: string, fn: (e: any) => void) => listeners.set(type, [...(listeners.get(type) ?? []), fn]) });
  vi.stubGlobal('document', { pointerLockElement: null });
  let pad: any = null;
  vi.stubGlobal('navigator', { getGamepads: () => pad ? [pad] : [] });
  const settings = defaultSettings();
  const input = new Input({ id: 'view', requestPointerLock: vi.fn() } as unknown as HTMLElement, () => settings);
  const keydown = (e: Record<string, unknown>) => { for (const fn of listeners.get('keydown') ?? []) fn(e); };
  const setPad = (button: number | null) => {
    pad = { connected: true, axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === button, value: i === button ? 1 : 0 })) };
  };
  return { input, settings, keydown, setPad };
}

afterEach(() => vi.unstubAllGlobals());

describe('eighth scout fixes: controls (A101)', () => {
  it('lets the map key close the map from its place list', () => {
    const { input, keydown } = controls();
    input.uiOpen = true;
    let prevented = false;
    const e = { code: 'KeyM', repeat: false, target: { tagName: 'SELECT' }, get defaultPrevented() { return prevented; }, preventDefault() { prevented = true; } };
    input.claim(e as unknown as KeyboardEvent);
    keydown(e);
    expect(input.pressed('map')).toBe(true);
  });

  it('still leaves other keys to a focused list', () => {
    const { input, keydown } = controls();
    keydown({ code: 'KeyW', repeat: false, target: { tagName: 'SELECT' }, defaultPrevented: false, preventDefault() {} });
    expect(input.move().y).toBe(0);
  });

  it('moves focus twice for two quick D-pad taps', () => {
    const { input, setPad } = controls();
    const navigate = vi.fn(); input.onNavigate = navigate; input.uiOpen = true;
    setPad(13); input.poll(1 / 60);
    setPad(null); input.poll(1 / 60);
    setPad(13); input.poll(1 / 60);
    expect(navigate).toHaveBeenCalledTimes(2);
    // Held, it still repeats at its steady pace rather than every frame.
    for (let i = 0; i < 5; i++) input.poll(1 / 60);
    expect(navigate).toHaveBeenCalledTimes(2);
  });

  it('raises a toggled guard pressed during a blow once the blow ends', () => {
    const presses = new Set<string>();
    let guard = false;
    const input = {
      move: () => ({ x: 0, y: 0 }), pressed: (a: string) => presses.has(a), clearToggle: vi.fn(), uiOpen: false,
      held: (a: string) => { if (a !== 'block') return false; if (presses.has('block')) guard = !guard; return guard; },
    } as unknown as Input;
    const ground = () => 0;
    const terrain = { groundAt: ground, supportAt: ground, walkable: () => true, valleyRadius: () => 0, deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0 } as unknown as Terrain;
    const audio = { footstep: vi.fn(), swing: vi.fn(), hit: vi.fn(), hurt: vi.fn(), jump: vi.fn(), land: vi.fn(), dodge: vi.fn() } as unknown as AudioEngine;
    const ctx: PlayerCtx = {
      terrain, audio, input, colliders: new Colliders(), settings: defaultSettings(), game: new Game(), npcs: [], enemies: [], viewYaw: 0,
      controllable: true, onHitEnemy: vi.fn(), onHurt: vi.fn(), onDeath: vi.fn(), onBoundary: vi.fn(),
    };
    const player = new Player();
    player.setPosition(0, 0, 0, terrain);
    const tick = () => { player.update(1 / 60, ctx); presses.clear(); };
    presses.add('attack'); tick();
    expect(player.state).toBe('light');
    presses.add('block'); tick();
    for (let i = 0; i < 120 && player.state !== 'free'; i++) tick();
    tick();
    expect(player.blocking).toBe(true);
  });
});

describe('eighth scout fixes: the rotation\'s hours (A101)', () => {
  it('has Pell at the face exactly while the water runs the quarry\'s night shift', async () => {
    const { Game } = await import('../../src/game/game');
    const { NPCS } = await import('../../src/content/npcs');
    const { resolveGoal } = await import('../../src/presentation/actors');
    const { worldView } = await import('../../src/game/worldView');
    const g = new Game();
    g.state.quest.phase = 'settled';
    g.state.quest.allocation = 'rotation';
    for (let hour = 0; hour < 24; hour++) {
      g.state.clock = (hour + 0.5) * 60;
      const working = resolveGoal(NPCS.quarry_hand, g.state, hour + 0.5).activity === 'work';
      expect([hour, working]).toEqual([hour, worldView(g.state).quarryState === 'night_shift']);
    }
  });

  it('sets the quarry-at-work scene only where the quarry works by day', async () => {
    const { SCENES } = await import('../../src/content/voice');
    const scene = SCENES.find(s => s.id === 'quarry.working')!;
    expect(JSON.stringify(scene.when)).not.toContain('rotation');
  });
});

describe('eleventh scout fixes: a steady camera under reduced motion (A104)', () => {
  it('eases a stair step into the camera height rather than passing the jolt straight through', async () => {
    const { CameraRig } = await import('../../src/presentation/cameraRig');
    const rig = new CameraRig();
    const pivot = () => (rig as unknown as { smoothTarget: THREE.Vector3 }).smoothTarget.y;
    const follow = (y: number) => rig.follow(1 / 60, 0, y, 0, { groundAt: () => 0 }, new Colliders(), true, 0);
    follow(0); follow(0);
    const before = pivot();
    follow(0.3);
    const rise = pivot() - before;
    expect(rise).toBeGreaterThan(0);
    expect(rise).toBeLessThan(0.3 * 0.5);
  });
});
