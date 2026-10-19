import fs from 'node:fs';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createServer,transformWithOxc} from 'vite';
import {liveProofPage} from './live-proof-page.mjs';
const out=process.argv[2];assert(out,'Supply an output directory');fs.mkdirSync(out,{recursive:true});
const file='src/diagnostics/canopyConnectivity.ts',sources={before:execFileSync('git',['show','origin/main:'+file],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')},modules={};
for(const [mode,source] of Object.entries(sources))modules[mode]=(await transformWithOxc(source,file)).code;
const server=await createServer({configFile:false,logLevel:'error',optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'shared-reach',resolveId(id){if(id.startsWith('/@shared-reach-'))return '\0'+id;},load(id){if(id.startsWith('\0/@shared-reach-'))return modules[id.slice('\0/@shared-reach-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage('https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,before=await import(${JSON.stringify(origin)}+'/@shared-reach-before'),after=await import(${JSON.stringify(origin)}+'/@shared-reach-after'),{auditCanopies}=await import(${JSON.stringify(origin)}+'/src/diagnostics/canopyAudit.ts');T.frame=()=>{};T.present=()=>{};const rows=[];
 for(const lod of [0,1,2]){const seen=new Set(),targets=F.canopyAuditTargets(lod).filter(t=>{if(!t.leaves||!t.wood)return false;const key=t.leaves.uuid+':'+t.wood.uuid;if(seen.has(key))return false;seen.add(key);return true;}).sort((a,b)=>(a.leaves.index?.count??a.leaves.getAttribute('position').count)-(b.leaves.index?.count??b.leaves.getAttribute('position').count)).slice(0,8);
 for(const t of targets)for(const [reach,gap] of [[1.5,.75],[.2,.75]]){const scale=Math.hypot(...t.matrix.elements.slice(0,3)),r=reach/scale,g=gap/scale,results={};for(const [mode,m] of Object.entries({before,after})){let operations=0;const s=m.detachedClumpSet(t.leaves,t.wood,r,g,()=>{if(++operations>80000000)throw Error('Budget exhausted');});results[mode]={far:s.far,detachedCards:s.far.filter(Boolean).length,detachedClumps:s.detachedClumps,operations};}
 const audit=auditCanopies([t],{lod,woodReach:reach,gap,maxOperations:80000000}).trees[0];rows.push({label:t.label,species:t.species,lod,scale,reach,gap,...results,audit:{detachedCards:audit.detachedCards,detachedClumps:audit.detachedClumps}});}}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows};`);
 for(const row of report.rows){assert.equal(row.after.detachedCards,row.audit.detachedCards);assert.equal(row.after.detachedClumps,row.audit.detachedClumps);if(row.reach===1.5)assert.deepEqual(row.before,row.after);else assert(row.after.detachedCards<=row.before.detachedCards);}
 report.corrected=report.rows.filter(r=>r.before.detachedCards!==r.after.detachedCards).map(({label,species,lod,reach,gap,before,after,audit})=>({label,species,lod,reach,gap,before:before.detachedCards,after:after.detachedCards,audit:audit.detachedCards}));assert(report.corrected.length,'No native false flag reproduced');
 report.errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(report.errors,[]);report.complete=true;report.scope='Read-only shared detector on actual published geometries; tighter reach is diagnostic, default classifications and operation counts must match exactly. No tree geometry or rendering changes.';
 fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));console.log(JSON.stringify({build:report.build,rows:report.rows.length,corrected:report.corrected,errors:report.errors}));
}finally{page?.close();await server.close();}
