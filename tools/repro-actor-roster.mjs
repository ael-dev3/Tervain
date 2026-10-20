import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const out=process.argv[2]??'actor-roster-report.json',ref=process.argv[3]??'b317734',file='src/world/physics.ts';
const oldSource=execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8'}),source=fs.readFileSync(file,'utf8');
const oldCode=(await transformWithOxc(oldSource,'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/world',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-roster',resolveId:id=>id==='/@baseline-roster'?'\0baseline-roster':null,load:id=>id==='\0baseline-roster'?oldCode:null}],server:{middlewareMode:true,hmr:false,ws:false}}),worlds=[];
const hash=s=>createHash('sha256').update(s).digest('hex');
try{
 const {RealmPhysics:After,initializePhysics}=await server.ssrLoadModule('/src/world/physics.ts'),{RealmPhysics:Before}=await server.ssrLoadModule('/@baseline-roster'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');await initializePhysics();
 const floor={nx:10,nz:10,vertexX:i=>i*2-10,vertexZ:i=>i*2-10,vertexHeight:()=>0,heightAt:()=>0,groundAt:()=>0},player={x:8,y:0,z:8};
 const spec={id:'crate',kind:'crate',name:'Crate',x:0,z:0,width:.8,height:.6,depth:.6,yaw:0,mass:12};
 const people=Array.from({length:32},(_,i)=>({id:`person:${i}`,x:(i%8)*.9-3,y:0,z:Math.floor(i/8)*1.3-2,radius:.25,height:1.8,active:true}));
 for(const C of [Before,After]){const w=new C(floor,new Colliders(),[spec]);worlds.push(w);w.syncActors(people);}
 const traces=[createHash('sha256'),createHash('sha256')];let compared=0;
 for(let frame=0;frame<240;frame++){
  const input=people.map((p,i)=>({...p,x:p.x+Math.sin(frame*.025)*.3+(frame>=80&&i===0?3.1415926535:0),z:p.z+Math.cos(frame*.03)*.2,radius:i===3&&frame>=140?.35:p.radius,active:i!==1||frame<40||frame>=60})).filter((_,i)=>i!==2||!(frame>=100&&frame<120||frame>=195&&frame<205));
  if(frame%70===0)input.push({...input[0],x:input[0].x+.01});
  if(frame===200)Reflect.set(worlds[1],'actorSyncSerial',0x3ffffffe);
  const states=[];for(const w of worlds){w.syncActors(input);w.beginCharacter(player);w.step(frame%3===0?.05:1/60,player,.2,.1);states.push({actors:[...w.actors].map(([id,a])=>({id,from:a.from,target:a.target,active:a.active,radius:a.radius,halfHeight:a.halfHeight,position:a.body.translation(),enabled:a.body.isEnabled()})),props:w.poses(false)});}
  assert.deepEqual(states[1],states[0],`Physics changed at frame ${frame}`);compared+=states[0].actors.length;for(let i=0;i<2;i++)traces[i].update(JSON.stringify(states[i]));
 }
 const correctness={frames:240,comparedActorStates:compared,traceHashes:traces.map(x=>x.digest('hex')),exactActorAndCargoStates:true};
 for(const w of worlds)w.dispose();worlds.length=0;
 // Two independent baseline worlds expose A/A spread. No allocation/API observers run during timing.
 for(const C of [Before,After,Before]){const w=new C(floor,new Colliders(),[]);worlds.push(w);w.syncActors(people);}
 for(let i=0;i<1000;i++)for(const w of worlds){w.syncActors(people);w.beginCharacter(player);w.step(1/60,player,0,0);}
 const orders=[[0,1,2],[2,1,0],[1,2,0],[0,2,1],[2,0,1],[1,0,2]],times=[[],[],[]],batches=[];
 for(let batch=0;batch<12;batch++)for(const mode of orders[batch%orders.length]){
  const w=worlds[mode],samples=[];w.beginCharacter(player);w.step(1/60,player,0,0);const cpu=process.threadCpuUsage?.();
  for(let i=0;i<1000;i++){const t=process.hrtime.bigint();w.syncActors(people);samples.push(Number(process.hrtime.bigint()-t)/1e6);}
  const end=cpu?process.threadCpuUsage(cpu):null;times[mode].push(...samples);samples.sort((a,b)=>a-b);batches.push({batch,mode,averageMs:samples.reduce((a,b)=>a+b)/samples.length,p95Ms:samples[949],threadCpuMicros:end?end.user+end.system:null});
 }
 const summary=times.map((values,mode)=>{const a=[...values].sort((a,b)=>a-b),cpu=batches.filter(x=>x.mode===mode).map(x=>x.threadCpuMicros);return{mode,label:['baseline-a','candidate','baseline-b'][mode],samples:a.length,averageMs:a.reduce((a,b)=>a+b)/a.length,p50Ms:a[Math.ceil(a.length*.5)-1],p95Ms:a[Math.ceil(a.length*.95)-1],threadCpuMsPerSync:cpu.every(x=>x!==null)?cpu.reduce((a,b)=>a+b)/a.length/1000:null};});
 assert.equal(fs.readFileSync(file,'utf8'),source,'Candidate source changed during collection');
 const report={baseline:{ref,sha256:hash(oldSource)},candidate:{head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),sha256:hash(source)},correctness,summary,batches,rawElapsedMs:times,scope:'Actual Rapier; 32 actors, variable substeps, teleport/reactivation, missing/duplicate IDs, resize and serial rollover. Warmed synchronization-only timing; 12 rotated-order batches per world, two baseline A/A controls, no API/allocation observers. Thread CPU includes loop/clock bookkeeping; per-call elapsed p95 includes scheduling. Not whole-game frame CPU, GPU, FPS, heap bytes or M5 heat.'};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({correctness,summary}));
}finally{for(const w of worlds)w.dispose();await server.close();}
