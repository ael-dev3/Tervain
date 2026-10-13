#!/usr/bin/env node
import {createServer} from 'vite';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import * as THREE from 'three';
import {compareCanopyBaseline} from './canopy-baseline.mjs';
// Execute the build's actual geometric audit, rather than fabricate candidate counts.
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true,hmr:false,ws:false}});
try {
  const {auditCanopies}=await server.ssrLoadModule('/src/diagnostics/canopyAudit.ts');
  const wood=new THREE.BoxGeometry(.4,2,.4),near=new THREE.BoxGeometry(.2,.2,.2),far=near.clone().translate(5,0,0);
  const audit=(a,b)=>({...auditCanopies([{label:'tree:a',wood,leaves:a,matrix:new THREE.Matrix4()},{label:'tree:b',wood,leaves:b,matrix:new THREE.Matrix4().makeTranslation(0,0,10)}],{gap:.75}),expectedTrees:2});
  const baseline=audit(far,near),regression=audit(near,far),fixed=audit(near,near);
  const oldPass=baseline.complete&&regression.complete&&baseline.gap===regression.gap&&baseline.expectedTrees===regression.expectedTrees&&regression.summary.candidates<=baseline.summary.candidates;
  const swapped=compareCanopyBaseline(baseline,regression),improved=compareCanopyBaseline(baseline,fixed),unchanged=compareCanopyBaseline(baseline,baseline);
  const report={schema:1,toolSha256:createHash('sha256').update(fs.readFileSync(new URL('./canopy-baseline.mjs',import.meta.url))).digest('hex'),scope:'Actual geometric canopy audit on two controlled trees. Detector gate comparison only; no asset or render changes.',baselineCandidates:baseline.summary.candidates,swappedCandidates:regression.summary.candidates,oldGatePass:oldPass,swapped,improved,unchanged,pass:oldPass&&!swapped.pass&&swapped.regressions.length===1&&swapped.regressions[0].label==='tree:b'&&improved.pass&&unchanged.pass};
  const out=process.argv.indexOf('--out');if(out>=0){if(!process.argv[out+1])throw new Error('Missing output filename');fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report,null,2));if(!report.pass)process.exitCode=1;
  wood.dispose();near.dispose();far.dispose();
} finally {await server.close();}
