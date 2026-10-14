#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import * as THREE from 'three';
const baselineRef='421d34b';
const sources={before:execFileSync('git',['show',`${baselineRef}:src/diagnostics/canopyAudit.ts`],{encoding:'utf8'}),after:fs.readFileSync('src/diagnostics/canopyAudit.ts','utf8')};
// Instrument no-argument Vector3 constructions in the detector only; geometry and report stay unchanged.
const instrument=s=>s.replace("import * as THREE from 'three';", "import * as THREE from 'three'; let allocations=0; function vector(){allocations++;return new THREE.Vector3();} export function vectorAllocations(){return allocations;}").replaceAll('new THREE.Vector3()','vector()').replace('return vector();','return new THREE.Vector3();');
const modules={};for(const [k,s]of Object.entries(sources))modules[k]=(await transformWithOxc(instrument(s),`${k}.ts`)).code;
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true},plugins:[{name:'audit-probes',resolveId(id){if(id.startsWith('/@probe-'))return '\0'+id;},load(id){if(id.startsWith('\0/@probe-'))return modules[id.slice('\0/@probe-'.length)];}}]});
try {
 const wood=new THREE.BoxGeometry(.3,2,.3),leaves=new THREE.PlaneGeometry(4,4,10,10),target={label:'controlled-crown',wood,leaves,matrix:new THREE.Matrix4(),cutout:{uv:'uv',cutoff:.5,alpha:()=>1}};
 const results={};for(const mode of ['before','after']){const m=await server.ssrLoadModule('/@probe-'+mode);const audit=m.auditCanopies([target],{alpha:true});results[mode]={vectorAllocations:m.vectorAllocations(),audit};}
 const report={schema:1,baselineRef,sourceSha256:createHash('sha256').update(sources.after).digest('hex'),scope:'Instrumented production canopy detector on 200 opaque leaf triangles. Diagnostic allocation count; not gameplay timing or live foliage quality.',before:{vectorAllocations:results.before.vectorAllocations},after:{vectorAllocations:results.after.vectorAllocations},reportsIdentical:JSON.stringify(results.before.audit)===JSON.stringify(results.after.audit),pass:false};report.pass=report.reportsIdentical&&report.after.vectorAllocations<report.before.vectorAllocations;
 fs.writeFileSync(process.argv[2]??'canopy-alpha-scratch-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
