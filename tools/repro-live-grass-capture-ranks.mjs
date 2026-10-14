import fs from 'node:fs';
import path from 'node:path';
import { openPage } from './cdp.mjs';
const input=process.argv[2]??'https://ael-dev3.github.io/Tervain/',out=process.argv[3]??'outputs/live-grass-capture-ranks';
fs.mkdirSync(out,{recursive:true});const url=new URL(input);
for(const[k,v]of Object.entries({shot:'1',quality:'low',place:'rillford',settle:'1',hour:'12'}))url.searchParams.set(k,v);
const page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
try {
 let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World load failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 const report=await page.eval(`const T=window.tervain,W=T.world;T.step=()=>{};T.render=()=>{};await W.arrived;W.scene.updateMatrixWorld(true);const camera=T.cam.camera.clone(),rows=[];
 W.scene.traverse(mesh=>{const geo=mesh.geometry,base=geo?.getAttribute('aBase');if(!mesh.visible||!geo?.isInstancedBufferGeometry||!base||!mesh.parent?.name.startsWith('grass-'))return;
 let available=0;for(let i=0;i<base.count;i++){if([0,1,2,3].every(c=>base.array[i*4+c]===0))break;available++;}const primary=geo.instanceCount;if(primary<=0||primary>=available||rows.length>=12)return;
 const center=geo.boundingSphere.center;camera.position.copy(center);camera.position.y=W.terrain.heightAt(center.x,center.z)+2;camera.position.z-=8;camera.lookAt(center);camera.updateMatrixWorld(true);
 const range={...geo.drawRange};mesh.onBeforeRender(T.renderer,W.scene,camera,geo,mesh.material,{});const captured=geo.instanceCount;mesh.onAfterRender(T.renderer,W.scene,camera,geo,mesh.material,{});const restored=geo.instanceCount;geo.setDrawRange(range.start,range.count);
 rows.push({layer:mesh.parent.name,anchor:[base.getX(0),base.getY(0),base.getZ(0)],available,primary,captured,restored});});
 const version=await fetch(new URL('version.json',document.baseURI)).then(r=>r.json());return {build:version,program:performance.getEntriesByType('resource').map(e=>e.name.split('/').pop()).find(n=>/^tervain-.*\\.js$/.test(n)),rows};`);
 report.scope='Callbacks on actual compiled-world grass tiles with primary rank trimming; controlled nearer capture cameras, no source-class substitution. This measures per-pass count and restoration, not a full window clip or hardware timings.';
 report.assertions={sampled:report.rows.length>0,restored:report.rows.every(r=>r.restored===r.primary),nearCaptureExpands:report.rows.some(r=>r.captured>r.primary)};report.pass=Object.values(report.assertions).every(Boolean);
 fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page.close();}
