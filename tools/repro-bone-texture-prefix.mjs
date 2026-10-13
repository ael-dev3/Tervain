#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import sharp from 'sharp';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=args.out??'bone-texture-proof';fs.mkdirSync(out,{recursive:true});
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const server=await createServer({root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three']}});let page;
try{await server.listen();const address=server.httpServer.address();page=await openPage(`http://127.0.0.1:${address.port}/tools/bone-texture-fixture.html`,{w:512,h:256});let ready=false;
for(let i=0;i<200;i++){if(await page.eval('return !!window.boneTextureRepro;')){ready=true;break;}await page.wait(100);}if(!ready)throw new Error('Bone texture fixture did not load');
await page.shot(path.join(out,'before.png'));await page.eval('window.boneTextureRepro.compact();');await page.shot(path.join(out,'compact-control.png'));const report=await page.eval('return window.boneTextureRepro.report;');const a=await sharp(path.join(out,'before.png')).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,'compact-control.png')).removeAlpha().raw().toBuffer();report.pixelIdentical=a.equals(b);report.pass&&=report.pixelIdentical;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
