import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'sea-visibility-proof',quality=args.quality??'medium';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/water/ocean.ts',source=fs.readFileSync(file),server=await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});let page;
try{
 await server.listen();const origin='http://127.0.0.1:'+server.httpServer.address().port;
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');for(const[k,v]of Object.entries({shot:'1',quality,place:'rillford',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
 const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,init});let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World load failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 await page.eval('const T=window.tervain;T.step=()=>{};T.render=()=>{};await T.world.arrived;');
 const report=await page.eval(`
const M=await import(${JSON.stringify(origin)}+'/src/presentation/water/ocean.ts'),B=await import(${JSON.stringify(origin)}+'/src/world/water/bathymetry.ts'),waves=await import(${JSON.stringify(origin)}+'/src/world/water/waves.ts'),T=window.tervain,W=T.world,P=T.grade.waterPass,cam=T.cam.camera,sea=W.water.ocean.mesh,oldBounds=sea.userData.waterVisibilityBounds,newBounds=M.oceanVisibilityBounds(W.water.world.bathymetry,waves.SEA_MAX_RISE),cost=window.__renderCostStates.get(T.renderer.getContext());
if(!cost)throw Error('Startup render counters missing');T.settings.reducedMotion=true;T.lastFrameDt=0;
const originalShadow=T.renderer.shadowMap.autoUpdate,originalCapture=P.captureReflection;let captureCost;
P.captureReflection=function(...a){const c={...T.renderer.info.render};try{return originalCapture.apply(this,a);}finally{captureCost={drawCalls:T.renderer.info.render.calls-c.calls,triangles:T.renderer.info.render.triangles-c.triangles};}};
const box=oldBounds[0].clone(),candidates=[];
// Use the pass's own conservative visibility predicate on native geometry and candidate boxes.
const sees=bounds=>{sea.userData.waterVisibilityBounds=bounds;P.visibilityProjection.multiplyMatrices(cam.projectionMatrix,cam.matrixWorldInverse);P.visibilityFrustum.setFromProjectionMatrix(P.visibilityProjection);return P.waterInView(sea,cam);};
for(let z=-100;z<=100&&candidates.length<3;z+=5)for(let x=-275;x<=-190&&candidates.length<3;x+=2){const y=W.terrain.groundAt(x,z)+3;cam.position.set(x,y,z);cam.lookAt(x+6,y-3,z);cam.updateMatrixWorld(true);if(sees(oldBounds)&&!sees(newBounds))candidates.push([x,y,z,x+6,y-3,z]);}
if(!candidates.length)throw Error('No native dry-tail visibility false positive found');
const bathy=W.water.world.bathymetry,w=B.BATHY_NX+1;let wetCells=0,uncovered=0;
for(let j=0;j<B.BATHY_NZ;j++)for(let i=0;i<B.BATHY_NX;i++){
 const ids=[j*w+i,j*w+i+1,(j+1)*w+i,(j+1)*w+i+1];if(!ids.some(id=>bathy.height[id]>=0))continue;wetCells++;
 box.min.set(B.BATHY.minX+i*B.BATHY.cell-2,-1.2,B.BATHY.minZ+j*B.BATHY.cell-2);box.max.set(B.BATHY.minX+(i+1)*B.BATHY.cell+2,waves.SEA_MAX_RISE,B.BATHY.minZ+(j+1)*B.BATHY.cell+2);
 if(!newBounds.some(b=>b.containsBox(box)))uncovered++;
}
const rows=[],images={},poses=[...candidates,[-310,8,-40,-300,0,-40],[-335,8,-90,-325,0,-90]];
try{for(const[index,pose]of poses.entries()){
 cam.position.set(...pose.slice(0,3));cam.lookAt(...pose.slice(3));cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);sea.visible=true;sea.userData.waterVisibilityBounds=oldBounds;T.renderer.shadowMap.autoUpdate=originalShadow;P.reflectionValid=false;T.renderWorld();T.renderer.shadowMap.autoUpdate=false;
 const r={pose,kind:index<candidates.length?'inland':'shore',modes:{}};
 for(const mode of['before','after','hidden','repeat']){
  sea.userData.waterVisibilityBounds=mode==='before'?oldBounds:newBounds;sea.visible=mode!=='hidden';
  if(mode!=='hidden')P.reflectionValid=false;
  captureCost={drawCalls:0,triangles:0};const upload=cost.uploads,draws=cost.draws;T.renderer.info.reset();T.renderWorld();
  let textureBytes=0;for(const levels of cost.textures.values())for(const l of levels.values())textureBytes+=l.w*l.h*l.d*l.b;
  r.modes[mode]={drawCalls:cost.draws-draws,triangles:T.renderer.info.render.triangles,uploadBytes:cost.uploads-upload,textureCount:T.renderer.info.memory.textures,estimatedTextureStorageBytes:textureBytes,unknownTextureFormats:cost.unknownFormats,captureCost};
  images[index+'-'+mode]=T.renderer.domElement.toDataURL('image/png');
 }
 rows.push(r);
}
return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),bounds:{before:oldBounds.length,after:newBounds.length,tightened:newBounds.filter((b,i)=>!b.equals(oldBounds[i])).length,contained:newBounds.every((b,i)=>oldBounds[i].containsBox(b)),wetCells,uncovered},rows,images};
}finally{sea.userData.waterVisibilityBounds=oldBounds;sea.visible=true;T.renderer.shadowMap.autoUpdate=originalShadow;P.captureReflection=originalCapture;}
`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 for(const[index,row]of report.rows.entries()){
  const rgb=async mode=>sharp(path.join(out,index+'-'+mode+'.png')).removeAlpha().raw().toBuffer(),[a,b,c,d]=await Promise.all(['before','after','hidden','repeat'].map(rgb));const diff=(x,y)=>{let n=0;for(let i=0;i<x.length;i+=3)if([0,1,2].some(j=>x[i+j]!==y[i+j]))n++;return n;};row.pixels={beforeAfter:diff(a,b),hidden:diff(b,c),repeat:diff(b,d)};
 }
 if(!source.equals(fs.readFileSync(file)))throw Error('Source changed during replay');report.sourceSha256=createHash('sha256').update(source).digest('hex');report.quality=quality;
 report.scope='Native published scene, bathymetry, water geometry and Grade/post/MSAA renders. Only sea visibility boxes substituted with candidate production output. Reduced Motion, simulation and shadow map held still during each comparison. Hidden-sea controls establish empty inland water and nonempty shoreline water. Uploads are source bytes; texture storage is nominal uncompressed observed texels/mips, excluding renderbuffers/driver padding/compressed storage. No hardware timings or total VRAM claim.';
 report.pass=report.bounds.contained&&report.bounds.wetCells>0&&report.bounds.uncovered===0&&report.bounds.before===report.bounds.after&&report.bounds.tightened>0&&report.rows.every(r=>r.pixels.beforeAfter===0&&r.pixels.repeat===0&&(r.kind==='inland'?r.pixels.hidden===0&&r.modes.before.captureCost.drawCalls>0&&r.modes.after.captureCost.drawCalls===0&&r.modes.after.drawCalls<r.modes.before.drawCalls:r.pixels.hidden>0&&r.modes.after.captureCost.drawCalls>0));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();await server.close();}
