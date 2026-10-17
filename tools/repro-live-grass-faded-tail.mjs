import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'grass-tail-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const source=fs.readFileSync('src/presentation/ground/tileStream.ts','utf8');
const body=source.split('  private trimFadedTail(t: Tile, count: number, camera: THREE.Vector3): number {')[1]?.split('\n  private instanceCountAt(')[0];
if(!body)throw Error('Production method missing');
const candidate='function(t,count,camera){'+body.replace(' as Float32Array','').replaceAll(']!',']').replace('t.attrs[0]!','t.attrs[0]');
let page;
try {
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
 const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:1200000,init});
 let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true}');if(s.failed)throw Error('World load failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 const report=await page.eval(`const T=window.tervain,W=T.world,R=T.renderer,cam=T.cam.camera,gl=R.getContext(),cost=window.__renderCostStates.get(gl);
 T.step=()=>{};T.render=()=>{};T.present=()=>{};await W.arrived;T.perf?.end(0);T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;
 const smoothstep=(a,b,x)=>{const v=Math.max(0,Math.min(1,(x-a)/(b-a)));return v*v*(3-2*v)},RANK_HEADROOM=1.12,trim=${candidate};
 const G=W.modules.find(m=>m.name==='groundcover').module,it=Array.prototype[Symbol.iterator];let layers;
 Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this[0]?.group?.name==='grass-near'&&this[1]?.group?.name==='grass-far')layers=[this[0],this[1]];return it.call(this)};
 try{G.update(0,{camera:cam,focus:T.player.group.position.clone(),reducedMotion:true})}finally{Array.prototype[Symbol.iterator]=it}if(!layers)throw Error('Native grass layers missing');
 const rows=[],images={};R.info.autoReset=false;
 for(const[index,[x,z,yaw]]of [[-210,0,.5],[-2,38,0],[-180,12,.8]].entries()){
 const y=W.terrain.groundAt(x,z)+3;cam.position.set(x,y,z);cam.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);
 const hooks=[];let active=false,removed=0,checked=0;for(const l of layers){l.o.trimFadedTail=true;for(const t of l.tiles.values()){
 const original=t.mesh.onBeforeRender;hooks.push([t.mesh,original]);t.mesh.onBeforeRender=function(renderer,scene,camera,...rest){original.call(this,renderer,scene,camera,...rest);if(active){const e=camera.matrixWorld.elements,focus={x:e[12],y:e[13],z:e[14]},n=t.geo.instanceCount;t.geo.instanceCount=trim.call(l,t,n,focus);removed+=n-t.geo.instanceCount;checked++;}};}}
 const row={pose:[x,y,z,yaw],modes:{}};try{for(const mode of ['before','after']){active=mode==='after';T.renderWorld();T.renderWorld();removed=checked=0;R.info.reset();const uploads=cost.uploads,draws=cost.draws;T.renderWorld();images[index+'-'+mode]=R.domElement.toDataURL('image/png');
 let storage=0;for(const levels of cost.textures.values())for(const l of levels.values())storage+=l.w*l.h*l.d*l.b;
 row.modes[mode]={drawCalls:cost.draws-draws,triangles:R.info.render.triangles,uploadBytes:cost.uploads-uploads,textures:R.info.memory.textures,estimatedTextureStorageBytes:storage,unknownTextureFormats:cost.unknownFormats,removedClumps:removed,visitedGrassDraws:checked};}}
 finally{for(const[m,h]of hooks)m.onBeforeRender=h;for(const l of layers)delete l.o.trimFadedTail;}rows.push(row);
 }
 return{build:await fetch('version.json').then(r=>r.json()),renderer:gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL),rows,images};`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 for(const[index,row]of report.rows.entries()){const[a,b]=await Promise.all(['before','after'].map(m=>sharp(path.join(out,index+'-'+m+'.png')).ensureAlpha().raw().toBuffer()));row.identicalPixels=a.equals(b);let min=255,max=0,opaque=0;for(let i=0;i<a.length;i+=4){for(let j=0;j<3;j++){min=Math.min(min,a[i+j]);max=Math.max(max,a[i+j]);}if(a[i+3]===255)opaque++;}row.captureValid=max-min>8&&opaque===a.length/4;}
 report.methodSha256=createHash('sha256').update(candidate).digest('hex');report.scope='Published native High scene through Grade/post/MSAA, frozen simulation. Production tail method applied after native per-camera grass hooks. Warmed variants. Full-frame GL counters; nominal texture storage is not driver VRAM. Software rendering counts/pixels only, no hardware FPS claim.';
 report.pass=report.rows.every(r=>r.identicalPixels&&r.captureValid&&r.modes.after.triangles<r.modes.before.triangles&&r.modes.after.uploadBytes===r.modes.before.uploadBytes&&r.modes.after.textures===r.modes.before.textures&&r.modes.after.estimatedTextureStorageBytes===r.modes.before.estimatedTextureStorageBytes);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close()}
