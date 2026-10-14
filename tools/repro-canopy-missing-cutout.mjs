#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import * as THREE from 'three';
const baselineRef='421d34b',source=execFileSync('git',['show',`${baselineRef}:src/diagnostics/canopyAudit.ts`],{encoding:'utf8'}),baseline=(await transformWithOxc(source,'baseline.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true},plugins:[{name:'baseline',resolveId(id){if(id==='/@before')return '\0before';},load(id){if(id==='\0before')return baseline;}}]});
try {
 const {leafCutoutSampler}=await server.ssrLoadModule('/src/presentation/leafSurfaceSites.ts');
 const {auditCanopies:before}=await server.ssrLoadModule('/@before'),{auditCanopies:after}=await server.ssrLoadModule('/src/diagnostics/canopyAudit.ts');
 const material=new THREE.MeshStandardMaterial({alphaTest:.5,map:new THREE.Texture()});
 const cutout=leafCutoutSampler(material),target={label:'unreadable-mask',wood:new THREE.BoxGeometry(.4,2,.4),leaves:new THREE.PlaneGeometry(.5,.5),matrix:new THREE.Matrix4(),cutoutRequired:material.alphaTest>0,cutout};
 const run=(fn,t,alpha=true)=>{try{const r=fn([t],{alpha});return {accepted:true,complete:r.complete,maskedTrees:r.alpha?.maskedTrees??null,candidates:r.summary.candidates};}catch(e){return{accepted:false,error:e.message};}};
 const cases={missingMask:{before:run(before,target),after:run(after,target)},opaqueControl:run(after,{...target,cutoutRequired:false}),decodedControl:run(after,{...target,cutout:{uv:'uv',cutoff:.5,alpha:()=>1}}),geometryOnlyControl:run(after,target,false)};
 const report={schema:1,baselineRef,sourceSha256:createHash('sha256').update(fs.readFileSync('src/diagnostics/canopyAudit.ts')).digest('hex'),scope:'Controlled unreadable texture through the real material sampler and production detector. No claim that live assets currently fail decoding; no production visual change.',samplerReturnedNull:cutout===null,cases,pass:cutout===null&&cases.missingMask.before.complete&&!cases.missingMask.after.accepted&&cases.opaqueControl.complete&&cases.decodedControl.complete&&cases.geometryOnlyControl.complete};
 fs.writeFileSync(process.argv[2]??'canopy-missing-cutout-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
