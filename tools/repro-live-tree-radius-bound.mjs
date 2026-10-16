import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer, transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'tree-radius-bound-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/treeGrounding.ts';
const sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')};
const modules={};
for(const [mode,source] of Object.entries(sources)){
 if(!source.includes('Math.hypot(ax, az)'))throw Error('Radius instrumentation site missing');
 const instrumented=source.replaceAll('Math.hypot(', 'proofHypot(')+'\nexport let proofHypotCalls = 0;\nfunction proofHypot(x: number, z: number): number { proofHypotCalls++; return Math.hypot(x, z); }\n';
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tree-radius-bound-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'radius-proof',resolveId(id){if(id.startsWith('/@radius-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@radius-proof-'))return modules[id.slice('\0/@radius-proof-'.length)];}}]});
let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module;
 const targets=[0,1,2].map(lod=>F.canopyAuditTargets(lod)),maps=targets.map(ts=>new Map(ts.map(t=>[t.label,t])));
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
 const variants=new Map(),trees=[];
 for(const target of targets[0]){if(!target.wood||target.species==='pine')continue;let variant=variants.get(target.wood);
 if(!variant){variant={species:target.species,lods:maps.map(m=>{const t=m.get(target.label);return{wood:t?.wood??null,leaf:t?.leaves??null};})};variants.set(target.wood,variant);}
 const e=target.matrix.elements;trees.push({label:target.label,variant,tree:{x:e[12],z:e[14],s:Math.hypot(e[0],e[2]),yaw:Math.atan2(e[8],e[0])}});}
 const geometryState=()=>Array.from(variants.values(),v=>v.lods.map(l=>l.wood?{position:Array.from(l.wood.getAttribute('position').array),index:l.wood.index?Array.from(l.wood.index.array):null,twigIndex:l.wood.userData.twigIndex??null}:null));
 const geometryBefore=await hash(geometryState()),rows={};
 for(const mode of ['before','after']){const M=await import(${JSON.stringify(origin)}+'/@radius-proof-'+mode),queries=[];
 for(const {label,tree,variant}of trees){const y=M.groundedTreeY(T.world.terrain,tree,variant),depth=T.world.terrain.heightAt(tree.x,tree.z)-y;queries.push({label,scale:tree.s,depth,radius:M.treeWoodCollisionRadius(variant,tree.s,depth)});}
 const coldHypotCalls=M.proofHypotCalls;
 for(let i=0;i<trees.length;i++){const {tree,variant}=trees[i],q=queries[i];if(M.treeWoodCollisionRadius(variant,tree.s,q.depth)!==q.radius)throw Error('Warm radius changed');}
 rows[mode]={coldHypotCalls,warmHypotCalls:M.proofHypotCalls-coldHypotCalls,radiusSha256:await hash(queries),treeCount:queries.length,variantCount:variants.size,queries};}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,geometryBefore,geometryAfter:await hash(geometryState())};`);
 const a=report.rows.before,b=report.rows.after;
 report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')]));
 report.scope='Actual published low-preset non-pine tree models and terrain. Replays treeWoodCollisionRadius for retained native trees at their planting-plane burial depth, as used by population acceptance. Pine uses its separate implementation and is excluded. Shared variant caches start cold in each implementation, then all queries repeat warm. Counts are executed Math.hypot calls, not hardware timings or heap allocations. No live geometry or placement is modified.';
 report.pass=a.treeCount>100&&a.treeCount===b.treeCount&&a.variantCount===b.variantCount&&a.radiusSha256===b.radiusSha256&&report.geometryBefore===report.geometryAfter&&b.coldHypotCalls<a.coldHypotCalls&&a.warmHypotCalls===0&&b.warmHypotCalls===0;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({...report,rows:Object.fromEntries(Object.entries(report.rows).map(([k,{queries,...v}])=>[k,v]))}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
