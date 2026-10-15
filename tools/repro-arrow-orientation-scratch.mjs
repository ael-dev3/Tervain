#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createServer,transformWithOxc} from 'vite';
import * as THREE from 'three';
const baselineRef='421d34b';
const sources={before:execFileSync('git',['show',`${baselineRef}:src/presentation/huntingArrow.ts`],{encoding:'utf8'}),after:fs.readFileSync('src/presentation/huntingArrow.ts','utf8')};
const modules={};for(const [key,source]of Object.entries(sources)){
 const js=(await transformWithOxc(source,'arrows.ts')).code.replace("'./nearFade'","'/src/presentation/nearFade.ts'").replace('"./nearFade"','"/src/presentation/nearFade.ts"');
 modules[key]=js.replaceAll('new THREE.Vector3(', 'countVector(').replaceAll('velocity.clone()', 'cloneVelocity(velocity)')+`\nlet direct=0,clones=0;function countVector(...args){direct++;return new THREE.Vector3(...args)}function cloneVelocity(v){clones++;return v.clone()}export function counts(){return {direct,clones}}`;
}
const server=await createServer({configFile:false,logLevel:'error',server:{middlewareMode:true},plugins:[{name:'arrows',resolveId(id){if(id.startsWith('/@arrows-'))return '\0'+id},load(id){if(id.startsWith('\0/@arrows-'))return modules[id.slice('\0/@arrows-'.length)]}}]});
try {
 const runs={};for(const mode of ['before','after']){
 const m=await server.ssrLoadModule('/@arrows-'+mode),arrows=new m.HuntingArrows(),shots=[];
 for(let i=0;i<12;i++)shots.push(arrows.launch(new THREE.Vector3(i,100,0),new THREE.Vector3(i-6,.5,1),20));
 const start=m.counts(),states=[];
 for(let frame=0;frame<120;frame++){arrows.update(1/60,()=>null);states.push(shots.map(s=>({position:s.position.toArray(),velocity:s.velocity.toArray(),quaternion:s.mesh.quaternion.toArray()})));}
 const end=m.counts();runs[mode]={directVectors:end.direct-start.direct,velocityClones:end.clones-start.clones,states};arrows.dispose();
 }
 const identical=JSON.stringify(runs.before.states)===JSON.stringify(runs.after.states),report={schema:1,baselineRef,scope:'12 simultaneous production arrows over 120 fixed 60 Hz updates. Counts cover direct Vector3 constructions in this module and velocity clones only; not heap or hardware timings.',before:{directVectors:runs.before.directVectors,velocityClones:runs.before.velocityClones},after:{directVectors:runs.after.directVectors,velocityClones:runs.after.velocityClones},all1440TransformsAndVelocitiesIdentical:identical,pass:identical&&runs.after.directVectors===0&&runs.after.velocityClones===0&&runs.before.directVectors>0&&runs.before.velocityClones>0};
 fs.writeFileSync(process.argv[2]??'arrow-orientation-proof.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{await server.close();}
