#!/usr/bin/env node
import fs from 'node:fs';
import assert from 'node:assert/strict';
import path from 'node:path';
import sharp from 'sharp';
const [beforeFile,afterFile,output]=process.argv.slice(2);
if(!beforeFile||!afterFile||!output)throw Error('Usage: node tools/compare-mud-replays.mjs BEFORE.json AFTER.json OUTPUT.json');
assert(![beforeFile,afterFile].some(file=>path.resolve(file)===path.resolve(output)),'output must differ from inputs');
fs.rmSync(output,{force:true});
const before=JSON.parse(fs.readFileSync(beforeFile,'utf8')),after=JSON.parse(fs.readFileSync(afterFile,'utf8'));
assert(before.pass&&after.pass);assert.deepEqual(before.config,after.config);assert.equal(before.capture,after.capture);
for(const key of ['arrivals','roles','quality','dpr','width','height','audioState','threadCpuClock'])assert.deepEqual(before.setup[key],after.setup[key],key);
const pixels=[];
if(before.capture)for(const [file,report] of [[beforeFile,before],[afterFile,after]]) {
 const dir=path.join(path.dirname(file),'frames');
 const png=fs.readdirSync(dir).filter(n=>/^[0-9]{4}\.png$/.test(n));assert.equal(png.length,report.rows.length,'capture count');
 for(let i=0;i<report.rows.length;i++) {
  const image=sharp(path.join(dir,String(i).padStart(4,'0')+'.png')),meta=await image.metadata(),stats=await image.stats();
  assert.equal(meta.width,report.setup.width);assert.equal(meta.height,report.setup.height);
  assert(stats.channels.slice(0,3).some(c=>c.stdev>3),'blank native capture');
 }
}
if(before.capture)for(let i=0;i<before.rows.length;i++) {
 const filename=String(i).padStart(4,'0')+'.png';
 const a=await sharp(path.join(path.dirname(beforeFile),'frames',filename)).removeAlpha().raw().toBuffer();
 const b=await sharp(path.join(path.dirname(afterFile),'frames',filename)).removeAlpha().raw().toBuffer();
 assert.equal(a.length,b.length);let changed=0,maxDelta=0;
 for(let j=0;j<a.length;j+=3){let different=false;for(let k=0;k<3;k++){const d=Math.abs(a[j+k]-b[j+k]);different ||= d>0;maxDelta=Math.max(maxDelta,d);}if(different)changed++;}
 pixels.push({i,changedPixels:changed,maxChannelDelta:maxDelta});
}
let routeError=0,cameraError=0,rotationError=0,waterError=0;
assert.equal(before.rows.length,after.rows.length);
for(let i=0;i<before.rows.length;i++) {
 const a=before.rows[i],b=after.rows[i];assert.equal(a.i,b.i);assert.equal(a.arrivalCalls,b.arrivalCalls);assert.equal(a.audioState,b.audioState);
 routeError=Math.max(routeError,Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z));waterError=Math.max(waterError,Math.abs(a.waterDepth-b.waterDepth));
 cameraError=Math.max(cameraError,Math.hypot(...a.camera.map((x,j)=>x-b.camera[j])));
 rotationError=Math.max(rotationError,Math.min(Math.hypot(...a.cameraQuaternion.map((x,j)=>x-b.cameraQuaternion[j])),Math.hypot(...a.cameraQuaternion.map((x,j)=>x+b.cameraQuaternion[j]))));
}
assert(routeError<.001,`route drift ${routeError}`);assert(cameraError<.001,`camera drift ${cameraError}`);assert(rotationError<.001,`camera rotation drift ${rotationError}`);assert(waterError<.001,`water depth drift ${waterError}`);
const report={scope:'Matched-input rendered route comparison. Validates replay conditions and route/camera agreement, not a hardware performance pass. Capture runs cannot prove stall removal.',beforeRevision:before.setup.revision,afterRevision:after.setup.revision,frames:before.rows.length,capture:before.capture,pixels,maxRouteError:routeError,maxCameraError:cameraError,maxCameraQuaternionError:rotationError,maxWaterDepthError:waterError,before:before.stats,after:after.stats,matched:true,hitchFixed:null};
fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
