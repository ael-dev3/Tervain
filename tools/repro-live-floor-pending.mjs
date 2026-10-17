import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'floor-pending-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=fs.readFileSync('src/presentation/forestFloor.ts','utf8');
if(!source.includes('if (coverageChanged || count > previousCount) uploadFloorPrefix(b.visibility.coverage, count);'))throw Error('Production coverage-growth guard missing');
let p;
try{
 p=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:11,headed:args.headed==='1'});
 const report=await p.eval(`const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,R=T.renderer,gl=R.getContext(),cam=T.cam.camera,it=Array.prototype[Symbol.iterator],nativeUpdate=F.update;
 T.present=()=>{};T.perf?.end(0);T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;let owned,frame;
 F.update=function(dt,f){frame=f;return nativeUpdate.call(this,dt,f)};
 Array.prototype[Symbol.iterator]=function(){if(this[0]?.pieces&&this[0]?.transforms&&this[0]?.visibility)owned=this;return it.call(this)};
 const x=-80,z=12,y=W.terrain.groundAt(x,z)+3;
 const pose=step=>{const yaw=step*.035;cam.fov=65;cam.updateProjectionMatrix();cam.position.set(x,y,z);cam.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);cam.updateMatrixWorld(true)};
 pose(0);try{W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false)}finally{F.update=nativeUpdate;Array.prototype[Symbol.iterator]=it}if(!owned)throw Error('Missing native floor batches');
 const tracked=owned.flatMap(b=>[['matrix',b.mesh.instanceMatrix,'instanceMatrix'],['colour',b.mesh.instanceColor,'instanceColor'],['coverage',b.visibility.coverage,'aDistanceCoverage']].filter(([,a])=>a).map(([kind,a,input])=>({b,kind,a,input,array:a.array.slice(),count:b.mesh.count,packed:[...b.packed],clear:a.clearUpdateRanges,add:a.addUpdateRange,buffer:null,pendingEnd:0})));
 const floorGroup=owned[0].mesh.parent,parent=floorGroup.parent,floorScene=new W.scene.constructor(),light=W.sky.sun.clone();light.castShadow=false;floorScene.add(light,light.target);floorScene.environment=W.scene.environment;floorScene.fog=W.scene.fog;
 const shadowAuto=R.shadowMap.autoUpdate;R.shadowMap.autoUpdate=false;R.info.autoReset=false;
 const renderDirect=R.renderBufferDirect;
 R.renderBufferDirect=function(camera,scene,geo,mat,obj,group){const result=renderDirect.apply(this,arguments);if(owned.some(b=>b.mesh===obj)){const program=gl.getParameter(gl.CURRENT_PROGRAM);for(const t of tracked.filter(t=>t.b.mesh===obj)){const loc=gl.getAttribLocation(program,t.input);if(loc>=0){const buffer=gl.getVertexAttrib(loc,gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING);if(buffer)t.buffer=buffer;}}}return result;};
 const floorDraw=()=>{floorScene.add(floorGroup);try{R.setRenderTarget(null);R.render(floorScene,cam);}finally{parent.add(floorGroup);}};
 const check=()=>{const errors=[];const old=gl.getParameter(gl.COPY_READ_BUFFER_BINDING);for(const t of tracked){if(!t.b.mesh.count)continue;if(!t.buffer)throw Error('Missing GPU buffer for '+t.b.mesh.name+'/'+t.kind);const data=new Float32Array(t.a.array.length);gl.bindBuffer(gl.COPY_READ_BUFFER,t.buffer);gl.getBufferSubData(gl.COPY_READ_BUFFER,0,data);let bad=0,maxError=0;for(let i=0;i<t.b.mesh.count*t.a.itemSize;i++)if(data[i]!==t.a.array[i]){bad++;maxError=Math.max(maxError,Math.abs(data[i]-t.a.array[i]));}if(bad)errors.push({batch:t.b.mesh.name,kind:t.kind,drawn:t.b.mesh.count,badComponents:bad,maxError});}gl.bindBuffer(gl.COPY_READ_BUFFER,old);return errors;};
 const images={},modes={};let failureFrame=null;
 try{for(const mode of ['before','after']){
 // Invalidate the module's last-camera cache, then restore the identical packed seed state.
 pose(9001);nativeUpdate.call(F,0,frame);pose(0);
 for(const t of tracked){t.a.clearUpdateRanges=t.clear;t.a.addUpdateRange=t.add;t.a.array.set(t.array);t.b.mesh.count=t.count;t.b.packed.length=0;t.b.packed.push(...t.packed);t.a.clearUpdateRanges();t.a.addUpdateRange(0,t.a.array.length);t.a.needsUpdate=true;}
 floorDraw();if(check().length)throw Error('Seed GPU mismatch');
 const descriptors=[];
 if(mode==='after')for(const b of owned){const descriptor=Object.getOwnPropertyDescriptor(b.mesh,'count');let value=b.mesh.count;descriptors.push([b.mesh,descriptor]);Object.defineProperty(b.mesh,'count',{configurable:true,get(){return value},set(n){const previous=value;value=n;if(n>previous){const a=b.visibility.coverage;a.clearUpdateRanges();a.addUpdateRange(0,n*a.itemSize);a.needsUpdate=true;}}});}

 const result={frames:0,errors:[],testedDrawnComponents:0};let step=0;
 for(let draw=0;draw<300;draw++){
   for(let i=0;i<3;i++,step++){pose(step);nativeUpdate.call(F,1/60,frame);}
   floorDraw();const errors=check();result.frames++;result.testedDrawnComponents+=tracked.reduce((n,t)=>n+t.b.mesh.count*t.a.itemSize,0);
   if(errors.length){result.errors.push({draw,errors});if(mode==='before'){failureFrame=draw;T.renderWorld();images.before=R.domElement.toDataURL('image/png');result.errorsAfterFullRender=check();break;}}
   if(mode==='after'&&draw===failureFrame){T.renderWorld();images.after=R.domElement.toDataURL('image/png');result.errorsAfterFullRender=check();}
 }
 for(const[m,d]of descriptors)Object.defineProperty(m,'count',{...d,value:m.count});
 modes[mode]=result;if(mode==='before'&&failureFrame===null)throw Error('No native GPU reproduction in 300 frames');
 }}finally{for(const t of tracked){t.a.clearUpdateRanges=t.clear;t.a.addUpdateRange=t.add;}R.renderBufferDirect=renderDirect;R.shadowMap.autoUpdate=shadowAuto;}
 if(gl.getError()!==gl.NO_ERROR)throw Error('WebGL error');return{build:await fetch('version.json').then(r=>r.json()),rendering:'native WebGL2 buffers; headless defaults to SwiftShader',position:[x,y,z],fov:65,substepsPerDraw:3,radiansPerSubstep:.035,batches:owned.length,failureFrame,modes,images};`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 const[a,b]=await Promise.all(['before','after'].map(k=>sharp(path.join(out,k+'.png')).ensureAlpha().raw().toBuffer()));let changedPixels=0;for(let i=0;i<a.length;i+=4)if(a.subarray(i,i+4).some((v,j)=>v!==b[i+j]))changedPixels++;report.changedPixels=changedPixels;
 report.sourceSha256=createHash('sha256').update(source).digest('hex');report.scope='Published native floor CPU selection and actual Three/WebGL buffers. Three 60 Hz selection updates precede each draw, modelling a catch-up frame. Diagnostic floor-only draws keep the test fast; matched final images use the full native Grade/post/MSAA scene. Candidate adapter resends the exposed coverage prefix when native mesh.count grows, matching the production guard. WebGL getBufferSubData checks drawn GPU components against CPU attributes; no hardware frame-time claim.';
 report.pass=report.modes.before.errors.length>0&&report.modes.before.errorsAfterFullRender.length>0&&report.modes.after.errors.length===0&&report.modes.after.errorsAfterFullRender.length===0&&report.modes.after.frames===300;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{p?.close()}
