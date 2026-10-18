import { expect, it, vi } from 'vitest';
import { createPlanarDistanceFade, smoothDistanceFade } from '../../src/presentation/distanceVisibility';
import { FOREST_FLOOR_DISTANCE } from '../../src/presentation/forestFloor';

it('preserves exact coverage across all authored bands, threshold neighbours and long camera walks', () => {
  for (const {start,end} of Object.values(FOREST_FLOOR_DISTANCE)) {
    const coverage=createPlanarDistanceFade(start,end);
    for (const radius of [0,start-1e-5,start-1e-7,start,start+1e-7,start+1e-5,(start+end)/2,end-1e-5,end-1e-7,end,end+1e-7,end+1e-5,1000]) {
      for (let i=0;i<100;i++) {
        const angle=i*.379, x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
        expect(coverage(x,z)).toBe(smoothDistanceFade(Math.hypot(x,z),start,end));
      }
    }
    for(let i=0;i<10000;i++) {
      const x=Math.sin(i*17.123)*800,z=Math.cos(i*9.731)*800;
      expect(coverage(x,z)).toBe(smoothDistanceFade(Math.hypot(x,z),start,end));
    }
  }
});

it('calculates a distance only in the fade band or its rounding guard', () => {
  const coverage=createPlanarDistanceFade(112,208), spy=vi.spyOn(Math,'hypot');
  try {
    expect(coverage(0,0)).toBe(1);
    expect(coverage(10,20)).toBe(1);
    expect(coverage(209,0)).toBe(0);
    expect(coverage(400,500)).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    expect(coverage(160,0)).toBe(.5);
    expect(spy).toHaveBeenCalledTimes(1);
    coverage(112,0);coverage(208,0);
    expect(spy).toHaveBeenCalledTimes(3);
  } finally { spy.mockRestore(); }
});
