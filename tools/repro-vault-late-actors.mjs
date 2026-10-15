import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {gzipSync} from 'node:zlib';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const ref=args.baseline??'dcd87c21d',out=args.out??'vault-late-actors-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const baseline=path.resolve('src/presentation/__baseline-player.ts'),source=execFileSync('git',['show',`${ref}:src/presentation/player.ts`],{encoding:'utf8'});
const production=fs.readFileSync('src/presentation/player.ts','utf8');
let candidate=production;
const candidatePath=path.resolve('src/presentation/__candidate-player.ts');
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-player',enforce:'pre',resolveId(id){if(id==='/src/presentation/__baseline-player.ts')return baseline;if(id==='/src/presentation/__candidate-player.ts')return candidatePath;},load(id){if(id===baseline)return source;if(id===candidatePath)return candidate;}}],server:{host:'127.0.0.1',port:0,hmr:false,ws:false},optimizeDeps:{include:['three','@dimforge/rapier3d-compat'],noDiscovery:true}});
let page;const report={baseline:execFileSync('git',['rev-parse',ref],{encoding:'utf8'}).trim(),candidateSourceSha256:createHash('sha256').update(candidate).digest('hex'),productionSourceSha256:createHash('sha256').update(production).digest('hex')};
try {await server.listen();for(const mode of ['before','after']) {
 page=await openPage(`http://127.0.0.1:${server.httpServer.address().port}/tools/vault-late-actors-fixture.html?mode=${mode}`,{w:640,h:360,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});
 let ready=false;for(let i=0;i<1200;i++){const error=await page.eval('return window.fixtureError');if(error)throw Error(error);if(await page.eval('return !!window.vaultProof')){ready=true;break;}await page.wait(100);}assert(ready,'fixture ready');
 report[mode]=await page.eval('return window.vaultProof');await page.shot(path.join(out,mode+'.png'));page.close();page=null;
 assert.equal(report[mode].cases,2592);assert(report[mode].rows.every(r=>!r.injectionOverlap));assert.equal(report[mode].nativeHero,true);assert.equal(report[mode].glError,0);
 }
 for(const key of ['drawCalls','triangles','lines','textures','uploadBytes'])assert.equal(report.before.diagnosticRender[key],report.after.diagnosticRender[key]);
 assert(report.before.penetratingCases>0);assert.equal(report.after.penetratingCases,0);
 assert.equal(report.after.blockedAborts,648);assert.equal(report.after.clearAborts,0);assert(report.after.rows.filter(r=>r.obstacle!=='landing').every(r=>r.grounded));
 const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
 report.clearTrajectoriesIdentical=hash(report.before.rows.filter(r=>r.obstacle!=='landing').map(r=>r.path))===hash(report.after.rows.filter(r=>r.obstacle!=='landing').map(r=>r.path));
 assert(report.clearTrajectoriesIdentical);assert.equal(report.after.worstPenetration,0);
 fs.writeFileSync(path.join(out,'traces.json.gz'),gzipSync(JSON.stringify({before:report.before.rows,after:report.after.rows})));
 for(const side of ['before','after']){report[side].caseRowsSha256=hash(report[side].rows);delete report[side].rows;}
 report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(Object.fromEntries(['before','after'].map(k=>[k,{cases:report[k].cases,penetratingCases:report[k].penetratingCases,worstPenetration:report[k].worstPenetration}]))));
} finally {page?.close();await server.close();}
