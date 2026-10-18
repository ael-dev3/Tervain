import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
import {shadowZeroIntensityFixture} from './shadow-zero-intensity-fixture.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'zero-shadow-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/softShadows.ts',source=fs.readFileSync(file,'utf8'),guard={before:'bool frustumTest = inFrustum && shadowCoord.z <= 1.0;',after:'bool frustumTest = inFrustum && shadowCoord.z <= 1.0 && shadowIntensity != 0.0;'};if(!source.includes(guard.after))throw Error('Production zero-intensity guard missing');let page;
try{
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'21.5'}))url.searchParams.set(k,v);
 const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:1200000,init});let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World load failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 await page.eval('const T=window.tervain;T.step=()=>{};T.render=()=>{};T.present=()=>{};await T.world.arrived;T.perf?.end(0);T.perf=null;');
 const report=await page.eval(`const T=window.tervain,W=T.world,R=T.renderer,gl=R.getContext(),cam=T.cam.camera,cost=window.__renderCostStates.get(gl),guard=${JSON.stringify(guard)};
 T.settings.reducedMotion=true;T.lastFrameDt=0;const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext||!cost)throw Error('Timer/cost counters missing');
 const debug=gl.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const nativeSource=R.info.programs.map(p=>p.fragmentShader&&gl.getShaderSource(p.fragmentShader)).find(s=>s?.includes('float tvShadowTap')&&!s.includes(guard.after));if(!nativeSource)throw Error('Unmodified native shadow kernel missing');
 const fixture=(${shadowZeroIntensityFixture.toString()})(nativeSource,guard);if(!fixture.pass)throw Error('Shadow tap fixture failed');
 const mats=new Set();W.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])mats.add(m);if(o.customDepthMaterial)mats.add(o.customDepthMaterial)});
 const keys=new Map([...mats].map(m=>[m,m.customProgramCacheKey])),shaderSource=gl.shaderSource;let active=null,patches=0;
 gl.shaderSource=function(shader,text){if(active==='after'&&text.includes(guard.before)){text=text.replace(guard.before,guard.after);patches++;}return shaderSource.call(this,shader,text)};
 const activate=mode=>{if(active===mode)return;active=mode;for(const m of mats){const key=keys.get(m);m.customProgramCacheKey=function(){return key.call(this)+'|zero-shadow-proof-'+mode};m.needsUpdate=true;}T.renderWorld();};
 const median=xs=>{const s=[...xs].sort((a,b)=>a-b);return(s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2;};
 const rows=[],images={},order=['before','after','after','before','after','before','before','after'];
 try{for(const[index,[x,z,yaw,hour]]of [[-210,0,.5,21.5],[-2,38,0,21.5],[-210,0,.5,11],[-2,38,0,20.1]].entries()){
 const y=W.terrain.groundAt(x,z)+3;cam.position.set(x,y,z);cam.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);cam.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,hour,cam,false);
 const row={pose:[x,y,z,yaw,hour],sunShadowIntensity:W.sky.sun.shadow.intensity,shadowAutoUpdate:W.sky.sun.shadow.autoUpdate,modes:{before:{samples:[]},after:{samples:[]}}};
 for(const mode of ['before','after']){activate(mode);T.renderWorld();}
 for(const mode of order){activate(mode);const groups={},original=R.renderBufferDirect;
 R.renderBufferDirect=function(camera,scene,geo,material,obj,group){const a=this.info.render.calls,b=this.info.render.triangles;const value=original.apply(this,arguments),key=material.isMeshDepthMaterial?'shadow':material.defines?.TV_LEAF_DEPTH_ONLY!==undefined?'leaf-depth':material.defines?.TV_LEAF_SHADE_ONLY!==undefined?'leaf-colour':obj.parent?.name?.startsWith('grass-')?'grass':'other',s=groups[key]??={calls:0,triangles:0};s.calls+=this.info.render.calls-a;s.triangles+=this.info.render.triangles-b;return value;};
 const q=gl.createQuery(),draws=cost.draws,uploads=cost.uploads;R.info.reset();
 try{gl.beginQuery(ext.TIME_ELAPSED_EXT,q);T.renderWorld();gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();images[index+'-'+mode]=R.domElement.toDataURL('image/png');}finally{R.renderBufferDirect=original;}
 while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))await new Promise(r=>setTimeout(r,20));
 if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU query');
 const gpuQueryMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);let textureBytes=0;for(const levels of cost.textures.values())for(const l of levels.values())textureBytes+=l.w*l.h*l.d*l.b;
 row.modes[mode].samples.push({gpuQueryMs,drawCalls:cost.draws-draws,triangles:R.info.render.triangles,uploadBytes:cost.uploads-uploads,textureCount:R.info.memory.textures,estimatedTextureStorageBytes:textureBytes,unknownTextureFormats:cost.unknownFormats,passes:groups});
 }
 for(const mode of ['before','after'])row.modes[mode].gpuQueryMedianMs=median(row.modes[mode].samples.map(s=>s.gpuQueryMs));rows.push(row);
 }}finally{gl.shaderSource=shaderSource;for(const[m,key]of keys){m.customProgramCacheKey=key;m.needsUpdate=true;}}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rendering:String(renderer).includes('SwiftShader')?'software WebGL (SwiftShader)':'WebGL2',patches,order,fixture,rows,images};`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 for(const[index,row]of report.rows.entries()){const[a,b]=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,index+'-'+mode+'.png')).removeAlpha().raw().toBuffer()));row.identicalPixels=a.equals(b);let min=255,max=0;for(const value of a){min=Math.min(min,value);max=Math.max(max,value);}row.captureValid=max-min>8&&max>16;}
 if(fs.readFileSync(file,'utf8')!==source)throw Error('Source changed during replay');report.sourceSha256=createHash('sha256').update(source).digest('hex');report.guard=guard;
 report.scope='Native published High scene and Grade/post/MSAA. Candidate production guard inserted verbatim into newly compiled native shadow kernels; original uniforms/material logic retained. Cold night map initialization remains enabled. Both variants warmed before balanced before/after/after/before samples; frozen simulation/wind. GPU queries describe this renderer only, not target hardware frame cadence. Texture storage is observed uncompressed texels/mips, not total driver VRAM. Independent WebGL fixture counts comparison taps in the actual native kernel for lit/dark/edge maps and zero/fractional/full/negative intensities.';
 report.pass=report.patches>0&&report.fixture.pass&&report.rows.every(row=>row.captureValid&&row.identicalPixels&&row.modes.before.samples.length===4&&row.modes.after.samples.length===4&&[...row.modes.before.samples,...row.modes.after.samples].every(s=>{const b=row.modes.before.samples[0];return s.drawCalls===b.drawCalls&&s.triangles===b.triangles&&s.uploadBytes===b.uploadBytes&&s.textureCount===b.textureCount&&s.estimatedTextureStorageBytes===b.estimatedTextureStorageBytes&&JSON.stringify(s.passes)===JSON.stringify(b.passes)}));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
