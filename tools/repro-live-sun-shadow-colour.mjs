import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {RGBAFormat, RedFormat, PCFShadowMap} from 'three';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';

const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const out=args.out??'sun-shadow-colour-proof';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/sky.ts',source=fs.readFileSync(file,'utf8');
if(!source.includes('map.texture.format = THREE.RedFormat;'))throw Error('Production shadow format change missing');
let page;
try {
  const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');
  for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
  const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
  page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:1200000,init});
  let ready=false;
  for(let i=0;i<1200;i++) {
    const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');
    if(s.failed)throw Error('World load failed');
    if(s.ready){ready=true;break;}
    await page.wait(250);
  }
  if(!ready)throw Error('World not ready');
  await page.eval('const T=window.tervain;T.step=()=>{};T.render=()=>{};T.present=()=>{};await T.world.arrived;T.perf?.end(0);T.perf=null;');
  const report=await page.eval(`
    const T=window.tervain,W=T.world,R=T.renderer,gl=R.getContext(),cam=T.cam.camera;
    const cost=window.__renderCostStates.get(gl),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');
    const shadow=W.sky.sun.shadow,map=shadow.map,rgba=${RGBAFormat},red=${RedFormat};
    if(!ext||!cost||!map?.depthTexture||R.shadowMap.type!==${PCFShadowMap})throw Error('Expected PCF target and query/cost support');
    const debug=gl.getExtension('WEBGL_debug_renderer_info');
    const renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
    const originalFormat=map.texture.format,originalUpdate=shadow.updateMatrices;
    let mode='before';
    // Run after the native hook, before Three binds/allocates the target. This also permits A/B against a fixed build.
    shadow.updateMatrices=function(...a){const result=originalUpdate.apply(this,a);if(this.map===map)map.texture.format=mode==='before'?rgba:red;return result;};
    const activate=next=>{
      mode=next;const format=next==='before'?rgba:red;
      if(map.texture.format!==format){map.dispose();map.texture.format=format;shadow.needsUpdate=true;T.renderWorld();}
    };
    const storage=texture=>{
      const handle=R.properties.get(texture).__webglTexture,levels=cost.textures.get(handle);
      if(!levels?.size)throw Error('Observed target texture allocation missing');
      return [...levels.values()].reduce((n,l)=>n+l.w*l.h*l.d*l.b,0);
    };
    const median=xs=>{const a=[...xs].sort((x,y)=>x-y);return(a[Math.floor((a.length-1)/2)]+a[Math.ceil((a.length-1)/2)])/2;};
    const rows=[],images={},order=['before','after','after','before','after','before','before','after'];
    R.info.autoReset=false;T.settings.reducedMotion=true;T.lastFrameDt=0;
    try {
      for(const[index,[x,z,yaw,hour,phase,kind]]of [
        [-210,0,Math.PI/4,11,0,'timed'],[-2,38,0,11,2,'timed'],[-180,12,Math.PI/4,19.3,4,'control'],
      ].entries()) {
        const y=W.terrain.groundAt(x,z)+3;
        cam.position.set(x,y,z);cam.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);cam.updateMatrixWorld(true);
        W.update(0,T.game.state,T.player.group.position,T.settings,hour,cam,false);
        // Freeze interaction accumulation/film time, while retaining full normal wind shader inputs.
        W.foliage.wind.update(0,{reducedMotion:false});W.foliage.strength.value=1;W.foliage.wind.uniforms.uGrassTime.value=phase;
        const row={pose:[x,y,z,yaw,hour],windStrength:W.foliage.strength.value,windClock:phase,kind,modes:{before:{samples:[]},after:{samples:[]}}};
        for(const m of ['before','after']){activate(m);T.renderWorld();}
        for(const m of kind==='timed'?order:['before','after']) {
          activate(m);
          const passes={},original=R.renderBufferDirect;
          R.renderBufferDirect=function(camera,scene,geo,material,obj,group){
            const c=this.info.render.calls,t=this.info.render.triangles,result=original.apply(this,arguments);
            const key=material.isMeshDepthMaterial?'shadow':material.defines?.TV_LEAF_DEPTH_ONLY!==undefined?'leaf-depth':material.defines?.TV_LEAF_SHADE_ONLY!==undefined?'leaf-colour':obj.parent?.name?.startsWith('grass-')?'grass':'other';
            const p=passes[key]??={calls:0,triangles:0};p.calls+=this.info.render.calls-c;p.triangles+=this.info.render.triangles-t;return result;
          };
          const q=gl.createQuery(),draws=cost.draws,uploads=cost.uploads;
          R.info.reset();
          try {
            gl.beginQuery(ext.TIME_ELAPSED_EXT,q);T.renderWorld();gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();
            // Capture synchronously, before a browser presentation can discard the default framebuffer.
            images[index+'-'+m]=R.domElement.toDataURL('image/png');
          } finally {R.renderBufferDirect=original;}
          while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))await new Promise(r=>setTimeout(r,20));
          if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint query');
          const gpuQueryMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);
          let textureBytes=0;for(const levels of cost.textures.values())for(const l of levels.values())textureBytes+=l.w*l.h*l.d*l.b;
          row.modes[m].samples.push({gpuQueryMs,drawCalls:cost.draws-draws,triangles:R.info.render.triangles,uploadBytes:cost.uploads-uploads,
            textureCount:R.info.memory.textures,estimatedTextureStorageBytes:textureBytes,unknownTextureFormats:cost.unknownFormats,
            shadowColourBytes:storage(map.texture),shadowDepthBytes:storage(map.depthTexture),shadowColourFormat:map.texture.format,
            depthComparison:map.depthTexture.compareFunction,shadowSize:[map.width,map.height],passes});
        }
        for(const m of ['before','after'])row.modes[m].gpuQueryMedianMs=median(row.modes[m].samples.map(s=>s.gpuQueryMs));
        rows.push(row);
      }
    } finally {
      shadow.updateMatrices=originalUpdate;
      if(map.texture.format!==originalFormat){map.dispose();map.texture.format=originalFormat;shadow.needsUpdate=true;}
    }
    return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rendering:String(renderer).includes('SwiftShader')?'software WebGL (SwiftShader)':'WebGL2',order,rows,images};
  `);
  for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));
  delete report.images;
  for(const[index,row]of report.rows.entries()) {
    const[a,b]=await Promise.all(['before','after'].map(m=>sharp(path.join(out,index+'-'+m+'.png')).removeAlpha().raw().toBuffer()));
    let changed=0,min=255,max=0;
    for(let i=0;i<a.length;i+=3){if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2])changed++;for(let c=0;c<3;c++){min=Math.min(min,a[i+c]);max=Math.max(max,a[i+c]);}}
    row.changedPixels=changed;row.captureValid=max-min>8&&max>16;
  }
  if(fs.readFileSync(file,'utf8')!==source)throw Error('Source changed during replay');
  report.sourceSha256=createHash('sha256').update(source).digest('hex');
  report.scope='Native High 640x360 Grade/post/MSAA. A/B forces only RGBA8 versus R8 on the existing PCF sun colour attachment, after the native shadow-matrix hook and before allocation. Reallocation/warm draws precede timing queries. Frozen simulation, interaction field and film time; full wind inputs held at clocks 0/2/4. Four samples per variant in balanced order for timed views; dusk is a one-pair image/resource control. Queries measure software draw work, not hardware frame cadence. Storage is nominal observed texture texels/mips; driver padding, compression and renderbuffers are excluded.';
  report.pass=report.rows.every(row=>row.changedPixels===0&&row.captureValid&&['before','after'].every(m=>row.modes[m].samples.length===(row.kind==='timed'?4:1)&&row.modes[m].samples.every(s=>{
    const b=row.modes.before.samples[0],colour=(m==='before'?4:1)*4096*4096;
    return s.drawCalls===b.drawCalls&&s.triangles===b.triangles&&s.uploadBytes===b.uploadBytes&&s.textureCount===b.textureCount&&s.unknownTextureFormats===0
      &&s.shadowColourBytes===colour&&s.shadowDepthBytes===b.shadowDepthBytes&&s.depthComparison===b.depthComparison
      &&s.estimatedTextureStorageBytes===b.estimatedTextureStorageBytes-(m==='after'?3*4096*4096:0)&&JSON.stringify(s.passes)===JSON.stringify(b.passes);
  })));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({pass:report.pass,build:report.build,rows:report.rows.map(r=>({pose:r.pose,changedPixels:r.changedPixels,beforeMs:r.modes.before.gpuQueryMedianMs,afterMs:r.modes.after.gpuQueryMedianMs}))}));
  if(!report.pass)process.exitCode=1;
} finally {page?.close();}
