import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-trample-batch-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/grass/trample.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source.replace('const shift = new THREE.Vector2();','const shift = (window.__shiftCreations++, new THREE.Vector2());');
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/grass',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="groundcover").module.prepare',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this&&Array.isArray(this.targets)&&this.targets.length===2&&typeof this.stampPass==="function"&&this.uniforms?.uTrample)window.__nativeTrample=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const T=window.tervain,native=window.__nativeTrample;if(!native)throw Error('Native trample field missing');
const models={native:{GrassTrample:native.constructor}};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
const rows={},images={},oldTexture=native.uniforms.tTrample.value,oldField=native.uniforms.uTrample.value.clone();let control,controlPixels;
try{for(const mode of ['native','before','after']){window.__shiftCreations=0;const field=new models[mode].GrassTrample(native.size,native.extent),initial=field.targets.slice(),tuples=new Set([field.targets]),passes=[],oldPass=field.pass,stampBatches=new Set(),oldStampPass=field.stampPass;field.stampPass=function(renderer,stamps,...args){stampBatches.add(stamps);return oldStampPass.call(this,renderer,stamps,...args);};
field.pass=function(renderer,material,target){const u=material.uniforms,n=u.uMoverCount?.value??0;passes.push({target:initial.indexOf(target),previous:initial.findIndex(t=>t.texture===u.tPrev.value),shift:u.uShift.value.toArray(),keep:u.uKeep?.value.toArray()??null,field:u.uField?.value.toArray()??null,movers:n?u.uMovers.value.slice(0,n).map((v,i)=>[...v.toArray(),...u.uMoverVel.value[i].toArray()]):[]});const r=oldPass.call(this,renderer,material,target);tuples.add(this.targets);return r;};
try{
 const pixels=[];let pending=0;
 for(let frame=0;frame<120;frame++){
  const x=-192+frame*.2,z=12+Math.sin(frame*.04)*2;
  field.setMovers([{x,z,radius:.55,weight:.75,vx:12,vz:Math.cos(frame*.04)*.48}],x,z);
  if(frame===50){field.queueStamps(Array.from({length:103},(_,i)=>({x:x+(i%10)*.12,z:z+Math.floor(i/10)*.12,radius:.45,weight:.4})));pending+=103;}
  field.update(T.renderer,x,z,frame===75?.1:1/60);tuples.add(field.targets);
  const data=new Uint16Array(field.size*field.size*4);T.renderer.readRenderTargetPixels(field.targets[0],0,0,field.size,field.size,data);pixels.push(...data);
 }
 const shiftCreations=window.__shiftCreations;
 const serialized=JSON.stringify(passes),pixelBytes=JSON.stringify(pixels);if(mode==='native'){control=serialized;controlPixels=pixelBytes;}
 if(serialized!==control||pixelBytes!==controlPixels)throw Error(mode+' differs from native GPU field/pass sequence');
 if(!passes.some(p=>p.movers.length)||!pixels.some((v,i)=>i%4!==3&&v!==0))throw Error('Empty trample proof');
 rows[mode]={updates:120,passes:passes.length,shiftPasses:passes.filter(p=>p.keep===null).length,targetTuples:tuples.size,stampBatchArrays:stampBatches.size,shiftVectorCreationSites:mode==='native'?null:shiftCreations,queuedStamps:pending,passSequenceSha256:await hash(passes),allFrameFieldSha256:await hash(pixels),matchesNative:true,remainingStamps:field.pendingStamps.length};
 native.uniforms.tTrample.value=field.uniforms.tTrample.value;native.uniforms.uTrample.value.copy(field.uniforms.uTrample.value);
 const oldPrepare=T.world.prepareGrass;try{T.world.prepareGrass=()=>{};T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();if(native.uniforms.tTrample.value!==field.uniforms.tTrample.value)throw Error('Replay field was overwritten');rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;images[mode]=T.renderer.domElement.toDataURL('image/png');}finally{T.world.prepareGrass=oldPrepare;}
}finally{native.uniforms.tTrample.value=oldTexture;native.uniforms.uTrample.value.copy(oldField);field.dispose();}
}}finally{native.uniforms.tTrample.value=oldTexture;native.uniforms.uTrample.value.copy(oldField);}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),size:native.size,extent:native.extent,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Fresh native/baseline/candidate interaction fields at the published field size/extent. 120 scripted moving-focus updates, queued brush burst and catch-up; real software-WebGL passes and exact half-float field bytes compared at every update. Bind each replay field into the native scene for endpoint post/MSAA pixels. Count distinct stamp-batch arrays delivered to actual stampPass calls, not measured heap/GC or hardware timing. Target tuple/shift counters are unchanged controls.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.stampBatchArrays>1&&b.stampBatchArrays===1&&a.targetTuples===b.targetTuples&&a.shiftVectorCreationSites===b.shiftVectorCreationSites&&a.matchesNative&&b.matchesNative&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
