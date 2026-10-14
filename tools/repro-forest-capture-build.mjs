#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out??'forest-capture-build-proof',url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');fs.mkdirSync(out,{recursive:true});
for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
const init=[process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'',`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`].join('\n');
let page;try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,init});let ready=false;
 for(let i=0;i<1200;i++){const state=await page.eval('return {ready:window.tervain?.mode === "play" && document.title === "READY",failed:window.tervain?.worldBuildFailed===true};');if(state.failed)throw new Error('World failed to load');if(state.ready){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('World not ready');
 const setup=await page.eval(`const T=window.tervain;T.render=()=>{};T.step=()=>{};await T.world.arrived;const forest=T.world.modules.find(m=>m.name==='forest').module;
 const cube=T.world.windowView.camera;if(cube.coordinateSystem!==T.renderer.coordinateSystem){cube.coordinateSystem=T.renderer.coordinateSystem;cube.updateCoordinateSystem();}
 const camera=T.cam.camera,y=T.world.terrain.heightAt(18,20);camera.position.set(18,y+3,32);camera.lookAt(18,y+6,20);camera.updateMatrixWorld();
 forest.update(0,{camera,focus:T.player.group.position,quality:'high',reducedMotion:true});T.renderer.shadowMap.autoUpdate=false;T.renderer.shadowMap.needsUpdate=false;
 const meshes=forest.group.children.filter(m=>m.isInstancedMesh&&m.geometry.hasAttribute('aDistanceCoverage')),flags=meshes.map(m=>m.frustumCulled),pane=T.world.windowView.pane,paneVisible=pane.visible;pane.visible=false;
 window.__forestBuildProof={forest,camera,meshes,flags,pane,paneVisible};return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),programs:[...document.scripts].map(s=>s.src.split('/').pop()).filter(Boolean),colourBatches:meshes.length,culledBatches:flags.filter(Boolean).length,trees:forest.counts.trees};`);
 const rows=[],faces=(args.faces??'0,1,2,3,4,5,6').split(',').map(Number);if(!faces.length||new Set(faces).size!==faces.length||faces.some(i=>!Number.isInteger(i)||i<0||i>6))throw new Error('Invalid faces');
 for(const face of faces){const pair={face};for(const mode of ['control','actual']){
 pair[mode]=await page.eval(`const T=window.tervain,R=T.renderer,P=window.__forestBuildProof;P.meshes.forEach((m,i)=>{m.frustumCulled=${JSON.stringify(mode)}==='control'?false:P.flags[i];});
 const capture=${face}===6?P.camera:P.camera.clone();if(${face}<6){const source=T.world.windowView.camera.children[${face}];capture.copy(source);capture.position.copy(P.camera.position);capture.updateMatrixWorld();}
 const restore=${face}<6?P.forest.lighterForReflection():null;R.setRenderTarget(null);R.info.reset();const s=globalThis.__renderCostStates.get(R.getContext()),bytes=s.uploads,calls=s.draws;
 try{T.grade.render(T.world.scene,capture,0,T.world.waterRenderInputs(T.settings));}finally{restore?.();}let textureImagePayloadBytes=0;for(const levels of s.textures.values())for(const l of levels.values())textureImagePayloadBytes+=l.w*l.h*l.d*l.b;
 return{drawCalls:s.draws-calls,triangles:R.info.render.triangles,sourceUploadBytes:s.uploads-bytes,textures:R.info.memory.textures,textureImagePayloadBytes,glError:R.getContext().getError()};`);
 await page.shot(path.join(out,`${face}-${mode}.png`));}
 const a=await sharp(path.join(out,`${face}-control.png`)).removeAlpha().raw().toBuffer(),b=await sharp(path.join(out,`${face}-actual.png`)).removeAlpha().raw().toBuffer();pair.changedRGBChannels=0;for(let j=0;j<a.length;j++)if(a[j]!==b[j])pair.changedRGBChannels++;rows.push(pair);
 }
 await page.eval('const P=window.__forestBuildProof;P.meshes.forEach((m,i)=>m.frustumCulled=P.flags[i]);P.pane.visible=P.paneVisible;');
 const before=args.expect==='before',report={schema:1,...setup,scope:'Actual compiled whole scene, frozen native forest packing, selected native cube-camera orientations/middle-model proxies and/or primary view. Native post/MSAA/water rendering of each camera, not hardware timings. Control disables only forest batch frustum culling. Source uploads exclude uniforms.',rows};
 report.pass=rows.every(r=>!r.changedRGBChannels&&!r.control.glError&&!r.actual.glError&&r.actual.triangles<=r.control.triangles)&&(before?setup.culledBatches===0&&rows.every(r=>r.actual.drawCalls===r.control.drawCalls&&r.actual.triangles===r.control.triangles):setup.culledBatches>0&&rows.some(r=>r.actual.triangles<r.control.triangles));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
