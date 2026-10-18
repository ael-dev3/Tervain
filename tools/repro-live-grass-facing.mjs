import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {applyGrassFacingVariant} from './grass-facing-patches.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
import {liveProofPage} from './live-proof-page.mjs';
import {rgbFrame,walkingFlicker} from './foliage-motion-metric.mjs';
import {normalizeGrassPhaseControls,applyGrassPhaseControls} from './grass-phase-controls.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const toolBytes=fs.readFileSync(new URL(import.meta.url)),phaseBytes=fs.readFileSync('tools/grass-phase-controls.mjs');
const substeps=Number(args.substeps??1),leadSteps=Number(args['lead-steps']??0);assert.ok(Number.isInteger(substeps)&&substeps>=1&&substeps<=4);assert.ok(Number.isInteger(leadSteps)&&leadSteps>=0&&leadSteps<=120);
const out=args.out??'follow-grass-specks',frames=Number(args.frames??9);assert.ok(Number.isInteger(frames)&&frames>=3&&frames<=121);fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const live='https://ael-dev3.github.io/Tervain/',version=()=>JSON.parse(execFileSync('curl',['--fail','--silent','--show-error',live+'version.json'],{encoding:'utf8'}));
const published=version(),controls=JSON.parse(fs.readFileSync('docs/perf/proofs/grass-white-attribution/controls.json','utf8'));
const cases=args.cases?JSON.parse(args.cases):[{name:'village-noon',x:-7,z:45,hour:12,yaw:0},{name:'fence-noon',x:-2,z:35,hour:12,yaw:0},{name:'fence-dusk-sun',x:-2,z:35,hour:19.3,yaw:'sun'}];
const materialFile='src/presentation/grass/grassMaterial.ts',publishedSource=execFileSync('git',['show','d40777b:'+materialFile],{encoding:'utf8'}),candidateSource=fs.readFileSync(materialFile,'utf8');
const slice=(s,a,b)=>{const i=s.indexOf(a),j=s.indexOf(b,i);assert.ok(i>=0&&j>=0);return s.slice(i,j+b.length);};
const partsOf=s=>({coverage:slice(s,s.includes('float gSafeDist =')?'float gSafeDist =':'float gPxPerM =','float gBladeCov = smoothstep(0.8, 2.5, gBladePx);'),tangent:s.match(/vec3 gTangent = [^;]+;/)[0],rounding:s.match(/gN = normalize\(gN \+ gAcross[^;]+;/)[0]});
const patchParts={before:partsOf(publishedSource),after:partsOf(candidateSource)};
const compareNormal=true,nativeAfter=true;
assert.ok(args.url,'Candidate build URL required');
const page=await liveProofPage(args.url,{quality:'high',hour:12,headed:args.headed==='1',w:Number(args.width??640),h:Number(args.height??360),dpr:Number(args.dpr??1)}),results=[];
let roi;
const decode=png=>sharp(Buffer.from(png.split(',')[1],'base64')).removeAlpha().raw().toBuffer(),hash=b=>createHash('sha256').update(b).digest('hex');
try {
 const setup=await page.eval(`(${installRenderCost.toString()})(${textureUploadBytes.toString()});const T=window.tervain;const proofGL=T.renderer.getContext(),link=proofGL.linkProgram.bind(proofGL);window.facingLinks=0;proofGL.linkProgram=(...a)=>{window.facingLinks++;return link(...a);};T.present=()=>{};T.perf?.end(0);T.perf=null;T.lastFrameDt=0;T.settings.reducedMotion=true;T.input.reset();T.input.uiOpen=false;
 const tick=Object.getPrototypeOf(T).step;if(typeof tick!=='function')throw Error('Original fixed step missing');
 const materials=new Set();T.world.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.name==='Tervain grass blades')materials.add(m);});if(materials.size!==2)throw Error('Expected two grass materials');
 const originals=[...materials].map(m=>({m,hook:m.onBeforeCompile,key:m.customProgramCacheKey}));
 window.FG={black:{value:0},mode:'after',tick,originals,useMode(value){if(this.mode===value)return;this.mode=value;for(const s of this.originals)s.m.needsUpdate=true;},render(){const state0=window.__renderCostStates.get(T.renderer.getContext()),upload0=state0?.uploads??0,links0=window.facingLinks;T.lastFrameDt=0;T.renderer.info.autoReset=false;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid WebGL capture');return{png:T.renderer.domElement.toDataURL(),draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures,uploadBytes:(window.__renderCostStates.get(gl)?.uploads??0)-upload0,links:window.facingLinks-links0};}};
 T.cam.manual=null;T.cam.mode='follow';T.cam.reset();return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),post:T.grade.enabled,samples:T.grade.target.samples,size:[T.renderer.domElement.width,T.renderer.domElement.height],deviceRatio:devicePixelRatio,renderRatio:T.renderer.getPixelRatio(),wantDist:T.cam.wantDist,pitch:T.cam.pitch};`);
 if(!nativeAfter)assert.deepEqual(setup.build,published);else assert.equal(execFileSync('git',['show',setup.build.revision+':src/presentation/grass/grassMaterial.ts'],{encoding:'utf8'}),fs.readFileSync('src/presentation/grass/grassMaterial.ts','utf8'),'Candidate source/build mismatch');assert.equal(setup.post,true);assert.equal(setup.samples,4);
 roi={left:Math.floor(setup.size[0]*.1),top:Math.floor(setup.size[1]*.35),width:Math.floor(setup.size[0]*.8),height:Math.floor(setup.size[1]*.6)};
 assert.deepEqual(execFileSync('git',['diff','--name-only','d40777b',setup.build.revision,'--','src'],{encoding:'utf8'}).trim().split('\n'),[materialFile]);
 console.log(JSON.stringify({stage:'world-ready',build:setup.build,size:setup.size,renderRatio:setup.renderRatio}));
 for(const c of cases){assert.ok(c.name&&[c.x,c.z,c.hour].every(Number.isFinite));const phase=normalizeGrassPhaseControls({...controls,hour:c.hour,cloudTime:0},{hour:c.hour,cloudTime:0});
 const pose=await page.eval(`const T=window.tervain,W=T.world;T.input.reset();T.game.state.clock=1440+${c.hour}*60;T.player.setPosition(${c.x},${c.z},0,W.terrain);T.cam.manual=null;T.cam.reset();T.cam.mode='follow';
 (${applyGrassPhaseControls.toString()})(T,${JSON.stringify(phase)});
 const sun=W.sky.sun.position.clone().sub(W.sky.sun.target.position);FG.yaw=${c.yaw==='sun'?'Math.atan2(sun.x,sun.z)':JSON.stringify(c.yaw)};T.cam.yaw=FG.yaw;T.cam.pitch=.32;T.cam.wantDist=6.2;
 T.cam.follow(1,T.player.x,T.player.y,T.player.z,W.terrain,W.colliders,true,0);T.cam.clearWater((x,z)=>W.water.world.surfaceAt(x,z),T.player.swimming);
 W.update(0,T.game.state,T.player.rig.root.position,T.settings,${c.hour},T.cam.camera,false);(${applyGrassPhaseControls.toString()})(T,${JSON.stringify(phase)});
 const G=W.modules.find(m=>m.name==='groundcover').module;for(let i=0;i<100;i++){G.prepare?.(T.renderer,0);G.update(0,{camera:T.cam.camera,focus:T.player.rig.root.position,reducedMotion:true});}
 T.worldLook=null;T.renderer.shadowMap.autoUpdate=true;FG.black.value=0;FG.mode='after';for(const s of FG.originals){s.m.onBeforeCompile=s.hook;s.m.customProgramCacheKey=s.key;s.m.needsUpdate=true;}FG.render();const original=FG.render();
 for(const s of FG.originals){s.m.onBeforeCompile=function(shader,r){s.hook.call(this,shader,r);(${applyGrassFacingVariant.toString()})(shader,${JSON.stringify(patchParts)},FG.mode);shader.uniforms.uGrassProofBlack=FG.black;const marker='#include <dithering_fragment>';if(shader.fragmentShader.split(marker).length!==2)throw Error('Grass final-colour marker mismatch');shader.fragmentShader='uniform float uGrassProofBlack;\\n'+shader.fragmentShader.replace(marker,marker+'\\nif(uGrassProofBlack>0.5)gl_FragColor.rgb=vec3(0.0);');};s.m.customProgramCacheKey=function(){return s.key.call(this)+'|facing-proof-'+FG.mode;};s.m.needsUpdate=true;}
 const control=FG.render();T.renderer.shadowMap.autoUpdate=false;for(const mode of ['before','opt-only','after']){FG.useMode(mode);FG.render();}FG.start={x:T.player.x,y:T.player.y,z:T.player.z};T.input.down.add('KeyW');return{original:original.png,control:control.png,player:FG.start,camera:T.cam.camera.position.toArray(),yaw:FG.yaw,pitch:T.cam.pitch,wantDist:T.cam.wantDist};`);
 assert.equal(hash(await decode(pose.original)),hash(await decode(pose.control)),'Inactive grass marker changed pixels');delete pose.original;delete pose.control;
 pose.captureStart=await page.eval(`const T=window.tervain;for(let i=0;i<${leadSteps};i++){FG.tick.call(T,1/60);T.input.endFrame();}(${applyGrassPhaseControls.toString()})(T,${JSON.stringify(phase)});return{player:{x:T.player.x,y:T.player.y,z:T.player.z},camera:T.cam.camera.position.toArray()};`);
 const normalFrames=[],maskedFrames=[],candidateFrames=[],contributions=[],rows=[];let metres=0,last=pose.captureStart.player;
 for(let i=0;i<frames;i++){
  const state=await page.eval(`const T=window.tervain;for(let j=0;j<${substeps};j++){T.cam.yaw=FG.yaw+(${i}*${substeps}+j)*.006;FG.tick.call(T,1/60);T.input.endFrame();}T.lastFrameDt=0;(${applyGrassPhaseControls.toString()})(T,${JSON.stringify(phase)});T.worldLook=null;return{player:{x:T.player.x,y:T.player.y,z:T.player.z},camera:T.cam.camera.position.toArray(),yaw:T.cam.yaw,boom:T.cam.lastBoom,pivot:T.cam.lastPivotLift,sunAnchor:T.world.sky.sun.target.position.toArray()};`);
  const moved=Math.hypot(state.player.x-last.x,state.player.z-last.z);assert.ok(moved<.5,'Unexpected teleport during fixed-step input');metres+=moved;last=state.player;
  const captures={};await page.eval("window.tervain.renderer.shadowMap.autoUpdate=true;FG.useMode('after');FG.black.value=0;FG.render();window.tervain.renderer.shadowMap.autoUpdate=false;return null;");
  for(const mode of ['normal','candidate','opt-only','black','restored']){captures[mode]=await page.eval(`window.tervain.renderer.shadowMap.autoUpdate=false;FG.useMode(${JSON.stringify(mode==='candidate'?'after':mode==='opt-only'?'opt-only':'before')});FG.black.value=${mode==='black'?1:0};return FG.render();`);captures[mode].rgb=await decode(captures[mode].png);}
  assert.equal(hash(captures.normal.rgb),hash(captures.restored.rgb),'Scene changed within grass contribution pair');
  assert.equal(hash(captures.normal.rgb),hash(captures['opt-only'].rgb),'Normal budget simplification changed native pixels');
  for(const mode of ['candidate','opt-only','black','restored'])for(const key of ['draws','triangles','textures','uploadBytes'])assert.equal(captures[mode][key],captures.normal[key],'Cost increased or cache was not primed: '+key);
  for(const mode of ['normal','candidate','opt-only','black','restored'])assert.equal(captures[mode].links,0,'Unwarmed shader program');
  const cropped={};for(const mode of (compareNormal?['normal','candidate','black']:['normal','black'])){const dir=path.join(out,c.name,mode);fs.mkdirSync(dir,{recursive:true});const png=Buffer.from(captures[mode].png.split(',')[1],'base64');fs.writeFileSync(path.join(dir,String(i).padStart(4,'0')+'.png'),png);cropped[mode]=await sharp(png).removeAlpha().extract(roi).raw().toBuffer();}
  const f=rgbFrame(cropped.normal,roi.width,roi.height),a=compareNormal?rgbFrame(cropped.candidate,roi.width,roi.height):null,contribution=Uint8Array.from(f.white,(_,k)=>Number([0,1,2].some(j=>Math.abs(cropped.normal[k*3+j]-cropped.black[k*3+j])>8||(compareNormal&&Math.abs(cropped.candidate[k*3+j]-cropped.black[k*3+j])>8)))),white=Uint8Array.from(f.white,(v,k)=>Number(v&&contribution[k]));normalFrames.push(f);maskedFrames.push({...f,white});contributions.push(contribution);if(a)candidateFrames.push(a);
  const sum=a=>a.reduce((n,v)=>n+v,0);rows.push({frame:i,...state,cost:Object.fromEntries(['normal','candidate','opt-only','black','restored'].map(m=>[m,Object.fromEntries(['draws','triangles','textures','uploadBytes','links'].map(k=>[k,captures[m][k]]))])),strictWhite:sum(f.white),candidateStrictWhite:a?sum(a.white):null,grassAffectedWhite:sum(white),candidateGrassAffectedWhite:a?sum(Uint8Array.from(a.white,(v,k)=>Number(v&&contribution[k]))):null,grassAffectedPixels:sum(contribution),hashes:Object.fromEntries(['normal','candidate','opt-only','black','restored'].map(m=>[m,hash(captures[m].rgb)]))});
  console.log(JSON.stringify({case:c.name,frame:i,metres,white:rows.at(-1).grassAffectedWhite}));
 }
 await page.eval('window.tervain.input.reset();return null;');assert.ok(metres>.01,'Fixed-step input did not move player');
 const searchRadius=Math.min(64,Math.ceil(setup.size[0]/640*6*substeps));
 const metric=(sequence)=>args['raw-only']==='1'?null:walkingFlicker(sequence,roi.width,roi.height,{searchRadius});
 const brightness={};for(const[mode,sequence]of Object.entries({before:normalFrames,...(compareNormal?{after:candidateFrames}:{})})){brightness[mode]=Object.fromEntries([160,180,200,220,240].map(t=>[t,metric(sequence.map((f,i)=>({...f,white:Uint8Array.from(f.gray,(v,k)=>Number(v>=t&&contributions[i][k]))})))]));}
 const r={case:c,phase,pose,frames,substeps,leadSteps,sampleHz:60/substeps,searchRadius,metres,rows,brightness,all:metric(normalFrames),grassAffected:metric(maskedFrames),candidateGrassAffected:compareNormal?metric(candidateFrames.map((f,i)=>({...f,white:Uint8Array.from(f.white,(v,k)=>Number(v&&contributions[i][k]))}))):null};results.push(r);fs.writeFileSync(path.join(out,c.name,'report.json'),JSON.stringify(r,null,2)+'\n');
 }
 assert.deepEqual(version(),published,'Published version changed during run');assert.ok(toolBytes.equals(fs.readFileSync(new URL(import.meta.url))),'Capture controller changed during run');assert.ok(phaseBytes.equals(fs.readFileSync('tools/grass-phase-controls.mjs')),'Phase helper changed during run');const report={published,setup,roi,results,toolSha256:hash(toolBytes),phaseHelperSha256:hash(phaseBytes),patchSha256:hash(JSON.stringify(patchParts)),nativeFacingCandidate:true,pass:true,scope:'Published scene, real fixed-step keyboard movement and ordinary 6.2m/.32-rad follow camera with terrain/collider clearance. Fixed cloud/wind/grade phases isolate camera motion. Full native post/MSAA, exact inactive/restored controls. Black-grass intervention measures contribution, not exclusive ownership or a product fix. Before restores the published grass shader in the same compiled candidate scene; opt-only is pixel-identical to before at every captured view. Costs use warmed renders with cached shadows; shader source arithmetic budget is checked separately. Synthetic samples are not frame pacing.'};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({pass:true,cases:results.map(r=>({name:r.case.name,metres:r.metres,raw:r.rows.reduce((n,x)=>n+x.grassAffectedWhite,0),transient:r.grassAffected?.whitePixelsFlickered??null,alignment:r.grassAffected?.summary.alignmentShare??null}))}));
}catch(error){console.error(String(error));throw error;}finally{page.close();}
