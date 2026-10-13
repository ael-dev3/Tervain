import { describe, expect, it } from 'vitest';
import { RenderScale, renderScaleFloor, presetPixelRatio } from '../../src/platform/renderScale';

const feed = (r: RenderScale, ms: number, n: number) => { let changes = 0; for (let i = 0; i < n; i++) if (r.sample(ms)) changes++; return changes; };

describe('dynamic resolution (A113)', () => {
  it('holds full resolution while 60 Hz frames are met', () => {
    const r = new RenderScale();
    expect(feed(r, 16.7, 2000)).toBe(0);
    expect(r.scale).toBe(1);
  });

  it('steps down while frames are missed, settles between steps, and stops at the floor', () => {
    const r = new RenderScale(0.5);
    expect(feed(r, 33.3, 90)).toBe(1);
    expect(r.scale).toBeCloseTo(0.85);
    expect(feed(r, 33.3, 179)).toBe(0); // settling, then a fresh window to judge
    expect(feed(r, 33.3, 2000)).toBeGreaterThan(0);
    expect(r.scale).toBe(0.5);
  });

  it('ignores stalls that are not drawing cost, and climbs back once frames are steady', () => {
    const r = new RenderScale(0.5);
    expect(feed(r, 2000, 500)).toBe(0);
    feed(r, 33.3, 90);
    expect(r.scale).toBeLessThan(1);
    feed(r, 16.7, 2 * (90 + 600));
    expect(r.scale).toBe(1);
  });

  it('never draws a Retina screen below one pixel per point, nor a 1× screen below 0.75', () => {
    expect(renderScaleFloor(2) * 2).toBe(1);
    expect(renderScaleFloor(1)).toBe(0.75);
    expect(renderScaleFloor(1.5) * 1.5).toBe(0.75);
  });
});

it('matches the original rolling-window decisions across wraps, resets, floors and invalid samples', () => {
  class Reference {
    scale = 1; missed: boolean[] = []; settle = 0;
    constructor(public floor: number) {}
    reset() { this.scale = 1; this.missed = []; this.settle = 0; }
    sample(ms: number) {
      if (!(ms > 0) || ms > 250) return false;
      if (this.settle > 0) { this.settle--; return false; }
      this.missed.push(ms > 1000 / 60 * 1.4); if (this.missed.length > 600) this.missed.shift();
      const share = (n: number) => {const tail=this.missed.slice(-n);return tail.filter(Boolean).length/tail.length;};
      if (this.missed.length>=90&&share(90)>.1&&this.scale>this.floor) {this.scale=Math.max(this.floor,+(this.scale-.15).toFixed(3));}
      else if(this.missed.length>=600&&share(600)<.01&&this.scale<1) {this.scale=Math.min(1,+(this.scale+.1).toFixed(3));}
      else return false;
      this.missed=[];this.settle=90;return true;
    }
  }
  for(const floor of [.5,.75,1]) {
    const next=new RenderScale(floor),before=new Reference(floor);
    for(let i=0;i<12000;i++) { if(i===7000){next.reset();before.reset();}
      const ms=i%127===0?NaN:i%113===0?400:i%107===0?-1:i%3600<1200?16.7:i%3600<2400?33.3:i%11===0?25:16.7;
      expect(next.sample(ms)).toBe(before.sample(ms));expect(next.scale).toBe(before.scale);
    }
  }
});

it('caps high-density fill cost without supersampling ordinary screens', () => {
  for (const ratio of [1, 1.25, 1.5, 2, 3]) {
    expect(presetPixelRatio('low', ratio)).toBe(Math.min(ratio, 1));
    expect(presetPixelRatio('medium', ratio)).toBe(Math.min(ratio, 1.5));
    expect(presetPixelRatio('high', ratio)).toBe(Math.min(ratio, 1.5));
  }
});
