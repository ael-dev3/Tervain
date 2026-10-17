import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {openPage} from './cdp.mjs';
import {installRenderCost} from './render-cost.mjs';
import {textureUploadBytes} from './webgl-upload-bytes.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'tree-box-proof';fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const file='src/presentation/flora.ts',source=fs.readFileSync(file,'utf8');let page;
try{
 const url=new URL(args.url??'https://ael-dev3.github.io/Tervain/');for(const[k,v]of Object.entries({shot:'1',quality:'high',place:'rillford',settle:'1',hud:'0',hour:'11'}))url.searchParams.set(k,v);
 const init=(process.env.REPRO_INIT_FILE?fs.readFileSync(process.env.REPRO_INIT_FILE,'utf8'):'')+'\n('+installRenderCost.toString()+')('+textureUploadBytes.toString()+');';
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:1200000,headed:args.headed==='1',init});let ready=false;for(let i=0;i<1200;i++){const s=await page.eval('return {ready:window.tervain?.mode==="play"&&document.title==="READY",failed:window.tervain?.worldBuildFailed===true};');if(s.failed)throw Error('World load failed');if(s.ready){ready=true;break;}await page.wait(250);}if(!ready)throw Error('World not ready');
 await page.eval('const T=window.tervain;T.step=()=>{};T.render=()=>{};T.present=()=>{};await T.world.arrived;T.perf?.end(0);T.perf=null;');
 const report=await page.eval(`const T=window.tervain,W=T.world,R=T.renderer,gl=R.getContext(),cam=T.cam.camera,cost=window.__renderCostStates.get(gl);
 T.settings.reducedMotion=true;T.lastFrameDt=0;R.info.autoReset=false;const ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext||!cost)throw Error('Timer/cost counters missing');
 const debug=gl.getExtension('WEBGL_debug_renderer_info'),renderer=debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);
 const F=W.modules.find(m=>m.name==='forest').module,it=Array.prototype[Symbol.iterator],nativeUpdate=F.update;let batches,frame;F.update=function(dt,f){frame=f;return nativeUpdate.call(this,dt,f)};
 Array.prototype[Symbol.iterator]=function(){if(this[0]?.variant&&this[0]?.placements)batches=this;return it.call(this)};
 try{cam.position.x+=.1;W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false)}finally{Array.prototype[Symbol.iterator]=it}if(!batches)throw Error('Native batches missing');
 const boxes=new WeakMap();let placements=0;for(const b of batches){const g=b.variant.lods.flatMap(l=>[l.wood,l.leaf]).find(Boolean),local=g.boundingBox.clone().makeEmpty();for(const lod of b.variant.lods)for(const geo of [lod.wood,lod.leaf])if(geo){if(!geo.boundingBox)geo.computeBoundingBox();local.union(geo.boundingBox)}for(const p of b.placements){boxes.set(p.bounds,local.clone().applyMatrix4(p.matrix).expandByScalar(2));placements++;}}
 const proto=Object.getPrototypeOf(W.sky.sun.shadow.getFrustum()),original=proto.intersectsSphere;let active=false,windClock=0;
 proto.intersectsSphere=function(sphere){const hit=original.call(this,sphere),box=boxes.get(sphere);return hit&&(!active||!box||this.intersectsBox(box));};
 const update=()=>W.update(0,T.game.state,T.player.group.position,T.settings,11,cam,false);
 const activate=mode=>{active=mode==='after';cam.position.x+=.01;nativeUpdate.call(F,0,frame);cam.position.x-=.01;nativeUpdate.call(F,0,frame);W.foliage.strength.value=1;W.foliage.wind.uniforms.uGrassTime.value=windClock;};
 const pose=(x,z,yaw)=>{const y=W.terrain.groundAt(x,z)+3;cam.position.set(x,y,z);cam.lookAt(x+Math.sin(yaw)*20,y-1,z+Math.cos(yaw)*20);cam.updateMatrixWorld(true);return y;};
 const scan=[];for(const[x,z]of[[-210,0],[-180,12]])for(let a=0;a<8;a++){const yaw=a*Math.PI/4;pose(x,z,yaw);update();const counts={};for(const mode of ['before','after']){activate(mode);counts[mode]=F.stats();}scan.push({pose:[x,z,yaw],counts,saved:counts.before.treeTris+counts.before.shadowTris-counts.after.treeTris-counts.after.shadowTris});}
 const selected=[...new Set(scan.map(r=>r.pose[0]))].map(x=>scan.filter(r=>r.pose[0]===x).sort((a,b)=>b.saved-a.saved)[0].pose);selected.push([-2,38,0]);
 const median=xs=>{const s=[...xs].sort((a,b)=>a-b);return(s[Math.floor((s.length-1)/2)]+s[Math.ceil((s.length-1)/2)])/2;};
 const rows=[],images={},order=['before','after','after','before'];
 try{for(const[index,[x,z,yaw]]of selected.entries()){
 const hour=11,y=pose(x,z,yaw);update();windClock=index*2;
 const row={pose:[x,y,z,yaw,hour],windStrength:1,windClock:index*2,modes:{before:{samples:[]},after:{samples:[]}}};
 for(const mode of ['before','after']){activate(mode);T.renderWorld();}
 for(const mode of order){activate(mode);T.renderWorld();const groups={},original=R.renderBufferDirect;
 R.renderBufferDirect=function(camera,scene,geo,material,obj,group){const a=this.info.render.calls,b=this.info.render.triangles;const value=original.apply(this,arguments),key=material.isMeshDepthMaterial?'shadow':material.defines?.TV_LEAF_DEPTH_ONLY!==undefined?'leaf-depth':material.defines?.TV_LEAF_SHADE_ONLY!==undefined?'leaf-colour':obj.parent?.name?.startsWith('grass-')?'grass':'other',s=groups[key]??={calls:0,triangles:0};s.calls+=this.info.render.calls-a;s.triangles+=this.info.render.triangles-b;return value;};
 const q=gl.createQuery(),draws=cost.draws,uploads=cost.uploads;R.info.reset();
 try{gl.beginQuery(ext.TIME_ELAPSED_EXT,q);T.renderWorld();gl.endQuery(ext.TIME_ELAPSED_EXT);gl.flush();images[index+'-'+mode]=R.domElement.toDataURL('image/png');}finally{R.renderBufferDirect=original;}
 while(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))await new Promise(r=>setTimeout(r,20));
 if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('Disjoint GPU query');
 const gpuQueryMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);let textureBytes=0;for(const levels of cost.textures.values())for(const l of levels.values())textureBytes+=l.w*l.h*l.d*l.b;
 row.modes[mode].samples.push({gpuQueryMs,drawCalls:cost.draws-draws,triangles:R.info.render.triangles,uploadBytes:cost.uploads-uploads,textureCount:R.info.memory.textures,estimatedTextureStorageBytes:textureBytes,unknownTextureFormats:cost.unknownFormats,passes:groups});
 }
 for(const mode of ['before','after'])row.modes[mode].gpuQueryMedianMs=median(row.modes[mode].samples.map(s=>s.gpuQueryMs));rows.push(row);
 }}finally{proto.intersectsSphere=original;F.update=nativeUpdate;}
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rendering:String(renderer).includes('SwiftShader')?'software WebGL (SwiftShader)':'WebGL2',placements,scan,order,rows,images};`);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));delete report.images;
 for(const[index,row]of report.rows.entries()){const[a,b]=await Promise.all(['before','after'].map(mode=>sharp(path.join(out,index+'-'+mode+'.png')).removeAlpha().raw().toBuffer()));row.identicalPixels=a.equals(b);let min=255,max=0;for(const value of a){min=Math.min(min,value);max=Math.max(max,value);}row.captureValid=max-min>8&&max>16;}
 if(fs.readFileSync(file,'utf8')!==source)throw Error('Source changed during replay');report.sourceSha256=createHash('sha256').update(source).digest('hex');
 report.scope='Published native High scene through Grade/post/MSAA. Added cached source boxes after the existing sphere test only for native forest placement spheres. Wind strength 1, frozen clock differs per view. Both modes warmed; balanced query samples. Software GPU query time is not target hardware cadence. Nominal texture storage is not driver VRAM. Pose scan chooses the largest geometry reduction at each of two forest locations; meadow is a control.';
 report.pass=report.scan.every(s=>s.counts.before.trees===report.placements&&s.counts.after.trees===report.placements)&&report.rows.some(row=>row.modes.after.samples[0].triangles<row.modes.before.samples[0].triangles)&&report.rows.every(row=>row.captureValid&&row.identicalPixels&&row.modes.before.samples.length===2&&row.modes.after.samples.length===2&&row.modes.before.samples.every(s=>s.triangles===row.modes.before.samples[0].triangles)&&row.modes.after.samples.every(s=>s.triangles===row.modes.after.samples[0].triangles)&&row.modes.after.samples.every(s=>{const b=row.modes.before.samples[0];return s.drawCalls<=b.drawCalls&&s.triangles<=b.triangles&&s.uploadBytes===b.uploadBytes&&s.textureCount===b.textureCount&&s.estimatedTextureStorageBytes===b.estimatedTextureStorageBytes}));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
