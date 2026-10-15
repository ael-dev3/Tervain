import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'habitat-crown-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/ground/habitat.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/ground/habitat.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources))modules[mode]=(await transformWithOxc(source,'habitat.ts')).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-habitat-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'habitat-proof',resolveId(id){if(id.startsWith('/@habitat-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@habitat-proof-'))return modules[id.slice('\0/@habitat-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@habitat-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 await page.eval(`const T=window.tervain,G=T.world.modules.find(m=>m.name==='groundcover').module,iterate=Array.prototype[Symbol.iterator];window.__habitatProofLayers=[];
 T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
 T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
 Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')window.__habitatProofLayers=Array.from({length:2},(_,i)=>this[i]);return iterate.call(this);};
 try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
 if(window.__habitatProofLayers.length!==2)throw Error('Native grass layers missing');`);
 // Read the native generator's retained Habitat through its DevTools closure scope. No source replacement at load.
 const fn=(await page.cdp('Runtime.evaluate',{expression:'window.__habitatProofLayers[0].o.generate',returnByValue:false})).result.result.objectId;
 const properties=(await page.cdp('Runtime.getProperties',{objectId:fn,ownProperties:true})).result;
 const scopeId=properties.internalProperties.find(p=>p.name==='[[Scopes]]')?.value?.objectId;
 if(!scopeId)throw Error('Native generator scopes unavailable');
 const scopes=(await page.cdp('Runtime.getProperties',{objectId:scopeId,ownProperties:true})).result.result;
 let captured=false;
 for(const scope of scopes){
  if(!scope.value?.objectId)continue;
  const variables=(await page.cdp('Runtime.getProperties',{objectId:scope.value.objectId,ownProperties:true})).result.result;
  for(const variable of variables){
   if(variable.value?.type!=='object'||!variable.value?.objectId)continue;
   const r=await page.cdp('Runtime.callFunctionOn',{objectId:variable.value.objectId,functionDeclaration:'function(){if(this && this.terrain===window.tervain.world.terrain && this.tiles instanceof Map && typeof this.sample==="function" && typeof this.woodAt==="function"){window.__habitatProof=this;return true;}return false;}',returnByValue:true});
   if(r.result.result.value){captured=true;break;}
  }
  if(captured)break;
 }
 if(!captured)throw Error('Native Habitat not found in generator closure');
 const report=await page.eval(`
const T=window.tervain,H=window.__habitatProof,layers=window.__habitatProofLayers,models={};
for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@habitat-proof-'+mode);
const original={tiles:H.tiles,evalNode:H.evalNode,field:H.plantedCrowns};if(!original.field)throw Error('Native planted crown field missing');
const tiles=layers.flatMap(layer=>Array.from(layer.tiles.values()).map(tile=>({layer,tile})));
if(!tiles.length)throw Error('Native grass tiles missing');
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const snapshot=()=>tiles.map(({layer,tile:t})=>({layer:layer.group.name,tx:t.tx,tz:t.tz,count:t.count,ymin:t.ymin,ymax:t.ymax,bounds:[...t.geo.boundingSphere.center.toArray(),t.geo.boundingSphere.radius],attributes:t.attrs.map(a=>Array.from(a.array.slice(0,t.count*4)))}));
const initialHash=await hash(snapshot()),rows={},images={};let nativeHash,nativeRasterHash;
try{
 for(const mode of ['native','before','after']){
  H.tiles=new Map();let coverCalls=0,nodes=0;
  H.plantedCrowns={coverAt(x,z){coverCalls++;return original.field.coverAt(x,z);},broadleafAt(x,z){return original.field.broadleafAt(x,z);}};
  const impl=mode==='native'?original.evalNode:models[mode].Habitat.prototype.evalNode;
  H.evalNode=function(...a){nodes++;return impl.apply(this,a);};
  for(const {layer,tile}of tiles)layer.fill(tile,tile.tx,tile.tz);
  const generatedHash=await hash(snapshot()),rasterHash=await hash(Array.from(H.tiles,([key,data])=>[key,Array.from(data)]));
  if(mode==='native'){nativeHash=generatedHash;nativeRasterHash=rasterHash;}
  rows[mode]={grassTiles:tiles.length,grassInstances:tiles.reduce((n,t)=>n+t.tile.count,0),rasterTiles:H.tiles.size,nodes,coverCalls,
   generatedSha256:generatedHash,rasterSha256:rasterHash,nativeGeneratedMatches:generatedHash===nativeHash,nativeRasterMatches:rasterHash===nativeRasterHash};
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
  if(mode!=='native')images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{H.tiles=original.tiles;H.evalNode=original.evalNode;H.plantedCrowns=original.field;}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),initialGeneratedMatches:initialHash===nativeHash,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.scope='Native published Habitat, planted crown field, grass generator, existing tile meshes and renderer. Only evalNode replaced with actual baseline/candidate method, per-arm raster cache reset. Counters wrap native field calls and node evaluations; regenerated active buffers/bounds and raster values must match native. Final native Grade/post pixels compared. Low preset, no hardware timing or historical hitch-resolution claim.';
 const n=report.rows.native,a=report.rows.before,b=report.rows.after;
 report.pass=report.initialGeneratedMatches&&a.nativeGeneratedMatches&&b.nativeGeneratedMatches&&a.nativeRasterMatches&&b.nativeRasterMatches&&n.coverCalls===n.nodes*2&&a.coverCalls===n.coverCalls&&b.nodes===n.nodes&&b.coverCalls===b.nodes&&b.grassInstances>0&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
