import fs from 'node:fs';
import path from 'node:path';
import {openPage} from './cdp.mjs';
const url=new URL(process.argv[2]??'https://ael-dev3.github.io/Tervain/'),out=process.argv[3]??'outputs/live-grass-pass-pixels';fs.mkdirSync(out,{recursive:true});
for(const[k,v]of Object.entries({shot:'1',quality:'low',place:'rillford',settle:'1',hour:'12'}))url.searchParams.set(k,v);
const page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,...(process.env.REPRO_INIT_FILE?{init:fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8')}:{})});
try {
 let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 const report=await page.eval(`const T=window.tervain;T.step=()=>{};T.render=()=>{};await T.world.arrived;const r=T.renderer,meshes=[];T.world.scene.traverse(o=>{if(o.material?.name==='Tervain grass blades'&&r.properties.get(o.material).uniforms?.uGrassPx)meshes.push(o);});if(!meshes.length)throw Error('Native compiled grass uniforms missing');const mesh=meshes[0],uniform=r.properties.get(mesh.material).uniforms.uGrassPx,saved=r.getRenderTarget(),target=T.grade.target.clone();target.samples=0;target.setSize(128,128);const rows=[];
 try{for(const pass of ['main','capture','cropped','main-again']){if(pass==='cropped')target.viewport.w=64;r.setRenderTarget(pass.startsWith('main')?null:target);mesh.material.onBeforeRender(r,T.world.scene,T.cam.camera,mesh.geometry,mesh,{});const viewport=r.getCurrentViewport(target.viewport.clone());rows.push({pass,viewport:viewport.toArray(),expectedHeight:viewport.w,uniformHeight:uniform.value});}}
 finally{r.setRenderTarget(saved);target.dispose();}
 return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),program:performance.getEntriesByType('resource').map(e=>e.name.split('/').pop()).find(n=>/^tervain-.*\\.js$/.test(n)),rows};
 `);
 report.scope='Actual compiled grass material callback and uniform, using native default, offscreen and cropped pass viewports. No source-class substitution; not a whole-scene shimmer or hardware timing check.';report.pass=report.rows.every(r=>r.uniformHeight===r.expectedHeight);fs.writeFileSync(path.join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page.close();}
