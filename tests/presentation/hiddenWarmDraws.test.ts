import * as THREE from 'three';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app';

afterEach(() => vi.unstubAllGlobals());
function fixture(fail = false) {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  const scene = new THREE.Scene(), object = new THREE.Group(), room = new THREE.Group();
  const box = () => new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  const existing = box(), one = box(), two = box(), omitted = box();
  one.name = 'one'; two.name = 'two'; omitted.name = 'omitted'; omitted.visible = false;
  object.visible = room.visible = false; object.add(room); room.add(one, two, omitted); scene.add(existing);
  const drawn: string[][] = [], shadowFlags: boolean[] = [], world = { scene };
  const renderer = { shadowMap: { autoUpdate: true, needsUpdate: false }, getRenderTarget: () => null, setRenderTarget: vi.fn(),
    render: vi.fn((view: THREE.Scene) => {
      shadowFlags.push(renderer.shadowMap.needsUpdate);
      view.traverseVisible(node => { const mesh = node as THREE.InstancedMesh; if (mesh.isInstancedMesh && mesh.boundingSphere === null) mesh.computeBoundingSphere(); });
      const names: string[] = []; view.traverseVisible(node => { if ((node as THREE.Mesh).isMesh && (!(node as THREE.InstancedMesh).isInstancedMesh || (node as THREE.InstancedMesh).count > 0)) names.push(node.name); });
      drawn.push(names); if (fail) throw new Error('draw failed');
    }) };
  const app = Object.assign(Object.create(App.prototype), { renderer, world, worldDisposed: false, cam: { camera: new THREE.PerspectiveCamera() } });
  const warm = () => Reflect.apply(Reflect.get(App.prototype, 'firstDraws'), app, [object, world]) as Promise<void>;
  return { warm, object, room, one, two, omitted, existing, scene, renderer, drawn, shadowFlags };
}

describe('first draws under hidden arrival groups', () => {
  it('draws one visible mesh per turn through hidden ancestors and restores every flag', async () => {
    const s = fixture(); await s.warm();
    expect(s.drawn).toEqual([['one'], ['two']]);
    expect(s.object.visible).toBe(false); expect(s.room.visible).toBe(false);
    expect(s.one.visible).toBe(true); expect(s.two.visible).toBe(true); expect(s.omitted.visible).toBe(false);
    expect(s.existing.visible).toBe(true); expect(s.object.parent).toBeNull();
    expect(s.renderer.shadowMap.autoUpdate).toBe(true);
  });
  it('submits one existing instance when culling initially leaves zero shown, then restores the count', async () => {
    const s = fixture(); s.object.visible = s.room.visible = true; s.room.clear();
    const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 2);
    instanced.name = 'instances'; instanced.count = 0; s.room.add(instanced);
    const matrices = instanced.instanceMatrix.array.slice(), sphere = instanced.boundingSphere; await s.warm();
    expect(s.drawn).toEqual([['instances']]); expect(instanced.count).toBe(0);
    expect(instanced.instanceMatrix.array).toEqual(matrices); expect(instanced.boundingSphere).toBe(sphere); expect(s.object.parent).toBeNull();
  });
  it('restores a zero instance count and its bounds if drawing fails', async () => {
    const s = fixture(true); s.object.visible = s.room.visible = true; s.room.clear();
    const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 1);
    instanced.count = 0; s.room.add(instanced); const sphere = instanced.boundingSphere;
    await expect(s.warm()).rejects.toThrow('draw failed');
    expect(instanced.count).toBe(0); expect(instanced.boundingSphere).toBe(sphere); expect(s.object.parent).toBeNull();
  });
  it('leaves zero-capacity instance buffers empty', async () => {
    const s = fixture(); s.object.visible = s.room.visible = true; s.room.clear();
    const instanced = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 0);
    instanced.count = 0; s.room.add(instanced); await s.warm();
    expect(s.drawn).toEqual([[]]); expect(instanced.count).toBe(0);
  });
  it('does not consume a pending full-scene shadow update while the scene is hidden', async () => {
    const s = fixture(); s.renderer.shadowMap.needsUpdate = true; await s.warm();
    expect(s.shadowFlags).toEqual([false, false]); expect(s.renderer.shadowMap.needsUpdate).toBe(true);
  });
  it('restores hidden groups, the scene and renderer after a failed warm draw', async () => {
    const s = fixture(true); await expect(s.warm()).rejects.toThrow('draw failed');
    expect(s.drawn).toEqual([['one']]);
    expect(s.object.visible).toBe(false); expect(s.room.visible).toBe(false);
    expect(s.one.visible).toBe(true); expect(s.two.visible).toBe(true); expect(s.omitted.visible).toBe(false);
    expect(s.existing.visible).toBe(true); expect(s.object.parent).toBeNull();
    expect(s.renderer.shadowMap.autoUpdate).toBe(true);
  });
});
