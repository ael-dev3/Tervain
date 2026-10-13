#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
const root=process.cwd(),ref=process.argv.includes('--baseline')?process.argv[process.argv.indexOf('--baseline')+1]:'0b45a36';
const code=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/ground/habitat.ts`],{encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-habitat',resolveId(id){if(id==='/@baseline-habitat')return '\0baseline-habitat';},load(id){if(id==='\0baseline-habitat')return code;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try {
 const {Habitat,newSample}=await server.ssrLoadModule('/src/presentation/ground/habitat.ts'),{Habitat:OldHabitat}=await server.ssrLoadModule('/@baseline-habitat');
 const {Terrain}=await server.ssrLoadModule('/src/world/terrain.ts'),{Exclusions}=await server.ssrLoadModule('/src/presentation/vegetation.ts'),{Colliders}=await server.ssrLoadModule('/src/world/colliders.ts');
 const terrain=new Terrain(),ctx={terrain,colliders:new Colliders(),excl:new Exclusions(terrain)},before=new OldHabitat(ctx),after=new Habitat(ctx);let beforeChecks=0,afterChecks=0;
 for(const [h,count]of [[before,()=>beforeChecks++],[after,()=>afterChecks++]])for(const c of h.softCircles){const value=c.hard;Object.defineProperty(c,'hard',{get(){count();return value;}});}
 const points=[];let seed=7177;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};for(const[x,z]of [[-7,45],[-5.2,-4],[88,-20],[-140,40]])for(let i=0;i<480;i++)points.push([x+(rand()-.5)*64,z+(rand()-.5)*64]);
 const a=newSample(),b=newSample();let unequalSamples=0;for(const[x,z]of points){before.sample(x,z,a);after.sample(x,z,b);if(Object.keys(a).some(k=>a[k]!==b[k]))unequalSamples++;}
 let comparedWords=0,unequalWords=0;for(const[k,t]of before.tiles){const v=after.tiles.get(k);if(!v||v.length!==t.length)throw new Error('Tile population mismatch');const aw=new Uint32Array(t.buffer,t.byteOffset,t.length),bw=new Uint32Array(v.buffer,v.byteOffset,v.length);for(let i=0;i<aw.length;i++){comparedWords++;unequalWords+=Number(aw[i]!==bw[i]);}}
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/ground/habitat.ts')).digest('hex'),scope:'Production Habitat with actual terrain and stock exclusions, deterministic samples at four locations. Counts soft-circle tests only; not hardware timing or live stall attribution.',samples:points.length,softCircles:before.softCircles.length,tiles:before.tiles.size,beforeChecks,afterChecks,unequalSamples,comparedWords,unequalWords,pass:unequalSamples===0&&unequalWords===0&&afterChecks<beforeChecks};
 if(process.argv.includes('--timings')) {
   const rounds=[];
   for(let round=0;round<8;round++) {
    const row={};
    for(const [name,Class]of round%2?[['after',Habitat],['before',OldHabitat]]:[['before',OldHabitat],['after',Habitat]]) {
     const start=performance.now(),h=new Class(ctx),built=performance.now(),out=newSample();
     for(const[x,z]of points)h.sample(x,z,out);
     row[name]={constructionMs:built-start,samplingMs:performance.now()-built};
    }
    rounds.push(row);
   }
   const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
   report.cpuBenchmark={scope:'Uninstrumented cold Habitat caches; actual terrain already prepared. First pair warms code and is excluded. Alternating order; anonymous sandbox CPU, not Mac frame times.',rounds:rounds.slice(1),beforeMedianMs:median(rounds.slice(1).map(r=>r.before.samplingMs)),afterMedianMs:median(rounds.slice(1).map(r=>r.after.samplingMs)),beforeConstructionMedianMs:median(rounds.slice(1).map(r=>r.before.constructionMs)),afterConstructionMedianMs:median(rounds.slice(1).map(r=>r.after.constructionMs))};
  }
  const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
