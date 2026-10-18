import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
import {threadCpuTrace,threadCpuInterval} from './thread-cpu-trace.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out??'artifacts/shadow-static-matrices';fs.mkdirSync(out,{recursive:true});
const file='src/presentation/flora.ts',source=fs.readFileSync(file,'utf8');
assert.ok(source.includes('c.matrixAutoUpdate = false;'));
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'shadow-static-')),init=path.join(temporary,'init.js');
fs.writeFileSync(init,(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');');process.env.REPRO_INIT_FILE=init;
let page,trace;
try{
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:12});
 const setup=await page.eval(`const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,meshes=F.shadowCasters.children.filter(m=>m.isInstancedMesh),original=meshes.map(m=>m.matrixAutoUpdate);if(!meshes.length||!original.every(Boolean))throw Error('Published baseline no longer has auto-updated shadow matrices');for(const m of meshes){const e=m.matrix.elements;if(!e.every((v,i)=>v===(i%5===0?1:0))||m.position.lengthSq()||m.quaternion.x||m.quaternion.y||m.quaternion.z||m.quaternion.w!==1||!m.scale.toArray().every(v=>v===1))throw Error('Shadow caster has a nonidentity local pose');}T.frame=()=>{};T.present=()=>{};T.perf=null;T.lastFrameDt=0;T.cam.manual=true;T.grade.time=0;T.worldLook=null;T.renderer.shadowMap.autoUpdate=true;const cost=globalThis.__renderCostStates.get(T.renderer.getContext());
globalThis.SM={meshes,original,select(mode){for(const m of meshes)m.matrixAutoUpdate=mode==='before'||${args.aa==='true'};},place(x,z,yaw,pitch,time,hour){T.player.setPosition(x,z,0,W.terrain);const c=T.cam.camera,h=W.terrain.heightAt(x,z);c.position.set(x,h+2,z);c.lookAt(x+30*Math.sin(yaw),h+2-30*Math.tan(pitch),z+30*Math.cos(yaw));c.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,hour,c,false);W.sky.cloudTime=0;W.foliage.wind.uniforms.uGrassTime.value=time;W.sway.uTime.value=time;W.foliage.strength.value=1;},walk(i){this.place(-210+Math.sin(.8)*i*.04,Math.cos(.8)*i*.04,.8+i*.003,Math.atan(.1),1.25,12);},render(){const R=T.renderer,gl=R.getContext(),d=cost.draws,u=cost.uploads;R.info.reset();T.lastFrameDt=0;T.renderWorld();if(gl.getError()||gl.isContextLost())throw Error('Invalid GL');return{${args.cpu==='true'?'':"png:R.domElement.toDataURL('image/png'),"}draws:cost.draws-d,triangles:R.info.render.triangles,uploadBytes:cost.uploads-u,textures:R.info.memory.textures};},count(mode){this.select(mode);const saved=meshes.map(m=>({m,own:Object.hasOwn(m,'updateMatrix'),update:m.updateMatrix}));let compositions=0;for(const s of saved)s.m.updateMatrix=function(){compositions++;return s.update.apply(this,arguments);};try{this.render();}finally{for(const s of saved)if(s.own)s.m.updateMatrix=s.update;else delete s.m.updateMatrix;}return compositions;},restore(){meshes.forEach((m,i)=>m.matrixAutoUpdate=original[i]);}};
SM.walk(0);SM.select('before');SM.render();const counts={before:SM.count('before'),after:SM.count('after'),restored:SM.count('before')};return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),printed:document.querySelector('.menu-build span')?.textContent,quality:T.settings.quality,samples:T.grade.target.samples,rasterSuppressed:globalThis.__tervainCpuNoRaster===true,casters:meshes.length,counts};`);
 assert.equal(setup.rasterSuppressed,args.cpu==='true');assert.equal(setup.samples,4);assert.ok(setup.printed.includes(setup.build.revision));assert.equal(setup.counts.before,setup.casters);assert.equal(setup.counts.restored,setup.casters);assert.equal(setup.counts.after,args.aa==='true'?setup.casters:0);
 console.log(JSON.stringify({setup}));
 let result;
 if(args.cpu==='true'){
  const samples=[];
  for(let run=0;run<3;run++){
   for(let i=0;i<90;i++)await page.eval(`SM.walk(${i});SM.select('before');SM.render();SM.select('after');SM.render();return null;`);
   trace=await threadCpuTrace(page);await trace.start();const current=[];
   for(let i=0;i<120;i++){
    await page.eval(`SM.walk(${i});SM.render();return null;`);
    for(const mode of i%2?['after','before']:['before','after']){
     const label=`static-matrix-${run}-${mode}-${i}`;
     const cost=await page.eval(`SM.select('${mode}');console.timeStamp('${label}-start');const cost=SM.render();console.timeStamp('${label}-end');return cost;`);
     current.push({run,frame:i,mode,label,...cost});
    }
   }
   const events=await trace.end();trace.close();trace=null;
   for(const row of current)samples.push({...row,...threadCpuInterval(events,row.label)});
  }
  const stats=rows=>{const a=rows.map(r=>r.cpuMs).sort((a,b)=>a-b);return{mean:a.reduce((s,v)=>s+v,0)/a.length,p95:a[Math.ceil(a.length*.95)-1],samples:a.length};};
  const summary=Object.fromEntries(['before','after'].map(mode=>[mode,stats(samples.filter(r=>r.mode===mode))]));
  const runs=Array.from({length:3},(_,run)=>({run,before:stats(samples.filter(r=>r.run===run&&r.mode==='before')),after:stats(samples.filter(r=>r.run===run&&r.mode==='after'))}));
  for(let run=0;run<3;run++)for(let frame=0;frame<120;frame++){const a=samples.find(r=>r.run===run&&r.frame===frame&&r.mode==='before'),b=samples.find(r=>r.run===run&&r.frame===frame&&r.mode==='after');for(const key of ['draws','triangles','textures','uploadBytes'])assert.equal(a[key],b[key]);}
  result={setup,aa:args.aa==='true',summary,runs,samples,scope:'Native published High forest moving/turning replay. Only shadow-caster matrixAutoUpdate toggled to match production change. Three runs, 90 warm pairs and 120 balanced measured pairs each; all samples retained. Common render before each pair warms camera-dependent captures. Per-caster updateMatrix instrumentation is removed before timing. Thread CPU covers warmed renderWorld (including its scene matrix walk), not world.update, GPU, raster-driver cost, scheduler waits or Mac FPS. Raster draw entrypoints suppressed for CPU only. aa=true retains baseline flags on both modes.'};
  console.log(JSON.stringify({summary,runs}));
 }else{
  assert.notEqual(args.aa,'true','Use A/A only with CPU mode');
  const poses=Array.from({length:5},(_,i)=>[-210+Math.sin(.8)*i*2.6/60,Math.cos(.8)*i*2.6/60,.8+i*.003,Math.atan(.1),1.25+i*.2,12]).concat([[-210,0,3,0,2.5,12],[-173,7,0,0,2.5,19]]),rows=[];
  const rgb=async png=>sharp(Buffer.from(png.split(',')[1],'base64')).removeAlpha().raw().toBuffer();
  for(let i=0;i<poses.length;i++){
   await page.eval(`SM.place(...${JSON.stringify(poses[i])});SM.select('before');SM.render();SM.select('after');SM.render();return null;`);
   const images={};for(const mode of ['before','after','restore'])images[mode]=await page.eval(`SM.select('${mode==='restore'?'before':mode}');return SM.render();`);
   const a=await rgb(images.before.png),b=await rgb(images.after.png),c=await rgb(images.restore.png);assert.ok(a.equals(b),'Changed RGB');assert.ok(a.equals(c),'Unstable restored baseline');
   for(const key of ['draws','triangles','textures','uploadBytes'])assert.equal(images.before[key],images.after[key]);
   for(const mode of ['before','after'])fs.writeFileSync(path.join(out,`pose-${i}-${mode}.png`),Buffer.from(images[mode].png.split(',')[1],'base64'));
   for(const image of Object.values(images))delete image.png;
   rows.push({pose:poses[i],before:images.before,after:images.after,exactRgb:true,restored:true,rgbSha256:createHash('sha256').update(a).digest('hex')});console.log(JSON.stringify(rows.at(-1)));
  }
  result={setup,rows,scope:'Seven native published High post/MSAA4 renders, shadow maps refreshed. Same production field change applied to published native shadow meshes; identity local poses asserted. Baseline/candidate/restored RGB, draws, triangles, uploads and texture counts compared. Native raster enabled. Software correctness and command-count proof, not hardware timing or visual-quality PASS.'};
 }
 assert.equal(source,fs.readFileSync(file,'utf8'));
 const consoleErrors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(consoleErrors,[]);
 fs.writeFileSync(path.join(out,args.cpu==='true'?'cpu.json':'rendered.json'),JSON.stringify({...result,consoleErrors,sourceSha256:createHash('sha256').update(source).digest('hex'),pass:true},null,2)+'\n');
}finally{trace?.close();try{await page?.eval('SM.restore();return null;');}catch{}page?.close();fs.rmSync(temporary,{recursive:true,force:true});}
