#!/usr/bin/env node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'leaf-prefix-proof',ref=args.baseline??'0b45a36';fs.mkdirSync(out,{recursive:true});
const baselineTs=execFileSync('git',['show',`${ref}:src/presentation/foliage/leafBurst.ts`],{cwd:root,encoding:'utf8'});
const baseline=(await transformWithOxc(baselineTs.replace("'../../world/noise'","'/src/world/noise.ts'"),'baseline.ts')).code;
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-leaf',resolveId(id){if(id==='/@baseline-leaf')return '\0baseline-leaf.ts';},load(id){if(id==='\0baseline-leaf.ts')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','compact']){page=await openPage(`http://127.0.0.1:${address.port}/tools/leaf-prefix-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.leafPrefixRepro;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error(`Hero fixture did not load (${mode}): ${JSON.stringify(page.console())}`);
for(let i=1;i<=120;i++){await page.eval(`window.leafPrefixRepro.step(${i});`);if(i%30===0)await page.shot(path.join(out,`${mode}-${i}.png`));}
reports[mode]=await page.eval('return window.leafPrefixRepro.report;');page.close();page=null;}
const a=reports.baseline,b=reports.compact;const posesEqual=a.poses.every((p,i)=>JSON.stringify(p.matrixWords)===JSON.stringify(b.poses[i].matrixWords));let pixelDifferences=0;
for(const i of [30,60,90,120]){const before=await sharp(path.join(out,`baseline-${i}.png`)).removeAlpha().raw().toBuffer(),after=await sharp(path.join(out,`compact-${i}.png`)).removeAlpha().raw().toBuffer();for(let j=0;j<before.length;j+=3)if(before[j]!==after[j]||before[j+1]!==after[j+1]||before[j+2]!==after[j+2])pixelDifferences++;}
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/foliage/leafBurst.ts'))).digest('hex'),scope:b.scope,beforeTriangles:a.poses[0].triangles,afterTriangles:b.poses[0].triangles,beforeUploadBytes:a.uploadBytes,afterUploadBytes:b.uploadBytes,poses:a.poses.length,matrixDataIdentical:posesEqual,pixelDifferences,pass:posesEqual&&pixelDifferences===0&&b.uploadBytes<a.uploadBytes&&b.poses.every(p=>p.triangles<a.poses[0].triangles)};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'poses.json'),JSON.stringify(reports)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
