import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { GPU } from '../../src/presentation/skyState';
import { GrassTrample, TRAMPLE_MAX_MOVERS, TRAMPLE_MAX_PENDING, TRAMPLE_RECOVERY, type GrassMover } from '../../src/presentation/grass/trample';

interface StampPass {
  stamps: GrassMover[];
  keep: number[];
  fragment: string;
}

function rendererFixture() {
  const passes: StampPass[] = [];
  const previous = new THREE.WebGLRenderTarget(2, 2);
  let target: THREE.WebGLRenderTarget | null = previous;
  const renderer = {
    autoClear: false,
    getRenderTarget: () => target,
    setRenderTarget: vi.fn((next: THREE.WebGLRenderTarget | null) => { target = next; }),
    clear: vi.fn(),
    render: vi.fn((scene: THREE.Scene) => {
      const material = (scene.children[0] as THREE.Mesh).material as THREE.ShaderMaterial;
      const u = material.uniforms;
      if (!u.uMoverCount) return;
      const movers = u.uMovers!.value as THREE.Vector4[], velocities = u.uMoverVel!.value as THREE.Vector2[];
      passes.push({
        stamps: movers.slice(0, u.uMoverCount.value as number).map((m, i) => ({
          x: m.x, z: m.y, radius: m.z, weight: m.w, vx: velocities[i]!.x, vz: velocities[i]!.y,
        })),
        keep: (u.uKeep!.value as THREE.Vector2).toArray(),
        fragment: material.fragmentShader,
      });
    }),
  };
  return { renderer: renderer as unknown as THREE.WebGLRenderer, passes, previous };
}

