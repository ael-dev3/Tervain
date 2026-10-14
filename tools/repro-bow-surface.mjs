#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const root=fileURLToPath(new URL('../',import.meta.url)),out=path.resolve(args.out??'bow-surface-proof');fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const server=await createServer({root,configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});let page;
try {
 await server.listen();page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/bow-surface-fixture.html`,{w:480,h:480,requestTimeoutMs:600000});
 let ready=false;for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return !!window.bowSurfaceProof')){ready=true;break;}await page.wait(100);}assert(ready,'fixture ready');
 const proof=await page.eval('return window.bowSurfaceProof');assert.equal(proof.nativeHero,true);assert.equal(proof.rows.length,24);assert(proof.rows.every(r=>r.segments>0));assert.equal(proof.captures.length,3);
 for(const capture of proof.captures){assert.equal(capture.glError,0);assert(capture.draws>0&&capture.triangles>0);fs.writeFileSync(path.join(out,capture.state+'.png'),Buffer.from(capture.image.split(',')[1],'base64'));delete capture.image;}
 const carried=proof.rows.filter(r=>!r.state.startsWith('aim')),drawn=proof.rows.filter(r=>r.state.startsWith('aim'));
 proof.summary={carriedSamples:carried.length,carriedCrossingSamples:carried.filter(r=>r.hits>0).length,drawnSamples:drawn.length,drawnCrossingSamples:drawn.filter(r=>r.hits>0).length,crossingSegments:proof.rows.reduce((n,r)=>n+r.hits,0)};
 if(args.expect==='baseline'){assert(proof.rows.every(r=>r.segments===27));assert.equal(proof.summary.carriedCrossingSamples,0);assert.equal(proof.summary.drawnCrossingSamples,8);assert.equal(proof.summary.crossingSegments,18);}
 else if(args.expect==='clear')assert.equal(proof.summary.crossingSegments,0);
 else assert(args.expect===undefined,'expect must be baseline or clear');
 proof.sourceSha256=Object.fromEntries(['public/models/hero/weathered-wanderer-hero-sealed.glb','src/presentation/playerHunting.ts','src/presentation/hero/rig.ts','src/presentation/hero/animation.ts','src/presentation/hero/fingerFit.ts','src/presentation/npc/dualQuaternionSkinning.ts','tools/bow-surface-program.mjs'].map(name=>[name,createHash('sha256').update(fs.readFileSync(path.join(root,name))).digest('hex')]));
 proof.captureValid=true;proof.qualityPass=null;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof.summary));
}finally{page?.close();await server.close();}
