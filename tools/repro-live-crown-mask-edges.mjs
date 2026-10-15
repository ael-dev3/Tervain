import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'crown-mask-edge-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/plantedCrowns.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/plantedCrowns.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const edge='  const dx = bx - ax, dz = bz - az;';
 if(!source.includes(edge))throw Error('Edge-distance instrumentation site missing');
 const code=(await transformWithOxc(source.replace(edge,'  proof.edgeTests++;\n'+edge).replaceAll('Math.hypot(', '(proof.hypots++, Math.hypot)('),'plantedCrowns.ts')).code.replace(/^export /gm,'');
 modules[mode]=code+'\nconst proof={edgeTests:0,hypots:0};return{Index:PlantedCrownIndex,proof};';
}
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
try{
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
const T=window.tervain,H=window.__habitatProof,layers=window.__habitatProofLayers,original={tiles:H.tiles,field:H.plantedCrowns};
if(!original.field?.buckets)throw Error('Native planted crown buckets missing');
const models=Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([mode,code])=>[mode,new Function(code)()]));
const buckets=original.field.buckets,crowns=Array.from(new Set(Array.from(buckets.values()).flat())),maskIds=new Map(),fingerprints=new WeakMap();
const fingerprint=mask=>{let value=fingerprints.get(mask);if(!value){value=JSON.stringify([mask.minX,mask.minZ,mask.stepX,mask.stepZ,Array.from(mask.cells)]);fingerprints.set(mask,value);}return value;};
for(const c of crowns){const key=fingerprint(c.mask);if(!maskIds.has(key))maskIds.set(key,maskIds.size);}
// Resolve native near-LOD foliage geometries against the actual retained mask corpus.
const geometries=new Set();T.world.scene.traverse(mesh=>{if(mesh.isInstancedMesh&&mesh.name.endsWith(':0:foliage'))geometries.add(mesh.geometry);});
const geometryByMask=new Map();
for(const geometry of geometries){const probe=new original.field.constructor();probe.add('oak',{x:0,z:0,s:1,yaw:0},geometry);const mask=probe.buckets.values().next().value?.[0]?.mask;if(mask&&maskIds.has(fingerprint(mask)))geometryByMask.set(fingerprint(mask),geometry);}
if(geometryByMask.size!==maskIds.size)throw Error('Native near-LOD geometries do not cover the full retained mask corpus: '+geometryByMask.size+'/'+maskIds.size);
// Recover an insertion order satisfying every original bucket's relative order. Multiplication order is preserved.
const next=new Map(crowns.map(c=>[c,new Set()])),degree=new Map(crowns.map(c=>[c,0]));
for(const bucket of buckets.values())for(let i=1;i<bucket.length;i++){const a=bucket[i-1],b=bucket[i];if(!next.get(a).has(b)){next.get(a).add(b);degree.set(b,degree.get(b)+1);}}
const order=crowns.filter(c=>degree.get(c)===0);for(let i=0;i<order.length;i++)for(const c of next.get(order[i])){degree.set(c,degree.get(c)-1);if(degree.get(c)===0)order.push(c);}
if(order.length!==crowns.length)throw Error('Native bucket ordering is inconsistent');
const indexes={native:original.field};
for(const mode of ['before','after']){
 const model=models[mode],index=new model.Index();
 for(const c of order)index.add(c.broadleaf?'oak':'pine',{x:c.x,z:c.z,s:c.s,yaw:c.yaw},geometryByMask.get(fingerprint(c.mask)));
 indexes[mode]=index;
}
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const manifest=index=>{const rows=[];for(const[k,value]of index.buckets){if(value instanceof Map){for(const[x,bucket]of value)rows.push([x+':'+k,bucket]);}else rows.push([k,value]);}return rows.sort((a,b)=>a[0].localeCompare(b[0])).map(([key,bucket])=>[key,bucket.map(c=>[c.x,c.z,c.s,c.yaw,c.cos,c.sin,c.broadleaf,maskIds.get(fingerprint(c.mask))])]);};
const nativeManifest=JSON.stringify(manifest(indexes.native));
const tiles=layers.flatMap(layer=>Array.from(layer.tiles.values()).map(tile=>({layer,tile})));
const snapshot=()=>tiles.map(({layer,tile:t})=>({layer:layer.group.name,tx:t.tx,tz:t.tz,count:t.count,ymin:t.ymin,ymax:t.ymax,bounds:[...t.geo.boundingSphere.center.toArray(),t.geo.boundingSphere.radius],attributes:t.attrs.map(a=>Array.from(a.array.slice(0,t.count*4)))}));
const initialHash=await hash(snapshot()),rows={},images={};let nativeHash,nativeRaster;
try{
 for(const mode of ['native','before','after']){
  H.tiles=new Map();let coverCalls=0,broadleafCalls=0;const field=indexes[mode];
  H.plantedCrowns={coverAt(x,z){coverCalls++;return field.coverAt(x,z);},broadleafAt(x,z){broadleafCalls++;return field.broadleafAt(x,z);}};
  for(const {layer,tile}of tiles)layer.fill(tile,tile.tx,tile.tz);
  const generatedHash=await hash(snapshot()),rasterHash=await hash(Array.from(H.tiles,([key,data])=>[key,Array.from(data)]));
  if(mode==='native'){nativeHash=generatedHash;nativeRaster=rasterHash;}
  rows[mode]={grassTiles:tiles.length,grassInstances:tiles.reduce((n,t)=>n+t.tile.count,0),rasterTiles:H.tiles.size,coverCalls,broadleafCalls,
   ...(mode==='native'?{}:models[mode].proof),bucketLayoutMatches:JSON.stringify(manifest(field))===nativeManifest,
   generatedSha256:generatedHash,rasterSha256:rasterHash,nativeGeneratedMatches:generatedHash===nativeHash,nativeRasterMatches:rasterHash===nativeRaster};
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  Object.assign(rows[mode],{drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textureCount:T.renderer.info.memory.textures});
  images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{H.tiles=original.tiles;H.plantedCrowns=original.field;}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),crowns:crowns.length,masks:maskIds.size,matchedNativeGeometries:geometryByMask.size,initialGeneratedMatches:initialHash===nativeHash,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Native published near-LOD foliage geometry, retained masks, grass generator, Habitat, tile meshes and post-processing. All retained masks must match native near-LOD geometries. Baseline/candidate actual Index.add re-rasterizes the real geometries; topological insertion preserves every bucket order. Actual projected-edge tests and Math.hypot calls during mask construction, not timings. Complete mask data/bucket manifests and native generated raster/buffer/pixel controls must match. No hardware frame-time claim.';
 const {before:a,after:b}=report.rows;
 report.pass=report.initialGeneratedMatches&&report.crowns>0&&report.matchedNativeGeometries===report.masks&&[a,b].every(r=>r.bucketLayoutMatches&&r.nativeGeneratedMatches&&r.nativeRasterMatches)&&a.edgeTests>=b.edgeTests&&b.edgeTests>0&&a.hypots>b.hypots&&a.coverCalls===b.coverCalls&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page.close();}
