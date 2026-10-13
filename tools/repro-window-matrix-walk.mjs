#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {openPage}from'./cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[])),out=args.out??'window-matrix-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const report=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};T.lastFrameDt=0;T.settings.reducedMotion=true;
 const W=T.world,scene=W.scene,view=W.windowView,room=W.terrain.rooms.at(-28,-106);if(!room||room.building.kind!=='shrine')throw new Error('Native capture room missing');
 const y=W.terrain.rooms.base(room)+room.floorTop+1.5;T.cam.camera.position.set(room.building.x,y,room.building.z);T.cam.camera.lookAt(room.building.x,y,room.building.z-5);T.cam.camera.updateMatrixWorld();
 view.room=null;view.face=-1;view.age=Infinity;
 const parent=T.player.group.clone(false),child=T.player.group.clone(false);parent.position.set(7,8,9);child.position.set(1,2,3);parent.add(child);scene.add(parent);
 let walks=0,captures=0;const update=scene.updateMatrixWorld,render=T.renderer.render;scene.updateMatrixWorld=function(...a){walks++;return update.apply(this,a);};
 const matrixSamples=[];T.renderer.render=function(s,c){const result=render.call(this,s,c);if(s===scene&&view.camera.children.includes(c)){captures++;matrixSamples.push(child.matrixWorld.elements.slice(12,15));}return result;};
 const frames=[];try{for(let i=0;i<6;i++){parent.position.x=7+i;const before=walks,oldCaptures=captures;T.renderWorld();frames.push({worldMatrixWalks:walks-before,captureFaces:captures-oldCaptures,autoUpdateRestored:scene.matrixWorldAutoUpdate,probe:child.matrixWorld.elements.slice(12,15)});}}finally{scene.updateMatrixWorld=update;T.renderer.render=render;parent.removeFromParent();}
 return{frames,matrixSamples,captureComplete:view.captured===room&&view.face===-1&&view.pane.envMap===view.target.texture};`);
 report.build=await page.eval(`return await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());`);
 report.pass=report.captureComplete&&report.frames.every((f,i)=>f.worldMatrixWalks===(args.expect==='before'?2:1)&&f.captureFaces===1&&f.autoUpdateRestored===true&&JSON.stringify(f.probe)===JSON.stringify([8+i,10,12]))&&report.matrixSamples.every((p,i)=>JSON.stringify(p)===JSON.stringify([8+i,10,12]));
 await page.shot(path.join(out,'scene.png'));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
