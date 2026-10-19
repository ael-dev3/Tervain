import {expect,it} from 'vitest';
import * as THREE from 'three';
import {anchorLeafIslands} from '../../src/presentation/leafIslands';
import {woodAnchor} from '../../src/presentation/canopy';

it.each([false,true])('does not accept an empty box centre as wood contact (alpha=%s)',alpha=>{
  const leaf=new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([1,0,0,0,1,0,0,0,1],3));
  leaf.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));
  const wood=new THREE.SphereGeometry(.02,8,6).translate(.5,.5,.5);
  const before=Array.from(leaf.getAttribute('position').array);
  try{
    expect(anchorLeafIslands(leaf,wood,alpha?{uv:'uv',cutoff:.42,alpha:()=>1}:null,{reach:.04,gap:.01})).toEqual({islands:1,moved:1,dropped:0});
    expect(Array.from(leaf.getAttribute('position').array)).not.toEqual(before);
    const p=leaf.getAttribute('position'),triangle=new THREE.Triangle(...[0,1,2].map(i=>new THREE.Vector3().fromBufferAttribute(p,i)) as [THREE.Vector3,THREE.Vector3,THREE.Vector3]);
    const surface=triangle.closestPointToPoint(new THREE.Vector3(.5,.5,.5),new THREE.Vector3());
    expect(woodAnchor(wood)(surface,new THREE.Vector3())).toBeLessThan(.04);
    expect(p.count).toBe(3);
    expect(leaf.index!.count).toBe(3);
  }finally{leaf.dispose();wood.dispose();}
});
