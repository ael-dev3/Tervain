import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'tree-upload-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/flora.ts',sources={before:execFileSync('git',['show','b204654:src/presentation/flora.ts'],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')},kernels={};
for(const[mode,source]of Object.entries(sources))kernels[mode]=(await transformWithOxc(source.slice(source.indexOf('  const uploadPrefix ='),source.indexOf('\n  // ?windtest=',source.indexOf('  const refresh ='))),'refresh.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',optimizeDeps:{include:['three'],noDiscovery:true},server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},plugins:[{name:'tree-range-proof',resolveId(id){if(id==='/@tree-proof')return '\0tree-proof';},load(id){if(id==='\0tree-proof')return "export * as THREE from 'three';export {floraLodWeightsFor,FLORA_FADE_START,FLORA_MAX_DISTANCE} from '/src/presentation/floraPopulation';export {smoothDistanceFade} from '/src/presentation/distanceVisibility';export {floraShadowWeights} from '/src/presentation/flora';";}}]});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:11});
 const report=await page.eval(`const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,cam=T.cam.camera,M=await import(${JSON.stringify(origin)}+'/@tree-proof'),THREE=M.THREE;
 T.settings.reducedMotion=true;T.lastFrameDt=0;
 let batches,frame;const iterate=Array.prototype[Symbol.iterator],update=F.update;
 Array.prototype[Symbol.iterator]=function(){if(this.length&&this[0]?.variant&&this[0]?.placements&&this[0]?.visibility)batches=this;return iterate.call(this);};F.update=function(dt,f){frame=f;return update.call(this,dt,f);};
 const pose=i=>{cam.position.set(-2,5,38+i*.08);const yaw=i*.025;cam.lookAt(-2+Math.sin(yaw)*20,4,cam.position.z+Math.cos(yaw)*20);cam.updateMatrixWorld(true);};
 pose(0);try{W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);}finally{Array.prototype[Symbol.iterator]=iterate;F.update=update;}
 if(!batches?.length||!frame)throw Error('Native forest refresh unavailable');
 const meshes=batches.flatMap(b=>[...b.meshes,...b.casters].flatMap(m=>[m.wood,m.leaf]).filter(Boolean));
 const attributes=[...new Set(meshes.flatMap(m=>[m.instanceMatrix,m.instanceColor,m.geometry.getAttribute('aDistanceCoverage')]).filter(Boolean))];
 const saved=attributes.map(a=>a.array.slice()),savedMeshes=meshes.map(m=>({count:m.count,visible:m.visible})),savedBounds=batches.map(b=>b.drawBounds.map(s=>s.clone()));
 const restore=()=>{attributes.forEach((a,i)=>{a.array.set(saved[i]);a.clearUpdateRanges();a.needsUpdate=true;});meshes.forEach((m,i)=>Object.assign(m,savedMeshes[i]));batches.forEach((b,i)=>b.drawBounds.forEach((s,l)=>s.copy(savedBounds[i][l])));};
 const snapshot=()=>meshes.map(m=>({name:m.name,count:m.count,visible:m.visible,matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),color:m.instanceColor?Array.from(m.instanceColor.array.slice(0,m.count*3)):null,coverage:m.geometry.hasAttribute('aDistanceCoverage')?Array.from(m.geometry.getAttribute('aDistanceCoverage').array.slice(0,m.count*2)):null}));
 const hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const casterCoverage=new Map(batches.flatMap(b=>b.casters.flatMap(c=>[c.wood,c.leaf]).filter(Boolean).map(m=>[m,m.geometry.getAttribute('aDistanceCoverage')])));
 const nativeHash=await hash(snapshot()),rows={},images={};const gl=T.renderer.getContext(),sub=gl.bufferSubData,data=gl.bufferData;let bytes=0,initialBytes=0;
 const size=(a,o,n)=>typeof a==='number'?0:!a?.byteLength?0:n===undefined?a.byteLength-(o??0)*(a.BYTES_PER_ELEMENT??1):n*(a.BYTES_PER_ELEMENT??1);
 gl.bufferSubData=function(t,d,a,o,n){bytes+=size(a,o,n);return sub.apply(this,arguments)};gl.bufferData=function(t,a,u,o,n){const nbytes=size(a,o,n);bytes+=nbytes;initialBytes+=nbytes;return data.apply(this,arguments)};
 const originalShadow=T.renderer.shadowMap.autoUpdate;
 // Warm every sampled view before either measurement, including buffers first visible partway through a turn.
 for(let i=0;i<=24;i++){pose(i);F.update(1/60,frame);T.renderWorld();}
 try{for(const mode of ['before','after']){
 restore();pose(0);const env={...M,batches,casterCoverage,forceLod:-1,forcedWeights:null,lodQuality:'high',pv:new THREE.Matrix4(),frustum:new THREE.Frustum(),col:new THREE.Color(),visible:0,drawTris:0,shadowTrees:0,shadowTris:0,SHADOW_REACH:260,usesPine:sp=>sp==='pine'};
 const kernel=new Function('env','with(env){'+${JSON.stringify(kernels)}[mode]+'return {refresh,get:()=>({visible,drawTris,shadowTrees,shadowTris})};}')(env);
 kernel.refresh(cam,frame.shadowFrustum,frame.shadowsForViewOnly);const nativeControlMatches=nativeHash===await hash(snapshot());
 T.renderer.shadowMap.autoUpdate=originalShadow;T.renderWorld();T.renderWorld();T.renderer.shadowMap.autoUpdate=false;
 const states=[],frames=[];let totalBytes=0;
 for(let i=1;i<=24;i++){
 pose(i);kernel.refresh(cam,frame.shadowFrustum,frame.shadowsForViewOnly);states.push([kernel.get(),snapshot(),batches.map(b=>b.drawBounds.map(s=>[...s.center.toArray(),s.radius]))]);

 const start=bytes,initialStart=initialBytes;T.renderer.info.reset();T.renderWorld();const uploaded=bytes-start;totalBytes+=uploaded;frames.push({sourceBufferBytes:uploaded,initialBufferBytes:initialBytes-initialStart,drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles});
 }
 images[mode]=T.renderer.domElement.toDataURL('image/png');rows[mode]={nativeControlMatches,statesSha256:await hash(states),sourceBufferBytes:totalBytes,frames,textureCount:T.renderer.info.memory.textures};
 }}finally{gl.bufferSubData=sub;gl.bufferData=data;T.renderer.shadowMap.autoUpdate=originalShadow;}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),refreshes:24,rows,images};`);
 for(const[mode,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,mode+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 const pixels=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,mode+'.png')).raw().toBuffer()));report.identicalPixels=pixels[0].equals(pixels[1]);
 if(fs.readFileSync(file,'utf8')!==sources.after)throw Error('Source changed during replay');report.sourceSha256=createHash('sha256').update(sources.after).digest('hex');
 report.scope='Actual baseline/candidate refresh and upload helpers on published High forest batches. 24 camera turns/walk steps, each followed by a native Grade/post/MSAA render. Simulation and wind held still; sun shadow map held fixed after warmup. All sampled views prewarmed; measured frames must have zero initial buffer allocations. Actual GL buffer source bytes, not uniform/texture bytes or hardware timings. Active color/caster matrices, colors, coverage, counts, bounds and statistics compared every step. Endpoint pixels compared.';
 const a=report.rows.before,b=report.rows.after;report.pass=a.nativeControlMatches&&b.nativeControlMatches&&a.statesSha256===b.statesSha256&&report.identicalPixels&&b.sourceBufferBytes<a.sourceBufferBytes&&a.frames.every((r,i)=>r.initialBufferBytes===0&&b.frames[i].initialBufferBytes===0&&r.drawCalls===b.frames[i].drawCalls&&r.triangles===b.frames[i].triangles)&&a.textureCount===b.textureCount;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
