#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const ref=args.baseline??'421d34b',out=path.resolve(args.out??'shadowless-warming-proof');fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const baseline=path.resolve('src/__baseline-app.ts'),source=execFileSync('git',['show',`${ref}:src/app.ts`],{encoding:'utf8'});
const server=await createServer({configFile:false,logLevel:'error',define:{__GAME_VERSION__:JSON.stringify(JSON.parse(fs.readFileSync('package.json','utf8')).version),__SOURCE_REVISION__:JSON.stringify('diagnostic-fixture'),__MODEL_ASSET_BASE__:JSON.stringify('')},plugins:[{name:'baseline-app',enforce:'pre',resolveId(id){if(id==='/src/__baseline-app.ts')return baseline},load(id){if(id===baseline)return source}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});
let page;const reports={};
try {
 await server.listen();for(const mode of ['before','after']) {
  page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/shadowless-warming-fixture.html?mode=${mode}`,{w:480,h:360,requestTimeoutMs:600000,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});
  let ready=false;for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return !!window.warmProof')){ready=true;break;}await page.wait(100);}assert(ready);
  const result=await page.eval('return window.warmProof');fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(result.image.split(',')[1],'base64'));delete result.image;reports[mode]=result;assert.equal(result.glError,0);assert.equal(result.contextLost,false);assert(result.draws>0&&result.triangles>0);page.close();page=null;
 }
 assert.equal(reports.before.uploadCalls,0);assert.equal(reports.before.firstDrawCalls,0);assert.equal(reports.after.uploadCalls,1);assert.equal(reports.after.firstDrawCalls,1);
 assert(reports.before.firstVisibleUploadBytes>8*1024*1024);assert(reports.after.firstVisibleUploadBytes<64*1024);assert(reports.after.warmUploadBytes>8*1024*1024);
 for(const key of ['draws','triangles'])assert.equal(reports.before[key],reports.after[key]);
 const before=await sharp(path.join(out,'before.png')).removeAlpha().raw().toBuffer(),after=await sharp(path.join(out,'after.png')).removeAlpha().raw().toBuffer();assert.deepEqual(before,after);assert((await sharp(path.join(out,'before.png')).stats()).channels.slice(0,3).some(c=>c.stdev>3),'blank model capture');
 const report={baseline:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/app.ts')).digest('hex'),scope:'Actual App warmShaders/uploadTextures/firstDraws, native software WebGL, delivered cat and material policy, shadows disabled. Counts source buffer/texture bytes. First-visible RGB identical; no hardware frame-time claim.',...reports,changedRGBChannels:0,pass:true};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{page?.close();await server.close();}
