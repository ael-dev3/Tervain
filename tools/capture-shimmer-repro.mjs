#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const out=args.out??'shimmer-repro'; fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const [key,value] of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0',settle:'1'}))url.searchParams.set(key,value);
const count=Number(args.frames??12);
if(!Number.isInteger(count)||count<5||count>120)throw new Error('Invalid capture frame count');
let page;
try{
  page=await openPage(url.href,{w:640,h:360,flags:['--use-gl=angle','--use-angle=swiftshader']});
  let ready=false;
  for(let i=0;i<400;i++){if(await page.eval('return document.title === "READY";')){ready=true;break;}await page.wait(250);}
  if(!ready)throw new Error('Capture journey did not become ready');
  const context=await page.eval(`const T=window.tervain, gl=T.renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
    T._captureStep=T.step; T._captureRender=T.render; T.step=()=>{}; T.render=()=>{}; T._captureYaw=T.cam.camera.rotation.y;
    const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());
    return {software:!!ext && /swiftshader/i.test(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)),build:{version:version.version,revision:version.revision}};`);
  if(!context.software)throw new Error('Expected software renderer');
  for(let i=0;i<count;i++){
    await page.eval(`const T=window.tervain; T.cam.camera.rotation.y=T._captureYaw+${i}*.004; T.lastFrameDt=1/60; T._captureRender.call(T);`);
    await page.shot(path.join(out,`frame-${String(i).padStart(3,'0')}.png`));
  }
  const result=spawnSync('ffmpeg',['-v','error','-y','-framerate','60','-i',path.join(out,'frame-%03d.png'),'-c:v','ffv1',path.join(out,'pan.mkv')],{timeout:60000});
  if(result.status!==0)throw new Error('Lossless clip encoding failed');
  fs.writeFileSync(path.join(out,'capture.json'),JSON.stringify({schema:1,software:true,build:context.build,preset:'low',dimensions:[640,360],frames:count,encodedFps:60,fixture:'stepped camera pan with frozen simulation',performanceMeasurement:false},null,2)+'\n');
  for(let i=1;i<count;i++)fs.unlinkSync(path.join(out,`frame-${String(i).padStart(3,'0')}.png`));
}finally{page?.close();}
