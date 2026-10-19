import * as THREE from 'three';
import { expect, it } from 'vitest';
import { snapDetachedClumps } from '../../src/presentation/canopy';
import { auditCanopies } from '../../src/diagnostics/canopyAudit';

it('does not use a detached clump radius as proof of contact with wood', () => {
  // A long clump runs parallel to a branch. Its bounding sphere intersects
  // the branch even though every point of its leaf surface is 2.2 m away.
  const wood = new THREE.BufferGeometry();
  wood.setAttribute('position', new THREE.Float32BufferAttribute([0,-4,-2, 0,4,-2, 0,4,2, 0,-4,2],3));
  wood.setIndex([0,1,2,0,2,3]);
  const leaves = new THREE.BufferGeometry();
  leaves.setAttribute('position', new THREE.Float32BufferAttribute([2.2,-3,-.2, 2.2,3,-.2, 2.2,3,.2, 2.2,-3,.2],3));
  leaves.setAttribute('normal',new THREE.Float32BufferAttribute([1,0,0,1,0,0,1,0,0,1,0,0],3));
  leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));
  leaves.setIndex([0,1,2,0,2,3]);
  const audit = (leaf: THREE.BufferGeometry) => auditCanopies([{label:'parallel clump',wood,leaves:leaf,matrix:new THREE.Matrix4()}],{gap:.75,woodReach:1.5}).trees[0]!;
  const original = Array.from(leaves.getAttribute('position').array);
  expect(audit(leaves).detachedClumps).toBe(1);
  const unchanged = snapDetachedClumps(leaves,wood,1.5);
  expect(unchanged.moved).toBe(0); unchanged.geometry.dispose();
  const result = snapDetachedClumps(leaves,wood,1.5,.75,.9,1.5);
  expect(result.moved).toBe(1);
  expect(audit(result.geometry).detachedClumps).toBe(0);
  expect(Array.from(leaves.getAttribute('position').array)).toEqual(original);
  expect(Array.from(result.geometry.index!.array)).toEqual(Array.from(leaves.index!.array));
  for(const name of ['normal','uv']) expect(Array.from(result.geometry.getAttribute(name).array)).toEqual(Array.from(leaves.getAttribute(name).array));
  const before = leaves.getAttribute('position'), after = result.geometry.getAttribute('position');
  const shift = new THREE.Vector3().fromBufferAttribute(after,0).sub(new THREE.Vector3().fromBufferAttribute(before,0));
  for(let i=1;i<before.count;i++) expect(new THREE.Vector3().fromBufferAttribute(after,i).sub(new THREE.Vector3().fromBufferAttribute(before,i)).distanceTo(shift)).toBeLessThan(1e-6);
  result.geometry.dispose(); leaves.dispose(); wood.dispose();
});
