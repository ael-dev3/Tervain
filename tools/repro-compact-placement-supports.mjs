#!/usr/bin/env node
/** Production audit/index, delivered furniture geometry; exact hit/result comparisons, no rendering or FPS claim. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createServer} from 'vite';import * as THREE from 'three';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const ref=args.baseline??'b77cb66f5',out=path.resolve(args.out??'compact-support-proof.json');fs.rmSync(out,{force:true});
const prior={};for(const name of ['placementAudit','verticalSupports'])prior[name]=execFileSync('git',['show',`${ref}:src/diagnostics/${name}.ts`],{encoding:'utf8'});
const ids=Object.fromEntries(Object.keys(prior).map(name=>[name,path.resolve(`src/diagnostics/__compact-${name}.ts`)]));
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true,ws:false,hmr:false},plugins:[{name:'compact-baseline',enforce:'pre',resolveId(id){for(const [name,file]of Object.entries(ids))if(id===`/@prior-${name}`||id===`./__compact-${name}`)return file;},load(id){for(const[name,file]of Object.entries(ids))if(id===file)return prior[name].replace("'./verticalSupports'","'./__compact-verticalSupports'");}}]});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
try{
 const beforeAudit=(await server.ssrLoadModule('/@prior-placementAudit')).auditPlacements,afterAudit=(await server.ssrLoadModule('/src/diagnostics/placementAudit.ts')).auditPlacements;
 const beforeIndex=(await server.ssrLoadModule('/@prior-verticalSupports')).indexVerticalSupport,afterIndex=(await server.ssrLoadModule('/src/diagnostics/verticalSupports.ts')).indexVerticalSupport;
 const report={baseline:ref,sourceSha256:Object.fromEntries(Object.keys(prior).map(n=>[n,createHash('sha256').update(fs.readFileSync(`src/diagnostics/${n}.ts`)).digest('hex')])),scope:'Actual production TypeScript compiled by Vite. Compact support audit plus delivered furniture, exact triangle/face/UV/normal hits. Counts submitted triangle candidates, actual Ray.intersectTriangle calls and index vertex transforms; no live-scene speedup or hardware timing claim.',audit:{},furniture:[]};
 const original=THREE.Mesh.prototype.raycast, intersect=THREE.Ray.prototype.intersectTriangle, apply=THREE.Vector3.prototype.applyMatrix4;let triangles=0, triangleTests=0, transformedVertices=0;
 THREE.Ray.prototype.intersectTriangle=function(...args){triangleTests++;return intersect.apply(this,args);};
 THREE.Vector3.prototype.applyMatrix4=function(m){transformedVertices++;return apply.call(this,m);};
 THREE.Mesh.prototype.raycast=function(ray,hits){triangles+=(this.geometry.index?.count??this.geometry.getAttribute('position').count)/3;return original.call(this,ray,hits);};
 try{
  for(const [mode,audit]of [['before',beforeAudit],['after',afterAudit]]){
   const scene=new THREE.Scene(),mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),support=new THREE.Mesh(new THREE.PlaneGeometry(2,2,128,128).rotateX(-Math.PI/2),mat);support.name='terrain support';support.position.set(8,1,8);scene.add(support);
   const prop=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),mat);prop.name='probe';prop.position.set(8,1.5,8);scene.add(prop);triangles=triangleTests=transformedVertices=0;const r=audit(scene,()=>0);assert(r.complete&&r.summary.props===1&&r.summary.candidates===0);report.audit[mode]={triangleCandidates:triangles,triangleTests,transformedVertices,resultHash:hash(r)};support.geometry.dispose();prop.geometry.dispose();mat.dispose();
  }
  assert.equal(report.audit.before.resultHash,report.audit.after.resultHash);assert(report.audit.before.triangleCandidates>250000&&report.audit.after.triangleCandidates<20000);
  const {createGltfLoader}=await server.ssrLoadModule('/src/presentation/assets/gltfLoader.ts');
  for(const model of ['table','chair','bed']){
   const bytes=fs.readFileSync(`public/models/furniture/${model}.glb`),loader=createGltfLoader();for(const name of ['TERVAIN_CPU_TEXTURES','EXT_texture_webp'])loader.register(()=>({name,loadTexture:()=>Promise.resolve(new THREE.Texture())}));
   const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');let geometry;gltf.scene.traverse(o=>{if(o.isMesh)geometry=o.geometry;});assert(geometry);const mat=new THREE.MeshBasicMaterial({side:THREE.DoubleSide});
   for(const mirror of [false,true]){
    const mesh=new THREE.Mesh(geometry,mat);mesh.position.set(8,1,8);mesh.rotation.y=mirror?-.4:.27;mesh.scale.set(mirror?-1:1.1,.85,.7);mesh.updateMatrixWorld(true);geometry.computeBoundingBox();const box=geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),ray=new THREE.Raycaster();const row={model,modelSha256:createHash('sha256').update(bytes).digest('hex'),mirror,triangles:geometry.index.count/3};
    const probe=()=>{const hits=[];for(let ix=0;ix<=12;ix++)for(let iz=0;iz<=12;iz++)for(const down of [true,false]){ray.set(new THREE.Vector3(box.min.x+(box.max.x-box.min.x)*ix/12,down?box.max.y+1:box.min.y-1,box.min.z+(box.max.z-box.min.z)*iz/12),new THREE.Vector3(0,down?-1:1,0));hits.push(ray.intersectObject(mesh).map(h=>({distance:h.distance,face:h.faceIndex,point:h.point.toArray(),uv:h.uv?.toArray(),normal:h.normal?.toArray()})));}return hits;};
    let baseline;for(const[mode,index]of [['before',beforeIndex],['after',afterIndex]]){triangles=triangleTests=transformedVertices=0;const release=index(mesh),indexVertexTransforms=transformedVertices;let hits;try{hits=probe();}finally{release();}row[mode]={triangleCandidates:triangles,triangleTests,indexVertexTransforms,hits:hits.reduce((n,h)=>n+h.length,0),resultHash:hash(hits)};if(mode==='before')baseline=hits;else assert.deepEqual(hits,baseline);}
    assert(row.before.hits>0);assert(row.after.triangleCandidates<row.before.triangleCandidates);report.furniture.push(row);
   }
   geometry.dispose();mat.dispose();
  }
 }finally{THREE.Mesh.prototype.raycast=original;THREE.Ray.prototype.intersectTriangle=intersect;THREE.Vector3.prototype.applyMatrix4=apply;}
 report.pass=true;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await server.close();}
