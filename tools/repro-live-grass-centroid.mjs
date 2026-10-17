import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
import {normalizeGrassPhaseControls,applyGrassPhaseControls} from './grass-phase-controls.mjs';
import {rgbFrame,walkingFlicker} from './foliage-motion-metric.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out??'grass-centroid',frames=Number(args.frames??31),hour=Number(args.hour??12),route=args.route??'village';
assert.ok(Number.isInteger(frames)&&frames>=5&&frames<=121&&Number.isFinite(hour)&&hour>=0&&hour<=24&&['village','meadow'].includes(route));
const controls=normalizeGrassPhaseControls({...JSON.parse(fs.readFileSync('docs/perf/proofs/grass-white-attribution/controls.json','utf8')),hour,cloudTime:0},{hour,cloudTime:0});
const source=fs.readFileSync('src/presentation/grass/grassMaterial.ts','utf8');
assert.equal((source.match(/centroid varying vec[34] vG(?:Col|Info);/g)??[]).length,4,'Candidate must qualify both stages');
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour});
const roi={left:64,top:126,width:512,height:216},images={before:[],after:[]},costs={before:[],after:[]};
let restoredPixels=0;console.log(JSON.stringify({stage:'world-ready'}));
try {
 const setup=await page.eval(`const T=window.tervain;T.present=()=>{};T.perf?.end(0);T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;T.cam.manual=true;
 (${applyGrassPhaseControls.toString()})(T,${JSON.stringify(controls)});
 const x=${route==='village'?-7:-2},z=${route==='village'?45:38};T.player.setPosition(x,z,0,T.world.terrain);
 const camera=T.cam.camera,h=T.world.terrain.heightAt(x,z);camera.position.set(x,h+1.4,z-3);camera.lookAt(x,h+.3,z+2);camera.updateMatrixWorld();
 T.world.update(0,T.game.state,T.player.group.position,T.settings,${hour},camera,false);(${applyGrassPhaseControls.toString()})(T,${JSON.stringify(controls)});T.worldLook=null;
 const materials=new Set();T.world.scene.traverse(o=>{for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.name==='Tervain grass blades')materials.add(m);});if(materials.size!==2)throw Error('Expected two native grass materials');
 const saved=[...materials].map(m=>({hook:m.onBeforeCompile,key:m.customProgramCacheKey}));
 window.CP={x,z,camera,set(mode){[...materials].forEach((m,i)=>{const original=saved[i];m.onBeforeCompile=(s,r)=>{original.hook.call(m,s,r);let count=0;for(const k of ['vertexShader','fragmentShader'])s[k]=s[k].replace(/(?:centroid )?varying (vec[34] vG(?:Col|Info);)/g,(_,line)=>{count++;return(mode==='after'?'centroid ':'')+'varying '+line;});if(count!==4)throw Error('Grass interpolation markers changed');};m.customProgramCacheKey=()=>original.key.call(m)+'|centroid-proof-'+mode;m.needsUpdate=true;});},render(){T.renderer.info.autoReset=false;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();const errors=[];for(let i=0;i<64;i++){const e=gl.getError();if(!e)break;errors.push(e);}if(errors.length||gl.isContextLost())throw Error('Invalid capture '+errors);return{png:T.renderer.domElement.toDataURL(),cost:{calls:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles,textures:T.renderer.info.memory.textures}};}};
 const startupErrors=[];const gl=T.renderer.getContext();for(let i=0;i<64;i++){const e=gl.getError();if(!e)break;startupErrors.push(e);}if(startupErrors.length)throw Error('Startup graphics errors '+startupErrors);
 CP.render();const native=CP.render();T.renderer.shadowMap.autoUpdate=false;CP.set('before');CP.render();CP.set('after');const candidate=CP.render();CP.set('before');const control=CP.render();T.renderer.shadowMap.autoUpdate=false;
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),samples:T.grade.target.samples,post:T.grade.enabled,drawingBuffer:[T.renderer.domElement.width,T.renderer.domElement.height],native:native.png,control:control.png,candidate:candidate.png,nativeCost:native.cost,controlCost:control.cost,materials:materials.size,startupErrors};`);
 const decode=async png=>sharp(Buffer.from(png.split(',')[1],'base64')).removeAlpha().raw().toBuffer();
 const native=await decode(setup.native),control=await decode(setup.control),candidate=await decode(setup.candidate);
 // A published baseline must survive the inactive adapter exactly. Candidate previews use centroid natively.
 const nativeIsBefore=native.equals(control),nativeIsAfter=native.equals(candidate);delete setup.native;delete setup.control;delete setup.candidate;
 assert.equal(setup.samples,4);assert.equal(setup.post,true);assert.ok(args['expected-native']==='after'?nativeIsAfter:nativeIsBefore,'Inactive adapter changed the expected native shader');
 for(const mode of ['before','after'])fs.mkdirSync(path.join(out,mode),{recursive:true});
 for(let i=0;i<frames;i++){
  await page.eval(`const T=window.tervain,P=CP,d=${(i+7)*2.6/60},h=T.world.terrain.heightAt(P.x,P.z+d);P.camera.position.set(P.x,h+1.4,P.z+d-3);P.camera.lookAt(P.x+${route==='meadow'?Math.sin(i*.006)*5:0},h+.3,P.z+d+2);P.camera.updateMatrixWorld();const g=T.world.modules.find(m=>m.name==='groundcover').module;g.prepare?.(T.renderer,0);g.update(0,{camera:P.camera,focus:T.player.group.position,reducedMotion:true});`);
  // Prime view-dependent capture caches before comparing draw costs.
  await page.eval("CP.set('before');CP.render();");
  let before;
  for(const mode of ['before','after','restore']){
   const data=await page.eval(`CP.set('${mode==='after'?'after':'before'}');return CP.render();`),rgb=await decode(data.png);
   if(mode==='restore'){for(let k=0;k<rgb.length;k+=3)if(rgb[k]!==before[k]||rgb[k+1]!==before[k+1]||rgb[k+2]!==before[k+2])restoredPixels++;continue;}
   if(mode==='before')before=rgb;
   const file=path.join(out,mode,String(i).padStart(4,'0')+'.png');fs.writeFileSync(file,Buffer.from(data.png.split(',')[1],'base64'));
   const cropped=await sharp(file).removeAlpha().extract(roi).raw().toBuffer();images[mode].push(rgbFrame(cropped,roi.width,roi.height));costs[mode].push(data.cost);
  }
  assert.deepEqual(costs.before.at(-1),costs.after.at(-1),'Unbalanced view preparation');
  console.log(JSON.stringify({frame:i,restoredPixels}));assert.equal(restoredPixels,0,'Scene changed between matched variants');
 }
 const reports={};for(const mode of ['before','after']){reports[mode]={nearWhite:walkingFlicker(images[mode],roi.width,roi.height),brightness:{}};for(const threshold of [160,180,200,220,240]){reports[mode].brightness[threshold]=walkingFlicker(images[mode].map(f=>({...f,white:Uint8Array.from(f.gray,x=>Number(x>=threshold))})),roi.width,roi.height);reports[mode].brightness[threshold].whiteThreshold={minimumLuma:threshold};}}
 const report={schema:1,setup,route:{name:route,frames,startFrame:7,metres:(frames-1)*2.6/60,cadence:60,rotationRadiansPerSample:route==='meadow'?.006:0},controls,roi,sourceSha256:createHash('sha256').update(source).digest('hex'),reports,costs,restoredPixels,nativeIsBefore,nativeIsAfter,scope:'Native whole scene and native post/MSAA; only grass colour/lighting interpolation qualifiers differ. Frozen phases; synthetic movement samples are not hardware frame timings. Brightness bins are reported alongside the unchanged historical near-white metric; counts are observations, not unique blades. Hardware play/video gate pending.'};
 report.assertions={nativeExpectedIdentical:args['expected-native']==='after'?nativeIsAfter:nativeIsBefore,restoredExactly:restoredPixels===0,equalDrawCosts:JSON.stringify(costs.before)===JSON.stringify(costs.after),aligned:Object.values(reports).every(r=>r.nearWhite.summary.alignmentShare>.9)};
 report.pass=Object.values(report.assertions).every(v=>v===null||v===true);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({assertions:report.assertions,counts:Object.fromEntries(Object.entries(reports).map(([k,r])=>[k,{nearWhite:r.nearWhite.whitePixelsFlickered,brightness:Object.fromEntries(Object.entries(r.brightness).map(([t,m])=>[t,m.whitePixelsFlickered])),sparkle:r.nearWhite.summary.sparkleShare}]))}));if(!report.pass)process.exitCode=1;
}catch(error){console.error(page.console());throw error;}finally{page.close();}
