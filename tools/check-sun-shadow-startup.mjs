import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {RedFormat, PCFShadowMap} from 'three';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'sun-shadow-startup-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');
for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'21.5166666667'}))url.searchParams.set(k,v);
const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
let page;
try {
  page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:600000,init});let ready=false;
  for(let i=0;i<1200;i++) {
    const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
    if(s.failed)throw Error('World build failed');if(s.ready){ready=true;break;}await page.wait(250);
  }
  if(!ready)throw Error('World not ready');
  const report=await page.eval(`
    const T=window.tervain;T.step=()=>{};T.render=()=>{};T.present=()=>{};await T.world.arrived;
    T.perf?.end(0);T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;
    const R=T.renderer,gl=R.getContext(),shadow=T.world.sky.sun.shadow,map=shadow.map,cost=window.__renderCostStates.get(gl);
    // Read the target created by the compiled application; no allocation/property adapter is installed.
    const initialFormat=map?.texture.format;
    if(initialFormat!==${RedFormat}||R.shadowMap.type!==${PCFShadowMap})throw Error('Compiled application did not create the compact PCF attachment');
    const initialLevels=cost.textures.get(R.properties.get(map.texture).__webglTexture);
    if(!initialLevels?.size)throw Error('Compiled application did not allocate its startup shadow target');
    const initialColourBytes=[...initialLevels.values()].reduce((n,l)=>n+l.w*l.h*l.d*l.b,0);
    const previous=R.getRenderTarget();R.setRenderTarget(map);
    const complete=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;R.setRenderTarget(previous);
    R.info.autoReset=false;R.info.reset();T.renderWorld();const image=R.domElement.toDataURL('image/png');
    const levels=cost.textures.get(R.properties.get(map.texture).__webglTexture);
    if(!levels?.size)throw Error('Initial target allocation not observed');
    const colourBytes=[...levels.values()].reduce((n,l)=>n+l.w*l.h*l.d*l.b,0);
    return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),image,initialFormat,initialColourBytes,colourBytes,
      size:[map.width,map.height],complete,depthComparison:map.depthTexture.compareFunction,shadowIntensity:shadow.intensity,
      shadowAutoUpdate:shadow.autoUpdate,shadowNeedsUpdate:shadow.needsUpdate,triangles:R.info.render.triangles};
  `);
  const image=Buffer.from(report.image.split(',')[1],'base64');delete report.image;
  fs.writeFileSync(path.join(out,'night.png'),image);const pixels=await sharp(image).removeAlpha().raw().toBuffer();
  let min=255,max=0;for(const p of pixels){min=Math.min(min,p);max=Math.max(max,p);}
  report.captureValid=max-min>8&&max>16;report.sourceSha256=createHash('sha256').update(fs.readFileSync('src/presentation/sky.ts')).digest('hex');
  report.pass=report.complete&&report.initialFormat===RedFormat&&report.initialColourBytes===4096*4096&&report.colourBytes===4096*4096&&report.shadowIntensity===0&&!report.shadowAutoUpdate&&!report.shadowNeedsUpdate&&report.triangles>1000&&report.captureValid;
  report.scope='Compiled High cold-night startup, without allocation overrides. The application must create and initialize its R8 colour/depth-comparison target before pausing night shadow updates. Native Grade/post/MSAA capture; software WebGL.';
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
} finally {page?.close();}
