import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Input } from '../../src/platform/input';
import { defaultSettings, loadSettings, saveSettings } from '../../src/platform/settings';
import { CameraRig } from '../../src/presentation/cameraRig';
import { Player, type PlayerCtx } from '../../src/presentation/player';
import type { AudioEngine } from '../../src/presentation/audio';
import { Game } from '../../src/game/game';
import { Colliders } from '../../src/world/colliders';
import type { Terrain } from '../../src/world/terrain';

function controls() {
  const listeners = new Map<string, ((e: any) => void)[]>();
  const emit = (type: string, event: Record<string, unknown> = {}) => {
    for (const fn of listeners.get(type) ?? []) fn({preventDefault() {},...event});
  };
  vi.stubGlobal('window', {innerHeight:800,addEventListener:(type:string, fn:(e:any)=>void) => listeners.set(type,[...(listeners.get(type)??[]),fn])});
  const document: { pointerLockElement: HTMLElement | null } = {pointerLockElement:null};
  vi.stubGlobal('document',document);
  let pad: any = null;
  vi.stubGlobal('navigator',{getGamepads:()=>pad ? [pad] : []});
  const settings = defaultSettings();
  const target = {id:'view',requestPointerLock:vi.fn()} as unknown as HTMLElement;
  const input = new Input(target,()=>settings);
  const key = (code:string, repeat=false) => emit('keydown',{code,repeat,target:{tagName:'BODY'}});
  const release = (code:string) => emit('keyup',{code});
  const setPad = (button:number|null,axes=[0,0,0,0]) => {
    pad = {connected:true,axes,buttons:Array.from({length:16},(_,i)=>({pressed:i===button,value:i===button?1:0}))};
  };
  return {input,settings,target,key,release,emit,setPad,document};
}

afterEach(()=>vi.unstubAllGlobals());

