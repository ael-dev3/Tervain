import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-frustum-support-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/ground/extentCull.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/ground/extentCull.ts','utf8')};
const stream=execFileSync('git',['show','421d34b:src/presentation/ground/tileStream.ts'],{encoding:'utf8'}),modules={};
const plain=code=>code.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
for(const[mode,source]of Object.entries(sources)){
 if(!source.includes('  const ax = Math.abs(x)'))throw Error('Support instrumentation site missing');
 const helper=(await transformWithOxc(source.replace('  const ax = Math.abs(x)','  proof.supportTests++;\n  const ax = Math.abs(x)'),'extentCull.ts')).code;
 const layer=(await transformWithOxc(stream,'tileStream.ts')).code;
 modules[mode]=plain(helper)+'\n'+plain(layer)+'\nconst proof={supportTests:0};return {method:TileLayer.prototype.inHorizontalView,intersects:horizontalSphereIntersects,proof};';
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
const entries=layers.flatMap(layer=>Array.from(layer.tiles.values(),tile=>({layer,tile}))),methods=layers.map(l=>l.inHorizontalView);
const models=Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([mode,code])=>[mode,new Function(code)()]));
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const rows={},images={};let statesNative;
try{
 for(const mode of ['native','before','after']){
  const states=[];let tests=0;
  layers.forEach((l,i)=>{const impl=mode==='native'?methods[i]:models[mode].method;l.inHorizontalView=function(tile,camera){const result=impl.call(this,tile,camera);tests++;states.push([tile.key,l.group.name,...camera.position.toArray(),result]);return result;};});
  T.lastFrameDt=0;T.renderWorld();T.renderWorld();tests=0;states.length=0;if(mode!=='native')models[mode].proof.supportTests=0;
  T.renderer.info.reset();T.renderWorld();
  const render={planeSupportTests:mode==='native'?null:models[mode].proof.supportTests,tileTests:tests,drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textureCount:T.renderer.info.memory.textures};
  images[mode]=T.renderer.domElement.toDataURL('image/png');
  // Controlled capture views exercise both visible and rejected tiles, preserving each tile's density and prefix.
  for(const{layer,tile}of entries){for(const offset of [2,80]){
   const camera=T.cam.camera.clone();camera.position.copy(tile.geo.boundingSphere.center);camera.position.y+=2;camera.position.z+=offset;camera.lookAt(tile.geo.boundingSphere.center);camera.updateMatrixWorld(true);
   const saved=tile.geo.instanceCount,range={...tile.geo.drawRange};
   tile.mesh.onBeforeRender(T.renderer,W.scene,camera,tile.geo,tile.mesh.material,{});
   tile.mesh.onAfterRender(T.renderer,W.scene,camera,tile.geo,tile.mesh.material,{});
   if(tile.geo.instanceCount!==saved)throw Error('Capture density not restored');tile.geo.setDrawRange(range.start,range.count);
  }}
  const value=JSON.stringify(states);if(mode==='native')statesNative=value;
  rows[mode]={...render,totalSupportTests:mode==='native'?null:models[mode].proof.supportTests,totalTileTests:tests,visibleTests:states.filter(s=>s.at(-1)).length,rejectedTests:states.filter(s=>!s.at(-1)).length,statesSha256:await hash(states),nativeStatesMatch:value===statesNative};
 }
}finally{layers.forEach((l,i)=>l.inHorizontalView=methods[i]);}
let seed=184719;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);let matches=true,visible=0,rejected=0;
for(let i=0;i<2000;i++){
 const frustum={planes:Array.from({length:6},()=>({normal:{x:random()*2-1,y:random()*2-1,z:random()*2-1},constant:(random()-.5)*60}))};
 const sphere={center:{x:(random()-.5)*20,y:(random()-.5)*20,z:(random()-.5)*20},radius:random()*20},half=random()*20;
 const world={elements:[random()*3,random()-.5,random()-.5,0,random()-.5,random()*3,random()-.5,0,random()-.5,random()-.5,random()*3,0,(random()-.5)*40,(random()-.5)*40,(random()-.5)*40,1]};
 const a=models.before.intersects(frustum,sphere,half,world),b=models.after.intersects(frustum,sphere,half,world);if(a!==b)matches=false;if(a)visible++;else rejected++;
}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),tiles:entries.length,rows,images,synthetic:{cases:2000,visible,rejected,matches}};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Actual published grass tiles, native callbacks and full-scene post-processing. Only layer inHorizontalView is replaced by the actual source method bound to its native layer, with baseline/candidate extent helper. Native compiled method is the control. Support-function entry counts; controlled capture cameras; 2000 deterministic sheared/scaled/translated cases. No hardware frame-time claim.';
 const {before:a,after:b}=report.rows;
 report.pass=report.tiles>0&&a.nativeStatesMatch&&b.nativeStatesMatch&&report.identicalPixels&&a.planeSupportTests>b.planeSupportTests&&a.totalSupportTests>b.totalSupportTests&&a.totalTileTests===b.totalTileTests&&a.visibleTests>0&&a.rejectedTests>0&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles&&report.synthetic.matches&&report.synthetic.visible>0&&report.synthetic.rejected>0;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page.close();}
