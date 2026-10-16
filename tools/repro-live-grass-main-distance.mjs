import fs from 'node:fs';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-main-distance-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/ground/tileStream.ts',sources={before:execFileSync('git',['show','421d34b:'+file],{encoding:'utf8'}),after:args['candidate-ref']?execFileSync('git',['show',args['candidate-ref']+':'+file],{encoding:'utf8'}):fs.readFileSync(file,'utf8')},modules={};
for(const[mode,source]of Object.entries(sources)){
 const instrumented=source;
 modules[mode]=(await transformWithOxc(instrumented,file)).code.replace(/from (['"])([.][^'"]+)\1/g,(_,q,p)=>`from '${path.posix.resolve('/src/presentation/ground',p)}'`);
}
const cache=fs.mkdtempSync(path.join(tmpdir(),'tervain-floor-proof-'));
const server=await createServer({configFile:false,logLevel:'error',cacheDir:cache,optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'floor-proof',resolveId(id){if(id.startsWith('/@floor-proof-'))return '\0'+id;},load(id){if(id.startsWith('\0/@floor-proof-'))return modules[id.slice('\0/@floor-proof-'.length)];}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 for(const mode of ['before','after']){const r=await fetch(origin+'/@floor-proof-'+mode);if(!r.ok)throw Error('Diagnostic module HTTP '+r.status);}
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'low',hour:11});
 const report=await page.eval(`
const T=window.tervain,G=T.world.modules.find(m=>m.name==='groundcover').module,iterate=Array.prototype[Symbol.iterator];let layers;
Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=[this[0],this[1]];return iterate.call(this);};
try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
if(!layers)throw Error('Native grass layers missing');
T.cam.wantDist=6.2;T.cam.yaw=.8;T.cam.pitch=.32;T.cam.reset();T.cam.follow(1/60,-180,T.world.terrain.groundAt(-180,12),12,T.world.terrain,T.world.colliders,true,0);T.cam.camera.updateMatrixWorld(true);
T.world.update(0,T.game.state,T.player.group.position,T.settings,11,T.cam.camera,false);
const models={};for(const mode of ['before','after'])models[mode]=await import(${JSON.stringify(origin)}+'/@floor-proof-'+mode);
const submitted=new Set(),originals=[];
for(const layer of layers)for(const tile of layer.tiles.values()){const fn=tile.mesh.onBeforeRender;originals.push([tile,fn]);tile.mesh.onBeforeRender=function(...args){const e=args[2].matrixWorld.elements;if(e[12]===layer.drawFocus.x&&e[13]===layer.drawFocus.y&&e[14]===layer.drawFocus.z)submitted.add(tile);return fn.apply(this,args);};}
try{T.lastFrameDt=0;T.renderWorld();T.renderWorld();}finally{for(const[tile,fn]of originals)tile.mesh.onBeforeRender=fn;}
if(!submitted.size)throw Error('No native main-camera grass draws');
const rows={},images={},expected=[];let control;
const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(b=>b.toString(16).padStart(2,'0')).join('');
const invoke=(tile,camera)=>{tile.mesh.onBeforeRender(T.renderer,T.scene,camera,tile.geo,tile.mesh.material,null);const before=[tile.geo.instanceCount,tile.geo.drawRange.start,tile.geo.drawRange.count];tile.mesh.onAfterRender(T.renderer,T.scene,camera,tile.geo,tile.mesh.material,null);return[...before,tile.geo.instanceCount];};
const capture=T.cam.camera.clone(),queries=[];
for(let frame=0;frame<120;frame++)for(const layer of layers)for(const tile of layer.tiles.values())if(submitted.has(tile))queries.push({layer,tile,main:true});
for(const layer of layers)for(const tile of layer.tiles.values())if(submitted.has(tile))for(const distance of [0,20,80,130])queries.push({layer,tile,main:false,distance});
for(const q of queries){const camera=q.main?T.cam.camera:capture;if(!q.main){capture.position.set(q.tile.x0+q.layer.o.tileSize/2,q.tile.ymin+2,q.tile.z0+q.layer.o.tileSize/2+q.distance);capture.updateMatrixWorld(true);}expected.push(invoke(q.tile,camera));}
T.lastFrameDt=0;T.renderWorld();T.renderer.info.reset();T.renderWorld();images.native=T.renderer.domElement.toDataURL('image/png');
for(const mode of ['before','after']){let phase='main';const counts={main:0,capture:0,render:0},copies=new Map(),saved=[];
try{
for(const layer of layers){const host=Object.create(layer);host.pool=[];host.group=new layer.group.constructor();host.distTo=function(...args){counts[phase]++;return layer.distTo.apply(this,args);};
for(const tile of layer.tiles.values()){
 const copy=models[mode].TileLayer.prototype.acquire.call(host);const mesh=copy.mesh,geo=copy.geo,attrs=copy.attrs;Object.assign(copy,tile,{mesh,geo,attrs});
 for(let i=0;i<attrs.length;i++){attrs[i].array.set(tile.attrs[i].array);attrs[i].needsUpdate=true;}geo.boundingSphere.copy(tile.geo.boundingSphere);geo.instanceCount=tile.geo.instanceCount;geo.setDrawRange(tile.geo.drawRange.start,tile.geo.drawRange.count);mesh.visible=tile.mesh.visible;
 copies.set(tile,copy);saved.push([tile,tile.mesh.visible,copy]);tile.mesh.visible=false;layer.group.add(mesh);
}}
const results=[];for(const q of queries){phase=q.main?'main':'capture';const camera=q.main?T.cam.camera:capture;if(!q.main){capture.position.set(q.tile.x0+q.layer.o.tileSize/2,q.tile.ymin+2,q.tile.z0+q.layer.o.tileSize/2+q.distance);capture.updateMatrixWorld(true);}results.push(invoke(copies.get(q.tile),camera));}
const serialized=JSON.stringify(results);if(serialized!==JSON.stringify(expected))throw Error(mode+' differs from native callback decisions');if(mode==='before')control=serialized;
rows[mode]={distanceCalls:{...counts},callbacks:queries.length,mainCallbacks:queries.filter(q=>q.main).length,captureCallbacks:queries.filter(q=>!q.main).length,nativeDecisionsMatch:true,matchesBaseline:mode==='before'||serialized===control,decisionsSha256:await hash(results)};
phase='render';T.lastFrameDt=0;T.renderWorld();T.renderWorld();T.renderer.info.reset();T.renderWorld();rows[mode].drawCalls=T.renderer.info.render.calls;rows[mode].triangles=T.renderer.info.render.triangles;images[mode]=T.renderer.domElement.toDataURL('image/png');
}finally{for(const[tile,visible,copy]of saved){copy.mesh.removeFromParent();copy.geo.dispose();tile.mesh.visible=visible;}}
}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),submittedMainTiles:submitted.size,retainedTiles:layers.reduce((n,l)=>n+l.tiles.size,0),rows,images};
`);
 for(const[mode,data]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(data.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['native','before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1])&&pixels[1].equals(pixels[2]);
 report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');report.baselineRevision='421d34b';report.scope='Native published grass buffers/options and submitted main-camera tiles. Replay actual baseline/candidate acquire-created render callbacks for 120 repeated main-camera passes and four alternate camera distances per submitted tile; require instance count, draw prefix and after-render restoration to match native. Replace every retained tile with its callback-bearing copy in the native scene for matched post/MSAA pixels. No hardware timing claim.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.distanceCalls.main===a.mainCallbacks&&a.mainCallbacks>0&&b.distanceCalls.main===0&&a.distanceCalls.capture===b.distanceCalls.capture&&a.distanceCalls.capture>0&&a.matchesBaseline&&b.matchesBaseline&&report.identicalPixels&&a.drawCalls===b.drawCalls&&a.triangles===b.triangles;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();fs.rmSync(cache,{recursive:true,force:true});}
