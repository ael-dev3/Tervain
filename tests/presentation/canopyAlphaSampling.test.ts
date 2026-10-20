import * as THREE from 'three';
import {expect,it} from 'vitest';
import {auditCanopies} from '../../src/diagnostics/canopyAudit';
function fixture(alpha:(u:number,v:number)=>number){
 const leaves=new THREE.BufferGeometry();
 leaves.setAttribute('position',new THREE.Float32BufferAttribute([10,5,0,11,5,0,10,5,1],3));
 leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1],2));
 const wood=new THREE.BoxGeometry(1,2,1);
 return {label:'thin-needle',wood,leaves,matrix:new THREE.Matrix4(),cutout:{uv:'uv',cutoff:.5,alpha}};
}
it('includes an opaque needle between the coarse grid samples',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 try{const r=auditCanopies([t],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(1);expect(r.summary.detachedCards).toBe(1);}
 finally{t.wood.dispose();t.leaves.dispose();}
});
it('preserves transparent, opaque and geometry-only controls',()=>{
 for(const [alpha,enabled,components]of [[()=>0,true,0],[()=>1,true,1],[()=>0,false,1]] as const){
  const t=fixture(alpha);
  try{const r=auditCanopies([t],{alpha:enabled});expect(r.complete).toBe(true);expect(r.summary.components).toBe(components);}
  finally{t.wood.dispose();t.leaves.dispose();}
 }
});
it('charges the witness search and stops at its operation limit',()=>{
 let calls=0;const t=fixture(()=>{calls++;return 0;});
 try{expect(()=>auditCanopies([t],{alpha:true,maxOperations:32})).toThrow('Canopy audit budget exhausted');expect(calls).toBeLessThanOrEqual(28+32);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('does not count a zero-area triangle on UV evidence alone',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 const p=t.leaves.getAttribute('position');for(let i=0;i<p.count;i++)p.setXYZ(i,10,5,0);
 try{const r=auditCanopies([t],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(0);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('does not let a collapsed first card hide a real card sharing its UV pattern',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 t.leaves.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0,10,5,0,11,5,0,10,5,1],3));
 t.leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],2));
 try{const r=auditCanopies([t],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(1);expect(r.summary.detachedCards).toBe(1);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('keeps supported fine-grid foliage attached instead of inventing a detached card',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 t.wood.translate(10,5,0);
 try{const r=auditCanopies([t],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(1);expect(r.summary.detachedCards).toBe(0);expect(r.summary.detachedClumps).toBe(0);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('caches fine witnesses for repeated UV triangles and charges the full search',()=>{
 let calls=0;const t=fixture((u,v)=>{calls++;return Math.hypot(u-1/48,v-1/48)<.003?1:0;});
 t.leaves.setAttribute('position',new THREE.Float32BufferAttribute([10,5,0,11,5,0,10,5,1,20,5,0,21,5,0,20,5,1],3));
 t.leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],2));
 try{const r=auditCanopies([t],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(2);expect(r.summary.detachedCards).toBe(2);expect(calls).toBe(28+1225);expect(r.operations).toBeGreaterThanOrEqual(1225);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('retains finer opaque witnesses when the native mask reports possible coverage',()=>{
 let calls=0;const t=fixture((u,v)=>{calls++;return Math.hypot(u-1/192,v-1/192)<.001?1:0;});
 const target={...t,cutout:{...t.cutout,mayHaveOpaque:()=>true}};
 t.leaves.setAttribute('position',new THREE.Float32BufferAttribute([10,5,0,11,5,0,10,5,1,20,5,0,21,5,0,20,5,1],3));
 t.leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],2));
 try{const r=auditCanopies([target],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(2);expect(r.summary.detachedCards).toBe(2);expect(calls).toBe(28+1225+18721);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('charges supplemental witnesses and stops at the operation limit',()=>{
 let calls=0;const t=fixture((u,v)=>{calls++;return Math.hypot(u-1/192,v-1/192)<.001?1:0;});
 const target={...t,cutout:{...t.cutout,mayHaveOpaque:()=>true}};
 try{expect(()=>auditCanopies([target],{alpha:true,maxOperations:2000})).toThrow('Canopy audit budget exhausted');expect(calls).toBeLessThanOrEqual(28+2000);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('retains the bounded clear-pattern path when the mask proves no coverage',()=>{
 let calls=0;const t=fixture(()=>{calls++;return 0;});
 const target={...t,cutout:{...t.cutout,mayHaveOpaque:()=>false}};
 try{const r=auditCanopies([target],{alpha:true,maxOperations:2000});expect(r.summary.components).toBe(0);expect(calls).toBe(28+1225);}
 finally{t.wood.dispose();t.leaves.dispose();}
});
