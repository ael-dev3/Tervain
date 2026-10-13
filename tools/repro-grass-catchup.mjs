#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {openPage} from './cdp.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out??'grass-catchup-proof';fs.mkdirSync(out,{recursive:true});
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'high',hud:'0',settle:'1'}))url.searchParams.set(k,v);
let page;
try {
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});
 let ready=false;for(let i=0;i<800;i++){if(await page.eval('return !!window.tervain?.world?.groundcover;')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Groundcover unavailable');
 const report=await page.eval(`const T=window.tervain;T.render=()=>{};T.step=()=>{};
 const W=T.world,G=W.groundcover,camera=T.cam.camera,focus=T.player.group.position.clone();
 const f={camera,focus,reducedMotion:true};const now=performance.now;Object.defineProperty(performance,'now',{configurable:true,value:()=>0});
 const records=[];try{
 camera.position.set(0,2,30);camera.updateMatrixWorld();G.update(0,f);G.prepare(T.renderer,0);
 camera.position.x+=12;camera.updateMatrixWorld();
 for(let i=0;i<9;i++){
 const previous=new Map();G.group.traverse(m=>{if(m.geometry?.getAttribute('aBase'))previous.set(m,m.geometry.getAttribute('aBase').version);});
 G.update(1/60,f);let visible=0,reserve=0;
 G.group.traverse(m=>{const g=m.geometry,a=g?.getAttribute('aBase');if(!a||a.version===(previous.get(m)??0))return;
 const size=m.parent.name==='grass-near'?12:24,end=m.parent.name==='grass-near'?21:82;
 const c=g.boundingSphere.center;const x0=c.x-size/2,z0=c.z-size/2;
 const d=Math.hypot(Math.max(x0-camera.position.x,0,camera.position.x-x0-size),Math.max(z0-camera.position.z,0,camera.position.z-z0-size));
 if(d>=end)reserve++;else visible++;
 });records.push({step:i,visible,reserve});
 }
 G.prepare(T.renderer,0);const old=new Map();G.group.traverse(m=>{const a=m.geometry?.getAttribute('aBase');if(a)old.set(m,a.version);});G.update(1/60,f);
 let nextFrameStarts=0;G.group.traverse(m=>{const a=m.geometry?.getAttribute('aBase');if(a&&a.version!==(old.get(m)??0))nextFrameStarts++;});
 return{steps:records,reserveStarts:records.reduce((n,r)=>n+r.reserve,0),nextFrameStarts,clock:'fixed to isolate count limit; not a timing measurement'};
 }finally{Object.defineProperty(performance,'now',{configurable:true,value:now});}`);
 report.build=await page.eval(`return fetch(new URL('version.json',document.baseURI)).then(r=>r.json());`);
 report.pass=args.expect==='before'?report.reserveStarts>2:report.reserveStarts<=2&&report.nextFrameStarts>0;
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
