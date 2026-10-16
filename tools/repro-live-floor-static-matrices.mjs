import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'floor-static-matrix-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/forestFloor.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source;
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.tervain.world.modules.find(m=>m.name==="forest").module.initializeFloor',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;if(!scopeId)throw Error('Forest initializer scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 for(const scope of scopes){if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){if(variable.value?.type!=='object'||!variable.value.objectId)continue;
   await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this?.terrain===window.tervain.world.terrain&&typeof this.excl?.blocked==="function"&&typeof this.plantedCrowns?.coverAt==="function")window.__floorContext=this;if(Array.isArray(this)&&this.length&&this.every(t=>t&&typeof t.sp==="string"&&Number.isFinite(t.s)&&Number.isFinite(t.radius))&&this.length>(window.__floorTrees?.length??0))window.__floorTrees=this;}',returnByValue:true});
  }
 }
 const report=await page.eval(`
const T=window.tervain,C=window.__floorContext,trees=window.__floorTrees;if(!C||!trees)throw Error('Native floor inputs missing');
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const F=T.world.modules.find(m=>m.name==='forest').module;
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
const nativeFloor=F.group.getObjectByName('deepwood_forest_floor');if(!nativeFloor)throw Error('Native floor missing');
const walk=async group=>{const meshes=group.children.filter(o=>o.isInstancedMesh),saved=meshes.map(m=>m.matrix.compose),worlds=[];if(!meshes.length)throw Error('Empty floor');let calls=0;
 try{for(const m of meshes){const original=m.matrix.compose;m.matrix.compose=function(...args){calls++;return original.apply(this,args);};}
  for(let i=0;i<120;i++){group.position.set(Math.sin(i*.03)*.2,0,Math.cos(i*.03)*.2);group.rotation.y=i*.001;group.scale.setScalar(1+Math.sin(i*.02)*.01);T.world.scene.updateMatrixWorld(true);worlds.push(meshes.map(m=>m.matrixWorld.elements.slice()));}
 }finally{for(let i=0;i<meshes.length;i++)meshes[i].matrix.compose=saved[i];group.position.set(0,0,0);group.rotation.set(0,0,0);group.scale.setScalar(1);T.world.scene.updateMatrixWorld(true);}
 return{batches:meshes.length,walks:120,localComposeCalls:calls,worldMatricesSha256:await hash(worlds),instanceMatricesSha256:await hash(meshes.map(m=>Array.from(m.instanceMatrix.array))),drawnInstanceMatricesSha256:await hash(meshes.map(m=>Array.from(m.instanceMatrix.array.slice(0,m.count*16)))),drawnInstances:meshes.reduce((n,m)=>n+m.count,0)};
};
const rows={native:await walk(nativeFloor)},images={};
const capture=mode=>{T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;images[mode]=T.renderer.domElement.toDataURL('image/png');};capture('native');
for(const mode of ['before','after']){let rebuilt;try{nativeFloor.visible=false;rebuilt=models[mode].buildForestFloor(T.world.terrain,C.excl,T.settings.quality,trees,C.plantedCrowns,C.foliage);F.group.add(rebuilt.group);rebuilt.update(0,{camera:T.cam.camera});rows[mode]=await walk(rebuilt.group);capture(mode);}
 finally{rebuilt?.group.removeFromParent();rebuilt?.dispose();nativeFloor.visible=true;}
}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),trees:trees.length,images,rows};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Actual original/baseline/candidate forest-floor batches in the native published scene. Count target local Matrix4.compose calls during 120 forced whole-scene matrix walks with a moving/rotating/scaled parent, not 120 real gameplay frames. Compare all per-walk batch world matrices, native drawn instance prefixes, full baseline/candidate instance buffers and final native post/MSAA pixels. Unused native buffer tails may retain earlier culling history. No hardware timing or FPS claim.';
 const n=report.rows.native,a=report.rows.before,b=report.rows.after;report.pass=b.instanceMatricesSha256===a.instanceMatricesSha256&&n.batches>0&&n.localComposeCalls===n.batches*120&&a.localComposeCalls===n.localComposeCalls&&b.localComposeCalls===0&&report.identicalPixels&&[a,b].every(r=>r.batches===n.batches&&r.worldMatricesSha256===n.worldMatricesSha256&&r.drawnInstanceMatricesSha256===n.drawnInstanceMatricesSha256&&r.drawCalls===n.drawCalls&&r.triangles===n.triangles&&r.drawnInstances===n.drawnInstances);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
