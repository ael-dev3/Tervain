#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {openPage}from'./cdp.mjs';import {installRenderCost}from'./render-cost.mjs';import {textureUploadBytes}from'./webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[])),out=args.out??'grass-collapsed-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000,init:`(${installRenderCost.toString()})(${textureUploadBytes.toString()});`});let ready=false;for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 await page.eval('const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};');
 const report={schema:1,build:await page.eval(`return fetch(new URL('version.json',document.baseURI)).then(r=>r.json());`),routes:[],scope:'Frozen native grass shader A/B; counters and exact-image checks, not hardware GPU timings.'};
 for(const[x,z,yaw]of[[-7,45,0],[-7,45,.6],[18,20,0]]){
  const row=await page.eval(`const T=window.tervain,W=T.world,R=T.renderer,grass=W.groundcover,camera=T.cam.camera;
   const y=W.terrain.heightAt(${x},${z}),focus=T.player.group.position.clone().set(${x},y,${z});camera.position.set(${x},y+1.4,${z}-3);camera.lookAt(${x}+Math.sin(${yaw})*5,y+.3,${z}-3+Math.cos(${yaw})*5);camera.updateMatrixWorld();grass.update(0,{camera,focus,reducedMotion:true});
   const materials=[];grass.group.traverse(m=>{if(m.isMesh&&!materials.some(r=>r.material===m.material))materials.push({material:m.material,hook:m.material.onBeforeCompile,key:m.material.customProgramCacheKey});});
   window.__grassVertex={materials,camera};R.setRenderTarget(null);R.render(W.scene,camera);R.shadowMap.autoUpdate=false;
   const s=globalThis.__renderCostStates.get(R.getContext()),draw=()=>{R.info.reset();const bytes=s.uploads,calls=s.draws;R.render(W.scene,camera);return{drawCalls:s.draws-calls,triangles:R.info.render.triangles,uploadBytes:s.uploads-bytes};};
   const seen=new Set(),hooks=[];grass.group.traverse(m=>{if(!m.isMesh)return;const hook=m.onBeforeRender;hooks.push([m,hook]);m.onBeforeRender=function(...a){hook.apply(this,a);seen.add(m);};});
   const actual=draw();for(const[m,hook]of hooks)m.onBeforeRender=hook;
   let indexedVertices=0,conservativeZeroWidthVertices=0;
   const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
   for(const m of seen){const g=m.geometry,u=R.properties.get(m.material).uniforms;if(!u?.uClump)throw new Error('Native grass uniforms missing');const B=u.uClump.value.w,perBlade=g.getAttribute('position').count/B,indexPerBlade=g.index.count/B,blades=Math.min(B,Math.floor(g.drawRange.count/indexPerBlade)),base=g.getAttribute('aBase'),fade=u.uFade.value,band=u.uBand.value;
    for(let i=0;i<g.instanceCount;i++){const d=Math.hypot(base.getX(i)-camera.position.x,base.getY(i)-camera.position.y,base.getZ(i)-camera.position.z),q=Math.pow(1-smooth(fade.x,fade.y,d),fade.w),share=1+(u.uFarBlades.value-1)*smooth(fade.x,fade.y,d);
     for(let b=0;b<blades;b++){indexedVertices+=perBlade; if(d<band.x-.001||d>band.w+.001||q*1.12<base.getW(i)-.0001||(b+.5)/B>share+.0001)conservativeZeroWidthVertices+=perBlade;}
    }
   }
   let patched=0;
   for(const r of materials){r.material.onBeforeCompile=function(shader,renderer){r.hook.call(this,shader,renderer);const guard='if (gPresence <= 0.0) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }';if(!shader.vertexShader.includes(guard))throw new Error('Guard missing from native shader');shader.vertexShader=shader.vertexShader.replace(guard,'');patched++;};r.material.customProgramCacheKey=()=>r.key()+'-full-work-control';r.material.needsUpdate=true;}
   R.render(W.scene,camera);const control=draw();return{x:${x},z:${z},yaw:${yaw},grass:grass.stats(),patchedPrograms:patched,vertexEstimate:{indexedVertices,conservativeZeroWidthVertices,scope:"CPU estimate from native drawn tiles with boundary margins; not a GPU invocation counter"},control,actual};`);
  const label=`${x}-${z}-${yaw}`;await page.shot(path.join(out,`${label}-control.png`));
  await page.eval('const T=window.tervain,F=window.__grassVertex;for(const r of F.materials){r.material.onBeforeCompile=r.hook;r.material.customProgramCacheKey=r.key;r.material.needsUpdate=true;}T.renderer.render(T.world.scene,F.camera);T.renderer.render(T.world.scene,F.camera);');
  await page.shot(path.join(out,`${label}-actual.png`));row.identicalPixels=fs.readFileSync(path.join(out,`${label}-control.png`)).equals(fs.readFileSync(path.join(out,`${label}-actual.png`)));report.routes.push(row);
 }
 report.pass=report.routes.every(r=>r.identicalPixels&&r.grass.grassInstances>0&&r.control.drawCalls===r.actual.drawCalls&&r.control.triangles===r.actual.triangles&&r.control.uploadBytes===r.actual.uploadBytes);
 report.pass&&=report.routes.some(r=>r.patchedPrograms>0);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
