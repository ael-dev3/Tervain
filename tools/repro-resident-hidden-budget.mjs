#!/usr/bin/env node
/** Production hidden-layer scheduling on delivered geometry; deterministic work clock, not hardware timings. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createServer} from 'vite';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const ref=args.baseline??'421d34b',out=path.resolve(args.out??'resident-hidden-budget.json');fs.rmSync(out,{force:true});
const sources={before:execFileSync('git',['show',`${ref}:src/presentation/npc/residentSurface.ts`],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/npc/residentSurface.ts','utf8')};
const ids=Object.fromEntries(Object.keys(sources).map(mode=>[mode,path.resolve(`src/presentation/npc/__proof-hidden-${mode}.ts`)]));
const instrument=source=>{
 let matched=false;source=source.replace(/const due = \(([^)]*)\) => ([^\n]+);/,(_,params,expression)=>{matched=true;return `const due = (${params}) => (++globalThis.__hiddenProof.visits, (${expression}));`;});assert(matched);
 return source.replaceAll('performance.now()','globalThis.__hiddenProof.visits');
};
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true,ws:false,hmr:false},plugins:[{name:'hidden-budget-proof',enforce:'pre',resolveId(id){for(const [mode,file]of Object.entries(ids))if(id===`/@hidden-${mode}`)return file;},load(id){for(const [mode,file]of Object.entries(ids))if(id===file)return instrument(sources[mode]);}}]});
const hash=array=>createHash('sha256').update(new Uint8Array(array.buffer,array.byteOffset,array.byteLength)).digest('hex');
try {
 const {loadResident,residentMesh}=await server.ssrLoadModule('/tests/presentation/residentFixtures.ts');
 const modules={};for(const mode of Object.keys(sources))modules[mode]=await server.ssrLoadModule('/@hidden-'+mode);
 const rows=[];
 for(const id of ['ash-recorder','village-baker']){
  const {source}=await loadResident(id),mesh=residentMesh(source.scene),geometry=mesh.geometry,names=mesh.skeleton.bones.map(b=>b.name),row={model:id,vertices:geometry.getAttribute('position').count,triangles:geometry.index.count/3};
  for(const mode of ['before','after']){
   globalThis.__hiddenProof={visits:0};const steps=modules[mode].residentHiddenLayersSteps(geometry,names);let maxWorkPerTurn=0,turns=0,result;
   for(;;){const start=globalThis.__hiddenProof.visits,next=steps.next();maxWorkPerTurn=Math.max(maxWorkPerTurn,globalThis.__hiddenProof.visits-start);turns++;if(next.done){result=next.value;break;}}
   row[mode]={maxWorkPerTurn,work:globalThis.__hiddenProof.visits,turns,maskSha256:hash(result),hiddenVertices:result.reduce((n,v)=>n+(v!==0),0)};
  }
  assert.equal(row.before.maskSha256,row.after.maskSha256);assert.equal(row.before.work,row.after.work);assert(row.before.maxWorkPerTurn>128);assert(row.after.maxWorkPerTurn<=32);rows.push(row);
 }
 const report={baseline:ref,sourceSha256:createHash('sha256').update(sources.after).digest('hex'),scope:'Actual production generator, delivered resident geometry and original skin joints, default body axis. Instrumented due-call counts and a deterministic work clock replace elapsed time in both sources. Exact hidden-mask hashes; no hardware or complete night-hitch claim.',rows,pass:true};fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await server.close();}
