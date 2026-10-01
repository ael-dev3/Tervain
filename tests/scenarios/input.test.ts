import { afterEach, describe, expect, it, vi } from 'vitest';
import { Input } from '../../src/platform/input';
import { defaultSettings } from '../../src/platform/settings';

function controls() {
  const listeners = new Map<string, ((e: any) => void)[]>();
  const emit = (type: string, event: Record<string, unknown> = {}) => {
    for (const fn of listeners.get(type) ?? []) fn({preventDefault() {},...event});
  };
  vi.stubGlobal('window', {innerHeight:800,addEventListener:(type:string, fn:(e:any)=>void) => listeners.set(type,[...(listeners.get(type)??[]),fn])});
  const document = {pointerLockElement:null};
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
