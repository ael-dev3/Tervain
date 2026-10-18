import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const out=process.argv[2]??'tree-full-coverage';fs.mkdirSync(out,{recursive:true});
fs.rmSync(path.join(out,'report.json'),{force:true});
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;
try{await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/full-interval-coverage-fixture.html`,{w:128,h:128});
 let ready=false;for(let i=0;i<300;i++){const e=await page.eval('return window.fixtureError');if(e)throw Error(e);if(await page.eval('return window.fixtureReady')){ready=true;break;}await page.wait(100);}assert.ok(ready);
 const report=await page.eval('return coverageFixture.run()');
 const full=report.rows.filter(r=>r.interval[0]<=0&&r.interval[1]>=1),partial=report.rows.filter(r=>!(r.interval[0]<=0&&r.interval[1]>=1));
 report.assertions={pairs:report.rows.length===42,imagesIdentical:report.rows.every(r=>r.changed===0),
   fullCoverageBeforeExecuted:full.every(r=>r.hashBefore>0),fullCoverageAfterSkipped:full.every(r=>r.hashAfter===0),
   partialCoverageUnchanged:partial.every(r=>r.hashBefore===r.hashAfter),partialNonempty:partial.some(r=>r.interval[0]===.25&&r.hashBefore>0)};
 report.pass=Object.values(report.assertions).every(Boolean);
 report.sourceSha256=createHash('sha256').update(fs.readFileSync('src/presentation/distanceVisibility.ts')).digest('hex');
 report.scope='Actual production distance-visibility material hooks, controlled plane, colour/depth/distance, single/four-sample targets. Hash execution counters are shader semantics, not GPU time or whole-scene fragment counts.';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));assert.ok(report.pass);
}finally{page?.close();await server.close();}
