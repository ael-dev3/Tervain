import * as THREE from 'three';
import { expect, it } from 'vitest';
import { snapDetachedClumps } from '../../src/presentation/canopy';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';

it('does not use a detached clump radius as proof of contact with wood', () => {
  // A long clump runs parallel to a branch. Its bounding sphere intersects
  // the branch even though every point of its leaf surface is 2.2 m above it.
  const wood = new THREE.BufferGeometry();
  wood.setAttribute('position', new THREE.Float32BufferAttribute([-4,0,-2, 4,0,-2, 4,0,2, -4,0,2],3));
  wood.setIndex([0,1,2,0,2,3]);
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute([-3,2.2,-.2, 3,2.2,-.2, 3,2.2,.2, -3,2.2,.2],3));
  leaves.setAttribute('normal',new THREE.Float32BufferAttribute([0,1,0,0,1,0,0,1,0,0,1,0],3));
  leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  leaves.setIndex([0,1,2,0,2,3]);
  const audit = (leaf: THREE.BufferGeometry) => auditCanopies([{label:'parallel clump',wood,leaves:leaf,matrix:new THREE.Matrix4()}],{gap:.75,woodReach:1.5}).trees[0]!;
  const original = Array.from(leaves.getAttribute('position').array);
  expect(audit(leaves).detachedClumps).toBe(1);
  const unchanged = snapDetachedClumps(leaves,wood,1.5);
  expect(unchanged.moved).toBe(0); unchanged.geometry.dispose();
  const result = snapDetachedClumps(leaves,wood,1.5,.75,.9,.75);
  expect(result.moved).toBe(1);
  expect(audit(result.geometry).detachedClumps).toBe(0);
  expect(Array.from(leaves.getAttribute('position').array)).toEqual(original);
  expect(Array.from(result.geometry.index!.array)).toEqual(Array.from(leaves.index!.array));
  for(const name of ['normal','uv']) expect(Array.from(result.geometry.getAttribute(name).array)).toEqual(Array.from(leaves.getAttribute(name).array));
  const before = leaves.getAttribute('position'), after = result.geometry.getAttribute('position');
  const shift = new THREE.Vector3().fromBufferAttribute(after,0).sub(new THREE.Vector3().fromBufferAttribute(before,0));
  for(let i=0;i<before.count;i++){expect(Object.is(before.getX(i),after.getX(i))).toBe(true);expect(Object.is(before.getZ(i),after.getZ(i))).toBe(true);}
  for(let i=1;i<before.count;i++) expect(new THREE.Vector3().fromBufferAttribute(after,i).sub(new THREE.Vector3().fromBufferAttribute(before,i)).distanceTo(shift)).toBeLessThan(1e-6);
  result.geometry.dispose(); leaves.dispose(); wood.dispose();
});

it('keeps a clump in place when a vertical move would worsen one member’s wood gap', () => {
  const positions:number[]=[],indices:number[]=[];
  const patch=(y:number,x:number,z:number)=>{const b=positions.length/3;positions.push(-x,y,-z,x,y,-z,x,y,z,-x,y,z);indices.push(b,b+1,b+2,b,b+2,b+3);};
  patch(0,5,2);patch(6,5,2);
  const wood=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setIndex(indices);
  positions.length=0;indices.length=0;
  // Closely spaced cards span two branches; a centroid move down helps most cards but hurts the top one.
  for(const y of [...new Array<number>(10).fill(1.6),2.1,2.6,3.1,3.6,4.1,4.4])patch(y,3,.2);
  const leaves=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions,3)).setIndex(indices);
  const result=snapDetachedClumps(leaves,wood,1.5,.75,.9,.75);
  expect(result.moved).toBe(0);
  expect(Array.from(result.geometry.getAttribute('position').array)).toEqual(Array.from(leaves.getAttribute('position').array));
  result.geometry.dispose();leaves.dispose();wood.dispose();
});
