import * as THREE from 'three';
import { expect, it } from 'vitest';
import { leafBoundsShrink, copyLeafBatchBounds } from '../../src/presentation/foliage/leafBounds';

it('encloses every leaf LOD plus the existing wind guard after mixed instance scales and rotations', () => {
  const sources=[new THREE.BoxGeometry(4,3,4).translate(0,8,0),new THREE.BoxGeometry(8,2,5).translate(2,9,0),new THREE.BoxGeometry(2,4,2).translate(0,10,0)];
  const whole=new THREE.Sphere(new THREE.Vector3(0,6,0),12),original=sources.map(g=>g.getAttribute('position').array.slice());
  const local=leafBoundsShrink(sources.map(leaf=>({leaf})),whole),packed=new THREE.Sphere().makeEmpty(),matrices: THREE.Matrix4[]=[];
  for(const [i,s]of [.6,1,3].entries()){
    const m=new THREE.Matrix4().compose(new THREE.Vector3(i*7,2,-i*5),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),i*.7),new THREE.Vector3(s,s,s));matrices.push(m);
    const sphere=whole.clone().applyMatrix4(m);sphere.radius+=2;packed.union(sphere);
  }
  const crown=copyLeafBatchBounds(new THREE.Sphere(),packed,local*.6);
  expect(crown.center.equals(packed.center)).toBe(true);expect(crown.radius).toBeLessThan(packed.radius);
  for(const m of matrices)for(const [i,g]of sources.entries()){
    const p=g.getAttribute('position');for(let j=0;j<p.count;j++){
      const vertex=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(m);
      expect(vertex.distanceTo(crown.center)+2).toBeLessThanOrEqual(crown.radius+1e-10);
    }
    expect(p.array).toEqual(original[i]);
  }
  for(const g of sources)g.dispose();
});

it('retains a wider middle reflection LOD and never expands the previous bound',()=>{
  const near=new THREE.BoxGeometry(1,1,1),mid=new THREE.BoxGeometry(15,1,1),whole=new THREE.Sphere(new THREE.Vector3(),10);
  expect(leafBoundsShrink([{leaf:near},{leaf:mid}],whole)).toBeLessThan(leafBoundsShrink([{leaf:near}],whole));
  const candidate=copyLeafBatchBounds(new THREE.Sphere(),whole,leafBoundsShrink([{leaf:near},{leaf:mid}],whole));
  expect(candidate.center.equals(whole.center)).toBe(true);expect(candidate.radius).toBeLessThanOrEqual(whole.radius);
  near.dispose();mid.dispose();
});

it('keeps empty batches empty and falls back for leafless or outlying sources',()=>{
  const target=new THREE.Sphere(),empty=new THREE.Sphere().makeEmpty();
  expect(copyLeafBatchBounds(target,empty,3).isEmpty()).toBe(true);
  const whole=new THREE.Sphere(new THREE.Vector3(),1),outside=new THREE.BoxGeometry(2,2,2).translate(20,0,0);
  expect(leafBoundsShrink([{leaf:null}],whole)).toBe(0);expect(leafBoundsShrink([{leaf:outside}],whole)).toBe(0);
  expect(copyLeafBatchBounds(target,whole,0).equals(whole)).toBe(true);outside.dispose();
});
