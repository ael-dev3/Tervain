#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'grass-dry-coverage',ref=args.baseline??'5da2776';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/grass/grassMaterial.ts`],{cwd:root,encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation/grass',p)}'`);
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-grass',resolveId(id){if(id==='/@baseline-grass')return '\0baseline-grass';},load(id){if(id==='\0baseline-grass')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','candidate']){
page=await openPage(`http://127.0.0.1:${address.port}/tools/grass-dry-coverage-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.fixtureReady;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Dry-coverage fixture did not load');
reports[mode]={};for(const pass of ['resolved','thin']){reports[mode][pass]=await page.eval(`return window.coverageRepro.render('${pass}');`);await page.shot(path.join(out,`${mode}-${pass}.png`));}page.close();page=null;}
const pixels=async file=>sharp(path.join(out,file)).removeAlpha().raw().toBuffer();const a=await pixels('baseline-resolved.png'),b=await pixels('candidate-resolved.png'),c=await pixels('baseline-thin.png'),d=await pixels('candidate-thin.png');let changed=0;for(let i=0;i<c.length;i+=3)if(Math.max(...[0,1,2].map(k=>Math.abs(c[i+k]-d[i+k])))>10)changed++;
const same=k=>['resolved','thin'].every(p=>JSON.stringify(reports.baseline[p][k])===JSON.stringify(reports.candidate[p][k]));
const assertions={resolvedPixelIdentical:a.equals(b),thinPixelsChanged:changed>0,drawStatsIdentical:same('stats'),texturesIdentical:same('textureCount')&&same('textureImagePayloadBytes')&&same('msaaColorPayloadBytes'),uploadBytesIdentical:same('warmupUploadBytes')&&same('uploadBytes'),nativeMsaa:['baseline','candidate'].every(m=>['resolved','thin'].every(p=>reports[m][p].postSamples===4&&reports[m][p].uploadBytes===0&&!reports[m][p].errors.length))};
const report={baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/grass/grassMaterial.ts'))).digest('hex'),scope:'Production grass shader/clumps and native Grade post/MSAA; fully resolved and subpixel dry leaves. Controlled software-WebGL correctness fixture; whole-scene motion receipts are separate. Texture payload excludes driver overhead and depth buffers; upload bytes exclude uniforms.',before:reports.baseline,after:reports.candidate,changedThinPixels:changed,assertions,pass:Object.values(assertions).every(Boolean)};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
