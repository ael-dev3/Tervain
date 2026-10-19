// Read-only paired attribution. Interventions exist only in this browser session.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
import {normalizeGrassPhaseControls,applyGrassPhaseControls} from './grass-phase-controls.mjs';
const a=Object.fromEntries(process.argv.slice(2).reduce((r,v,i,s)=>i%2?r:[...r,[v.slice(2),s[i+1]]],[]));
const frames=Number(a.frames??3),width=Number(a.width??640),height=Number(a.height??360),dpr=Number(a.dpr??1);
assert(Number.isInteger(frames)&&frames>=3&&frames<=120);assert(width>=320&&height>=180&&dpr>0&&dpr<=2);
const x=Number(a.x??6),z=Number(a.z??26);assert(Number.isFinite(x)&&Number.isFinite(z));
const out=a.out??'/tmp/grass-walking-light';fs.mkdirSync(out,{recursive:true});fs.rmSync(out+'/report.json',{force:true});
const phase=normalizeGrassPhaseControls({hour:17.5,cloudTime:0,wind:{time:3,direction:[.8,.6,.24,.42],scroll:[0,0,0,0]},sway:3,gradeTime:0},{});
const url=new URL(a.url??'https://ael-dev3.github.io/Tervain/');url.searchParams.set('renderscale','1');
const p=await liveProofPage(url.href,{quality:'high',hour:phase.hour,w:width,h:height,dpr});
try {
 const setup=await p.eval(`const T=window.tervain,W=T.world,phase=${JSON.stringify(phase)};T.frame=()=>{};T.present=()=>{};T.render=()=>{};T.step=()=>{};T.perf=null;T.lastFrameDt=0;T.settings.dynamicResolution=false;T.onResize();T.hud.show(false);T.player.setPosition(${x+6},${z+5},0,W.terrain);T.cam.manual=true;const c=T.cam.camera,g=W.modules.find(m=>m.name==='groundcover').module;window.A={through:{value:1},sheen:{value:1},pose:i=>{const d=i*.65,x=${x},z=${z},h=W.terrain.heightAt(x-d,z);c.position.set(x+3-d,h+1.4,z+1.1);c.lookAt(x-29-d,h+.3,z-10.7);c.updateMatrixWorld(true);const f=c.position.clone();for(let k=0;k<12;k++){g.prepare(T.renderer,0);g.update(0,{camera:c,focus:f,reducedMotion:true});}(${applyGrassPhaseControls.toString()})(T,phase);T.grade.waterTime=0;W.scene.updateMatrixWorld(true);},draw:()=>{(${applyGrassPhaseControls.toString()})(T,phase);T.grade.waterTime=0;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext(),e=gl.getError();if(e||gl.isContextLost())throw Error('GL '+e);return{png:T.renderer.domElement.toDataURL('image/png'),draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,camera:c.matrixWorld.toArray()};}};A.pose(0);globalThis.__restoreOrchardRaster?.();if(globalThis.__tervainCpuNoRaster)throw Error('Raster suppressed');if(!T.grade.enabled||T.grade.target.samples!==4)throw Error('Missing native post/MSAA');return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),buffer:[T.renderer.domElement.width,T.renderer.domElement.height],dpr:T.renderer.getPixelRatio(),phase,grass:g.stats()};`);
 const capture=async(name)=>{const r=await p.eval('return A.draw();');const bytes=Buffer.from(r.png.split(',')[1],'base64');fs.writeFileSync(out+'/'+name+'.png',bytes);return{...r,png:undefined,rgb:await sharp(bytes).removeAlpha().raw().toBuffer()};};
 for(let k=0;k<3;k++)await p.eval('A.draw();return null;');await p.eval('window.tervain.renderer.shadowMap.autoUpdate=false;return null;');
 const original=await capture('original');
 await p.eval(`const T=window.tervain,ms=new Set();T.world.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:o.material?[o.material]:[])if(m.name==='Tervain grass blades')ms.add(m);});if(!ms.size)throw Error('No grass material');for(const m of ms){const old=m.onBeforeCompile,key=m.customProgramCacheKey.call(m);m.onBeforeCompile=function(s,r){old.call(this,s,r);s.uniforms.studyThrough=A.through;s.uniforms.studySheen=A.sheen;s.fragmentShader='uniform float studyThrough;uniform float studySheen;\\n'+s.fragmentShader;for(const [pattern,flag]of [[/reflectedLight\\.directDiffuse \\+= directLight\\.color \\* material\\.diffuseColor \\* uTransTint \\* min\\( through \\* G_THROUGH, 0\\.45 \\);/g,'studyThrough'],[/reflectedLight\\.directDiffuse \\+= directLight\\.color \\* material\\.diffuseColor \\* sheen \\* G_SHEEN \\* 0\\.9;/g,'studySheen']]){const matches=s.fragmentShader.match(pattern);if(matches?.length!==1)throw Error('Lighting marker mismatch '+flag);s.fragmentShader=s.fragmentShader.replace(pattern,'if('+flag+'>0.5){'+matches[0]+'}');}};m.customProgramCacheKey=()=>key+'|read-only-light-study';m.needsUpdate=true;}return ms.size;`);
 const control=await capture('inactive-control');assert(original.rgb.equals(control.rgb),'Inactive shader instrumentation changes pixels');
 const report={complete:false,setup,route:{x,z,frames,stepMetres:.65,metres:(frames-1)*.65,frozenWind:true,hour:17.5},inactiveChangedChannels:0,records:[],scope:'Read-only lighting attribution. Entire image counts include background; changed-by-grass-lighting pixels isolate contribution, not semantic ownership. Offline synthetic walk; no GPU/frame pacing claim.'};
 let previous;
 const luma=(b,k)=>.2126*b[k]+.7152*b[k+1]+.0722*b[k+2];
 for(let i=0;i<frames;i++){
  await p.eval('A.pose('+i+');return null;');const modes={};
  for(const mode of ['baseline','noThrough','noSheen','repeat']){await p.eval('A.through.value='+Number(mode!=='noThrough')+';A.sheen.value='+Number(mode!=='noSheen')+';return null;');modes[mode]=await capture(mode+'-'+i);}
  assert(modes.baseline.rgb.equals(modes.repeat.rgb),'Same-pose repeat differs at '+i);
  const row={frame:i,draws:modes.baseline.draws,triangles:modes.baseline.triangles,camera:modes.baseline.camera,allImageBright180:0,allImageStrictWhite:0,effects:{}};
  for(const mode of ['noThrough','noSheen'])row.effects[mode]={changedPixels:0,baselineBright180:0,candidateBright180:0,baselineNearWhite220:0,candidateNearWhite220:0,temporalJumps60:0};
  const b=modes.baseline.rgb;
  for(let k=0;k<b.length;k+=3){const y=luma(b,k);row.allImageBright180+=Number(y>=180);row.allImageStrictWhite+=Number(Math.min(b[k],b[k+1],b[k+2])>=245);
   for(const mode of ['noThrough','noSheen']){const q=modes[mode].rgb,e=row.effects[mode];if(b[k]===q[k]&&b[k+1]===q[k+1]&&b[k+2]===q[k+2])continue;e.changedPixels++;e.baselineBright180+=Number(y>=180);e.candidateBright180+=Number(luma(q,k)>=180);e.baselineNearWhite220+=Number(y>=220);e.candidateNearWhite220+=Number(luma(q,k)>=220);if(previous)e.temporalJumps60+=Number(Math.abs(y-luma(previous,k))>60);}}
  previous=b;report.records.push(row);fs.writeFileSync(out+'/progress.json',JSON.stringify(report,null,2));console.log(JSON.stringify(row));
 }
 assert.deepEqual(await p.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());'),setup.build,'Deployment changed');report.errors=p.console().filter(x=>x.startsWith('[error]')||x.startsWith('[exception]'));assert.deepEqual(report.errors,[]);report.complete=true;fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));
}finally{p.close();}
