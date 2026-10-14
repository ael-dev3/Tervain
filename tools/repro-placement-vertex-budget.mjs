#!/usr/bin/env node
/** Actual Vite-compiled audit: explicit budget retains a large merged prop in coverage. */
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createServer} from 'vite';import * as THREE from 'three';import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,v)=>a.startsWith('--')?[[a.slice(2),v[i+1]]]:[])),ref=args.baseline??'8f249f457',out=path.resolve(args.out??'placement-vertex-budget.json');fs.rmSync(out,{force:true});
const id=path.resolve('src/diagnostics/__vertex-before.ts'),source=execFileSync('git',['show',`${ref}:src/diagnostics/placementAudit.ts`],{encoding:'utf8'}),current=fs.readFileSync('src/diagnostics/placementAudit.ts');
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true,ws:false,hmr:false},plugins:[{name:'vertex-budget-before',enforce:'pre',resolveId(name){if(name==='/@vertex-before')return id;},load(name){if(name===id)return source;}}]});
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
try{
 const modules={before:(await server.ssrLoadModule('/@vertex-before')).auditPlacements,after:(await server.ssrLoadModule('/src/diagnostics/placementAudit.ts')).auditPlacements};
 const dense=new THREE.BoxGeometry(1,1,1,129,129,129).translate(0,.5,0),floating=new THREE.BoxGeometry(1,1,1).translate(3,2,0),geometry=mergeGeometries([dense,floating]),material=new THREE.MeshBasicMaterial(),scene=new THREE.Scene(),mesh=new THREE.Mesh(geometry,material);mesh.name='merged planks';scene.add(mesh);
 const report={baseline:ref,sourceSha256:createHash('sha256').update(current).digest('hex'),scope:'Actual production audit compiled through Vite, synthetic merged grounded/floating components. No live-placement or rendering claim.',vertices:geometry.getAttribute('position').count,budget:200000,before:{},after:{}};
 for(const [mode,audit]of Object.entries(modules))for(const explicit of [false,true]){const r=audit(scene,()=>0,[],explicit?{maxVertices:report.budget}:{});report[mode][explicit?'explicit':'default']={complete:r.complete,skipped:r.skipped,summary:r.summary,maxVertices:r.maxVertices??null,resultHash:hash(r)};}
 assert.equal(report.before.default.resultHash,report.after.default.resultHash);assert.equal(report.before.explicit.complete,false);assert.equal(report.after.explicit.complete,true);assert.equal(report.after.explicit.maxVertices,report.budget);assert.deepEqual(report.after.explicit.summary,{checks:2,roots:0,props:2,candidates:1});
 report.pass=true;fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));dense.dispose();floating.dispose();geometry.dispose();material.dispose();
}finally{await server.close();}
