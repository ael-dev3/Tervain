#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'grass-mover-reuse',ref=args.baseline??'5da2776';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/grass/trample.ts`],{cwd:root,encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation/grass',p)}'`);
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-trample',resolveId(id){if(id==='/@baseline-trample')return '\0baseline-trample';},load(id){if(id==='\0baseline-trample')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','candidate']){
page=await openPage(`http://127.0.0.1:${address.port}/tools/grass-mover-reuse-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.fixtureReady;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Trample fixture did not load');
reports[mode]=await page.eval('return window.fixtureResult;');await page.shot(path.join(out,mode+'.png'));page.close();page=null;}
const a=await sharp(path.join(out,'baseline.png')).raw().toBuffer(),b=await sharp(path.join(out,'candidate.png')).raw().toBuffer();
const same=(k)=>JSON.stringify(reports.baseline[k])===JSON.stringify(reports.candidate[k]);
const assertions={selectionStorageReused:reports.baseline.selectionArrays===600&&reports.candidate.selectionArrays===1,selectedBodiesIdentical:same('selection'),activeCountsIdentical:same('active'),fieldBitsIdentical:same('fieldPixels'),imageIdentical:a.equals(b),textureCountIdentical:same('textureCount'),fieldColorPayloadIdentical:same('fieldColorPayloadBytes'),uploadBytesIdentical:same('warmupUploadBytes')&&same('maxSteadyUpdateUploadBytes')&&same('fieldUpdateUploadBytes'),drawsIdentical:same('draws'),trianglesIdentical:same('triangles'),nonemptyField:reports.candidate.fieldPixels.some((v,i)=>i%4<3&&v>0),validDraws:reports.baseline.errors.length===0&&reports.candidate.errors.length===0};
const digest=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const compact=r=>{const {selection,active,fieldPixels,...rest}=r;return {...rest,selectedBodyIndices:selection.reduce((n,a)=>n+a.length,0),selectionSha256:digest(selection),activeCountSamples:active.length,activeCountSha256:digest(active),fieldChannels:fieldPixels.length,fieldSha256:digest(fieldPixels)};};
const report={baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/grass/trample.ts'))).digest('hex'),scope:'Production trample field, 600 walking updates with 83 movers, half-float field and software WebGL. Object identity counts are selection storage, not total heap allocations or hardware timings.',before:compact(reports.baseline),after:compact(reports.candidate),assertions,pass:Object.values(assertions).every(Boolean)};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({assertions,before:reports.baseline.selectionArrays,after:reports.candidate.selectionArrays,draws:reports.candidate.draws,triangles:reports.candidate.triangles,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
