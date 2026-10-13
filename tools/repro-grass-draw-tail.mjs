#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {openPage}from'./cdp.mjs';import {installRenderCost}from'./render-cost.mjs';import {textureUploadBytes}from'./upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[])),out=args.out??'grass-draw-tail-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});let ready=false;for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 await page.eval('const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};');
 const report={schema:1,build:await page.eval(`return await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());`),routes:[],scope:'Frozen native scene renders; full-index control and actual tile draw ranges in the same frame state. Software counters and exact-image controls, not GPU timings.'};
 for(const[x,z]of[[-7,45],[18,20],[46,68]]){
  const row=await page.eval(`const T=window.tervain,W=T.world,R=T.renderer,grass=W.modules.find(m=>m.name==='groundcover').module,camera=T.cam.camera;
   const y=W.terrain.heightAt(${x},${z}),focus=T.player.group.position.clone().set(${x},y,${z});camera.position.set(${x},y+1.4,${z}-3);camera.lookAt(${x},y+.3,${z}+2);camera.updateMatrixWorld();grass.update(0,{camera,focus,reducedMotion:true});
   const ranges=[];grass.group.traverse(m=>{if(m.isMesh&&m.geometry?.isInstancedBufferGeometry)ranges.push({g:m.geometry,count:m.geometry.drawRange.count,full:m.geometry.index.count});});
   window.__grassTail={ranges,camera};R.setRenderTarget(null);R.render(W.scene,camera);R.shadowMap.autoUpdate=false;
   const s=globalThis.__renderCostStates.get(R.getContext()),draw=()=>{R.info.reset();const bytes=s.uploads,calls=s.draws;R.render(W.scene,camera);return{drawCalls:s.draws-calls,triangles:R.info.render.triangles,uploadBytes:s.uploads-bytes};};
   const actual=draw();ranges.forEach(r=>r.g.setDrawRange(0,r.full));const full=draw();ranges.forEach(r=>r.g.setDrawRange(0,r.count));
   return{x:${x},z:${z},grass:grass.stats(),trimmedTiles:ranges.filter(r=>r.count<r.full).length,full,actual};`);
  await page.shot(path.join(out,`${x}-${z}-full.png`));
  // Previous evaluation leaves the full-index control on screen; now render the restored actual ranges.
  await page.eval('const T=window.tervain;T.renderer.render(T.world.scene,window.__grassTail.camera);');
  await page.shot(path.join(out,`${x}-${z}-actual.png`));
  row.identicalPixels=fs.readFileSync(path.join(out,`${x}-${z}-full.png`)).equals(fs.readFileSync(path.join(out,`${x}-${z}-actual.png`)));report.routes.push(row);
 }
 report.pass=report.routes.every(r=>r.identicalPixels&&r.grass.grassInstances>0&&r.actual.drawCalls===r.full.drawCalls&&r.actual.uploadBytes===r.full.uploadBytes&&(args.expect==='before'?r.actual.triangles===r.full.triangles&&r.trimmedTiles===0:r.actual.triangles<r.full.triangles&&r.trimmedTiles>0));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
