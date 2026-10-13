#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createServer,transformWithOxc} from 'vite';
import * as THREE from 'three';
const ref='0b45a36',baseline=(await transformWithOxc(execFileSync('git',['show',`${ref}:src/diagnostics/canopyAudit.ts`],{encoding:'utf8'}),'baseline.ts')).code;
const server=await createServer({configFile:false,logLevel:'error',plugins:[{name:'baseline-canopy',resolveId(id){if(id==='/@baseline-canopy')return '\0baseline-canopy.ts';},load(id){if(id==='\0baseline-canopy.ts')return baseline;}}],server:{middlewareMode:true,hmr:false,ws:false}});
try{
 const {auditCanopies:beforeAudit}=await server.ssrLoadModule('/@baseline-canopy'),{auditCanopies:afterAudit}=await server.ssrLoadModule('/src/diagnostics/canopyAudit.ts');
 const run=(audit,limited)=>{const leaves=new THREE.PlaneGeometry(4,4,100,100),position=leaves.getAttribute('position'),getX=position.getX.bind(position);let reads=0;position.getX=i=>{reads++;return getX(i);};const target={label:'controlled crown',wood:new THREE.BoxGeometry(.4,2,.4),leaves,matrix:new THREE.Matrix4()};try{const r=audit([target],limited?{maxOperations:20}:{});return{reads,complete:r.complete,summary:r.summary};}catch(e){return{reads,rejected:e.message};}};
 const before=run(beforeAudit,true),after=run(afterAudit,true),normalBefore=run(beforeAudit,false),normalAfter=run(afterAudit,false);
 const report={schema:1,baselineRef:ref,sourceSha256:createHash('sha256').update(fs.readFileSync('src/diagnostics/canopyAudit.ts')).digest('hex'),scope:'Controlled source geometry operation-budget repro; source vertex reads counted, not frame timing. Normal control compares coverage summaries.',vertices:10201,budget:20,before,after,normalBefore,normalAfter,pass:before.reads>10201&&after.reads===0&&/budget/.test(after.rejected)&&JSON.stringify(normalBefore.summary)===JSON.stringify(normalAfter.summary)};
 const out=process.argv.indexOf('--out');if(out>=0)fs.writeFileSync(process.argv[out+1],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
