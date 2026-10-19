#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
import {applyGrassPhaseControls,normalizeGrassPhaseControls,readGrassPhaseControls} from './grass-phase-controls.mjs';
import {FrozenGrassMetric,compareFrozenFrames} from './grass-frozen-metric.mjs';
const args={},allowed=new Set(['url','out','reference','head','width','height','dpr','frames','repeats','warmup','x','z','bright','jump','hour']);
for(let i=2;i<process.argv.length;i+=2){const key=process.argv[i].slice(2),value=process.argv[i+1];if(!process.argv[i].startsWith('--')||!allowed.has(key)||!value||value.startsWith('--')||key in args)throw Error('Invalid option '+process.argv[i]);args[key]=value;}
const number=(key,fallback,min,max,integer=false)=>{const x=Number(args[key]??fallback);if(!Number.isFinite(x)||x<min||x>max||integer&&!Number.isInteger(x))throw Error('Invalid --'+key);return x;};
const config={width:number('width',1470,64,4096,true),height:number('height',956,64,2160,true),dpr:number('dpr',2,.5,3),frames:number('frames',8,2,120,true),repeats:number('repeats',2,1,6,true),warmup:number('warmup',4,2,30,true),x:number('x',6,-2000,2000),z:number('z',26,-2000,2000),bright:number('bright',180,0,255),jump:number('jump',60,0,255)};
const hour=number('hour',17.5,0,24),phase=normalizeGrassPhaseControls({hour,cloudTime:0,wind:{time:3,direction:[.8,.6,.24,.42],scroll:[0,0,0,0]},sway:3,gradeTime:0},{hour});
const input=args.url??'https://ael-dev3.github.io/Tervain/';if(!['http:','https:'].includes(new URL(input).protocol))throw Error('Build URL must be HTTP(S)');
const out=path.resolve(args.out??'frozen-grass-proof');if(args.reference)assert.notEqual(out,path.resolve(args.reference),'Reference and output must differ');
const reference=args.reference?JSON.parse(fs.readFileSync(path.join(args.reference,'report.json'),'utf8')):null;
if(reference){assert.notEqual(out,path.resolve(args.reference));assert.deepEqual(reference.config,config,'Reference capture settings differ');assert.deepEqual(reference.phase,phase,'Reference phase differs');assert.equal(reference.complete,true);}
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sourceSha256=Object.fromEntries(['capture-frozen-grass.mjs','grass-frozen-metric.mjs','grass-phase-controls.mjs'].map(name=>[name,createHash('sha256').update(fs.readFileSync(new URL(name,import.meta.url))).digest('hex')]));
const runs=[],firstFrames=[];let roi;
for(let run=0;run<config.repeats;run++) {
  const dir=path.join(out,'run-'+run);fs.mkdirSync(dir,{recursive:true});
  const page=await liveProofPage(input,{quality:'high',hour,w:config.width,h:config.height,dpr:config.dpr});
  try {
    const setup=await page.eval(`const T=window.tervain,W=T.world,C=${JSON.stringify(config)},phase=${JSON.stringify(phase)};
      T.frame=()=>{};T.present=()=>{};T.render=()=>{};T.step=()=>{};T.perf=null;T.lastFrameDt=0;
      T.hud.show(false);T.player.setPosition(C.x+6,C.z+5,0,W.terrain);T.cam.manual=true;
      const c=T.cam.camera,h=W.terrain.heightAt(C.x,C.z),focus=T.player.group.position.clone().set(T.player.x,T.player.y,T.player.z);
      c.position.set(C.x+3,h+1.4,C.z+1.1);c.lookAt(C.x-29,h+.3,C.z-10.7);c.aspect=C.width/C.height;c.updateProjectionMatrix();c.updateMatrixWorld(true);
      // The diagnostic fixes physical pixel count rather than inheriting an adaptive-resolution history.
      T.renderer.setPixelRatio(C.dpr);T.renderer.setSize(C.width,C.height);T.grade.setSize(Math.floor(C.width*C.dpr),Math.floor(C.height*C.dpr));
      W.update(0,T.game.state,focus,T.settings,phase.hour,c,false);
      const grass=W.modules.find(m=>m.name==='groundcover')?.module;if(!grass||grass.stats().grassInstances<=0)throw Error('Missing native grass');
      for(let i=0;i<12;i++){grass.prepare(T.renderer,0);grass.update(0,{camera:c,focus,reducedMotion:true});}
      (${applyGrassPhaseControls.toString()})(T,phase);T.grade.waterTime=0;W.scene.updateMatrixWorld(true);
      globalThis.__restoreOrchardRaster?.();if(globalThis.__tervainCpuNoRaster)throw Error('Native raster is suppressed');
      if(!T.grade.enabled||T.grade.target.samples!==4)throw Error('High post/MSAA required');
      window.__frozenGrass={snapshot:()=>({phase:(${readGrassPhaseControls.toString()})(T,phase.hour),waterTime:T.grade.waterTime,camera:c.matrixWorld.toArray(),projection:c.projectionMatrix.toArray(),grass:grass.stats(),buffer:[T.renderer.domElement.width,T.renderer.domElement.height]}),render:()=>{(${applyGrassPhaseControls.toString()})(T,phase);T.grade.waterTime=0;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid native draw');return {png:T.renderer.domElement.toDataURL('image/png'),draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,state:__frozenGrass.snapshot()};}};
      const build=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),printed=document.querySelector('.menu-build span')?.textContent;
      if(!printed?.includes(build.revision.slice(0,7)))throw Error('Loaded build and version.json differ');
      return{build,printed,player:[T.player.x,T.player.y,T.player.z],profile:{quality:T.settings.quality,postEnabled:T.grade.enabled,samples:T.grade.target.samples,requestedDpr:C.dpr,effectiveDpr:T.renderer.getPixelRatio(),buffer:[T.renderer.domElement.width,T.renderer.domElement.height]},state:__frozenGrass.snapshot()};`);
    if(args.head)assert(args.head.startsWith(setup.build.revision));
    assert.deepEqual(setup.profile.buffer,[Math.floor(config.width*config.dpr),Math.floor(config.height*config.dpr)]);
    if(runs.length)assert.deepEqual(setup.build,runs[0].setup.build,'Deployment changed across repeats');
    const [w,h]=setup.profile.buffer;roi={left:Math.floor(w*.1),top:Math.floor(h*.35),width:Math.floor(w*.8),height:Math.floor(h*.60)};
    const metric=new FrozenGrassMetric(roi.width,roi.height,config),records=[];
    // Warm all native passes, then hold shadows. Do not patch grass shaders, colours or visibility.
    for(let i=0;i<config.warmup;i++)await page.eval('return __frozenGrass.render().draws;');
    await page.eval('window.tervain.renderer.shadowMap.autoUpdate=false;return null;');
    let frozen;
    for(let frame=0;frame<config.frames;frame++) {
      const r=await page.eval('return __frozenGrass.render();'),name=String(frame).padStart(4,'0')+'.png',bytes=Buffer.from(r.png.split(',')[1],'base64');
      fs.writeFileSync(path.join(dir,name),bytes);const pixels=await sharp(bytes).removeAlpha().extract(roi).raw().toBuffer();
      if(!frozen)frozen=r.state;else assert.deepEqual(r.state,frozen,'Frozen camera, phase or grass population drifted');
      metric.add(pixels);if(frame===0)firstFrames.push(pixels);
      records.push({frame,file:'run-'+run+'/'+name,rgbSha256:createHash('sha256').update(pixels).digest('hex'),draws:r.draws,triangles:r.triangles});
    }
    const endBuild=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');assert.deepEqual(endBuild,setup.build,'Deployment changed during capture');
    const stats=await sharp(path.join(dir,'0000.png')).stats();assert(stats.channels.slice(0,3).some(x=>x.stdev>3),'Blank capture');
    const errors=page.console().filter(x=>x.startsWith('[error]')||x.startsWith('[exception]'));assert.deepEqual(errors,[]);
    runs.push({setup,metrics:metric.result(),records,errors});
    fs.writeFileSync(path.join(dir,'run.json'),JSON.stringify(runs.at(-1),null,2));
  } finally {page.close();}
}
const repeatComparisons=firstFrames.slice(1).map((pixels,i)=>({a:0,b:i+1,...compareFrozenFrames(firstFrames[0],pixels,config)}));
let comparison=null;
if(reference){assert.deepEqual(reference.roi,roi);for(const r of reference.runs)assert.deepEqual(r.setup.profile,runs[0].setup.profile,'Reference render profile differs');
  assert.deepEqual(reference.runs[0].setup.state.camera,runs[0].setup.state.camera,'Reference camera differs');assert.deepEqual(reference.runs[0].setup.state.projection,runs[0].setup.state.projection,'Reference projection differs');
  const ref=await sharp(path.join(args.reference,reference.runs[0].records[0].file)).removeAlpha().extract(roi).raw().toBuffer();
  comparison={referenceBuild:reference.runs[0].setup.build,...compareFrozenFrames(ref,firstFrames[0],config),interpretation:'Between-build change, not proof of a fix. Compare both within-run variance and independent-launch disagreement first.'};}
const report={schema:1,complete:true,sourceSha256,config,phase,roi,runs,repeatComparisons,comparison,scope:'Read-only diagnostic: native whole-scene Grade/post/MSAA, fixed meadow-edge camera and physical buffer, frozen simulation/cloud/wind/grain/interactions. ROI includes ground/background; not a semantic grass mask. Population variance is in display-luminance squared. Static repeats measure capture noise, not walking shimmer, GPU frame time or a visual quality PASS.'};
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({build:runs[0].setup.build,frames:config.frames,repeats:config.repeats,variance:runs.map(r=>r.metrics.everBrightPixels),repeatComparisons,comparison,complete:true}));
