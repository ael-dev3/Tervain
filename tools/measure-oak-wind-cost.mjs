import fs from 'node:fs';
import path from 'node:path';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out??'oak-wind-cost';fs.mkdirSync(out,{recursive:true});
const input=args.controls?JSON.parse(fs.readFileSync(args.controls,'utf8')):null,controls=input?.controls??input;
if(controls&&(!Number.isFinite(controls.cloud)||!Number.isFinite(controls.grade)||!['direction','scroll'].every(k=>Array.isArray(controls.wind?.[k])&&controls.wind[k].length===4&&controls.wind[k].every(Number.isFinite))))throw Error('Invalid matched wind controls');
const p=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:15,w:1440,h:900,dpr:2});
try{
 const setup=await p.eval(`const T=window.tervain;T.frame=()=>{};T.present=()=>{};T.perf?.end(0);T.perf=null;T.settings.reducedMotion=true;T.lastFrameDt=0;T.cam.mode='proof';
 const W=T.world,R=T.renderer,gl=R.getContext(),ext=gl.getExtension('EXT_disjoint_timer_query_webgl2');if(!ext)throw Error('Software GPU timer queries unavailable');
 const F=W.modules.find(m=>m.name==='forest').module,target=F.canopyAuditTargets(0).find(t=>t.label==='tree:wild:45:12');if(!target)throw Error('Oak target missing');
 const debug=gl.getExtension('WEBGL_debug_renderer_info');window.OP={T,W,R,gl,ext,F,target,pose(kind){const e=target.matrix.elements,x=kind==='oak'?e[12]:-33.4,z=kind==='oak'?e[14]:55,y=kind==='oak'?e[13]:W.terrain.heightAt(x,z);T.player.setPosition(x,z,0,W.terrain);const c=T.cam.camera;if(kind==='oak'){c.position.set(x+Math.cos(.5)*20,y+12,z+Math.sin(.5)*20);c.lookAt(x,y+10,z);}else{c.position.set(x,y+3,z);c.lookAt(x,y+2,z+20);}c.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,15,c,false);W.foliage.strength.value=1;W.foliage.wind.uniforms.uGrassTime.value=3;W.sway.uTime.value=3;},async draw(){gl.finish();R.info.autoReset=false;R.info.reset();const q=gl.createQuery(),start=performance.now();gl.beginQuery(ext.TIME_ELAPSED_EXT,q);try{T.renderWorld();}finally{gl.endQuery(ext.TIME_ELAPSED_EXT);}gl.flush();const submitMs=performance.now()-start,draws=R.info.render.calls,triangles=R.info.render.triangles;gl.finish();R.domElement.toDataURL();for(let i=0;i<3000&&!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE);i++)await new Promise(r=>setTimeout(r,10));if(!gl.getQueryParameter(q,gl.QUERY_RESULT_AVAILABLE))throw Error('GPU query timeout');if(gl.getParameter(ext.GPU_DISJOINT_EXT))throw Error('GPU query disjoint');const gpuQueryMs=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);const error=gl.getError();if(error||gl.isContextLost())throw Error('Invalid WebGL frame '+error);return{draws,triangles,gpuQueryMs,submitMs};}};
 const controls=${JSON.stringify(controls)};if(controls){W.sky.cloudTime=controls.cloud;T.grade.time=controls.grade;W.foliage.wind.uniforms.uWindDir.value.fromArray(controls.wind.direction);W.foliage.wind.uniforms.uGustScroll.value.fromArray(controls.wind.scroll);W.sky.update(15,T.player.group.position,0,false);}
 if(${args['require-wind']==='true'}&&(!target.leaves.getAttribute('_wind')||!target.wood.getAttribute('_wind')))throw Error('Restored-wind guard failed');
 const build=await T.auditPlacement({kind:'root',maxChecks:1});return{controls:{cloud:W.sky.cloudTime,grade:T.grade.time,wind:{direction:W.foliage.wind.uniforms.uWindDir.value.toArray(),scroll:W.foliage.wind.uniforms.uGustScroll.value.toArray()}},version:build.version,revision:build.revision,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),buffer:[R.domElement.width,R.domElement.height],msaa:T.grade.target.samples,target:{windDerivation:target.leaves.userData.windDerivation,windFieldAvailable:target.leaves.userData.windFieldAvailable,label:target.label,position:target.matrix.elements.slice(12,15),leafAttributes:Object.keys(target.leaves.attributes),woodAttributes:Object.keys(target.wood.attributes)}};`);
 fs.writeFileSync(path.join(out,'setup.json'),JSON.stringify(setup,null,2));console.log(JSON.stringify({stage:'ready',setup}));
 const rows=[];
 for(const kind of ['oak','forest']){
  await p.eval(`OP.pose(${JSON.stringify(kind)});OP.T.renderWorld();OP.T.renderWorld();return null;`);
  const samples=[];for(let i=0;i<Number(args.samples??8);i++){samples.push(await p.eval('return await OP.draw();'));fs.writeFileSync(path.join(out,'sample-progress.json'),JSON.stringify({setup,pose:kind,samples},null,2));console.log(JSON.stringify({stage:kind,sample:i,...samples.at(-1)}));}
  await p.shot(path.join(out,kind+'.png'));rows.push({pose:kind,samples});console.log(JSON.stringify({stage:kind,samples}));
  fs.writeFileSync(path.join(out,'timing-partial.json'),JSON.stringify({setup,rows},null,2));
 }
 await p.cdp('Emulation.setDeviceMetricsOverride',{width:640,height:360,deviceScaleFactor:1,mobile:false});
 await p.eval("window.dispatchEvent(new Event('resize'));await new Promise(requestAnimationFrame);OP.pose('oak');OP.T.renderWorld();return null;");
 await p.eval('OP.W.foliage.strength.value=0;OP.T.renderWorld();return null;');await p.shot(path.join(out,'still.png'));
 for(let i=0;i<12;i++){
  await p.eval(`OP.W.foliage.strength.value=1;OP.W.foliage.wind.uniforms.uGrassTime.value=${3+i/6};OP.W.sway.uTime.value=${3+i/6};OP.T.renderWorld();return null;`);
  await p.shot(path.join(out,'motion-'+String(i).padStart(2,'0')+'.png'));
 }
 const errors=p.console().filter(l=>l.startsWith('[error]')||l.startsWith('[exception]'));if(errors.length)throw Error(JSON.stringify(errors));
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({setup,rows,motion:{frames:12,cadence:6,startWindTime:3,seconds:11/6},consoleErrors:errors,scope:'Native High whole-scene post/MSAA. Eight warmed software WebGL timer-query frames per fixed pose. GPU-query time is SwiftShader work, not Apple hardware FPS; submitMs includes driver/scheduler effects and is not isolated JS CPU. Fixed sun/cloud and actors; wind phase advanced only for motion proof. No source intervention on the published page.'},null,2)+'\n');
 console.log(JSON.stringify({setup,rows}));
}finally{p.close();}
