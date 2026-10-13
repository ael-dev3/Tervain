#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import * as THREE from 'three';
const ref='0b45a36',baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/diagnostics/canopyAudit.ts`],{encoding:'utf8'}),'baseline.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-canopy',resolveId(id){if(id==='/@baseline-canopy')return '\0baseline-canopy.ts';},load(id){if(id==='\0baseline-canopy.ts')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try{
 const {auditCanopies:before}=await server.ssrLoadModule('/@baseline-canopy'),{auditCanopies:after}=await server.ssrLoadModule('/src/diagnostics/canopyAudit.ts');
 const transforms={shear:new THREE.Matrix4().set(1,.6,0,0,0,.8,0,0,0,0,1,0,0,0,0,1),projective:new THREE.Matrix4(),uniform:new THREE.Matrix4().makeRotationY(.7).scale(new THREE.Vector3(-2,2,2))};transforms.projective.elements[3]=.01;
 const target={label:'controlled crown',wood:new THREE.BoxGeometry(.4,2,.4),leaves:new THREE.BoxGeometry(.5,.5,.5).translate(0,1,0),matrix:new THREE.Matrix4()};
 const check=(audit,matrix)=>{try{const r=audit([{...target,matrix}]);return{accepted:true,complete:r.complete,candidates:r.summary.candidates};}catch(e){return{accepted:false,error:e.message};}};
 const cases=Object.fromEntries(Object.entries(transforms).map(([name,matrix])=>[name,{before:check(before,matrix),after:check(after,matrix)}]));
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/diagnostics/canopyAudit.ts')).digest('hex'),scope:'Controlled canopy audit transform validation. No claim that current authored trees use these unsupported transforms; no rendering change.',cases,pass:cases.shear.before.accepted&&!cases.shear.after.accepted&&cases.projective.before.accepted&&!cases.projective.after.accepted&&JSON.stringify(cases.uniform.before)===JSON.stringify(cases.uniform.after)};
 const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
