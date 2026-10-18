import fs from 'node:fs';
import sharp from 'sharp';
import assert from 'node:assert/strict';
import path from 'node:path';
import {liveProofPage} from '../../../../tools/live-proof-page.mjs';
import {rgbFrame,walkingFlicker} from '../../../../tools/foliage-motion-metric.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
if(!args.controls)throw Error('Supply --controls with the matched clock/wind controls JSON');
const frames=Number(args.frames??31),start=Number(args.start??0),stationary=args.stationary==='true';
const x=Number(args.x??-7),z=Number(args.z??45);if(!Number.isFinite(x)||!Number.isFinite(z))throw Error('Invalid route coordinates');
const maskOnly=true;
if(!Number.isInteger(frames)||frames<3||frames>181||!Number.isInteger(start)||start<0||start>1200)throw Error('Invalid frame window');
const reference=args.reference?JSON.parse(fs.readFileSync(path.join(args.reference,'report.json'),'utf8')):null;
const controls=JSON.parse(fs.readFileSync(args.controls,'utf8'));
const out=args.out??'grass-white-attribution';if(args.reference&&path.resolve(args.reference)===path.resolve(out))throw Error('Reference and output must differ');fs.mkdirSync(out,{recursive:true});
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:controls.hour,w:1440,h:900,dpr:2});
const roi={left:288,top:630,width:2304,height:1080};
const pixels=async file=>new Uint8Array(await sharp(file).removeAlpha().extract(roi).raw().toBuffer());
try {
 await page.eval(`const T=window.tervain,C=${JSON.stringify(controls)},u=T.world.foliage.wind.uniforms;u.uGrassTime.value=C.wind.time;u.uWindDir.value.fromArray(C.wind.direction);u.uGustScroll.value.fromArray(C.wind.scroll);T.world.sway.uTime.value=C.sway;T.grade.time=C.gradeTime;if(Number.isFinite(C.cloudTime))T.world.sky.cloudTime=C.cloudTime;T.world.sky.update(C.hour,T.player.group.position,0,false);T.grade.setLook({night:T.world.sky.state.nightness});
 const camera=T.cam.camera;const d0=${start*2.6/60},h0=T.world.terrain.heightAt(${x}+d0,${z});camera.position.set(${x}-3+d0,h0+1.4,${z}-1.1);camera.lookAt(${x}+29+d0,h0+.3,${z}+10.7);camera.updateMatrixWorld();const ground=T.world.modules.find(m=>m.name==='groundcover').module;ground.prepare?.(T.renderer,0);ground.update(0,{camera,focus:T.player.group.position,reducedMotion:true});T.renderer.shadowMap.autoUpdate=false;
 window.E={camera,mask:{value:0},petals:{value:1},black:{value:0},straw:{value:1},sheen:{value:1},through:{value:1},wrapped:{value:1},coverage:{value:0},strawCoverage:{value:0},render:()=>{T.grade.render(T.world.scene,camera,0);const gl=T.renderer.getContext();const e=gl.getError();if(e||gl.isContextLost())throw Error('Draw error '+e);}};
 const gl=T.renderer.getContext();while(gl.getError()){}E.render();`);
 const build=await page.eval("const r=await window.tervain.auditPlacement({kind:'root',maxChecks:1});return {version:r.version,revision:r.revision};");
 const profile=await page.eval('const T=window.tervain;return {postEnabled:T.grade.enabled,postSamples:T.grade.target.samples,drawingBuffer:[T.renderer.domElement.width,T.renderer.domElement.height]};');
 if(reference){assert.deepEqual(reference.build,build);assert.deepEqual(reference.profile,profile);assert.deepEqual(reference.roi,roi);assert.deepEqual(reference.controls,controls);assert.equal(start,reference.route.startFrame??0);assert.equal(frames,reference.route.frames);assert.equal(stationary,reference.route.stationary??false);assert.equal(x,reference.route.x);assert.equal(z,reference.route.z);}
 await page.shot(out+'/original.png');

 const captures=[];
 for(const [name,freeze]of [['unfrozen-0',false],['unfrozen-1',false],['frozen-0',true],['frozen-1',false]]){
  if(freeze)await page.eval('const T=window.tervain;T.frame=()=>{};T.present=()=>{};');
  await page.eval('E.render();');await page.shot(out+'/'+name+'.png');captures.push(name);
 }
 const compare=async(a,b)=>{const x=await sharp(out+'/'+a+'.png').removeAlpha().raw().toBuffer(),y=await sharp(out+'/'+b+'.png').removeAlpha().raw().toBuffer();let changed=0,max=0;for(let i=0;i<x.length;i++){const d=Math.abs(x[i]-y[i]);changed+=Number(d>0);max=Math.max(max,d);}return{changedChannels:changed,maxChannelDelta:max};};
 const result={build,profile,controls,unfrozen:await compare('unfrozen-0','unfrozen-1'),frozen:await compare('frozen-0','frozen-1')};fs.writeFileSync(out+'/report.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}catch(error){console.error(JSON.stringify(page.console()));throw error;}finally{page.close();}
