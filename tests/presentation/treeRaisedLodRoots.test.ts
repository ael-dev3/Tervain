import * as THREE from 'three';
import {expect,it} from 'vitest';
import {groundedTreeFlareY,TREE_FLARE_MAX_SINK,TREE_SOIL_OVERLAP} from '../../src/presentation/treeGrounding';
import type {TreeVariant} from '../../src/presentation/treeGen';
const tree={x:0,z:0,s:1,yaw:0};
function variant(raised:number):TreeVariant{const near=new THREE.BoxGeometry(.4,2,.4).translate(0,1,0),far=new THREE.BoxGeometry(.8,2,.8).translate(0,1+raised,0);return{species:'oak',height:3,crownRadius:1,trunkRadius:.2,bark:'oak',leafTexture:'oak',crownTexture:'oak',lods:[{wood:near,leaf:null,tris:12},{wood:near,leaf:null,tris:12},{wood:far,leaf:null,tris:12}]};}
function dispose(v:TreeVariant){for(const g of new Set(v.lods.map(l=>l.wood)))g?.dispose();}
it('seats a raised far-LOD base rather than clipping only the near origin',()=>{
 const v=variant(.6),positions=v.lods.map(l=>Array.from(l.wood!.getAttribute('position').array));
 try{const y=groundedTreeFlareY({heightAt:()=>0},tree,v,-TREE_SOIL_OVERLAP);v.lods[2].wood!.computeBoundingBox();
  expect(y+v.lods[2].wood!.boundingBox!.min.y).toBeLessThanOrEqual(-TREE_SOIL_OVERLAP);
  expect(v.lods.map(l=>Array.from(l.wood!.getAttribute('position').array))).toEqual(positions);
 }finally{dispose(v);}
});
it('preserves zero-based LOD seating and the existing maximum-sink cap',()=>{
 const flat=variant(0),extreme=variant(10);
 try{expect(groundedTreeFlareY({heightAt:()=>0},tree,flat,-TREE_SOIL_OVERLAP)).toBeCloseTo(-.35-TREE_SOIL_OVERLAP,7);
  expect(groundedTreeFlareY({heightAt:()=>0},tree,extreme,-TREE_SOIL_OVERLAP)).toBe(-TREE_SOIL_OVERLAP-TREE_FLARE_MAX_SINK);
 }finally{dispose(flat);dispose(extreme);}
});
