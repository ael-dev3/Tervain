#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createServer,transformWithOxc} from 'vite';
const out=path.resolve(process.argv[2]??'artifacts/resident-seat-reuse.json'),ref=process.argv[3]??'421d34b';
const old=execFileSync('git',['show',`${ref}:src/presentation/npc/residentMotion.ts`],{encoding:'utf8'});
const instrument=source=>source.replaceAll('sum.clone()', '(globalThis.__seatClones++, sum.clone())');
const current=fs.readFileSync('src/presentation/npc/residentMotion.ts','utf8');
const transform=async source=>(await transformWithOxc(instrument(source),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/npc',p)}'`);
const baseline=await transform(old),updated=await transform(current);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-retarget',resolveId(id){if(id==='/@baseline-retarget'||id==='/@candidate-retarget')return '\0'+id.slice(2)},load(id){if(id==='\0baseline-retarget')return baseline;if(id==='\0candidate-retarget')return updated}}],server:{middlewareMode:true,hmr:false,ws:false}});
try {
const {loadResident,loadResidentMotion,loadResidentRigData,residentMesh}=await server.ssrLoadModule('/tests/presentation/residentFixtures.ts');
const {installResidentRig,residentRestPose}=await server.ssrLoadModule('/src/presentation/npc/residentRig.ts');
const candidate=await server.ssrLoadModule('/@candidate-retarget'),prior=await server.ssrLoadModule('/@baseline-retarget');
const {clone}=await server.ssrLoadModule('three/examples/jsm/utils/SkeletonUtils.js');
const rows=[];
for(const id of ['rillford-reeve','ash-recorder']) {
 const {source}=await loadResident(id),data=await loadResidentRigData(id),scene=clone(source.scene),mesh=residentMesh(scene);mesh.geometry=mesh.geometry.clone();
 const rest=residentRestPose(installResidentRig(mesh,data).bones),library=candidate.residentMotionLibrary(await loadResidentMotion()),clip=candidate.retargetClip(library.clips.get('sit.idle.m'),library.rest,rest),row={id};
 for(const [label,module] of [['before',prior],['after',candidate]]) {
  let turns=0,result;globalThis.__seatClones=0;
  {const steps=module.measureSeatSteps(clip,rest,data,mesh.geometry.getAttribute('position'));for(;;){const next=steps.next();turns++;if(next.done){result=next.value;break}}}
  row[label]={vectorClones:globalThis.__seatClones,turns,seat:result};
 }
 assert.deepEqual(row.before.seat,row.after.seat);assert.equal(row.before.turns,row.after.turns);assert(row.before.vectorClones>0);assert.equal(row.before.vectorClones,row.after.vectorClones*3);rows.push(row);mesh.geometry.dispose();mesh.skeleton.dispose();
}
const report={baseline:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/npc/residentMotion.ts')).digest('hex'),scope:'Delivered resident rigs and sit clip; instrumented sum.clone calls during seat preparation only. Exact coordinate and generator-turn equality. No whole-crossing hitch or hardware frame-time claim.',rows,pass:true};
fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await server.close()}
