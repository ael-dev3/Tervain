import {expect, it, vi} from 'vitest';
const observed=vi.hoisted(()=>({noiseCalls:0}));
vi.mock('../../src/world/noise',async(importOriginal)=>{
  const noise=await importOriginal<typeof import('../../src/world/noise')>();
  return {...noise,fbm(x:number,z:number,octaves:number,seed:number){if(seed===61||seed===62)observed.noiseCalls++;return noise.fbm(x,z,octaves,seed);}};
});
import {coastX,shoreDistance,seaWetness} from '../../src/world/coast';
import {COAST} from '../../src/world/layout';
import {fbm} from '../../src/world/noise';
const P=COAST;
// The uncached curve is the compatibility oracle; it preserves the original evaluation order.
function uncached(z: number): number {
  const n = P.length;
  if (z <= P[0]!.z) return P[0]!.x + uncachedNoise(z);
  if (z >= P[n - 1]!.z) return P[n - 1]!.x + uncachedNoise(z);
  let i = 0;
  while (i < n - 2 && z > P[i + 1]!.z) i++;
  const p0 = P[Math.max(0, i - 1)]!;
  const p1 = P[i]!;
  const p2 = P[i + 1]!;
  const p3 = P[Math.min(n - 1, i + 2)]!;
  const t = (z - p1.z) / (p2.z - p1.z);
  const h = p2.z - p1.z;
  const m1 = ((p2.x - p0.x) / (p2.z - p0.z)) * h;
  const m2 = ((p3.x - p1.x) / (p3.z - p1.z)) * h;
  const t2 = t * t;
  const t3 = t2 * t;
  const x = (2 * t3 - 3 * t2 + 1) * p1.x + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2.x + (t3 - t2) * m2;
  return x + uncachedNoise(z);
}

function uncachedNoise(z: number) {
  return 3.4 * fbm(z / 24, 1.7, 3, 61) + 1.2 * fbm(z / 7, 8.4, 2, 62);
}


it('shares the latest curve across shoreline callers and recomputes after a different z',()=>{
  const z=12345.67891,expected=uncached(z);
  observed.noiseCalls=0;
  expect(coastX(z)).toBe(expected);
  expect(shoreDistance(-200,z)).toBe(-200-expected);
  seaWetness(-200,z);
  expect(observed.noiseCalls).toBe(2); // Two fbm calls make five noise octaves, once.
  coastX(z+2);expect(observed.noiseCalls).toBe(4);
  coastX(z);expect(observed.noiseCalls).toBe(6); // One entry, not an accumulating map.
});

it('matches the uncached curve exactly at anchors, seams, signed zero and extreme inputs',()=>{
  const points=[-0,0,NaN,Infinity,-Infinity,Number.MAX_VALUE,-Number.MAX_VALUE,...COAST.flatMap(p=>[p.z-1e-8,p.z,p.z+1e-8])];
  let state=91717;
  for(let i=0;i<2000;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;points.push((state/2**32-.5)*10000);}
  for(const z of points){const expected=uncached(z);expect(coastX(z)).toBe(expected);expect(coastX(z)).toBe(expected);}
});
