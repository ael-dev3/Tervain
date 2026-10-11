import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
import { perfLine, summarise, type FrameSample } from '../../src/presentation/perfMeter';

const sample = (i: number, gpu: number | null): FrameSample => ({ interval: 10 + i, cpu: 2 + i / 10, gpu, calls: 100 + i, triangles: 1e6 + i * 1e4 });

describe('frame cost summary (A76)', () => {
  it('reports medians, tails and the GPU only for frames it timed', () => {
    const samples = Array.from({ length: 100 }, (_, i) => sample(i, i % 2 ? 4 + i / 100 : null));
    const s = summarise(samples);
    expect(s.frames).toBe(100);
    expect(s.interval.median).toBe(60);
    expect(s.interval.p95).toBe(105);
    expect(s.interval.worst).toBe(109);
    expect(s.cpu.median).toBeCloseTo(7, 6);
    expect(s.gpu?.frames).toBe(50);
    expect(s.calls).toEqual({ median: 150, max: 199 });
    expect(s.triangles.max).toBe(1e6 + 99e4);
  });

  it('says plainly when the GPU cannot be timed', () => {
    const s = summarise([sample(0, null), sample(1, null)]);
    expect(s.gpu).toBeNull();
    expect(perfLine(s, false)).toContain('gpu n/a');
    expect(perfLine(s, true)).toContain('gpu …');
    expect(perfLine(summarise([sample(0, 3.24)]), true)).toContain('gpu 3.2 ms');
  });

  it('summarises nothing without failing', () => {
    const s = summarise([]);
    expect(s.frames).toBe(0);
    expect(s.interval.median).toBe(0);
    expect(s.gpu).toBeNull();
  });
});

describe('a frame that threw before it ended (A90 scout)', () => {
  it('lets the next frame end the stale query and time itself, rather than failing for the rest of the session', async () => {
    const { PerfMeter: Meter } = await import('../../src/presentation/perfMeter');
    class FakeGl {
      active: object | null = null; errors = 0; deleted = 0; made = 0;
      QUERY_RESULT_AVAILABLE = 1; QUERY_RESULT = 2;
      getExtension() { return { TIME_ELAPSED_EXT: 10, GPU_DISJOINT_EXT: 11 }; }
      createQuery() { this.made++; return {}; }
      beginQuery(_target: number, query: object) { if (this.active) { this.errors++; return; } this.active = query; }
      endQuery() { if (!this.active) { this.errors++; return; } this.active = null; }
      deleteQuery() { this.deleted++; }
      getParameter() { return false; }
      getQueryParameter() { return false; }
    }
    vi.stubGlobal('WebGL2RenderingContext', FakeGl);
    const gl = new FakeGl();
    const meter = new Meter({ getContext: () => gl, info: { reset() {}, render: { calls: 0, triangles: 0 } } } as unknown as THREE.WebGLRenderer);
    meter.begin();
    // The frame threw: end() never ran. The next frame begins.
    meter.begin();
    expect(gl.deleted).toBe(1);
    expect(gl.active).not.toBeNull();
    meter.end(16);
    expect(gl.active).toBeNull();
    expect(gl.errors).toBe(0);
    vi.unstubAllGlobals();
  });
});
