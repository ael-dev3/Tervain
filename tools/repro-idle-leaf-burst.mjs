#!/usr/bin/env node
import fs from 'node:fs';import path from 'node:path';import {openPage}from'./cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[])),out=args.out??'idle-leaf-burst-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'low',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const report=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};const forest=T.world.modules.find(m=>m.name==='forest').module;
 let mesh;forest.group.traverse(m=>{if(m.name==='struck-tree-leaves')mesh=m;});if(!mesh)throw new Error('Native leaf pool missing');
 const wind=T.world.modules.find(m=>m.name==='groundcover').module.wind,direction=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(wind),'direction').get;let directionReads=0;Object.defineProperty(wind,'direction',{configurable:true,get(){directionReads++;return direction.call(this);}});
 let writes=0;const original=mesh.setMatrixAt;mesh.setMatrixAt=function(...args){writes++;return original.apply(this,args);};
 const frame={camera:T.cam.camera,focus:T.player.group.position,quality:'low',reducedMotion:false,nightness:0};
 const idle=()=>{const start=writes,version=mesh.instanceMatrix.version,reads=directionReads;for(let i=0;i<120;i++)forest.update(1/60,frame);return{frames:120,matrixWrites:writes-start,attributeVersions:mesh.instanceMatrix.version-version,windDirectionReads:directionReads-reads,visible:mesh.visible,count:mesh.count,active:forest.stats().struckLeaves};};
 const initial=idle(),root=forest.placementAuditTargets().find(t=>t.kind==='root');root.geometry.computeBoundingBox();const point=root.geometry.boundingBox.getCenter(T.player.group.position.clone()).applyMatrix4(root.matrix);
 const accepted=forest.strike(point.x,point.y,point.z,1,root.label);forest.update(0,frame);const emitted={accepted,active:forest.stats().struckLeaves,visible:mesh.visible,count:mesh.count};
 T.cam.camera.position.copy(point).add(T.player.group.position.clone().set(3,3,6));T.cam.camera.lookAt(point);T.cam.camera.updateMatrixWorld();T.renderer.render(T.world.scene,T.cam.camera);
 window.__leafBurstProof={forest,frame,mesh,writes:()=>writes,idle};return{initial,emitted};`);
 await page.shot(path.join(out,'active.png'));
 const final=await page.eval(`const T=window.tervain,F=window.__leafBurstProof;let steps=0;while(F.forest.stats().struckLeaves>0&&steps<1200){F.forest.update(.1,F.frame);steps++;}return{expirySteps:steps,expired:F.forest.stats().struckLeaves===0,afterExpiry:F.idle()};`);Object.assign(report,final);
 report.build=await page.eval(`return await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());`);
 report.pass=report.emitted.accepted&&report.emitted.active>0&&report.emitted.visible&&report.expired&&[report.initial,report.afterExpiry].every(r=>!r.visible&&r.count===0&&r.active===0&&(args.expect==='before'?r.matrixWrites===48*120&&r.attributeVersions===120&&r.windDirectionReads===120:r.matrixWrites===0&&r.attributeVersions===0&&r.windDirectionReads===0));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
