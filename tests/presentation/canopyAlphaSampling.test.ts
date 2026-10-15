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
it('rejects an opaque needle between the coarse grid samples',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 try{expect(()=>auditCanopies([t],{alpha:true})).toThrow('Canopy alpha sampling missed opaque foliage');}
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

it('does not reject a zero-area triangle on UV evidence alone',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 const p=t.leaves.getAttribute('position');for(let i=0;i<p.count;i++)p.setXYZ(i,10,5,0);
 try{const r=auditCanopies([t],{alpha:true});expect(r.complete).toBe(true);expect(r.summary.components).toBe(0);}
 finally{t.wood.dispose();t.leaves.dispose();}
});

it('does not let a collapsed first card hide a real card sharing its UV pattern',()=>{
 const t=fixture((u,v)=>Math.hypot(u-1/48,v-1/48)<.003?1:0);
 t.leaves.setAttribute('position',new THREE.Float32BufferAttribute([0,0,0,0,0,0,0,0,0,10,5,0,11,5,0,10,5,1],3));
 t.leaves.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,0,1,0,0,1,0,0,1],2));
 try{expect(()=>auditCanopies([t],{alpha:true})).toThrow('Canopy alpha sampling missed opaque foliage');}
 finally{t.wood.dispose();t.leaves.dispose();}
});
