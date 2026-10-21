#!/usr/bin/env node
/** Fixed dense-fir native renders, shadow submissions, completed game frames and deferred-load ordering. */
import fs from 'node:fs';
import path from 'node:path';
import { openPage } from '../../../../tools/cdp.mjs';
const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => v.startsWith('--') ? [...a, [v.slice(2), all[i + 1]]] : a, []));
const out = path.resolve(args.out ?? 'dense-fir-proof'), url = new URL(args.url ?? 'https://ael-dev3.github.io/Tervain/');
const count = Number(args.frames ?? 10);
if (!Number.isInteger(count) || count < 4 || count > 300) throw Error('frames must be 4–300');
for (const [k, v] of Object.entries({shot:'1', quality:'high', settle:'1', hud:'0', hour:'15'})) url.searchParams.set(k, v);
fs.mkdirSync(out, {recursive:true}); fs.rmSync(path.join(out, 'report.json'), {force:true});
const loadSkip = args['skip-loading-raster'] === 'true';
const init = (loadSkip ? `(()=>{const saved=[];for(const proto of [globalThis.WebGLRenderingContext?.prototype,globalThis.WebGL2RenderingContext?.prototype])if(proto)for(const n of ['drawArrays','drawElements','drawArraysInstanced','drawElementsInstanced','drawRangeElements'])if(typeof proto[n]==='function'){saved.push([proto,n,proto[n]]);proto[n]=()=>{};}globalThis.__restoreFirRaster=()=>{for(const[p,n,fn]of saved)p[n]=fn;globalThis.__firRasterSkipped=false;};globalThis.__firRasterSkipped=true;})();` : '') + `
window.__firLoad=[];let observed,arrived=false;
function observe(){const T=window.tervain;if(T?.world&&T.world!==observed){observed=T.world;arrived=false;T.world.arrived.then(()=>{arrived=true;window.__firLoad.push({event:'world-arrived',time:performance.now(),loadingOff:T.loadingEl.classList.contains('off')});});}
if(T?.world&&T.mode==='play'&&T.loadingEl.classList.contains('off')&&!window.__firReady){window.__firReady=true;window.__firLoad.push({event:'loading-hidden',time:performance.now(),worldArrived:arrived,residents:T.arrivals.count,furnitureReady:T.world.modules.find(m=>m.name==='furniture')?.module.arrived});}requestAnimationFrame(observe);}requestAnimationFrame(observe);`;
let page;
try {
  page = await openPage(url.href, {w:640,h:360,headed:args.headed==='true',init,requestTimeoutMs:600000});
  let ready=false;
  for(let i=0;i<1600;i++){if(await page.eval('return window.__firReady===true')){ready=true;break;}await page.wait(250);}
  if(!ready)throw Error('World did not open');
  await page.eval(`const T=tervain;window.__firOriginal={render:T.render,step:T.step,frame:T.frame,present:T.present};T.render=()=>{};T.step=()=>{};await T.world.arrived;T.frame=()=>{};T.present=()=>{};`);
  const readiness=await page.eval(`return {events:__firLoad,residents:tervain.arrivals.count,missingRoles:tervain.arrivals.waiting.filter(f=>!tervain.npcAssets?.has(f.role)).length};`);
  const build=await page.eval(`return fetch(new URL('version.json',document.baseURI)).then(r=>r.json())`);
  await page.eval(`const T=tervain,W=T.world;T.worldLook=null;T.grade.time=0;T.lastFrameDt=0;T.player.setPosition(97.92903863452375,122.73058451269753,0,W.terrain);window.__firPose=(yaw=0)=>{const c=T.cam.camera,V=c.position.constructor,target=new V(89.90264990451256,27.580630589033508,87.60124948156104),offset=new V(8.02638873001119,-15.181669902641545,35.12933503113649).applyAxisAngle(new V(0,1,0),yaw);T.cam.manual={p:target.clone().add(offset),look:target};c.position.copy(T.cam.manual.p);c.lookAt(target);c.updateMatrixWorld();for(let i=0;i<30;i++){W.prepareGrass(T.renderer,0);W.update(0,T.game.state,T.player.group.position,T.settings,15,c,false);}W.sky.cloudTime=0;W.foliage.strength.value=0;W.foliage.wind.uniforms.uGrassTime.value=0;W.sway.uTime.value=0;};__firPose();__restoreFirRaster?.();if(globalThis.__firRasterSkipped)throw Error('Raster still suppressed');T.renderWorld();const R=T.renderer,original=R.renderBufferDirect;window.__firSubmissions=[];R.renderBufferDirect=function(camera,scene,geometry,material,object,group){const before={...R.info.render};const result=original.apply(this,arguments);__firSubmissions.push({name:object.name,shadow:camera===W.sky.sun.shadow.camera,draws:R.info.render.calls-before.calls,triangles:R.info.render.triangles-before.triangles});return result;};`);
  const poses=[];
  for(const [index,yaw] of [0].entries()){
    const row=await page.eval(`__firPose(${yaw});const T=tervain,R=T.renderer;__firSubmissions=[];R.info.reset();R.shadowMap.needsUpdate=true;T.grade.waterPass.reflectionValid=false;T.grade.waterPass.reflectionAge=Infinity;const start=performance.now();T.renderWorld();return{yaw:${yaw},cpu:performance.now()-start,draws:R.info.render.calls,triangles:R.info.render.triangles,submissions:__firSubmissions,glError:R.getContext().getError(),png:R.domElement.toDataURL().split(',')[1]};`);
    fs.writeFileSync(path.join(out,`pose-${index}.png`),Buffer.from(row.png,'base64'));delete row.png;poses.push(row);console.log(JSON.stringify({pose:index,...row,submissions:row.submissions.length}));
  }
  await page.eval(`__firPose();tervain.renderWorld();`);
  await page.cdp('Profiler.enable');await page.cdp('Profiler.setSamplingInterval',{interval:1000});await page.cdp('Profiler.start');
  const frames=await page.eval(`const T=tervain,original=__firOriginal,end=T.perf.end;return await new Promise(resolve=>{const frames=[];T.perf.end=function(interval){const sample=end.call(this,interval);frames.push({...sample,windStrength:T.world.foliage.strength.value,reducedMotion:T.settings.reducedMotion,submissions:__firSubmissions});__firSubmissions=[];if(frames.length===${count}){T.frame=()=>{};T.step=()=>{};T.present=()=>{};T.perf.end=end;resolve(frames);}return sample;};T.render=original.render;T.step=original.step;T.present=original.present;T.frame=original.frame;T.lastFrameDt=0;__firSubmissions=[];requestAnimationFrame(t=>T.frame(t));});`);
  const profile=await page.cdp('Profiler.stop');fs.writeFileSync(path.join(out,'cpu.cpuprofile'),JSON.stringify(profile.result?.profile??profile.profile??profile));
  const endBuild=await page.eval(`return fetch(new URL('version.json',document.baseURI)).then(r=>r.json())`);
  const errors=page.console().filter(x=>x.startsWith('[error]')||x.startsWith('[exception]'));
  const report={build,endBuild,scope:'640x360 DPR1 High live 0.0.46; one frozen setup still then actual normal-wind game-loop frames. Wind strength/settings recorded per frame. Software times are not Apple-GPU pacing.',loadSkip,readiness,poses,frames,errors,complete:build.revision===endBuild.revision&&!errors.length&&poses.every(p=>p.glError===0)&&frames.length===count};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report));console.log(JSON.stringify({complete:report.complete,build,readiness,frames:frames.map(({submissions,...f})=>f)}));if(!report.complete)process.exitCode=1;
}finally{await page?.close();}
