#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
if(!args.controls)throw Error('Supply matched --controls JSON');
const controls=JSON.parse(fs.readFileSync(args.controls,'utf8')),frames=Number(args.frames??5),start=Number(args.start??7),out=args.out??'grass-coverage-build';
if(!Number.isInteger(frames)||frames<3||frames>181||!Number.isInteger(start)||start<0)throw Error('Invalid frame window');
fs.mkdirSync(out,{recursive:true});const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:String(controls.hour)}))url.searchParams.set(k,v);
const page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
try{
 let ready=false;for(let i=0;i<1200;i++){const state=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(state.failed)throw Error('Build failed to load');if(state.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('Build not ready');
 await page.eval(`const T=window.tervain;T.step=()=>{};T.render=()=>{};await T.world.arrived;const C=${JSON.stringify(controls)},u=T.world.foliage.wind.uniforms;u.uGrassTime.value=C.wind.time;u.uWindDir.value.fromArray(C.wind.direction);u.uGustScroll.value.fromArray(C.wind.scroll);T.world.sway.uTime.value=C.sway;T.grade.time=C.gradeTime;T.world.sky.update(C.hour,T.player.group.position,0,false);T.grade.setLook({night:T.world.sky.state.nightness});T.renderer.shadowMap.autoUpdate=false;const gl=T.renderer.getContext();for(let i=0;i<64;i++)if(!gl.getError())break;`);
 const build=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');
 const profile=await page.eval('const T=window.tervain;return {nativeHero:!!T.player.rig.hero,postEnabled:T.grade.enabled,postSamples:T.grade.target.samples,drawingBuffer:[T.renderer.domElement.width,T.renderer.domElement.height],programs:[...document.scripts].map(s=>s.src.split("/").pop()).filter(s=>s.startsWith("tervain-"))};');
 const samples=[];for(let i=0;i<frames;i++){
  await page.eval(`const T=window.tervain,d=${(start+i)*2.6/60},h=T.world.terrain.heightAt(-7,45+d),camera=T.cam.camera;camera.position.set(-7,h+1.4,42+d);camera.lookAt(-7,h+.3,47+d);camera.updateMatrixWorld();const g=T.world.modules.find(m=>m.name==='groundcover').module;g.prepare?.(T.renderer,0);g.update(0,{camera,focus:T.player.group.position,reducedMotion:true});T.grade.render(T.world.scene,camera,0);const gl=T.renderer.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid capture draw');`);
  const file=path.join(out,String(i).padStart(2,'0')+'.png');await page.shot(file);const pixels=await sharp(file).removeAlpha().raw().toBuffer();
  let expectedIdentical=null;if(args.expected){const reference=await sharp(path.join(args.expected,'strawCoverage-'+String(i).padStart(2,'0')+'.png')).removeAlpha().raw().toBuffer();expectedIdentical=pixels.equals(reference);assert.ok(expectedIdentical,'Compiled build differs from candidate experiment at frame '+i);}
  samples.push({sourceFrame:start+i,rgbSha256:createHash('sha256').update(pixels).digest('hex'),expectedIdentical});
 }
 const assertions={nativeHero:profile.nativeHero,nativePostMsaa:profile.postEnabled&&profile.postSamples===4,expectedFramesMatch:args.expected?samples.every(s=>s.expectedIdentical):null};
 const report={schema:1,build,profile,controls,startFrame:start,frames,samples,assertions,scope:'Actual production build, native whole-scene post/MSAA, no shader overrides. Fixed controls and synthetic camera walk; no hardware timing or general quality-pass claim.'};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');assert.ok(assertions.nativeHero&&assertions.nativePostMsaa);console.log(JSON.stringify({build,profile,assertions}));
}finally{page.close();}
