#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createServer,transformWithOxc} from 'vite';
const out=path.resolve(process.argv[2]??'artifacts/resident-root-quaternions.json'),ref=process.argv[3]??'421d34b';
const old=execFileSync('git',['show',`${ref}:src/presentation/npc/residentMotion.ts`],{encoding:'utf8'});
const instrument=source=>source.replace('parent ? ws.get(parent)! : new THREE.Quaternion()', 'parent ? ws.get(parent)! : (globalThis.__rootProof.identity++, new THREE.Quaternion())').replace('identity = new THREE.Quaternion()', 'identity = (globalThis.__rootProof.identity++, new THREE.Quaternion())').replace(': target.clone()', ': (globalThis.__rootProof.clone++, target.clone())');
const current=fs.readFileSync('src/presentation/npc/residentMotion.ts','utf8');
const transform=async source=>(await transformWithOxc(instrument(source),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/npc',p)}'`);
const baseline=await transform(old),updated=await transform(current);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-retarget',resolveId(id){if(id==='/@baseline-retarget'||id==='/@candidate-retarget')return '\0'+id.slice(2)},load(id){if(id==='\0baseline-retarget')return baseline;if(id==='\0candidate-retarget')return updated}}],server:{middlewareMode:true,hmr:false,ws:false}});
const hash=result=>{const h=createHash('sha256');h.update(JSON.stringify({cycleMetres:result.cycleMetres,hipsDrop:result.hipsDrop,hipsAt:result.hipsAt,duration:result.clip.duration}));for(const t of result.clip.tracks){h.update(t.name);h.update(new Uint8Array(t.times.buffer,t.times.byteOffset,t.times.byteLength));h.update(new Uint8Array(t.values.buffer,t.values.byteOffset,t.values.byteLength));}return h.digest('hex')};
try {
const {loadResident,loadResidentMotion,loadResidentRigData,residentMesh}=await server.ssrLoadModule('/tests/presentation/residentFixtures.ts');
const {installResidentRig,residentRestPose}=await server.ssrLoadModule('/src/presentation/npc/residentRig.ts');
const candidate=await server.ssrLoadModule('/@candidate-retarget'),prior=await server.ssrLoadModule('/@baseline-retarget');
const {clone}=await server.ssrLoadModule('three/examples/jsm/utils/SkeletonUtils.js');
const {source}=await loadResident('ash-recorder'),data=await loadResidentRigData('ash-recorder'),scene=clone(source.scene),mesh=residentMesh(scene);mesh.geometry=mesh.geometry.clone();const rest=residentRestPose(installResidentRig(mesh,data).bones),library=candidate.residentMotionLibrary(await loadResidentMotion()),rows=[];
for(const [name,inPlace,centre] of [['walk.quick',true,false],['talk.chat',false,true],['sit.idle.m',false,false]]) {
 const clip=library.clips.get(name),frames=Math.max(2,Math.round(clip.duration*30)+1),row={name,frames};
 for(const [label,module] of [['before',prior],['after',candidate]]) {
  globalThis.__rootProof={identity:0,clone:0};let turns=0,result;const steps=module.retargetClipSteps(clip,library.rest,rest,inPlace,centre);
  for(;;){const next=steps.next();turns++;if(next.done){result=next.value;break}}
  row[label]={...globalThis.__rootProof,turns,hash:hash(result)};
 }
 assert.equal(row.before.hash,row.after.hash);assert.equal(row.before.turns,row.after.turns);assert.equal(row.before.identity,frames);assert.equal(row.before.clone,frames);assert.equal(row.after.identity,1);assert.equal(row.after.clone,0);rows.push(row);
}
const report={baseline:ref,sourceSha256:createHash('sha256').update(current).digest('hex'),scope:'Delivered resident rig and three motion clips. Instrumented root-identity construction and root-output clone sites in both sources; exact hash of all track names/times/values and cycle/hips metadata. No hardware or complete crossing-hitch claim.',rows,pass:true};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));mesh.geometry.dispose();mesh.skeleton.dispose();
}finally{await server.close()}
