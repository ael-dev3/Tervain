import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {createServer} from 'vite';
import {createHash} from 'node:crypto';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'window-grass-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});let page;
const server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'medium',hour:11});
 const report=await page.eval(`
const T=window.tervain,W=T.world,G=W.modules.find(m=>m.name==='groundcover').module,V=W.windowView,iterate=Array.prototype[Symbol.iterator];let layers;
Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=[this[0],this[1]];return iterate.call(this);};try{G.update(0,{camera:T.cam.camera,focus:T.player.group.position.clone(),reducedMotion:true});}finally{Array.prototype[Symbol.iterator]=iterate;}
const room=W.terrain.rooms.at(-28,-106),frame=V.frame(room),cam=T.cam.camera;cam.position.set(-21.5,frame.at.y,-110);cam.lookAt(-42,frame.at.y-2,-93);cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);
for(let i=0;i<200;i++){for(const l of layers)l.update(cam.position,{remaining:100000,deadline:Infinity});if(layers.every(l=>l.wantList.length===0))break;}
W.scene.updateMatrixWorld(true);T.lastFrameDt=0;
const entries=layers.flatMap(l=>Array.from(l.tiles.values(),t=>({l,t}))),state=()=>entries.map(({l,t})=>[l.group.name,t.key,t.mesh.visible,t.geo.instanceCount]);
const initial=JSON.stringify(state()),missing=entries.filter(({l,t})=>!t.mesh.visible&&t.count>0&&l.distTo(t,frame.at)<Math.min(l.o.fadeEnd,l.o.band?.end??Infinity)&&l.instanceCountAt(t,l.distTo(t,frame.at))>0).map(({l,t})=>({layer:l.group.name,key:t.key,count:t.count,captureInstances:l.instanceCountAt(t,l.distTo(t,frame.at)),distance:l.distTo(t,frame.at)}));
const original=V.lighten,nativeUpdate=V.update,rows={},images={},primaryImages={},oldShadow=T.renderer.shadowMap.autoUpdate;
T.renderer.render(W.scene,cam);T.renderer.shadowMap.autoUpdate=false;
const {TileLayer}=await import(${JSON.stringify(origin)}+'/src/presentation/ground/tileStream.ts');
const {WindowView}=await import(${JSON.stringify(origin)}+'/src/presentation/windowView.ts');
const captureScope=at=>{const restores=layers.map(l=>TileLayer.prototype.showForCapture.call(l,at));return()=>{for(const restore of restores)restore();};};
try{
 for(const mode of ['before','after','repeat','control']){
  const calls=[];const originals=entries.map(({t})=>t.mesh.onBeforeRender);
  entries.forEach(({l,t},i)=>t.mesh.onBeforeRender=function(...a){originals[i].apply(this,a);if(missing.some(m=>m.key===t.key&&m.layer===l.group.name)&&t.geo.instanceCount>0)calls.push({key:t.key,instances:t.geo.instanceCount});});
  V.update=mode==='before'||mode==='control'?nativeUpdate:WindowView.prototype.update;
  V.lighten=at=>{const restore=original?.(at);const grass=mode==='before'?()=>{}:mode==='control'?(()=>{const shown=entries.filter(({l,t})=>missing.some(m=>m.key===t.key&&m.layer===l.group.name)).map(({t})=>t.mesh);for(const m of shown)m.visible=true;return()=>{for(const m of shown)m.visible=false;};})():captureScope(at);return()=>{grass();restore?.();};};
  V.room=null;V.age=Infinity;
  const faces=[];
  try{for(let i=0;i<6;i++){
   V.update(T.renderer,W.scene,cam.position,0,true);
   const size=V.target.width,bytes=new Uint8Array(size*size*4);T.renderer.readRenderTargetPixels(V.target,0,0,size,size,bytes,i);
   let binary='';for(let j=0;j<bytes.length;j+=32768)binary+=String.fromCharCode(...bytes.subarray(j,j+32768));faces.push({face:i,base64:btoa(binary)});
  }}finally{entries.forEach(({t},i)=>t.mesh.onBeforeRender=originals[i]);}
  rows[mode]={restored:JSON.stringify(state())===initial,draws:calls};images[mode]=faces;
  // Hold panes out of this control: their corrected capture is an intentional difference.
  const paneVisible=V.pane.visible;V.pane.visible=false;
  try{T.renderer.info.reset();T.renderer.render(W.scene,cam);primaryImages[mode]=T.renderer.domElement.toDataURL('image/png');rows[mode].primary={drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures};}finally{V.pane.visible=paneVisible;}

 }
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),mainCamera:cam.position.toArray(),captureCamera:frame.at.toArray(),missing,rows,images,primaryImages};
}finally{V.lighten=original;V.update=nativeUpdate;T.renderer.shadowMap.autoUpdate=oldShadow;}
`);
 for(const[mode,faces]of Object.entries(report.images))for(const f of faces)await sharp(Buffer.from(f.base64,'base64'),{raw:{width:640,height:640,channels:4}}).flip().png().toFile(path.join(out,mode+'-'+f.face+'.png'));
 for(const[mode,data]of Object.entries(report.primaryImages))fs.writeFileSync(path.join(out,mode+'-primary.png'),Buffer.from(data.split(',')[1],'base64'));delete report.primaryImages;
 const primary=await sharp(path.join(out,'before-primary.png')).removeAlpha().raw().toBuffer(),primaryAfter=await sharp(path.join(out,'after-primary.png')).removeAlpha().raw().toBuffer();let primaryDifferences=0;for(let i=0;i<primary.length;i+=3)if([0,1,2].some(j=>primary[i+j]!==primaryAfter[i+j]))primaryDifferences++;report.primaryPixelDifferences=primaryDifferences;
 const differences=[];for(let i=0;i<6;i++){const a=Buffer.from(report.images.before[i].base64,'base64'),b=Buffer.from(report.images.after[i].base64,'base64'),c=Buffer.from(report.images.repeat[i].base64,'base64'),control=Buffer.from(report.images.control[i].base64,'base64');let changed=0,repeat=0,controlDiff=0;for(let p=0;p<a.length;p+=4){if([0,1,2].some(j=>a[p+j]!==b[p+j]))changed++;if([0,1,2].some(j=>b[p+j]!==c[p+j]))repeat++;if([0,1,2].some(j=>b[p+j]!==control[p+j]))controlDiff++;}differences.push({face:i,changedPixels:changed,repeatDifferences:repeat,controlDifferences:controlDiff});}delete report.images;report.differences=differences;
 report.sourceSha256=Object.fromEntries(['src/presentation/ground/tileStream.ts','src/presentation/windowView.ts','src/presentation/groundcover.ts','src/presentation/world.ts'].map(f=>[f,createHash('sha256').update(fs.readFileSync(f)).digest('hex')]));
 report.scope='Published native shrine scene, medium preset, six native 640px cube faces. Candidate production WindowView update and TileLayer visibility scope run on the same native scene, materials and buffers. Frozen simulation and one shared shadow map; manual admission of the witnessed tiles must match the production fix. Software WebGL, no hardware timing claim.';
 report.pass=primaryDifferences===0&&JSON.stringify(report.rows.before.primary)===JSON.stringify(report.rows.after.primary)&&report.missing.length>0&&report.rows.before.draws.length===0&&report.rows.after.draws.length>0&&Object.values(report.rows).every(r=>r.restored)&&differences.some(d=>d.changedPixels>0)&&differences.every(d=>d.repeatDifferences===0&&d.controlDifferences===0);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
