import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>(done => { resolve = done; });
  return { promise, resolve };
}
function fixture(shadows: boolean) {
  const colour = deferred(), uploads = deferred(), scene = new THREE.Scene(), object = new THREE.Group();
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  object.visible = mesh.visible = false; object.add(mesh);
  const world = { scene }, previous = new THREE.WebGLRenderTarget(1, 1);
  const renderer = { shadowMap: { enabled: shadows }, getRenderTarget: () => previous,
    setRenderTarget: vi.fn(), compileAsync: vi.fn(() => colour.promise) };
  const uploadTextures = vi.fn(() => uploads.promise);
  const app = Object.assign(Object.create(App.prototype), { world, worldDisposed: false, renderer,
    grade: { enabled: false }, cam: { camera: new THREE.PerspectiveCamera() }, warmDepth: new Map(), uploadTextures });
  const warm = (draws = true, compileOnly = false) => Reflect.apply(Reflect.get(App.prototype, 'warmShaders'), app,
    [object, scene, draws, world, compileOnly]) as Promise<unknown>;
  return { colour, uploads, object, mesh, renderer, uploadTextures, world, warm };
}

describe('graphics preparation without shadow maps', () => {
  it.each([false, true])('waits for late textures and first draws even when shadows=%s', async shadows => {
    const s = fixture(shadows); let complete = false;
    const pending = s.warm().then(() => { complete = true; });
    expect(s.uploadTextures).not.toHaveBeenCalled();
    expect(s.object.visible).toBe(false); expect(s.mesh.visible).toBe(false);
    s.colour.resolve(); await Promise.resolve();
    expect(s.uploadTextures).toHaveBeenCalledExactlyOnceWith(s.object, true, s.world);
    expect(complete).toBe(false);
    s.uploads.resolve(); await pending; expect(complete).toBe(true);
  });
  it.each([false, true])('keeps compile-only preparation free of uploads when shadows=%s', async shadows => {
    const s = fixture(shadows), pending = s.warm(true, true);
    s.colour.resolve(); await pending;
    expect(s.uploadTextures).not.toHaveBeenCalled();
    expect(s.object.visible).toBe(false); expect(s.mesh.visible).toBe(false);
  });
  it('passes the no-first-draw option through the shadowless upload path', async () => {
    const s = fixture(false), pending = s.warm(false);
    s.colour.resolve(); await Promise.resolve();
    expect(s.uploadTextures).toHaveBeenCalledExactlyOnceWith(s.object, false, s.world);
    s.uploads.resolve(); await pending;
  });
});
