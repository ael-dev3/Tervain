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

describe('window view capture (A77, A78)', () => {
  it('spreads every capture over six frames, the first in a room too, lightening the trees, and shows it once whole', () => {
    const { renderer, drawn } = stubRenderer();
    const pane = new THREE.MeshBasicMaterial();
    const view = new WindowView(rooms, pane, 16, 3);
    let lightened = 0, restored = 0;
    view.lighten = () => { lightened++; return () => { restored++; }; };
    const scene = new THREE.Scene(), at = new THREE.Vector3();
    const entry: number[][] = [];
    for (let i = 0; i < 6; i++) {
      drawn.length = 0;
      expect(view.update(renderer, scene, at, 1 / 60, true)).toBe(true);
      entry.push([...drawn]);
      // The panes take the capture only once its six faces are drawn.
      expect(pane.envMap === null, `frame ${i}`).toBe(i < 5);
    }
    expect(entry).toEqual([[0], [1], [2], [3], [4], [5]]);
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
    expect(lightened).toBe(12);
    expect(restored).toBe(12);
    view.dispose();
  });

  it('shows plain daylight instead of another room view until the new capture is whole; the same room keeps its own (A80)', () => {
    const { renderer } = stubRenderer();
    const other = { ...room, building: { ...room.building, x: 20 } } as unknown as InteriorSpec;
    let where: InteriorSpec | null = room;
    const locator = { within: () => where, base: () => 0 } as unknown as RoomLocator;
    const pane = new THREE.MeshBasicMaterial(), view = new WindowView(locator, pane, 16, 3), scene = new THREE.Scene(), at = new THREE.Vector3();
    for (let i = 0; i < 6; i++) view.update(renderer, scene, at, 1 / 60, true);
    expect(pane.envMap).not.toBeNull();
    // Out and back into the same room: its view stays.
    where = null; view.update(renderer, scene, at, 1 / 60, true);
    where = room; view.update(renderer, scene, at, 1 / 60, true);
    expect(pane.envMap).not.toBeNull();
    // Into another room: daylight until its six faces are drawn.
    where = other;
    view.update(renderer, scene, at, 1 / 60, true);
    expect(pane.envMap).toBeNull();
    for (let i = 0; i < 5; i++) view.update(renderer, scene, at, 1 / 60, true);
    expect(pane.envMap).not.toBeNull();
    // Back and forth while captures are half drawn over the shared cube: daylight until a room's own capture is whole,
    // never a mix of the two rooms.
    where = room;
    for (let i = 0; i < 2; i++) view.update(renderer, scene, at, 1 / 60, true);
    where = other;
    view.update(renderer, scene, at, 1 / 60, true);
    for (let i = 0; i < 2; i++) view.update(renderer, scene, at, 1 / 60, true);
    where = room;
    view.update(renderer, scene, at, 1 / 60, true);
    expect(pane.envMap).toBeNull();
    for (let i = 0; i < 5; i++) view.update(renderer, scene, at, 1 / 60, true);
    expect(pane.envMap).not.toBeNull();
    view.dispose();
  });
});
