#!/usr/bin/env node
/** Production audit, compiled by Vite, with distant large supports; no hardware timing claim. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import * as THREE from 'three';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const ref=args.baseline??'421d34b',output=path.resolve(args.out??'placement-support-proof.json');fs.rmSync(output,{force:true});
const id=path.resolve('src/diagnostics/__baseline-placement.ts'),source=execFileSync('git',['show',`${ref}:src/diagnostics/placementAudit.ts`],{encoding:'utf8'});
const server=await createServer({configFile:false,logLevel:'error',server:{ws:false,hmr:false},plugins:[{name:'baseline-placement',enforce:'pre',resolveId(name){if(name==='/src/diagnostics/__baseline-placement.ts')return id;},load(name){if(name===id)return source;}}]});
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
try {
 const report={baseline:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/diagnostics/placementAudit.ts')).digest('hex'),scope:'Actual production audit compiled through Vite; transformed-vertex counts are deterministic work counts, not live frame times.',before:[],after:[]};
 for(const mode of ['before','after']) {
  const {auditPlacements}=await server.ssrLoadModule(mode==='before'?'/src/diagnostics/__baseline-placement.ts':'/src/diagnostics/placementAudit.ts');
  for(const x of [-.25,64,512]){
   const scene=new THREE.Scene(),geometry=new THREE.PlaneGeometry(128,128,32,32).rotateX(-Math.PI/2),material=new THREE.MeshBasicMaterial();
   for(let i=0;i<100;i++){const m=new THREE.Mesh(geometry,material);m.name='terrain support';m.position.set(i*512,1,0);scene.add(m);}
   const prop=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),material);prop.name='probe';prop.position.set(x,1.5,0);scene.add(prop);
   const original=THREE.Vector3.prototype.applyMatrix4;let transformedVertices=0;
   THREE.Vector3.prototype.applyMatrix4=function(m){transformedVertices++;return original.call(this,m);};
   let r;try{r=auditPlacements(scene,()=>0);}finally{THREE.Vector3.prototype.applyMatrix4=original;}
   assert(r.complete);assert.equal(r.summary.props,1);assert.equal(r.summary.candidates,0);
   assert(mode==='before'?transformedVertices>600000:transformedVertices<20000);
   report[mode].push({x,transformedVertices,resultHash:hash(r),summary:r.summary});
   geometry.dispose();prop.geometry.dispose();material.dispose();
  }
 }
 for(let i=0;i<report.before.length;i++)assert.equal(report.before[i].resultHash,report.after[i].resultHash);
 report.pass=true;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await server.close();}
