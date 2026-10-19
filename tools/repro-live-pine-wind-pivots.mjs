/** Compare the delivered pine pivots with native scaled vertices; replay the loader correction on the live scene. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[])),out=args.out??'artifacts/pine-wind-pivots';fs.mkdirSync(out,{recursive:true});
const fixtures=['near','mid','far'].map(lod=>{
 const bytes=fs.readFileSync(`public/models/flora/hero/hero-pine-${lod}.glb`),n=bytes.readUInt32LE(12),j=JSON.parse(bytes.subarray(20,20+n)),bin=bytes.subarray(28+n);
 function attr(a){const ac=j.accessors[a],v=j.bufferViews[ac.bufferView];assert.equal(ac.componentType,5126);assert.equal(ac.type,'VEC3');assert.ok(!v.byteStride);return Array.from({length:ac.count*3},(_,i)=>bin.readFloatLE((v.byteOffset??0)+(ac.byteOffset??0)+i*4));}
 return Array.from({length:4},(_,v)=>Object.fromEntries(['wood','leaf'].map(part=>{const p=j.meshes.find(m=>m.name===`v${v}-${part}`).primitives[0];return[part,{position:attr(p.attributes.POSITION),pivot:attr(p.attributes._PIVOT)}];})));
});
let page;
try{
 page=await liveProofPage(args.url??'https://ael-dev3.github.io/Tervain/',{quality:'high',hour:12});
 const meta=await page.eval(`const T=window.tervain,W=T.world,F=W.modules.find(m=>m.name==='forest').module,fixtures=${JSON.stringify(fixtures)};T.frame=()=>{};T.present=()=>{};T.perf=null;T.lastFrameDt=0;T.cam.manual=true;T.grade.time=0;T.worldLook=null;
 if(globalThis.__restoreOrchardRaster)globalThis.__restoreOrchardRaster();
 const targets=[0,1,2].map(l=>F.canopyAuditTargets(l).filter(t=>t.species==='pine')),seen=new Set(),bindings=[],rows=[];
 for(let lod=0;lod<3;lod++)for(const t of targets[lod])for(const part of ['wood','leaf']){const g=part==='wood'?t.wood:t.leaves;if(!g||seen.has(g))continue;seen.add(g);const p=g.getAttribute('position'),pv=g.getAttribute('_pivot');if(!pv)throw Error('Missing native pivots');let chosen;
 for(let v=0;v<4;v++){const raw=fixtures[lod][v][part],rawWood=fixtures[lod][v].wood.position,wp=t.wood.getAttribute('position');if(raw.position.length>p.count*3||rawWood.length!==wp.count*3)continue;let scale;for(let i=0;i<rawWood.length;i++)if(Math.abs(rawWood[i])>.5){scale=wp.array[i]/rawWood[i];break;}let error=0;for(let i=0;i<rawWood.length;i++)error=Math.max(error,Math.abs(wp.array[i]-rawWood[i]*scale));if(error<.0001){chosen={v,raw,scale,error};break;}}
 if(!chosen)throw Error('Native pine does not match a delivered variant '+JSON.stringify({lod,part,count:p.count,rawCounts:fixtures[lod].map(v=>v[part].position.length/3),position:Array.from(p.array).slice(0,12)}));const {v,raw,scale,error}=chosen,before=pv.array.slice(),after=before.slice();let originalError=0,maxAnchorError=0;
 for(let i=0;i<before.length;i++){if(i<raw.pivot.length)originalError=Math.max(originalError,Math.abs(before[i]-raw.pivot[i]));after[i]=before[i]*scale;}
 for(let i=0;i<pv.count;i++)maxAnchorError=Math.max(maxAnchorError,Math.hypot(before[i*3]-after[i*3],before[i*3+1]-after[i*3+1],before[i*3+2]-after[i*3+2]));
 if(originalError>.00001)throw Error('Published pivots already transformed or source differs');bindings.push({pv,before,after});rows.push({lod,part,variant:v,scale,woodScaleError:error,unscaledPivotError:originalError,maxAnchorError,vertices:pv.count});}
 const target=targets[0].slice().sort((a,b)=>Math.hypot(a.matrix.elements[12]+210,a.matrix.elements[14])-Math.hypot(b.matrix.elements[12]+210,b.matrix.elements[14]))[0];if(!target)throw Error('No native pine');const e=target.matrix.elements;
 globalThis.PW={T,W,F,bindings,target,select(mode){for(const b of bindings){b.pv.array.set(mode==='after'?b.after:b.before);b.pv.needsUpdate=true;}},place(distance,time,strength){const c=T.cam.camera;c.position.set(e[12]+distance*.8,e[13]+8,e[14]+distance*.6);c.lookAt(e[12],e[13]+13,e[14]);c.updateMatrixWorld(true);W.update(0,T.game.state,T.player.group.position,T.settings,12,c,false);W.foliage.wind.uniforms.uGrassTime.value=time;W.sway.uTime.value=time;W.foliage.strength.value=strength;},render(){T.lastFrameDt=0;T.renderer.info.reset();T.renderWorld();const gl=T.renderer.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid GL');return{png:T.renderer.domElement.toDataURL('image/png'),draws:T.renderer.info.render.calls,triangles:T.renderer.info.render.triangles};}};
 return{build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),printed:document.querySelector('.menu-build span')?.textContent,label:target.label,position:[e[12],e[13],e[14]],rows,samples:T.grade.target.samples,rasterSuppressed:globalThis.__tervainCpuNoRaster===true};`);
 assert.equal(meta.samples,4);assert.equal(meta.rasterSuppressed,false);assert.ok(meta.rows.length>=18);assert.ok(meta.printed.includes(meta.build.revision));
 console.log(JSON.stringify({meta}));const rows=[];
 for(const[distance,time,strength]of [[20,0,1],[20,1,1],[20,2,1],[42,1,1],[20,1,0]]){
  await page.eval(`PW.place(${distance},${time},${strength});PW.select('before');PW.render();PW.select('after');PW.render();return null;`);const r={};
  for(const mode of ['before','after','restore'])r[mode]=await page.eval(`PW.select('${mode==='restore'?'before':mode}');return PW.render();`);
  const pixels={};for(const mode of ['before','after','restore']){const bytes=Buffer.from(r[mode].png.split(',')[1],'base64');fs.writeFileSync(path.join(out,`pose-${rows.length}-${mode}.png`),bytes);pixels[mode]=await sharp(bytes).removeAlpha().raw().toBuffer();delete r[mode].png;}
  assert.ok(pixels.before.equals(pixels.restore),'Restoration unstable');assert.deepEqual(r.before,r.after);let changedPixels=0;for(let i=0;i<pixels.before.length;i+=3)if(pixels.before[i]!==pixels.after[i]||pixels.before[i+1]!==pixels.after[i+1]||pixels.before[i+2]!==pixels.after[i+2])changedPixels++;
  if(strength===0)assert.equal(changedPixels,0,'Still foliage must be identical');rows.push({distance,time,strength,...r,changedPixels,restored:true});console.log(JSON.stringify(rows.at(-1)));
 }
 assert.ok(rows.some(r=>r.strength===1&&r.changedPixels>0),'No visible wind correction');const errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(errors,[]);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({meta,rows,errors,pass:true,scope:'Published native High MSAA4 post path. Only authored hero-pine pivot buffers are multiplied by the exact vertex scale, matching the loader correction; rest geometry, wind weights/phases, materials, draw packing and shaders stay unchanged. Frozen wind poses and a wind-disabled pixel control; software rendering, not a hardware pacing claim.'},null,2)+'\n');
}finally{if(page){try{await page.eval("PW.select('before');return null;");}catch{}page.close();}}
