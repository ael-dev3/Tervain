import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'forest-reflection-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=fs.readFileSync('src/presentation/flora.ts','utf8'),selection=source.slice(source.indexOf('  let selectedCamera:'),source.indexOf('  // ?windtest=1')),method=source.slice(source.indexOf('    forCapture(camera) {'),source.indexOf('    lighterForReflection() {'));
if(!selection.includes('const selectView')||!method.includes('selectView(previousCamera'))throw Error('Capture scope missing');
const code=(await transformWithOxc(`export {WaterRenderPass} from '/src/presentation/waterRenderPass';export function bindCapture(refresh,main,shadow,viewOnly){const disposed=false;${selection}selectedCamera=main;selectedShadow=shadow;selectedViewOnly=viewOnly;return {${method}}.forCapture;}`,'capture.ts')).code;
const sourceFiles=Object.fromEntries(['src/presentation/flora.ts','src/presentation/waterRenderPass.ts','src/presentation/world.ts'].map(f=>[f,fs.readFileSync(f)]));
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'forest-reflection-proof',resolveId(id){if(id==='/@forest-reflection-proof')return '\0'+id;},load(id){if(id==='\0/@forest-reflection-proof')return code;}}],server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'medium',hour:11});
 const report=await page.eval(`
const M=await import(${JSON.stringify(origin)}+'/@forest-reflection-proof'),T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,P=T.grade.waterPass,cam=T.cam.camera;
T.settings.reducedMotion=true;T.lastFrameDt=0;
const nativeUpdate=F.update,nativeCapture=P.captureReflection,nativeInputs=W.waterRenderInputs,oldSceneHook=W.scene.onBeforeRender,oldShadow=T.renderer.shadowMap.autoUpdate;
let frame,implementation=nativeCapture,prepare=null,refreshes=0,captureCost=null,cameras=[];
F.update=function(dt,f){frame=f;return nativeUpdate.call(this,dt,f);};
const refresh=(camera,shadow,viewOnly)=>{refreshes++;nativeUpdate.call(F,0,{...frame,camera,shadowFrustum:shadow,shadowsForViewOnly:viewOnly});};
W.waterRenderInputs=function(...a){return{...nativeInputs.apply(this,a),selectReflection:prepare?(camera)=>{cameras.push({position:camera.position.toArray(),projection:camera.projectionMatrix.elements.slice(),treesBefore:F.stats().treesDrawn});const restore=prepare(camera);cameras.at(-1).treesAfter=F.stats().treesDrawn;return restore;}:undefined};};
P.captureReflection=function(...a){const before={...T.renderer.info.render};try{return implementation.apply(this,a);}finally{captureCost={drawCalls:T.renderer.info.render.calls-before.calls,triangles:T.renderer.info.render.triangles-before.triangles};}};
const base64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return btoa(s);};
const read=target=>{const type=target.texture.type,buffer=type===1016?new Uint16Array(target.width*target.height*4):type===1015?new Float32Array(target.width*target.height*4):new Uint8Array(target.width*target.height*4);T.renderer.readRenderTargetPixels(target,0,0,target.width,target.height,buffer);const error=T.renderer.getContext().getError();if(error)throw Error('Readback GL error '+error);return{width:target.width,height:target.height,type,bytesPerPixel:buffer.BYTES_PER_ELEMENT*4,base64:base64(new Uint8Array(buffer.buffer))};};
const hashState=()=>JSON.stringify(F.group.children.filter(m=>m.isInstancedMesh).map(m=>[m.name,m.visible,m.count,Array.from(m.instanceMatrix.array.slice(0,m.count*16)),m.instanceColor?Array.from(m.instanceColor.array.slice(0,m.count*3)):null,m.geometry.getAttribute('aDistanceCoverage')?Array.from(m.geometry.getAttribute('aDistanceCoverage').array.slice(0,m.count*2)):null,m.boundingSphere?[m.boundingSphere.center.toArray(),m.boundingSphere.radius]:null]));
const rows=[],images={},raw={};
try{
 for(const [index,pose]of [[-310,8,-40,-300,0,-40],[-335,8,-90,-325,0,-90]].entries()){
  cam.position.set(...pose.slice(0,3));cam.lookAt(...pose.slice(3));cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);
  prepare=null;implementation=nativeCapture;P.reflectionValid=false;T.renderWorld();if(!P.reflector||W.water.renderInputs(true,true).seaMaterial.uniforms.uWaterReflectionReady.value!==1)throw Error('Pose does not capture visible sea');T.renderer.shadowMap.autoUpdate=false;
  const initial=hashState(),r={pose,modes:{}};
  for(const mode of ['before','after','repeat','cached']){
   implementation=mode==='before'?nativeCapture:M.WaterRenderPass.prototype.captureReflection;
   prepare=mode==='before'?null:M.bindCapture(refresh,cam,frame.shadowFrustum,frame.shadowsForViewOnly);
   if(mode!=='cached')P.reflectionValid=false;
   cameras=[];refreshes=0;captureCost=null;T.renderer.info.reset();T.renderWorld();
   images[index+'-'+mode]=T.renderer.domElement.toDataURL('image/png');
   raw[index+'-'+mode]={opaque:read(T.grade.target),reflection:read(P.reflector.getRenderTarget())};
   r.modes[mode]={stateRestored:hashState()===initial,hookRestored:W.scene.onBeforeRender===oldSceneHook,selectionCalls:refreshes,cameras,captureCost,total:{drawCalls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures},ready:W.water.renderInputs(true,true).seaMaterial.uniforms.uWaterReflectionReady.value};
  }rows.push(r);
 }
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,images,raw};
}finally{F.update=nativeUpdate;P.captureReflection=nativeCapture;W.waterRenderInputs=nativeInputs;W.scene.onBeforeRender=oldSceneHook;T.renderer.shadowMap.autoUpdate=oldShadow;}
`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 const changed=(a,b,stride)=>{if(a.length!==b.length)throw Error('Buffer sizes differ');let n=0;for(let i=0;i<a.length;i+=stride){for(let j=0;j<stride;j++)if(a[i+j]!==b[i+j]){n++;break;}}return n;};
 for(const [i,row]of report.rows.entries()){
  const rgb=async mode=>sharp(path.join(out,i+'-'+mode+'.png')).removeAlpha().raw().toBuffer(),[a,b,c,d]=await Promise.all(['before','after','repeat','cached'].map(rgb));
  const raw=(mode,kind)=>Buffer.from(report.raw[i+'-'+mode][kind].base64,'base64'),sha=b=>createHash('sha256').update(b).digest('hex');
  row.comparison={fullFrameChangedPixels:changed(a,b,3),repeatFrameChangedPixels:changed(b,c,3),cachedFrameChangedPixels:changed(c,d,3),opaqueChangedPixels:changed(raw('before','opaque'),raw('after','opaque'),report.raw[i+'-before'].opaque.bytesPerPixel),reflectionChangedPixels:changed(raw('before','reflection'),raw('after','reflection'),report.raw[i+'-before'].reflection.bytesPerPixel),repeatReflectionChangedPixels:changed(raw('after','reflection'),raw('repeat','reflection'),report.raw[i+'-after'].reflection.bytesPerPixel)};
  row.rawHashes=Object.fromEntries(['before','after','repeat','cached'].map(mode=>[mode,{opaque:sha(raw(mode,'opaque')),reflection:sha(raw(mode,'reflection'))}]));
 }delete report.raw;
 for(const[f,bytes]of Object.entries(sourceFiles))if(!bytes.equals(fs.readFileSync(f)))throw Error('Source changed during capture: '+f);
 report.sourceSha256=Object.fromEntries(Object.entries(sourceFiles).map(([f,bytes])=>[f,createHash('sha256').update(bytes).digest('hex')]));
 report.scope='Published native Medium shoreline scene through Grade/post/MSAA, native water/reflector targets, materials and buffers. Production WaterRenderPass capture method and forest capture scope; a zero-dt adapter invokes the published forest selection (the native module does not expose its closure refresh). Frozen simulation, grain and shadow map. HDR opaque and reflection buffers compared separately. Software WebGL; draw/triangle counts, not hardware timings or GPU-memory bytes.';
 report.pass=report.rows.every(r=>Object.values(r.modes).every(m=>m.stateRestored&&m.hookRestored&&m.ready===1)&&r.modes.after.selectionCalls===2&&r.modes.cached.selectionCalls===0&&r.modes.cached.captureCost.drawCalls===0&&r.comparison.fullFrameChangedPixels>0&&r.comparison.reflectionChangedPixels>0&&r.comparison.opaqueChangedPixels===0&&r.comparison.repeatFrameChangedPixels===0&&r.comparison.cachedFrameChangedPixels===0&&r.comparison.repeatReflectionChangedPixels===0);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
