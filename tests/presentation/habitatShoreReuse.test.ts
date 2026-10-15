import {expect, it, vi} from 'vitest';
const observed=vi.hoisted(()=>({calls:0}));
vi.mock('../../src/world/coast',async(importOriginal)=>{
  const coast=await importOriginal<typeof import('../../src/world/coast')>();
  return {...coast,shoreDistance(x:number,z:number){observed.calls++;return coast.shoreDistance(x,z);}};
});
import {Habitat,newSample} from '../../src/presentation/ground/habitat';
import {groundSplat} from '../../src/presentation/groundSplat';
import {Colliders} from '../../src/world/colliders';
import {Terrain} from '../../src/world/terrain';
import {Exclusions} from '../../src/presentation/vegetation';
import {coastX,shoreDistance,seaWetness} from '../../src/world/coast';

it('avoids the duplicate direct shoreline lookup per cold node and keeps warm tiles cached',()=>{
  const terrain=new Terrain();
  const habitat=new Habitat({terrain,colliders:new Colliders(),excl:new Exclusions(terrain),plantedCrowns:{coverAt:()=>.35,broadleafAt:()=>0}});
  observed.calls=0;
  const first={...habitat.sample(-180,12,newSample())};
  // Two unchanged biome/forest lookups remain alongside the shared direct lookup.
  expect(observed.calls).toBe(3*17*17);
  expect(habitat.sample(-180,12,newSample())).toEqual(first);
  expect(observed.calls).toBe(3*17*17);
  habitat.sample(-140,12,newSample());expect(observed.calls).toBe(2*3*17*17);
});

it('preserves splat bytes and wetness with shared negative, zero and positive shoreline distances',()=>{
  const terrain=new Terrain();
  for(const z of [-120,0,80])for(const offset of [-5,0,12,45,100]){
    const x=coastX(z)+offset,sd=shoreDistance(x,z),surface={slope:terrain.slopeAt(x,z),carve:terrain.carveAt(x,z)};
    const before=new Float32Array(8),after=new Float32Array(8);
    observed.calls=0;
    const wet=groundSplat(terrain,x,z,before,undefined,undefined,undefined,undefined,undefined,surface);
    const baselineCalls=observed.calls;
    observed.calls=0;
    expect(groundSplat(terrain,x,z,after,undefined,undefined,undefined,undefined,undefined,{...surface,shoreDistance:sd})).toBe(wet);
    expect(seaWetness(x,z,sd)).toBe(seaWetness(x,z));
    expect(after).toEqual(before);expect(observed.calls).toBe(baselineCalls-1);
  }
});
