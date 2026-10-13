#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'canopy-surface-proof',ref=args.baseline??'0b45a36';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/diagnostics/canopyAudit.ts`],{cwd:root,encoding:'utf8'}),'baseline.ts')).code;
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-canopy',resolveId(id){if(id==='/@baseline-canopy')return '\0baseline-canopy';},load(id){if(id==='\0baseline-canopy')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','surface']){
page=await openPage(`http://127.0.0.1:${address.port}/tools/canopy-surface-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.canopySurfaceRepro;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Canopy fixture did not load');
await page.shot(path.join(out,`${mode}.png`));reports[mode]=await page.eval('return window.canopySurfaceRepro;');page.close();page=null;}
const a=await sharp(path.join(out,'baseline.png')).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,'surface.png')).removeAlpha().raw().toBuffer();
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/diagnostics/canopyAudit.ts'))).digest('hex'),scope:'Controlled hollow leaf geometry through the production detector; native software WebGL fixture. No model or render changes. Not whole-forest alpha-aware coverage.',before:reports.baseline,after:reports.surface,pixelIdentical:a.equals(b),pass:reports.baseline.complete&&reports.surface.complete&&reports.baseline.detachedCandidates===0&&reports.surface.detachedCandidates===1&&[reports.baseline,reports.surface].every(r=>r.rimCandidates===0&&r.faceCandidates===0)&&a.equals(b)};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
