#!/usr/bin/env node
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createServer} from 'vite';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {canopyGate} from './canopy-detached-gate.mjs';
const out=process.argv[2]??'canopy-detached-gate-proof.json';
fs.rmSync(out,{force:true});
const server=await createServer({configFile:false,server:{middlewareMode:true},logLevel:'error'});
try {
 const {auditCanopies}=await server.ssrLoadModule('/src/diagnostics/canopyAudit.ts');
 const wood=new THREE.BoxGeometry(.2,2,.2);
 const leaves=mergeGeometries([.3,.9,1.5,2.1,2.7].map(x=>new THREE.BoxGeometry(.5,.5,.5).translate(x,.5,0)));
 const audit=(geometry)=>({...auditCanopies([{label:'chained-crown',wood,leaves:geometry,matrix:new THREE.Matrix4()}]),expectedTrees:1});
 const unsupported=audit(leaves),supported=audit(new THREE.BoxGeometry(.5,.5,.5));
 const before={pass:unsupported.complete&&unsupported.summary.trees===1&&unsupported.summary.candidates===0};
 const after=canopyGate(unsupported),control=canopyGate(supported);
 const report={schema:1,scope:'Production detector on controlled chained leaf geometry. Gate-only change; no rendering, asset, live-tree count or hardware timing claim.',sourceSha256:createHash('sha256').update(fs.readFileSync('src/diagnostics/canopyAudit.ts')).digest('hex'),unsupported:unsupported.summary,before,after,supportedControl:control,pass:before.pass&&!after.pass&&control.pass&&unsupported.summary.detachedCards>0};
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
 wood.dispose();leaves.dispose();
} finally {await server.close();}
