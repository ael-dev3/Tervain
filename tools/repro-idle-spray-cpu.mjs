import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const timingMode=process.argv.includes('--timings'),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
const ref='0b45a36',sourcePath='src/presentation/water/splashes.ts';
const instrument=source=>{if(timingMode)return source;const marker='for (let i = 0; i < MAX; i++) {';assert.ok(source.includes(marker));return source.replace(marker,marker+"Reflect.set(globalThis,'sprayVisits',(Reflect.get(globalThis,'sprayVisits')??0)+1);");};
const baseline=(await transformWithOxc(instrument(execFileSync('git',['show',`${ref}:${sourcePath}`],{encoding:'utf8'})),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/water',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'counter',enforce:'pre',transform(source,id){if(id.split('?')[0].endsWith('/'+sourcePath))return instrument(source);}},{name:'baseline',resolveId(id){if(id==='/@baseline-spray')return '\0baseline-spray';},load(id){if(id==='\0baseline-spray')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
const sprays=[];
try{
 const {Splashes}=await server.ssrLoadModule('/'+sourcePath),{Splashes:Old}=await server.ssrLoadModule('/@baseline-spray');sprays.push(new Old(),new Splashes());
 for(const spray of sprays)spray.update(0);
 if(timingMode){
  const repeats=10000,run=spray=>{for(let i=0;i<repeats;i++)spray.update(1/60);};
  run(sprays[0]);run(sprays[1]);const rounds=[];
  for(let n=0;n<9;n++){const row={};for(const i of n%2?[1,0]:[0,1]){const start=performance.now();run(sprays[i]);row[i?'afterMs':'beforeMs']=performance.now()-start;}rounds.push(row);}
  for(const key of ['position','aSize','aFade'])assert.deepEqual(sprays[1].points.geometry.getAttribute(key).array,sprays[0].points.geometry.getAttribute(key).array);
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),scope:'Uninstrumented, warmed, alternating idle-update batches; first pair discarded. Component CPU workload, not real-play or Mac frame timing.',updatesPerBatch:repeats,beforeMedianMs:median(rounds.slice(1).map(r=>r.beforeMs)),afterMedianMs:median(rounds.slice(1).map(r=>r.afterMs)),rounds,exactFinalBuffers:true,pass:true};
  fs.writeFileSync(output??'idle-spray-cpu-timings.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }else{
 let beforeVisits=0,afterVisits=0,comparedUpdates=0;const controls=[];
 const compare=dt=>{
  for(let i=0;i<2;i++){Reflect.set(globalThis,'sprayVisits',0);sprays[i].update(dt);if(i===0)beforeVisits+=Reflect.get(globalThis,'sprayVisits');else afterVisits+=Reflect.get(globalThis,'sprayVisits');}
  for(const key of ['position','aSize','aFade']){
   const a=sprays[0].points.geometry.getAttribute(key),b=sprays[1].points.geometry.getAttribute(key);
   assert.deepEqual(b.array,a.array);assert.equal(b.version,a.version);
  }
  assert.equal(sprays[1].active,sprays[0].active);comparedUpdates++;
 };
 for(let i=0;i<120;i++)compare(1/60);controls.push({label:'cold-idle',beforeVisits,afterVisits});
 const idleVisits={before:beforeVisits,after:afterVisits};beforeVisits=afterVisits=0;
 for(let frame=0;frame<300;frame++){
  for(const spray of sprays){
   if(frame===0)spray.emit(0,1,0,2,1.5,.15);
   if(frame===90)for(let i=0;i<5;i++)spray.emit(.1*i,1,0,120,2,.1);
   if(frame===240){spray.enabled=false;spray.emit(0,1,0,10,1);}
   if(frame===260){spray.enabled=true;spray.emit(0,1,0,0,1);spray.emit(0,1,0,3,1);}
  }
  compare(frame%30===0?0:1/60);
 }
 controls.push({label:'emission-overwrite-expiry-zero-dt-disabled-emission',beforeVisits,afterVisits});
 for(let i=0;i<100;i++)compare(.1);
 assert.equal(sprays[1].active,0);beforeVisits=afterVisits=0;
 for(let i=0;i<120;i++)compare(1/60);controls.push({label:'expired-idle',beforeVisits,afterVisits});
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'),scope:'Actual spray simulation with loop-visit instrumentation; attributes and upload versions compared after every update. Not hardware timing or heap allocation measurement.',comparedUpdates,controls,exactBuffersAndUploadVersions:true,pass:idleVisits.before===57600&&idleVisits.after===0&&beforeVisits===57600&&afterVisits===0};
 fs.writeFileSync(output??'idle-spray-cpu-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}
}finally{for(const spray of sprays)spray.dispose();await server.close();}
