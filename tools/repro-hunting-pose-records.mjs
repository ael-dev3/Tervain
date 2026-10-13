#!/usr/bin/env node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'hunting-pose-proof',ref=args.baseline??'0b45a36';fs.mkdirSync(out,{recursive:true});
const baselineTs=execFileSync('git',['show',`${ref}:src/presentation/playerHunting.ts`],{cwd:root,encoding:'utf8'});
const baseline=(await transformWithOxc(baselineTs.replace(/from '(\.\/[^']+)'/g, (_,p)=>`from '/src/presentation/${p.slice(2)}'`),'baseline.ts')).code;
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-hunting',resolveId(id){if(id==='/@baseline-hunting')return '\0baseline-hunting.ts';},load(id){if(id==='\0baseline-hunting.ts')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of args['baseline-only']?['baseline']:['baseline','reused']){page=await openPage(`http://127.0.0.1:${address.port}/tools/hunting-pose-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.huntingPoseRepro;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error(`Hero fixture did not load (${mode}): ${JSON.stringify(page.console())}`);
for(let i=1;i<=120;i++){await page.eval(`window.huntingPoseRepro.step(${i});`);if(i%30===0)await page.shot(path.join(out,`${mode}-${i}.png`));}
reports[mode]=await page.eval('return window.huntingPoseRepro.report;');page.close();page=null;}
if(args['baseline-only']){fs.writeFileSync(path.join(out,'baseline-report.json'),JSON.stringify(reports.baseline)+'\n');console.log(JSON.stringify({baselineClones:reports.baseline.clones,poses:reports.baseline.poses.length}));}else{
const a=reports.baseline,b=reports.reused;const posesEqual=a.poses.every((p,i)=>JSON.stringify(p.transforms)===JSON.stringify(b.poses[i].transforms));let pixelDifferences=0;
for(const i of [30,60,90,120]){const before=await sharp(path.join(out,`baseline-${i}.png`)).removeAlpha().raw().toBuffer(),after=await sharp(path.join(out,`reused-${i}.png`)).removeAlpha().raw().toBuffer();for(let j=0;j<before.length;j+=3)if(before[j]!==after[j]||before[j+1]!==after[j+1]||before[j+2]!==after[j+2])pixelDifferences++;}
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/playerHunting.ts'))).digest('hex'),scope:b.scope,beforeClones:a.clones,afterClones:b.clones,poses:a.poses.length,poseDataIdentical:posesEqual,pixelDifferences,pass:posesEqual&&pixelDifferences===0&&b.clones<a.clones};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');fs.writeFileSync(path.join(out,'poses.json'),JSON.stringify(reports)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;}
}finally{page?.close();await server.close();}
