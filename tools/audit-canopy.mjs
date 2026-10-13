#!/usr/bin/env node
import fs from 'node:fs';
import {openPage} from './cdp.mjs';
import {compareCanopyBaseline} from './canopy-baseline.mjs';
const args=Object.fromEntries(process.argv.slice(2).flatMap((a,i,all)=>a.startsWith('--')?[[a.slice(2),all[i+1]]]:[]));
const url=new URL(args.url??'http://127.0.0.1:4173/');for(const[k,v]of Object.entries({shot:'1',quality:'low',place:'rillford',settle:'1',hud:'0'}))url.searchParams.set(k,v);
const options={gap:Number(args.gap??.75),maxOperations:Number(args['max-operations']??20000000)};let page;
try{
 page=await openPage(url.href,{w:640,h:360,requestTimeoutMs:240000});let ready=false;for(let i=0;i<800;i++){if(await page.eval('return window.tervain?.mode === "play";')){ready=true;break;}await page.wait(250);}if(!ready)throw new Error('Journey not ready');
 const report=await page.eval(`const T=window.tervain;T.render=()=>{};await T.world.arrived;T.step=()=>{};return await T.auditCanopies(${JSON.stringify(options)});`);
 report.pass=report.complete===true&&report.summary.trees===report.expectedTrees&&report.expectedTrees>0;
 // A complete scan with new detached candidates is not a successful gate.
 if(!args.baseline)report.pass&&=report.summary.candidates===0;
 if(args.baseline){const before=JSON.parse(fs.readFileSync(args.baseline,'utf8'));report.baselineComparison=compareCanopyBaseline(before,report);report.pass&&=report.baselineComparison.pass;}
 if('repro'in args){
  report.repro=await page.eval(`const T=window.tervain,forest=T.world.modules.find(m=>m.name==='forest').module,original=forest.canopyAuditTargets,targets=original.call(forest),baseline=await T.auditCanopies(${JSON.stringify(options)});
   const index=targets.findIndex((t,i)=>t.leaves&&baseline.trees[i].candidates.length===0);if(index<0)throw new Error('No supported leafy fixture available');
   const target=targets[index],leaf=target.leaves.clone(),position=target.leaves.getAttribute('position'),saved=position.clone(),savedBox=target.leaves.boundingBox,savedSphere=target.leaves.boundingSphere;target.wood.computeBoundingBox();leaf.computeBoundingBox();const offset=target.wood.boundingBox.max.x-leaf.boundingBox.min.x+10;leaf.translate(offset,0,0);
   const oldRoot=await T.auditPlacement({kind:'root',maxChecks:100000});
   // Mutate the actual shared near-source geometry, so both old and new checks see the same fixture.
   position.copy(leaf.getAttribute('position'));position.needsUpdate=true;target.leaves.boundingBox=null;target.leaves.boundingSphere=null;
   let detached,rootAfter;try{detached=await T.auditCanopies(${JSON.stringify(options)});rootAfter=await T.auditPlacement({kind:'root',maxChecks:100000});}finally{position.copy(saved);position.needsUpdate=true;target.leaves.boundingBox=savedBox;target.leaves.boundingSphere=savedSphere;}
   const restored=await T.auditCanopies(${JSON.stringify(options)});
   const scene=new T.world.scene.constructor();scene.environment=T.world.scene.environment;
   T.world.scene.traverse(o=>{if(o.isLight)scene.add(o.clone());});
   let woodMesh,leafMesh;forest.group.traverse(o=>{if(!woodMesh&&o.isInstancedMesh&&o.geometry===target.wood)woodMesh=o;if(!leafMesh&&o.isInstancedMesh&&o.geometry===target.leaves)leafMesh=o;});
   if(!woodMesh||!leafMesh)throw new Error('Native source meshes missing');
   const wood=woodMesh.clone(),crown=leafMesh.clone();wood.material=woodMesh.material.clone();crown.material=leafMesh.material.clone();wood.count=crown.count=1;wood.visible=crown.visible=true;wood.frustumCulled=crown.frustumCulled=false;
   wood.setMatrixAt(0,target.matrix);crown.setMatrixAt(0,target.matrix);wood.instanceMatrix.needsUpdate=crown.instanceMatrix.needsUpdate=true;crown.geometry=leaf;scene.add(wood,crown);
   const box=target.wood.boundingBox.clone().union(leaf.boundingBox).applyMatrix4(target.matrix),centre=box.getCenter(T.player.group.position.clone()),radius=box.getSize(T.player.group.position.clone()).length()/2,camera=T.cam.camera.clone();camera.position.copy(centre).add(T.player.group.position.clone().set(radius*.35,radius*.2,radius*2.5));camera.lookAt(centre);camera.updateMatrixWorld();T.renderer.setRenderTarget(null);T.renderer.render(scene,camera);
   window.__canopyFixture={scene,camera,wood,crown,leaf,originalLeaf:target.leaves};
   return{tree:target.label,before:{rootCandidates:oldRoot.summary.candidates,canopyCandidates:baseline.summary.candidates},detached:{rootCandidates:rootAfter.summary.candidates,canopyCandidates:detached.summary.candidates,fixtureCandidates:detached.trees[index].candidates.length,complete:detached.complete},restored:{canopyCandidates:restored.summary.candidates,complete:restored.complete}};`);
  if(args.shot)await page.shot(args.shot);
  report.pass&&=report.repro.detached.complete&&report.repro.restored.complete&&report.repro.detached.rootCandidates===report.repro.before.rootCandidates&&report.repro.detached.canopyCandidates>report.repro.before.canopyCandidates&&report.repro.detached.fixtureCandidates>0&&report.repro.restored.canopyCandidates===report.repro.before.canopyCandidates;
  if(args['restored-shot']){await page.eval('const T=window.tervain,F=window.__canopyFixture;F.crown.geometry=F.originalLeaf;T.renderer.render(F.scene,F.camera);');await page.shot(args['restored-shot']);}
 }
 fs.writeFileSync(args.out??'canopy-audit.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({complete:report.complete,summary:report.summary,operations:report.operations,baselineComparison:report.baselineComparison,repro:report.repro,pass:report.pass}));if(!report.pass)process.exitCode=1;
}finally{page?.close();}
