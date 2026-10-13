#!/usr/bin/env node
import fs from 'node:fs';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((arg,i,all)=>arg.startsWith('--')?[[arg.slice(2),all[i+1]]]:[]));
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[key,value]of Object.entries({shot:'1',quality:'low',place:'rillford',hud:'0'}))url.searchParams.set(key,value);let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;for(let i=0;i<400;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Production journey not ready');
 const report=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};
  const animals=T.world.animals,effects=animals.group.getObjectByName('animal impact effects'),pool=effects?.children.find(o=>o.isInstancedMesh);if(!pool)throw new Error('Native impact pool missing');
  const scene=new T.world.scene.constructor();scene.add(pool);const camera=T.cam.camera.clone();camera.position.set(0,2,4);camera.lookAt(0,1,0);
  const gl=T.renderer.getContext(),original=gl.bufferSubData;let bytes=0;
  gl.bufferSubData=function(...values){if(values[2]===pool.instanceMatrix.array)bytes+=values[2].byteLength;return original.apply(this,values);};
  const frame={focus:T.player.group.position.clone(),quality:'low',reducedMotion:false,wildlifeActive:true,nightness:0};
  try{
   T.renderer.setRenderTarget(null);T.renderer.render(scene,camera);const version=pool.instanceMatrix.version;
   for(let i=0;i<120;i++){animals.update(1/60,frame);T.renderer.render(scene,camera);}
   const idle={frames:120,count:pool.count,dirtyRequests:pool.instanceMatrix.version-version,uploadedBytes:bytes};
   const target=animals.snapshot().find(a=>a.species==='tiger');animals.showArrowImpact({id:'tiger',zone:'body',point:{x:target.x,y:target.y+1,z:target.z},position:{x:target.x,y:target.y,z:target.z},yaw:target.yaw,distance:1},T.player.group.position.clone().set(0,0,1));
   const emitted=pool.instanceMatrix.version;animals.update(1/60,frame);const emission={count:pool.count,dirtyRequests:pool.instanceMatrix.version-emitted};
   for(let i=0;i<60;i++)animals.update(1/60,frame);T.renderer.render(scene,camera);const expiryCount=pool.count,expired=pool.instanceMatrix.version;bytes=0;
   for(let i=0;i<120;i++){animals.update(1/60,frame);T.renderer.render(scene,camera);}
   const afterExpiry={count:expiryCount,dirtyRequests:pool.instanceMatrix.version-expired,uploadedBytes:bytes};
   const metadata=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());return {build:{version:metadata.version,revision:metadata.revision},animalCount:animals.snapshot().length,idle,emission,afterExpiry,bufferBytes:pool.instanceMatrix.array.byteLength};
  }finally{gl.bufferSubData=original;effects.add(pool);}`);
 const before=args.expect==='before';report.pass=report.animalCount===19&&report.idle.count===0&&report.emission.count===6&&report.emission.dirtyRequests===1&&report.afterExpiry.count===0&&(before?report.idle.uploadedBytes===368640&&report.idle.dirtyRequests===120&&report.afterExpiry.uploadedBytes===368640&&report.afterExpiry.dirtyRequests===120:report.idle.uploadedBytes===0&&report.idle.dirtyRequests===0&&report.afterExpiry.uploadedBytes===0&&report.afterExpiry.dirtyRequests===0);
 fs.writeFileSync(args.out??'idle-impact-repro.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
