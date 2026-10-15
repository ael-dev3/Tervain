import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'ground-field-rotation-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const read=(ref,file)=>execFileSync('git',['show',ref+':'+file],{encoding:'utf8'});
const candidate=file=>args['candidate-ref']?read(args['candidate-ref'],file):fs.readFileSync(file,'utf8');
const sources={before:read('805812bab','src/presentation/ground/habitat.ts'),after:candidate('src/presentation/ground/habitat.ts')},modules={};
const splats={before:read('805812bab','src/presentation/groundSplat.ts'),after:candidate('src/presentation/groundSplat.ts')};
const coasts={before:read('805812bab','src/world/coast.ts'),after:candidate('src/world/coast.ts')},needle='export const shoreDistance = (x: number, z: number) => x - coastX(z);';
function measuredCoast(source){
 if(!source.includes('fbm(x / 12, z / 14, 2, 211)'))throw Error('Shelf noise counter site missing');
 source=source.replaceAll('fbm(x / 12, z / 14, 2, 211)', '(proof.shelfNoise++, fbm(x / 12, z / 14, 2, 211))').replace(/export function coastalShelf(?:At|Height)\(x: number, z: number\): number \{/g,m=>m+' proof.shelfCalls++;');
 if(!source.includes(needle)||!source.includes('export function seaWetness('))throw Error('Shoreline counter sites missing');
 return 'export const proof={calls:0,wetnessCalls:0,noiseCalls:0,shelfCalls:0,shelfNoise:0};\n'+source.replace(needle,'export const shoreDistance = (x: number, z: number) => (proof.calls++, x - coastX(z));').replace('function shoreNoise(z: number) {','function shoreNoise(z: number) { proof.noiseCalls++;').replace(/export function seaWetness[^\n]*\{/,m=>m+' proof.wetnessCalls++;');
}
function measuredSplat(source){
 if(!source.includes('function inField(x: number, z: number) {'))throw Error('Field query counter site missing');
 return 'export const fieldProof={queries:0,trig:0};\n'+source.replace('function inField(x: number, z: number) {','function inField(x: number, z: number) { fieldProof.queries++;').replaceAll('Math.cos(f.yaw)','(fieldProof.trig++, Math.cos(f.yaw))').replaceAll('Math.sin(f.yaw)','(fieldProof.trig++, Math.sin(f.yaw))').replaceAll('Math.cos(field.yaw)','(fieldProof.trig++, Math.cos(field.yaw))').replaceAll('Math.sin(field.yaw)','(fieldProof.trig++, Math.sin(field.yaw))');
}
async function compile(source,file){return (await transformWithOxc(source,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/'+path.posix.dirname(file),p)}'`);}
for(const mode of ['before','after']){
 modules['/@shore-coast-'+mode]=await compile(measuredCoast(coasts[mode]),'src/world/coast.ts');
 modules['/@shore-splat-'+mode]=(await compile(measuredSplat(splats[mode]),'src/presentation/groundSplat.ts')).replaceAll("'/src/world/coast'","'/@shore-coast-"+mode+"'");
 modules['/@shore-proof-'+mode]=(await compile(sources[mode],'src/presentation/ground/habitat.ts')).replaceAll("'/src/world/coast'","'/@shore-coast-"+mode+"'").replaceAll("'/src/presentation/groundSplat'","'/@shore-splat-"+mode+"'")+"\nexport {proof as coastProof} from '/@shore-coast-"+mode+"';";
}
for(const mode of ['before','after'])modules['/@shore-proof-'+mode]+="\nexport {fieldProof,groundSplat} from '/@shore-splat-"+mode+"';";
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-shore-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'shore-proof',resolveId(id){if(id.startsWith('/@shore-'))return '\0'+id;},load(id){if(id.startsWith('\0/@shore-'))return modules[id.slice(1)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@shore-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
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
for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@shore-proof-'+mode);
const moduleTrig=Object.fromEntries(Object.entries(models).map(([mode,m])=>[mode,m.fieldProof.trig]));
const original={tiles:H.tiles,evalNode:H.evalNode,field:H.plantedCrowns,surfaceSample:H.surfaceSample};H.surfaceSample={slope:0,carve:0,shoreDistance:0};if(!original.field)throw Error('Native planted crown field missing');
const tiles=layers.flatMap(layer=>Array.from(layer.tiles.values()).map(tile=>({layer,tile})));
if(!tiles.length)throw Error('Native grass tiles missing');
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const snapshot=()=>tiles.map(({layer,tile:t})=>({layer:layer.group.name,tx:t.tx,tz:t.tz,count:t.count,ymin:t.ymin,ymax:t.ymax,bounds:[...t.geo.boundingSphere.center.toArray(),t.geo.boundingSphere.radius],attributes:t.attrs.map(a=>Array.from(a.array.slice(0,t.count*4)))}));
const initialHash=await hash(snapshot()),rows={},images={};let nativeHash,nativeRasterHash;
try{
 for(const mode of ['native','before','after']){
  H.tiles=new Map();let coverCalls=0,nodes=0;
  if(mode!=='native')Object.assign(models[mode].fieldProof,{queries:0,trig:0});
  if(mode!=='native')Object.assign(models[mode].coastProof,{calls:0,wetnessCalls:0,noiseCalls:0,shelfCalls:0,shelfNoise:0});
  H.plantedCrowns={coverAt(x,z){coverCalls++;return original.field.coverAt(x,z);},broadleafAt(x,z){return original.field.broadleafAt(x,z);}};
  const impl=mode==='native'?original.evalNode:models[mode].Habitat.prototype.evalNode;
  H.evalNode=function(...a){nodes++;return impl.apply(this,a);};
  const terrain=H.terrain,terrainCalls={heightAt:0,slopeAt:0,carveAt:0},methods={};
  for(const key of Object.keys(terrainCalls)){methods[key]=terrain[key];terrain[key]=function(...a){terrainCalls[key]++;return methods[key].apply(this,a);};}
  try{for(const {layer,tile}of tiles)layer.fill(tile,tile.tx,tile.tz);}finally{for(const key of Object.keys(terrainCalls))terrain[key]=methods[key];}
  const generatedHash=await hash(snapshot()),rasterHash=await hash(Array.from(H.tiles,([key,data])=>[key,Array.from(data)]));
  if(mode==='native'){nativeHash=generatedHash;nativeRasterHash=rasterHash;}
  rows[mode]={grassTiles:tiles.length,grassInstances:tiles.reduce((n,t)=>n+t.tile.count,0),rasterTiles:H.tiles.size,nodes,coverCalls,terrainCalls,shoreCalls:mode==='native'?null:models[mode].coastProof.calls,wetnessCalls:mode==='native'?null:models[mode].coastProof.wetnessCalls,fieldQueries:mode==='native'?null:models[mode].fieldProof.queries,initializationTrig:mode==='native'?null:moduleTrig[mode],runtimeTrig:mode==='native'?null:models[mode].fieldProof.trig,shelfCalls:mode==='native'?null:models[mode].coastProof.shelfCalls,shelfNoise:mode==='native'?null:models[mode].coastProof.shelfNoise,noiseCalls:mode==='native'?null:models[mode].coastProof.noiseCalls,
   generatedSha256:generatedHash,rasterSha256:rasterHash,nativeGeneratedMatches:generatedHash===nativeHash,nativeRasterMatches:rasterHash===nativeRasterHash};
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
  rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
  images[mode]=T.renderer.domElement.toDataURL('image/png');
 }
}finally{H.tiles=original.tiles;H.evalNode=original.evalNode;H.plantedCrowns=original.field;if(original.surfaceSample===undefined)delete H.surfaceSample;else H.surfaceSample=original.surfaceSample;}
const {FIELDS}=await import(${JSON.stringify(origin)}+'/src/world/layout.ts'),fieldProbes={};
const points=[];for(const f of FIELDS){const c=Math.cos(f.yaw),s=Math.sin(f.yaw);for(const lx of [-f.w/2-1e-6,-f.w/2,-f.w/2+1e-6,0,f.w/2-1e-6,f.w/2,f.w/2+1e-6])for(const lz of [-f.d/2-1e-6,-f.d/2,-f.d/2+1e-6,0,f.d/2-1e-6,f.d/2,f.d/2+1e-6])points.push([f.x+lx*c+lz*s,f.z-lx*s+lz*c]);}
for(const mode of ['before','after']){const data=points.map(([x,z])=>{const weights=new Float32Array(8),wet=models[mode].groundSplat(H.terrain,x,z,weights,original.field);return[x,z,wet,...weights];});if(!data.flat().every(Number.isFinite))throw Error('Nonfinite field boundary sample');fieldProbes[mode]={count:data.length,sha256:await hash(data)};}
return{fieldProbes,build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),initialGeneratedMatches:initialHash===nativeHash,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.coastSha256=createHash('sha256').update(coasts.after).digest('hex');report.baselineRevision='805812bab';report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.groundSplatSha256=createHash('sha256').update(splats.after).digest('hex');report.scope='Native published Habitat, planted crown field, grass generators, tile meshes and renderer. Replace only evalNode with baseline/candidate methods and their matching groundSplat dependencies. Both dependencies share one instrumented coastline module per arm, re-exporting its actual counter binding. Reset each raster cache and refill actual native tile buffers. Counts cover this coastline module, not every shoreline evaluation elsewhere in the world. Baseline includes the previous habitat and coast-row reuse. Count runtime crop-field rotation evaluations inside groundSplat inField; reset counters after module initialization. Terrain and other imports are outside the counter scope. Fixed module-initialization rotations are excluded, not claimed eliminated. No prior savings are attributed here. Exact full buffers, bounds, rasters and native Grade/post pixels required. Low preset, no hardware timing or hitch-resolution claim';
 const n=report.rows.native,a=report.rows.before,b=report.rows.after;
 report.pass=report.fieldProbes.before.count===147&&report.fieldProbes.before.sha256===report.fieldProbes.after.sha256&&report.initialGeneratedMatches&&a.nativeGeneratedMatches&&b.nativeGeneratedMatches&&a.nativeRasterMatches&&b.nativeRasterMatches&&a.nodes===b.nodes&&a.wetnessCalls===b.wetnessCalls&&a.shoreCalls===a.nodes&&b.shoreCalls===b.nodes&&a.noiseCalls===b.noiseCalls&&a.shelfCalls===b.shelfCalls&&a.shelfCalls>0&&a.shelfNoise===b.shelfNoise&&a.fieldQueries===a.nodes&&a.fieldQueries===b.fieldQueries&&a.runtimeTrig>0&&b.runtimeTrig===0&&a.terrainCalls.heightAt===b.terrainCalls.heightAt&&a.terrainCalls.slopeAt===b.terrainCalls.slopeAt&&a.terrainCalls.carveAt===b.terrainCalls.carveAt&&b.grassInstances>0&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
