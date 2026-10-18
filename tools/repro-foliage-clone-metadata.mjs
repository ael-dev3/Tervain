#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import * as THREE from 'three';
const args=Object.fromEntries(process.argv.slice(2).flatMap((v,i,a)=>v.startsWith('--')?[[v.slice(2),a[i+1]]]:[]));
const ref=args.baseline??'447320109',out=args.out??'foliage-clone-proof',file='src/presentation/foliage/foliageMaterial.ts';
fs.mkdirSync(out,{recursive:true});fs.rmSync(path.join(out,'report.json'),{force:true});
const sources={before:execFileSync('git',['show',`${ref}:${file}`],{encoding:'utf8'}),after:fs.readFileSync(file,'utf8')};
const hash=b=>createHash('sha256').update(b).digest('hex');
const server=await createServer({configFile:false,logLevel:'error',server:{hmr:false,ws:false},plugins:[{
 name:'foliage-clone-baseline',resolveId(id){if(id==='/@clone-baseline')return '/src/presentation/foliage/__clone_baseline.ts';},
 load(id){if(id==='/src/presentation/foliage/__clone_baseline.ts')return sources.before.replaceAll("from './", "from '/src/presentation/foliage/");}
}]});
try{
 const modules={before:await server.ssrLoadModule('/@clone-baseline'),after:await server.ssrLoadModule('/'+file)};
 const {createFoliageField,FOLIAGE_RESPONSE}=await server.ssrLoadModule('/src/presentation/foliage/foliageWind.ts');
 const {GrassWind}=await server.ssrLoadModule('/src/presentation/grass/wind.ts');
 const {REALM_WIND}=await server.ssrLoadModule('/src/presentation/realmWind.ts');
 const {splitLeafPrepass}=await server.ssrLoadModule('/src/presentation/foliage/leafPrepass.ts');
 const rows={},programs={};
 for(const mode of ['before','after']){
  const field=createFoliageField(new GrassWind(REALM_WIND)),materials=[],data=new Set(),clones=[];
  let arrays=0,elements=0,jsonBytes=0,accessible=0,sharedDepth=0,clonedDiagnostics=0;
  try{
   for(let profile=0;profile<60;profile++)for(const leaf of [false,true]){
    const m=new THREE.MeshStandardMaterial({alphaTest:leaf ? .35 : 0});m.userData.label=`profile-${profile}`;
    const installed=modules[mode].installFoliage(m,{field,response:FOLIAGE_RESPONSE.conifer,leaf});materials.push(m);data.add(installed.uniforms.uFoliageClumpNoise.value.image.data);
    assert.equal(m.userData.tvFoliage,installed.uniforms);accessible++;
    const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
    m.onBeforeCompile(shader,{});programs[mode]??={};programs[mode][leaf?'leaf':'wood']={vertex:hash(shader.vertexShader),fragment:hash(shader.fragmentShader),key:hash(m.customProgramCacheKey())};
   }
   const from=Array.from;
   Array.from=function(input,...rest){if(data.has(input)){arrays++;elements+=input.length;}return from.call(this,input,...rest);};
   try{
    for(const m of materials){
     const c=m.clone();clones.push(c);jsonBytes+=Buffer.byteLength(JSON.stringify(c.userData));if(c.userData.tvFoliage)clonedDiagnostics++;
     assert.equal(c.map,m.map);assert.equal(c.alphaTest,m.alphaTest);assert.equal(c.color.getHex(),m.color.getHex());assert.equal(c.depthFunc,m.depthFunc);
     if(m.alphaTest>0){
      const mesh=new THREE.InstancedMesh(new THREE.BufferGeometry(),m,0),depth=splitLeafPrepass(mesh);assert.ok(depth);
      clones.push(depth.material);jsonBytes+=Buffer.byteLength(JSON.stringify(depth.material.userData));if(depth.material.userData.tvFoliage)clonedDiagnostics++;
      const shader={uniforms:{},vertexShader:THREE.ShaderLib.standard.vertexShader,fragmentShader:THREE.ShaderLib.standard.fragmentShader};
      depth.material.onBeforeCompile(shader,{});assert.equal(shader.uniforms.uCrownCentre,m.userData.tvFoliage.uCrownCentre);assert.equal(shader.uniforms.uFoliageClumpNoise,m.userData.tvFoliage.uFoliageClumpNoise);sharedDepth++;
      mesh.geometry.dispose();
     }
    }
   }finally{Array.from=from;}
   rows[mode]={sourceMaterials:materials.length,clones:clones.length,noiseArrays:arrays,noiseElements:elements,serializedBytes:jsonBytes,liveDiagnosticReferences:accessible,sharedDepthPrograms:sharedDepth,clonedDiagnostics};
  }finally{for(const m of [...materials,...clones])m.dispose();field.wind.dispose();}
 }
 assert.deepEqual(programs.before,programs.after,'Shader text/cache keys changed');
 assert.equal(rows.before.noiseArrays,180);assert.equal(rows.after.noiseArrays,0);assert.equal(rows.before.noiseElements,180*64**3);assert.equal(rows.after.noiseElements,0);
 assert.equal(rows.after.liveDiagnosticReferences,120);assert.equal(rows.after.sharedDepthPrograms,60);
 assert.equal(rows.before.clonedDiagnostics,180);assert.equal(rows.after.clonedDiagnostics,0);
 assert.equal(fs.readFileSync(file,'utf8'),sources.after,'Source changed during proof');
 const report={schema:1,baseline:ref,sourceSha256:Object.fromEntries(Object.entries(sources).map(([k,s])=>[k,hash(s)])),rows,programs,pass:true,
 scope:'Actual production material installation, Material.clone and splitLeafPrepass on 60 controlled wood/leaf profiles. Counts exact Array.from calls/elements for the shared 64-cubed noise image, not heap bytes or measured GC time. TextureSource.toJSON allocates the image array then Texture.toJSON retains only its UUID. Shader text/cache keys identical, live depth uniforms shared; native scene proof is separate.'};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await server.close();}
