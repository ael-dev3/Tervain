#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'live-foliage-clone-proof',candidate=args.candidate==='1',frames=Number(args.frames??5);
assert.ok(Number.isInteger(frames)&&frames>=1&&frames<=9);
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const hash=b=>createHash('sha256').update(b).digest('hex'),controller=fs.readFileSync(new URL(import.meta.url));
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:13});
const rows=[];
try{
 const setup=await page.eval(`(${installRenderCost.toString()})(${textureUploadBytes.toString()});
 const T=window.tervain,R=T.renderer,W=T.world,gl=R.getContext();T.present=()=>{};T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;
 const sources=[],copies=[],seen=new Set();W.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material]){
 if(!m?.userData?.tvFoliage||seen.has(m))continue;seen.add(m);const n=m.userData.tvFoliage.uFoliageClumpNoise?.value;
 if(n?.isTexture)sources.push({m,descriptor:Object.getOwnPropertyDescriptor(m.userData,'tvFoliage')});else if(n?.metadata?.type==='Texture')copies.push(m);
 }});if(!sources.length)throw Error('No native shader diagnostics');
 const from=Array.from,data=new Set(sources.map(s=>s.m.userData.tvFoliage.uFoliageClumpNoise.value.image.data));
 window.CLONE={sources,copies,from,data,render(){R.info.autoReset=false;R.info.reset();const u=window.__renderCostStates.get(gl)?.uploads??0;T.renderWorld();if(gl.getError()||gl.isContextLost())throw Error('Invalid GL');return{png:R.domElement.toDataURL(),cost:{draws:R.info.render.calls,triangles:R.info.render.triangles,textures:R.info.memory.textures,programs:R.info.programs.length,uploadBytes:(window.__renderCostStates.get(gl)?.uploads??0)-u}};},
 use(enumerable){for(const s of sources)Object.defineProperty(s.m.userData,'tvFoliage',{...s.descriptor,enumerable});},
 clones(){let arrays=0,elements=0,jsonBytes=0,count=0;Array.from=function(input,...rest){if(data.has(input)){arrays++;elements+=input.length;}return from.call(this,input,...rest);};const start=performance.now();try{for(const {m} of sources){const leaf=m.customProgramCacheKey().includes('tervain-foliage-v6-leaf-');for(let i=0;i<(leaf?2:1);i++){const c=m.clone();jsonBytes+=new TextEncoder().encode(JSON.stringify(c.userData)).length;count++;if(c.map!==m.map||c.alphaTest!==m.alphaTest)throw Error('Material state changed');c.dispose();}}}finally{Array.from=from;}return{count,noiseArrays:arrays,noiseElements:elements,serializedBytes:jsonBytes,cloneCpuMs:performance.now()-start};},
 restore(){for(const s of sources)Object.defineProperty(s.m.userData,'tvFoliage',s.descriptor);}};
 const modes=sources.map(s=>s.descriptor.enumerable);
 if(${candidate}&&modes.some(Boolean))throw Error('Compiled candidate still serializes diagnostics');
 return{version:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),sourceMaterials:sources.length,existingClonedDiagnostics:copies.length,enumerableSources:modes.filter(Boolean).length,post:T.grade.enabled,samples:T.grade.target.samples,size:[R.domElement.width,R.domElement.height]};`);
 assert.equal(setup.post,true);assert.equal(setup.samples,4);
 if(candidate){assert.ok(args.head&&args.head.startsWith(setup.version.revision),'Candidate build/head mismatch');assert.equal(setup.enumerableSources,0);assert.equal(setup.existingClonedDiagnostics,0);}
 console.log(JSON.stringify({setup}));
 for(let frame=0;frame<frames;frame++){
  const pose=await page.eval(`const T=window.tervain,W=T.world,x=-210+Math.sin(.8)*${frame}*2.6/60,z=Math.cos(.8)*${frame}*2.6/60,h=W.terrain.heightAt(x,z),c=T.cam.camera;
  T.player.setPosition(x,z,0,W.terrain);c.position.set(x,h+2,z);const yaw=.8+${frame}*.003;c.lookAt(x+30*Math.sin(yaw),h+5,z+30*Math.cos(yaw));c.updateMatrixWorld();
  const focus=T.player.group.position.clone().set(T.player.x,T.player.y,T.player.z);W.update(0,T.game.state,focus,T.settings,13,c,false);
  W.sky.cloudTime=0;W.sky.update(13,focus,0,false);W.foliage.wind.uniforms.uGrassTime.value=0;W.sway.uTime.value=0;T.grade.time=0;T.worldLook=null;
  T.renderer.shadowMap.autoUpdate=true;CLONE.restore();CLONE.render();CLONE.render();T.renderer.shadowMap.autoUpdate=false;const native=CLONE.render();return{native:native.png,player:[T.player.x,T.player.y,T.player.z],camera:c.position.toArray()};`);
  const captures={};
  for(const mode of ['before','after','restored']){
   const capture=await page.eval(`${mode==='restored'?'CLONE.restore()':`CLONE.use(${mode==='before'})`};const clones=CLONE.clones();const image=CLONE.render();return{...image,clones};`);
   const png=Buffer.from(capture.png.split(',')[1],'base64'),rgb=await sharp(png).removeAlpha().raw().toBuffer();
   fs.mkdirSync(path.join(out,mode),{recursive:true});fs.writeFileSync(path.join(out,mode,String(frame).padStart(4,'0')+'.png'),png);
   captures[mode]={hash:hash(rgb),cost:capture.cost,clones:capture.clones};
  }
  const nativeRgb=await sharp(Buffer.from(pose.native.split(',')[1],'base64')).removeAlpha().raw().toBuffer();delete pose.native;
  for(const mode of ['after','restored']){assert.equal(captures[mode].hash,captures.before.hash,'Pixels changed');assert.deepEqual(captures[mode].cost,captures.before.cost,'Render work changed');}
  assert.equal(hash(nativeRgb),captures.after.hash,'Native/inactive control differs');
  assert.ok(captures.before.clones.noiseArrays>0);assert.equal(captures.after.clones.noiseArrays,0);
  assert.equal(captures.restored.clones.noiseArrays,setup.enumerableSources===0?0:captures.before.clones.noiseArrays);
  rows.push({frame,...pose,captures});console.log(JSON.stringify(rows.at(-1)));
 }
 await page.eval('CLONE.restore();return null;');
 assert.ok(controller.equals(fs.readFileSync(new URL(import.meta.url))),'Controller changed during capture');
 const report={schema:1,setup,rows,candidate,controllerSha256:hash(controller),pass:true,scope:'Native full forest scene through post-processing and four-sample MSAA. Before restores only enumerable diagnostic metadata, after makes it non-enumerable. Existing geometry/material shaders/uniforms are untouched. Actual native material clones are replayed per source (one wood, two leaf); counts are temporary number-array elements, not heap bytes or GC timing. Per-pose native/before/after/restored pixels and render costs must match. Existing cloned-diagnostic count records the actual world build; replay counts are separate. Software clone CPU timings are advisory.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
}finally{try{await page.eval('window.CLONE?.restore();return null;');}catch{}page.close();}
