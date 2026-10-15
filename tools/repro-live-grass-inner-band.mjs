import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-inner-band-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/presentation/ground/tileStream.ts'],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':src/presentation/ground/tileStream.ts'],{encoding:'utf8'}):fs.readFileSync('src/presentation/ground/tileStream.ts','utf8')},modules={};
const noise=(await transformWithOxc(fs.readFileSync('src/world/noise.ts','utf8'),'noise.ts')).code.replace(/^export /gm,'');
for(const[mode,source]of Object.entries(sources)){
 const code=(await transformWithOxc(source,'tileStream.ts')).code.replace(/^import[^\n]*\n/gm,'').replace(/^export /gm,'');
 modules[mode]=noise+'\n'+code+'\nreturn TileLayer.prototype.update;';
}
let page;
try{
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,G=T.world.modules.find(m=>m.name==='groundcover').module,iterate=Array.prototype[Symbol.iterator];let layers;
Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=[this[0],this[1]];return iterate.call(this);};
try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
if(!layers)throw Error('Native grass layers missing');
const models=Object.fromEntries(Object.entries(${JSON.stringify(modules)}).map(([k,v])=>[k,new Function(v)()]));
const originals=layers.map(l=>l.update),queries=[],snapshots=new Map();
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();
for(let frame=0;frame<120;frame++){
 const x=-180+12*frame/119,z=12+5*frame/119;T.cam.yaw=.8+frame*.025;
 T.cam.follow(1/60,x,T.world.terrain.groundAt(x,z),z,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
 G.prepare(T.renderer,0);G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});
 const cam=T.cam.camera.position.toArray();
 layers.forEach((layer,index)=>{for(const tile of layer.tiles.values()){
  let snap=snapshots.get(tile);if(!snap||snap.tx!==tile.tx||snap.tz!==tile.tz){snap={tx:tile.tx,tz:tile.tz,key:tile.key,count:tile.count,x0:tile.x0,z0:tile.z0,ymin:tile.ymin,ymax:tile.ymax,attrs:[{array:tile.attrs[0].array.slice(0,tile.count*4)}]};snapshots.set(tile,snap);}
  queries.push({index,tile:snap,cam,frame,expected:[tile.mesh.visible,tile.geo.instanceCount,tile.drawCount,tile.geo.drawRange.start,tile.geo.drawRange.count]});
 }});
}
if(!queries.length)throw Error('No native tile decisions');
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
const rows={},images={};let control;
for(const mode of ['native','before','after']){
 const results=[],counts=layers.map(l=>({name:l.group.name,queries:0,farthestCalls:0}));
 for(const q of queries){
  const layer=layers[q.index],host=Object.create(layer),tile={...q.tile,mesh:{visible:false},geo:{instanceCount:0,drawRange:{start:q.expected[3],count:q.expected[4]},setDrawRange(start,count){this.drawRange={start,count};}}};
  Object.assign(host,{tiles:new Map([[0,tile]]),wantList:[],pool:[],first:false,drawFocus:{copy(){}},group:{visible:true},key:()=>0,release(){throw Error('Recorded native tile unexpectedly released');},acquire(){throw Error('Unexpected generation');}});
  host.farthest=function(...a){counts[q.index].farthestCalls++;return layer.farthest.apply(this,a);};
  const method=mode==='native'?originals[q.index]:models[mode];method.call(host,{x:q.cam[0],y:q.cam[1],z:q.cam[2]},{remaining:0});
  const result=[tile.mesh.visible,tile.geo.instanceCount,tile.drawCount,tile.geo.drawRange.start,tile.geo.drawRange.count];
  if(result.some((v,i)=>!Object.is(v,q.expected[i])))throw Error(mode+' differs from native tile decision');
  results.push(result);counts[q.index].queries++;
 }
 const serialized=JSON.stringify(results);if(mode==='native')control=serialized;
 rows[mode]={nativeDecisionsMatch:serialized===control,decisionsSha256:await hash(results),farthestCalls:counts.reduce((n,c)=>n+c.farthestCalls,0),layers:counts};
 T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();
 rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;rows[mode].textureCount=T.renderer.info.memory.textures;
 images[mode]=T.renderer.domElement.toDataURL('image/png');
}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),updates:120,nativeQueries:queries.length,rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='120 scripted native follow-camera/grass updates. Replay actual update methods on each recorded native retained tile, preserving source options, buffers and distance helpers. Suppress request generation by treating request keys as resident; test only the retained-tile culling/count loop. Every decision must match the recorded native state. Images are frozen full-scene endpoint controls, not independent movement simulations. Count farthest-distance evaluations, not hardware timing.';
 const a=report.rows.before,b=report.rows.after;
 report.pass=a.nativeDecisionsMatch&&b.nativeDecisionsMatch&&a.farthestCalls>0&&b.farthestCalls<a.farthestCalls&&b.layers.find(l=>l.name==='grass-near').farthestCalls===0&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
