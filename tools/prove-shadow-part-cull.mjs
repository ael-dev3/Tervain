import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const [out,url='https://ael-dev3.github.io/Tervain/',expected='30d1f0d']=process.argv.slice(2);
if(!out)throw Error('Usage: node tools/prove-shadow-part-cull.mjs OUTPUT [URL] [REVISION]');
fs.mkdirSync(out,{recursive:true});
const page=await liveProofPage(url,{hour:15,w:492,h:320});
try {
 const setup=await page.eval(`globalThis.__restoreShadowPartRaster?.();globalThis.__restoreOrchardRaster?.();if(globalThis.__tervainCpuNoRaster)throw Error('Native raster required');const T=window.tervain;T.frame=()=>{};T.present=()=>{};T.perf?.end(0);T.perf=null;T.lastFrameDt=0;T.settings.reducedMotion=true;const W=T.world,R=T.renderer,cam=T.cam.camera,stamp=await T.auditPlacement({kind:'root',maxChecks:1});if(stamp.revision!==${JSON.stringify(expected)})throw Error('Revision drift');let sun;W.scene.traverse(o=>{if(o.isDirectionalLight&&o.castShadow)sun=o;});if(!sun)throw Error('No sun');window.SP={T,W,R,cam,sun,active:false,parts:[],removed:[]};const old=sun.shadow.updateMatrices;sun.shadow.updateMatrices=function(...args){const r=old.apply(this,args);if(SP.active){const f=this.getFrustum();SP.removed=[];for(const {mesh,count,matrices,coverage,spheres}of SP.parts){let n=0;for(let i=0;i<count;i++){const s=spheres[i];if(f.planes.some(p=>p.normal.x*s[0]+p.normal.y*s[1]+p.normal.z*s[2]+p.constant < -s[3]-3))continue;mesh.instanceMatrix.array.set(matrices.subarray(i*16,i*16+16),n*16);mesh.geometry.getAttribute('aDistanceCoverage').array.set(coverage.subarray(i*2,i*2+2),n*2);n++;}mesh.count=n;mesh.instanceMatrix.clearUpdateRanges();mesh.instanceMatrix.needsUpdate=true;const c=mesh.geometry.getAttribute('aDistanceCoverage');c.clearUpdateRanges();c.needsUpdate=true;SP.removed.push({name:mesh.name,instances:count-n,triangles:(count-n)*mesh.geometry.index.count/3});}}return r;};return {revision:stamp.revision,version:stamp.version,buffer:[R.domElement.width,R.domElement.height],samples:T.grade.target.samples};`);
 const comparisons=[];
 const views=[[0,0],[10,0],[20,0],[40,0],[80,0],[0,-.6],[0,.6]];
 for(let i=0;i<views.length;i++){
  const [m,angle]=views[i];
  await page.eval(`const {T,W,cam}=SP;SP.active=false;for(const p of SP.parts){p.mesh.count=p.count;p.mesh.instanceMatrix.array.set(p.matrices);p.mesh.instanceMatrix.needsUpdate=true;p.mesh.geometry.getAttribute('aDistanceCoverage').array.set(p.coverage);p.mesh.geometry.getAttribute('aDistanceCoverage').needsUpdate=true;}const x=-55-${m},z=70,y=W.terrain.heightAt(x,z);T.player.group.position.set(x,y,z);cam.position.set(x+3,Math.max(y+2.2,W.terrain.heightAt(x+3,z)+1.5),z);cam.lookAt(x-20,y+1.2,z);cam.rotateY(${angle});cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,15,cam,false);SP.parts=[];W.scene.traverse(mesh=>{if(!mesh.isInstancedMesh||!mesh.name.endsWith(':shadow')||!mesh.count)return;const g=mesh.geometry;g.computeBoundingSphere();const s=g.boundingSphere.clone(),matrix=mesh.matrixWorld.clone(),spheres=[];for(let j=0;j<mesh.count;j++){mesh.getMatrixAt(j,matrix);matrix.premultiply(mesh.matrixWorld);s.copy(g.boundingSphere).applyMatrix4(matrix);spheres.push([s.center.x,s.center.y,s.center.z,s.radius]);}SP.parts.push({mesh,count:mesh.count,matrices:mesh.instanceMatrix.array.slice(),coverage:g.getAttribute('aDistanceCoverage').array.slice(),spheres});});return null;`);
  const costs={};
  for(const mode of ['before','after']){
   const r=await page.eval(`SP.active=${mode==='after'};const {T,R}=SP;R.info.autoReset=false;R.info.reset();T.renderWorld();R.info.reset();T.renderWorld();if(R.getContext().getError())throw Error('GL error');return {cost:{...R.info.render},removed:SP.removed,png:R.domElement.toDataURL()};`);
   fs.writeFileSync(`${out}/${i}-${mode}.png`,Buffer.from(r.png.split(',')[1],'base64'));delete r.png;costs[mode]=r;
  }
  const [a,b]=await Promise.all(['before','after'].map(mode=>sharp(`${out}/${i}-${mode}.png`).raw().toBuffer()));
  assert.equal(a.length,b.length);let changed=0;for(let j=0;j<a.length;j++)changed+=a[j]!==b[j];
  assert.equal(changed,0,`View ${i} pixels differ`);assert.ok(costs.after.cost.calls<=costs.before.cost.calls);assert.ok(costs.after.cost.triangles<=costs.before.cost.triangles);
  comparisons.push({metres:m,angle,changedChannels:changed,...costs});console.log(JSON.stringify(comparisons.at(-1)));
 }
 const errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(errors,[]);
 const report={...setup,comparisons,errors,pass:true,scope:'Controlled native live-render adapter: independent shadow part packing with a 2 m wind + 1 m sun-drift guard, original colour geometry/materials and source order. Seven adjacent frozen before/after pairs; production wiring separately tested. Loading raster suppression is restored before every recorded native render. Software cost counts, not hardware frame pacing.'};
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}finally{page.close();}
