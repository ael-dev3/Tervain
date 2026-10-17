#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {transformWithOxc} from 'vite';
import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
const out=process.argv[2]??'canopy-detached-connectivity.json';
fs.mkdirSync(path.dirname(out),{recursive:true});fs.rmSync(out,{force:true});
const sources={before:execFileSync('git',['show','421d34b:src/diagnostics/canopyAudit.ts'],{encoding:'utf8'}),after:fs.readFileSync('src/diagnostics/canopyAudit.ts','utf8')},audits={};
for(const [mode,source] of Object.entries(sources)){
 const code=(await transformWithOxc(source,'audit.ts')).code.replace(/from ['"]three['"]/g,'from '+JSON.stringify(pathToFileURL(path.resolve('node_modules/three/build/three.module.js')).href));
 audits[mode]=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).auditCanopies;
}
// Independent all-pairs graph oracle on these known opaque cards; no spanning-tree implementation reused.
function expected(cards,wood,gap,reach){
 const triangle=new THREE.Triangle(),p=wood.getAttribute('position'),idx=wood.index,q=new THREE.Vector3();
 const far=cards.map(g=>{const pos=g.getAttribute('position');let distance=Infinity;
  for(let i=0;i<pos.count;i++)for(let j=0;j<idx.count;j+=3){triangle.a.fromBufferAttribute(p,idx.getX(j));triangle.b.fromBufferAttribute(p,idx.getX(j+1));triangle.c.fromBufferAttribute(p,idx.getX(j+2));const point=new THREE.Vector3().fromBufferAttribute(pos,i);triangle.closestPointToPoint(point,q);distance=Math.min(distance,q.distanceTo(point));}
  return distance>reach;
 });
 const boxes=cards.map(g=>{g.computeBoundingBox();return g.boundingBox;}),seen=new Set();let clumps=0;
 for(let i=0;i<cards.length;i++)if(far[i]&&!seen.has(i)){clumps++;seen.add(i);const queue=[i];for(const a of queue)for(let b=0;b<cards.length;b++)if(far[b]&&!seen.has(b)){
  const x=boxes[a],y=boxes[b],d=Math.hypot(Math.max(0,x.min.x-y.max.x,y.min.x-x.max.x),Math.max(0,x.min.y-y.max.y,y.min.y-x.max.y),Math.max(0,x.min.z-y.max.z,y.min.z-x.max.z));
  if(d<=gap){seen.add(b);queue.push(b);}
 }}
 return{detachedCards:far.filter(Boolean).length,detachedClumps:clumps};
}
const rows=[];
for(const scale of [.5,1,2])for(const order of [[0,1,2],[0,2,1],[1,0,2],[1,2,0],[2,0,1],[2,1,0]])for(const kind of ['shortcut','separated','all-far','all-supported']){
 const cards=[[0,0,1],[-.3,0,1.2],[.3,0,1.2]].map(p=>new THREE.PlaneGeometry(.02,.02).translate(...p));
 const wood=new THREE.PlaneGeometry(4,4).translate(0,0,kind==='all-far'?-3:kind==='all-supported'?1.1:0),leaves=mergeGeometries(order.map(i=>cards[i])),gap=kind==='separated'?.4:.75,reach=1.05;
 const target={label:kind,wood,leaves,matrix:new THREE.Matrix4().makeScale(scale,scale,scale)},options={gap:gap*scale,woodReach:reach*scale};
 const oracle=expected(cards,wood,gap,reach),before=audits.before([target],options),after=audits.after([target],options);
 const invariants=r=>JSON.stringify({...r,operations:0,summary:{...r.summary,detachedClumps:0},trees:r.trees.map(t=>({...t,detachedClumps:0}))});
 rows.push({scale,order,kind,oracle,before:before.summary,after:after.summary,invariantsIdentical:invariants(before)===invariants(after)});
 wood.dispose();leaves.dispose();cards.forEach(g=>g.dispose());
}
const report={schema:1,baselineRef:'421d34b',sourceSha256:createHash('sha256').update(sources.after).digest('hex'),scope:'Actual audit source on controlled opaque cards, compared with an independent all-pairs connectivity oracle. Diagnostic correctness only; no visual changes or hardware timing claim.',cases:rows.length,beforeMismatches:rows.filter(r=>r.before.detachedClumps!==r.oracle.detachedClumps).length,afterMismatches:rows.filter(r=>r.after.detachedClumps!==r.oracle.detachedClumps||r.after.detachedCards!==r.oracle.detachedCards).length,invariantsIdentical:rows.every(r=>r.invariantsIdentical),rows};
report.pass=report.beforeMismatches>0&&report.afterMismatches===0&&report.invariantsIdentical;
const records=Buffer.from(JSON.stringify(rows)+'\n');delete report.rows;report.casesFile='cases.json.gz';report.casesSha256=createHash('sha256').update(records).digest('hex');fs.writeFileSync(path.join(path.dirname(out),report.casesFile),gzipSync(records));fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
