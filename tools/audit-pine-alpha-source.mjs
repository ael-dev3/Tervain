#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),models=[];
for(const name of ['solitary-pine-under-10k','solitary-pine-mid','solitary-pine-far']){
 const file=`public/models/flora/${name}.glb`,bytes=fs.readFileSync(path.join(root,file));
 if(bytes.readUInt32LE(0)!==0x46546c67||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length)throw new Error('Invalid source GLB');
 const length=bytes.readUInt32LE(12),json=JSON.parse(bytes.subarray(20,20+length)),binary=20+length+8;
 if(bytes.readUInt32LE(binary-4)!==0x004e4942)throw new Error('Missing binary chunk');
 const masks=[];
 for(const[materialIndex,material]of json.materials.entries()){
  if(material.alphaMode!=='MASK')continue;
  const cutoff=material.alphaCutoff??.5,opacity=material.pbrMetallicRoughness?.baseColorFactor?.[3]??1,texture=json.textures[material.pbrMetallicRoughness.baseColorTexture.index],image=json.images[texture.extensions?.EXT_texture_webp?.source??texture.source],view=json.bufferViews[image.bufferView];
  if(view.buffer!==0||!Number.isInteger(view.byteLength))throw new Error('Unsupported embedded alpha source');
  const start=binary+(view.byteOffset??0),decoded=await sharp(bytes.subarray(start,start+view.byteLength)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const {width,height,channels}=decoded.info;if(channels!==4||width*height>16777216)throw new Error('Unsupported alpha image size');
  let kept=0,discarded=0;for(let i=3;i<decoded.data.length;i+=4){if(decoded.data[i]/255*opacity<cutoff)discarded++;else kept++;}
  const sampler=json.samplers?.[texture.sampler];
  masks.push({materialIndex,mimeType:image.mimeType,cutoff,opacity,width,height,keptTexels:kept,discardedTexels:discarded,discardedShare:discarded/(width*height),magFilter:sampler?.magFilter??9729,minFilter:sampler?.minFilter??9987});
 }
 const primitives=json.meshes.flatMap(mesh=>mesh.primitives),opaquePrimitives=primitives.filter(p=>(json.materials[p.material]?.alphaMode??'OPAQUE')==='OPAQUE').length;
 models.push({file,primitives:primitives.length,opaquePrimitives,masks});
}
const report={schema:1,models,pass:models.every(m=>m.masks.length>0&&m.masks.every(mask=>mask.discardedTexels>0))&&models[2].opaquePrimitives===0,scope:'Embedded base-color alpha inventory, not UV occupancy, visible island connectivity or a whole-tree audit. Runtime filtering, alpha-to-coverage and mip selection are not reproduced.'};
const index=process.argv.indexOf('--out');if(index>=0)fs.writeFileSync(process.argv[index+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