describe('input across world and interface boundaries',()=>{
  it('requires a fresh press to confirm a conflicting rebind rather than accepting held-key autorepeat', () => {
    const { input, key, release } = controls();
    const confirm = vi.fn();
    input.captureNext = () => { input.captureNext = confirm; };
    key('KeyW');
    for (let i = 0; i < 20; i++) key('KeyW', true);
    expect(confirm).not.toHaveBeenCalled();
    expect(input.pressed('forward')).toBe(false);
    release('KeyW'); key('KeyW');
    expect(confirm).toHaveBeenCalledExactlyOnceWith('KeyW');
  });
  it('leaves consumed controls, composing input and browser shortcut chords out of world movement and hotbar queues', () => {
    const { input, emit } = controls();
    for (const properties of [{ defaultPrevented: true }, { isComposing: true }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      emit('keydown', { code: 'KeyW', target: { tagName: 'BODY' }, ...properties });
      emit('keydown', { code: 'Digit1', target: { tagName: 'BODY' }, ...properties });
      expect(input.move().y).toBe(0);
      expect(input.pressedKey('Digit1')).toBe(false);
    }
  });
  it('still allows a modifier key itself to be bound as an ordinary action', () => {
    const { input, emit, settings } = controls();
    settings.bindings.sprint = ['ControlLeft'];
    emit('keydown', { code: 'ControlLeft', ctrlKey: true, target: { tagName: 'BODY' } });
    expect(input.held('sprint')).toBe(true);
  });
  it.each([['ControlLeft', 'ctrlKey', 'sprint'], ['AltLeft', 'altKey', 'block']] as const)('lets an explicitly held %s binding combine with movement and jump', (code, flag, action) => {
    const { input, emit, settings, release } = controls();
    settings.bindings[action] = [code];
    emit('keydown', { code, [flag]: true, target: { tagName: 'BODY' } });
    emit('keydown', { code: 'KeyW', [flag]: true, target: { tagName: 'BODY' } });
    emit('keydown', { code: 'Space', [flag]: true, target: { tagName: 'BODY' } });
    expect(input.held(action)).toBe(true); expect(input.move().y).toBe(1); expect(input.pressed('jump')).toBe(true);
    release('KeyW'); release('Space'); release(code); input.endFrame();
    emit('keydown', { code: 'KeyW', [flag]: true, target: { tagName: 'BODY' } });
    expect(input.move().y).toBe(0);
  });
  it('suppresses only actually bound gameplay combinations and retains browser shortcuts inside modal controls', () => {
    const { input, emit, settings } = controls(); settings.bindings.sprint = ['ControlLeft'];
    emit('keydown', { code: 'ControlLeft', ctrlKey: true, target: { tagName: 'BODY' } });
    const game = vi.fn(); emit('keydown', { code: 'KeyS', ctrlKey: true, target: { tagName: 'BODY' }, preventDefault: game });
    expect(input.move().y).toBe(-1); expect(game).toHaveBeenCalledOnce();
    const browser = vi.fn(); emit('keydown', { code: 'KeyP', ctrlKey: true, target: { tagName: 'BODY' }, preventDefault: browser });
    expect(browser).not.toHaveBeenCalled();
    input.uiOpen = true;
    emit('keydown', { code: 'ControlLeft', ctrlKey: true, target: { tagName: 'BODY' } });
    const modal = vi.fn(); emit('keydown', { code: 'KeyS', ctrlKey: true, target: { tagName: 'INPUT' }, preventDefault: modal });
    expect(modal).not.toHaveBeenCalled(); expect(input.move().y).toBe(0);
  });
  it('does not turn an additional unbound modifier into gameplay because another modifier was explicitly assigned', () => {
    const { input, emit, settings } = controls(); settings.bindings.sprint = ['ControlLeft'];
    emit('keydown', { code: 'ControlLeft', ctrlKey: true, target: { tagName: 'BODY' } });
    emit('keydown', { code: 'AltLeft', ctrlKey: true, altKey: true, target: { tagName: 'BODY' } });
    emit('keydown', { code: 'KeyW', ctrlKey: true, altKey: true, target: { tagName: 'BODY' } });
    expect(input.move().y).toBe(0);
  });
  it('cancels a pending rebind on focus loss instead of capturing the first gameplay key after returning', () => {
    const { input, emit, key } = controls();
    const capture = vi.fn(), cancel = vi.fn();
    input.captureNext = capture; input.captureCancel = cancel;
    emit('blur'); key('KeyW');
    expect(capture).not.toHaveBeenCalled(); expect(cancel).toHaveBeenCalledOnce();
    expect(input.captureNext).toBeNull(); expect(input.captureCancel).toBeNull();
    expect(input.move().y).toBe(1);
  });
  it('binds a captured right-click without also opening the browser context menu over the settings panel', () => {
    const { input, emit } = controls();
    const capture = vi.fn(); input.captureNext = capture;
    emit('mousedown', { button: 2, target: { tagName: 'BUTTON' } });
    expect(capture).toHaveBeenCalledExactlyOnceWith('Mouse2');
    const preventDefault = vi.fn();
    emit('contextmenu', { target: { tagName: 'BUTTON' }, preventDefault });
    expect(preventDefault).toHaveBeenCalledOnce();
    const laterContext = vi.fn();
    emit('contextmenu', { target: { tagName: 'BUTTON' }, preventDefault: laterContext });
    expect(laterContext).not.toHaveBeenCalled();
  });
  it('leaves hotbar button activation keys to the browser without queuing a gameplay jump',()=>{
    const {input,emit,key}=controls();
    emit('keydown',{code:'Space',repeat:false,target:{tagName:'BUTTON',closest:()=>({})}});
    expect(input.pressed('jump')).toBe(false);
    expect(input.pressedKey('Space')).toBe(false);
    key('Space');expect(input.pressed('jump')).toBe(true);
  });
  it('discards queued jumps, camera motion and zoom on blur',()=>{
    const {input,key,emit,target}=controls();
    key('Space');emit('mousemove',{target,buttons:1,movementX:50,movementY:30});
    emit('wheel',{target,deltaY:100,deltaMode:0});emit('blur');
    expect(input.pressed('jump')).toBe(false);
    expect(Math.abs(input.look(1/60).yaw)+Math.abs(input.look(1/60).pitch)).toBe(0);
    expect(input.zoom()).toBe(0);
  });
  it('requires a fresh press after a menu transition rather than inheriting a held key',()=>{
    const {input,key,release}=controls();
    key('KeyW');expect(input.move().y).toBe(1);
    input.uiOpen=true;input.uiOpen=false;
    key('KeyW',true);expect(input.move().y).toBe(0);
    release('KeyW');key('KeyW');expect(input.move().y).toBe(1);
  });
  it('scrolling or dragging an interface never queues a camera change',()=>{
    const {input,emit,target}=controls();
    input.uiOpen=true;
    emit('wheel',{target,deltaY:200,deltaMode:0});
    emit('mousemove',{target,buttons:1,movementX:300,movementY:100});
    input.uiOpen=false;
    expect(input.zoom()).toBe(0);expect(Math.abs(input.look(1/60).yaw)+Math.abs(input.look(1/60).pitch)).toBe(0);
    emit('wheel',{target:{id:'other'},deltaY:200,deltaMode:0});expect(input.zoom()).toBe(0);
    emit('wheel',{target,deltaY:3,deltaMode:1});expect(input.zoom()).toBe(48);
  });
  it('toggle preferences change once per edge even with multiple readers',()=>{
    const {input,key,settings,release}=controls();settings.toggleSprint=true;
    key('ShiftLeft');expect(input.held('sprint')).toBe(true);expect(input.held('sprint')).toBe(true);
    input.endFrame();expect(input.held('sprint')).toBe(true);
    release('ShiftLeft');key('ShiftLeft');expect(input.held('sprint')).toBe(false);
  });
  it('does not turn a held gamepad confirm into a world interaction when a panel closes',()=>{
    const {input,setPad}=controls();input.uiOpen=true;setPad(0);input.poll(1/60);
    expect(input.padButtonPressed(0)).toBe(true);
    input.uiOpen=false;input.poll(1/60);
    expect(input.pressed('interact')).toBe(false);expect(input.isDown('interact')).toBe(false);
    setPad(null);input.poll(1/60);setPad(0);input.poll(1/60);
    expect(input.pressed('interact')).toBe(true);
  });
  it('does not navigate or move from a stick held across a menu transition until it recenters',()=>{
    const {input,setPad}=controls();const navigate=vi.fn();input.onNavigate=navigate;
    setPad(null,[0,-1,0,0]);input.poll(1/60);expect(input.move().y).toBe(1);
    input.uiOpen=true;input.poll(1/60);expect(navigate).not.toHaveBeenCalled();
    setPad(null);input.poll(1/60);setPad(null,[0,-1,0,0]);input.poll(1/60);
    expect(navigate).toHaveBeenCalledWith(0,-1);
    input.uiOpen=false;input.poll(1/60);expect(input.move().y).toBe(0);
    setPad(null);input.poll(1/60);setPad(null,[0,-1,0,0]);input.poll(1/60);expect(input.move().y).toBe(1);
  });

});

describe('standard third-person camera controls', () => {
  function view(yaw: number) {
    const rig = new CameraRig();
    rig.yaw = yaw;
    rig.pitch = 0.1;
    const follow = () => rig.follow(1 / 60, 0, 5, 0, { groundAt: () => 0 }, new Colliders(), true, 0);
    follow();
    return { rig, follow, direction: rig.camera.getWorldDirection(new THREE.Vector3()), right: new THREE.Vector3(1, 0, 0).applyQuaternion(rig.camera.quaternion) };
  }

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('mouse right and up look right and up at heading %f', (heading) => {
    const { input, target, emit, document } = controls();
    document.pointerLockElement = target;
    const camera = view(heading);
    emit('mousemove', { target, buttons: 0, movementX: 30, movementY: -30 });
    const look = input.look(1 / 60);
    camera.rig.applyLook(look.yaw, look.pitch, 0); camera.follow();
    const direction = camera.rig.camera.getWorldDirection(new THREE.Vector3());
    expect(direction.dot(camera.right)).toBeGreaterThan(0);
    expect(direction.y).toBeGreaterThan(camera.direction.y);
  });

  it('drag-to-look and a right/up controller stick use the same standard directions', () => {
    const { input, target, emit, setPad } = controls();
    emit('mousemove', { target, buttons: 1, movementX: 30, movementY: -30 });
    const mouse = input.look(1 / 60); input.endFrame();
    setPad(null, [0, 0, 1, -1]); input.poll(1 / 60);
    const stick = input.look(1 / 60);
    expect(mouse.yaw).toBeLessThan(0); expect(mouse.pitch).toBeLessThan(0);
    expect(stick.yaw).toBeLessThan(0); expect(stick.pitch).toBeLessThan(0);
    const camera = view(0);
    camera.rig.applyLook(stick.yaw, stick.pitch, 0); camera.follow();
    expect(camera.rig.camera.getWorldDirection(new THREE.Vector3()).y).toBeGreaterThan(camera.direction.y);
  });

  it('camera turn keys agree with horizontal mouse and stick turns', () => {
    const { input, key, release } = controls();
    const camera = view(0);
    key('KeyC');
    const right = input.look(1 / 60);
    camera.rig.applyLook(right.yaw, right.pitch, 0); camera.follow();
    expect(camera.rig.camera.getWorldDirection(new THREE.Vector3()).dot(camera.right)).toBeGreaterThan(0);
    release('KeyC'); key('KeyZ');
    expect(input.look(1 / 60).yaw).toBeGreaterThan(0);
  });

  it.each([0, Math.PI / 2, Math.PI, -Math.PI / 2])('keeps forward and strafe movement aligned with the rendered camera at heading %f', (heading) => {
    const { input, settings, key, release } = controls();
    const camera = view(heading);
    const terrain = {
      groundAt: () => 0, supportAt: () => 0, walkable: () => true, valleyRadius: () => 0,
      deckAt: () => null, carveAt: () => 0, seaDepth: () => 0, slopeAt: () => 0,
    } as unknown as Terrain;
    const ctx: PlayerCtx = {
      input, settings, terrain, colliders: new Colliders(), game: new Game(), npcs: [], enemies: [],
      audio: { footstep: () => {} } as unknown as AudioEngine,
      viewYaw: heading, controllable: true, onHitEnemy: () => {}, onHurt: () => {}, onDeath: () => {}, onBoundary: () => {},
    };
    const player = new Player();
    for (const [code, sign, axis] of [
      ['KeyW', 1, camera.direction], ['KeyS', -1, camera.direction],
      ['KeyD', 1, camera.right], ['KeyA', -1, camera.right],
    ] as const) {
      player.setPosition(0, 0, heading, terrain);
      key(code); player.update(1 / 60, ctx); release(code); input.endFrame();
      const motion = new THREE.Vector3(player.x, 0, player.z);
      expect(motion.dot(axis) * sign).toBeGreaterThan(0);
      expect(motion.clone().normalize().dot(new THREE.Vector3(axis.x, 0, axis.z).normalize()) * sign).toBeCloseTo(1, 8);
    }
  });

  it('an explicit saved invert preference reverses vertical look on both devices and leaves yaw alone', () => {
    const { input, settings, emit, target, setPad } = controls(); settings.invertY = true;
    emit('mousemove', { target, buttons: 1, movementX: 30, movementY: -30 });
    const mouse = input.look(1 / 60); input.endFrame();
    setPad(null, [0, 0, 1, -1]); input.poll(1 / 60);
    const stick = input.look(1 / 60);
    expect(mouse.yaw).toBeLessThan(0); expect(mouse.pitch).toBeGreaterThan(0);
    expect(stick.yaw).toBeLessThan(0); expect(stick.pitch).toBeGreaterThan(0);
    const camera = view(0);
    camera.rig.applyLook(mouse.yaw, mouse.pitch, 0); camera.follow();
    expect(camera.rig.camera.getWorldDirection(new THREE.Vector3()).y).toBeLessThan(camera.direction.y);
  });

  it('fresh and legacy settings stay non-inverted while real saved preferences survive loading and saving', () => {
    let stored: string | null = null;
    vi.stubGlobal('localStorage', { getItem: () => stored, setItem: (_key: string, value: string) => { stored = value; } });
    expect(loadSettings().invertY).toBe(false);
    stored = JSON.stringify({ mouseSensitivity: 1.7 }); expect(loadSettings().invertY).toBe(false);
    for (const preference of [true, false]) {
      stored = JSON.stringify({ invertY: preference });
      const settings = loadSettings(); expect(settings.invertY).toBe(preference);
      saveSettings(settings); expect(loadSettings().invertY).toBe(preference);
    }
    stored = JSON.stringify({ invertY: 'false' }); expect(loadSettings().invertY).toBe(false);
  });
});
