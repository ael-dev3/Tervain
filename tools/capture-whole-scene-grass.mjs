#!/usr/bin/env node
/** Full native renderWorld pans; camera-only motion, frozen world/post clocks. */
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import sharp from 'sharp';
import {analyzeVideo} from './video-shimmer.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const frames=Number(args.frames??12),x=Number(args.x??-7),z=Number(args.z??45),degrees=Number(args.degrees??2),travel=Number(args.travel??0);
const width=Number(args.width??640),height=Number(args.height??360),warm=Number(args.warm??8);
const roi=(args.roi??'.08,.60,.25,.24').split(',').map(Number);
if(!Number.isInteger(frames)||frames<3||frames>180||![x,z,degrees,travel].every(Number.isFinite)||Math.abs(degrees)>20||Math.abs(travel)>2)throw new Error('Invalid route');
if(!Number.isInteger(width)||!Number.isInteger(height)||width<160||height<90||width>1920||height>1080||!Number.isInteger(warm)||warm<1||warm>60)throw new Error('Invalid capture dimensions or warmup');
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const out=args.out??'whole-scene-grass-proof';fs.mkdirSync(out,{recursive:true});const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;
try{
 page=await openPage(url.href,{w:width,h:height,requestTimeoutMs:240000});let ready=false;
 for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode==="play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const setup=await page.eval(`
 const T=window.tervain;T.render=()=>{};await T.world.arrived;await T.castLoad;T.step=()=>{};T.arrivals.warm=null;
 for(let i=0;i<5000&&T.arrivals.count;i++){T.arrivals.update(T.npcAssets,()=>false);await new Promise(r=>setTimeout(r,0));}if(T.arrivals.count)throw new Error('Cast incomplete');
 const W=T.world,R=T.renderer,camera=T.cam.camera,grass=W.modules.find(m=>m.name==='groundcover')?.module;if(!grass)throw new Error('Grass missing');
 const y=W.terrain.heightAt(${x},${z}),focus=T.player.group.position.clone().set(${x},y,${z});
 T.player.x=${x};T.player.y=y;T.player.z=${z};T.player.rig.root.position.copy(focus);T.player.group.visible=true;T.cam.manual=true;
 camera.position.set(${x},y+1.4,${z}-3);camera.lookAt(${x},y+.3,${z}+2);camera.updateMatrixWorld();
 W.update(0,T.game.state,focus,T.settings,12,camera,false);T.updateActors(0,12);T.lastFrameDt=0;
 const capture={base:camera.quaternion.clone(),position:camera.position.clone(),samples:new Set(),patched:0,grass,focus};
 const gl=R.getContext(),render=R.render;
 R.render=function(scene,cam){if(scene===W.scene&&cam===camera&&R.getRenderTarget()===T.grade.target)capture.samples.add(gl.getParameter(gl.SAMPLES));return render.call(this,scene,cam);};
 capture.draw=angle=>{camera.quaternion.copy(capture.base);camera.rotateY(angle);camera.updateMatrixWorld();T.renderWorld();};
 window.__wholeGrass=capture;for(let i=0;i<${warm};i++)capture.draw(0);R.shadowMap.autoUpdate=false;
 const heroAt=T.player.rig.root.getWorldPosition(focus.clone());
 return {heroAtFocus:heroAt.distanceTo(focus)<1e-4,width:R.domElement.width,height:R.domElement.height,postEnabled:T.grade.enabled,requestedSamples:T.grade.target.samples,maxSamples:gl.getParameter(gl.MAX_SAMPLES),grass:grass.stats(),sceneMeshes:(()=>{let n=0;W.scene.traverse(o=>{if(o.isMesh)n++;});return n;})()};
 `);
 const reports={};let repeatIdentical=true;
 for(const mode of ['native','bounded-control']){
  if(mode==='bounded-control')await page.eval(`
  const F=window.__wholeGrass,seen=new Set();
  F.grass.group.traverse(o=>{if(!o.isMesh)return;for(const material of Array.isArray(o.material)?o.material:[o.material]){
   if(seen.has(material))continue;seen.add(material);const hook=material.onBeforeCompile,key=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,renderer){hook.call(this,shader,renderer);
    const needle='vec2 gAcrossH = normalize(mix(gAcross.xz, gSideEye * sign(dot(gAcross.xz, gSideEye) + 1e-4), 0.35));';
    if(shader.vertexShader.includes(needle)){shader.vertexShader=shader.vertexShader.replace(needle,'float gFacingBand = clamp((dot(gAcross.xz, gSideEye) + 1e-4) / 0.03, -1.0, 1.0);\\nfloat gFacingContinuous = gFacingBand * (1.5 - 0.5 * gFacingBand * gFacingBand);\\nvec2 gAcrossH = normalize(mix(gAcross.xz, gSideEye * gFacingContinuous, 0.35));');F.patched++;}};
   material.customProgramCacheKey=()=>key+'/diagnostic-bounded-facing';material.needsUpdate=true;
  }});
  `);
  for(const motion of ['stationary','pan']){
   const route=mode+'-'+motion,dir=path.join(out,route);fs.mkdirSync(dir,{recursive:true});
   await page.eval(`const F=window.__wholeGrass;window.tervain.cam.camera.position.copy(F.position);for(let i=0;i<${warm};i++)F.draw(0);`);
   for(let i=0;i<frames;i++){
    const fraction=motion==='pan'?i/(frames-1):0,angle=degrees*Math.PI/180*fraction;
    await page.eval(`const F=window.__wholeGrass;window.tervain.cam.camera.position.copy(F.position);window.tervain.cam.camera.position.x+=${travel*fraction};F.draw(${angle});`);
    const file=path.join(dir,String(i).padStart(4,'0')+'.png');await page.shot(file);
    if(i===0){await page.eval(`window.__wholeGrass.draw(${angle});`);const repeat=path.join(dir,'repeat.png');await page.shot(repeat);const a=await sharp(file).removeAlpha().raw().toBuffer(),b=await sharp(repeat).removeAlpha().raw().toBuffer();repeatIdentical&&=a.equals(b);}
   }
   const clip=path.join(out,route+'.mkv'),encoded=spawnSync('ffmpeg',['-v','error','-y','-framerate','60','-i',path.join(dir,'%04d.png'),'-frames:v',String(frames),'-c:v','ffv1',clip],{timeout:60000});if(encoded.status!==0)throw new Error('Encoding failed');
   reports[route]=await analyzeVideo(clip,{roi,maxFrames:frames});
  }
 }
 const state=await page.eval('const F=window.__wholeGrass;return {samples:[...F.samples],patchedShaders:F.patched};');
 const expected=setup.postEnabled?Math.min(setup.requestedSamples,setup.maxSamples):0;
 const assertions={heroAtFocus:setup.heroAtFocus,wholeSceneMeshes:setup.sceneMeshes>1,grassPresent:setup.grass.grassInstances>0,repeatIdentical,nativeSamples:state.samples.length===1&&state.samples[0]===expected,controlPatched:state.patchedShaders>0,completeFrames:Object.values(reports).every(r=>r.decodedFrames===frames&&r.summary.usableFrames===frames-2),stationaryZeroResidual:['native-stationary','bounded-control-stationary'].every(r=>reports[r].summary.sparkleShare===0)};
 const report={schema:1,build:await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());'),route:{x,z,degrees,travel,frames,roi,warm,encodedFps:60},setup,state,assertions,pass:Object.values(assertions).every(Boolean),qualityPass:null,scope:'Complete native App.renderWorld including water/interior passes, High post/MSAA, frozen simulation and post clocks. Bounded shader control is capture-only; coverage may change inside its band. ROI temporal residuals are diagnostic, not a calibrated visual or hardware frame-time verdict.',reports};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({assertions,state,native:reports['native-pan'].summary,control:reports['bounded-control-pan'].summary,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
