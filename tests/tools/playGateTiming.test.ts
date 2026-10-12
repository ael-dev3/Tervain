import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { expect, it } from 'vitest';

it('timing-only sampling skips readback and encoding; recorded sampling keeps stills', () => {
  const source = readFileSync('tools/play-gate.mjs', 'utf8');
  const start = source.indexOf('const SAMPLER = `');
  const sampler = source.slice(start + 'const SAMPLER = `'.length, source.indexOf('`;\n', start));
  for (const video of [false, true]) {
    let readbacks = 0, encodes = 0;
    class Vector {
      x = 0; y = 1; z = 0;
      set() { return this; }
      copy() { return this; }
      applyQuaternion() { return this; }
      project() { return this; }
    }
    class Quaternion {}
    const position = new Vector(), transform = { getWorldPosition: () => {}, getWorldQuaternion: () => {} };
    const gl = Object.fromEntries(['bufferData', 'bufferSubData', 'texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D', 'compressedTexImage2D', 'compressedTexSubImage2D'].map((name) => [name, () => {}]));
    const renderer = { render: () => {}, getContext: () => gl, getRenderTarget: () => null, getPixelRatio: () => 2, domElement: {} };
    const context = vm.createContext({
      window: { requestAnimationFrame: () => {}, tervain: {
        renderer, player: { group: { traverse: (cb: (o: unknown) => void) => cb({ isSkinnedMesh: true, visible: true }) }, rig: { hips: transform, head: transform, root: transform }, x: 0, z: 0 },
        world: { scene: { position, quaternion: new Quaternion() } }, cam: { camera: { position }, curDist: 3, bodyVisible: true }, simStep: 1,
      } },
      performance: { now: () => 100 },
      document: { timeline: { currentTime: 100 }, createElement: () => ({ getContext: () => ({ drawImage: () => { readbacks++; } }), toDataURL: () => { encodes++; return 'data:image/jpeg;base64,'; } }) },
    });
    vm.runInContext(`(() => { ${sampler.replaceAll('${VIDEO}', String(video)).replaceAll('${textureUploadBytes.toString()}', '() => 0')} })()`, context);
    vm.runInContext('window.__gate.phase = "inside-window"; window.__gate.last = 50; window.tervain.renderer.render({}, {});', context);
    expect(readbacks).toBe(video ? 1 : 0);
    expect(encodes).toBe(video ? 1 : 0);
    expect(vm.runInContext('window.__gate.samples.length', context)).toBe(1);
  }
});
