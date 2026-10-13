#!/usr/bin/env node
/** Frozen native grass, stationary control and deterministic pan. No hardware timing claim. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {openPage} from './cdp.mjs';
import {analyzeVideo} from './video-shimmer.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const frames=Number(args.frames??24),x=Number(args.x??-7),z=Number(args.z??45),degrees=Number(args.degrees??2);
if(!Number.isInteger(frames)||frames<3||frames>180||![x,z,degrees].every(Number.isFinite)||Math.abs(degrees)>20)throw new Error('Invalid capture route');
if(args.quality&&!['low','medium','high'].includes(args.quality))throw new Error('Invalid quality preset');
const out=args.out??'grass-shimmer-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:args.quality??'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;
try{
 page=await openPage(url.href,{w:640,h:360,headed:args.headed==='true',requestTimeoutMs:180000});let ready=false;
 for(let i=0;i<720;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const setup=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};
 const grass=T.world.modules.find(m=>m.name==='groundcover')?.module;if(!grass)throw new Error('Grass unavailable');
 const camera=T.cam.camera.clone(),height=T.world.terrain.heightAt(${x},${z}),focus=T.player.group.position.clone().set(${x},height,${z});
 camera.position.set(${x},height+1.4,${z}-3);camera.lookAt(${x},height+.3,${z}+2);camera.updateMatrixWorld();
 grass.update(0,{camera,focus,reducedMotion:true});const keep=new Set();grass.group.traverse(o=>keep.add(o));
 T.world.scene.traverse(o=>{if((o.isMesh||o.isPoints||o.isLine)&&!keep.has(o))o.visible=false;});
 if(T.worldLook){T.grade.setLook(T.worldLook);T.worldLook=null;}T.grade.setLook({night:T.world.sky.state.nightness});T.renderer.toneMappingExposure=1.22;
 const R=T.renderer,gl=R.getContext();R.setRenderTarget(null);const defaultSamples=gl.getParameter(gl.SAMPLES),maxSamples=gl.getParameter(gl.MAX_SAMPLES);
 const capture={camera,base:camera.quaternion.clone(),grass,pipeline:'native',samples:{native:new Set(),raw:new Set()}};
 const render=R.render;R.render=function(scene,cam){if(scene===T.world.scene&&cam===camera&&!capture.samples[capture.pipeline].size)capture.samples[capture.pipeline].add(gl.getParameter(gl.SAMPLES));return render.call(this,scene,cam);};
 capture.render=()=>{R.setRenderTarget(null);if(capture.pipeline==='native')T.grade.render(T.world.scene,camera,0);else R.render(T.world.scene,camera);};
 window.__grassCapture=capture;capture.render();R.shadowMap.autoUpdate=false;
 return {grass:grass.stats(),width:R.domElement.width,height:R.domElement.height,postEnabled:T.grade.enabled,requestedSamples:T.grade.target.samples,look:T.grade.getLook(),defaultSamples,maxSamples};`);
 const stamp=await page.eval(`const r=await fetch(new URL('version.json',document.baseURI));return r.ok?await r.json():null;`);
 const reports={};let repeatIdentical=true;
 const routes=['stationary','pan',...(args['raw-control']==='true'?['raw-stationary','raw-pan']:[])];
 for(const route of routes){
  const dir=path.join(out,route);fs.mkdirSync(dir,{recursive:true});
  for(let i=0;i<frames;i++){
   const angle=route.endsWith('pan')?degrees*Math.PI/180*i/(frames-1):0;
   await page.eval(`const F=window.__grassCapture;F.pipeline=${JSON.stringify(route.startsWith('raw-')?'raw':'native')};F.camera.quaternion.copy(F.base);F.camera.rotateY(${angle});F.camera.updateMatrixWorld();F.render();`);
   const file=path.join(dir,String(i).padStart(4,'0')+'.png');await page.shot(file);
   if(i===0){await page.eval('window.__grassCapture.render();');const repeat=path.join(dir,'repeat.png');await page.shot(repeat);repeatIdentical&&=fs.readFileSync(file).equals(fs.readFileSync(repeat));}
  }
  const clip=path.join(out,route+'.mkv');const encode=spawnSync('ffmpeg',['-v','error','-y','-framerate','60','-i',path.join(dir,'%04d.png'),'-frames:v',String(frames),'-c:v','ffv1',clip],{timeout:60000});if(encode.status!==0)throw new Error('Lossless encoding failed');
  reports[route]=await analyzeVideo(clip,{roi:[.15,.3,.7,.65],maxFrames:frames});
 }
 const samples=await page.eval('const s=window.__grassCapture.samples;return {native:[...s.native],raw:[...s.raw]};');
 const expectedSamples=setup.postEnabled?Math.min(setup.requestedSamples,setup.maxSamples):0;
 const assertions={nonemptyGrass:setup.grass.grassInstances>0,repeatIdentical,stationaryZeroResidual:routes.filter(r=>r.endsWith('stationary')).every(r=>reports[r].summary.sparkleShare===0),completeFrameCounts:Object.values(reports).every(r=>r.decodedFrames===frames&&r.summary.usableFrames===frames-2),nativeSamples:samples.native.length===1&&samples.native[0]===expectedSamples,rawControlSamples:args['raw-control']!=='true'||samples.raw.length===1&&samples.raw[0]===setup.defaultSamples};
 const report={schema:2,build:stamp?{version:stamp.version,revision:stamp.revision}:null,route:{x,z,degrees,frames,encodedFps:60},setup,samples,assertions,pass:Object.values(assertions).every(Boolean),qualityPass:null,scope:'isolated native grass through the selected preset post-processing/MSAA, frozen simulation, wind, trample, lights and post clock; optional raw control bypasses post-processing; synthetic encoding cadence, not measured frame pacing or a calibrated quality verdict',reports};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({assertions,samples,stationary:reports.stationary.summary,pan:reports.pan.summary,rawPan:reports['raw-pan']?.summary,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
