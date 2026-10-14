#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import sharp from 'sharp';
import {summarizePlacementComparison} from './placement-comparison.mjs';
import {createServer} from 'vite';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=path.resolve(args.out??'corrected-world-placement-proof');fs.mkdirSync(out,{recursive:true});
for(const name of ['report.json','before.json.gz','after.json.gz','roots.json.gz','walk-fence.png','run-round.png'])fs.rmSync(path.join(out,name),{force:true});
assert(args.url,'Pass --url for a served 0.0.18 build');
const refs={base:'4234920b2',references:'1915d729b',batch:'566a435a9'};
const read=(ref,file)=>execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8'});
const filename='src/diagnostics/placementAudit.ts',before=read(refs.base,filename),references=read(refs.references,filename),batch=read(refs.batch,filename);
const section=s=>s.slice(s.indexOf('function components('),s.indexOf('const omitted ='));
assert(before.includes(section(read('421d34b',filename))));
let after=before.replace(section(before),section(references));
const anchor='    if (!mesh.isMesh || skeletal(mesh)) return;\n';
const start=batch.indexOf('    // Static batching retains'),end=batch.indexOf('    const label =',start);
assert(start>0&&end>start&&after.includes(anchor));after=after.replace(anchor,anchor+batch.slice(start,end));
const supports=read(refs.base,'src/diagnostics/verticalSupports.ts');
const files=new Map([
 [path.resolve('src/diagnostics/__world-before.ts'),before],
 [path.resolve('src/diagnostics/__world-after.ts'),after],
 [path.resolve('src/diagnostics/verticalSupports.ts'),supports],
]);
const server=await createServer({configFile:false,logLevel:'error',optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'pinned-world-audits',enforce:'pre',resolveId(id){const file=path.resolve(id.replace(/^\//,''));if(files.has(file))return file;},load(id){return files.get(id);}}]});
let page;
try {
 await server.listen();const origin=`http://127.0.0.1:${server.httpServer.address().port}`;
 page=await openPage(args.url,{w:640,h:360,init:args.init?fs.readFileSync(args.init,'utf8'):undefined,requestTimeoutMs:1200000});
 let ready=false;for(let i=0;i<2400;i++){if(await page.eval('return window.tervain?.mode==="play"&&document.title==="READY"')){ready=true;break;}if(i%120===0)console.log(JSON.stringify({loading:true,checks:i}));await page.wait(250);}assert(ready,'Build did not reach play READY');
 await page.eval('tervain.step=()=>{};tervain.render=()=>{};await tervain.world.arrived;');
 const servedBuild=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');assert.equal(servedBuild.version,args['expected-version']??'0.0.18');
 await page.eval(`window.auditBefore=(await import('${origin}/src/diagnostics/__world-before.ts')).auditPlacements;window.auditAfter=(await import('${origin}/src/diagnostics/__world-after.ts')).auditPlacements;`);
 const input=await page.eval(`const w=tervain.world;let maxVertices=100000;w.scene.traverse(o=>{if(o.isMesh&&o.geometry.getAttribute('position'))maxVertices=Math.max(maxVertices,o.geometry.getAttribute('position').count);});return{maxVertices};`);
 const results={};for(const mode of ['before','after']){
  console.log(JSON.stringify({auditStarted:mode,...input}));
  results[mode]=await page.eval(`const w=tervain.world,populations=w.modules.flatMap(m=>m.module.placementAuditTargets?.()??[]),furniture=w.modules.find(m=>m.name==='furniture')?.module;const r=window.audit${mode==='before'?'Before':'After'}(w.scene,(x,z)=>w.terrain.heightAt(x,z),populations,{kind:'prop',maxChecks:100000,maxVertices:${input.maxVertices}});return{...r,furnitureReady:furniture?.arrived!==false};`);
  fs.writeFileSync(path.join(out,`${mode}.json.gz`),gzipSync(JSON.stringify(results[mode])));
  assert(results[mode].complete&&!results[mode].truncated&&results[mode].invalid===0&&results[mode].skipped.length===0&&results[mode].furnitureReady);
  console.log(JSON.stringify({auditFinished:mode,summary:results[mode].summary}));
 }
 const roots=await page.eval(`const w=tervain.world,p=w.modules.flatMap(m=>m.module.placementAuditTargets?.()??[]),expectedRoots=w.modules.find(m=>m.name==='forest')?.module.stats?.().trees;return{expectedRoots,before:auditBefore(w.scene,(x,z)=>w.terrain.heightAt(x,z),p,{kind:'root',maxChecks:20000}),after:auditAfter(w.scene,(x,z)=>w.terrain.heightAt(x,z),p,{kind:'root',maxChecks:20000})};`);
 assert(Number.isInteger(roots.expectedRoots)&&roots.expectedRoots>0);for(const mode of ['before','after'])assert(roots[mode].complete&&roots[mode].summary.roots===roots.expectedRoots&&roots[mode].invalid===0);
 fs.writeFileSync(path.join(out,'roots.json.gz'),gzipSync(JSON.stringify(roots)));
 const comparison=summarizePlacementComparison(results.before,results.after,roots);
 const routes=[{name:'walk-fence',x:-2,z:37.25,radius:10,lookX:-2,lookZ:42},{name:'run-round',x:-12.3,z:44.8,radius:10,lookX:-6,lookZ:40}];
 for(const route of routes){const image=await page.eval(`const t=tervain,c=t.cam.camera,w=t.world;t.settings.reducedMotion=true;c.position.set(${route.x},w.terrain.heightAt(${route.x},${route.z})+2.2,${route.z});c.lookAt(${route.lookX},w.terrain.heightAt(${route.lookX},${route.lookZ})+1,${route.lookZ});c.updateMatrixWorld();t.renderWorld();return t.renderer.domElement.toDataURL();`);const bytes=Buffer.from(image.split(',')[1],'base64');assert((await sharp(bytes).stats()).channels.slice(0,3).some(c=>c.stdev>3));fs.writeFileSync(path.join(out,route.name+'.png'),bytes);}
 const report={servedBuild,refs,...comparison,sourceHashes:Object.fromEntries([['before',before],['after',after],['verticalSupports',supports],['postprocessor',fs.readFileSync('tools/placement-comparison.mjs','utf8')]].map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')])),...input,scope:`One frozen served ${servedBuild.version} world, identical scene/populations/terrain for both public diagnostic implementations. Regional selection uses component centres within 10 m of tracked gate positions. Roots are the registered near/collision wood basal rings, not other LODs or wind deformation. Directional candidates require support review. Context images only; no gameplay replay, hardware timing, quality PASS or production placement change claim.`,pass:true};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,summary:comparison.summary,regions:comparison.regions.map(r=>({name:r.name,before:{checks:r.before.checks,candidates:r.before.candidates},after:{checks:r.after.checks,candidates:r.after.candidates}}))}));
}finally{page?.close();await server.close();}
