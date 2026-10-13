#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'habitat-soft-pixels',ref=args.baseline??'0b45a36';fs.mkdirSync(out,{recursive:true});
const baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/presentation/ground/habitat.ts`],{cwd:root,encoding:'utf8'}),'baseline.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,quote,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',plugins:[{name:'baseline-habitat',resolveId(id){if(id==='/@baseline-habitat')return '\0baseline-habitat';},load(id){if(id==='\0baseline-habitat')return baseline;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});
let page;const reports={};try{await server.listen();const address=server.httpServer.address();for(const mode of ['baseline','indexed']){
page=await openPage(`http://127.0.0.1:${address.port}/tools/habitat-soft-fixture.html?mode=${mode}`,{w:320,h:240});let ready=false;
for(let i=0;i<300;i++){const error=await page.eval('return window.fixtureError;');if(error)throw new Error(error);if(await page.eval('return !!window.habitatSoftRepro;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Canopy fixture did not load');
await page.shot(path.join(out,`${mode}.png`));reports[mode]=await page.eval('return window.habitatSoftRepro;');page.close();page=null;}
const a=await sharp(path.join(out,'baseline.png')).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,'indexed.png')).removeAlpha().raw().toBuffer();
const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,'src/presentation/ground/habitat.ts'))).digest('hex'),scope:reports.indexed.scope,before:reports.baseline,after:reports.indexed,pixelIdentical:a.equals(b),pass:reports.baseline.stats.instances>0&&JSON.stringify(reports.baseline.stats)===JSON.stringify(reports.indexed.stats)&&JSON.stringify(reports.baseline.renderStats)===JSON.stringify(reports.indexed.renderStats)&&JSON.stringify(reports.baseline.attributeHashes)===JSON.stringify(reports.indexed.attributeHashes)&&a.equals(b)};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({beforeStats:report.before.stats,afterStats:report.after.stats,renderStats:report.after.renderStats,attributeBytes:report.after.attributeBytes,attributeArrays:report.after.attributeHashes.length,pixelIdentical:report.pixelIdentical,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
