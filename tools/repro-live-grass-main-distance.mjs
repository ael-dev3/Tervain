import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-main-distance-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/ground/tileStream.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/ground/tileStream.ts','utf8')};
const callbacks={};for(const[mode,source]of Object.entries(sources)){
 const start=source.indexOf('mesh.onBeforeRender = '),end=source.indexOf(';\n      // Captures',start);
 if(start<0||end<0)throw Error('Grass callback extraction site missing');
 callbacks[mode]=source.slice(start+'mesh.onBeforeRender = '.length,end);
}
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
try{
 const report=await page.eval(`
const T=window.tervain,W=T.world,G=W.modules.find(m=>m.name==='groundcover').module,iterate=Array.prototype[Symbol.iterator];let layers;
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,W.terrain.groundAt(-180,12),12,W.terrain,W.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
W.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=Array.from({length:2},(_,i)=>this[i]);return iterate.call(this);};
try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
if(layers?.length!==2)throw Error('Native grass layers missing');
const entries=layers.flatMap(layer=>Array.from(layer.tiles.values(),tile=>({layer,tile,before:tile.mesh.onBeforeRender,after:tile.mesh.onAfterRender}))),distanceMethods=layers.map(l=>l.distTo);
const factory=Object.fromEntries(Object.entries(${JSON.stringify(callbacks)}).map(([mode,code])=>[mode,new Function('tile','geo','o','return '+code)]));
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const rows={},images={};let statesNative;
try{
 for(const mode of ['native','before','after']){
  let distances=0,mainDraws=0,captureDraws=0;const states=[];
  layers.forEach((l,i)=>{l.distTo=function(...a){distances++;return distanceMethods[i].apply(this,a);};});
  for(const{layer,tile,before,after}of entries){
   const impl=mode==='native'?before:factory[mode].call(layer,tile,tile.geo,layer.o);
   tile.mesh.onBeforeRender=function(...a){const e=a[2].matrixWorld.elements,main=e[12]===layer.drawFocus.x&&e[13]===layer.drawFocus.y&&e[14]===layer.drawFocus.z;if(main)mainDraws++;else captureDraws++;impl.apply(this,a);states.push([tile.key,layer.group.name,main,tile.geo.instanceCount,tile.geo.drawRange.start,tile.geo.drawRange.count]);};
   tile.mesh.onAfterRender=after;
  }
  // Repeated native full-scene post/MSAA draws; no scene or camera policy substitution.
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();distances=0;mainDraws=0;captureDraws=0;states.length=0;
  T.renderer.info.reset();T.renderWorld();
  const render={distances,mainDraws,captureDraws,drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textureCount:T.renderer.info.memory.textures};
  images[mode]=T.renderer.domElement.toDataURL('image/png');
  // Near and far capture cameras on each actual tile, including restoration.
  for(const{layer,tile}of entries){for(const offset of [2,80]){
   const camera=T.cam.camera.clone();camera.position.copy(tile.geo.boundingSphere.center);camera.position.y+=2;camera.position.z+=offset;camera.lookAt(tile.geo.boundingSphere.center);camera.updateMatrixWorld(true);
   const saved=tile.geo.instanceCount,range={...tile.geo.drawRange};
   tile.mesh.onBeforeRender(T.renderer,W.scene,camera,tile.geo,tile.mesh.material,{});
   tile.mesh.onAfterRender(T.renderer,W.scene,camera,tile.geo,tile.mesh.material,{});
   if(tile.geo.instanceCount!==saved)throw Error('Capture density was not restored');
   tile.geo.setDrawRange(range.start,range.count);
  }}
  const stateJson=JSON.stringify(states);if(mode==='native')statesNative=stateJson;
  rows[mode]={...render,totalDistances:distances,totalMainDraws:mainDraws,totalCaptureDraws:captureDraws,statesSha256:await hash(states),nativeStatesMatch:stateJson===statesNative};
 }
}finally{layers.forEach((l,i)=>l.distTo=distanceMethods[i]);for(const{tile,before,after}of entries){tile.mesh.onBeforeRender=before;tile.mesh.onAfterRender=after;}}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),tiles:entries.length,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Actual published grass tile meshes and native renderer. Baseline/candidate onBeforeRender callback bodies transplanted verbatim from source with native layer/tile/geometry bindings; native compiled callback is the control. Native full-scene Grade/post draw plus two controlled capture-camera distances per tile. Counts are distance calls, not hardware timings or a claim that historical stalls are resolved.';
 const {native:n,before:a,after:b}=report.rows;
 report.pass=report.tiles>0&&a.nativeStatesMatch&&b.nativeStatesMatch&&report.identicalPixels&&a.mainDraws>0&&a.distances===n.distances&&a.totalCaptureDraws>0&&b.totalCaptureDraws===a.totalCaptureDraws&&a.totalDistances-b.totalDistances===a.totalMainDraws&&b.distances===b.captureDraws&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page.close();}
