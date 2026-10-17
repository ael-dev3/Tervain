import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'root-lod-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/flora.ts',sources={},appSources={},modules={};
for(const mode of ['before','after']){
 const ref=mode==='before'?'421d34b':args['candidate-ref'];
 sources[mode]=ref?execFileSync('git',['show',ref+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8');
 appSources[mode]=ref?execFileSync('git',['show',ref+':src/app.ts'],{encoding:'utf8'}):fs.readFileSync('src/app.ts','utf8');
 const source=sources[mode],start=source.indexOf('    placementAuditTargets('),end=source.indexOf('    counts:',start);
 if(start<0||end<0)throw Error('Root adapter not found');
 const adapter=source.slice(start,end).trim().replace(/,$/,'').replace(/^placementAuditTargets/,'function');
 const app=appSources[mode],appStart=app.indexOf('  async auditPlacement('),appEnd=app.indexOf('  private startBenchmark(',appStart);
 if(appStart<0||appEnd<0)throw Error('App root wrapper missing');
 const wrapper=app.slice(appStart,appEnd).trim().replace(/^async auditPlacement/,'async function').replace("const { auditPlacements } = await import('./diagnostics/placementAudit');",'const auditPlacements = window.__nativeRootAudit;');
 modules[mode]=(await transformWithOxc("import * as THREE from 'three';export function makeAdapter(batches){return "+adapter+";}export function makeAppAudit(REVISION,GAME_VERSION){return "+wrapper+";}",'root-proof.ts')).code;
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="forest").module.placementAuditTargets',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(Array.isArray(this)&&this.length&&this.every(b=>b?.variant?.lods&&Array.isArray(b.placements)&&Array.isArray(b.meshes)))window.__rootBatches=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const T=window.tervain,F=T.world.modules.find(m=>m.name==='forest').module,batches=window.__rootBatches;if(!batches)throw Error('Native root batches missing');
const native=await T.auditPlacement({kind:'root',maxChecks:100000});
const url=performance.getEntriesByType('resource').map(e=>e.name).find(n=>/placementAudit-[^/]+\\.js$/.test(n));if(!url)throw Error('Native diagnostic not loaded');
const exports=await import(url);for(const fn of Object.values(exports))if(typeof fn==='function')try{const r=fn(new T.world.scene.constructor(),()=>0,[],{kind:'root'});if(r?.summary&&Array.isArray(r.checks))window.__nativeRootAudit=fn;}catch{}if(!window.__nativeRootAudit)throw Error('Native root audit export missing');
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),original=F.placementAuditTargets,near=original.call(F),labels=new Set(near.map(t=>t.label));
const expected=[0,1,2].map(lod=>F.canopyAuditTargets(lod).filter(t=>labels.has(t.label)&&t.wood));
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();const images={native:T.renderer.domElement.toDataURL('image/png')},rows={};
try{for(const mode of ['before','after']){
 F.placementAuditTargets=models[mode].makeAdapter(batches);const run=models[mode].makeAppAudit(version.revision,version.version),levels=[];
 for(let lod=0;lod<3;lod++){
 const selected=F.placementAuditTargets(lod),reference=expected[lod];
 const geometriesMatch=selected.length===reference.length&&selected.every((t,i)=>t.label===reference[i].label&&t.geometry===reference[i].wood&&t.matrix.elements.every((v,j)=>v===reference[i].matrix.elements[j]));
 const r=await run.call(T,{kind:'root',lod,maxChecks:100000});
 levels.push({lod,selectedTargets:selected.length,geometriesMatch,complete:r.complete,expectedRoots:r.expectedRoots,summary:r.summary,missingRoots:r.expectedRoots-r.summary.roots,candidates:r.checks.filter(c=>c.candidate),maxGap:Math.max(...r.checks.map(c=>c.maxGap))});
 }
 const defaultTargets=F.placementAuditTargets(),defaultNearMatch=defaultTargets.length===near.length&&defaultTargets.every((t,i)=>t.label===near[i].label&&t.geometry===near[i].geometry&&t.matrix.elements.every((v,j)=>v===near[i].matrix.elements[j]));
 rows[mode]={levels,defaultNearMatch};T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;images[mode]=T.renderer.domElement.toDataURL('image/png');
}}finally{F.placementAuditTargets=original;}
return{build:version,nativeNear:{complete:native.complete,summary:native.summary},rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=Object.fromEntries([['flora',sources.after],['app',appSources.after]].map(([name,source])=>[name,createHash('sha256').update(source).digest('hex')]));report.baselineRevision='421d34b';report.scope='Replay actual baseline/candidate forest root adapters and app audit wrapper methods over retained published forest batches. Use the published core root-contact detector unchanged in both modes. Compare selected geometry and every placement matrix with native canopy LOD inventory; count root candidates and require incomplete coverage when wood is missing. Full-scene post/MSAA pixels must remain unchanged. Rest-geometry candidates require visual review; no visual repair or hardware timing claim.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.levels[2].complete&&a.levels[2].summary.candidates===0&&b.levels.every(l=>l.geometriesMatch)&&!b.levels[2].complete&&b.levels[2].missingRoots>0&&b.levels[2].summary.candidates>a.levels[2].summary.candidates&&a.defaultNearMatch&&b.defaultNearMatch&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
