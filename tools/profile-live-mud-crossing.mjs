#!/usr/bin/env node
/** CPU-only fixed-step crossing repro on a published build. Rendering is frozen: these are not presented frame times. */
import fs from 'node:fs';import path from 'node:path';import {liveProofPage} from './live-proof-page.mjs';
const url=process.argv[2]??'https://ael-dev3.github.io/Tervain/',out=path.resolve(process.argv[3]??'artifacts/mud-crossing');fs.mkdirSync(out,{recursive:true});
const page=await liveProofPage(url);
try {
 await page.cdp('Profiler.enable');await page.cdp('Profiler.setSamplingInterval',{interval:100});await page.cdp('Profiler.start');
 const rows=await page.eval(`const T=window.tervain;T.player.setPosition(-30,40,Math.PI/2,T.world.terrain);T.cam.yaw=Math.PI/2;T.cam.manual=null;const rows=[],code=T.settings.bindings.forward?.[0]??'KeyW';window.dispatchEvent(new KeyboardEvent('keydown',{code,key:'w'}));try{for(let i=0;i<300;i++){const start=performance.now();Object.getPrototypeOf(T).step.call(T,1/60);T.input.endFrame();rows.push({i,x:T.player.x,y:T.player.y,z:T.player.z,ms:performance.now()-start,water:T.player.waterDepth});}}finally{window.dispatchEvent(new KeyboardEvent('keyup',{code,key:'w'}))}return rows;`);
 const response=await page.cdp('Profiler.stop'),profile=response.result.profile;
 // Keep source locations useful for bundle attribution without publishing host/session URLs.
 for(const node of profile.nodes){const u=node.callFrame.url;node.callFrame.url=/\/assets\/[^/]+\.js/.exec(u)?.[0].slice(1)??'';}
 fs.writeFileSync(path.join(out,'cpu.json'),JSON.stringify(profile));
 if(rows.length!==300||rows.at(-1).x<=-24||!rows.some(r=>r.water>0))throw new Error('Crossing did not reach shallow water');
 const report={scope:'Published build CPU-only fixed simulation steps; rendering frozen. Diagnostic wall times include profiling overhead and scheduling. Not a hardware frame-time or exact video-route replay.',url,steps:rows.length,start:rows[0],end:rows.at(-1),maxStep:rows.reduce((a,b)=>a.ms>b.ms?a:b),waterSteps:rows.filter(r=>r.water>0).length,rows};fs.writeFileSync(path.join(out,'steps.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({steps:rows.length,start:report.start,end:report.end,waterSteps:report.waterSteps,maxStep:report.maxStep}));
}finally{page.close()}
