import * as THREE from 'three';
import { expect, it } from 'vitest';
import { anchorFarFoliage, seatFarCards, snapDetachedClumps } from '../../src/presentation/canopy';
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

it('grows a leader and twigs out to sheets past the reach, leaving every leaf where it was', () => {
  // A trunk up to y 4 and a sheet hanging at y 8, beside the axis: nothing inside it but air.
  const wood = new THREE.BufferGeometry();
  const ring = (y: number, r: number) => [0, 1, 2, 3].flatMap(k => [Math.cos(k * Math.PI / 2) * r, y, Math.sin(k * Math.PI / 2) * r]);
  wood.setAttribute('position', new THREE.Float32BufferAttribute([...ring(0, .3), ...ring(4, .2)], 3));
  wood.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(24).fill(0).map((_, i) => i % 3 === 1 ? 0 : .7), 3));
  wood.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(16).fill(.5), 2));
  wood.setIndex([0,1,5,0,5,4, 1,2,6,1,6,5, 2,3,7,2,7,6, 3,0,4,3,4,7]);
  const leaves = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([1,8,-1, 3,8,-1, 3,8,1, 1,8,1], 3)).setIndex([0,1,2,0,2,3]);
  const before = Array.from(leaves.getAttribute('position').array);
  const audit = (w: THREE.BufferGeometry) => auditCanopies([{label:'sheet',wood:w,leaves,matrix:new THREE.Matrix4()}],{gap:.75,woodReach:1.5}).trees[0]!;
  expect(audit(wood).detachedClumps).toBe(1);
  const result = anchorFarFoliage(leaves, wood, 1.5, true);
  expect(result.twigs).toBeGreaterThan(0);
  expect(audit(result.geometry).detachedClumps).toBe(0);
  expect(Array.from(leaves.getAttribute('position').array)).toEqual(before);
  // The grown wood keeps the original as its prefix; colliders stop at the original index.
  expect(result.geometry.userData.twigIndex).toBe(wood.index!.count);
  expect(Array.from(result.geometry.index!.array).slice(0, wood.index!.count)).toEqual(Array.from(wood.index!.array));
  expect(anchorFarFoliage(leaves, result.geometry, 1.5).twigs).toBe(0);
  // In place: the same wood object gains the twigs, keeps its original prefix and its collider boundary.
  const held = wood.clone(), heldIndex = held.index!.count;
  const placed = anchorFarFoliage(leaves, held, 1.5, true, 0.9, true);
  expect(placed.geometry).toBe(held);
  expect(placed.twigs).toBe(result.twigs);
  expect(audit(held).detachedClumps).toBe(0);
  expect(held.userData.twigIndex).toBe(heldIndex);
  expect(held.userData.anchoredTwigs).toBe(result.twigs);
  held.dispose(); result.geometry.dispose(); leaves.dispose(); wood.dispose();
});
