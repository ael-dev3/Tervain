import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const out=process.argv[2],ref=process.argv[3];assert.ok(out&&ref,'Output and baseline git reference required');
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/distanceVisibility.ts',candidate=fs.readFileSync(file),baseline=execFileSync('git',['show',ref+':'+file],{encoding:'utf8'});
const virtual=path.resolve('tools/baseline-distance.ts'),hash=s=>createHash('sha256').update(s).digest('hex');
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true,entries:[]},plugins:[{name:'no-fixture-hot-client',transformIndexHtml:{order:'post',handler(html){return html.replace(/<script type="module" src="\/@vite\/client"><\/script>/g,'');}}},{name:'baseline-distance',resolveId(id){if(id==='/tools/baseline-distance.ts')return virtual;},load(id){if(id===virtual)return baseline;}}]});let page;
try{
 await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/crown-lod-shader-cost.html`,{w:128,h:128,requestTimeoutMs:600000});let ready=false;
 for(let i=0;i<300;i++){const e=await page.eval('return window.fixtureError');if(e)throw Error(e);if(await page.eval('return window.fixtureReady')){ready=true;break;}await page.wait(100);}assert.ok(ready);
 const result=await page.eval('return lodShaderCost(7)');assert.equal(result.rows.length,28);assert.ok(candidate.equals(fs.readFileSync(file)),'Candidate source changed');
 const p95=a=>[...a].sort((a,b)=>a-b)[Math.ceil(a.length*.95)-1],median=a=>[...a].sort((a,b)=>a-b)[Math.floor(a.length/2)];
 result.summary=[];for(const partial of [false,true])for(const mode of ['before','after']){const ms=result.rows.filter(r=>r.mode===mode&&r.partial===partial).map(r=>r.ms);result.summary.push({mode,partial,samples:ms.length,medianMs:median(ms),p95Ms:p95(ms),averageMs:ms.reduce((a,b)=>a+b,0)/ms.length});}
 result.sourceHashes=Object.fromEntries(Object.entries(result.sources).map(([mode,s])=>[mode,{vertex:hash(s.vertex),fragment:hash(s.fragment)}]));delete result.sources;
 result.baseline={ref,sha256:hash(baseline)};result.candidateSha256=hash(candidate);result.collectionValid=true;
 assert.deepEqual(page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]')),[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result.summary));
}finally{page?.close();await server.close();}
