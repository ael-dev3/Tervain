import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {transformWithOxc} from 'vite';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
import {threadCpuTrace,threadCpuInterval} from './thread-cpu-trace.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out??'artifacts/animal-bone-texture';fs.mkdirSync(out,{recursive:true});
const source=fs.readFileSync('src/presentation/animals/boneTexture.ts','utf8');
const code=(await transformWithOxc(source,'boneTexture.ts')).code;
const moduleUrl='data:text/javascript;base64,'+Buffer.from(code).toString('base64');
const uploadUrl='data:text/javascript;base64,'+Buffer.from(fs.readFileSync('tools/webgl-upload-bytes.mjs')).toString('base64');
const page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:12});let trace;
try {
 const setup=await page.eval(`const T=window.tervain,W=T.world,R=T.renderer,gl=R.getContext();T.frame=()=>{};T.present=()=>{};T.perf=null;T.lastFrameDt=0;T.worldLook=null;T.grade.time=0;T.cam.manual=true;R.shadowMap.autoUpdate=true;const C=await import(${JSON.stringify(moduleUrl)}),UP=await import(${JSON.stringify(uploadUrl)});const seen=new Set(),skins=[];W.scene.traverse(o=>{if(!o.isSkinnedMesh||seen.has(o.skeleton))return;let animal=null;for(let p=o;p;p=p.parent)if(p.parent?.name==='Land wildlife')animal=p.name;if(!animal)return;seen.add(o.skeleton);const s=o.skeleton;if(!s.boneTexture)s.computeBoneTexture();const before=s.boneTexture,full=s.boneMatrices,after=before.clone();after.source=new before.source.constructor({...before.image});s.boneTexture=after;C.compactAnimalBoneTexture(s);const short=s.boneMatrices;s.boneTexture=before;s.boneMatrices=full;skins.push({s,before,after,full,short,animal,bone:s.bones.find(b=>/head/i.test(b.name))??s.bones[s.bones.length-1],base:null});});if(!skins.length)throw Error('No wildlife');for(const x of skins)x.base=x.bone.quaternion.clone();
 const P=globalThis.AN={skins,mode:'before',uploads:0,bytes:0,select(mode){this.mode=mode;for(const x of skins){x.s.boneTexture=mode==='before'?x.before:x.after;x.s.boneMatrices=mode==='before'?x.full:x.short;}},pose(i){for(const x of skins){x.bone.quaternion.copy(x.base);x.bone.rotateZ(Math.sin(i*.23)*.18);}W.scene.updateMatrixWorld(true);},place(i,close=false){const c=T.cam.camera;if(close){const m=skins.find(x=>x.animal.startsWith('cat'))??skins[0],p=m.s.bones[0].matrixWorld.elements;c.position.set(p[12]+2,p[13]+1,p[14]+2);c.lookAt(p[12],p[13]+.4,p[14]);}else{const x=-210+i*.4,z=i*.2,h=W.terrain.heightAt(x,z);c.position.set(x,h+2,z);c.lookAt(x+30*Math.sin(.8+i*.02),h+5,z+30*Math.cos(.8+i*.02));}c.updateMatrixWorld(true);},render(label,image=false){this.uploads=0;this.bytes=0;R.info.reset();T.lastFrameDt=0;if(label)console.timeStamp(label+'-start');T.renderWorld();if(label)console.timeStamp(label+'-end');const matrices=skins.map(x=>Array.from(new Uint32Array(x.s.boneMatrices.buffer,x.s.boneMatrices.byteOffset,x.s.bones.length*16)));const cost={uploads:this.uploads,bytes:this.bytes,draws:R.info.render.calls,triangles:R.info.render.triangles,textures:R.info.memory.textures};if(gl.getError()||gl.isContextLost())throw Error('GL error');return{cost,matrices,...(image?{png:R.domElement.toDataURL('image/png')}:{} )};}};
 const f=gl.texSubImage2D;gl.texSubImage2D=function(...a){const d=a.find(v=>ArrayBuffer.isView(v));if(d&&skins.some(x=>x.s.boneTexture?.image.data.buffer===d.buffer)){P.uploads++;P.bytes+=UP.textureUploadBytes('texSubImage2D',a);}return f.apply(this,a);};P.place(0);P.pose(0);P.select('before');P.render();P.render();return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),animals:skins.map(x=>({animal:x.animal,bones:x.s.bones.length,before:[x.before.image.width,x.before.image.height],after:[x.after.image.width,x.after.image.height]})),rasterSuppressed:globalThis.__tervainCpuNoRaster===true,samples:T.grade.target.samples};`);
 assert.ok(setup.animals.every(x=>x.before[0]===x.before[1]),'Use an untrimmed square-texture baseline');
 const report={setup,sourceSha256:createHash('sha256').update(source).digest('hex')};
 if(args.cpu==='true'){
  assert.equal(setup.rasterSuppressed,true,'CPU run must suppress raster from load');
  for(let i=0;i<120;i++){await page.eval(`AN.pose(${args.motion==='settled'?0:i});AN.place(${i%5});for(const m of ['before','after']){AN.select(m);AN.render();}return null;`);}
  trace=await threadCpuTrace(page);await trace.start();const rows=[];
  for(let i=0;i<120;i++){
   await page.eval(`AN.pose(${args.motion==='settled'?0:i});AN.place(${i%5});return null;`);
   for(const mode of i%2?['after','before']:['before','after']){const r=await page.eval(`AN.select('${mode}');return AN.render('animal-${mode}-${i}');`);rows.push({frame:i,mode,...r.cost,matrices:r.matrices});}
  }
  const events=await trace.end();trace.close();trace=null;
  for(const row of rows)Object.assign(row,threadCpuInterval(events,`animal-${row.mode}-${row.frame}`));
  for(let i=0;i<120;i++){const pair=rows.filter(r=>r.frame===i);assert.ok(pair.find(r=>r.mode==='after').bytes<pair.find(r=>r.mode==='before').bytes,'No upload reduction');assert.deepEqual(pair[0].matrices,pair[1].matrices);for(const k of ['draws','triangles','textures'])assert.equal(pair[0][k],pair[1][k]);}
  for(const r of rows)delete r.matrices;
  report.rows=rows;report.summary={};for(const mode of ['before','after']){const r=rows.filter(r=>r.mode===mode),cpu=r.map(x=>x.cpuMs).sort((a,b)=>a-b);report.summary[mode]={averageMs:cpu.reduce((a,b)=>a+b,0)/cpu.length,p95Ms:cpu[Math.ceil(cpu.length*.95)-1],averageUploads:r.reduce((a,b)=>a+b.uploads,0)/r.length,averageBytes:r.reduce((a,b)=>a+b.bytes,0)/r.length,maxDraws:Math.max(...r.map(x=>x.draws)),maxTriangles:Math.max(...r.map(x=>x.triangles))};}
  report.motion=args.motion??'moving';report.scope='120 warm / 120 measured balanced pairs. Native High forest renderer, controlled moving head bones on native wildlife rigs; raster entrypoints suppressed only for CPU measurement. Thread CPU excludes GPU waits and native raster draw-driver CPU. No whole-game or hardware FPS claim.';
 } else {
  assert.equal(setup.rasterSuppressed,false);assert.equal(setup.samples,4);report.poses=[];
  const rgb=async png=>sharp(Buffer.from(png.split(',')[1],'base64')).removeAlpha().raw().toBuffer();
  for(let i=0;i<5;i++){
   await page.eval(`AN.place(${i},true);AN.pose(${i+1});AN.select('before');AN.render();return null;`);
   const before=await page.eval("return AN.render(null,true);");
   await page.eval("AN.select('after');AN.render();return null;");
   const after=await page.eval("return AN.render(null,true);");
   assert.deepEqual(before.matrices,after.matrices);assert.deepEqual(before.cost.draws,after.cost.draws);assert.equal(before.cost.triangles,after.cost.triangles);assert.ok((await rgb(before.png)).equals(await rgb(after.png)),'Pixels changed');
   for(const [mode,r] of [['before',before],['after',after]]){fs.writeFileSync(path.join(out,`pose-${i}-${mode}.png`),Buffer.from(r.png.split(',')[1],'base64'));delete r.png;r.matrixHash=createHash('sha256').update(JSON.stringify(r.matrices)).digest('hex');delete r.matrices;}
   report.poses.push({pose:i,before,after,identicalRgb:true});
  }
  // A changed pose must update the same matrices and upload, not merely look correct when frozen.
  await page.eval("AN.select('after');AN.pose(20);return null;");const changed=await page.eval('return AN.render();');
  assert.ok(changed.cost.uploads>0,'Changed bones did not upload');report.changedPose={...changed.cost,matrixHash:createHash('sha256').update(JSON.stringify(changed.matrices)).digest('hex')};
  assert.notEqual(report.changedPose.matrixHash,report.poses.at(-1).after.matrixHash,'Animation did not change matrices');
 }
 report.consoleErrors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(report.consoleErrors,[]);assert.equal(source,fs.readFileSync('src/presentation/animals/boneTexture.ts','utf8'));report.pass=true;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report.summary??report.poses.map(x=>({pose:x.pose,before:x.before.cost,after:x.after.cost}))));
} finally {trace?.close();page.close();}
