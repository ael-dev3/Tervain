import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'tree-window-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=fs.readFileSync('src/presentation/flora.ts','utf8'),selection=source.slice(source.indexOf('  let selectedCamera:'),source.indexOf('  // ?windtest=1')),method=source.slice(source.indexOf('    forCapture(camera) {'),source.indexOf('    lighterForReflection() {'));
if(!selection.includes('const selectView')||!method.includes('selectView(previousCamera'))throw Error('Production capture scope missing');
const moduleCode=`export {WindowView} from '/src/presentation/windowView';export function bindCapture(refresh,main,shadow,viewOnly){const disposed=false;${selection}selectedCamera=main;selectedShadow=shadow;selectedViewOnly=viewOnly;return {${method}}.forCapture;}`;
const compiled=(await transformWithOxc(moduleCode,'capture.ts')).code;
const sourceFiles=Object.fromEntries(['src/presentation/flora.ts','src/presentation/windowView.ts','src/presentation/world.ts'].map(f=>[f,fs.readFileSync(f)]));
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'tree-capture-proof',resolveId(id){if(id==='/@tree-capture-proof.ts')return '\0'+id;},load(id){if(id==='\0/@tree-capture-proof.ts')return compiled;}}],server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'medium',hour:11});
 const report=await page.eval(`
const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,V=W.windowView,M=await import(${JSON.stringify(origin)}+'/@tree-capture-proof.ts'),cam=T.cam.camera,room=W.terrain.rooms.at(-28,-106),at=V.frame(room).at;let frame;const update=F.update,nativeWindow=V.update,lighten=V.lighten;
cam.position.copy(at);cam.lookAt(at.x,at.y,at.z+30);cam.updateMatrixWorld(true);F.update=function(dt,f){frame=f;return update.call(this,dt,f);};try{W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);}finally{F.update=update;}
// Hold non-tree foliage out, so heading-dependent floor/grass packing cannot explain the tree difference.
const hidden=[{child:W.groundcover.group,visible:W.groundcover.group.visible}];W.groundcover.group.visible=false;
for(const child of F.group.children)if(!child.isInstancedMesh){hidden.push({child,visible:child.visible});child.visible=false;}
W.scene.updateMatrixWorld(true);T.renderer.render(W.scene,cam);const oldShadow=T.renderer.shadowMap.autoUpdate;T.renderer.shadowMap.autoUpdate=false;
const meshes=[];F.group.traverse(m=>{if(m.isInstancedMesh)meshes.push(m);});
const state=()=>JSON.stringify(meshes.map(m=>({name:m.name,count:m.count,visible:m.visible,matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),color:m.instanceColor?Array.from(m.instanceColor.array.slice(0,m.count*3)):null,coverage:m.geometry.getAttribute('aDistanceCoverage')?Array.from(m.geometry.getAttribute('aDistanceCoverage').array.slice(0,m.count*2)):null,bound:m.boundingSphere?[m.boundingSphere.center.toArray(),m.boundingSphere.radius]:null})));
const proxy=cam.clone();proxy.matrixAutoUpdate=false;let refreshes=0;
// The published module exposes update, not its closure refresh. This zero-dt adapter dispatches that native selection;
// the world-space proxy supplies the same world origin used by the candidate refresh (cube children have local zero).
const refresh=(camera,shadow,viewOnly)=>{refreshes++;camera.updateWorldMatrix(true,false);proxy.position.setFromMatrixPosition(camera.matrixWorld);proxy.quaternion.setFromRotationMatrix(camera.matrixWorld);proxy.matrix.copy(camera.matrixWorld);proxy.matrixWorldNeedsUpdate=true;proxy.projectionMatrix.copy(camera.projectionMatrix);proxy.coordinateSystem=camera.coordinateSystem;proxy.updateMatrixWorld(true);F.update(0,{...frame,camera:proxy,shadowFrustum:shadow,shadowsForViewOnly:viewOnly});};
const rows={},images={},primaryImages={};
try{
 for(const mode of ['before','after','repeat'])for(const direction of [1,-1]){
  const key=mode+'-'+direction;cam.lookAt(at.x,at.y,at.z+30*direction);cam.updateMatrixWorld(true);F.update(0,{...frame,camera:cam});const initial=state();
  const prepare=M.bindCapture(refresh,cam,frame.shadowFrustum,frame.shadowsForViewOnly),captures=[];refreshes=0;
  V.update=mode==='before'?nativeWindow:M.WindowView.prototype.update;
  V.lighten=(position,camera)=>{const restore=mode==='before'?()=>{}:prepare(camera);captures.push({trees:F.stats().treesDrawn,triangles:F.stats().treeTris});const detail=F.lighterForReflection();return()=>{detail();restore();};};
  V.room=null;V.age=Infinity;const faces=[];let restored=true;
  for(let i=0;i<6;i++){
   V.update(T.renderer,W.scene,cam.position,0,true);restored&&=state()===initial;
   const bytes=new Uint8Array(640*640*4);T.renderer.readRenderTargetPixels(V.target,0,0,640,640,bytes,i);let binary='';for(let j=0;j<bytes.length;j+=32768)binary+=String.fromCharCode(...bytes.subarray(j,j+32768));faces.push(btoa(binary));
  }
  const pane=V.pane.visible;V.pane.visible=false;
  try{T.renderer.info.reset();T.renderer.render(W.scene,cam);primaryImages[key]=T.renderer.domElement.toDataURL('image/png');rows[key]={captures,restored,selectionCalls:refreshes,primary:{drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures}};}finally{V.pane.visible=pane;}
  images[key]=faces;
 }
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),captureCamera:at.toArray(),rows,images,primaryImages};
}finally{V.update=nativeWindow;V.lighten=lighten;T.renderer.shadowMap.autoUpdate=oldShadow;for(const h of hidden)h.child.visible=h.visible;}
`);
 for(const[key,faces]of Object.entries(report.images))for(let i=0;i<6;i++)await sharp(Buffer.from(faces[i],'base64'),{raw:{width:640,height:640,channels:4}}).flip().png().toFile(path.join(out,key+'-'+i+'.png'));
 for(const[key,data]of Object.entries(report.primaryImages))fs.writeFileSync(path.join(out,key+'-primary.png'),Buffer.from(data.split(',')[1],'base64'));delete report.primaryImages;
 const diff=(a,b)=>{let n=0;for(let i=0;i<a.length;i+=4)if([0,1,2].some(j=>a[i+j]!==b[i+j]))n++;return n;},faceDiff=(a,b,i)=>diff(Buffer.from(report.images[a][i],'base64'),Buffer.from(report.images[b][i],'base64'));
 report.faces=Array.from({length:6},(_,i)=>({face:i,beforeHeadingDifferences:faceDiff('before-1','before--1',i),afterHeadingDifferences:faceDiff('after-1','after--1',i),repeatDifferences:faceDiff('after-1','repeat-1',i)+faceDiff('after--1','repeat--1',i),correctedNorthPixels:faceDiff('before-1','after-1',i),correctedSouthPixels:faceDiff('before--1','after--1',i)}));delete report.images;
 report.primary=await Promise.all([1,-1].map(async d=>{const a=await sharp(path.join(out,'before-'+d+'-primary.png')).raw().toBuffer(),b=await sharp(path.join(out,'after-'+d+'-primary.png')).raw().toBuffer();return{direction:d,changedPixels:diff(a,b),countsMatch:JSON.stringify(report.rows['before-'+d].primary)===JSON.stringify(report.rows['after-'+d].primary)};}));
 for(const[f,bytes]of Object.entries(sourceFiles))if(!bytes.equals(fs.readFileSync(f)))throw Error('Source changed during capture: '+f);
 report.sourceSha256=Object.fromEntries(Object.entries(sourceFiles).map(([f,bytes])=>[f,createHash('sha256').update(bytes).digest('hex')]));
 report.scope='Published native shrine/trees/materials/packed buffers, medium, six 640px faces. Frozen simulation and shadow map. Grass, floor and loose falling leaves held out to isolate tree selection. Production capture scope and WindowView update; native zero-dt update adapter invokes published forest selection with world-space cube-face proxies. Tests exercise candidate refresh directly, including parented-camera origin and idle-cache restoration. Software WebGL, no hardware frame-time claim.';
 report.pass=Object.values(report.rows).every(r=>r.restored)&&report.faces.some(r=>r.beforeHeadingDifferences>0)&&report.faces.every(r=>r.afterHeadingDifferences===0&&r.repeatDifferences===0)&&report.primary.every(r=>r.changedPixels===0&&r.countsMatch);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
