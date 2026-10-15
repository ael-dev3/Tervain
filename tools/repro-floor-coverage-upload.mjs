#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createServer} from 'vite';import sharp from 'sharp';import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));const ref=args.baseline??'421d34b',out=path.resolve(args.out??'floor-coverage-proof');fs.mkdirSync(out,{recursive:true});for(const f of ['report.json','fixture.png'])fs.rmSync(path.join(out,f),{force:true});
const id=path.resolve('src/presentation/__baseline-floor.ts'),source=execFileSync('git',['show',`${ref}:src/presentation/forestFloor.ts`],{encoding:'utf8'});const server=await createServer({configFile:false,logLevel:'error',optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,ws:false,hmr:false},plugins:[{name:'baseline-floor',enforce:'pre',resolveId(name){if(name==='/src/presentation/__baseline-floor.ts')return id;},load(name){if(name===id)return source;}}]});let page;
try{
 await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/floor-coverage-upload-fixture.html`,{w:320,h:180,requestTimeoutMs:120000});let ready=false;for(let i=0;i<600;i++){const e=await page.eval('return window.floorUploadError');if(e)throw Error(e);if(await page.eval('return !!window.floorUploadProof')){ready=true;break;}await page.wait(100);}assert(ready);
 const r=await page.eval('return floorUploadProof');
 assert.equal(r.before.frames.length,24);assert.equal(r.after.frames.length,24);
 for(const k of ['before','after']){assert.equal(r[k].glError,0);assert.equal(r[k].contextLost,false);assert(r[k].frames.every(f=>f.drawn>10));}
 const render=f=>({stage:f.stage,draws:f.draws,triangles:f.triangles,drawn:f.drawn});assert.deepEqual(r.before.frames.map(render),r.after.frames.map(render));
 const total=(k,stage)=>r[k].frames.filter(f=>f.stage===stage).reduce((n,f)=>n+f.uploadBytes,0);
 const totals={beforeTurn:total('before','turn'),afterTurn:total('after','turn'),beforeWalk:total('before','walk'),afterWalk:total('after','walk')};assert(totals.beforeTurn>0);assert(totals.afterTurn<totals.beforeTurn);assert(totals.afterWalk<=totals.beforeWalk);
 const imageHashes=[];for(let i=0;i<r.before.images.length;i++){
  const a=Buffer.from(r.before.images[i].split(',')[1],'base64'),b=Buffer.from(r.after.images[i].split(',')[1],'base64');assert(a.equals(b));assert((await sharp(b).stats()).channels.slice(0,3).some(c=>c.stdev>3));imageHashes.push(createHash('sha256').update(b).digest('hex'));if(i===2)fs.writeFileSync(path.join(out,'fixture.png'),b);
 }
 delete r.before.images;delete r.after.images;
 const report={baseline:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/forestFloor.ts')).digest('hex'),scope:'Actual medium forest-floor producer and shaders with deterministic terrain and a local ground mesh in native software WebGL. Warm buffers, 18 small pan frames then six walking frames. GL bufferData/bufferSubData byte counts, not texture traffic, hardware timings or a full world/play-gate result.',...r,totals,pixelIdenticalFrames:3,imageHashes,pass:true};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{page?.close();await server.close();}
