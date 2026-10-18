import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
import sharp from 'sharp';
const out=process.argv[2]??'production-crown-lod';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const candidateFile='src/presentation/distanceVisibility.ts',candidateSource=fs.readFileSync(candidateFile);
const ref=process.argv[3]??'d40777b',baseline=execFileSync('git',['show',ref+':src/presentation/distanceVisibility.ts'],{encoding:'utf8'});
const virtual=path.resolve('tools/baseline-distance.ts');
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],entries:['tools/crown-lod-production-fixture.html']},plugins:[{name:'baseline-distance',resolveId(id){if(id==='/tools/baseline-distance.ts')return virtual;},load(id){if(id===virtual)return baseline;}}]});let page;
try{await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/crown-lod-production-fixture.html`,{w:128,h:128,requestTimeoutMs:300000});let ready=false;
 for(let i=0;i<300;i++){const e=await page.eval('return window.fixtureError');if(e)throw Error(e);if(await page.eval('return window.fixtureReady')){ready=true;break;}await page.wait(100);}assert.ok(ready);
 const result=await page.eval('return productionLodFixture.run()');
 for(let i=0;i<result.rows.length;i++)for(const mode of ['before','after']){const row=result.rows[i],r=row[mode];if(!row.ortho&&row.viewport[0]===0&&row.samples===4&&!row.masked&&row.near===150&&row.weight===.5&&row.pan[0]===0)
   await sharp(Buffer.from(r.pixels),{raw:{width:128,height:128,channels:4}}).flip().png().toFile(path.join(out,mode+'.png'));delete r.pixels;}
 result.assertions={cases:result.rows.length===1008,nonempty:result.rows.every(r=>r.before.overlap>3000&&r.before.overlap===r.after.overlap),reproduced:result.rows.filter(r=>r.weight===.5).every(r=>r.before.holes>0&&r.before.double>0),complementary:result.rows.every(r=>r.after.holes===0&&r.after.double===0),rayProbes:result.probes.length===24&&result.probes.every(r=>r.error<.001&&r.footprintError<.00001)};
 result.baseline={ref,sha256:createHash('sha256').update(baseline).digest('hex')};assert.ok(candidateSource.equals(fs.readFileSync(candidateFile)),'Candidate source changed during capture');result.candidateSha256=createHash('sha256').update(candidateSource).digest('hex');result.pass=Object.values(result.assertions).every(Boolean);
 result.scope='Actual production material hooks, two matching projected surfaces with different depths; opaque overlap oracle excludes genuine alpha-mask differences and alpha edges. Single/four-sample targets, opaque/cutout controls. Not whole-world quality or hardware frame pacing.';
 const {rows,...metadata}=result;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(metadata,null,2).trimEnd().slice(0,-1)+',\n  \"rows\": [\n'+rows.map(r=>'    '+JSON.stringify(r)).join(',\n')+'\n  ]\n}\n');console.log(JSON.stringify({assertions:result.assertions,example:result.rows.find(r=>!r.ortho&&r.viewport[0]===0&&r.samples===4&&!r.masked&&r.near===150&&r.weight===.5&&r.pan[0]===0),pass:result.pass}));assert.ok(result.pass);
}finally{page?.close();await server.close();}
