#!/usr/bin/env node
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';
import sharp from 'sharp';
const ref=process.argv[2]??'5da2776';
function parse(b){assert.equal(b.readUInt32LE(8),b.length);const n=b.readUInt32LE(12);return {j:JSON.parse(b.subarray(20,20+n).toString()),bin:b.subarray(28+n)};}
const rows=[];
for(const file of ['boar-1005232450.glb','deer-1005232424.glb','tiger-1005232739.glb','wolf-1005232644.glb']){
 const name=`public/models/animals/${file}`,before=execFileSync('git',['show',`${ref}:${name}`],{maxBuffer:32*1024*1024}),after=fs.readFileSync(name),a=parse(before),b=parse(after);
 const structural=j=>Object.fromEntries(Object.entries(j).filter(([k])=>!['buffers','bufferViews','images'].includes(k)));
 assert.deepEqual(structural(a.j),structural(b.j));
 const imageViews=new Set(a.j.images.map(i=>i.bufferView));let preserved=0;
 assert.equal(a.j.bufferViews.length,b.j.bufferViews.length);
 for(let i=0;i<a.j.bufferViews.length;i++){
  if(imageViews.has(i))continue;
  const x=a.j.bufferViews[i],y=b.j.bufferViews[i];
  const strip=v=>{const copy=structuredClone(v);delete copy.byteOffset;if(copy.extensions?.EXT_meshopt_compression)delete copy.extensions.EXT_meshopt_compression.byteOffset;return copy;};
  assert.deepEqual(strip(x),strip(y));
  const xx=x.extensions?.EXT_meshopt_compression??x,yy=y.extensions?.EXT_meshopt_compression??y;
  if((xx.buffer??0)===0){assert.deepEqual(a.bin.subarray(xx.byteOffset??0,(xx.byteOffset??0)+xx.byteLength),b.bin.subarray(yy.byteOffset??0,(yy.byteOffset??0)+yy.byteLength));preserved++;}
 }
 const image=(g,i)=>{const v=g.j.bufferViews[g.j.images[i].bufferView];return g.bin.subarray(v.byteOffset??0,(v.byteOffset??0)+v.byteLength);};
 let changed=0;
 for(let i=0;i<a.j.images.length;i++){
  const old=image(a,i),now=image(b,i);if(old.equals(now))continue;changed++;
  assert(a.j.materials.some(m=>a.j.textures[m.normalTexture?.index]?.source===i));
  const raw=await sharp(old).ensureAlpha().raw().toBuffer({resolveWithObject:true}),small=await sharp(now).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  assert.equal(small.info.width,1);assert.equal(small.info.height,1);
  for(let offset=0;offset<raw.data.length;offset+=4)assert.deepEqual(raw.data.subarray(offset,offset+4),small.data);
 }
 assert.equal(changed,1);rows.push({file,beforeBytes:before.length,afterBytes:after.length,preservedGeometryAndAnimationViews:preserved,changedConstantNormalImages:changed});
}
console.log(JSON.stringify({pass:true,baseline:ref,rows},null,2));
