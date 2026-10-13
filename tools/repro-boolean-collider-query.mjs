import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const ref='0b45a36',timingMode=process.argv.includes('--timings'),output=process.argv.slice(2).find(arg=>!arg.startsWith('--'));
function instrument(source){if(timingMode)return source;const marker='near(x: number, z: number, r: number): Collider[] {';if(!source.includes(marker))throw new Error('Missing near collector');return source.replace(marker,marker+"Reflect.set(globalThis,'nearCalls',(Reflect.get(globalThis,'nearCalls')??0)+1);").replaceAll('for (const c of bucket) {',"for (const c of bucket) {Reflect.set(globalThis,'bucketVisits',(Reflect.get(globalThis,'bucketVisits')??0)+1);");}
const baseline=(await transformWithOxc(instrument(execFileSync('git',['show',`${ref}:src/world/colliders.ts`],{encoding:'utf8'})),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/world',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'counter',enforce:'pre',transform(source,id){if(id.split('?')[0].endsWith('/src/world/colliders.ts'))return instrument(source);}},{name:'baseline',resolveId(id){if(id==='/@baseline')return '\0baseline';},load(id){if(id==='\0baseline')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try{
 const {Colliders,buildStaticColliders}=await server.ssrLoadModule('/src/world/colliders.ts'),{Colliders:OldColliders}=await server.ssrLoadModule('/@baseline'),{Terrain}=await server.ssrLoadModule('/src/world/terrain.ts');const terrain=new Terrain(),source=buildStaticColliders(terrain),before=new OldColliders(),after=new Colliders();for(const collider of source.all){before.add(collider);after.add(collider);}
 const queries=[];for(let z=-140;z<=150;z+=5)for(let x=-290;x<=140;x+=5){const y=terrain.heightAt(x,z);for(const radius of [0,.35,1.1])queries.push({x,z,radius,bounds:{minY:y+.02,maxY:y+1.8}});}

 if(timingMode){
  const repeats=50,run=target=>{let checksum=0;for(let n=0;n<repeats;n++)for(const q of queries)checksum+=Number(target.blocked(q.x,q.z,q.radius,q.bounds));return checksum;};
  run(before);run(after);const rounds=[];
  for(let i=0;i<9;i++){const row={};for(const name of i%2?['after','before']:['before','after']){const start=performance.now(),checksum=run(name==='before'?before:after);row[name]={ms:performance.now()-start,checksum};}rounds.push(row);}
  const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
  const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/colliders.ts')).digest('hex'),scope:'Uninstrumented alternating authored-scene query batches, first pair discarded. CPU workload, not hardware frame timing.',queriesPerBatch:queries.length*repeats,beforeMedianMs:median(rounds.slice(1).map(r=>r.before.ms)),afterMedianMs:median(rounds.slice(1).map(r=>r.after.ms)),rounds,pass:rounds.every(r=>r.before.checksum===r.after.checksum)};
  fs.writeFileSync(output??'boolean-collider-timings.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
 }else{
 let differences=0,beforeCollections=0,afterCollections=0,beforeVisits=0,afterVisits=0,blocked=0;for(const q of queries){Reflect.set(globalThis,'nearCalls',0);Reflect.set(globalThis,'bucketVisits',0);const a=before.blocked(q.x,q.z,q.radius,q.bounds);beforeCollections+=Reflect.get(globalThis,'nearCalls');beforeVisits+=Reflect.get(globalThis,'bucketVisits');Reflect.set(globalThis,'nearCalls',0);Reflect.set(globalThis,'bucketVisits',0);const b=after.blocked(q.x,q.z,q.radius,q.bounds);afterCollections+=Reflect.get(globalThis,'nearCalls');afterVisits+=Reflect.get(globalThis,'bucketVisits');differences+=Number(a!==b);blocked+=Number(a);}
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/world/colliders.ts')).digest('hex'),scope:'Actual boolean collision queries on authored terrain/scenery. Diagnostic collector/visit counts, not heap bytes or hardware timing. Terrain-height and radius controls.',queries:queries.length,colliders:source.all.length,blocked,beforeCollections,afterCollections,beforeVisits,afterVisits,differences,pass:differences===0&&beforeCollections===queries.length&&afterCollections===0};fs.writeFileSync(output??'boolean-collider-query.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}}finally{await server.close();}
