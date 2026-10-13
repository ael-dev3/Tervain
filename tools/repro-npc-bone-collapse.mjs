#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {auditSkinnedBones,auditHeadAnchor} from './skinned-bone-audit.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const {openPage}=await import(args.driver?pathToFileURL(path.resolve(args.driver)).href:'./cdp.mjs');
const out=args.out??'npc-bone-proof';fs.mkdirSync(out,{recursive:true});const url=new URL(args.url??'http://127.0.0.1:4173/');
for(const[k,v]of Object.entries({shot:'1',place:'rillford',quality:'low',settle:'1',hud:'0'}))url.searchParams.set(k,v);
let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;
 for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode==="play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Game not ready');
 const report=await page.eval(`
 const inspect=${auditSkinnedBones.toString()},anchor=${auditHeadAnchor.toString()};
 const T=window.tervain;T.render=()=>{};await T.world.arrived;await T.castLoad;T.step=()=>{};
 T.arrivals.warm=null;
 for(let i=0;i<5000&&T.arrivals.count;i++){T.arrivals.update(T.npcAssets,()=>false);await new Promise(r=>setTimeout(r,0));}
 if(T.arrivals.count)throw new Error('NPC model arrivals incomplete');
 const actors=T.npcs.map(n=>({id:n.id,bones:inspect(n.rig.root),head:anchor(n.rig)}));
 const sceneRigs=[];
 T.world.scene.traverse(root=>{if(!root.userData.meshyNpc)return;let head,torso;
 root.traverse(o=>{if(!o.isBone)return;const name=o.name.toLowerCase();if(name==='head')head=o;if(name==='torso'||name==='spine')torso=o;});
 sceneRigs.push({id:root.userData.meshyNpc.id??root.name,bones:inspect(root),head:head&&torso?anchor({root,head,torso}):null});});
 const actor=T.npcs.find(n=>n.rig.head.isBone);if(!actor)throw new Error('No native head bone');
 const head=actor.rig.head,original=head.scale.clone();let injected,finiteVertices=true,vertices=0;
 try{
 head.scale.setScalar(0);injected=inspect(actor.rig.root);
 actor.rig.root.traverse(mesh=>{if(!mesh.isSkinnedMesh)return;mesh.skeleton.update();const point=head.position.clone();
 for(let i=0;i<mesh.geometry.attributes.position.count;i++){mesh.getVertexPosition(i,point);finiteVertices&&=Number.isFinite(point.x)&&Number.isFinite(point.y)&&Number.isFinite(point.z);vertices++;}});
 }finally{head.scale.copy(original);actor.rig.root.updateMatrixWorld(true);}
 const restored=inspect(actor.rig.root),caught=injected.invalid.some(v=>v.bone===head.name&&v.reason==='collapsed-local-scale');
 return {schema:1,actors,sceneRigs,control:{id:actor.id,vertices,finiteVertexCheckPass:finiteVertices,injectedCollapseCaught:caught,restoredPass:restored.pass},structuralPass:actors.length>0&&actors.every(a=>a.bones.pass&&a.head.pass)&&sceneRigs.length>0&&sceneRigs.every(a=>a.bones.pass&&(!a.head||a.head.pass)),selfTestPass:finiteVertices&&vertices>0&&caught&&restored.pass,scope:'Native NPC rigs after full cast adoption, including tagged ambient/enemy rigs, plus a temporary zero-scale head control. Shader warmup is disabled in this CPU-only fixture. Structural check only; does not establish correct face shape, skin weights, all animations, or a recorded missing-head cause.'};
 `);
 report.build=await page.eval('return fetch(new URL("version.json",document.baseURI)).then(r=>r.json());');
 report.pass=report.selfTestPass&&report.structuralPass;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