describe('grass brush stamps between fixed GPU steps', () => {
  it('drops footprints without half-float targets and keeps only the newest when steps stall (A71)', () => {
    const field = new GrassTrample(16, 1000, { x: 0, z: 0 });
    const { renderer, passes, previous } = rendererFixture();
    const half = GPU.halfTargets;
    try {
      GPU.halfTargets = false;
      for (let frame = 0; frame < 2000; frame++) {
        field.queueStamps([{ x: frame, z: 1, radius: 0.5 }]);
        field.update(renderer, 0, 0, 1 / 60);
      }
      GPU.halfTargets = true;
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes.flatMap((p) => p.stamps)).toHaveLength(0);
      passes.length = 0;
      field.queueStamps(Array.from({ length: TRAMPLE_MAX_PENDING + 50 }, (_, i) => ({ x: i, z: 2, radius: 0.5 })));
      field.update(renderer, 0, 0, 1 / 30);
      const xs = passes.flatMap((p) => p.stamps).map((s) => s.x);
      expect(xs).toHaveLength(TRAMPLE_MAX_PENDING);
      expect(xs[0]).toBe(50);
    } finally { GPU.halfTargets = half; field.dispose(); previous.dispose(); }
  });

  it.each([60, 120])('keeps every transient sample across %i Hz frames until the 30 Hz step consumes it', (hz) => {
    const field = new GrassTrample(16, 100, { x: 0, z: 0 });
    const { renderer, passes, previous } = rendererFixture();
    const frames = hz / 30;
    try {
      for (let frame = 0; frame < frames; frame++) {
        field.queueStamps([{ x: frame, z: -2, radius: 0.5, weight: 0.3, vx: 3, vz: 1 }]);
        field.setMovers([{ x: 20 + frame, z: 3, radius: 0.5 }]);
        field.update(renderer, 0, 0, 1 / hz);
        if (frame < frames - 1) expect(passes).toHaveLength(0);
      }
      expect(passes).toHaveLength(1);
      expect(passes[0]!.stamps.map((s) => s.x)).toEqual([20 + frames - 1, ...Array.from({ length: frames }, (_, i) => i)]);
      expect(passes[0]!.stamps.slice(1).every((s) => s.weight === 0.3 && s.vx === 3 && s.vz === 1)).toBe(true);
      field.setMovers([]);
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes[1]!.stamps).toHaveLength(0);
      expect(renderer.getRenderTarget()).toBe(previous);
      expect(renderer.autoClear).toBe(false);
    } finally { field.dispose(); previous.dispose(); }
  });

  it('batches every queued footprint beyond the uniform limit without repeating recovery or edge fading', () => {
    const field = new GrassTrample(16, 1000, { x: 0, z: 0 });
    const { renderer, passes, previous } = rendererFixture();
    const people = Array.from({ length: TRAMPLE_MAX_MOVERS }, (_, i) => ({ x: 100 + i, z: 0, radius: 0.5 }));
    const stroke = Array.from({ length: TRAMPLE_MAX_MOVERS * 2 + 7 }, (_, i) => ({ x: i, z: -3, radius: 0.6 }));
    try {
      field.setMovers(people);
      field.queueStamps(stroke);
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes.map((p) => p.stamps.length)).toEqual([TRAMPLE_MAX_MOVERS, TRAMPLE_MAX_MOVERS, TRAMPLE_MAX_MOVERS, 7]);
      expect(passes.flatMap((p) => p.stamps).filter((s) => s.z === -3).map((s) => s.x)).toEqual(stroke.map((s) => s.x));
      expect(passes[0]!.keep).toEqual([Math.exp(-(1 / 30) / TRAMPLE_RECOVERY.push), Math.exp(-(1 / 30) / TRAMPLE_RECOVERY.flat)]);
      expect(passes.slice(1).every((p) => p.keep[0] === 1 && p.keep[1] === 1)).toBe(true);
      // Unity-keep batches leave old edge texels unchanged and fade only their new footprints.
      expect(passes[0]!.fragment).toContain('float oldEdge = uKeep.x < 1.0 ? edge : 1.0;');
      expect(passes[0]!.fragment).toContain('dir / len * k * edge');
      expect(passes[0]!.fragment).toContain('lying = max(lying, k * m.w * edge);');
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes[4]!.stamps).toHaveLength(TRAMPLE_MAX_MOVERS);
      expect(passes[4]!.stamps.every((s) => s.z === 0)).toBe(true);
    } finally { field.dispose(); previous.dispose(); }
  });

  it('consumes a stroke once while catch-up steps continue to recover and stamp current bodies', () => {
    const field = new GrassTrample(16, 100, { x: 0, z: 0 });
    const { renderer, passes, previous } = rendererFixture();
    try {
      field.setMovers([{ x: 10, z: 1, radius: 0.5 }]);
      field.queueStamps([{ x: 2, z: 3, radius: 0.6 }]);
      field.update(renderer, 0, 0, 1 / 10);
      expect(passes).toHaveLength(3);
      expect(passes.map((p) => p.stamps.map((s) => s.x))).toEqual([[10, 2], [10], [10]]);
      expect(passes.every((p) => p.keep[0]! < 1 && p.keep[1]! < 1)).toBe(true);
    } finally { field.dispose(); previous.dispose(); }
  });

  it('owns queued values, rejects invalid footprints, and keeps samples through an unplaced focus', () => {
    const field = new GrassTrample(16, 100);
    const { renderer, passes, previous } = rendererFixture();
    const sample = { x: 2, z: 3, radius: 0.6 };
    try {
      field.queueStamps([sample, { x: Number.NaN, z: 1, radius: 1 }, { x: 1, z: 1, radius: 0 }]);
      sample.x = 40;
      field.update(renderer, Number.NaN, Number.NaN, 1 / 30);
      expect(passes).toHaveLength(0);
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes[0]!.stamps.map((s) => s.x)).toEqual([2]);
    } finally { field.dispose(); previous.dispose(); }
  });

  it('retains an unconsumed batch after a render failure and releases pending stamps on disposal', () => {
    const field = new GrassTrample(16, 100, { x: 0, z: 0 });
    const { renderer, passes, previous } = rendererFixture();
    try {
      field.queueStamps([{ x: 2, z: 3, radius: 0.6 }]);
      const render = renderer.render as ReturnType<typeof vi.fn>;
      render.mockImplementationOnce(() => { throw new Error('GPU pass failed'); });
      expect(() => field.update(renderer, 0, 0, 1 / 30)).toThrow('GPU pass failed');
      expect(renderer.getRenderTarget()).toBe(previous);
      expect(renderer.autoClear).toBe(false);
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes[0]!.stamps.map((s) => s.x)).toEqual([2]);
      field.queueStamps([{ x: 4, z: 5, radius: 0.6 }]);
      field.dispose();
      field.queueStamps([{ x: 6, z: 7, radius: 0.6 }]);
      field.update(renderer, 0, 0, 1 / 30);
      expect(passes).toHaveLength(1);
      expect((field as unknown as { pendingStamps: GrassMover[] }).pendingStamps).toHaveLength(0);
    } finally { field.dispose(); previous.dispose(); }
  });
});
