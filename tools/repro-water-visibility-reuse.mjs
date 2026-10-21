/** Native live-world A/B of only the candidate water orchestration methods. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'vite';
import sharp from 'sharp';
import { liveProofPage } from './live-proof-page.mjs';
const args = Object.fromEntries(process.argv.slice(2).flatMap((v,i,a) => v.startsWith('--') ? [[v.slice(2),a[i+1]]] : []));
const out = args.out ?? 'water-visibility-proof';
const file = 'src/presentation/waterRenderPass.ts', source = fs.readFileSync(file);
fs.mkdirSync(out,{recursive:true}); fs.rmSync(path.join(out,'report.json'),{force:true});
const server = await createServer({configFile:false,logLevel:'error',server:{host:'127.0.0.1',port:0,cors:true,hmr:false,ws:false},optimizeDeps:{include:['three'],noDiscovery:true}});
let page;
try {
 await server.listen();
 const origin = 'http://127.0.0.1:'+server.httpServer.address().port;
 page = await liveProofPage(args.url ?? 'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:15});
 const report = await page.eval(`
 const T=tervain,W=T.world,P=T.grade.waterPass,C=await import(${JSON.stringify(origin)}+'/src/presentation/waterRenderPass.ts'),cam=T.cam.camera,R=T.renderer;
 T.frame=()=>{};T.present=()=>{};T.lastFrameDt=0;T.worldLook=null;T.grade.time=0;
 const original={render:P.render,capture:P.captureReflection,visible:P.waterInView,box:P.visibilityBox.applyMatrix4},counts={queries:0,sea:0,boxes:0};
 P.waterInView=function(mesh,camera){counts.queries++;if(mesh.name==='sea')counts.sea++;return original.visible.call(this,mesh,camera);};
 P.visibilityBox.applyMatrix4=function(m){counts.boxes++;return original.box.call(this,m);};
 const poses=[
 [97.9290386345,12.3989606864,122.7305845127,89.9026499045,27.5806305890,87.6012494816],
 [97.9290386345,12.3989606864,122.7305845127,82,26,91],
 [97.9290386345,12.3989606864,122.7305845127,99,24,85],
 [-206.956,3.01,11.92,-200,2.45,11.3846],
 [-310,8,-40,-300,0,-40],[-335,8,-90,-325,0,-90],[-2,4.9,45.4,-2,2,39.5]
 ], rows=[],images={};
 try {
  for(const [index,pose]of poses.entries()){
   cam.position.set(...pose.slice(0,3));cam.lookAt(...pose.slice(3));cam.updateMatrixWorld(true);
   T.player.setPosition(pose[0],pose[2],0,W.terrain);
   for(let i=0;i<30;i++){W.prepareGrass(R,0);W.update(0,T.game.state,T.player.group.position,T.settings,15,cam,false);}
   W.sky.cloudTime=0;W.foliage.strength.value=0;W.foliage.wind.uniforms.uGrassTime.value=0;W.sway.uTime.value=0;
   P.render=original.render;P.captureReflection=original.capture;R.shadowMap.autoUpdate=true;T.renderWorld();R.shadowMap.autoUpdate=false;
   const row={pose,modes:{}};
   for(const mode of ['before','after','restored']){
    P.render=mode==='after'?C.WaterRenderPass.prototype.render:original.render;
    P.captureReflection=mode==='after'?C.WaterRenderPass.prototype.captureReflection:original.capture;
    P.reflectionValid=false;T.renderWorld(); // Warm the identical reflection/material path.
    P.reflectionValid=false;R.info.reset();counts.queries=counts.sea=counts.boxes=0;T.renderWorld();
    row.modes[mode]={...counts,draws:R.info.render.calls,triangles:R.info.render.triangles,glError:R.getContext().getError()};
    images[index+'-'+mode]=R.domElement.toDataURL('image/png');
   }
   rows.push(row);
  }
  return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),rows,images};
 }finally{P.render=original.render;P.captureReflection=original.capture;P.waterInView=original.visible;P.visibilityBox.applyMatrix4=original.box;R.shadowMap.autoUpdate=true;}
 `);
 for(const[k,v]of Object.entries(report.images))fs.writeFileSync(path.join(out,k+'.png'),Buffer.from(v.split(',')[1],'base64'));
 delete report.images;
 for(const[index,row]of report.rows.entries()){
  const rgb=async m=>sharp(path.join(out,index+'-'+m+'.png')).removeAlpha().raw().toBuffer();
  const [a,b,c]=await Promise.all(['before','after','restored'].map(rgb));
  const diff=(x,y)=>{let n=0;for(let i=0;i<x.length;i+=3)if(x[i]!==y[i]||x[i+1]!==y[i+1]||x[i+2]!==y[i+2])n++;return n;};
  row.pixels={beforeAfter:diff(a,b),restored:diff(a,c)};
  assert.equal(row.pixels.beforeAfter,0);assert.equal(row.pixels.restored,0);
  assert.equal(row.modes.after.draws,row.modes.before.draws);assert.equal(row.modes.after.triangles,row.modes.before.triangles);
  assert.ok(row.modes.after.boxes<=row.modes.before.boxes);
  for(const m of Object.values(row.modes))assert.equal(m.glError,0);
 }
 assert.ok(report.rows.some(r=>r.modes.after.boxes<r.modes.before.boxes),'Live duplicate scan must reproduce');
 report.consoleErrors=page.console().filter(x=>x.startsWith('[error]')||x.startsWith('[exception]'));assert.deepEqual(report.consoleErrors,[]);
 report.endBuild=await page.eval(`return fetch(new URL('version.json',document.baseURI)).then(r=>r.json())`);assert.equal(report.endBuild.revision,report.build.revision);
 assert.ok(source.equals(fs.readFileSync(file)));report.sourceSha256=createHash('sha256').update(source).digest('hex');
 report.scope='Published native High world, post/MSAA, seven poses. Candidate render/captureReflection methods substituted into the existing native pass; no geometry/shader/settings changes between paired images. Wind, simulation, shadow map and time held fixed. Native draw calls enabled throughout. Query/box counts measure CPU work only, not milliseconds, Mac pacing or heat.';
 report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await page?.close();await server.close();}
