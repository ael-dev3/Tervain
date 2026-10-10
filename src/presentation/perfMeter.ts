import type * as THREE from 'three';

/**
 * What a frame costs (A76): the CPU's time from the start of the frame to the last draw submitted, the GPU's time to
 * draw it (where the browser exposes `EXT_disjoint_timer_query_webgl2`; results arrive a few frames late), and the draw
 * calls and triangles of every pass in it (the grass and window captures included, not only the last pass).
 */
export interface FrameSample { interval: number; cpu: number; gpu: number | null; calls: number; triangles: number }

interface TimerExt { TIME_ELAPSED_EXT: number; GPU_DISJOINT_EXT: number }

export class PerfMeter {
  /** The most recent samples (about 15 s at 60 Hz). */
  readonly samples: FrameSample[] = [];
  /** The GPU timer is unavailable on this browser or device (Safari, Firefox without the flag, software rendering). */
  readonly gpuTimer: boolean;
  private readonly gl: WebGL2RenderingContext | null;
  private readonly ext: TimerExt | null;
  private readonly pending: { query: WebGLQuery; sample: FrameSample }[] = [];
  private open: WebGLQuery | null = null;
  private started = 0;

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    // A stand-in renderer (tests, a failed context) has no context: the meter then counts nothing on the GPU.
    const gl = typeof renderer.getContext === 'function' ? renderer.getContext() : null;
    this.gl = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext ? gl : null;
    this.ext = (this.gl?.getExtension('EXT_disjoint_timer_query_webgl2') as TimerExt | null) ?? null;
    this.gpuTimer = !!this.ext;
  }

  /** Called as the frame begins, before any simulation step. */
  begin() {
    this.started = performance.now();
    this.renderer.info.reset?.();
    this.collect();
    if (this.gl && this.ext && this.pending.length < 6) {
      this.open = this.gl.createQuery();
      if (this.open) this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, this.open);
    }
  }

  /** Called once the frame's last draw has been submitted. */
  end(interval: number): FrameSample {
    const info = this.renderer.info.render;
    const sample: FrameSample = { interval, cpu: performance.now() - this.started, gpu: null, calls: info?.calls ?? 0, triangles: info?.triangles ?? 0 };
    if (this.gl && this.ext && this.open) {
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      this.pending.push({ query: this.open, sample });
      this.open = null;
    }
    this.samples.push(sample);
    if (this.samples.length > 900) this.samples.shift();
    return sample;
  }

  /** Read the GPU timings that have arrived; a disjoint period (power state, context switch) discards them. */
  private collect() {
    const gl = this.gl, ext = this.ext;
    if (!gl || !ext) return;
    const disjoint = gl.getParameter(ext.GPU_DISJOINT_EXT) as boolean;
    while (this.pending.length) {
      const { query, sample } = this.pending[0]!;
      if (!disjoint && !gl.getQueryParameter(query, gl.QUERY_RESULT_AVAILABLE)) break;
      if (!disjoint) sample.gpu = (gl.getQueryParameter(query, gl.QUERY_RESULT) as number) / 1e6;
      gl.deleteQuery(query);
      this.pending.shift();
    }
  }

  /** Medians over the last `count` samples, for the on-screen line. */
  recent(count = 60) {
    return summarise(this.samples.slice(-count));
  }
}

export interface FrameSummary {
  frames: number;
  interval: { median: number; p95: number; p99: number; worst: number };
  cpu: { median: number; p95: number };
  gpu: { median: number; p95: number; frames: number } | null;
  calls: { median: number; max: number };
  triangles: { median: number; max: number };
}

const quantile = (values: number[], p: number) => {
  if (!values.length) return 0;
  const a = [...values].sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(a.length * p))]!;
};

export function summarise(samples: readonly FrameSample[]): FrameSummary {
  const pick = (f: (s: FrameSample) => number) => samples.map(f);
  const intervals = pick((s) => s.interval), cpu = pick((s) => s.cpu), calls = pick((s) => s.calls), tris = pick((s) => s.triangles);
  const gpu = samples.flatMap((s) => (s.gpu === null ? [] : [s.gpu]));
  return {
    frames: samples.length,
    interval: { median: quantile(intervals, 0.5), p95: quantile(intervals, 0.95), p99: quantile(intervals, 0.99), worst: Math.max(0, ...intervals) },
    cpu: { median: quantile(cpu, 0.5), p95: quantile(cpu, 0.95) },
    gpu: gpu.length ? { median: quantile(gpu, 0.5), p95: quantile(gpu, 0.95), frames: gpu.length } : null,
    calls: { median: quantile(calls, 0.5), max: Math.max(0, ...calls) },
    triangles: { median: quantile(tris, 0.5), max: Math.max(0, ...tris) },
  };
}

/** One line for the HUD: frame time, CPU and GPU cost, draw calls and triangles. */
export function perfLine(s: FrameSummary, gpuTimer: boolean): string {
  const gpu = s.gpu ? `${s.gpu.median.toFixed(1)} ms` : gpuTimer ? '…' : 'n/a';
  return `frame ${s.interval.median.toFixed(1)} ms · cpu ${s.cpu.median.toFixed(1)} ms · gpu ${gpu} · ${Math.round(s.calls.median)} draws · ${(s.triangles.median / 1e6).toFixed(2)} M tris`;
}
