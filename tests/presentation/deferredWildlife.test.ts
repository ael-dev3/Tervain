import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { deferredWildlife, type AnimalWildlife } from '../../src/presentation/animals';

function fakeInner(): AnimalWildlife {
  return {
    group: new THREE.Group(), update: vi.fn(), dispose: vi.fn(), setPeople: vi.fn(), contacts: [{ id: 'animal:x', kind: 'circle', x: 0, z: 0, r: 1, active: true }],
    physicalActors: [], snapshot: () => [], syncHunting: vi.fn(), traceArrow: () => null, showArrowImpact: vi.fn(), alertShot: vi.fn(),
    nearestCarcass: (() => null) as never, skinningFrame: (() => null) as never, setRunning: vi.fn(), setReduceEffects: vi.fn(),
    mount: () => ({ x: 1, y: 0, z: 2, yaw: 0, seat: 1.2 }), ride: vi.fn(), rideGait: () => null,
  };
}

describe('wildlife that arrives after the world opens (A70)', () => {
  it('stands in empty, then hands on settings and restores hunting records when the animals arrive', () => {
    const lazy = deferredWildlife();
    expect(lazy.arrived).toBe(false);
    expect(lazy.contacts).toEqual([]);
    expect(lazy.mount('1005232412')).toBeNull();
    const records = { 'deer-a': { status: 'dead', bodyHits: 0, headshot: true, position: { x: 1, y: 2, z: 3 }, yaw: 0, atClock: 5 } } as never;
    lazy.syncHunting(records); lazy.setRunning(false); lazy.setReduceEffects(true);
    const inner = fakeInner();
    lazy.attach(inner);
    expect(lazy.arrived).toBe(true);
    expect(lazy.group.children).toContain(inner.group);
    expect(inner.syncHunting).toHaveBeenCalledWith(records, true);
    expect(inner.setRunning).toHaveBeenCalledWith(false);
    expect(inner.setReduceEffects).toHaveBeenCalledWith(true);
    expect(lazy.contacts).toHaveLength(1);
    expect(lazy.mount('1005232412')).not.toBeNull();
  });

  it('disposes animals that arrive after the world was closed', () => {
    const lazy = deferredWildlife(), inner = fakeInner();
    lazy.dispose?.();
    lazy.attach(inner);
    expect(inner.dispose).toHaveBeenCalled();
    expect(lazy.arrived).toBe(false);
  });
});
