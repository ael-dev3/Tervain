import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {liveProofPage} from './live-proof-page.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const out=args.out;assert.ok(out&&args.url,'Supply --url and --out');
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const page=await liveProofPage(args.url,{quality:'high',hour:12});
try {
 await page.eval(`const T=window.tervain;T.frame=()=>{};T.present=()=>{};T.perf=null;T.lastFrameDt=0;T.cam.manual=true;T.grade.time=0;T.worldLook=null;T.renderer.shadowMap.autoUpdate=true;globalThis.__restoreOrchardRaster?.();return null;`);
 const meta=await page.eval(`const T=window.tervain;return {build:await fetch(new URL('version.json',document.baseURI)).then(r=>r.json()),printed:document.querySelector('.menu-build span')?.textContent,samples:T.grade.target.samples,rasterSuppressed:globalThis.__tervainCpuNoRaster===true};`);
 assert.equal(meta.rasterSuppressed,false);assert.equal(meta.samples,4);assert.ok(meta.printed.includes(meta.build.revision));
 const poses=Array.from({length:5},(_,i)=>[-210+Math.sin(.8)*i*2.6/60,Math.cos(.8)*i*2.6/60,.8+i*.003,-Math.atan(.1)]).concat([[-210,0,3,0]]),rows=[];
 for(let i=0;i<poses.length;i++) {
  const pairLists=await page.eval(`const T=window.tervain,W=T.world,c=T.cam.camera,[x,z,yaw,pitch]=${JSON.stringify(poses[i])},h=W.terrain.heightAt(x,z);c.position.set(x,h+2,z);c.lookAt(x+30*Math.sin(yaw),h+2-30*Math.tan(pitch),z+30*Math.cos(yaw));c.updateMatrixWorld(true);let pairs=0;const it=Array.prototype[Symbol.iterator];Array.prototype[Symbol.iterator]=function(){if(this.length===2&&this.some(Boolean)&&this.every(m=>m===null||m?.isInstancedMesh||m?.coverage?.isInstancedBufferAttribute))pairs++;return it.call(this);};try{W.update(0,T.game.state,T.player.group.position,T.settings,12,c,false);}finally{Array.prototype[Symbol.iterator]=it;}W.foliage.wind.uniforms.uGrassTime.value=${i*1.3};W.sway.uTime.value=${i*1.3};W.foliage.strength.value=1;return pairs;`);
  await page.eval('window.tervain.renderWorld();window.tervain.renderWorld();return null;');
  const renders=[];
  for(let j=0;j<2;j++)renders.push(await page.eval(`const T=window.tervain,R=T.renderer;R.info.reset();T.lastFrameDt=0;T.renderWorld();const gl=R.getContext();if(gl.getError()||gl.isContextLost())throw Error('Invalid GL');return {png:R.domElement.toDataURL('image/png'),draws:R.info.render.calls,triangles:R.info.render.triangles,textures:R.info.memory.textures};`));
  const pixels=await Promise.all(renders.map(async r=>sharp(Buffer.from(r.png.split(',')[1],'base64')).removeAlpha().raw().toBuffer()));
  assert.ok(pixels[0].equals(pixels[1]),'Repeated native RGB differs');assert.ok(renders[0].draws>0);assert.equal(renders[0].draws,renders[1].draws);assert.equal(renders[0].triangles,renders[1].triangles);
  if(args.expected!==undefined)assert.equal(pairLists,Number(args.expected),'Unexpected temporary pair-list count');
  fs.writeFileSync(path.join(out,`pose-${i}.png`),Buffer.from(renders[0].png.split(',')[1],'base64'));
  const {png,...cost}=renders[0];rows.push({pose:poses[i],time:i*1.3,pairLists,cost,repeatRgbExact:true,rgbSha256:createHash('sha256').update(pixels[0]).digest('hex')});console.log(JSON.stringify(rows.at(-1)));
 }
 const errors=page.console().filter(s=>s.startsWith('[error]')||s.startsWith('[exception]'));assert.deepEqual(errors,[]);
 assert.deepEqual(await page.eval("return fetch(new URL('version.json',document.baseURI)).then(r=>r.json());"),meta.build);
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({meta,rows,errors,pass:true,scope:'Native High post/MSAA4, frozen simulation/time, six forest camera poses; pair-list iterations observed only during each World.update, not a total heap-allocation profile. No render or bounds overrides.'},null,2)+'\n');
} finally {page.close();}
