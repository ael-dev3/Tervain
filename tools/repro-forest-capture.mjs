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
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),ref=args.baseline??'5da2776',out=args.out??'forest-capture-proof';fs.mkdirSync(out,{recursive:true});
const baseline=execFileSync('git',['show',`${ref}:src/presentation/flora.ts`],{cwd:root,encoding:'utf8'}).replace(/from '\.\//g,"from '/src/presentation/").replace(/from '\.\.\//g,"from '/src/");
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-flora',resolveId(id){if(id==='/@baseline-flora')return '/src/presentation/__baseline_flora.ts';},load(id){if(id==='/src/presentation/__baseline_flora.ts')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});
let page;const reports={};let changedChannels=0;try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','candidate']) {
 page=await openPage(`http://127.0.0.1:${address.port}/tools/forest-capture-fixture.html?mode=${mode}`,{w:320,h:320,requestTimeoutMs:240000,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});
 let ready=false;for(let i=0;i<600;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.forestCaptureProof;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Forest fixture not ready');
 for(let i=0;i<7;i++){await page.eval(`window.forestCaptureProof.step(${i});`);await page.shot(path.join(out,`${mode}-${i}.png`));}
 reports[mode]=await page.eval('return window.forestCaptureProof.rows;');page.close();page=null;
}
for(let i=0;i<7;i++){const before=await sharp(path.join(out,`baseline-${i}.png`)).removeAlpha().raw().toBuffer(),after=await sharp(path.join(out,`candidate-${i}.png`)).removeAlpha().raw().toBuffer();for(let j=0;j<before.length;j++)if(before[j]!==after[j])changedChannels++;}
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/flora.ts'))).digest('hex'),scope:'Six native cube-camera directions using native middle-model proxies plus the primary camera over the same production forest packing, delivered pine/procedural broadleaf fixture. Software counters, not GPU timings. Uploads exclude uniforms.',...reports,changedChannels};
report.pass=!changedChannels&&reports.baseline.every((r,i)=>!r.glError&&!reports.candidate[i].glError&&reports.candidate[i].triangles<=r.triangles)&&reports.candidate.some((r,i)=>r.triangles<reports.baseline[i].triangles)&&reports.candidate[6].triangles===reports.baseline[6].triangles&&reports.candidate[6].drawCalls===reports.baseline[6].drawCalls;
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
