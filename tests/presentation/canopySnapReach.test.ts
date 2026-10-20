import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { seatFarCards, snapDetachedClumps } from '../../src/presentation/canopy';
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

it('seats each card past the reach just inside it, toward its nearest wood, where a chained shell defeats the clump snap', () => {
  // A wood plate and a shell of touching cards 2 m over it: one chained clump whose centre lies inside its own radius.
  const wood = new THREE.BufferGeometry();
  wood.setAttribute('position', new THREE.Float32BufferAttribute([-4,0,-2, 4,0,-2, 4,0,2, -4,0,2],3));
  wood.setIndex([0,1,2,0,2,3]);
  const positions: number[] = [], indices: number[] = [];
  const card = (x: number, y: number) => { const b = positions.length / 3; positions.push(x-.3,y,-.3, x+.3,y,-.3, x+.3,y,.3, x-.3,y,.3); indices.push(b,b+1,b+2,b,b+2,b+3); };
  for (let x = -3; x <= 3; x += .5) card(x, 2);
  card(0, 1);
  const leaves = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(positions,3)).setIndex(indices);
  const n = positions.length / 3;
  leaves.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from({length: n * 2}, (_, i) => i / (n * 2)), 2));
  leaves.setAttribute('_wind', new THREE.Float32BufferAttribute(Array.from({length: n * 4}, (_, i) => i % 7), 4));
  const audit = (leaf: THREE.BufferGeometry) => auditCanopies([{label:'shell',wood,leaves:leaf,matrix:new THREE.Matrix4()}],{gap:.75,woodReach:1.5}).trees[0]!;
  const original = Array.from(leaves.getAttribute('position').array);
  expect(audit(leaves).detachedClumps).toBe(1);
  const snapped = snapDetachedClumps(leaves, wood, 1.5);
  expect(snapped.moved).toBe(0); snapped.geometry.dispose();
  const result = seatFarCards(leaves, wood, 1.5);
  expect(result.moved).toBe(13);
  expect(audit(result.geometry).detachedClumps).toBe(0);
  expect(Array.from(leaves.getAttribute('position').array)).toEqual(original);
  expect(Array.from(result.geometry.index!.array)).toEqual(indices);
  for (const name of ['uv', '_wind']) expect(Array.from(result.geometry.getAttribute(name).array)).toEqual(Array.from(leaves.getAttribute(name).array));
  const before = leaves.getAttribute('position'), after = result.geometry.getAttribute('position');
  for (let i = 0; i < n; i++) {
    expect(after.getX(i)).toBe(before.getX(i)); expect(after.getZ(i)).toBe(before.getZ(i));
    // The shell drops straight down to just inside the reach; the card already within reach stays put.
    expect(after.getY(i)).toBeCloseTo(before.getY(i) === 2 ? 1.5 * 0.97 : before.getY(i), 6);
  }
  expect(seatFarCards(result.geometry, wood, 1.5).moved).toBe(0);
  result.geometry.dispose(); leaves.dispose(); wood.dispose();
});

it('stops searching a retained card once its first sample reaches wood', () => {
  const wood = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([-10,-10,0, 10,-10,0, 0,10,0], 3)).setIndex([0,1,2]);
  const leaves = new THREE.PlaneGeometry(.2,.2).translate(0,0,.1);
  const positions = Array.from(leaves.getAttribute('position').array);
  const closest = vi.spyOn(THREE.Triangle.prototype, 'closestPointToPoint');
  try {
    const result = seatFarCards(leaves, wood, 1.5);
    expect(result).toEqual({geometry:leaves,moved:0});
    expect(Array.from(leaves.getAttribute('position').array)).toEqual(positions);
    // Component construction also projects the leaf centre. Count only searches against the wood triangle.
    const woodSearches = closest.mock.contexts.filter(triangle => triangle.a.z === 0 && triangle.b.z === 0 && triangle.c.z === 0);
    expect(woodSearches).toHaveLength(1);
  } finally { closest.mockRestore(); leaves.dispose(); wood.dispose(); }
});
