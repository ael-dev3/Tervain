#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as THREE from 'three';
import {createServer} from 'vite';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const server=await createServer({root,configFile:false,appType:'custom',logLevel:'error',server:{middlewareMode:true,watch:null,hmr:false,ws:false},optimizeDeps:{noDiscovery:true,include:[]}});
let api;try{api=await server.ssrLoadModule('/src/presentation/npc/dualQuaternionSkinning.ts');}finally{await server.close();}
function fixture(){const mesh=new THREE.SkinnedMesh(new THREE.BufferGeometry(),new THREE.MeshBasicMaterial()),bones=Array.from({length:66},()=>new THREE.Bone());for(const b of bones.slice(1))bones[0].add(b);mesh.add(bones[0]);mesh.bind(new THREE.Skeleton(bones));const skin=api.installDualQuaternionSkinning(mesh);return{mesh,bones,skin};}
const before=fixture(),after=fixture(),decompose=THREE.Matrix4.prototype.decompose;let active=null,comparedWords=0,equal=true;
const counts={before:0,after:0};THREE.Matrix4.prototype.decompose=function(...args){if(active)counts[active]++;return decompose.apply(this,args);};
try{for(let frame=0;frame<120;frame++){
 for(const f of [before,after]){f.bones[1].rotation.set(frame*.013,frame*.027,-frame*.017);f.mesh.updateMatrixWorld(true);f.mesh.bindMatrix.makeTranslation(frame*.001,0,0);f.mesh.bindMatrixInverse.copy(f.mesh.bindMatrix).invert();}
 active='before';for(let pass=0;pass<2;pass++)before.mesh.skeleton.update();
 active='after';const nested=api.beginStaticSkinFrame();try{for(let pass=0;pass<2;pass++)after.mesh.skeleton.update();}finally{api.endStaticSkinFrame(nested);}
 const a=before.mesh.skeleton.boneMatrices,b=after.mesh.skeleton.boneMatrices,aw=new Uint32Array(a.buffer,a.byteOffset,a.length),bw=new Uint32Array(b.buffer,b.byteOffset,b.length);for(let i=0;i<aw.length;i++){comparedWords++;equal&&=aw[i]===bw[i];}
}}finally{THREE.Matrix4.prototype.decompose=decompose;for(const f of [before,after]){f.skin.dispose();f.mesh.skeleton.dispose();f.mesh.geometry.dispose();f.mesh.material.dispose();}}
const report={schema:1,frames:120,bones:66,passesPerFrame:2,decompositions:counts,comparedWords,packedWordsEqual:equal,pass:equal&&comparedWords===192000&&counts.before===15840&&counts.after===7920,scope:'Actual production packer. Unscoped reference versus scoped updates, with changing bone rotations and bind matrices every frame. Counts are code operations, not hardware frame times.'};
const index=process.argv.indexOf('--out');if(index>=0)fs.writeFileSync(process.argv[index+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
