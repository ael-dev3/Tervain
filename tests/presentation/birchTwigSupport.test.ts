import {expect,it} from 'vitest';
import * as THREE from 'three';
import {growTwigs,twigTriangles,woodAnchor,type CanopyTwig} from '../../src/presentation/canopy';

it('fills the planned tip inset without adding triangles or moving the source wood and plan',()=>{
 const wood=new THREE.BoxGeometry(.1,.1,.1),plans:CanopyTwig[]=[{from:new THREE.Vector3(0,.05,0),to:new THREE.Vector3(0,2,0)}];
 const point=new THREE.Vector3(0,3.56,0),hit=new THREE.Vector3(),before=growTwigs(wood,plans);
 // The clump centre is 0.45 * 0.95 beyond its shortened support plan.
 const supported=Reflect.apply(growTwigs,null,[wood,plans,.45*.95]) as THREE.BufferGeometry;
 expect(woodAnchor(before)(point,hit)).toBeGreaterThan(1.5);
 expect(woodAnchor(supported)(point,hit)).toBeLessThanOrEqual(1.5);
 expect(supported.index!.count).toBe(before.index!.count);
 expect(supported.getAttribute('position').count).toBe(before.getAttribute('position').count);
 const p=wood.getAttribute('position'),q=supported.getAttribute('position');
 for(let i=0;i<p.count;i++)for(let c=0;c<3;c++)expect(q.getComponent(i,c)).toBe(p.getComponent(i,c));
 expect(plans[0]!.to.toArray()).toEqual([0,2,0]);
 expect((supported.index!.count-wood.index!.count)/3).toBe(twigTriangles(plans));
});

it('retains the planned ring topology on both sides of the bend threshold',()=>{
 const wood=new THREE.BoxGeometry(.1,.1,.1);
 for(const length of [0,.0001,1,2.2,2.49999,2.5,2.50001,3]){
  const plans=[{from:new THREE.Vector3(0,0,0),to:new THREE.Vector3(0,length,0)}];
  const before=growTwigs(wood,plans),after=Reflect.apply(growTwigs,null,[wood,plans,.4275]) as THREE.BufferGeometry;
  expect(after.index!.count).toBe(before.index!.count);
  expect(after.getAttribute('position').count).toBe(before.getAttribute('position').count);
 }
});
