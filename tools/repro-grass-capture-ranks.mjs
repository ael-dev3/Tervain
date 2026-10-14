#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'grass-capture-ranks',ref=args.baseline??'9ab40b3';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/ground/tileStream.ts`],{cwd:root,encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-tile',resolveId(id){if(id==='/@baseline-tile')return '\0baseline-tile';},load(id){if(id==='\0baseline-tile')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','candidate']){
page=await openPage(`http://127.0.0.1:${address.port}/tools/grass-capture-ranks-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.captureRankRepro;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Canopy fixture did not load');
await page.shot(path.join(out,`${mode}.png`));reports[mode]=await page.eval('const r=window.captureRankRepro;return {...r,renderMain:undefined,main:r.renderMain()};');await page.shot(path.join(out,`${mode}-main.png`));page.close();page=null;}
const a=await sharp(path.join(out,'baseline-main.png')).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,'candidate-main.png')).removeAlpha().raw().toBuffer();
const before=await sharp(path.join(out,'baseline.png')).removeAlpha().raw().toBuffer(),after=await sharp(path.join(out,'candidate.png')).removeAlpha().raw().toBuffer();let changed=0;for(let i=0;i<before.length;i+=3)if(Math.max(...[0,1,2].map(c=>Math.abs(before[i+c]-after[i+c])))>10)changed++;
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/ground/tileStream.ts'))).digest('hex'),scope:'Native grass shader and clump geometry in a controlled tile, rendered with two cameras through software WebGL. Standalone correctness fixture, not whole-scene post/MSAA, real-time pacing or a whole-world pop-in gate.',before:reports.baseline,after:reports.candidate,mainPixelIdentical:a.equals(b),changedCapturePixels:changed,pass:reports.baseline.captureCount===6&&reports.candidate.captureCount===16&&reports.candidate.restoredCount===reports.candidate.initialCount&&a.equals(b)&&changed>0&&[reports.baseline,reports.candidate].every(r=>r.captureErrors.length===0)};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
