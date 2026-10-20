import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
import { spanningLeafEdges, union, type Component } from '../../src/diagnostics/canopyConnectivity';

const parts = (n: number): Component[] => Array.from({length:n},(_,i)=>({box:new THREE.Box3(new THREE.Vector3(i*1.1, (i%3)*.07,0),new THREE.Vector3(i*1.1+.2,(i%3)*.07+.2,.2)),samples:[]}));
it('bounds the canopy edge-search distance work without dropping the chain connections',()=>{
  const leaves=parts(64),spy=vi.spyOn(Math,'hypot');let calls=0,charges=0,edges:[number,number,number][];
  try { edges=spanningLeafEdges(leaves,1,()=>charges++);calls=spy.mock.calls.length; } finally {spy.mockRestore();}
  expect(edges!).toHaveLength(63);
  const graph=union(64);for(const[a,b]of edges!)graph.join(a,b);
  expect(new Set(leaves.map((_,i)=>graph.find(i))).size).toBe(1);
  expect(charges).toBe(2442); // Same operation-budget accounting as the original search.
  expect(calls).toBeLessThan(2600); // Original repeats child bounds: 3,356 calls.
});
it.each([0,.5,.9,1,2.5])('matches exhaustive connectivity at gap %s, including overlaps and exact cutoffs',(limit)=>{
  const leaves=parts(40);leaves[1]!.box.copy(leaves[0]!.box);
  const expected=union(leaves.length),actual=union(leaves.length);
  for(let i=0;i<leaves.length;i++)for(let j=0;j<i;j++){
    const a=leaves[i]!.box,b=leaves[j]!.box;
    const d=Math.sqrt(['x','y','z'].reduce((sum,axis)=>{const k=axis as 'x'|'y'|'z';return sum+Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])**2;},0));
    if(d<=limit)expected.join(i,j);
  }
  for(const[a,b]of spanningLeafEdges(leaves,limit,()=>{}))actual.join(a,b);
  for(let i=0;i<leaves.length;i++)for(let j=0;j<i;j++)expect(actual.find(i)===actual.find(j)).toBe(expected.find(i)===expected.find(j));
});
