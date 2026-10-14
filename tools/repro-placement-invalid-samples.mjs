#!/usr/bin/env node
/** Execute the production audit through Vite's TypeScript pipeline; no renderer or timing claim. */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import * as THREE from 'three';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[]));
const ref=args.baseline??'421d34b',output=path.resolve(args.out??'placement-invalid-proof.json');
fs.rmSync(output,{force:true});
const id=path.resolve('src/diagnostics/__baseline-placement.ts'),source=execFileSync('git',['show',`${ref}:src/diagnostics/placementAudit.ts`],{encoding:'utf8'});
const server=await createServer({configFile:false,logLevel:'error',server:{ws:false,hmr:false},plugins:[{name:'baseline-placement',enforce:'pre',resolveId(name){if(name==='/src/diagnostics/__baseline-placement.ts')return id;},load(name){if(name===id)return source;}}]});
try {
 const report={baseline:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/diagnostics/placementAudit.ts')).digest('hex'),scope:'Actual production audit compiled through Vite; synthetic partially unavailable terrain footprint, not a claim of a floating live prop.',before:[],after:[]};
 for(const mode of ['before','after']){
  const {auditPlacements}=await server.ssrLoadModule(mode==='before'?'/src/diagnostics/__baseline-placement.ts':'/src/diagnostics/placementAudit.ts');
  for(const kind of ['prop','root'])for(const terrain of ['valid','partial-nan','partial-positive-infinity','partial-negative-infinity','all-nan']){
   const scene=new THREE.Scene(),geometry=kind==='prop'?new THREE.BoxGeometry(1,1,1).translate(0,.5,0):new THREE.CylinderGeometry(1,1,2,32).translate(0,1,0);
   const targets=[{label:'fixture',kind,geometry,matrix:new THREE.Matrix4()}];
   const unavailable=terrain==='partial-positive-infinity'?Infinity:terrain==='partial-negative-infinity'?-Infinity:NaN;
   const height=x=>terrain==='valid'?0:terrain==='all-nan'?NaN:x<0?unavailable:0;
   const r=auditPlacements(scene,height,targets,{kind});
   const row={kind,terrain,complete:r.complete,invalid:r.invalid,checks:r.summary.checks,candidates:r.summary.candidates};report[mode].push(row);
   const valid=terrain==='valid';const shouldReject=mode==='after'||terrain==='all-nan';
   assert.equal(r.complete,valid||!shouldReject);assert.equal(r.invalid,valid||!shouldReject?0:1);assert.equal(r.summary.checks,valid||!shouldReject?1:0);
   geometry.dispose();
  }
 }
 report.pass=true;fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}finally{await server.close();}
