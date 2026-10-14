import * as THREE from 'three';
import fs from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { buildGroundcover } from '../../src/presentation/groundcover';
import { createGrassField } from '../../src/presentation/grass/grassField';
import { GrassTrample, type GrassMover } from '../../src/presentation/grass/trample';
import type { BuildContext, FrameContext } from '../../src/presentation/context';

vi.mock('../../src/presentation/ground/habitat', () => ({ Habitat: class {} }));
vi.mock('../../src/presentation/grass/grassField', async original => ({
  ...await original<typeof import('../../src/presentation/grass/grassField')>(), createGrassField: vi.fn(),
}));
function build() {
  vi.mocked(createGrassField).mockReturnValue({group:new THREE.Group(),layers:[],materials:[],update:vi.fn(),stats:()=>({instances:0,triangles:0,draws:0,tiles:0}),dispose:vi.fn()});
  return buildGroundcover({quality:'high',terrain:{heightAt:()=>0}} as unknown as BuildContext);
}
describe('groundcover mover inputs',()=>{
 it('preserves walk, airborne, teleport and body-selection inputs over 120 steps',()=>{
  const arrays=new Set<readonly GrassMover[]>(),heroes=new Set<GrassMover>(),snapshots:GrassMover[][]=[];
  const original=GrassTrample.prototype.setMovers;
  const spy=vi.spyOn(GrassTrample.prototype,'setMovers').mockImplementation(function(this: GrassTrample,movers,x,z){
    arrays.add(movers);const hero=movers.find(m=>m.radius===.55);if(hero)heroes.add(hero);
    snapshots.push(movers.map(m=>({...m})));return original.call(this,movers,x,z);
  });
  const ground=build(),other={x:4,z:8,radius:1,weight:.3,vx:.2,vz:.1};
  const focus=new THREE.Vector3(),frame={camera:new THREE.PerspectiveCamera(),focus,reducedMotion:false} as unknown as FrameContext;
  try{
   for(let i=0;i<120;i++){
    focus.set(i/60+(i>=70?100:0),i>=30&&i<40?1:0,2*i/60);
    ground.setMovers(i>=90?[]:[other]);ground.update(i===20?0:1/60,frame);
    const expected:GrassMover[]=[];
    if(!(i>=30&&i<40))expected.push({x:focus.x,z:focus.z,radius:.55,weight:.75,vx:i===0||i===70?0:1,vz:i===0||i===70?0:2});
    if(i<90)expected.push(other);
    expect(snapshots[i]!.length).toBe(expected.length);
    expected.forEach((m,j)=>{for(const [k,v] of Object.entries(m))expect(snapshots[i]![j]![k as keyof GrassMover]).toBeCloseTo(v,9);});
   }
   if(process.env.GRASS_INPUT_RECEIPT)fs.writeFileSync(process.env.GRASS_INPUT_RECEIPT,JSON.stringify({steps:120,inputArrays:arrays.size,heroObjects:heroes.size,snapshots},null,2)+'\n');
   expect(arrays.size).toBe(1);expect(heroes.size).toBe(1);
  }finally{ground.dispose?.();spy.mockRestore();}
 });
 it('keeps independent worlds isolated',()=>{
  const values:(readonly GrassMover[])[]=[];const spy=vi.spyOn(GrassTrample.prototype,'setMovers').mockImplementation(m=>{values.push(m);});
  const a=build(),b=build();try{const frame={camera:new THREE.PerspectiveCamera(),focus:new THREE.Vector3(),reducedMotion:false} as unknown as FrameContext;
   a.update(1/60,frame);frame.focus.x=8;b.update(1/60,frame);
   expect(values[0]).not.toBe(values[1]);expect(values[0]![0]!.x).toBe(0);expect(values[1]![0]!.x).toBe(8);
  }finally{a.dispose?.();b.dispose?.();spy.mockRestore();}
 });
});
