#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createServer} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=args.baseline??'5da2776',out=args.out??'flora-weight-render-proof';fs.mkdirSync(out,{recursive:true});
const baselinePopulation=execFileSync('git',['show',`${ref}:src/presentation/floraPopulation.ts`],{cwd:root,encoding:'utf8'}).replace(/from '\.\//g,"from '/src/presentation/").replace(/from '\.\.\//g,"from '/src/");
const baseline=execFileSync('git',['show',`${ref}:src/presentation/flora.ts`],{cwd:root,encoding:'utf8'}).replace(/from '\.\//g,"from '/src/presentation/").replace(/from '\.\.\//g,"from '/src/").replace("'/src/presentation/floraPopulation'","'/@baseline-population'");
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-flora',resolveId(id){if(id==='/@baseline-population')return '/src/presentation/__baseline_population.ts';if(id==='/@baseline-flora')return '/src/presentation/__baseline_flora.ts';},load(id){if(id==='/src/presentation/__baseline_population.ts')return baselinePopulation;if(id==='/src/presentation/__baseline_flora.ts')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],entries:['tools/flora-weight-fixture.html']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','candidate']) {
  page=await openPage(`http://127.0.0.1:${address.port}/tools/flora-weight-fixture.html?mode=${mode}`,{w:320,h:240,requestTimeoutMs:240000,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});
  let ready=false;for(let i=0;i<600;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.floraWeightProof;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Tree fixture not ready');
  reports[mode]=await page.eval('return window.floraWeightProof;');await page.shot(path.join(out,`${mode}.png`));page.close();page=null;
}
const before=await sharp(path.join(out,'baseline.png')).removeAlpha().raw().toBuffer(),after=await sharp(path.join(out,'candidate.png')).removeAlpha().raw().toBuffer();
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/flora.ts'))).digest('hex'),populationSourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/floraPopulation.ts'))).digest('hex'),scope:'Source-backed forest fixture with source pine models and procedural broadleaf catalog, five camera moves at High, native software WebGL. Counters exclude uniforms; not full-world hardware timing.',...reports,pixelIdentical:before.equals(after)};
report.pass=reports.baseline.pass&&reports.candidate.pass&&report.pixelIdentical&&reports.baseline.textureImagePayloadBytes===reports.candidate.textureImagePayloadBytes&&reports.baseline.rows.slice(1).every((r,i)=>r.unnecessaryVersions===reports.candidate.rows[i+1].unnecessaryVersions&&r.uploadBytes===reports.candidate.rows[i+1].uploadBytes&&r.drawCalls===reports.candidate.rows[i+1].drawCalls&&r.triangles===reports.candidate.rows[i+1].triangles);
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
