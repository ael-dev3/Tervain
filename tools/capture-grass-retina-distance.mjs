import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';import {installGrassDistanceProbe} from './grass-distance-probe.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-retina-distance',frames=Number(args.frames??25);if(!Number.isInteger(frames)||frames<3||frames>61)throw Error('Invalid frames');fs.mkdirSync(out,{recursive:true});
const controls=JSON.parse(fs.readFileSync(args.controls??'docs/perf/proofs/grass-live27-walk/controls.json','utf8'));
const oldDir=args.previous,old=oldDir?JSON.parse(fs.readFileSync(path.join(oldDir,'report.json'),'utf8')):null;
const locations=args.locations?JSON.parse(fs.readFileSync(args.locations,'utf8')):null;
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:controls.hour,w:old?1440:1470,h:old?900:956,dpr:2});
const saveMask=async(name,kind,crop,width,height)=>{const r=await page.eval(`return E.mask(${kind},${JSON.stringify(crop??null)},${width??'undefined'},${height??'undefined'});`);fs.writeFileSync(path.join(out,name+'.png'),Buffer.from(r.png,'base64'));return {width:r.width,height:r.height,samples:r.samples};};
const oldPose=async i=>page.eval(`const T=window.tervain,d=${i*2.6/60},h=T.world.terrain.heightAt(6-d,26),c=T.cam.camera;c.position.set(9-d,h+1.4,27.1);c.lookAt(-23-d,h+.3,15.3);c.updateMatrixWorld();const g=T.world.modules.find(m=>m.name==='groundcover').module;g.prepare?.(T.renderer,0);g.update(0,{camera:c,focus:T.player.group.position,reducedMotion:true});`);
const colour=async name=>{await page.eval('E.colour();');await page.shot(path.join(out,name+'.png'));};
const raw=async f=>sharp(path.join(out,f+'.png')).removeAlpha().raw().toBuffer();
const progress={schema:1,controls,old:[],poses:[]};const flush=()=>fs.writeFileSync(path.join(out,'progress.json'),JSON.stringify(progress,null,2));
try{
 await page.eval(`const T=window.tervain,C=${JSON.stringify(controls)},u=T.world.foliage.wind.uniforms;u.uGrassTime.value=C.wind.time;u.uWindDir.value.fromArray(C.wind.direction);u.uGustScroll.value.fromArray(C.wind.scroll);T.world.sway.uTime.value=C.sway;T.grade.time=C.gradeTime;T.world.sky.cloudTime=C.cloudTime;T.world.sky.update(C.hour,T.player.group.position,0,false);T.grade.setLook({night:T.world.sky.state.nightness});T.renderer.shadowMap.autoUpdate=false;`);
 progress.build=await page.eval("const a=await window.tervain.auditPlacement({kind:'root',maxChecks:1});return {version:a.version,revision:a.revision};");
 if(progress.build.version!=='0.0.27')throw Error('Expected requested live 0.0.27, got '+JSON.stringify(progress.build));
 await oldPose(0);await page.eval('const T=window.tervain;T.grade.render(T.world.scene,T.cam.camera,0);');await page.shot(path.join(out,'original.png'));
 progress.initialProfile=await page.eval('const T=window.tervain;return {browser:[innerWidth,innerHeight],dpr:devicePixelRatio,buffer:[T.renderer.domElement.width,T.renderer.domElement.height],samples:T.grade.target.samples};');
 progress.install=await page.eval(`window.E=(${installGrassDistanceProbe.toString()})(window.tervain);return {nativeGrassMaterials:E.native};`);
 await colour('inactive-control');const a=await raw('original'),b=await raw('inactive-control');let changed=0;for(let i=0;i<a.length;i++)changed+=Number(a[i]!==b[i]);progress.inactiveChangedChannels=changed;assert.equal(changed,0,'Inactive labels changed normal picture');flush();console.log(JSON.stringify({stage:'control',build:progress.build,changed,materials:progress.install}));
 if(old&&locations&&args.phase!=='motion'){
  assert.equal(old.build.revision,progress.build.revision);assert.equal(locations.count,1099);
  for(let i=0;i<old.route.frames;i++){
   await oldPose(i);const row=locations.byFrame[i];if(!row.count)continue;
   const [x0,y0,x1,y1]=row.bounds,scale=.75,fullW=2160,fullH=1350,left=Math.max(0,Math.floor(x0*scale)-3),top=Math.max(0,Math.floor(y0*scale)-3),right=Math.min(fullW,Math.ceil((x1+1)*scale)+3),bottom=Math.min(fullH,Math.ceil((y1+1)*scale)+3),crop={left,top,width:right-left,height:bottom-top};
   const entry={frame:i,crop,labels:await saveMask('old-label-'+String(i).padStart(2,'0'),2,crop,fullW,fullH)};
   if([0,23,60].includes(i)){
    const n='old-baseline-'+i;await colour(n);const requested=path.join(oldDir,'baseline-'+String(i).padStart(2,'0')+'.png'),referenceFile=fs.existsSync(requested)?requested:path.join(oldDir,({0:'start.png',23:'brightest.png',60:'end.png'})[i]);const ref=await sharp(referenceFile).removeAlpha().raw().toBuffer(),now=await raw(n);let d=0,max=0;for(let k=0;k<ref.length;k++){const q=Math.abs(ref[k]-now[k]);d+=Number(q>0);max=Math.max(max,q);}entry.reference={changedChannels:d,maxDelta:max};
    for(const term of ['noSheen','noThrough']){await page.eval(`E.${term}.value=1;`);await colour('old-'+term+'-'+i);await page.eval(`E.${term}.value=0;`);}
   }
   progress.old.push(entry);flush();if(i%10===0)console.log(JSON.stringify({stage:'old-labels',frame:i}));
  }
 }
 if(args.phase!=='attribution'){
 await page.cdp('Emulation.setDeviceMetricsOverride',{width:1470,height:956,deviceScaleFactor:2,mobile:false});await page.eval("window.dispatchEvent(new Event('resize'));await new Promise(requestAnimationFrame);");
 progress.profile=await page.eval('const T=window.tervain;return {browser:[1470,956],dpr:2,buffer:[T.renderer.domElement.width,T.renderer.domElement.height],postEnabled:T.grade.enabled,samples:T.grade.target.samples};');flush();
 // A short pilot checks that the requested distance strata are actually in view. It does not supply colour metrics.
 progress.pilot=[];for(const yaw of [-25,0,25]){
  await page.eval(`const T=window.tervain,c=T.cam.camera,h=T.world.terrain.heightAt(6,26),a=${yaw*Math.PI/180};c.position.set(6,h+1.6,23);c.lookAt(6+80*Math.sin(a),h+.4,23+80*Math.cos(a));c.updateMatrixWorld();T.world.prepareGrass(T.renderer,0);T.world.update(0,T.game.state,T.player.group.position,T.settings,${controls.hour},c,false);const C=${JSON.stringify(controls)};T.world.foliage.wind.uniforms.uGrassTime.value=C.wind.time;T.world.foliage.wind.uniforms.uWindDir.value.fromArray(C.wind.direction);T.world.foliage.wind.uniforms.uGustScroll.value.fromArray(C.wind.scroll);T.world.sway.uTime.value=C.sway;T.grade.time=C.gradeTime;T.world.sky.cloudTime=C.cloudTime;`);
  await saveMask('pilot-'+yaw,1,null,480,312);progress.pilot.push({yaw});flush();
 }
 const heading=Number(args.heading??0);if(!Number.isFinite(heading))throw Error('Invalid heading');
 for(let i=0;i<frames;i++){
  const t=i/60,d=t*2.6,yaw=(heading-8+16*i/(frames-1))*Math.PI/180;
  const pose=await page.eval(`const T=window.tervain,c=T.cam.camera,h=T.world.terrain.heightAt(${6+d},26);c.position.set(${6+d},h+1.6,23);c.lookAt(${6+d}+80*Math.sin(${yaw}),h+.4,23+80*Math.cos(${yaw}));c.updateMatrixWorld();T.world.prepareGrass(T.renderer,0);T.world.update(0,T.game.state,T.player.group.position,T.settings,${controls.hour},c,false);const C=${JSON.stringify(controls)};T.world.foliage.wind.uniforms.uGrassTime.value=C.wind.time;T.world.foliage.wind.uniforms.uWindDir.value.fromArray(C.wind.direction);T.world.foliage.wind.uniforms.uGustScroll.value.fromArray(C.wind.scroll);T.world.sway.uTime.value=C.sway;T.grade.time=C.gradeTime;T.world.sky.cloudTime=C.cloudTime;return {camera:c.position.toArray(),quaternion:c.quaternion.toArray()};`);
  const tag=String(i).padStart(2,'0');await colour('frame-'+tag);if(i===0){await colour('stationary-repeat');const a=await raw('frame-00'),b=await raw('stationary-repeat');let changed=0;for(let k=0;k<a.length;k++)changed+=Number(a[k]!==b[k]);progress.stationaryChangedChannels=changed;assert.equal(changed,0,'Stationary Retina capture changed');}await saveMask('bins-'+tag,1);
  progress.poses.push({frame:i,t,d,yaw,...pose});flush();console.log(JSON.stringify({stage:'retina',frame:i}));
 }
 }
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({...progress,complete:true},null,2));
} catch(error){flush();console.error(JSON.stringify(page.console()));throw error;}finally{page.close();}
