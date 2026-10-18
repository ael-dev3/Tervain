import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {WebGLUniforms} from 'three/src/renderers/webgl/WebGLUniforms.js';
import { createFoliageField, foliageUniforms, patchFoliageVertex, patchFloorPlantVertex, FOLIAGE_RESPONSE } from '../../src/presentation/foliage/foliageWind';
import { GrassWind } from '../../src/presentation/grass/wind';
import { REALM_WIND } from '../../src/presentation/realmWind';
import {cacheFoliageMoverUniform} from '../../src/presentation/foliage/foliageMoverUniform';

function gpu(struct: boolean) {
 const writes: {name:string;data:number[]}[]=[];
 const gl={ACTIVE_UNIFORMS:0x8b86,getProgramParameter:()=>struct?6:1,
 getActiveUniform:(_p:unknown,i:number)=>({name:struct?`uFoliageMovers[${i}].item`:'uFoliageMovers[0]',size:struct?1:6,type:0x8b52}),
 getUniformLocation:(_p:unknown,name:string)=>name,
 uniform4fv:(name:string,data:Float32Array)=>writes.push({name,data:Array.from(data)}),
 uniform4f:(name:string,...data:number[])=>writes.push({name,data:Array.from(new Float32Array(data))})};
 const uniforms=new WebGLUniforms(gl as unknown as WebGLRenderingContext,{} as ConstructorParameters<typeof WebGLUniforms>[1]) as unknown as {setValue(gl:WebGLRenderingContext,name:string,value:unknown):void};
 return{writes,upload:(value:unknown)=>uniforms.setValue(gl as unknown as WebGLRenderingContext,'uFoliageMovers',value)};
}
const make=(value=Array.from({length:6},(_,i)=>new THREE.Vector4(i+.123456789,-i,2*i,.4)))=>({uniforms:{uFoliageMovers:{value} as THREE.IUniform},vertexShader:'uniform vec4 uFoliageMovers[6];\nvoid f(){ for(int i=0;i<6;i++){vec4 m = uFoliageMovers[i];} }'});
describe('foliage mover uniform transport',()=>{
 it('uses actual Three setters to skip unchanged vectors, preserving GPU words and changed slots',()=>{
  const s=make(),source=s.uniforms.uFoliageMovers.value as THREE.Vector4[],before=gpu(false),after=gpu(true);
  expect(cacheFoliageMoverUniform(s)).toBe(true);
  const view=s.uniforms.uFoliageMovers.value;
  before.upload(source);after.upload(view);
  expect(after.writes.flatMap(w=>w.data)).toEqual(before.writes[0]!.data);
  for(let i=0;i<120;i++){before.upload(source);after.upload(s.uniforms.uFoliageMovers.value);}
  expect(before.writes).toHaveLength(121);expect(after.writes).toHaveLength(6);
  source[2]!.x+=1;after.upload(s.uniforms.uFoliageMovers.value);expect(after.writes).toHaveLength(7);expect(after.writes[6]!.name).toBe('uFoliageMovers[2].item');
  expect(s.uniforms.uFoliageMovers.value).toBe(view);
  expect(s.vertexShader).toContain('vec4 m = uFoliageMovers[i].item;');
 });
 it('tracks replacement arrays and forwards needsUpdate without creating new views',()=>{
  const a=make(),source=a.uniforms.uFoliageMovers as THREE.IUniform<THREE.Vector4[]> & {needsUpdate?:boolean};
  const b=make();b.uniforms.uFoliageMovers=source;
  cacheFoliageMoverUniform(a);cacheFoliageMoverUniform(b);expect(a.uniforms.uFoliageMovers).toBe(b.uniforms.uFoliageMovers);
  const view=a.uniforms.uFoliageMovers.value;source.value=source.value.map(v=>v.clone().multiplyScalar(2));
  expect(a.uniforms.uFoliageMovers.value).toBe(view);expect(view[1].item).toBe(source.value[1]);
  source.needsUpdate=false;expect((a.uniforms.uFoliageMovers as THREE.IUniform & {needsUpdate?:boolean}).needsUpdate).toBe(false);
 });
 it('rejects incompatible declarations or field sizes',()=>{
  const s=make();s.vertexShader='void main() {}';expect(cacheFoliageMoverUniform(s)).toBe(false);
  expect(cacheFoliageMoverUniform(make([new THREE.Vector4()]))).toBe(false);
 });
});

it('installs the same transport through wood, leaf/shadow and floor production hooks',()=>{
 const field=createFoliageField(new GrassWind(REALM_WIND));
 const makeShader=()=>({uniforms:{} as Record<string,THREE.IUniform>,vertexShader:'#include <common>\nvoid main(){#include <begin_vertex>}'});
 for(const leaf of [true,false]){
  const shader=makeShader();expect(patchFoliageVertex(shader,foliageUniforms(field,FOLIAGE_RESPONSE.broadleaf),leaf)).toBe(true);
  expect(shader.vertexShader).toContain('uniform TvFoliageMover uFoliageMovers[6];');
  expect(shader.vertexShader).toContain('uniform mat4 uFoliageShakes;');
  expect(shader.uniforms.uFoliageShakes!.value).toBeInstanceOf(Float32Array);
  expect(shader.vertexShader).toContain('vec4 m = uFoliageMovers[i].item;');
 }
 const floor=makeShader();expect(patchFloorPlantVertex(floor,field)).toBe(true);expect(floor.vertexShader).toContain('vec4 m = uFoliageMovers[i].item;');
});
