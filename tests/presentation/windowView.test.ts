import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { WindowView } from '../../src/presentation/windowView';
import type { InteriorSpec, RoomLocator } from '../../src/world/interiors';

/** Counts the faces drawn per frame; enough of a renderer for CubeCamera.update and the spread refresh. */
function stubRenderer() {
  const drawn: number[] = [];
  let face = 0;
  const renderer = {
    isWebGLRenderer: true, coordinateSystem: THREE.WebGLCoordinateSystem, autoClear: true,
    shadowMap: { autoUpdate: true }, xr: { enabled: false }, state: { buffers: { depth: { getReversed: () => false } } },
    getRenderTarget: () => null, getActiveCubeFace: () => 0, getActiveMipmapLevel: () => 0,
    setRenderTarget: (_target: unknown, f = 0) => { face = f; },
    render: () => { drawn.push(face); },
    clearDepth: () => {},
  };
  return { renderer: renderer as unknown as THREE.WebGLRenderer, drawn };
}

const room = { building: { x: 0, z: 0, yaw: 0, w: 6, d: 5 }, wall: 0.24, floorTop: 0.4, wallTop: 3.2 } as unknown as InteriorSpec;
const rooms = { within: () => room, base: () => 0 } as unknown as RoomLocator;

describe('window view capture (A77)', () => {
  it('captures all six faces on entering a room, then spreads each refresh over six frames, lightening the trees', () => {
    const { renderer, drawn } = stubRenderer();
    const view = new WindowView(rooms, new THREE.MeshBasicMaterial(), 16, 3);
    let lightened = 0, restored = 0;
    view.lighten = () => { lightened++; return () => { restored++; }; };
    const scene = new THREE.Scene(), at = new THREE.Vector3();
    expect(view.update(renderer, scene, at, 1 / 60, true)).toBe(true);
    expect(drawn).toEqual([0, 1, 2, 3, 4, 5]);
    drawn.length = 0;
    // Nothing until the refresh is due.
    for (let i = 0; i < 60; i++) view.update(renderer, scene, at, 1 / 60, true);
    expect(drawn).toEqual([]);
    const perFrame: number[][] = [];
    for (let i = 0; i < 200 && perFrame.flat().length < 6; i++) {
      drawn.length = 0;
      view.update(renderer, scene, at, 1 / 60, true);
      if (drawn.length) perFrame.push([...drawn]);
    }
    expect(perFrame).toEqual([[0], [1], [2], [3], [4], [5]]);
    expect(lightened).toBe(7);
    expect(restored).toBe(7);
    view.dispose();
  });
});
