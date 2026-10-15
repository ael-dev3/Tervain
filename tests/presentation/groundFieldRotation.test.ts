import {expect,it,vi} from 'vitest';
import {groundSplat} from '../../src/presentation/groundSplat';
import {biomeAt} from '../../src/world/biomes';
import type {Terrain} from '../../src/world/terrain';
import type {PlantedCrownField} from '../../src/presentation/plantedCrowns';

it('does not recalculate fixed field trigonometry while generating surface samples',()=>{
  const terrain={heightAt:()=>3,slopeAt:()=>.1,carveAt:()=>0} as unknown as Terrain;
  const crowns={} as PlantedCrownField,biome=biomeAt(-180,12),weights=new Float32Array(8);
  const cosine=vi.spyOn(Math,'cos'),sine=vi.spyOn(Math,'sin');
  try{
    for(const[x,z]of [[-180,12],[-4,64],[36,58],[-42,50],[100,100]] as const){
      const wet=groundSplat(terrain,x,z,weights,crowns,biome,0,undefined,0,{slope:.1,carve:0,shoreDistance:100});
      expect(Number.isFinite(wet)).toBe(true);expect(Array.from(weights).every(Number.isFinite)).toBe(true);
    }
    expect(cosine).not.toHaveBeenCalled();expect(sine).not.toHaveBeenCalled();
  }finally{cosine.mockRestore();sine.mockRestore();}
});
