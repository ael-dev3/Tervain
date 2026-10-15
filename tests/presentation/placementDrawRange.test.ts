import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {expect,it} from 'vitest';
import {auditPlacements} from '../../src/diagnostics/placementAudit';

function geometry(kind:'prop'|'root',prefix:boolean,indexed:boolean){
  const visible=kind==='root'?new THREE.CylinderGeometry(.5,.5,2,16).translate(0,1.3,0):new THREE.BoxGeometry(1,1,1).translate(0,.5,0);
  const hidden=kind==='root'?new THREE.PlaneGeometry(8,8).rotateX(-Math.PI/2):new THREE.BoxGeometry(1,1,1).translate(3,3,0);
  const count=visible.index!.count,start=prefix?hidden.index!.count:0;
  let result=mergeGeometries(prefix?[hidden,visible]:[visible,hidden])!;
  if(!indexed)result=result.toNonIndexed();result.setDrawRange(start,count);return result;
}
function audit(g:THREE.BufferGeometry,kind:'root'|'prop'){
  if(kind==='root')return auditPlacements(new THREE.Scene(),()=>0,[{label:'root',kind,geometry:g,matrix:new THREE.Matrix4()}],{kind});
  const scene=new THREE.Scene(),material=new THREE.MeshBasicMaterial();scene.add(new THREE.Mesh(g,material));try{return auditPlacements(scene,()=>0);}finally{material.dispose();}
}
for(const indexed of [true,false])for(const prefix of [true,false]){
  it(`excludes hidden prop triangles (${indexed?'indexed':'vertices'}, ${prefix?'prefix':'tail'})`,()=>{
    const g=geometry('prop',prefix,indexed);try{const r=audit(g,'prop');expect(r.complete).toBe(true);expect(r.summary.checks).toBe(1);expect(r.summary.candidates).toBe(0);}finally{g.dispose();}
  });
  it(`does not let a hidden basal plane clear a floating root (${indexed?'indexed':'vertices'}, ${prefix?'prefix':'tail'})`,()=>{
    const g=geometry('root',prefix,indexed);try{const r=audit(g,'root');expect(r.complete).toBe(true);expect(r.summary.candidates).toBe(1);expect(r.checks[0]!.minGap).toBeCloseTo(.3,5);}finally{g.dispose();}
  });
}
it('keeps complete-range components and ignores an incomplete triangle at the cutoff',()=>{
  const g=geometry('prop',false,true);try{
    g.setDrawRange(0,Infinity);expect(audit(g,'prop').summary).toMatchObject({checks:2,candidates:1});
    g.setDrawRange(0,38);expect(audit(g,'prop').summary).toMatchObject({checks:1,candidates:0});
  }finally{g.dispose();}
});
it('does not claim a root footprint when no triangles are drawn',()=>{
  const g=geometry('root',false,true);g.setDrawRange(0,0);try{const r=audit(g,'root');expect(r.complete).toBe(false);expect(r.invalid).toBe(1);expect(r.summary.checks).toBe(0);}finally{g.dispose();}
});
for(const kind of ['prop','root'] as const)it(`handles a nonaligned triangle start and original face identity for ${kind}`,()=>{
  const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([-100,-100,-100,-.5,.3,-.5,.5,.3,-.5,0,.3,.5,100,-100,100],3));g.setIndex([0,1,2,3,4]);g.setDrawRange(1,3);
  try{const r=audit(g,kind);expect(r.complete).toBe(true);expect(r.summary.checks).toBe(1);expect(r.summary.candidates).toBe(1);expect(r.checks[0]!.minGap).toBeCloseTo(.3,5);}finally{g.dispose();}
});
it.each([[-1,3],[0,NaN],[0,-1]])('rejects invalid draw windows (%s, %s)',(start,count)=>{
  const g=geometry('root',false,true);g.setDrawRange(start!,count!);try{expect(()=>audit(g,'root')).toThrow('Invalid placement draw range');}finally{g.dispose();}
});
it('does not weld drawn vertices to a hidden representative across the clearance threshold',()=>{
  const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute([-.5,.07996,-.5,.5,.07996,-.5,0,.07996,.5,-.5,.08004,-.5,.5,.08004,-.5,0,.08004,.5],3));g.setIndex([0,1,2,3,4,5]);g.setDrawRange(3,3);
  try{const r=audit(g,'prop');expect(r.complete).toBe(true);expect(r.summary.candidates).toBe(1);expect(r.checks[0]!.minGap).toBeGreaterThan(.08);}finally{g.dispose();}
});
