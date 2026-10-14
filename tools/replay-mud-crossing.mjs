#!/usr/bin/env node
/** Rendered fixed-step boundary replay. Software timings are diagnostic, never a hardware FPS receipt. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const input=args.url??'https://ael-dev3.github.io/Tervain/',out=path.resolve(args.out??'mud-crossing-replay'),frames=Number(args.frames??300),steps=Number(args.steps??1),capture=args.capture==='true',quality=args.quality??'high',[width,height]=(args.size??'640x360').split('x').map(Number);
assert(['low','medium','high'].includes(quality));assert(width>=160&&height>=90&&Number.isFinite(width)&&Number.isFinite(height));
const from=(args.from??'-30,40').split(',').map(Number),yaw=Number(args.yaw??Math.PI/2),pitch=Number(args.pitch??.12),hour=Number(args.hour??11);
assert(from.length===2&&from.every(Number.isFinite)&&[yaw,pitch,hour].every(Number.isFinite));
assert(Number.isInteger(frames)&&frames>=2&&frames<=600);assert(Number.isInteger(steps)&&steps>=1&&steps<=10);
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});fs.rmSync(path.join(out,'walk.mp4'),{force:true});
if(capture){fs.mkdirSync(path.join(out,'frames'),{recursive:true});for(const file of fs.readdirSync(path.join(out,'frames')))if(/^[0-9]{4}\.png$/.test(file))fs.rmSync(path.join(out,'frames',file));}
const url=new URL(input);for(const[k,v]of Object.entries({shot:'1',quality,place:'rillford',settle:'1',hud:'0',hour:String(hour)}))url.searchParams.set(k,v);
const init=`(${installRenderCost.toString()})(${textureUploadBytes.toString()});let seed=1729;Math.random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296;};\n`+(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'');
const page=await openPage(url.href,{w:width,h:height,init,headed:args.headed==='true',requestTimeoutMs:600000});
try {
 let ready=false;for(let i=0;i<1800;i++){const state=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(state.failed)throw Error('World preparation failed');if(state.ready){ready=true;break;}if(i%120===0)console.log(JSON.stringify({loading:true,checks:i}));await page.wait(250);}assert(ready,'world ready');
 const setup=await page.eval(`const T=window.tervain;T.step=()=>{};T.render=()=>{};await Promise.all([T.world.arrived,T.castLoad]);T.input.releaseAll();T.player.setPosition(${from[0]},${from[1]},${yaw},T.world.terrain);T.cam.yaw=${yaw};T.cam.manual=null;T.cam.pitch=${pitch};T.cam.reset();T.lastFrameDt=1/60;
 window.__mud={rows:[],arrivalMs:0,arrivalCalls:0,advanceMs:0,maxAdvanceMs:0,links:0,totalLinks:0,lastLinks:0,lastUpload:__renderCostStates.get(T.renderer.getContext()).uploads,started:performance.now(),longTasks:[],frame:0,code:T.settings.bindings.forward?.[0]??'KeyW'};
 const M=window.__mud,A=T.arrivals,update=A.update,advance=A.advance;A.update=function(...a){const start=performance.now();try{return update.apply(this,a)}finally{M.arrivalMs+=performance.now()-start;M.arrivalCalls++}};A.advance=function(...a){const start=performance.now();try{return advance.apply(this,a)}finally{const ms=performance.now()-start;M.advanceMs+=ms;M.maxAdvanceMs=Math.max(M.maxAdvanceMs,ms)}};
 const gl=T.renderer.getContext(),link=gl.linkProgram;gl.linkProgram=function(...a){M.links++;M.totalLinks++;return link.apply(this,a)};
 try{new PerformanceObserver(list=>{for(const e of list.getEntries())M.longTasks.push({frame:M.frame,startMs:e.startTime-M.started,durationMs:e.duration});}).observe({type:'longtask',buffered:false});}catch{}
 return {revision:document.querySelector('.menu-build')?.textContent,arrivals:A.count,roles:A.waiting.map(f=>f.role),quality:T.settings.quality,dpr:T.renderer.getPixelRatio(),width:T.renderer.domElement.width,height:T.renderer.domElement.height};`);
 await page.key('keyDown',await page.eval('return __mud.code;'),'w');
 setup.audioState=await page.eval('return window.tervain.audio.ctx?.state??null;');
 let lastCpu=null;
 const readCpu=async()=>Object.fromEntries((await page.cdp('Performance.getMetrics')).result.metrics.map(m=>[m.name,m.value]));
 if(args['thread-cpu']==='true'){await page.cdp('Performance.enable',{timeDomain:'threadTicks'});lastCpu=await readCpu();assert(Number.isFinite(lastCpu.ThreadTime));setup.threadCpuClock='threadTicks';}
 console.log(JSON.stringify({setup}));
 for(let i=0;i<frames;i++) {
  const row=await page.eval(`const T=window.tervain,M=window.__mud;M.frame=${i};M.arrivalMs=M.arrivalCalls=M.advanceMs=M.maxAdvanceMs=M.links=0;const renderer=T.renderer,gl=renderer.getContext(),cost=__renderCostStates.get(gl),upload=cost.uploads;renderer.info.autoReset=false;renderer.info.reset();
 const before=performance.now();let maxStepMs=0;for(let s=0;s<${steps};s++){T.catchUp=s>0;const started=performance.now();Object.getPrototypeOf(T).step.call(T,1/60);T.input.endFrame();maxStepMs=Math.max(maxStepMs,performance.now()-started);}T.catchUp=false;const afterStep=performance.now();T.renderWorld();const afterRender=performance.now();
 const row={i:${i},step:T.simStep,x:T.player.x,y:T.player.y,z:T.player.z,waterDepth:T.player.waterDepth??0,simulationMs:afterStep-before,maxStepMs,audioState:T.audio.ctx?.state??null,renderSubmitMs:afterRender-afterStep,arrivalMs:M.arrivalMs,arrivalCalls:M.arrivalCalls,maxAdvanceMs:M.maxAdvanceMs,pending:T.arrivals.count,links:M.links,intervalLinks:M.totalLinks-M.lastLinks,intervalUploads:cost.uploads-M.lastUpload,uploads:cost.uploads-upload,draws:renderer.info.render.calls,triangles:renderer.info.render.triangles,camera:T.cam.camera.position.toArray(),cameraQuaternion:T.cam.camera.quaternion.toArray(),glError:gl.getError(),contextLost:gl.isContextLost()};M.lastLinks=M.totalLinks;M.lastUpload=cost.uploads;M.rows.push(row);return ${capture ? '{...row,image:renderer.domElement.toDataURL("image/png")}' : 'row'};`);
  if(lastCpu){const now=await readCpu();row.threadCpuMs=(now.ThreadTime-lastCpu.ThreadTime)*1000;row.taskCpuMs=(now.TaskDuration-lastCpu.TaskDuration)*1000;lastCpu=now;await page.eval(`Object.assign(__mud.rows.at(-1),${JSON.stringify({threadCpuMs:row.threadCpuMs,taskCpuMs:row.taskCpuMs})});`);}
  if(capture){fs.writeFileSync(path.join(out,'frames',String(i).padStart(4,'0')+'.png'),Buffer.from(row.image.split(',')[1],'base64'));delete row.image;}
  console.log(JSON.stringify(row));
  await page.eval('await new Promise(resolve=>requestAnimationFrame(resolve));');
 }
 await page.key('keyUp',await page.eval('return __mud.code;'),'w');
 const rows=await page.eval('return __mud.rows;');
 assert.equal(rows.length,frames);assert(rows.every(r=>r.draws>0&&r.triangles>0&&r.glError===0&&!r.contextLost));assert(rows.every(r=>r.arrivalCalls<=1));assert(rows.some(r=>r.waterDepth>0),'route crosses shallow water');assert(Math.hypot(rows.at(-1).x-from[0],rows.at(-1).z-from[1])>2,'route advances across the boundary');
 const stats=key=>{const v=rows.map(r=>r[key]).sort((a,b)=>a-b);return {p50:v[Math.floor(v.length*.5)],p95:v[Math.floor(v.length*.95)],max:v.at(-1)}};
 const longTasks=await page.eval('await new Promise(r=>setTimeout(r,0));return __mud.longTasks;');
 const cpuStats=rows.every(r=>Number.isFinite(r.threadCpuMs))?{threadCpuMs:stats('threadCpuMs'),taskCpuMs:stats('taskCpuMs')}:{};
 const report={longTasks,scope:'Native compiled web build, full App simulation and native renderWorld/post/water passes; MSAA follows the selected preset. Trusted browser forward-key input, fixed seed and fixed 60 Hz simulation; one render per '+steps+' steps. Capture readbacks, when enabled, make timings unsuitable for performance comparison. Software render submission is not presented hardware frame timing. Route is a reproducible shallow-water crossing, not the exact uploaded-video camera path.',capture,setup,config:{seed:1729,frames,stepsPerRender:steps,dt:1/60,start:from,yaw,pitch,hour},stats:{...cpuStats,...Object.fromEntries(['simulationMs','maxStepMs','renderSubmitMs','arrivalMs','maxAdvanceMs','uploads','draws','triangles'].map(k=>[k,stats(k)]))},rows,pass:true};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 if(capture){const result=spawnSync('ffmpeg',['-v','error','-y','-framerate',String(60/steps),'-i',path.join(out,'frames','%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','18',path.join(out,'walk.mp4')],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);}
 console.log(JSON.stringify({pass:true,stats:report.stats}));
}finally{page.close();}
