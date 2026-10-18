import {describe,it,expect} from 'vitest';
import * as THREE from 'three';
import {snapDetachedClumps} from '../../src/presentation/canopy';
describe('clump snapping vertex data',()=>{
 for(const offset of [0,4])it(`retains branch attributes when crown offset is ${offset}`,()=>{
  const leaf=new THREE.PlaneGeometry(.2,.2).rotateX(-Math.PI/2).translate(offset,0,0),wood=new THREE.BoxGeometry(1,1,1);
  for(const [name,size] of [['_wind',4],['_pivot',3],['color',3]] as const)leaf.setAttribute(name,new THREE.Float32BufferAttribute(Array.from({length:leaf.getAttribute("position").count*size},(_,i)=>i/13),size));
  const original=Array.from(leaf.getAttribute("position").array),r=snapDetachedClumps(leaf,wood,1.5);
  expect(r.moved).toBe(offset===0?0:1);
  expect(Object.keys(r.geometry.attributes).sort()).toEqual(Object.keys(leaf.attributes).sort());
  for(const name of ['normal','uv','_wind','_pivot','color']){
   expect(r.geometry.getAttribute(name).array).toEqual(leaf.getAttribute(name).array);
   expect(r.geometry.getAttribute(name)).not.toBe(leaf.getAttribute(name));
  }
  expect(r.geometry.index!.array).toEqual(leaf.index!.array);
  expect(Array.from(leaf.getAttribute("position").array)).toEqual(original);
  leaf.dispose();wood.dispose();r.geometry.dispose();
 });
});
