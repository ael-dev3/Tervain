import { describe, expect, it } from 'vitest';
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
