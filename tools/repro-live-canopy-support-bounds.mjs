import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';

const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'canopy-support-proof',baseline=args['baseline-ref']??'2a13d6c';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/diagnostics/canopyAudit.ts',sources={before:execFileSync('git',['show',baseline+':'+file],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources))modules[mode]=(await transformWithOxc(source+'\nexport { THREE as proofThree };',file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/diagnostics',p)}'`);
const cache=fs.mkdtempSync(path.join(tmpdir(),'canopy-support-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'support-proof',resolveId(id){if(id.startsWith('/@support-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@support-proof-'))return modules[id.slice('\0/@support-proof-'.length)];}}]});
let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:15,w:492,h:320});
 const setup=await page.eval(`const T=window.tervain;T.frame=()=>{};T.present=()=>{};T.lastFrameDt=0;T.settings.reducedMotion=true;
 const F=T.world.modules.find(m=>m.name==='forest').module,targets=[0,1,2].map(lod=>F.canopyAuditTargets(lod));
 const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@support-proof-'+mode);
 const wood=targets[0].find(t=>t.wood?.boundingBox)?.wood;if(!wood)throw Error('Missing native support bounds');
 window.CS={T,F,targets,models,nativeProto:Object.getPrototypeOf(wood.boundingBox),options:lod=>({lod,alpha:false,gap:.75,woodReach:1.5,maxOperations:300000000})};
 return {quality:T.settings.quality,buffer:[T.renderer.domElement.width,T.renderer.domElement.height]};`);
 const rows=[];
 for(let lod=0;lod<3;lod++){
  const row={lod,modes:{}};
  for(const mode of ['native','before','after']){
   const r=await page.eval(`const {T,targets,models,nativeProto,options}=CS,mode=${JSON.stringify(mode)},lod=${lod};
    const proto=mode==='native'?nativeProto:models[mode].proofThree.Box3.prototype,original=proto.distanceToPoint;let queries=0,report;
    try{proto.distanceToPoint=function(point){queries++;return original.call(this,point);};report=mode==='native'?await T.auditCanopies(options(lod)):models[mode].auditCanopies(targets[lod],options(lod));}finally{proto.distanceToPoint=original;}
    return {queries,report};`);
   row.modes[mode]=r;
   console.log(JSON.stringify({lod,mode,queries:r.queries,operations:r.report.operations,summary:r.report.summary}));
  }
  const {native:n,before:a,after:b}=row.modes;
  const nativeCore=Object.fromEntries(Object.keys(a.report).map(k=>[k,n.report[k]]));
  assert.deepEqual(nativeCore,a.report,`LOD ${lod}: original differs from native`);
  assert.deepEqual(a.report,b.report,`LOD ${lod}: candidate report differs`);
  assert.equal(n.queries,a.queries);assert.ok(b.queries<a.queries);
  row.reportSha256=createHash('sha256').update(JSON.stringify(a.report)).digest('hex');row.pass=true;rows.push(row);
 }
 const cpu=[];
 for(const mode of ['before','after'])await page.eval(`CS.models[${JSON.stringify(mode)}].auditCanopies(CS.targets[0],CS.options(0));return null;`);
 for(const mode of ['before','before','after','after','after','before','after','before','before','after','before','after','after','before','after','before']){
  const elapsed=await page.eval(`const start=performance.now();CS.models[${JSON.stringify(mode)}].auditCanopies(CS.targets[0],CS.options(0));return performance.now()-start;`);
  cpu.push({mode,ms:elapsed});console.log(JSON.stringify({cpu:cpu.at(-1)}));
 }
 const visual=[];
 for(const mode of ['before','after']){
  const r=await page.eval(`globalThis.__restoreShadowPartRaster?.();if(globalThis.__tervainCpuNoRaster)throw Error('Native raster required');const {T}=CS,R=T.renderer;
   const cam=T.cam.camera,y=T.world.terrain.heightAt(-55,70);T.player.group.position.set(-55,y,70);cam.position.set(-52,y+2.2,70);cam.lookAt(-75,y+1.2,70);cam.updateMatrixWorld(true);
   T.world.update(0,T.game.state,T.player.group.position,T.settings,15,cam,false);CS.models[${JSON.stringify(mode)}].auditCanopies(CS.targets[0],CS.options(0));
   R.info.reset();T.renderWorld();R.info.reset();T.renderWorld();if(R.getContext().getError())throw Error('GL error');return {cost:{...R.info.render},png:R.domElement.toDataURL('image/png')};`);
  fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(r.png.split(',')[1],'base64'));delete r.png;visual.push(r);
 }
 const [a,b]=await Promise.all(['before','after'].map(m=>sharp(path.join(out,m+'.png')).raw().toBuffer()));assert.ok(a.equals(b),'Native images differ');assert.equal(visual[0].cost.calls,visual[1].cost.calls);assert.equal(visual[0].cost.triangles,visual[1].cost.triangles);
 const detail=await page.eval(`const report=await CS.T.auditCanopies(CS.options(0)),positions=new Map(CS.targets[0].map(t=>[t.label,t.matrix.elements.slice(12,15)]));return {revision:report.revision,version:report.version,worst:report.trees.toSorted((a,b)=>b.detachedCards-a.detachedCards).slice(0,10).map(t=>({label:t.label,species:t.species,detachedCards:t.detachedCards,detachedClumps:t.detachedClumps,position:positions.get(t.label)}))};`);
 const summary=Object.fromEntries(['before','after'].map(mode=>{const values=cpu.filter(r=>r.mode===mode).map(r=>r.ms).sort((a,b)=>a-b);return[mode,{runs:values.length,average:values.reduce((a,b)=>a+b,0)/values.length,p95:values[Math.floor(values.length*.95)],min:values[0],max:values.at(-1)}];}));
 const errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(errors,[]);
 const report={...setup,...detail,rows,cpu,cpuSummary:summary,visual,identicalPixels:true,errors,sourceSha256:Object.fromEntries(Object.entries(sources).map(([k,v])=>[k,createHash('sha256').update(v).digest('hex')])),pass:true,scope:'Native all-tree targets, original/candidate audit implementations. Complete reports, including operation-budget accounting, must be deeply equal at all LODs. CPU timings measure warmed on-demand LOD0 audits, not regular game frames or GPU performance. Native frozen full-scene images after each implementation must match. No tree geometry or generator change.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,cpuSummary:summary,revision:report.revision,visual,errors}));
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
