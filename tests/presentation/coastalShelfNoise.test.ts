import {expect, it, vi} from 'vitest';
const observed=vi.hoisted(()=>({calls:0}));
vi.mock('../../src/world/noise',async(importOriginal)=>{
  const noise=await importOriginal<typeof import('../../src/world/noise')>();
  return {...noise,fbm(x:number,z:number,octaves:number,seed:number){if(seed===211)observed.calls++;return noise.fbm(x,z,octaves,seed);}};
});
import {coastalShelfAt,coastalShelfHeight} from '../../src/world/coast';
import {COAST_SHELVES} from '../../src/world/layout';
import {fbm,smoothstep} from '../../src/world/noise';
function original(x:number,z:number,height:boolean){
  let result=0;
  for(const s of COAST_SHELVES){
    const d=Math.hypot((x-s.x)/s.rx,(z-s.z)/s.rz)+fbm(x/12,z/14,2,211)*.075;
    result=Math.max(result,(height?s.height:1)*(1-smoothstep(1-s.edge,1,d)));
  }
  return result;
}
it('matches original shelf cover and height at centres, rims and throughout the world',()=>{
  const points: [number,number][]=[[-0,0],[0,-0],[NaN,0],[Infinity,0],[-Infinity,0],[Number.MAX_VALUE,-Number.MAX_VALUE]];
  for(const s of COAST_SHELVES)for(const r of [0,1-s.edge,1-1e-8,1,1+1e-8])for(const angle of [0,.3,1.7,Math.PI])points.push([s.x+s.rx*r*Math.cos(angle),s.z+s.rz*r*Math.sin(angle)]);
  let state=771;
  for(let i=0;i<2000;i++){state=(Math.imul(state,1664525)+1013904223)>>>0;const x=state/2**32*1200-600;state=(Math.imul(state,1664525)+1013904223)>>>0;points.push([x,state/2**32*1200-600]);}
  for(const[x,z]of points){expect(coastalShelfAt(x,z)).toBe(original(x,z,false));expect(coastalShelfHeight(x,z)).toBe(original(x,z,true));}
});
it('evaluates the shared noise once per query and recomputes for changed coordinates',()=>{
  observed.calls=0;
  for(const[x,z]of [[-282,-92],[-254,-38],[-248,14],[-245,68]] as const){coastalShelfAt(x,z);coastalShelfHeight(x,z);}
  expect(observed.calls).toBe(8);
});
