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
const out=args.out??'grass-shimmer-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:args.quality??'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:180000});let ready=false;
 for(let i=0;i<720;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const setup=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};
 const grass=T.world.modules.find(m=>m.name==='groundcover')?.module;if(!grass)throw new Error('Grass unavailable');
 const camera=T.cam.camera.clone(),height=T.world.terrain.heightAt(${x},${z}),focus=T.player.group.position.clone().set(${x},height,${z});
 camera.position.set(${x},height+1.4,${z}-3);camera.lookAt(${x},height+.3,${z}+2);camera.updateMatrixWorld();
 grass.update(0,{camera,focus,reducedMotion:true});const keep=new Set();grass.group.traverse(o=>keep.add(o));
 T.world.scene.traverse(o=>{if((o.isMesh||o.isPoints||o.isLine)&&!keep.has(o))o.visible=false;});
 T.renderer.setRenderTarget(null);T.renderer.render(T.world.scene,camera);T.renderer.shadowMap.autoUpdate=false;
 window.__grassCapture={camera,base:camera.quaternion.clone(),grass};
 return {revision:T.buildRevision??null,grass:grass.stats(),width:T.renderer.domElement.width,height:T.renderer.domElement.height};`);
 const stamp=await page.eval(`const r=await fetch(new URL('version.json',document.baseURI));return r.ok?await r.json():null;`);
 const reports={};let repeatIdentical=true;
 for(const route of ['stationary','pan']){
  const dir=path.join(out,route);fs.mkdirSync(dir,{recursive:true});
  for(let i=0;i<frames;i++){
   const angle=route==='pan'?degrees*Math.PI/180*i/(frames-1):0;
   await page.eval(`const T=window.tervain,F=window.__grassCapture;F.camera.quaternion.copy(F.base);F.camera.rotateY(${angle});F.camera.updateMatrixWorld();T.renderer.render(T.world.scene,F.camera);`);
   const file=path.join(dir,String(i).padStart(4,'0')+'.png');await page.shot(file);
   if(i===0){await page.eval('const T=window.tervain,F=window.__grassCapture;T.renderer.render(T.world.scene,F.camera);');const repeat=path.join(dir,'repeat.png');await page.shot(repeat);repeatIdentical&&=fs.readFileSync(file).equals(fs.readFileSync(repeat));}
  }
  const clip=path.join(out,route+'.mkv');const encode=spawnSync('ffmpeg',['-v','error','-y','-framerate','60','-i',path.join(dir,'%04d.png'),'-c:v','ffv1',clip],{timeout:60000});if(encode.status!==0)throw new Error('Lossless encoding failed');
  reports[route]=await analyzeVideo(clip,{roi:[.15,.3,.7,.65],maxFrames:frames});
 }
 const assertions={nonemptyGrass:setup.grass.grassInstances>0,repeatIdentical,stationaryZeroResidual:reports.stationary.summary.sparkleShare===0,completeFrameCounts:Object.values(reports).every(r=>r.decodedFrames===frames&&r.summary.usableFrames===frames-2)};
 const report={schema:1,build:stamp,route:{x,z,degrees,frames,encodedFps:60},setup,assertions,pass:Object.values(assertions).every(Boolean),scope:'isolated native grass with frozen simulation, wind, trample and lights; camera-only pan; lossless captures encoded at a synthetic cadence, not measured frame pacing',reports};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({assertions,stationary:reports.stationary.summary,pan:reports.pan.summary,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
