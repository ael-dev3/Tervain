import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const ref=args.baseline??'421d34b',out=args.out??'vault-slope-proof';fs.mkdirSync(out,{recursive:true});
const baseline=path.resolve('src/presentation/__baseline-player.ts'),source=execFileSync('git',['show',`${ref}:src/presentation/player.ts`],{encoding:'utf8'});
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-player',enforce:'pre',resolveId(id){if(id==='/src/presentation/__baseline-player.ts')return baseline;},load(id){if(id===baseline)return source;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three','@dimforge/rapier3d-compat'],noDiscovery:true}});
let page;const report={baseline:ref,candidateSourceSha256:createHash('sha256').update(fs.readFileSync('src/presentation/player.ts')).digest('hex')};
try {await server.listen();for(const mode of ['before','after']) {
 page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/vault-slope-fixture.html?mode=${mode}&capture-u=${report.before?.captureU??.5}`,{w:640,h:360});
 let ready=false;for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return !!window.vaultProof')){ready=true;break;}await page.wait(100);}assert(ready,'fixture ready');
 report[mode]=await page.eval('return window.vaultProof');await page.shot(path.join(out,mode+'.png'));page.close();page=null;
 assert.equal(report[mode].cases,210);assert.equal(report[mode].allGrounded,true);assert.equal(report[mode].nativeHero,true);assert.equal(report[mode].glError,0);
 }
 assert(report.before.penetratingCases>0);assert.equal(report.after.penetratingCases,0);
 report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(['before','after'].map(k=>[k,{cases:report[k].cases,penetratingCases:report[k].penetratingCases,worstPenetration:report[k].worstPenetration}]))));
} finally {page?.close();await server.close();}
