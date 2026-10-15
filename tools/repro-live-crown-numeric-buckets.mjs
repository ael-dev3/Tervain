import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'crown-numeric-bucket-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/plantedCrowns.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/plantedCrowns.ts','utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const sample='  private sample(x: number, z: number, broadleafOnly: boolean): number {';
 if(!source.includes(sample))throw Error('Crown sample instrumentation site missing');
 let instrumented=source.replace(sample,sample+'\n    proof.queries++;');
 instrumented=instrumented.replace('`${Math.floor(x / HASH)}:${Math.floor(z / HASH)}`','(proof.stringKeys++, `${Math.floor(x / HASH)}:${Math.floor(z / HASH)}`)').replace('?? []','?? (proof.emptyLists++, [])');
 const code=(await transformWithOxc(instrumented,'plantedCrowns.ts')).code.replace(/^export /gm,'');
 modules[mode]=code+'\nconst proof={queries:0,stringKeys:0,emptyLists:0};return{Index:PlantedCrownIndex,proof,seedMask:(geometry,mask)=>masks.set(geometry,mask)};';
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
const buckets=original.field.buckets,crowns=Array.from(new Set(Array.from(buckets.values()).flat())),maskIds=new Map();
for(const c of crowns)if(!maskIds.has(c.mask))maskIds.set(c.mask,maskIds.size);
// Recover an insertion order satisfying every original bucket's relative order. Multiplication order is preserved.
const next=new Map(crowns.map(c=>[c,new Set()])),degree=new Map(crowns.map(c=>[c,0]));
for(const bucket of buckets.values())for(let i=1;i<bucket.length;i++){const a=bucket[i-1],b=bucket[i];if(!next.get(a).has(b)){next.get(a).add(b);degree.set(b,degree.get(b)+1);}}
const order=crowns.filter(c=>degree.get(c)===0);for(let i=0;i<order.length;i++)for(const c of next.get(order[i])){degree.set(c,degree.get(c)-1);if(degree.get(c)===0)order.push(c);}
if(order.length!==crowns.length)throw Error('Native bucket ordering is inconsistent');
const indexes={native:original.field};
for(const mode of ['before','after']){
 const model=models[mode],index=new model.Index(),geometryTokens=new Map();
 for(const c of order){let token=geometryTokens.get(c.mask);if(!token){token={};geometryTokens.set(c.mask,token);model.seedMask(token,c.mask);}index.add(c.broadleaf?'oak':'pine',{x:c.x,z:c.z,s:c.s,yaw:c.yaw},token);}
 indexes[mode]=index;
}
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const manifest=index=>{const rows=[];for(const[k,value]of index.buckets){if(value instanceof Map){for(const[x,bucket]of value)rows.push([x+':'+k,bucket]);}else rows.push([k,value]);}return rows.sort((a,b)=>a[0].localeCompare(b[0])).map(([key,bucket])=>[key,bucket.map(c=>[c.x,c.z,c.s,c.yaw,c.cos,c.sin,c.broadleaf,maskIds.get(c.mask)])]);};
const nativeManifest=JSON.stringify(manifest(indexes.native));
const tiles=layers.flatMap(layer=>Array.from(layer.tiles.values()).map(tile=>({layer,tile})));
const snapshot=()=>tiles.map(({layer,tile:t})=>({layer:layer.group.name,tx:t.tx,tz:t.tz,count:t.count,ymin:t.ymin,ymax:t.ymax,bounds:[...t.geo.boundingSphere.center.toArray(),t.geo.boundingSphere.radius],attributes:t.attrs.map(a=>Array.from(a.array.slice(0,t.count*4)))}));
const initialHash=await hash(snapshot()),rows={},images={};let nativeHash,nativeRaster;
try{
 for(const mode of ['native','before','after']){
  H.tiles=new Map();let coverCalls=0,broadleafCalls=0;const field=indexes[mode];
  H.plantedCrowns={coverAt(x,z){coverCalls++;return field.coverAt(x,z);},broadleafAt(x,z){broadleafCalls++;return field.broadleafAt(x,z);}};
  if(mode!=='native')Object.assign(models[mode].proof,{queries:0,stringKeys:0,emptyLists:0});
  for(const {layer,tile}of tiles)layer.fill(tile,tile.tx,tile.tz);
  const generatedHash=await hash(snapshot()),rasterHash=await hash(Array.from(H.tiles,([key,data])=>[key,Array.from(data)]));
  if(mode==='native'){nativeHash=generatedHash;nativeRaster=rasterHash;}
  rows[mode]={grassTiles:tiles.length,grassInstances:tiles.reduce((n,t)=>n+t.tile.count,0),rasterTiles:H.tiles.size,coverCalls,broadleafCalls,
   ...(mode==='native'?{}:models[mode].proof),bucketLayoutMatches:JSON.stringify(manifest(field))===nativeManifest,
   generatedSha256:generatedHash,rasterSha256:rasterHash,nativeGeneratedMatches:generatedHash===nativeHash,nativeRasterMatches:rasterHash===nativeRaster};
  // Empty cells are controlled probes, separate from the naturally generated tile-query counts above.
  const start=mode==='native'?null:{...models[mode].proof};
  const emptySamples=[field.coverAt(1e8,1e8),field.broadleafAt(-1e8,-1e8)];
  rows[mode].emptyProbes={samples:emptySamples,queries:2,stringKeys:mode==='native'?null:models[mode].proof.stringKeys-start.stringKeys,emptyLists:mode==='native'?null:models[mode].proof.emptyLists-start.emptyLists};
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  Object.assign(rows[mode],{drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textureCount:T.renderer.info.memory.textures});
  images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{H.tiles=original.tiles;H.plantedCrowns=original.field;}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),crowns:crowns.length,masks:maskIds.size,initialGeneratedMatches:initialHash===nativeHash,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Native published grass generator, Habitat, retained canopy masks, tile meshes and post-processing. Baseline/candidate actual Index.add rebuild bucket layouts using retained masks seeded into their mask cache; a topological order preserves every native bucket order. No mask rasterization or visual geometry change. Actual source sample methods count coordinate-string expressions and empty fallback lists during native tile generation, plus separate controlled empty-cell probes; these are source operation counts, not heap/GC/hardware timings.';
 const {before:a,after:b}=report.rows;
 report.pass=report.initialGeneratedMatches&&report.crowns>0&&[a,b].every(r=>r.bucketLayoutMatches&&r.nativeGeneratedMatches&&r.nativeRasterMatches)&&a.queries>0&&a.queries===b.queries&&a.stringKeys===a.queries&&b.stringKeys===0&&b.emptyLists===0&&[a,b].every(r=>r.emptyProbes.samples.every(v=>v===0))&&a.emptyProbes.stringKeys===2&&b.emptyProbes.stringKeys===0&&a.emptyProbes.emptyLists===2&&b.emptyProbes.emptyLists===0&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page.close();}
