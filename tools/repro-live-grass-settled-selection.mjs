import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'grass-settled-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/ground/tileStream.ts',sources={before:execFileSync('git',['show','77c6866:'+file],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')};
const ids=Object.fromEntries(Object.entries(sources).map(([k,s])=>[path.resolve('src/presentation/ground/__settled-'+k+'.ts'),s]));
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'settled-layer-proof',enforce:'pre',resolveId(id){if(id.startsWith('/src/presentation/ground/__settled-'))return path.resolve(id.slice(1));},load(id){return ids[id];}}],server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:args.quality??'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,W=T.world,G=W.modules.find(m=>m.name==='groundcover').module,iterate=Array.prototype[Symbol.iterator];let layers;
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,W.terrain.groundAt(-180,12),12,W.terrain,W.colliders,true,0);T.cam.camera.updateMatrixWorld(true);T.lastFrameDt=0;W.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=Array.from({length:2},(_,i)=>this[i]);return iterate.call(this);};
try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
if(layers?.length!==2)throw Error('Native grass layers missing');
for(let i=0;i<200;i++){for(const l of layers)l.update(T.cam.camera.position,{remaining:100000,deadline:Infinity});if(layers.every(l=>l.wantList.length===0))break;}
if(layers.some(l=>l.wantList.length))throw Error('Reserve did not settle');
const methods={native:layers[0].update};for(const mode of ['before','after']){const M=await import(${JSON.stringify(origin)}+'/src/presentation/ground/__settled-'+mode+'.ts');methods[mode]=M.TileLayer.prototype.update;}
const entries=layers.flatMap(layer=>Array.from(layer.tiles.values(),tile=>({layer,tile}))),saved=layers.map(l=>({update:l.update,dist:l.distTo,select:l.instanceCountAt,valid:l.selectionValid,hadValid:Object.hasOwn(l,'selectionValid')}));
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(v=>v.toString(16).padStart(2,'0')).join('');
const state=()=>layers.map(l=>({name:l.group.name,stats:[l.visibleInstances,l.visibleTriangles,l.drawCalls,l.activeTiles],tiles:Array.from(l.tiles.values(),t=>[t.key,t.mesh.visible,t.geo.instanceCount,t.drawCount])}));
const cam=T.cam.camera,originalPosition=cam.position.clone(),originalRotation=cam.quaternion.clone(),rows={},images={};
try{
 for(const mode of ['native','before','after']){
  cam.position.copy(originalPosition);cam.quaternion.copy(originalRotation);cam.updateMatrixWorld(true);
  let distances=0,selections=0;
  layers.forEach((l,i)=>{l.update=methods[mode];l.selectionValid=false;l.distTo=function(...a){distances++;return saved[i].dist.apply(this,a);};l.instanceCountAt=function(...a){selections++;return saved[i].select.apply(this,a);};l.update(cam.position,{remaining:0});});
  const initial=await hash(state());distances=selections=0;
  for(let i=0;i<120;i++)for(const l of layers)l.update(cam.position,{remaining:0});
  const settled={distances,selections,statesMatch:await hash(state())===initial,statesSha256:await hash(state())};
  distances=selections=0;cam.position.y+=.125;cam.updateMatrixWorld(true);for(const l of layers)l.update(cam.position,{remaining:0});
  const moved={distances,selections,statesSha256:await hash(state())};cam.position.copy(originalPosition);cam.updateMatrixWorld(true);for(const l of layers)l.update(cam.position,{remaining:0});
  for(const l of layers){l.enabled=false;l.update(cam.position);}const disabled=layers.every(l=>!l.group.visible&&l.drawCalls===0&&l.visibleInstances===0);
  distances=selections=0;for(const l of layers){l.enabled=true;l.update(cam.position,{remaining:0});}
  const reenabled={distances,selections,statesMatch:await hash(state())===initial};
  const captures=[];for(const{layer,tile}of entries)for(const offset of[2,80]){
   const c=cam.clone();c.position.copy(tile.geo.boundingSphere.center);c.position.y+=2;c.position.z+=offset;c.lookAt(tile.geo.boundingSphere.center);c.updateMatrixWorld(true);
   const count=tile.geo.instanceCount,range={...tile.geo.drawRange};tile.mesh.onBeforeRender(T.renderer,W.scene,c,tile.geo,tile.mesh.material,{});
   captures.push([layer.group.name,tile.key,offset,tile.geo.instanceCount,tile.geo.drawRange.count]);tile.mesh.onAfterRender(T.renderer,W.scene,c,tile.geo,tile.mesh.material,{});
   if(tile.geo.instanceCount!==count)throw Error('Capture density not restored');tile.geo.setDrawRange(range.start,range.count);
  }
  const passes=[];for(const turn of[0,.5]){
   cam.quaternion.copy(originalRotation);cam.rotateY(turn);cam.updateMatrixWorld(true);for(const l of layers)l.update(cam.position,{remaining:0});
   T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();images[mode+'-'+turn]=T.renderer.domElement.toDataURL('image/png');
   passes.push({turn,drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures});
  }
  rows[mode]={settled,moved,disabled,reenabled,capturesSha256:await hash(captures),passes};
 }
 const vis=layers.map(l=>l.group.visible);try{for(const l of layers)l.group.visible=false;T.renderWorld();images.hidden=T.renderer.domElement.toDataURL('image/png');}finally{layers.forEach((l,i)=>l.group.visible=vis[i]);}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),tiles:entries.length,rows,images};
}finally{layers.forEach((l,i)=>{l.update=saved[i].update;l.distTo=saved[i].dist;l.instanceCountAt=saved[i].select;if(saved[i].hadValid)l.selectionValid=saved[i].valid;else delete l.selectionValid;});cam.position.copy(originalPosition);cam.quaternion.copy(originalRotation);cam.updateMatrixWorld(true);}
`);
 for(const[name,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 let pixelDifferences=0,grassPixels=0;for(const turn of[0,.5]){
  const raw=async mode=>sharp(path.join(out,mode+'-'+turn+'.png')).removeAlpha().raw().toBuffer();const [native,before,after]=await Promise.all([raw('native'),raw('before'),raw('after')]);
  for(let i=0;i<native.length;i+=3)if([0,1,2].some(j=>native[i+j]!==before[i+j]||native[i+j]!==after[i+j]))pixelDifferences++;
 }
 const a=await sharp(path.join(out,'after-0.5.png')).removeAlpha().raw().toBuffer(),hidden=await sharp(path.join(out,'hidden.png')).removeAlpha().raw().toBuffer();for(let i=0;i<a.length;i+=3)if([0,1,2].some(j=>a[i+j]!==hidden[i+j]))grassPixels++;
 report.quality=args.quality??'low';report.pixelDifferences=pixelDifferences;report.visibleGrassPixels=grassPixels;report.sourceSha256=Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,createHash('sha256').update(s).digest('hex')]));
 const {native,before,after}=report.rows;report.pass=pixelDifferences===0&&grassPixels>0&&native.settled.distances>0&&native.settled.distances===before.settled.distances&&after.settled.distances===0&&after.settled.selections===0&&Object.values(report.rows).every(r=>r.settled.statesMatch&&r.disabled&&r.reenabled.statesMatch&&r.moved.distances>0&&r.reenabled.distances>0&&r.settled.statesSha256===native.settled.statesSha256&&r.moved.statesSha256===native.moved.statesSha256&&r.capturesSha256===native.capturesSha256&&JSON.stringify(r.passes)===JSON.stringify(native.passes));
 report.scope='Published native grass tiles and buffers. Before/candidate production update methods run on the same settled layers. Compares state/counters, movement and enable/disable controls, independent near/far capture selection and native post/MSAA draws at two camera orientations. The hidden-grass control proves visible coverage. Only update selection is changed; per-pass frustum culling and shader animation remain native. Software WebGL, no hardware frame-time claim.';
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
