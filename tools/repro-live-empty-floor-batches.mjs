import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'empty-floor-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/forestFloor.ts',source=fs.readFileSync(file,'utf8'),expression=source.match(/b\.mesh\.visible = ([^;]+);/)?.[1];if(!expression)throw Error('Candidate visibility assignment missing');let page;
try{
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
 const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,init});let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World load failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 await page.eval('const T=window.tervain;T.step=()=>{};T.render=()=>{};await T.world.arrived;');
 const report=await page.eval(`const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,root=F.group.getObjectByName('deepwood_forest_floor'),cam=T.cam.camera,gl=T.renderer.getContext(),cost=window.__renderCostStates.get(gl);
 if(!root||!cost)throw Error('Native floor/counters missing');T.settings.reducedMotion=true;T.lastFrameDt=0;
 const meshes=root.children.filter(m=>m.isInstancedMesh),apply=count=>(${expression}),originalCallbacks=meshes.map(m=>m.onBeforeRender),originalShadow=T.renderer.shadowMap.autoUpdate;
 let emptySetups=0,uniformCalls=0;meshes.forEach((m,i)=>m.onBeforeRender=function(...a){if(this.count===0)emptySetups++;return originalCallbacks[i].apply(this,a)});
 const methods=new Map();for(let p=Object.getPrototypeOf(gl);p;p=Object.getPrototypeOf(p))for(const key of Object.getOwnPropertyNames(p))if(/^uniform(?:[1-4]|Matrix)/.test(key)&&!methods.has(key)&&typeof gl[key]==='function'){const original=gl[key];methods.set(key,original);gl[key]=function(...a){uniformCalls++;return original.apply(this,a)}}
 const rows=[],images={},hash=async v=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))).map(x=>x.toString(16).padStart(2,'0')).join('');
 const snapshot=()=>meshes.map(m=>({name:m.name,count:m.count,castShadow:m.castShadow,matrix:Array.from(m.instanceMatrix.array.slice(0,m.count*16)),color:m.instanceColor?Array.from(m.instanceColor.array.slice(0,m.count*3)):null,coverage:Array.from(m.geometry.getAttribute('aDistanceCoverage').array.slice(0,m.count*2))}));
 const poses=[[-2,38,0],[-210,0,.5],[-268,27,-1.4]];
 try{for(const[index,[x,z,yaw]]of poses.entries()){
 const y=W.terrain.groundAt(x,z)+3;cam.position.set(x,y,z);cam.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);
 const nativeVisibility=meshes.map(m=>m.visible),stateHash=await hash(snapshot());T.renderer.shadowMap.autoUpdate=originalShadow;T.renderWorld();T.renderer.shadowMap.autoUpdate=false;
 const row={pose:[x,y,z,yaw],emptyBatches:meshes.filter(m=>m.count===0).length,nonemptyBatches:meshes.filter(m=>m.count>0).length,stateHash,modes:{}};
 for(const mode of ['before','after','repeat']){
 meshes.forEach((m,i)=>m.visible=mode==='before'?nativeVisibility[i]:apply(m.count));T.renderWorld();
 emptySetups=0;uniformCalls=0;const draws=cost.draws,uploads=cost.uploads;T.renderer.info.reset();T.renderWorld();let textureBytes=0;for(const levels of cost.textures.values())for(const l of levels.values())textureBytes+=l.w*l.h*l.d*l.b;
 row.modes[mode]={emptySetups,uniformCalls,drawCalls:cost.draws-draws,triangles:T.renderer.info.render.triangles,uploadBytes:cost.uploads-uploads,textureCount:T.renderer.info.memory.textures,estimatedTextureStorageBytes:textureBytes,unknownTextureFormats:cost.unknownFormats,stateHash:await hash(snapshot())};images[index+'-'+mode]=T.renderer.domElement.toDataURL('image/png');
 }
 rows.push(row);meshes.forEach((m,i)=>m.visible=nativeVisibility[i]);
 }}finally{meshes.forEach((m,i)=>m.onBeforeRender=originalCallbacks[i]);for(const[key,value]of methods)gl[key]=value;T.renderer.shadowMap.autoUpdate=originalShadow;}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),batches:meshes.length,rows,images};`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 for(const[index,row]of report.rows.entries()){const pixels=await Promise.all(['before','after','repeat'].map(mode=>sharp(path.join(out,index+'-'+mode+'.png')).removeAlpha().raw().toBuffer()));row.identicalPixels=pixels[0].equals(pixels[1]);row.repeatIdentical=pixels[1].equals(pixels[2]);}
 if(fs.readFileSync(file,'utf8')!==source)throw Error('Source changed during replay');report.sourceSha256=createHash('sha256').update(source).digest('hex');report.visibilityExpression=expression;
 report.scope='Published High forest-floor batches, native count selection and Grade/post/MSAA rendering. Only mesh visibility uses the candidate production assignment extracted verbatim. Actual builder exercised separately by regression tests. Warm controls, frozen simulation/wind and fixed shadow map per view. GL uniform call counts and upload source bytes, not CPU/GPU timings. Texture estimate is observed uncompressed texels/mips, not total driver VRAM.';
 report.pass=report.rows.some(r=>r.emptyBatches>0&&r.modes.before.emptySetups>0)&&report.rows.every(r=>r.identicalPixels&&r.repeatIdentical&&r.modes.after.emptySetups===0&&r.modes.after.uniformCalls<=r.modes.before.uniformCalls&&Object.values(r.modes).every(m=>m.stateHash===r.stateHash&&m.drawCalls===r.modes.before.drawCalls&&m.triangles===r.modes.before.triangles&&m.textureCount===r.modes.before.textureCount&&m.estimatedTextureStorageBytes===r.modes.before.estimatedTextureStorageBytes));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
