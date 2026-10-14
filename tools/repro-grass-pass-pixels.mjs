#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'grass-pass-pixels',ref=args.baseline??'5da2776';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/grass/grassMaterial.ts`],{cwd:root,encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation/grass',p)}'`);
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-grass',resolveId(id){if(id==='/@baseline-grass')return '\0baseline-grass';},load(id){if(id==='\0baseline-grass')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','candidate']){
page=await openPage(`http://127.0.0.1:${address.port}/tools/grass-pass-pixels-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.fixtureReady;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Canopy fixture did not load');
reports[mode]={};for(const pass of ['main','capture']){reports[mode][pass]=await page.eval(`return window.passPixelRepro.render('${pass}');`);await page.shot(path.join(out,`${mode}-${pass}.png`));}page.close();page=null;}
const pixels=async file=>sharp(path.join(out,file)).removeAlpha().raw().toBuffer();const a=await pixels('baseline-main.png'),b=await pixels('candidate-main.png'),c=await pixels('baseline-capture.png'),d=await pixels('candidate-capture.png');let changed=0;for(let i=0;i<c.length;i+=3)if(Math.max(...[0,1,2].map(k=>Math.abs(c[i+k]-d[i+k])))>10)changed++;
const report={baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/grass/grassMaterial.ts'))).digest('hex'),scope:'Production grass shader/clumps, physical 640x480 canvas and 160x120 four-sample capture target. Capture images are copied to the canvas for inspection. Standalone software WebGL correctness fixture, not whole-scene shimmer or hardware timing.',before:reports.baseline,after:reports.candidate,mainPixelIdentical:a.equals(b),changedCapturePixels:changed,pass:a.equals(b)&&changed>0&&reports.baseline.capture.uniform===480&&reports.candidate.capture.uniform===120&&reports.candidate.main.uniform===480&&Object.values(reports).every(r=>Object.values(r).every(p=>!p.errors.length))};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
