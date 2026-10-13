#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const out=args.out??'dust-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'low',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;
 for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode==="play";')){ready=true;break;}await page.wait(250);}
 if(!ready)throw new Error('Game not ready');
 const report=await page.eval(`
 const T=window.tervain;T.render=()=>{};T.step=()=>{};const W=T.world,R=T.renderer,dust=W.dust,attr=dust.geometry.attributes.position;
 W.emitDust=()=>{};for(const p of W.dustData)p.life=0;
 const focus=T.player.group.position.clone(),cam=T.cam.camera,scene=new W.scene.constructor();scene.add(dust);
 const gl=R.getContext(),original=gl.bufferSubData,originalData=gl.bufferData;let bytes=0;
 const size=(data,offset,length)=>ArrayBuffer.isView(data)?(length===undefined?data.byteLength-(offset??0)*data.BYTES_PER_ELEMENT:length*data.BYTES_PER_ELEMENT):data?.byteLength??0;
 gl.bufferSubData=function(target,offset,data,srcOffset,length){bytes+=size(data,srcOffset,length);return original.apply(this,arguments);};
 gl.bufferData=function(target,data,usage,srcOffset,length){bytes+=size(data,srcOffset,length);return originalData.apply(this,arguments);};
 const samples=[];let idleUploads=0,idleBytes=0,activeBytes=0;
 function tick(dt,phase){const before=attr.version;W.update(dt,T.game.state,focus,T.settings,12,cam,false);bytes=0;R.info.reset();R.render(scene,cam);
 const snap={phase,positions:Array.from(attr.array),lives:W.dustData.map(p=>p.life)};samples.push(snap);
 if(phase==='idle'){idleUploads+=Number(attr.version!==before);idleBytes+=bytes;}else activeBytes+=bytes;}
 try{
 tick(0,'warm');
 for(let i=0;i<60;i++)tick(1/60,'idle');
 Object.assign(W.dustData[0],{x:1,y:2,z:3,vx:.2,vy:.3,vz:.1,life:.1});
 for(let i=0;i<12;i++)tick(1/60,'active');
 for(let i=0;i<30;i++)tick(1/60,'idle');
 Object.assign(W.dustData[1],{x:4,y:5,z:6,vx:.2,vy:.3,vz:.1,life:.1});
 for(let i=0;i<12;i++)tick(1/60,'restart');
 }finally{gl.bufferSubData=original;gl.bufferData=originalData;}
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(samples)))),b=>b.toString(16).padStart(2,'0')).join('');
 return {schema:1,idleUpdates:90,particleCapacity:W.dustData.length,bufferBytes:attr.array.byteLength,idleUploads,idleBytes,activeBytes,snapshotHash:hash,scope:'Actual compiled world update and actual dust buffer rendered in isolation with software WebGL. Controlled emission, expiry and restart; not hardware timing.'};
 `);
 report.build=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');
 report.pass=args.expect==='fresh'?report.idleUploads===90&&report.idleBytes===97200:report.idleUploads===0&&report.idleBytes===0;
 if(args.baseline){const before=JSON.parse(fs.readFileSync(args.baseline,'utf8'));report.outputMatchesBaseline=report.snapshotHash===before.snapshotHash;report.pass&&=report.outputMatchesBaseline;}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
